# ACCURA — Financial Operations Platform — Production Deployment Guide

This document details the production environment configuration, deployment steps, Nginx web server configuration, database migrations, caching procedures, and operational procedures for deploying **ACCURA**.

---

## 1. System Requirements

* **Operating System**: Ubuntu 22.04 LTS / Debian 12 / Enterprise Linux
* **PHP**: PHP 8.2+ with extensions: `ext-bcmath`, `ext-ctype`, `ext-curl`, `ext-dom`, `ext-fileinfo`, `ext-gd`, `ext-json`, `ext-mbstring`, `ext-openssl`, `ext-[#pdo_mysql]`, `ext-tokenizer`, `ext-xml`, `ext-zip`
* **Database**: MySQL 8.0+ / MariaDB 10.6+ (InnoDB engine)
* **Node.js**: Node 20+ LTS & npm 10+ (for building frontend static assets)
* **Web Server**: Nginx / Apache with HTTPS SSL termination (Let's Encrypt / Certbot)

---

## 2. Production Environment Setup

### Backend (.env)
Copy `.env.example` to `.env` in `backend/`:

```bash
cd backend
cp .env.example .env
php artisan key:generate
```

Configure required variables in `backend/.env`:

```ini
APP_NAME="ACCURA"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://billing.yourdomain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=lr_billing_prod
DB_USERNAME=lr_billing_user
DB_PASSWORD=YOUR_STRONG_PASSWORD

CORS_ALLOWED_ORIGINS="https://billing.yourdomain.com"
SANCTUM_STATEFUL_DOMAINS="billing.yourdomain.com"
```

### Frontend (.env)
Configure API base URL in `frontend/.env`:

```ini
VITE_API_BASE_URL=https://billing.yourdomain.com/api/v1
```

---

## 3. Database Deployment & Migrations

Run non-destructive migrations on the production MySQL database:

```bash
cd backend
php artisan migrate --force
```

> **IMPORTANT**: Never run `migrate:fresh`, `migrate:refresh`, or `db:wipe` in production environments.

---

## 4. Storage & Optimization Commands

Execute Laravel optimization commands:

```bash
cd backend

# Create public storage symlink for PDF/asset accessibility
php artisan storage:link

# Cache configuration, routes, and views
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Ensure file permissions for web server user (`www-data`):

```bash
chown -R www-data:www-data backend/storage backend/bootstrap/cache
chmod -R 775 backend/storage backend/bootstrap/cache
```

---

## 5. Frontend Production Build

Compile the React frontend TypeScript/Vite bundle:

```bash
cd frontend
npm ci
npm run build
```

The static SPA assets will be compiled to `frontend/dist/`. Serve these assets using Nginx or publish them into `backend/public/`.

---

## 6. Nginx Web Server Configuration

Sample production Nginx configuration (`/etc/nginx/sites-available/lr-billing`):

```nginx
server {
    listen 80;
    server_name billing.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name billing.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/billing.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/billing.yourdomain.com/privkey.pem;

    root /var/www/invoice-ledger-automator/backend/public;
    index index.php index.html;

    charset utf-8;
    client_max_body_size 20M;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

---

## 7. Automated Backups & Rollback

- **Database Backup**: Schedule daily MySQL dumps using `mysqldump`:
  ```bash
  mysqldump -u lr_billing_user -p lr_billing_prod | gzip > /var/backups/lr_billing_$(date +\%F).sql.gz
  ```
- **Rollback Procedure**: If a deployment requires rollback, revert git commit, run `composer install --no-dev`, `php artisan config:cache`, `php artisan route:cache`, and reload `php-fpm` and `nginx`.
