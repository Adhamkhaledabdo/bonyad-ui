#!/bin/bash

# Bonyad Web EC2 Deployment Script
# Usage: ./deploy-to-ec2.sh [ec2-ip] [ec2-username] [ssh-key-path] [domain]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
EC2_HOST=${1:-"18.158.79.181"}
EC2_USER=${2:-"ubuntu"}
SSH_KEY=${3:-"~/Desktop/bonyad-text.pem"}
DOMAIN=${4:-""}

# Expand ~ to home directory
SSH_KEY="${SSH_KEY/#\~/$HOME}"

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ Error: SSH key file not found: $SSH_KEY${NC}"
    echo "Usage: $0 [ec2-ip] [ec2-username] [ssh-key-path] [domain]"
    echo "Example: $0 18.158.79.181 ubuntu ~/Desktop/bonyad-text.pem"
    exit 1
fi

echo -e "${GREEN}🚀 Bonyad Web Deployment Script${NC}"
echo "================================"
echo "EC2 Host: $EC2_HOST"
echo "Username: $EC2_USER"
echo "SSH Key: $SSH_KEY"
if [ -n "$DOMAIN" ]; then
    echo "Domain: $DOMAIN"
fi
echo "================================"
echo ""

# Step 1: Build
echo -e "${YELLOW}📦 Step 1: Building web version...${NC}"
if ! npm run build:web; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build successful!${NC}"
echo ""

# Step 2: Transfer web-build directory to EC2
echo -e "${YELLOW}📤 Step 2: Transferring web-build to EC2...${NC}"
# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/web-build"
if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}❌ Error: web-build directory not found at $BUILD_DIR!${NC}"
    echo "Please run 'npm run build:web' first."
    exit 1
fi

if ! scp -i "$SSH_KEY" -r "$BUILD_DIR" $EC2_USER@$EC2_HOST:/home/$EC2_USER/; then
    echo -e "${RED}❌ Transfer failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Files transferred!${NC}"
echo ""

# Step 3: Deploy on EC2
echo -e "${YELLOW}🚀 Step 3: Deploying on EC2...${NC}"
ssh -i "$SSH_KEY" $EC2_USER@$EC2_HOST << 'ENDSSH'
set -e

echo "Removing old files from /var/www/bonyad-app/..."
sudo rm -rf /var/www/bonyad-app/*

echo "Moving new files to /var/www/bonyad-app/..."
sudo mv ~/web-build/* /var/www/bonyad-app/

echo "Cleaning up uploaded directory..."
rm -rf ~/web-build

echo "Setting permissions..."
sudo chown -R www-data:www-data /var/www/bonyad-app
sudo chmod -R 755 /var/www/bonyad-app

echo "Testing Nginx configuration..."
if ! sudo nginx -t; then
    echo "⚠️  Nginx config test failed. Please check the configuration."
    exit 1
fi

echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment complete on server!"
ENDSSH

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""

# Step 5: Final instructions
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Your site should be accessible at:"
if [ -n "$DOMAIN" ]; then
    echo "  https://$DOMAIN/app/"
    echo "  http://$DOMAIN/app/"
else
    echo "  https://bonyad-hub.com/app/"
    echo "  http://bonyad-hub.com/app/"
    echo "  http://www.bonyad-hub.com/app/"
fi
echo "  http://$EC2_HOST/app/"
echo ""
echo "Next steps:"
echo "1. Visit your site to verify it's working"
echo "2. Configure SSL with Certbot if using a domain"
echo "3. Test all features (login, navigation, API calls)"
echo ""
echo "To view logs:"
echo "  ssh -i $SSH_KEY $EC2_USER@$EC2_HOST"
echo "  sudo tail -f /var/log/nginx/error.log"
echo ""
echo -e "${YELLOW}Note: Make sure Nginx is configured properly!${NC}"
echo "See EC2_DEPLOYMENT.md for detailed instructions."
echo ""

# Cleanup (no tar file to clean up anymore)
echo -e "${GREEN}✅ All done!${NC}"

