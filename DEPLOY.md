# Deploy Cloud Drive to Google Cloud VPS

Complete step-by-step guide from scratch.

---

## Prerequisites

- A Google Cloud account ([console.cloud.google.com](https://console.cloud.google.com))
- A domain name (optional, but recommended for HTTPS)

---

## Step 1: Create a VM Instance

1. Go to **Compute Engine** → **VM instances** → **Create Instance**

2. Configure:
   | Setting | Value |
   |---|---|
   | **Name** | `cloud-drive` |
   | **Region** | Choose closest to you |
   | **Machine type** | `e2-small` (2 vCPU, 2 GB RAM) — or `e2-micro` for free tier |
   | **Boot disk** | Ubuntu 22.04 LTS, 20 GB SSD |
   | **Firewall** | ✅ Allow HTTP traffic, ✅ Allow HTTPS traffic |

3. Click **Create**

4. Note your **External IP** — you'll need it later.

---

## Step 2: Set Up Firewall Rules

1. Go to **VPC Network** → **Firewall** → **Create Firewall Rule**

2. Configure:
   | Setting | Value |
   |---|---|
   | **Name** | `allow-http-https` |
   | **Direction** | Ingress |
   | **Targets** | All instances in the network |
   | **Source IP ranges** | `0.0.0.0/0` |
   | **Protocols and ports** | Specified protocols and ports → `tcp:80, tcp:443` |

3. Click **Create**

---

## Step 3: SSH into the VM

Click the **SSH** button next to your VM instance in the GCP console, or:

```bash
gcloud compute ssh cloud-drive --zone=YOUR_ZONE
```

---

## Step 4: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
npm --version

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install git (usually pre-installed)
sudo apt install -y git
```

---

## Step 5: Set Up PostgreSQL

```bash
# Start PostgreSQL (should auto-start, but just in case)
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Set a password for the postgres user
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'YOUR_SECURE_PASSWORD';"

# Create the database
sudo -u postgres createdb clouddrive

# Verify connection
sudo -u postgres psql -c "SELECT version();"
```

---

## Step 6: Clone and Configure the App

```bash
# Clone the repo
cd /opt
sudo git clone https://github.com/JamesCowx/cloud-drive.git
sudo chown -R $USER:$USER cloud-drive
cd cloud-drive

# Install dependencies
npm install

# Generate a secure auth secret
AUTH_SECRET=$(openssl rand -hex 32)
echo "Your AUTH_SECRET: $AUTH_SECRET"

# Create .env file
cat > .env << EOF
DATABASE_URL="postgresql://postgres:YOUR_SECURE_PASSWORD@localhost:5432/clouddrive"
AUTH_SECRET="$AUTH_SECRET"
UPLOAD_DIR="/opt/cloud-drive/storage"
MAX_FILE_SIZE=104857600
EOF

# Create storage directory
mkdir -p storage
```

---

## Step 7: Run Database Migrations

```bash
npx prisma migrate deploy
```

You should see:
```
Applying migration `20260821030855_init`
The following migration(s) have been applied:
  migrations/
    └─ 20260821030855_init/
```

---

## Step 8: Build the App

```bash
npm run build
```

This runs `prisma generate && next build`. You should see:

```
Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /api/auth/login
...
✓ Build successful
```

---

## Step 9: Start with PM2

```bash
# Start the app
pm2 start npm --name cloud-drive -- start

# Save the process list
pm2 save

# Set up auto-start on boot
pm2 startup
# Follow the printed command (copy and run it)
```

Verify it's running:

```bash
pm2 status
# Should show: cloud-drive | online | 0

curl http://localhost:3000
# Should return HTML
```

---

## Step 10: Configure nginx

```bash
# Create nginx config
sudo tee /etc/nginx/sites-available/cloud-drive << 'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/cloud-drive /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Step 11: Open Your App

Visit **http://YOUR_VM_EXTERNAL_IP** in your browser.

You should see the login page. Click **Create one** to register your first account.

---

## Step 12: (Optional) Set Up a Domain + HTTPS

### Point your domain to the VM

1. Go to your domain registrar (Namecheap, Cloudflare, Google Domains, etc.)
2. Add an **A record**:
   - **Host:** `@` (or `cloud`)
   - **Value:** YOUR_VM_EXTERNAL_IP
   - **TTL:** 300

### Install SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is set up automatically. Test it:
sudo certbot renew --dry-run
```

Now visit **https://yourdomain.com**.

---

## Useful Commands

```bash
# View app logs
pm2 logs cloud-drive

# Restart the app
pm2 restart cloud-drive

# Stop the app
pm2 stop cloud-drive

# Update the app
cd /opt/cloud-drive
git pull
npm install
npm run build
pm2 restart cloud-drive

# Check disk usage
df -h

# Check storage directory size
du -sh /opt/cloud-drive/storage/

# Database backup
sudo -u postgres pg_dump clouddrive > backup_$(date +%Y%m%d).sql

# Database restore
sudo -u postgres psql clouddrive < backup_20260821.sql
```

---

## Troubleshooting

### App won't start
```bash
pm2 logs cloud-drive --lines 50
# Check for DATABASE_URL or AUTH_SECRET errors
```

### Can't connect to database
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT 1;"
```

### nginx 502 Bad Gateway
```bash
pm2 status
# Make sure cloud-drive is "online"
curl http://localhost:3000
# If this works but nginx doesn't, check nginx config
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Upload fails
```bash
# Check nginx client_max_body_size
grep client_max_body_size /etc/nginx/sites-available/cloud-drive

# Check disk space
df -h

# Check storage permissions
ls -la /opt/cloud-drive/storage/
```

---

## Architecture

```
Internet → nginx (port 80/443) → Next.js (port 3000) → PostgreSQL
                                              ↓
                                    /opt/cloud-drive/storage/
                                    (uploaded files on disk)
```

- **nginx** handles SSL termination and reverse proxying
- **PM2** keeps the Node.js process alive and restarts on crash/reboot
- **PostgreSQL** stores user accounts, file metadata, and share links
- **Disk storage** holds the actual uploaded files
