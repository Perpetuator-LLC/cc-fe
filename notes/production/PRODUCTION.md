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

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      nginx (Port 443/80)                        │
│  • SSL termination                                              │
│  • Static file serving (JS, CSS, images)                        │
│  • Gzip compression                                             │
│  • Cache headers                                                │
│  • Route SSR requests to Express                                │
└──────────┬─────────────────────────────────┬────────────────────┘
           │                                 │
           │ Static files                    │ SSR routes only
           │ (90%+ of requests)              │ /a/:code
           ▼                                 │ /podcasts/:id
┌──────────────────────┐                     │ /episodes/:id
│  dist/.../browser/   │                     ▼
│  • *.js              │         ┌────────────────────────┐
│  • *.css             │         │  Express SSR (PM2)     │
│  • assets/*          │         │  Port 4000             │
│  • index.html        │         │  • Server-side render  │
└──────────────────────┘         │  • OG meta tags        │
                                 └────────────────────────┘
```

## SSR Routes

SSR is enabled only for social media link previews:
- `/a/:code` - Affiliate landing pages
- `/podcasts/:id` - Podcast pages  
- `/episodes/:id` - Episode pages

All other routes serve `index.html` and use client-side rendering.

## Build Output

After `yarn build`:
```
dist/capital-copilot-fe/
├── browser/        # Static assets (served by nginx)
│   ├── *.js
│   ├── *.css
│   ├── index.html
│   └── assets/
└── server/
    └── server.mjs  # Express SSR server (PM2)
```

---

## Deployment

### Quick Reference (for deployment scripts)

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

### Production Directory Structure

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

### First-Time Setup (on production server)

```bash
# Install Node.js 20+ and PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
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

### Step 1: Build and Deploy Files

```bash
# Build
yarn build

# Copy to production server
rsync -avz dist/capital-copilot-fe/ user@server:/var/www/capital-copilot-fe/
```

### Step 2: Start Express SSR Server

```bash
# Install PM2 globally (once)
npm install -g pm2

# Start with ecosystem file
pm2 start ecosystem.config.cjs

# Enable auto-restart on reboot
pm2 startup
pm2 save
```

### Step 3: Configure nginx

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

    # Root for static files
    root /var/www/capital-copilot-fe/browser;

    # ============================================================
    # SSR ROUTES - Proxy to Express for server-side rendering
    # These routes need SSR for social media link previews
    # ============================================================
    
    # Affiliate landing pages
    location ~ ^/a/[^/]+$ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Short cache for SSR responses (crawlers will get fresh data)
        proxy_cache_valid 200 5m;
    }

    # Podcast pages
    location ~ ^/podcasts/[^/]+$ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_valid 200 5m;
    }

    # Episode pages
    location ~ ^/episodes/[^/]+$ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_valid 200 5m;
    }

    # ============================================================
    # STATIC FILES - Served directly by nginx (high performance)
    # ============================================================

    # Hashed assets (JS, CSS) - immutable, cache forever
    location ~* \.[a-f0-9]{16,}\.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Other static assets
    location ~* \.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)$ {
        expires 1M;
        add_header Cache-Control "public";
        access_log off;
    }

    # ============================================================
    # SPA FALLBACK - All other routes serve index.html
    # Angular handles client-side routing
    # ============================================================
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name capitalcopilot.com;
    return 301 https://$server_name$request_uri;
}
```

### Step 4: Reload nginx

```bash
# Test configuration
sudo nginx -t

# Reload
sudo systemctl reload nginx
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

## Troubleshooting

### SSR not working (no meta tags in curl)
1. Check PM2 is running: `pm2 status`
2. Check Express logs: `pm2 logs capital-copilot-fe`
3. Test directly: `curl http://localhost:4000/a/testcode`
4. Check nginx config: `sudo nginx -t`

### 502 Bad Gateway
- Express not running or wrong port
- Check: `pm2 status` and `netstat -tlnp | grep 4000`

### Static files 404
- Check root path in nginx config
- Verify files exist: `ls /var/www/capital-copilot-fe/browser/`

