# 🏗️ Bonyad App - Web & Android

## 📋 Overview

React Native Expo app for Bonyad construction project management. Built to run on **Web** and **Android** platforms with all features from the iOS app.

---

## ✨ Current Features

### 🎉 Welcome Screen
- Beautiful landing page
- Platform detection (Web/Android)
- Feature showcase
- Get started button

### 🔐 Login Screen (Placeholder)
- Ready for implementation
- Will include all iOS features:
  - Phone authentication
  - Google Sign-In
  - Apple Sign-In
  - Biometric login

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** (installed globally: `npm install -g expo-cli`)
- **Android Studio** (for Android development)
- **Web browser** (for web development)

### Installation

```bash
cd "/Users/ahmedfarahat/Desktop/bonyad-cr-2/web&android/bonyad-app"
npm install
```

### Run on Web

```bash
npm run web
```

Opens at: `http://localhost:8081`

### Run on Android

```bash
npm run android
```

Requires:
- Android Studio installed
- Android emulator running OR
- Physical Android device connected

### Development Mode

```bash
npm start
```

Shows QR code to scan with Expo Go app or choose platform (web/android)

---

## 📁 Project Structure

```
bonyad-app/
├── App.tsx                 # Main app entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── assets/                # Images and icons
│   ├── icon.png
│   ├── splash-icon.png
│   └── favicon.png
├── src/                   # Source code (to be created)
│   ├── screens/           # App screens
│   ├── components/        # Reusable components
│   ├── services/          # API services
│   ├── utils/             # Utilities
│   └── types/             # TypeScript types
└── node_modules/          # Dependencies
```

---

## 🎨 Current Design

### Color Scheme
- **Primary Blue**: `#0080E0`
- **Background**: `#F5F7FA`
- **Text Dark**: `#1A1A1A`
- **Text Light**: `#666`
- **White**: `#FFF`

### Typography
- **App Name**: 36pt, bold
- **Title**: 32pt, bold
- **Subtitle**: 16pt
- **Body**: 14pt
- **Caption**: 12pt

---

## 📱 Platform Support

### ✅ Web
- Runs in any modern browser
- Responsive design
- Box shadows for depth
- Mouse/keyboard interactions
- `Platform.OS === 'web'`

### ✅ Android
- Native Android app
- Material Design components
- Touch interactions
- Elevation for depth
- `Platform.OS === 'android'`

### 🚧 iOS (Future)
- Will share 95% codebase
- Native iOS components
- Platform-specific styling

---

## 🔧 Technologies

### Core
- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **React Native Web** - Web support

### Planned Additions
- **React Navigation** - Navigation
- **Axios** - HTTP requests
- **Firebase** - Backend
- **SignIt SDK** - Digital signatures
- **AsyncStorage** - Local storage
- **OpenAI API** - AI features

---

## 📦 Available Scripts

```bash
# Start development server
npm start

# Run on Web
npm run web

# Run on Android
npm run android

# Run on iOS (future)
npm run ios

# Type checking
npx tsc --noEmit

# Install new package
npx expo install <package-name>
```

---

## 🌟 Features to Implement

Based on iOS app, these features will be added:

### 1. **Authentication** 🔐
- [ ] Phone number login
- [ ] Google OAuth
- [ ] Apple Sign-In (iOS only)
- [ ] Biometric authentication
- [ ] Session management

### 2. **AI Project Generator** 🤖
- [ ] Conversational AI flow
- [ ] OpenAI integration
- [ ] Phase generation
- [ ] Budget calculation

### 3. **Project Management** 📋
- [ ] Create projects
- [ ] View projects
- [ ] Phase tracking
- [ ] Budget breakdown

### 4. **Digital Signatures** ✍️
- [ ] SignIt API integration
- [ ] Document upload
- [ ] Signature requests
- [ ] Status tracking

### 5. **Notifications** 🔔
- [ ] Firebase notifications
- [ ] Push notifications
- [ ] Real-time updates
- [ ] Notification center

### 6. **Payments** 💰
- [ ] Phase-based payments
- [ ] Payment processing
- [ ] Transaction history
- [ ] Invoice generation

### 7. **Chat** 💬
- [ ] Real-time messaging
- [ ] Firebase Firestore
- [ ] Media sharing
- [ ] Chat history

---

## 🎯 Development Roadmap

### Phase 1: Foundation ✅ (Current)
- [x] Initialize Expo app
- [x] Setup web support
- [x] Setup Android support
- [x] Create welcome screen
- [x] Basic navigation

### Phase 2: Authentication 🔄 (Next)
- [ ] Login screen UI
- [ ] Phone authentication
- [ ] Social logins
- [ ] Session management
- [ ] Protected routes

### Phase 3: Core Features
- [ ] Home screen
- [ ] Project creation
- [ ] AI integration
- [ ] Project listing

### Phase 4: Advanced Features
- [ ] Digital signatures
- [ ] Phase management
- [ ] Notifications
- [ ] Chat system

### Phase 5: Payments & Polish
- [ ] Payment integration
- [ ] UI refinements
- [ ] Performance optimization
- [ ] Testing

---

## 🌐 Running on Web

### Start Web Server
```bash
npm run web
```

### Features on Web:
- ✅ Full React Native code runs in browser
- ✅ Responsive design
- ✅ CSS box-shadows
- ✅ Mouse interactions
- ✅ Keyboard navigation
- ✅ Works on any modern browser

### Web-Specific Styling
```typescript
Platform.select({
  web: {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
})
```

---

## 🤖 Running on Android

### Prerequisites
1. **Android Studio** installed
2. **Android SDK** installed
3. **Emulator** created OR **physical device** connected

### Start Android App
```bash
npm run android
```

### First Time Setup
1. Install Android Studio
2. Open Android Studio → SDK Manager
3. Install Android SDK (API 34 or higher)
4. Create virtual device (AVD)
5. Start emulator
6. Run `npm run android`

### Android-Specific Features
- ✅ Native Android components
- ✅ Material Design
- ✅ Touch gestures
- ✅ Elevation shadows
- ✅ Android navigation

---

## 🔄 Platform Detection

The app uses `Platform.OS` to detect platform:

```typescript
if (Platform.OS === 'web') {
  // Web-specific code
} else if (Platform.OS === 'android') {
  // Android-specific code
} else if (Platform.OS === 'ios') {
  // iOS-specific code
}
```

---

## 📸 Screenshots

### Welcome Screen
```
┌─────────────────────────────────────┐
│                                     │
│          🏗️ (Blue Circle)          │
│                                     │
│           Bonyad                    │
│  Construction Project Management    │
│                                     │
│     🌐 Web Version                  │
│                                     │
│  🤖 AI Project Generator            │
│  💰 Phase-based Payments            │
│  ✍️ Digital Signatures              │
│  🔔 Real-time Notifications         │
│                                     │
│  [ Get Started ]                    │
│                                     │
│  Ready for Web & Android            │
└─────────────────────────────────────┘
```

---

## 🛠️ Next Steps

### Immediate (After Setup)
1. Create folder structure (`src/screens`, `src/components`, etc.)
2. Install navigation library
3. Setup API configuration
4. Create design system

### Short Term
1. Implement login screen
2. Add Firebase integration
3. Create home screen
4. Add navigation

### Long Term
1. Port all iOS features
2. Add Android-specific features
3. Optimize for web
4. Deploy to production

---

## 📚 Resources

### Expo Documentation
- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)

### Tutorials
- [Expo Web Setup](https://docs.expo.dev/workflow/web/)
- [Android Development](https://docs.expo.dev/workflow/android-studio-emulator/)
- [TypeScript with React Native](https://reactnative.dev/docs/typescript)

---

## 🎉 Success!

Your React Native Expo app is ready! 

✅ **Initialized** - Expo app created  
✅ **Web Support** - Runs in browser  
✅ **Android Support** - Runs on Android  
✅ **TypeScript** - Type safety enabled  
✅ **Welcome Screen** - Beautiful landing page  
✅ **Ready** - Foundation for all iOS features  

**Run `npm run web` to see it live!** 🚀

