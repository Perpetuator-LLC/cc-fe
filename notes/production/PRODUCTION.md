# Production Build & Deployment

## Development

```bash
# Start dev server (includes SSR support)
yarn start
# or
npm run start
```

This runs `ng serve` which:
- Starts dev server on http://localhost:4200
- Includes SSR support for configured routes
- Hot-reloads on file changes

**Note:** SSR routes (`/a/:code`, `/podcasts/:id`, `/episodes/:id`) work in dev mode.

---

## Build

For production:
```shell
ng build --configuration=production
# or
yarn build
```

For development:
```shell
ng serve
# or
ng build --configuration=development
```

## Architecture Overview

The frontend is a **single Node.js Express server** that handles:
1. Static file serving (JS, CSS, images)
2. Server-side rendering (SSR) for specific routes
3. Client-side rendering for all other routes

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    nginx (reverse proxy)                        │
│  • SSL termination                                              │
│  • Optional: Gzip, caching                                      │
│  • Routes to frontend (container or PM2 process)                │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               Frontend (Node.js Express Server)                 │
│               server/server.mjs - Port 4000                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ • Serves static files from /browser                        │ │
│  │ • SSR for: /a/:code, /podcasts/:id, /episodes/:id          │ │
│  │ • Client-side rendering for all other routes               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## SSR Routes

SSR is enabled only for social media link previews:
- `/a/:code` - Affiliate landing pages
- `/podcasts/:id` - Podcast pages  
- `/episodes/:id` - Episode pages

All other routes serve `index.html` and use client-side rendering.

**Configuration:** See `src/app/app.routes.server.ts` for SSR route definitions.

## Build Output

After `yarn build`:
```
dist/capital-copilot-fe/
├── browser/              # Static assets
│   ├── index.html
│   ├── *.js              # JavaScript bundles (hashed)
│   ├── *.css             # CSS bundles (hashed)
│   └── assets/           # Images, fonts, etc.
├── server/               # SSR server code
│   ├── server.mjs        # Express server entry point
│   ├── main.server.mjs   # Angular SSR bootstrap
│   └── chunk-*.mjs       # Lazy-loaded chunks
├── 3rdpartylicenses.txt
└── prerendered-routes.json
```

---

## Deployment Options

### Option 1: Docker (Recommended for Production)

See `logs/ai_link/fe74_docker_deployment_ssr.md` for complete Docker documentation.

#### Dockerfile

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy pre-built dist folder
COPY dist/capital-copilot-fe ./

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:4000/ || exit 1

CMD ["node", "server/server.mjs"]
```

#### Docker Build & Run

```bash
# Build the app
yarn build

# Build Docker image
docker build -t capital-copilot-fe:latest .

# Run container
docker run -d -p 4000:4000 capital-copilot-fe:latest

# Verify
curl -s http://localhost:4000/ | head -20
```

#### Docker Compose Example

```yaml
services:
  frontend:
    build: ./capital-copilot-fe
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4000/"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
```

#### nginx Configuration (Docker)

When using Docker, nginx just proxies to the container:

```nginx
upstream frontend {
    server frontend:4000;
}

server {
    listen 443 ssl http2;
    server_name capitalcopilot.io;

    ssl_certificate /etc/letsencrypt/live/capitalcopilot.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/capitalcopilot.io/privkey.pem;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### Option 2: PM2 (Traditional Server)

#### Quick Reference (for deployment scripts)

```bash
# ==============================================================================
# FRONTEND DEPLOYMENT SCRIPT
# ==============================================================================

# Configuration
FE_REPO="/path/to/capital-copilot-fe"        # Local repo path
FE_DEPLOY_DIR="/var/www/capital-copilot-fe"  # Production deploy path
SSR_PORT=4000
PM2_APP_NAME="capital-copilot-fe"
REMOTE_USER="deploy"
REMOTE_HOST="your-server.com"

# 1. Build (run locally or in CI)
cd $FE_REPO
yarn install
yarn build

# 2. Deploy files to server
# Note: ecosystem.config.cjs goes INSIDE the dist folder on server
rsync -avz --delete \
  dist/capital-copilot-fe/ \
  $REMOTE_USER@$REMOTE_HOST:$FE_DEPLOY_DIR/

# Also copy ecosystem config into the deployed directory
rsync -avz \
  ecosystem.config.cjs \
  $REMOTE_USER@$REMOTE_HOST:$FE_DEPLOY_DIR/

# 3. Restart SSR server (run on production server via ssh)
ssh $REMOTE_USER@$REMOTE_HOST << 'EOF'
  cd /var/www/capital-copilot-fe
  mkdir -p logs
  pm2 reload capital-copilot-fe --update-env 2>/dev/null || pm2 start ecosystem.config.cjs
  pm2 save
EOF

# 4. Verify SSR is running
ssh $REMOTE_USER@$REMOTE_HOST "curl -s http://localhost:4000/a/test | grep -q 'og:title' && echo 'SSR OK' || echo 'SSR FAILED'"
```

#### Production Directory Structure (PM2)

After deployment, the production server should have:
```
/var/www/capital-copilot-fe/
├── ecosystem.config.cjs  # PM2 config (copied from repo)
├── browser/              # Static files (served by nginx)
│   ├── index.html
│   ├── *.js
│   ├── *.css
│   └── assets/
├── server/               # SSR server (run by PM2)
│   └── server.mjs
└── logs/                 # PM2 logs (created automatically)
    ├── pm2-out.log
    └── pm2-error.log
```

#### First-Time Setup (on production server)

```bash
# Install Node.js 22+ and PM2
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Create app directory
sudo mkdir -p /var/www/capital-copilot-fe/logs
sudo chown -R $USER:$USER /var/www/capital-copilot-fe

# Deploy files (from local machine - see Quick Reference above)
# After deployment, start PM2 on the server:
cd /var/www/capital-copilot-fe
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Follow instructions to enable auto-start on reboot
```

#### nginx Configuration (PM2)

```nginx
# /etc/nginx/sites-available/capitalcopilot.com

server {
    listen 443 ssl http2;
    server_name capitalcopilot.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/capitalcopilot.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/capitalcopilot.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/json application/xml;

    # Proxy all requests to Express SSR server
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name capitalcopilot.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Verify SSR Works

### Test SSR Locally
```bash
yarn build
yarn serve:ssr:capital-copilot-fe
curl -s http://localhost:4000/a/testcode | grep -E "(og:|twitter:)"
```

### Test Production
```bash
# Should return HTML with og: meta tags
curl -s https://capitalcopilot.com/a/testcode | grep -E "(og:|twitter:)"
```

### Social Media Debuggers
- **Facebook:** https://developers.facebook.com/tools/debug/
- **Twitter:** https://cards-dev.twitter.com/validator  
- **LinkedIn:** https://www.linkedin.com/post-inspector/

---

## PM2 Commands

```bash
pm2 status                    # Check status
pm2 logs capital-copilot-fe   # View logs
pm2 restart capital-copilot-fe # Restart
pm2 reload capital-copilot-fe  # Zero-downtime reload
pm2 stop capital-copilot-fe    # Stop
pm2 delete capital-copilot-fe  # Remove from PM2
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Port the Express server listens on |
| `NODE_ENV` | `production` | Node environment |

**Note:** API URLs are baked into the build. To change endpoints, rebuild the frontend.

---

## Resource Requirements

| Metric | Value | Notes |
|--------|-------|-------|
| Memory (idle) | ~150MB | Node.js base + loaded chunks |
| Memory (under load) | ~300-500MB | Depends on concurrent requests |
| CPU | Low | Mostly I/O bound |
| Disk | ~100MB | Built assets |
| Startup time | ~3-5 seconds | Until ready to serve |

---

## Troubleshooting

### SSR not working (no meta tags in curl)
1. Check server is running: `pm2 status` or `docker ps`
2. Check logs: `pm2 logs capital-copilot-fe` or `docker logs <container>`
3. Test directly: `curl http://localhost:4000/a/testcode`
4. Check nginx config: `sudo nginx -t`

### 502 Bad Gateway
- Express not running or wrong port
- Check: `pm2 status` and `netstat -tlnp | grep 4000`

### Static files 404
- Check Express is serving from correct path
- Verify files exist: `ls /var/www/capital-copilot-fe/browser/`

### Memory issues
- Increase container/PM2 memory limits
- Check for memory leaks in logs
