#!/usr/bin/env node

/**
 * Script to update asset paths in the built Expo web app for subdirectory deployment
 * Run this after building to update all paths to use /app/ prefix
 */

const fs = require('fs');
const path = require('path');

const WEB_BUILD_DIR = path.join(__dirname, '..', 'web-build');

function updatePathsInFile(filePath, prefix) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // First pass: fix double /app/app/ paths that might have been created
    if (content.includes('/app/app/')) {
      content = content.replace(/\/app\/app\//g, '/app/');
      modified = true;
    }

    // Update various asset path patterns
    const patterns = [
      { from: /"\/_expo\//g, to: '"/app/_expo/' },
      { from: /'\/_expo\//g, to: "'/app/_expo/" },
      { from: /`\/_expo\//g, to: '`/app/_expo/' },
      { from: /uri:"\/_expo\//g, to: 'uri:"/app/_expo/' },
      { from: /src="\/_expo\//g, to: 'src="/app/_expo/' },
      { from: /href="\/_expo\//g, to: 'href="/app/_expo/' },
      // Update asset paths - but check if they're already /app/ first
      { from: /uri:"\/assets\//g, to: 'uri:"/app/assets/' },
      { from: /"\/assets\//g, to: '"/app/assets/' },
      { from: /'\/assets\//g, to: "'/app/assets/" },
      { from: /href="\/favicon\.ico"/g, to: 'href="/app/favicon.ico"' },
    ];

    patterns.forEach(({ from, to }) => {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    });

    // Final pass: remove any remaining double /app/app/ and /assets/assets/
    if (content.includes('/app/app/')) {
      content = content.replace(/\/app\/app\//g, '/app/');
      modified = true;
    }
    
    // Fix /assets/assets/ → /assets/  (Expo creates this pattern in some cases)
    if (content.includes('/assets/assets/')) {
      content = content.replace(/\/assets\/assets\//g, '/assets/');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
  return false;
}

function processDirectory(dir, prefix) {
  const items = fs.readdirSync(dir);

  items.forEach((item) => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath, prefix);
    } else if (
      stat.isFile() &&
      (item.endsWith('.html') || item.endsWith('.js') || item.endsWith('.json'))
    ) {
      updatePathsInFile(fullPath, prefix);
    }
  });
}

// Fix double /assets/assets/ directories created by Expo
function fixAssetDirectories() {
  const assetsDir = path.join(WEB_BUILD_DIR, 'assets', 'assets');
  
  if (fs.existsSync(assetsDir)) {
    console.log('🔧 Fixing double /assets/assets/ directory structure...');
    
    // Move all files from assets/assets/ up to assets/
    const items = fs.readdirSync(assetsDir);
    
    items.forEach(item => {
      const sourcePath = path.join(assetsDir, item);
      const destPath = path.join(WEB_BUILD_DIR, 'assets', item);
      
      if (fs.existsSync(destPath)) {
        // If destination exists and it's a directory, merge contents
        if (fs.statSync(sourcePath).isDirectory() && fs.statSync(destPath).isDirectory()) {
          const subItems = fs.readdirSync(sourcePath);
          subItems.forEach(subItem => {
            const subSource = path.join(sourcePath, subItem);
            const subDest = path.join(destPath, subItem);
            fs.renameSync(subSource, subDest);
          });
        }
      } else {
        fs.renameSync(sourcePath, destPath);
      }
    });
    
    // Remove the now-empty assets/assets/ directory
    try {
      fs.rmdirSync(assetsDir);
      console.log('✅ Fixed double assets directory');
    } catch (error) {
      console.log('⚠️  Could not remove assets/assets/ directory:', error.message);
    }
  }
}

// Main execution
console.log('🔧 Updating asset paths for subdirectory deployment...\n');

if (!fs.existsSync(WEB_BUILD_DIR)) {
  console.error('❌ web-build directory not found!');
  process.exit(1);
}

// First, fix the double assets directories
fixAssetDirectories();

// Then update all paths in JS/HTML files
processDirectory(WEB_BUILD_DIR, '/app/');

console.log('\n✅ Path update complete!');
console.log('📦 Your build is ready for deployment to /app/ subdirectory.');

