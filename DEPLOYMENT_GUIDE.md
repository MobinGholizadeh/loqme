# Loqme (لقمه) — Production Deployment & Operations Guide

This guide provides a comprehensive, production-tested manual for deploying **Loqme** on **Ubuntu 24.04 / 26.04 LTS** using Docker Compose, GitHub Container Registry (GHCR), Nginx with custom SSL termination, automated CI/CD via GitHub Actions, and an Android Trusted Web Activity (TWA) pipeline.

---

## 📑 Table of Contents
1. [DNS A-Record Configuration](#1-dns-a-record-configuration)
2. [Server Preparation & Security Hardening](#2-server-preparation--security-hardening)
3. [Placing and Verifying Custom SSL Certificates](#3-placing-and-verifying-custom-ssl-certificates)
4. [Installing and Enabling Production Nginx](#4-installing-and-enabling-production-nginx)
5. [GitHub Container Registry Authentication](#5-github-container-registry-authentication)
6. [Production Environment Variables Setup](#6-production-environment-variables-setup)
7. [SSH Deployment Key & GitHub Actions Secrets](#7-ssh-deployment-key--github-actions-secrets)
8. [First Deployment & Database Migration](#8-first-deployment--database-migration)
9. [Viewing Container Logs & Real-Time Monitoring](#9-viewing-container-logs--real-time-monitoring)
10. [Automated Daily PostgreSQL Backup Script](#10-automated-daily-postgresql-backup-script)
11. [Android TWA APK Build & Digital Asset Links Verification](#11-android-twa-apk-build--digital-asset-links-verification)

---

## 1. DNS A-Record Configuration

Log into your domain registrar or DNS management provider (e.g. Cloudflare, ArvanCloud, or your domain provider) and create the following records pointing to your server's static public IP address (e.g. `94.184.43.68`):

| Type | Hostname / Name | Value / Destination | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` (or `loqme.ir`) | `94.184.43.68` | 300 / Auto | Apex domain for marketplace |
| **A** | `www` | `94.184.43.68` | 300 / Auto | Subdomain redirect alias |

Verify DNS propagation before proceeding:
```bash
dig +short loqme.ir
dig +short www.loqme.ir
```

---

## 2. Server Preparation & Security Hardening

Connect to your clean Ubuntu 24.04/26.04 server as `root` or a `sudo` user:
```bash
ssh user@94.184.43.68
```

### 2.1 Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw apt-transport-https ca-certificates gnupg lsb-release
```

### 2.2 Install Official Docker Engine & Docker Compose Plugin
```bash
# Add Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable and start Docker daemon
sudo systemctl enable --now docker

# Add your user to the docker group (avoids needing sudo for docker commands)
sudo usermod -aG docker $USER
```

### 2.3 Configure UFW Firewall
Permit only SSH, HTTP, and HTTPS ports while blocking raw external access to internal Docker ports (3000, 5432, 6379):
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP Redirect'
sudo ufw allow 443/tcp comment 'HTTPS Production'
sudo ufw enable
```

---

## 3. Placing and Verifying Custom SSL Certificates

Loqme uses pre-existing custom SSL certificates.

### 3.1 Create Secure Certificate Directory
```bash
sudo mkdir -p /etc/ssl/loqme
sudo chmod 700 /etc/ssl/loqme
```

### 3.2 Copy Certificates
Copy your certificate bundle (`fullchain.pem` or `.crt`) and private key (`privateKey.pem`):
```bash
# Place your files as:
# /etc/ssl/loqme/fullchain.pem
# /etc/ssl/loqme/privateKey.pem

sudo chown -R root:root /etc/ssl/loqme
sudo chmod 644 /etc/ssl/loqme/fullchain.pem
sudo chmod 600 /etc/ssl/loqme/privateKey.pem
```

### 3.3 Verify Certificate Validity and Matching Key Pair
```bash
# Verify certificate expiration and subject
openssl x509 -in /etc/ssl/loqme/fullchain.pem -text -noout | grep -E "Subject:|Not After"

# Ensure the modulus of certificate and private key match exactly
CERT_MD5=$(openssl x509 -noout -modulus -in /etc/ssl/loqme/fullchain.pem | openssl md5)
KEY_MD5=$(openssl rsa -noout -modulus -in /etc/ssl/loqme/privateKey.pem | openssl md5)

if [ "$CERT_MD5" = "$KEY_MD5" ]; then
    echo "✅ SSL Certificate and Private Key match!"
else
    echo "❌ Error: Certificate and Private Key DO NOT match!"
fi
```

---

## 4. Installing and Enabling Production Nginx

### 4.1 Install Nginx
```bash
sudo apt install -y nginx
```

### 4.2 Copy the Production Configuration
From your local workspace, upload or copy `nginx/loqme.conf` to `/etc/nginx/sites-available/loqme.conf`:
```bash
# Upload via scp (run from your local machine):
# scp nginx/loqme.conf user@94.184.43.68:/tmp/loqme.conf

# On the server:
sudo cp /tmp/loqme.conf /etc/nginx/sites-available/loqme.conf

# Replace domain placeholders if needed (e.g., loqme.ir)
# sudo sed -i 's/loqme.ir/YOUR_ACTUAL_DOMAIN/g' /etc/nginx/sites-available/loqme.conf
```

### 4.3 Enable Site and Test Configuration
```bash
sudo ln -sf /etc/nginx/sites-available/loqme.conf /etc/nginx/sites-enabled/loqme.conf
# Remove default site if present
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
sudo systemctl enable nginx
```

---

## 5. GitHub Container Registry Authentication

To allow the server to pull private/protected Docker images from `ghcr.io`:

1. Create a **Personal Access Token (Classic)** on GitHub with `read:packages` scope (or use a GitHub Actions deploy token).
2. Authenticate Docker on the server:
```bash
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```
Expected output: `Login Succeeded`

---

## 6. Production Environment Variables Setup

Create the production deployment directory on the server:
```bash
sudo mkdir -p /opt/loqme
sudo chown -R $USER:$USER /opt/loqme
cd /opt/loqme
```

Create `/opt/loqme/.env.production` (or `.env`):
```bash
cat << 'EOF' > /opt/loqme/.env
# ==============================================================================
# Loqme Production Environment Variables
# ==============================================================================

# Database Credentials
POSTGRES_USER=loqme_admin
POSTGRES_PASSWORD=generate_a_very_secure_random_db_password_here_min_32_chars
POSTGRES_DB=loqme

# Session & JWT Key (Must be at least 32 random characters)
SESSION_SECRET=generate_a_secure_session_secret_with_openssl_rand_hex_32

# Production Public URL
NEXT_PUBLIC_APP_URL=https://loqme.ir

# Image Storage inside container
LISTING_IMAGE_STORAGE_DIR=/app/.data/listing-images

# SMS Provider Integration (kavenegar | farazsms)
SMS_PROVIDER=kavenegar
KAVENEGAR_API_KEY=your_kavenegar_production_api_key_here
FARAZSMS_API_KEY=

# Iranian Payment Gateway Integration (Zarinpal / Saman)
ZARINPAL_MERCHANT_ID=your_zarinpal_merchant_uuid

# Map.ir API Keys (Reverse geocoding and address search)
NEXT_PUBLIC_MAP_API_KEY=your_public_mapir_key
MAPIR_API_KEY=your_server_mapir_key

# Image tag
LOQME_IMAGE=ghcr.io/mobingholizadeh/loqme:latest
EOF

chmod 600 /opt/loqme/.env
```

Also copy `docker-compose.prod.yml` to `/opt/loqme/docker-compose.prod.yml`.

---

## 7. SSH Deployment Key & GitHub Actions Secrets

To enable automated zero-touch CI/CD from GitHub Actions:

### 7.1 Generate Dedicated Deploy SSH Key Pair on Server
```bash
# Generate ed25519 deployment key without passphrase
ssh-keygen -t ed25519 -C "loqme-github-actions-deploy" -f ~/.ssh/loqme_deploy -N ""

# Authorize this key for SSH login
cat ~/.ssh/loqme_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 7.2 Read Private Key
```bash
cat ~/.ssh/loqme_deploy
```
Copy the complete output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`).

### 7.3 Add Secrets to GitHub Repository
Go to your GitHub repository: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret Name | Value | Description |
| :--- | :--- | :--- |
| `SERVER_HOST` | `94.184.43.68` (or `loqme.ir`) | Server IP address or domain |
| `SERVER_USER` | `root` or `ubuntu` | SSH user |
| `SERVER_SSH_KEY` | Contents of `~/.ssh/loqme_deploy` | Private SSH key |
| `SERVER_PORT` | `22` | SSH Port (default `22`) |

---

## 8. First Deployment & Database Migration

Navigate to `/opt/loqme` on the server and launch the production stack:

```bash
cd /opt/loqme

# 1. Pull the application container image
docker compose -f docker-compose.prod.yml pull

# 2. Start PostgreSQL, Redis, Dozzle, and App in background
docker compose -f docker-compose.prod.yml up -d

# 3. Check health status of all services
docker compose -f docker-compose.prod.yml ps
```

### 8.1 Execute Database Migrations
Run Prisma migrations inside the running Next.js container:
```bash
docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy
```

### 8.2 (Optional) Seed Initial Administrative Data
```bash
docker compose -f docker-compose.prod.yml exec -T app npx tsx prisma/seed.ts
```

### 8.3 Verify System Health Endpoint
```bash
curl -I https://loqme.ir/api/health
```
Expected output: `HTTP/2 200` with JSON payload confirming database and Redis status.

---

## 9. Viewing Container Logs & Real-Time Monitoring

Live container logs and process metrics are monitored directly via Docker Compose and Docker stats:

### 9.1 Follow Live Application Logs
```bash
cd /opt/loqme

# Follow live logs from the Next.js app container
docker compose -f docker-compose.prod.yml logs -f --tail=100 app

# Follow logs across all production services (app, postgres, redis)
docker compose -f docker-compose.prod.yml logs -f --tail=50
```

### 9.2 Real-Time CPU, Memory & Resource Statistics
```bash
# Stream CPU %, Memory usage, and Network I/O in real time
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
```

---

## 10. Automated Daily PostgreSQL Backup Script

Create a robust automated backup script to protect PostgreSQL databases with retention management.

### 10.1 Create Backup Script (`/opt/loqme/backup-db.sh`)
```bash
cat << 'EOF' > /opt/loqme/backup-db.sh
#!/bin/bash
set -eo pipefail

# Configuration
BACKUP_DIR="/var/backups/loqme/postgres"
RETENTION_DAYS=14
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/loqme_db_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting PostgreSQL automated backup..."

# Dump database directly from running container and compress
docker compose -f /opt/loqme/docker-compose.prod.yml exec -T postgres \
  pg_dump -U loqme_admin loqme | gzip > "$BACKUP_FILE"

# Set restrictive permissions
chmod 600 "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup completed successfully: $BACKUP_FILE ($FILESIZE)"

# Prune backups older than RETENTION_DAYS
find "$BACKUP_DIR" -type f -name "loqme_db_*.sql.gz" -mtime +$RETENTION_DAYS -exec rm -f {} \;
echo "[$(date)] Old backups older than $RETENTION_DAYS days pruned."
EOF

chmod +x /opt/loqme/backup-db.sh
```

### 10.2 Add Cron Job for Nightly Execution (03:00 AM)
```bash
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/loqme/backup-db.sh >> /var/log/loqme_backup.log 2>&1") | crontab -
```

---

## 11. Android TWA APK Build & Digital Asset Links Verification

### 11.1 Digital Asset Links Verification
Digital Asset Links ensure that Chrome displays Loqme in full-screen standalone mode without showing the browser address bar.

1. Check that the file is served with correct JSON headers:
```bash
curl -i https://loqme.ir/.well-known/assetlinks.json
```
2. Verify domain verification using Google Digital Asset Links API:
```bash
curl "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://loqme.ir&relation=delegate_permission/common.handle_all_urls"
```

### 11.2 Triggering Automated Android APK Build
1. Push a git tag (e.g. `git tag v1.0.0 && git push origin v1.0.0`) or trigger `.github/workflows/build-android.yml` manually from the GitHub Actions tab.
2. The workflow will:
   - Compile the Android application using Gradle 8.5 & JDK 17.
   - Build `ir.loqme.app` debug and release APKs.
   - Upload the downloadable APK artifact.
   - Publish the `.apk` release asset on GitHub Releases.
3. Download the APK and install it on Android devices.
