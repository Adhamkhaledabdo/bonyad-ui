# EC2 Deployment Guide for Bonyad Web

## 📋 Prerequisites
- EC2 instance running Ubuntu/Linux
- SSH access to your EC2 instance
- Domain name (optional, you can use IP address)
- Nginx installed

## 🚀 Deployment Steps

### 1. Build the Web Version Locally

```bash
cd bonyad-app
npm run build:web
```

This creates a `web-build/` folder with all static files.

### 2. Transfer Files to EC2

```bash
# Compress the web-build folder
tar -czf bonyad-web-build.tar.gz web-build/

# Upload to EC2
scp bonyad-web-build.tar.gz ec2-user@your-ec2-ip:~/
```

Or use SFTP/FileZilla to upload the `web-build` folder directly.

### 3. SSH into EC2 Instance

```bash
ssh ec2-user@your-ec2-ip
```

### 4. Extract and Set Up Files

```bash
# Extract the build
tar -xzf bonyad-web-build.tar.gz

# Create web directory with app subdirectory for Bonyad
sudo mkdir -p /var/www/bonyad-hub/app

# Copy files to /app subdirectory
sudo cp -r web-build/* /var/www/bonyad-hub/app/

# Set permissions
sudo chown -R www-data:www-data /var/www/bonyad-hub
sudo chmod -R 755 /var/www/bonyad-hub
```

**IMPORTANT:** The build is configured to be served from the `/app/` subdirectory on your domain.

### 5. Configure Nginx

Create Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/bonyad
```

Add this configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name www.bonyad-hub.com bonyad-hub.com;  # Your domain

    root /var/www/bonyad-hub;
    
    # API proxy (if backend is on same server)
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin panel (if applicable)
    location /admin/ {
        try_files $uri $uri/ /admin/index.html;
    }

    # Bonyad app subdirectory
    location /app/ {
        alias /var/www/bonyad-hub/app/;
        try_files $uri $uri/ /app/index.html;
        
        # Security: Set proper MIME types
        location ~* \.js$ {
            add_header Content-Type "application/javascript; charset=utf-8";
        }
        
        location ~* \.json$ {
            add_header Content-Type "application/json; charset=utf-8";
        }
        
        location ~* \.woff2?$ {
            add_header Content-Type "font/woff2";
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Static assets with proper MIME types
    location ~* /app/_expo/ {
        alias /var/www/bonyad-hub/app/_expo/;
        
        location ~* \.js$ {
            add_header Content-Type "application/javascript; charset=utf-8";
        }
        
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~* /app/assets/ {
        alias /var/www/bonyad-hub/app/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Compress files
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss 
               application/json image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/bonyad /etc/nginx/sites-enabled/
```

Test Nginx configuration:

```bash
sudo nginx -t
```

Reload Nginx:

```bash
sudo systemctl reload nginx
```

### 6. Configure SSL (Optional but Recommended)

Install Certbot:

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
```

Get SSL certificate:

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 7. Set Up Auto-renewal for SSL

```bash
sudo certbot renew --dry-run
```

### 8. Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## 🔍 Verification

1. Visit `https://www.bonyad-hub.com/app/` 
2. You should see the Bonyad welcome screen
3. Test all main features (login, navigation, etc.)

## 📝 Additional Configuration

### Custom Domain Setup

1. Add A record in your DNS:
   - Host: `@` or `your-domain.com`
   - Points to: Your EC2 public IP

2. Add CNAME for www (optional):
   - Host: `www`
   - Points to: `your-domain.com`

### Environment Variables

If you need different API endpoints for production:

1. Create `.env.production` in your local `bonyad-app` folder
2. Rebuild
3. Deploy

Current API is already set to: `https://www.bonyad-hub.com`

## 🔄 Updating the Site

To update your deployed site:

```bash
# 1. Build new version locally
npm run build:web

# 2. Upload to EC2
scp -r web-build/* ec2-user@your-ec2-ip:~/web-build/

# 3. SSH into EC2
ssh ec2-user@your-ec2-ip

# 4. Copy to web directory
sudo cp -r ~/web-build/* /var/www/bonyad/

# 5. Clear browser cache (or add cache-busting)
```

## 🐛 Troubleshooting

### Issue: 404 errors on page refresh
**Solution:** Ensure `try_files $uri $uri/ /index.html;` is in your Nginx config.

### Issue: Static assets not loading
**Solution:** Check file permissions and Nginx location blocks.

### Issue: CORS errors with API
**Solution:** API server should allow requests from your domain.

### Issue: Maps not showing
**Solution:** Verify Google Maps API key is valid and allows your domain.

## 📊 Monitoring

### Check Nginx logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Check EC2 status
```bash
sudo systemctl status nginx
```

## ✅ Deployment Checklist

- [ ] Built web version successfully
- [ ] Transferred files to EC2
- [ ] Configured Nginx
- [ ] Set proper permissions
- [ ] Tested site access
- [ ] Configured SSL (recommended)
- [ ] Set up firewall rules
- [ ] Tested all main features
- [ ] Verified mobile responsiveness
- [ ] Checked API connectivity

## 🌐 Your Site URLs

- Production: `https://your-domain.com` or `http://your-ec2-ip`
- Make sure to replace `your-domain.com` with your actual domain

---

**Notes:**
- Keep your EC2 instance updated: `sudo apt update && sudo apt upgrade`
- Regular backups recommended
- Monitor server resources (CPU, memory, disk)
- Set up CloudWatch alarms for monitoring (optional)

