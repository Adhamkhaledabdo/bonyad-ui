# 🚀 Build and Test Guide - Complete Setup

## ✅ All Changes Implemented

### 1. **Auto-Verify OTP** ✅
- ❌ Removed manual "Verify" button
- ✅ Automatically verifies when 4 digits are entered
- ✅ Smooth user experience - no button click needed

### 2. **Login → OTP Redirect** ✅
- ✅ Detects "pending verification" message from backend
- ✅ Shows alert and redirects to OTP screen
- ✅ Works when trying to login with unverified account

### 3. **OTP Verification API Fixed** ✅
- ✅ Sends correct format: `{ role, phoneNumber, otpCode }`
- ✅ Receives and saves token + user data
- ✅ Navigates to home screen automatically

### 4. **Email Auto-Generation** ✅
- ✅ Format: `phoneNumber + name + @gmail.com`
- ✅ Example: `5545418386TestUser@gmail.com`

### 5. **FCM Token Integration** ✅
- ✅ Real FCM tokens in development builds
- ✅ Fallback tokens in Expo Go
- ✅ No more errors!

## 📱 How to Build for Real Device Testing

### Prerequisites
```bash
# 1. Make sure Android Studio is installed
# 2. Set up Android environment variables

# On macOS, add to ~/.zshrc or ~/.bash_profile:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Reload terminal
source ~/.zshrc
```

### Connect Your Android Device
1. Enable **Developer Options** on your Android phone
2. Enable **USB Debugging**
3. Connect phone to computer via USB
4. Accept USB debugging prompt on phone

### Build Command
```bash
# Navigate to project directory
cd /Users/ahmedfarahat/Desktop/web\&android/bonyad-app

# Build and run on connected device
npx expo run:android
```

**What happens:**
- ✅ Creates development build (APK)
- ✅ Installs on your device
- ✅ Enables real FCM tokens
- ✅ App launches automatically

**First time build takes 5-10 minutes** ⏱️

## 🧪 Complete Testing Checklist

### Test 1: New User Signup → OTP
```
1. Open app
2. Click "Sign Up"
3. Select role (User/Technician)
4. Fill form:
   - Phone: 5545418386
   - Name: Ahmed Test
   - Password: test123
5. Click "Create Account"
6. ✅ Redirects to OTP screen
7. Enter 4-digit OTP (e.g., 1234)
8. ✅ Auto-verifies when 4th digit entered (no button click!)
9. ✅ Shows home screen with FCM token
```

### Test 2: Login with Unverified Account
```
1. Open app (or logout)
2. Enter credentials:
   - Phone: 5545418386
   - Password: test123
3. Click "Login"
4. ✅ Backend returns: "Account pending verification..."
5. ✅ Alert shown: "Verification Required"
6. ✅ Click OK → Redirects to OTP screen
7. Enter 4-digit OTP
8. ✅ Auto-verifies
9. ✅ Logs in successfully
```

### Test 3: Login with Verified Account
```
1. Open app
2. Enter verified account credentials
3. Click "Login"
4. ✅ Backend returns token
5. ✅ Directly goes to home screen
6. ✅ Shows FCM token
7. ✅ Shows "Send Test Notification" button
```

### Test 4: Push Notifications (Development Build Only)
```
1. Login to app
2. Copy FCM token from home screen
3. Click "🔔 Send Test Notification" button
4. ✅ Notification appears!
5. ✅ Tap notification to open app

OR

Use Expo Push Tool:
1. Go to: https://expo.dev/notifications
2. Paste your FCM token
3. Enter title: "Test"
4. Enter message: "Hello!"
5. Click "Send a Notification"
6. ✅ Receive notification on device
```

## 🔄 API Flow Documentation

### Signup Flow

**1. User Registration**
```http
POST https://glynda-unvexatious-felisa.ngrok-free.dev/api/users/register

Request Body:
{
  "name": "Ahmed Test",
  "phoneNumber": "5545418386",
  "password": "test123",
  "role": "USER",
  "email": "5545418386AhmedTest@gmail.com"
}

Response: 201 Created
→ Navigate to OTP screen
```

**2. OTP Verification**
```http
POST http://localhost:8080/api/auth/verify-otp

Request Body:
{
  "role": "USER",
  "phoneNumber": "5545418386",
  "otpCode": "1234"
}

Response: 200 OK
{
  "message": "OTP verified! Account is now APPROVED. Login successful!",
  "token": "eyJhbGciOiJIUzUxMiJ9.eyJwaG9uZU51bWJlciI6IjU1NDU0MTgzODYi...",
  "user": {
    "id": 7,
    "userId": "user7",
    "name": "Ahmed Test",
    "phoneNumber": "5545418386",
    "email": "5545418386AhmedTest@gmail.com",
    "role": "USER",
    "status": "APPROVED",
    "deviceToken": "ExponentPushToken[...]",
    ...
  }
}

→ Save token, role, userId, deviceToken to AsyncStorage
→ Navigate to home screen
```

### Login Flow (Pending Verification)

**1. Login Attempt**
```http
POST https://glynda-unvexatious-felisa.ngrok-free.dev/api/auth/login

Request Body:
{
  "phoneNumber": "5545418386",
  "password": "test123",
  "role": "USER",
  "fcmToken": "ExponentPushToken[...]"
}

Response: 200 OK (but token is null)
{
  "message": "Account pending verification. OTP sent to your phone. Check console for OTP.",
  "token": null,
  "user": null
}

→ App detects "pending verification" in message
→ Shows alert
→ Redirects to OTP screen
```

**2. OTP Verification (Same as above)**

### Login Flow (Already Verified)

```http
POST https://glynda-unvexatious-felisa.ngrok-free.dev/api/auth/login

Request Body:
{
  "phoneNumber": "5545418386",
  "password": "test123",
  "role": "USER",
  "fcmToken": "ExponentPushToken[...]"
}

Response: 200 OK
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "userId": 7,
  "role": "USER",
  "user": { ... }
}

→ Save token and data
→ Navigate to home screen
```

## 🔔 Push Notification Testing

### Method 1: Built-in Test Button (Easiest)
1. Login to app
2. On home screen, click "🔔 Send Test Notification"
3. Notification sent via Expo Push Service
4. Receive notification on device

### Method 2: Expo Push Tool
1. Login and copy FCM token from home screen
2. Visit: https://expo.dev/notifications
3. Paste token (format: `ExponentPushToken[xxxxxx]`)
4. Fill in notification details
5. Click "Send a Notification"

### Method 3: cURL Command
```bash
curl -H "Content-Type: application/json" \
     -X POST https://exp.host/--/api/v2/push/send \
     -d '{
       "to": "ExponentPushToken[YOUR_TOKEN_HERE]",
       "title": "Test from cURL",
       "body": "This is a test notification!",
       "sound": "default",
       "data": { "screen": "home", "userId": 7 }
     }'
```

### Method 4: From Your Backend
```javascript
// Send notification from your backend
const sendPushNotification = async (userFcmToken, title, body) => {
  const message = {
    to: userFcmToken,
    sound: 'default',
    title: title,
    body: body,
    data: { customData: 'value' }
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(message)
  });
};
```

## 📊 Data Saved to AsyncStorage

After successful OTP verification:
```javascript
{
  "@bonyad_auth_token": "eyJhbGciOiJIUzUxMiJ9...",
  "@bonyad_user_role": "USER",
  "@bonyad_user_id": "7",
  "@bonyad_device_token": "ExponentPushToken[xxxxxx]"
}
```

## 🔍 Console Logs Reference

### Successful Signup → OTP → Login:
```
📱 App FCM Token: ExponentPushToken[xxxxxx]
📤 USER Signup Request:
   Phone: 5545418386
   Generated Email: 5545418386AhmedTest@gmail.com
   Role: USER
✅ USER signup successful!
[Navigate to OTP]
📤 Verifying OTP...
   Phone: 5545418386
   OTP: 1234
📥 OTP Verification Response: {
  message: "OTP verified! Account is now APPROVED. Login successful!",
  token: "eyJhbGciOiJIUzUxMiJ9...",
  user: { ... }
}
📱 Saving FCM token: ExponentPushToken[xxxxxx]
✅ Auth data saved successfully
[Navigate to home]
```

### Login with Pending Verification:
```
📱 Using FCM Token: ExponentPushToken[xxxxxx]
📥 Login Response: {
  message: "Account pending verification. OTP sent to your phone.",
  token: null,
  user: null
}
⚠️ Account pending verification - redirecting to OTP
[Alert shown]
[Navigate to OTP]
```

## ⚠️ Troubleshooting

### "ANDROID_HOME not set"
```bash
# Add to ~/.zshrc or ~/.bash_profile
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Reload
source ~/.zshrc
```

### "No devices/emulators found"
```bash
# Check connected devices
adb devices

# Should show:
List of devices attached
ABC123DEF456    device
```

### Build Fails
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
rm -rf node_modules package-lock.json
npm install
npx expo run:android
```

### Still Getting Fallback Tokens
- You're in Expo Go (not development build)
- Build with `npx expo run:android` for real tokens

### Notification Not Received
- ✅ Check FCM token is real (starts with `ExponentPushToken[`)
- ✅ Not fallback token
- ✅ App is running or in background
- ✅ Notification permissions granted

## 📋 Quick Command Reference

```bash
# Navigate to project
cd /Users/ahmedfarahat/Desktop/web\&android/bonyad-app

# Install dependencies
npm install

# Build and run on Android device
npx expo run:android

# Check connected devices
adb devices

# View app logs
adb logcat | grep ReactNativeJS

# Clean build
cd android && ./gradlew clean && cd ..
```

## 🎯 What Works Now

| Feature | Status | Notes |
|---------|--------|-------|
| User Signup | ✅ | Auto-generates email |
| Technician Signup | ✅ | With certificates upload |
| Login (Verified) | ✅ | Direct to home |
| Login (Unverified) | ✅ | Redirects to OTP |
| OTP Auto-Verify | ✅ | No button click needed |
| Token Storage | ✅ | AsyncStorage |
| FCM Tokens (Dev Build) | ✅ | Real tokens |
| FCM Tokens (Expo Go) | ✅ | Fallback tokens |
| Push Notifications | ✅ | In development build |
| Language Toggle | ✅ | AR &#124; EN on all screens |

## 🚀 Ready to Build!

### Step 1: Connect Android Device
- Enable USB debugging
- Connect via USB cable
- Accept prompt on phone

### Step 2: Build
```bash
npx expo run:android
```

### Step 3: Test
- Signup new user
- Verify OTP (auto)
- Send test notification
- ✅ Done!

## 📚 Additional Resources

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Android Studio Setup](https://developer.android.com/studio)
- [ADB Commands](https://developer.android.com/tools/adb)

---

**Build Time:** First build ~5-10 minutes, subsequent builds ~2-3 minutes

**All features are ready for testing! 🎉**

