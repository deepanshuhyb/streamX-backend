# 🚀 VPS Deployment Guide for `api.streamxtv.sbs`

This guide walks you through deploying `streamX-backend` inside a Docker container on your VPS and exposing it securely via HTTPS on `api.streamxtv.sbs`.

---

## 1. Prerequisites on VPS
Ensure your VPS has Docker and Docker Compose installed (Ubuntu/Debian):
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

---

## 2. DNS Setup
In your DNS provider (e.g., Cloudflare, Namecheap, etc.):
- **Type:** `A`
- **Name:** `api`
- **Content / Target IP:** `<YOUR_VPS_PUBLIC_IP>`
- **Proxy Status:** 
  - *Cloudflare Proxied (Orange Cloud)*: Recommended! Cloudflare gives free SSL, edge caching, and DDoS shielding.
  - *DNS Only (Grey Cloud)*: If you want Caddy / Let's Encrypt directly on the VPS.

---

## 3. Clone & Setup Project on VPS

```bash
# Clone the repository
git clone https://github.com/deepanshuhyb/streamX-backend.git
cd streamX-backend

# Create your .env file
cp .env.example .env
nano .env   # Enter your TMDB_KEY or TMDB_API_READ_ACCESS_TOKEN
```

---

## 4. Run with Docker Compose

```bash
# Build and start container in the background
docker compose up -d --build

# Check logs
docker compose logs -f

# Verify it responds locally
curl http://127.0.0.1:3000/health
```

---

## 5. Expose Securely with SSL (Choose Option A or B)

### Option A: Using Caddy (Recommended - 2 Minutes, Auto SSL)
Install Caddy:
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy -y
```

Copy the Caddy configuration:
```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```
Caddy will automatically obtain a valid Let's Encrypt SSL certificate.

---

### Option B: Using Nginx + Certbot
Install Nginx and Certbot:
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Copy the site configuration:
```bash
sudo cp deploy/nginx-api.streamxtv.sbs.conf /etc/nginx/sites-available/api.streamxtv.sbs
sudo ln -s /etc/nginx/sites-available/api.streamxtv.sbs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Obtain SSL certificate:
```bash
sudo certbot --nginx -d api.streamxtv.sbs
```

---

## 6. Verification
Test from your local computer or terminal:
```bash
curl -I https://api.streamxtv.sbs/health
```
You should receive `HTTP/2 200` or `HTTP/1.1 200 OK` with JSON `{"status":"ok",...}`!
