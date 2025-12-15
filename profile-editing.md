# Complete Profile Editing API Guide

## Overview

This comprehensive guide covers all profile editing APIs for both **Users** and **Technicians**, including profile information, availability, services, portfolio, support tickets, password, phone number, and subscription management.

**Base URL:** `https://api.bonyad-hub.com/api` (Production) or `http://localhost:8080/api` (Development)

---

## Table of Contents

1. [Profile Information Editing](#1-profile-information-editing)
2. [Password Management](#2-password-management)
3. [Phone Number Management](#3-phone-number-management)
4. [Profile Image Management](#4-profile-image-management)
5. [Availability Management (Technicians)](#5-availability-management-technicians)
6. [Services Management (Technicians)](#6-services-management-technicians)
7. [Portfolio Management (Technicians)](#7-portfolio-management-technicians)
8. [Support Tickets](#8-support-tickets)
9. [Subscription Management (Technicians)](#9-subscription-management-technicians)

---

## 1. Profile Information Editing

### 1.1 Update User Profile

**Endpoint:** `PUT /api/users/{id}/profile`

**Authentication:** Required (Bearer token)

**Authorization:** Users can only update their own profile

**Request Body:**
```json
{
  "name": "Ahmed Mohamed",
  "email": "ahmed@example.com",
  "description": "Updated user description",
  "yearsOfExperience": 5,
  "regionIds": [1, 2, 3]
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "userId": "user1",
  "name": "Ahmed Mohamed",
  "phoneNumber": "+201234567890",
  "email": "ahmed@example.com",
  "role": "USER",
  "status": "APPROVED",
  "description": "Updated user description",
  "yearsOfExperience": 5,
  "profileImageUrl": "http://localhost:8080/uploads/profiles/user1.jpg",
  "regions": [
    {
      "id": 1,
      "nameAr": "الرياض",
      "nameEn": "Riyadh"
    }
  ]
}
```

**Error Responses:**
- `403 Forbidden` - Trying to update another user's profile
- `400 Bad Request` - Invalid data

---

### 1.2 Update Profile Image

**Endpoint:** `POST /api/users/update-profile-image`

**Content-Type:** `multipart/form-data`

**Authentication:** Required (Bearer token)

**Form Data:**
```
profileImage: <file> (jpg, png, gif)
```

**Response (200 OK):**
```json
{
  "message": "Profile image updated successfully",
  "profileImageUrl": "http://localhost:8080/uploads/profiles/user1_profile_1234567890.jpg"
}
```

---

### 1.3 Get My Profile

**Endpoint:** `GET /api/users/me`

**Authentication:** Required (Bearer token)

**Response (200 OK):**
```json
{
  "id": 1,
  "userId": "user1",
  "name": "Ahmed Mohamed",
  "phoneNumber": "+201234567890",
  "email": "ahmed@example.com",
  "role": "USER",
  "status": "APPROVED",
  "profileImageUrl": "http://localhost:8080/uploads/profiles/user1.jpg",
  "regions": [...],
  "services": [...],
  "averageRating": 4.5
}
```

---

## 2. Password Management

### 2.1 Change Password

**Endpoint:** `PUT /api/users/{id}/change-password`

**Authentication:** Required (Bearer token)

**Authorization:** Users can only change their own password

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
- `400 Bad Request` - Old password is incorrect
- `400 Bad Request` - New password must be at least 6 characters
- `403 Forbidden` - Trying to change another user's password

**Note:** For forgot password flow, use `/api/auth/forgot-password` and `/api/auth/reset-password` (see Authentication API Guide)

---

## 3. Phone Number Management

### 3.1 Request Phone Number Change

**Endpoint:** `POST /api/users/{id}/change-phone-request`

**Authentication:** Required (Bearer token)

**Authorization:** Users can only change their own phone number

**Request Body:**
```json
{
  "newPhoneNumber": "+201999999999"
}
```

**Response (200 OK):**
```json
{
  "message": "OTP sent to new phone number. Please verify to complete the change."
}
```

**Process:**
1. User requests phone change with new number
2. OTP is sent to the new phone number
3. User verifies OTP using `/api/users/{id}/change-phone-verify`
4. Phone number is updated

---

### 3.2 Verify Phone Number Change

**Endpoint:** `POST /api/users/{id}/change-phone-verify`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "otpCode": "123456"
}
```

**Response (200 OK):**
```json
{
  "message": "Phone number changed successfully",
  "newPhoneNumber": "+201999999999"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid or expired OTP
- `403 Forbidden` - Not authorized to change this user's phone

---

## 4. Profile Image Management

### 4.1 Update Profile Image

**Endpoint:** `POST /api/users/update-profile-image`

**Content-Type:** `multipart/form-data`

**Authentication:** Required (Bearer token)

**Form Data:**
```
profileImage: <file>
```

**Response (200 OK):**
```json
{
  "message": "Profile image updated successfully",
  "profileImageUrl": "http://localhost:8080/uploads/profiles/user1_profile_1234567890.jpg"
}
```

---

## 5. Availability Management (Technicians)

### 5.1 Set Availability Status and Times

**Endpoint:** `POST /api/technicians/availability/set`

**Authentication:** Required (Technician Bearer token)

**Request Body:**
```json
{
  "status": "FIXED_TIMES",
  "slots": [
    {
      "dayOfWeek": "SUNDAY",
      "startTime": "09:00",
      "endTime": "17:00"
    },
    {
      "dayOfWeek": "MONDAY",
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
```

**Availability Status Options:**
- `FIXED_TIMES` - Technician has specific time slots (requires `slots` array)
- `AVAILABLE_ANYTIME` - Technician is available all the time (no slots needed)

**Response (200 OK):**
```json
{
  "message": "Availability status updated successfully",
  "status": "FIXED_TIMES",
  "slotsCount": 2
}
```

---

### 5.2 Get My Availability Status

**Endpoint:** `GET /api/technicians/availability/status`

**Authentication:** Required (Technician Bearer token)

**Response (200 OK):**
```json
{
  "status": "FIXED_TIMES",
  "slots": [
    {
      "id": 1,
      "dayOfWeek": "SUNDAY",
      "startTime": "09:00",
      "endTime": "17:00",
      "isActive": true
    }
  ]
}
```

---

### 5.3 Get My Availability (Full Details)

**Endpoint:** `GET /api/technicians/availability`

**Authentication:** Required (Technician Bearer token)

**Response (200 OK):**
```json
{
  "status": "FIXED_TIMES",
  "slots": [
    {
      "id": 1,
      "dayOfWeek": "SUNDAY",
      "startTime": "09:00",
      "endTime": "17:00",
      "isActive": true
    }
  ]
}
```

---

### 5.4 Set Bulk Availability (Weekly Recurring)

**Endpoint:** `POST /api/technicians/availability/bulk`

**Authentication:** Required (Technician Bearer token)

**Request Body:**
```json
{
  "availabilities": [
    {
      "dayOfWeek": "SUNDAY",
      "startTime": "09:00",
      "endTime": "17:00"
    },
    {
      "dayOfWeek": "SUNDAY",
      "startTime": "19:00",
      "endTime": "21:00"
    },
    {
      "dayOfWeek": "MONDAY",
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "message": "Availability set successfully",
  "slotsCreated": 3
}
```

---

### 5.5 Add Single Availability Slot

**Endpoint:** `POST /api/technicians/availability`

**Authentication:** Required (Technician Bearer token)

**Request Body:**
```json
{
  "dayOfWeek": "TUESDAY",
  "startTime": "10:00",
  "endTime": "18:00"
}
```

**Response (200 OK):**
```json
{
  "id": 5,
  "dayOfWeek": "TUESDAY",
  "startTime": "10:00",
  "endTime": "18:00",
  "isActive": true
}
```

---

### 5.6 Delete Availability Slot

**Endpoint:** `DELETE /api/technicians/availability/{id}`

**Authentication:** Required (Technician Bearer token)

**Response (200 OK):**
```json
{
  "message": "Availability slot deleted successfully"
}
```

---

### 5.7 Clear All Availability

**Endpoint:** `DELETE /api/technicians/availability`

**Authentication:** Required (Technician Bearer token)

**Response (200 OK):**
```json
{
  "message": "All availability slots cleared"
}
```

---

### 5.8 Get Technician Availability (Public)

**Endpoint:** `GET /api/technicians/{id}/availability`

**Authentication:** Not required (Public endpoint)

**Response (200 OK):**
```json
{
  "id": 1,
  "userId": "tech1",
  "technicianName": "John Doe",
  "status": "FIXED_TIMES",
  "slots": [
    {
      "id": 1,
      "dayOfWeek": "SUNDAY",
      "startTime": "09:00",
      "endTime": "17:00",
      "isActive": true
    }
  ]
}
```

---

## 6. Services Management (Technicians)

### 6.1 Add Services to Profile

**Endpoint:** `POST /api/technicians/services/add`

**Authentication:** Required (Technician Bearer token)

**Request Body:**
```json
{
  "serviceIds": [28, 29, 30]
}
```

**Response (200 OK):**
```json
{
  "message": "Services added successfully",
  "userId": "user7",
  "services": [
    {
      "id": 28,
      "nameAr": "خدمات التصميم",
      "nameEn": "Design Services"
    },
    {
      "id": 29,
      "nameAr": "خدمات المقاولات",
      "nameEn": "Contracting Services"
    }
  ]
}
```

---

### 6.2 Get My Services

**Endpoint:** `GET /api/technicians/services`

**Authentication:** Required (Technician Bearer token)

**Response (200 OK):**
```json
{
  "userId": "user7",
  "services": [
    {
      "id": 28,
      "nameAr": "خدمات التصميم",
      "nameEn": "Design Services",
      "description": "Building plans design, interior design...",
      "imageUrl": "http://localhost:8080/storage/75/interorexteriro.jpeg"
    }
  ]
}
```

---

### 6.3 Remove Service

**Endpoint:** `DELETE /api/technicians/services/{serviceId}`

**Authentication:** Required (Technician Bearer token)

**Response (200 OK):**
```json
{
  "message": "Service removed successfully",
  "removedServiceId": 28
}
```

---

## 7. Portfolio Management (Technicians)

### 7.1 Create Portfolio

**Endpoint:** `POST /api/portfolios/create`

**Authentication:** Required (Technician Bearer token)

**Response (200 OK):**
```json
{
  "id": 1,
  "userId": 5,
  "technicianName": "Ahmed Technician",
  "pastProjects": [],
  "isPublic": true,
  "createdAt": "2025-01-15T10:30:00"
}
```

---

### 7.2 Get My Portfolio

**Endpoint:** `GET /api/portfolios/my`

**Authentication:** Required (Technician Bearer token)

**Response (200 OK):**
```json
{
  "id": 1,
  "userId": 5,
  "technicianName": "Ahmed Technician",
  "pastProjects": [
    {
      "id": 1,
      "title": "Kitchen Renovation",
      "description": "Complete kitchen renovation",
      "photos": ["photo1.jpg", "photo2.jpg"],
      "startDate": "2024-01-01",
      "endDate": "2024-01-15"
    }
  ],
  "isPublic": true
}
```

---

### 7.3 Update Portfolio

**Endpoint:** `PUT /api/portfolios/update`

**Authentication:** Required (Technician Bearer token)

**Request Body:**
```json
{
  "isPublic": true
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "isPublic": true,
  "updatedAt": "2025-01-15T11:00:00"
}
```

---

### 7.4 Add Past Project to Portfolio

**Endpoint:** `POST /api/portfolios/projects/add`

**Content-Type:** `multipart/form-data`

**Authentication:** Required (Technician Bearer token)

**Form Data:**
```
title: Kitchen Renovation
description: Complete kitchen renovation including plumbing
startDate: 2024-01-01
endDate: 2024-01-15
clientName: John Smith
projectValue: 5000.00
location: Riyadh, Saudi Arabia
isPublic: true
photos: <file1>
photos: <file2>
photos: <file3>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "title": "Kitchen Renovation",
  "description": "Complete kitchen renovation including plumbing",
  "photos": ["photo1.jpg", "photo2.jpg", "photo3.jpg"],
  "startDate": "2024-01-01",
  "endDate": "2024-01-15",
  "clientName": "John Smith",
  "projectValue": 5000.00,
  "location": "Riyadh, Saudi Arabia",
  "isPublic": true
}
```

---

### 7.5 Update Past Project

**Endpoint:** `PUT /api/portfolios/projects/{projectId}`

**Authentication:** Required (Technician Bearer token)

**Request Body:**
```json
{
  "title": "Kitchen Renovation - Updated",
  "description": "Complete kitchen renovation including plumbing, tiling, and fixtures",
  "startDate": "2024-01-01",
  "endDate": "2024-01-20",
  "projectValue": 5500.00,
  "isPublic": true
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "title": "Kitchen Renovation - Updated",
  "description": "Complete kitchen renovation including plumbing, tiling, and fixtures",
  "startDate": "2024-01-01",
  "endDate": "2024-01-20",
  "projectValue": 5500.00,
  "isPublic": true
}
```

---

### 7.6 Delete Past Project

**Endpoint:** `DELETE /api/portfolios/projects/{projectId}`

**Authentication:** Required (Technician Bearer token)

**Response (200 OK):**
```json
{
  "message": "Past project deleted successfully"
}
```

---

### 7.7 Get My Past Projects

**Endpoint:** `GET /api/portfolios/projects/my`

**Authentication:** Required (Technician Bearer token)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "title": "Kitchen Renovation",
    "description": "Complete kitchen renovation",
    "photos": ["photo1.jpg", "photo2.jpg"],
    "startDate": "2024-01-01",
    "endDate": "2024-01-15",
    "clientName": "John Smith",
    "projectValue": 5000.00,
    "location": "Riyadh, Saudi Arabia",
    "isPublic": true
  }
]
```

---

### 7.8 Get Public Portfolio by User ID

**Endpoint:** `GET /api/portfolios/user/{userId}`

**Authentication:** Not required (Public endpoint)

**Response (200 OK):**
```json
{
  "id": 1,
  "userId": 5,
  "technicianName": "Ahmed Technician",
  "pastProjects": [
    {
      "id": 1,
      "title": "Kitchen Renovation",
      "photos": ["photo1.jpg", "photo2.jpg"],
      "isPublic": true
    }
  ],
  "isPublic": true
}
```

---

### 7.9 Upload Project Photo

**Endpoint:** `POST /api/portfolios/projects/upload-photo`

**Content-Type:** `multipart/form-data`

**Authentication:** Required (Technician Bearer token)

**Form Data:**
```
projectId: 1
photo: <file>
```

**Response (200 OK):**
```json
{
  "message": "Photo uploaded successfully",
  "photoUrl": "http://localhost:8080/uploads/portfolios/project1_photo_1234567890.jpg"
}
```

---

## 8. Support Tickets

### 8.1 Create Support Ticket

**Endpoint:** `POST /api/support/tickets`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "subject": "Payment Issue",
  "message": "I have an issue with my payment",
  "priority": "HIGH",
  "attachments": ["file1.pdf", "file2.jpg"]
}
```

**Priority Options:** `LOW`, `MEDIUM`, `HIGH`, `URGENT`

**Response (201 Created):**
```json
{
  "id": 1,
  "subject": "Payment Issue",
  "message": "I have an issue with my payment",
  "status": "OPEN",
  "priority": "HIGH",
  "createdAt": "2025-01-15T10:30:00",
  "attachments": [
    {
      "url": "http://localhost:8080/uploads/tickets/file1.pdf",
      "type": "application/pdf"
    }
  ]
}
```

---

### 8.2 Get My Tickets

**Endpoint:** `GET /api/support/tickets?status=OPEN`

**Authentication:** Required (Bearer token)

**Query Parameters:**
- `status` (optional): Filter by status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "subject": "Payment Issue",
    "status": "OPEN",
    "priority": "HIGH",
    "createdAt": "2025-01-15T10:30:00"
  }
]
```

---

### 8.3 Get Ticket by ID with Messages

**Endpoint:** `GET /api/support/tickets/{id}`

**Authentication:** Required (Bearer token)

**Response (200 OK):**
```json
{
  "id": 1,
  "subject": "Payment Issue",
  "message": "I have an issue with my payment",
  "status": "OPEN",
  "priority": "HIGH",
  "createdAt": "2025-01-15T10:30:00",
  "messages": [
    {
      "id": 1,
      "content": "Initial message",
      "senderId": 2,
      "senderName": "Ahmed User",
      "createdAt": "2025-01-15T10:30:00",
      "attachments": []
    },
    {
      "id": 2,
      "content": "Admin response",
      "senderId": 1,
      "senderName": "Admin",
      "createdAt": "2025-01-15T11:00:00",
      "attachments": []
    }
  ]
}
```

**Note:** Messages are automatically marked as read when user views the ticket

---

### 8.4 Add Message to Ticket

**Endpoint:** `POST /api/support/tickets/{id}/messages`

**Content-Type:** `multipart/form-data` (for attachments) or `application/json`

**Authentication:** Required (Bearer token)

**Request Body (JSON):**
```json
{
  "content": "Additional information about the issue",
  "attachments": ["file3.pdf"]
}
```

**Request Body (Form Data):**
```
content: Additional information about the issue
attachments: <file1>
attachments: <file2>
```

**Response (200 OK):**
```json
{
  "id": 3,
  "content": "Additional information about the issue",
  "senderId": 2,
  "senderName": "Ahmed User",
  "createdAt": "2025-01-15T12:00:00",
  "attachments": [
    {
      "url": "http://localhost:8080/uploads/tickets/file3.pdf",
      "type": "application/pdf"
    }
  ]
}
```

---

### 8.5 Resolve Ticket

**Endpoint:** `PUT /api/support/tickets/{id}/resolve`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "resolution": "Issue resolved by updating payment method"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "status": "RESOLVED",
  "resolvedAt": "2025-01-15T13:00:00",
  "resolution": "Issue resolved by updating payment method"
}
```

**Note:** Only ticket creator can resolve their own ticket

---

## 9. Subscription Management (Technicians)

### 9.1 Get All Subscription Plans

**Endpoint:** `GET /api/subscriptions/categories`

**Authentication:** Not required (Public endpoint)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "nameAr": "الباقة الأساسية",
    "nameEn": "Basic Plan",
    "descriptionAr": "اشتراك أساسي للفنيين - صلاحية 30 يوم",
    "descriptionEn": "Basic subscription for technicians - 30 days access",
    "price": 99.99,
    "durationDays": 30,
    "isActive": true,
    "finalPrice": 99.99
  },
  {
    "id": 2,
    "nameAr": "الباقة المميزة",
    "nameEn": "Premium Plan",
    "descriptionAr": "اشتراك مميز للفنيين - صلاحية 90 يوم",
    "descriptionEn": "Premium subscription for technicians - 90 days access",
    "price": 249.99,
    "durationDays": 90,
    "isActive": true,
    "finalPrice": 224.99
  }
]
```

**Note:** `finalPrice` includes any active discounts

---

### 9.2 Get Subscription Plan by ID

**Endpoint:** `GET /api/subscriptions/categories/{id}`

**Authentication:** Not required (Public endpoint)

**Response (200 OK):**
```json
{
  "id": 1,
  "nameAr": "الباقة الأساسية",
  "nameEn": "Basic Plan",
  "price": 99.99,
  "durationDays": 30,
  "finalPrice": 99.99
}
```

---

### 9.3 Subscribe to Plan

**Endpoint:** `POST /api/technicians/subscribe`

**Authentication:** Required (Technician Bearer token)

**Request Body:**
```json
{
  "subscriptionCategoryId": 1,
  "durationMonths": 1
}
```

**Response (200 OK):**
```json
{
  "message": "Subscription activated successfully",
  "subscription": {
    "id": 1,
    "categoryId": 1,
    "categoryName": "Basic Plan",
    "startDate": "2025-01-15",
    "endDate": "2025-02-14",
    "isActive": true,
    "price": 99.99
  }
}
```

---

### 9.4 Get My Subscription

**Endpoint:** `GET /api/technicians/subscription`

**Authentication:** Required (Technician Bearer token)

**Response (200 OK):**
```json
{
  "id": 1,
  "categoryId": 1,
  "categoryName": "Basic Plan",
  "startDate": "2025-01-15",
  "endDate": "2025-02-14",
  "isActive": true,
  "price": 99.99,
  "daysRemaining": 25
}
```

**Response (404 Not Found) - No Active Subscription:**
```json
{
  "message": "No active subscription found"
}
```

---

### 9.5 Cancel Subscription

**Endpoint:** `DELETE /api/technicians/subscription`

**Authentication:** Required (Technician Bearer token)

**Response (200 OK):**
```json
{
  "message": "Subscription cancelled successfully"
}
```

**Note:** Subscription remains active until end date, but won't auto-renew

---

## Quick Reference Table

| Feature | Endpoint | Method | Auth | Role |
|---------|----------|--------|------|------|
| **Update Profile** | `/api/users/{id}/profile` | PUT | ✅ | User/Technician |
| **Update Profile Image** | `/api/users/update-profile-image` | POST | ✅ | User/Technician |
| **Change Password** | `/api/users/{id}/change-password` | PUT | ✅ | User/Technician |
| **Change Phone** | `/api/users/{id}/change-phone-request` | POST | ✅ | User/Technician |
| **Verify Phone Change** | `/api/users/{id}/change-phone-verify` | POST | ✅ | User/Technician |
| **Set Availability** | `/api/technicians/availability/set` | POST | ✅ | Technician |
| **Get My Availability** | `/api/technicians/availability` | GET | ✅ | Technician |
| **Add Services** | `/api/technicians/services/add` | POST | ✅ | Technician |
| **Get My Services** | `/api/technicians/services` | GET | ✅ | Technician |
| **Remove Service** | `/api/technicians/services/{serviceId}` | DELETE | ✅ | Technician |
| **Create Portfolio** | `/api/portfolios/create` | POST | ✅ | Technician |
| **Get My Portfolio** | `/api/portfolios/my` | GET | ✅ | Technician |
| **Add Past Project** | `/api/portfolios/projects/add` | POST | ✅ | Technician |
| **Create Ticket** | `/api/support/tickets` | POST | ✅ | User/Technician |
| **Get My Tickets** | `/api/support/tickets` | GET | ✅ | User/Technician |
| **Get Plans** | `/api/subscriptions/categories` | GET | ❌ | Public |
| **Subscribe** | `/api/technicians/subscribe` | POST | ✅ | Technician |
| **Get My Subscription** | `/api/technicians/subscription` | GET | ✅ | Technician |
| **Cancel Subscription** | `/api/technicians/subscription` | DELETE | ✅ | Technician |

---

## Testing Examples

### Update Profile
```bash
curl -X PUT http://localhost:8080/api/users/1/profile \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "updated@example.com",
    "description": "New description"
  }'
```

### Change Password
```bash
curl -X PUT http://localhost:8080/api/users/1/change-password \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "OldPass123",
    "newPassword": "NewPass123"
  }'
```

### Set Availability (Technician)
```bash
curl -X POST http://localhost:8080/api/technicians/availability/set \
  -H "Authorization: Bearer {technician_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "FIXED_TIMES",
    "slots": [
      {"dayOfWeek": "SUNDAY", "startTime": "09:00", "endTime": "17:00"}
    ]
  }'
```

### Add Services (Technician)
```bash
curl -X POST http://localhost:8080/api/technicians/services/add \
  -H "Authorization: Bearer {technician_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceIds": [28, 29]
  }'
```

### Create Support Ticket
```bash
curl -X POST http://localhost:8080/api/support/tickets \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Payment Issue",
    "message": "I need help with payment",
    "priority": "HIGH"
  }'
```

### Subscribe to Plan (Technician)
```bash
curl -X POST http://localhost:8080/api/technicians/subscribe \
  -H "Authorization: Bearer {technician_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionCategoryId": 1,
    "durationMonths": 1
  }'
```

---

## Authorization Summary

### User Profile Editing
- ✅ Users can edit their own profile
- ✅ Users can change their own password
- ✅ Users can change their own phone number (with OTP verification)
- ❌ Users cannot edit other users' profiles

### Technician-Specific Features
- ✅ Only technicians can manage availability
- ✅ Only technicians can manage services
- ✅ Only technicians can manage portfolio
- ✅ Only technicians can subscribe to plans

### Support Tickets
- ✅ Users and technicians can create tickets
- ✅ Users and technicians can view their own tickets
- ✅ Users and technicians can add messages to their tickets
- ✅ Users and technicians can resolve their own tickets

---

## Error Codes Reference

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `UNAUTHORIZED` | Missing or invalid token | 401 |
| `FORBIDDEN` | Not authorized for this action | 403 |
| `PROFILE_UPDATE_ERROR` | Profile update failed | 400 |
| `INVALID_PASSWORD` | Old password incorrect | 400 |
| `INVALID_OTP` | OTP verification failed | 400 |
| `PHONE_ALREADY_EXISTS` | Phone number already registered | 400 |
| `SERVICE_NOT_FOUND` | Service ID not found | 404 |
| `SUBSCRIPTION_NOT_FOUND` | No active subscription | 404 |

---

**Last Updated:** 2025-01-15  
**API Version:** 1.0