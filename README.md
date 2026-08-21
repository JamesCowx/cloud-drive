<div align="center">

# Cloud Drive

### Your personal cloud file storage, self-hosted.

A full-featured file manager you can deploy on your own server — upload, organize, search, and share files with anyone.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql)](https://postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)

<br />

[**Live Demo**](#) · [**Report Bug**](https://github.com/JamesCowx/cloud-drive/issues) · [**Request Feature**](https://github.com/JamesCowx/cloud-drive/issues)

</div>

---

## Overview

Cloud Drive is a self-hosted alternative to Google Drive and Dropbox. It gives you full control over your files — no subscriptions, no data limits, no third-party access.

Built for developers and privacy-conscious users who want a simple, fast, and secure way to store and share files from their own server.

## Features

| Feature | Description |
|---|---|
| **Auth System** | Register and login with secure JWT sessions stored in httpOnly cookies |
| **File Upload** | Drag & drop or file picker — supports multiple files at once |
| **Folder Manager** | Create folders, browse with breadcrumbs, nest as deep as you need |
| **Search** | Instant full-text search across all your files and folders |
| **Share Links** | Generate public download URLs for any file — no login required to download |
| **Rename & Delete** | Full CRUD operations on files and folders |
| **Responsive UI** | Works on desktop and mobile — dark login, light dashboard |
| **Self-Hosted** | Deploy on any VPS — your data never leaves your server |

## Tech Stack

```
Frontend   →  Next.js 16 (App Router, Turbopack) + React 19 + Tailwind CSS 4
Backend    →  Next.js Route Handlers (Node.js runtime)
Database   →  PostgreSQL 17 via Prisma 7 (driver adapters)
Auth       →  bcryptjs (password hashing) + jose (JWT signing)
Storage    →  Local filesystem (configurable upload directory)
Deployment →  Any VPS (Google Cloud, DigitalOcean, Railway, Render)
```

## Getting Started

### Prerequisites

- **Node.js** 20.9+
- **PostgreSQL** 14+
- **npm** or your preferred package manager

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/JamesCowx/cloud-drive.git
cd cloud-drive

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/clouddrive"
AUTH_SECRET="your-secret-key-here"
UPLOAD_DIR="./storage"
```

Generate a secure `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```bash
# 4. Run database migrations
npx prisma migrate dev

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create your account.

## Project Structure

```
cloud-drive/
├── prisma/
│   ├── schema.prisma              # Database models (User, File, Share)
│   └── migrations/                # Auto-generated migrations
├── prisma.config.ts               # Prisma CLI configuration
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/         # POST /api/auth/login
│   │   │   │   ├── logout/        # POST /api/auth/logout
│   │   │   │   └── register/      # POST /api/auth/register
│   │   │   ├── files/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── download/  # GET  /api/files/[id]/download
│   │   │   │   │   └── route.ts   # PATCH / DELETE /api/files/[id]
│   │   │   │   └── route.ts       # GET (list) / POST (upload/folder)
│   │   │   └── shares/
│   │   │       ├── [token]/
│   │   │       │   └── download/  # GET  /api/shares/[token]/download
│   │   │       └── route.ts       # POST (create) / DELETE (revoke)
│   │   ├── files/
│   │   │   ├── [id]/page.tsx      # Folder view
│   │   │   ├── layout.tsx         # Auth guard + header
│   │   │   └── page.tsx           # Root file listing
│   │   ├── login/page.tsx         # Login page (dark theme)
│   │   ├── register/page.tsx      # Register page (dark theme)
│   │   ├── s/[token]/page.tsx     # Public share page
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Redirect to /files or /login
│   ├── components/
│   │   ├── auth-form.tsx          # Login/register form component
│   │   ├── drive-client.tsx       # Main file manager UI
│   │   └── logout-button.tsx      # Logout button
│   └── lib/
│       ├── auth.ts                # JWT + session helpers
│       ├── drive.ts               # File/folder CRUD + search
│       ├── format.ts              # Bytes/date formatting
│       ├── icons.tsx              # Hand-crafted SVG icons
│       ├── prisma.ts              # Prisma client singleton
│       └── storage.ts             # Filesystem upload helpers
├── .env.example                   # Environment variable template
└── package.json                   # Dependencies and scripts
```

## API Reference

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Create a new account | No |
| `POST` | `/api/auth/login` | Sign in | No |
| `POST` | `/api/auth/logout` | Sign out | Yes |
| `GET` | `/api/files?folder={id}&q={search}` | List files/folders | Yes |
| `POST` | `/api/files` | Upload files (multipart) | Yes |
| `POST` | `/api/files?action=createFolder` | Create a new folder | Yes |
| `PATCH` | `/api/files/{id}` | Rename a file/folder | Yes |
| `DELETE` | `/api/files/{id}` | Delete a file/folder | Yes |
| `GET` | `/api/files/{id}/download` | Download a file | Yes |
| `POST` | `/api/shares` | Create a share link | Yes |
| `DELETE` | `/api/shares` | Revoke a share link | Yes |
| `GET` | `/api/shares/{token}/download` | Download shared file | No |

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | — | Secret key for JWT signing (min 32 chars) |
| `UPLOAD_DIR` | No | `./storage` | Directory for uploaded files |

## Deployment

<details>
<summary><strong>Google Cloud (Compute Engine)</strong></summary>

1. Create an Ubuntu 22.04 VM with HTTP/HTTPS firewall rules
2. Install Node.js 20, PostgreSQL 17, nginx
3. Clone the repo, configure `.env`, run `npx prisma migrate deploy`
4. Build with `npm run build`, start with PM2
5. Set up nginx as a reverse proxy on port 80/443

```bash
# Quick setup on a fresh Ubuntu VM:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql nginx
sudo npm install -g pm2
```

</details>

<details>
<summary><strong>Railway</strong></summary>

1. Create a PostgreSQL service
2. Deploy this repo as a Node.js service
3. Set `DATABASE_URL`, `AUTH_SECRET`, and `UPLOAD_DIR` (use a Volume at `/data`)
4. Railway auto-runs `prisma migrate deploy` via `postinstall`

</details>

<details>
<summary><strong>Render</strong></summary>

1. Create a PostgreSQL database
2. Create a Web Service from this repo
3. Set environment variables and attach a Persistent Disk at `/data`
4. Build command: `npm run build` · Start command: `npm start`

</details>

<details>
<summary><strong>DigitalOcean App Platform</strong></summary>

1. Create a managed PostgreSQL database
2. Deploy as a Docker/Node.js app
3. Set `DATABASE_URL`, `AUTH_SECRET`, `UPLOAD_DIR`

</details>

<details>
<summary><strong>Self-hosted VPS (Ubuntu/Debian)</strong></summary>

```bash
# Install dependencies
sudo apt update && sudo apt install -y nodejs postgresql nginx
sudo npm install -g pm2

# Set up database
sudo -u postgres createdb clouddrive

# Clone and configure
git clone https://github.com/JamesCowx/cloud-drive.git
cd cloud-drive
cp .env.example .env   # Edit with your values
npm install
npx prisma migrate deploy

# Build and run
npm run build
pm2 start npm --name cloud-drive -- start
pm2 save && pm2 startup

# Configure nginx (see README for full config)
sudo ln -s /etc/nginx/sites-available/cloud-drive /etc/nginx/sites-enabled
```

</details>

## Database Commands

```bash
npm run db:migrate    # Create new migration (development)
npm run db:deploy     # Apply pending migrations (production)
npm run db:studio     # Open Prisma Studio (visual DB browser)
```

## Storage

Files are stored on disk under `UPLOAD_DIR`. Each user gets an isolated directory. Filenames use UUIDs to prevent collisions.

> **Important:** Back up your `UPLOAD_DIR` regularly — files are not stored in the database.

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

**[James Cowx](https://github.com/JamesCowx)** · Built with Next.js, Prisma, and PostgreSQL

</div>
