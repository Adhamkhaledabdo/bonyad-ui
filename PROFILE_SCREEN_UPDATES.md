# Profile Screen API Updates

## ✅ Changes Made

### 1. Created Centralized API Configuration
**File:** `src/config/api.ts`

This file contains all API endpoints and helper functions for making API calls.

**Benefits:**
- Single source of truth for all API URLs
- Easy to update - change once, applies everywhere
- Type-safe endpoint definitions
- Helper functions for building URLs

### 2. Updated ProfileScreen to Use API Config
**File:** `src/screens/ProfileScreen.tsx`

Now imports and uses the centralized API configuration.

## 🔧 How to Update API URL

### For Development (ngrok):
1. Open `src/config/api.ts`
2. Update line 4:
   ```typescript
   export const API_BASE_URL = 'https://your-ngrok-url.ngrok-free.dev/api';
   ```

### For Production:
1. Open `src/config/api.ts`
2. Update line 4:
   ```typescript
   export const API_BASE_URL = 'https://your-production-domain.com/api';
   ```

## 📝 Available Endpoints in Config

### Authentication
- `API_ENDPOINTS.AUTH.LOGIN` → `/auth/login`
- `API_ENDPOINTS.AUTH.REGISTER` → `/auth/register`
- `API_ENDPOINTS.AUTH.FORGOT_PASSWORD` → `/auth/forgot-password`
- `API_ENDPOINTS.AUTH.VERIFY_OTP` → `/auth/verify-otP`

### User
- `API_ENDPOINTS.USER.PROFILE` → `/users/profile`
- `API_ENDPOINTS.USER.UPDATE_PROFILE` → `/users/profile`
- `API_ENDPOINTS.USER.PORTFOLIO` → `/users/portfolio`
- `API_ENDPOINTS.USER.CERTIFICATES` → `/users/certificates`

### Projects
- `API_ENDPOINTS.PROJECTS.LIST` → `/projects`
- `API_ENDPOINTS.PROJECTS.CREATE` → `/projects`
- `API_ENDPOINTS.PROJECTS.DETAILS` → `/projects/:id`

### Services
- `API_ENDPOINTS.SERVICES.LIST` → `/services`
- `API_ENDPOINTS.SERVICES.CATEGORIES` → `/services/categories`

## 🚀 How to Use in Your Code

### Basic Usage:
```typescript
import { buildApiUrl, API_ENDPOINTS } from '../config/api';

// Make API call
const response = await fetch(
  buildApiUrl(API_ENDPOINTS.USER.PROFILE),
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);
```

### With Parameters:
```typescript
import { buildApiUrlWithParams, API_ENDPOINTS } from '../config/api';

// Build URL with ID
const url = buildApiUrlWithParams(API_ENDPOINTS.PROJECTS.DETAILS, { id: 123 });
// Result: https://your-api.com/api/projects/123
```

## 📋 Next Steps for Profile Screen

1. **Update API URL** → Set your actual API domain
2. **Add Loading States** → Already implemented ✅
3. **Add Error Handling** → Implement retry logic
4. **Add Profile Editing** → Create edit modal/form
5. **Add Image Upload** → Implement profile picture upload
6. **Add Portfolio Management** → For technicians
7. **Add Certificate Upload** → For technicians

## 🎯 Profile Menu Items to Implement

### For Users:
- [x] My Data (profile info)
- [ ] Home Features (settings)
- [ ] Change Language ✅
- [ ] Dark Mode Toggle ✅

### For Technicians:
- [x] Manage Profile
- [x] My Data
- [ ] My Portfolio (upload/edit projects)
- [ ] Subscription (plans/payments)
- [ ] Home Features (settings)
- [ ] Change Language ✅
- [ ] Dark Mode Toggle ✅

## 🔐 Authentication

All API calls automatically include the auth token from storage:
```typescript
const token = await storage.getAuthToken();
headers: {
  'Authorization': `Bearer ${token}`,
}
```

## 🧪 Testing

1. Start your backend API
2. Update API_BASE_URL in config
3. Test profile loading:
   - Login to app
   - Click on profile
   - Should load user data from API

## 📱 Current Profile Screen Features

✅ Loads user profile data  
✅ Displays name, phone, role  
✅ Shows profile picture  
✅ Displays different menu items for user/technician  
✅ Language toggle  
✅ Dark mode toggle  
✅ Logout functionality  
✅ Responsive design  
✅ Loading states  

## 🚧 TODO

- [ ] Implement "My Data" editing
- [ ] Implement "Manage Profile" for technicians
- [ ] Implement "My Portfolio" for technicians
- [ ] Implement "Subscription" for technicians
- [ ] Add profile picture upload
- [ ] Add certificate upload for technicians
- [ ] Add region selection for technicians
- [ ] Add years of experience editing

