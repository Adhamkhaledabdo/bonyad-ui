# 🔧 Android SDK Setup - Fix Build Error

## Error You're Seeing:
```
SDK location not found. Define a valid SDK location with an ANDROID_HOME 
environment variable or by setting the sdk.dir path in your project's 
local properties file
```

## Solution: Set Up Android SDK

### Option 1: Quick Fix - Create local.properties (Recommended)

This is the easiest and fastest solution:

```bash
# Navigate to your project's android folder
cd /Users/ahmedfarahat/Desktop/web\&android/bonyad-app/android

# Create local.properties file with SDK location
echo "sdk.dir=/Users/ahmedfarahat/Library/Android/sdk" > local.properties
```

That's it! Now try running again:
```bash
cd ..
npx expo run:android
```

### Option 2: Set ANDROID_HOME Environment Variable

If Option 1 doesn't work or you want a permanent solution:

#### Step 1: Find Android SDK Location

Try these common locations:
```bash
# Check if Android SDK exists
ls /Users/ahmedfarahat/Library/Android/sdk
```

If it doesn't exist, you need to install Android Studio first.

#### Step 2: Add to Shell Config

Add to your `~/.zshrc` file:
```bash
# Open the file
nano ~/.zshrc

# Add these lines at the end:
export ANDROID_HOME=/Users/ahmedfarahat/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Save: Press Ctrl+O, Enter, then Ctrl+X
```

#### Step 3: Reload Shell
```bash
source ~/.zshrc
```

#### Step 4: Verify
```bash
echo $ANDROID_HOME
# Should output: /Users/ahmedfarahat/Library/Android/sdk
```

### Option 3: Install Android Studio (If SDK Not Found)

If the SDK doesn't exist, you need to install Android Studio:

1. **Download Android Studio**
   - Go to: https://developer.android.com/studio
   - Download for macOS
   - Install the .dmg file

2. **Run Android Studio**
   - Open Android Studio
   - Click "More Actions" → "SDK Manager"
   - Note the SDK Location (usually: `/Users/YOUR_USERNAME/Library/Android/sdk`)

3. **Install Required Components**
   - In SDK Manager, ensure these are installed:
     - ✅ Android SDK Platform 36 (or latest)
     - ✅ Android SDK Build-Tools
     - ✅ Android SDK Platform-Tools
     - ✅ Android SDK Command-line Tools
     - ✅ Android Emulator (optional)

4. **Accept Licenses**
   ```bash
   cd /Users/ahmedfarahat/Library/Android/sdk/tools/bin
   ./sdkmanager --licenses
   # Type 'y' to accept all licenses
   ```

## Quick Command Reference

### After Setup, Test With:
```bash
# Check ANDROID_HOME
echo $ANDROID_HOME

# Check adb (Android Debug Bridge)
adb version

# Check connected devices
adb devices

# Try building again
cd /Users/ahmedfarahat/Desktop/web\&android/bonyad-app
npx expo run:android
```

## Troubleshooting

### Issue: "adb: command not found"
```bash
export PATH=$PATH:/Users/ahmedfarahat/Library/Android/sdk/platform-tools
```

### Issue: Build still fails after setting ANDROID_HOME
```bash
# Clean gradle cache
cd android
./gradlew clean
cd ..

# Try again
npx expo run:android
```

### Issue: "No devices/emulators found"
```bash
# Connect Android device via USB
# Enable USB Debugging on device
# Check if detected
adb devices
```

## Expected Output After Fix

```bash
$ npx expo run:android

✔ Building Android app...
✔ Installing app on device
✔ Starting Metro bundler
✔ App running on device

📱 Your app is now running!
```

## What We Recommend

**For fastest setup:**
1. ✅ Use Option 1 (local.properties) - Takes 10 seconds
2. ✅ If that works, you're done!
3. ✅ If not, install Android Studio (Option 3)
4. ✅ Then use Option 2 for permanent setup

## Commands to Run Now

```bash
# Step 1: Create local.properties
cd /Users/ahmedfarahat/Desktop/web\&android/bonyad-app/android
echo "sdk.dir=/Users/ahmedfarahat/Library/Android/sdk" > local.properties

# Step 2: Go back and try building
cd ..
npx expo run:android
```

If it says SDK location doesn't exist, then install Android Studio first (Option 3).

---

**Quick Fix (Copy & Paste):**
```bash
cd /Users/ahmedfarahat/Desktop/web\&android/bonyad-app/android && echo "sdk.dir=/Users/ahmedfarahat/Library/Android/sdk" > local.properties && cd .. && npx expo run:android
```

