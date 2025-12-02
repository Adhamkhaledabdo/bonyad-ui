# Signup & OTP Verification Update

## Summary
Implemented translation toggle, auto-verify OTP, proper API integration, and AsyncStorage persistence for authentication data.

## Changes Made

### 1. Language Toggle Added
- Added language toggle to both Login and Signup screens
- Users can switch between English and Arabic
- Toggle buttons styled with active state highlighting
- Location: Below the signup/login links on each screen

### 2. OTP Auto-Verification
- OTP automatically verifies when all 4 digits are entered
- No need to click verify button
- 100ms delay to ensure all inputs are captured
- Auto-focus moves to next input field

### 3. Signup Flow
- Signup now properly checks for 201 status code (CREATED)
- On successful signup, navigates directly to OTP screen
- Maintains phone number and role through navigation

### 4. OTP Verification API
- Endpoint: `http://localhost:8080/api/auth/verify-otp`
- Request body format:
```json
{
  "role": "USER" or "TECHNICIAN",
  "phoneNumber": "5545418381",
  "otpCode": "1234"
}
```
- Response includes token, user object with full details
- Auto-saves token, role, userId, and deviceToken to AsyncStorage

### 5. Storage Integration
- Created `/src/utils/storage.ts` utility
- Methods available:
  - `saveAuthData()` - Save token, role, userId, deviceToken
  - `getAuthToken()` - Retrieve saved token
  - `getUserRole()` - Retrieve saved role
  - `getUserId()` - Retrieve saved userId
  - `getDeviceToken()` - Retrieve device token
  - `clearAuthData()` - Clear all auth data

### 6. Translation Updates
Added new translations for language toggle:
- "Language"
- "English"
- "Arabic"
- "Change Language"

## API Endpoints Used

### Signup (User)
- **URL**: `https://glynda-unvexatious-felisa.ngrok-free.dev/api/users/register`
- **Method**: POST
- **Status**: 201 (Created)

### Signup (Technician)
- **URL**: `https://glynda-unvexatious-felisa.ngrok-free.dev/api/users/register-with-files`
- **Method**: POST
- **Status**: 201 (Created)

### Verify OTP
- **URL**: `http://localhost:8080/api/auth/verify-otp`
- **Method**: POST
- **Request Body**:
```json
{
  "role": "USER",
  "phoneNumber": "5545418381",
  "otpCode": "1234"
}
```
- **Response**:
```json
{
  "message": "OTP verified! Account is now APPROVED. Login successful!",
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "user": {
    "id": 7,
    "userId": "user7",
    "name": "Saaaa",
    "phoneNumber": "5545418380",
    "email": "aaa@gmail.com",
    "role": "USER",
    "status": "APPROVED",
    ...
  }
}
```

## Data Persistence
All authentication data is now saved to AsyncStorage:
- `@bonyad_auth_token` - JWT token
- `@bonyad_user_role` - User role (USER/TECHNICIAN)
- `@bonyad_device_token` - FCM device token
- `@bonyad_user_id` - User ID

## Usage Example

```typescript
import { storage } from './utils/storage';

// Save auth data after login/signup
await storage.saveAuthData(token, 'USER', 7, fcmToken);

// Retrieve saved data
const token = await storage.getAuthToken();
const role = await storage.getUserRole();
const userId = await storage.getUserId();
const deviceToken = await storage.getDeviceToken();

// Clear on logout
await storage.clearAuthData();
```

## Files Modified
- `src/screens/LoginScreen.tsx` - Added language toggle, storage integration
- `src/screens/SignupScreen.tsx` - Added language toggle, 201 status check
- `src/screens/OTPVerificationScreen.tsx` - Auto-verify, correct API format, storage integration
- `src/localization/translations/en.json` - Added language translations
- `src/localization/translations/ar.json` - Added Arabic translations
- `src/utils/storage.ts` - New utility for AsyncStorage operations
