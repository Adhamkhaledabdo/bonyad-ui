# Complete Authentication API Guide

## Overview

This document covers all authentication scenarios including registration, login, OTP verification, password management, and token validation.

**Base URL:** `https://api.bonyad-hub.com/api` (Production) or `http://localhost:8080/api` (Development)

---

## Table of Contents

1. [User Registration](#1-user-registration)
2. [Login](#2-login)
3. [OTP Verification](#3-otp-verification)
4. [Resend OTP](#4-resend-otp)
5. [Forgot Password](#5-forgot-password)
6. [Reset Password](#6-reset-password)
7. [Change Password](#7-change-password)
8. [Token Validation](#8-token-validation)
9. [Check User Status](#9-check-user-status)
10. [Complete Flow Scenarios](#10-complete-flow-scenarios)

---

## 1. User Registration

### 1.1 Register User (JSON - No Files)

**Endpoint:** `POST /api/users/register`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "name": "Ahmed Mohamed",
  "phoneNumber": "+201234567890",
  "email": "ahmed@example.com",
  "password": "SecurePass123",
  "role": "USER",
  "regionIds": [1, 2]
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "Ahmed Mohamed",
  "phoneNumber": "+201234567890",
  "email": "ahmed@example.com",
  "role": "USER",
  "status": "PENDING",
  "profileImageUrl": null,
  "createdAt": "2025-01-15T10:30:00"
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `400 Bad Request` - Phone number already exists
- `400 Bad Request` - Email already exists
- `400 Bad Request` - Invalid role

**Error Response Format:**
```json
{
  "message": "Account already exists. Please sign in instead.",
  "messageAr": "الحساب موجود بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.",
  "errorCode": "USER_ALREADY_EXISTS"
}
```

---

### 1.2 Register User with Files (Multipart)

**Endpoint:** `POST /api/users/register-with-files`

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | Yes | User's full name |
| phoneNumber | String | Yes | Phone number (unique) |
| email | String | No | Email address |
| password | String | Yes | User password |
| role | String | Yes | USER, TECHNICIAN, or ADMIN |
| profileImage | File | No | Profile image (jpg, png) |
| certificates | File[] | No | Certificate files (for technicians) |
| yearsOfExperience | Integer | No | Years of experience (for technicians) |
| regionIds | Long[] | No | Array of region IDs |
| description | String | No | User description |

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/users/register-with-files \
  -F "name=Ahmed Mohamed" \
  -F "phoneNumber=+201234567890" \
  -F "email=ahmed@example.com" \
  -F "password=SecurePass123" \
  -F "role=USER" \
  -F "profileImage=@/path/to/image.jpg" \
  -F "regionIds=1" \
  -F "regionIds=2"
```

**Response:** Same as 1.1

**Note:** After registration, user status is `PENDING` and OTP is automatically sent to phone number.

---

## 2. Login

**Endpoint:** `POST /api/auth/login`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "phoneNumber": "+201234567890",
  "password": "SecurePass123",
  "role": "USER",
  "fcmToken": "firebase-fcm-token-here" // Optional
}
```

### Scenario 2.1: APPROVED User Login (Direct)

**Response (200 OK):**
```json
{
  "message": "Login successful!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Ahmed Mohamed",
    "phoneNumber": "+201234567890",
    "email": "ahmed@example.com",
    "role": "USER",
    "status": "APPROVED",
    "profileImageUrl": "http://localhost:8080/uploads/profiles/user1.jpg"
  }
}
```

### Scenario 2.2: PENDING User Login (Requires OTP)

**Response (200 OK):**
```json
{
  "message": "Account pending verification. OTP sent to your phone. Please check your SMS."
}
```

**Next Step:** User must call `/api/auth/verify-otp` to complete login.

### Scenario 2.3: WAITING_ADMIN_APPROVAL (Technician)

**Response (200 OK):**
```json
{
  "message": "Your account is pending admin approval. You will be notified once approved.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "name": "Technician Name",
    "role": "TECHNICIAN",
    "status": "WAITING_ADMIN_APPROVAL"
  }
}
```

**Note:** Technician can login but has limited access until admin approves.

### Error Responses:

**Invalid Credentials:**
```json
{
  "message": "Invalid password. Please try again.",
  "messageAr": "كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.",
  "errorCode": "INVALID_PASSWORD"
}
```

**Account Not Found:**
```json
{
  "message": "Account not found. Please check your phone number and role, or register first.",
  "messageAr": "الحساب غير موجود. يرجى التحقق من رقم الهاتف والدور، أو التسجيل أولاً.",
  "errorCode": "ACCOUNT_NOT_FOUND"
}
```

**Account Suspended:**
```json
{
  "message": "Account is suspended. Please contact support.",
  "messageAr": "الحساب معطل. يرجى الاتصال بالدعم.",
  "errorCode": "ACCOUNT_SUSPENDED"
}
```

---

## 3. OTP Verification

**Endpoint:** `POST /api/auth/verify-otp`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "phoneNumber": "+201234567890",
  "role": "USER",
  "otpCode": "123456",
  "fcmToken": "firebase-fcm-token-here" // Optional
}
```

**Response (200 OK) - User:**
```json
{
  "message": "OTP verified! Account is now APPROVED. Login successful!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Ahmed Mohamed",
    "status": "APPROVED",
    "role": "USER"
  }
}
```

**Response (200 OK) - Technician:**
```json
{
  "message": "OTP verified! Your account is pending admin approval. You will be notified once approved.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "name": "Technician Name",
    "status": "WAITING_ADMIN_APPROVAL",
    "role": "TECHNICIAN"
  }
}
```

**Error Responses:**

**Invalid OTP:**
```json
{
  "message": "Invalid or expired OTP. Please try again.",
  "messageAr": "رمز التحقق غير صحيح أو منتهي الصلاحية. يرجى المحاولة مرة أخرى.",
  "errorCode": "INVALID_OTP"
}
```

**Account Not Found:**
```json
{
  "message": "Account not found. Please check your phone number and role.",
  "messageAr": "الحساب غير موجود. يرجى التحقق من رقم الهاتف والدور.",
  "errorCode": "ACCOUNT_NOT_FOUND"
}
```

---

## 4. Resend OTP

**Endpoint:** `POST /api/auth/resend-otp`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "phoneNumber": "+201234567890",
  "role": "USER"
}
```

**Response (200 OK):**
```json
{
  "message": "OTP resent successfully. Please check your SMS."
}
```

**Error Responses:**

**Account Already Verified:**
```json
{
  "message": "Account already verified. Please login with phone and password.",
  "messageAr": "الحساب تم التحقق منه بالفعل. يرجى تسجيل الدخول برقم الهاتف وكلمة المرور.",
  "errorCode": "ACCOUNT_ALREADY_VERIFIED"
}
```

---

## 5. Forgot Password

### 5.1 Request OTP for Password Reset

**Endpoint:** `POST /api/auth/forgot-password`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "phoneNumber": "+201234567890",
  "role": "USER"
}
```

**Response (200 OK):**
```json
{
  "message": "OTP sent to +201234567890. Please check your SMS."
}
```

**Error Responses:**

**Account Not Found:**
```json
{
  "message": "Account not found. Please check your phone number and role.",
  "messageAr": "الحساب غير موجود. يرجى التحقق من رقم الهاتف والدور.",
  "errorCode": "ACCOUNT_NOT_FOUND"
}
```

---

### 5.2 Resend Forgot Password OTP

**Endpoint:** `POST /api/auth/forgot-password/resend`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "phoneNumber": "+201234567890",
  "role": "USER"
}
```

**Response (200 OK):**
```json
{
  "message": "OTP resent to +201234567890. Please check your SMS."
}
```

---

## 6. Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "phoneNumber": "+201234567890",
  "role": "USER",
  "otpCode": "123456",
  "newPassword": "NewSecurePass123",
  "confirmPassword": "NewSecurePass123"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successful! You can now login with your new password."
}
```

**Error Responses:**

**Passwords Don't Match:**
```json
{
  "message": "Passwords do not match.",
  "messageAr": "كلمات المرور غير متطابقة.",
  "errorCode": "PASSWORDS_DO_NOT_MATCH"
}
```

**Invalid OTP:**
```json
{
  "message": "Invalid or expired OTP. Please try again.",
  "messageAr": "رمز التحقق غير صحيح أو منتهي الصلاحية. يرجى المحاولة مرة أخرى.",
  "errorCode": "INVALID_OTP"
}
```

**Account Not Found:**
```json
{
  "message": "Account not found. Please check your phone number and role.",
  "messageAr": "الحساب غير موجود. يرجى التحقق من رقم الهاتف والدور.",
  "errorCode": "ACCOUNT_NOT_FOUND"
}
```

---

## 7. Change Password

**Endpoint:** `PUT /api/users/{id}/change-password`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "oldPassword": "CurrentPass123",
  "newPassword": "NewSecurePass123"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**

**Invalid Old Password:**
```json
{
  "message": "Old password is incorrect"
}
```

**Password Too Short:**
```json
{
  "message": "New password must be at least 6 characters long"
}
```

**Unauthorized:**
```json
{
  "message": "You can only change your own password"
}
```

---

## 8. Token Validation

**Endpoint:** `POST /api/auth/validate-token`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK) - Valid Token:**
```json
{
  "valid": true,
  "message": "Token is valid",
  "userId": 1,
  "phoneNumber": "+201234567890",
  "role": "USER",
  "status": "APPROVED",
  "user": {
    "id": 1,
    "name": "Ahmed Mohamed",
    "phoneNumber": "+201234567890",
    "role": "USER",
    "status": "APPROVED"
  }
}
```

**Response (200 OK) - Invalid Token:**
```json
{
  "valid": false,
  "message": "Token is invalid or expired"
}
```

---

## 9. Check User Status

**Endpoint:** `GET /api/auth/status/{phoneNumber}?role=USER`

**Response (200 OK):**
```json
{
  "message": "User status: APPROVED"
}
```

**Response (404 Not Found):**
```json
{
  "message": "User not found"
}
```

---

## 10. Complete Flow Scenarios

### Scenario 1: New User Registration → OTP Verification → Login

```
Step 1: Register
POST /api/users/register
→ Status: PENDING
→ OTP sent automatically

Step 2: Verify OTP
POST /api/auth/verify-otp
→ Status: PENDING → APPROVED
→ Token generated

Step 3: User is now logged in!
Use token for subsequent API calls
```

### Scenario 2: Existing User Login (APPROVED)

```
Step 1: Login
POST /api/auth/login
→ Password verified
→ Status: APPROVED
→ Token generated immediately

✅ User logged in!
```

### Scenario 3: PENDING User Login

```
Step 1: Login Attempt
POST /api/auth/login
→ Password verified
→ Status: PENDING
→ OTP sent

Step 2: Verify OTP
POST /api/auth/verify-otp
→ OTP verified
→ Status: PENDING → APPROVED
→ Token generated

✅ User logged in!
```

### Scenario 4: Forgot Password Flow

```
Step 1: Request OTP
POST /api/auth/forgot-password
→ OTP sent to phone

Step 2: Reset Password
POST /api/auth/reset-password
→ OTP verified
→ Password updated

Step 3: Login with New Password
POST /api/auth/login
→ Login successful!
```

### Scenario 5: Technician Registration Flow

```
Step 1: Register as Technician
POST /api/users/register-with-files
→ Upload certificates
→ Status: PENDING
→ OTP sent

Step 2: Verify OTP
POST /api/auth/verify-otp
→ Status: PENDING → WAITING_ADMIN_APPROVAL
→ Token generated (limited access)

Step 3: Admin Approves
→ Status: WAITING_ADMIN_APPROVAL → APPROVED
→ Technician receives notification

Step 4: Full Access
→ Technician can now use all features
```

---

## Error Codes Reference

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `ACCOUNT_NOT_FOUND` | User account not found | 400 |
| `INVALID_PASSWORD` | Password is incorrect | 400 |
| `INVALID_OTP` | OTP is invalid or expired | 400 |
| `ACCOUNT_SUSPENDED` | Account is suspended | 403 |
| `ACCOUNT_NOT_ACTIVE` | Account not active | 403 |
| `ACCOUNT_ALREADY_VERIFIED` | Account already verified | 400 |
| `USER_ALREADY_EXISTS` | Phone/email already registered | 400 |
| `PASSWORDS_DO_NOT_MATCH` | Password confirmation mismatch | 400 |
| `PHONE_NUMBER_REQUIRED` | Phone number missing | 400 |
| `PASSWORD_REQUIRED` | Password missing | 400 |
| `INVALID_ROLE` | Invalid role value | 400 |
| `OTP_SEND_FAILED` | Failed to send OTP | 500 |
| `REGISTRATION_ERROR` | Registration failed | 400/500 |

---

## JWT Token Details

**Token Expiration:** 30 days

**Token Contains:**
- `userId` - User ID
- `phoneNumber` - User's phone number
- `role` - User role (USER, TECHNICIAN, ADMIN)
- `status` - User status (PENDING, APPROVED, etc.)

**Usage:**
```
Authorization: Bearer {token}
```

**Token Validation:**
- Use `/api/auth/validate-token` to check token validity
- Token is automatically validated on protected endpoints

---

## Best Practices

1. **Always handle errors** - Check error codes and display appropriate messages
2. **Store token securely** - Use secure storage (Keychain on iOS, Keystore on Android)
3. **Refresh token** - Validate token before making API calls
4. **Handle OTP expiry** - OTP expires in 5 minutes, resend if needed
5. **Role-based access** - Always include role in requests
6. **FCM Token** - Include FCM token in login/OTP verification for push notifications

---

## Testing Examples

### cURL - Register User
```bash
curl -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "phoneNumber": "+201234567890",
    "password": "Test123",
    "role": "USER"
  }'
```

### cURL - Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+201234567890",
    "password": "Test123",
    "role": "USER"
  }'
```

### cURL - Verify OTP
```bash
curl -X POST http://localhost:8080/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+201234567890",
    "role": "USER",
    "otpCode": "123456"
  }'
```

### cURL - Forgot Password
```bash
curl -X POST http://localhost:8080/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+201234567890",
    "role": "USER"
  }'
```

### cURL - Reset Password
```bash
curl -X POST http://localhost:8080/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+201234567890",
    "role": "USER",
    "otpCode": "123456",
    "newPassword": "NewPass123",
    "confirmPassword": "NewPass123"
  }'
```

---

**Last Updated:** 2025-01-15
**API Version:** 1.0