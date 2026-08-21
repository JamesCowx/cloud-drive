# Cloud Drive

A personal cloud file storage web app built with Next.js, Prisma, and PostgreSQL.

## Features

- User registration and login (JWT cookie sessions)
- Upload files (drag & drop or file picker)
- Organize files into folders
- Rename and delete files/folders
- Full-text file search
- Share files via public download links
- Download files individually

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** PostgreSQL via Prisma 7 (driver adapters)
- **Auth:** bcryptjs + jose (JWT in httpOnly cookies)
- **Styling:** Tailwind CSS v4
- **Hosting:** VPS (DigitalOcean, Railway, Render)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up PostgreSQL

Create a PostgreSQL database (local or hosted). Then copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/clouddrive"
AUTH_SECRET="a-long-random-string-here"
UPLOAD_DIR="./storage"
```

Generate a secure `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run migrations and start

```bash
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register an account, and start uploading.

## Project Structure

```
prisma/
  schema.prisma          # Database schema
prisma.config.ts         # Prisma config (migrate connection)
src/
  app/
    api/
      auth/              # Login, register, logout endpoints
      files/             # File CRUD, upload, download
      shares/            # Share link creation, public download
    files/               # File manager pages
    login/               # Login page
    register/            # Registration page
    s/[token]/           # Public share page
  components/
    auth-form.tsx        # Login/register form
    drive-client.tsx     # File manager UI
    logout-button.tsx    # Logout button
  lib/
    auth.ts              # JWT + session helpers
    drive.ts             # File/folder listing, search, ancestors
    format.ts            # Bytes/date formatting
    icons.tsx            # SVG icon components
    prisma.ts            # Prisma client singleton
    storage.ts           # Disk upload helpers
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Secret for signing JWT session cookies |
| `UPLOAD_DIR` | No | Where files are stored on disk (default: `./storage`) |

## Deploy to VPS

### Railway

1. Create a **PostgreSQL** service on Railway
2. Create a **Next.js** service connected to this repo
3. Set environment variables in the Next.js service:
   - `DATABASE_URL` from the PostgreSQL service's `DATABASE_URL` variable
   - `AUTH_SECRET` — generate a random string
   - `UPLOAD_DIR` — mount a **Railway Volume** at `/data` and set `UPLOAD_DIR="/data"`
4. Railway will run `prisma migrate deploy` automatically via the `postinstall` script

### Render

1. Create a **PostgreSQL** database on Render
2. Create a **Web Service** from this repo
3. Set environment variables:
   - `DATABASE_URL` from the Render PostgreSQL service
   - `AUTH_SECRET` — generate a random string
   - `UPLOAD_DIR` — attach a **Persistent Disk** mounted at `/data` and set `UPLOAD_DIR="/data"`
4. Render will run `prisma migrate deploy` automatically via the `postinstall` script

### DigitalOcean App Platform

1. Create a managed **PostgreSQL** database on DigitalOcean
2. Deploy this repo as a **Docker** or **Node.js** app
3. Set environment variables:
   - `DATABASE_URL` from your managed database
   - `AUTH_SECRET` — generate a random string
   - `UPLOAD_DIR` — use a **Spaces** bucket or attach a volume. For a volume at `/data`, set `UPLOAD_DIR="/data"`

### Self-hosted VPS (Ubuntu/Debian)

```bash
# Install Node.js 20+ and PostgreSQL
sudo apt update && sudo apt install -y nodejs postgresql

# Clone the repo
git clone <your-repo-url> && cd cloud-drive

# Set up PostgreSQL
sudo -u postgres createdb clouddrive
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'yourpassword';"

# Configure
cp .env.example .env
# Edit DATABASE_URL, AUTH_SECRET, UPLOAD_DIR

# Install and build
npm install
npx prisma migrate deploy
npm run build
npm start
```

The app runs on port 3000 by default. Use nginx or caddy as a reverse proxy with HTTPS.

## Database Migrations

```bash
# Development (creates migration files)
npm run db:migrate

# Production (applies pending migrations)
npm run db:deploy

# Open Prisma Studio
npm run db:studio
```

## File Storage

Uploaded files are stored on the local filesystem under `UPLOAD_DIR`. Each user gets their own directory. Files are named with UUIDs to avoid collisions.

**Important:** Back up your `UPLOAD_DIR` regularly. Files are not stored in the database.

## License

MIT
