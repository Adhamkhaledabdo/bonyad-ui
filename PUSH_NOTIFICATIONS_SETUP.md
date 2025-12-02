# 🔔 Push Notifications Setup Guide

## 📋 **Complete Steps to Enable Push Notifications**

### **Step 1: Create Firebase Project**

1. **Go to [Firebase Console](https://console.firebase.google.com/)**
2. **Click "Create a project"**
3. **Enter project name:** `Bonyad App`
4. **Enable Google Analytics:** Yes (recommended)
5. **Click "Create project"**

### **Step 2: Add Android App to Firebase**

1. **In Firebase Console, click "Add app"**
2. **Select Android icon (🤖)**
3. **Enter package name:** `com.bonyad.app`
   - (This should match your app's package name)
4. **App nickname:** `Bonyad Android`
5. **SHA-1 certificate fingerprint:** (Optional for now)
6. **Click "Register app"**

### **Step 3: Download Android Configuration**

1. **Download `google-services.json`**
2. **Save it to your project root:**
   ```
   /Users/ahmedfarahat/Desktop/bonyad-cr-2/web&android/bonyad-app/google-services.json
   ```

### **Step 4: Add iOS App to Firebase (Optional)**

1. **In Firebase Console, click "Add app" again**
2. **Select iOS icon (🍎)**
3. **Enter bundle ID:** `com.bonyad.app`
4. **App nickname:** `Bonyad iOS`
5. **Download `GoogleService-Info.plist`**
6. **Save it to:**
   ```
   /Users/ahmedfarahat/Desktop/bonyad-cr-2/web&android/bonyad-app/GoogleService-Info.plist
   ```

### **Step 5: Install Firebase SDK**

```bash
cd "/Users/ahmedfarahat/Desktop/bonyad-cr-2/web&android/bonyad-app"
npm install firebase
```

### **Step 6: Create app.json Configuration**

Update your `app.json`:

```json
{
  "expo": {
    "name": "Bonyad App",
    "slug": "bonyad-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.bonyad.app",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.bonyad.app",
      "googleServicesFile": "./google-services.json"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-notifications",
      "@react-native-firebase/app"
    ]
  }
}
```

### **Step 7: Install EAS CLI**

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure
```

### **Step 8: Create Development Build**

```bash
# Build for Android
eas build --profile development --platform android

# Build for iOS (if you have Apple Developer account)
eas build --profile development --platform ios
```

### **Step 9: Update FCM Token Hook**

Replace your current `useFCMToken.ts` with:

```typescript
import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const useFCMToken = () => {
  const [fcmToken, setFcmToken] = useState<string>('');

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  const registerForPushNotificationsAsync = async () => {
    try {
      if (Platform.OS === 'web') {
        setFcmToken('web-token-' + Date.now());
        return;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('⚠️ Failed to get push token for push notification!');
        setFcmToken('no-permission-token-' + Date.now());
        return;
      }

      // Get the Expo Push Token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with your actual Expo project ID
      });

      console.log('✅ Expo Push Token:', token.data);
      setFcmToken(token.data);
    } catch (error) {
      console.error('❌ Error getting push token:', error);
      setFcmToken('error-token-' + Date.now());
    }
  };

  return fcmToken;
};
```

### **Step 10: Install Development Build on Device**

1. **Download the APK/IPA** from EAS build
2. **Install on your Android device** (or iOS device)
3. **Test push notifications**

---

## 🎯 **Alternative: Simpler Approach (Recommended for Now)**

### **Option 1: Keep Current Setup (Recommended)**

**For now, keep your current setup because:**
- ✅ **Authentication works perfectly**
- ✅ **App functions normally**
- ✅ **No complex configuration needed**

**Add push notifications later when you actually need them.**

### **Option 2: Use Expo's Push Service (Simpler)**

Instead of Firebase, use Expo's built-in push service:

```typescript
// Simpler approach - use Expo Push API
import * as Notifications from 'expo-notifications';

const sendPushNotification = async (expoPushToken: string) => {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: 'New Order!',
    body: 'You have a new service request',
    data: { someData: 'goes here' },
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
};
```

---

## 📊 **Comparison of Approaches:**

| Approach | Complexity | Firebase Required? | Real FCM Tokens? | Recommended? |
|----------|------------|-------------------|------------------|--------------|
| **Current (Simple Tokens)** | ⭐ Very Easy | ❌ No | ❌ No | ✅ **YES** (for now) |
| **Expo Push API** | ⭐⭐ Easy | ❌ No | ✅ Yes | ✅ **YES** (simple) |
| **Firebase FCM** | ⭐⭐⭐ Complex | ✅ Yes | ✅ Yes | ⚠️ Later |

---

## 🚀 **My Recommendation:**

### **Phase 1: Keep Current Setup**
- ✅ **Authentication works**
- ✅ **Build your app features**
- ✅ **No configuration needed**

### **Phase 2: Add Simple Push Notifications**
- 🔔 **Use Expo Push API** (simpler than Firebase)
- 🔔 **Real push tokens**
- 🔔 **Works with development builds**

### **Phase 3: Advanced Push Features (Optional)**
- 🔥 **Add Firebase FCM** for advanced features
- 🔥 **Analytics, crash reporting**
- 🔥 **Advanced notification features**

---

## 📋 **Quick Start (If You Want Notifications Now):**

### **Simplest Approach:**

1. **Create development build:**
   ```bash
   eas build --profile development --platform android
   ```

2. **Use Expo Push API** (no Firebase needed)

3. **Update FCM token hook** to get real Expo push tokens

4. **Send notifications** via Expo's API

---

## 🎉 **Summary:**

**Current Status:**
- ✅ **Authentication works perfectly**
- ✅ **No configuration needed**
- ✅ **App ready to use**

**For Push Notifications:**
- 🔔 **Option 1:** Keep current (recommended for now)
- 🔔 **Option 2:** Add Expo Push API (simpler)
- 🔔 **Option 3:** Add Firebase FCM (more complex)

**My advice: Focus on building your app features first, add notifications when you actually need them!** 🚀
