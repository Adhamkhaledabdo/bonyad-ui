# Deploy Bonyad Website to Production

Your website is built and ready to deploy! The built files are in the `dist` folder.

## Quick Deployment Options

### Option 1: Netlify (Recommended - Free & Easy) ⭐

**Steps:**
1. Go to https://netlify.com and sign up/login (free)
2. Click "Add new site" → "Deploy manually"
3. Drag and drop your entire `dist` folder into the upload area
4. Your site will be live in seconds with a URL like `bonyad-app-1234.netlify.app`
5. To customize the domain, go to Site settings → Domain settings

**Pros:** 
- Free
- Automatic SSL
- Instant deployment
- Custom domain support

### Option 2: Vercel (Free & Easy)

**Steps:**
1. Go to https://vercel.com and sign up/login (free)
2. Install Vercel CLI: `npm i -g vercel`
3. In your project folder, run:
   ```bash
   cd dist
   vercel
   ```
4. Follow the prompts (just press Enter for defaults)
5. Your site will be live!

**Pros:**
- Free
- Fast CDN
- Automatic HTTPS
- Preview deployments

### Option 3: GitHub Pages (Free)

**Steps:**
1. Create a new GitHub repository
2. Upload the contents of your `dist` folder to the repository
3. Go to Settings → Pages
4. Select source branch (usually `main`)
5. Your site will be available at `username.github.io/repository-name`

**Pros:**
- Free
- Integrated with GitHub
- Easy updates

### Option 4: Firebase Hosting (Free)

**Steps:**
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Init: `firebase init hosting`
   - Select existing project or create new
   - Public directory: `dist`
   - Configure as single-page app: **Yes**
   - Overwrite index.html: **No**
4. Deploy: `firebase deploy`

**Pros:**
- Free tier
- Fast CDN
- Easy to update

### Option 5: Traditional Hosting (cPanel, Shared Hosting, etc.)

**Steps:**
1. Upload all files from `dist` folder to your hosting `public_html` or `www` directory
2. Make sure `index.html` is in the root
3. Your site should be live!

## Your Built Files Location

```
bonyad-app/
  └── dist/
      ├── index.html (your entry point)
      ├── favicon.ico
      ├── _expo/
      │   └── static/ (JavaScript bundle)
      └── assets/ (all images and fonts)
```

## Testing Before Deployment

You can test your build locally:

```bash
cd dist
npx serve
```

Then open http://localhost:3000 in your browser.

## Updating Your Website

Whenever you make changes:

1. Build the site again:
   ```bash
   npx expo export --platform web
   ```

2. Redeploy by following your chosen platform's instructions

## Recommended: Netlify Drop

For the absolute fastest deployment:
1. Go to https://app.netlify.com/drop
2. Drag and drop your `dist` folder
3. Done! Your site is live.

## Notes

- Your site includes the **Welcome page** (envelope animation) and **Overview page** (About Us)
- The site is fully responsive and works on all devices
- All images and assets are included in the build
- No backend/database is needed - it's a static site

