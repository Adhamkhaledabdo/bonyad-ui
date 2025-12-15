# Portfolio, Subscription & Availability APIs - Complete Guide

## Overview

Complete API documentation for technician profile management including portfolio creation, subscription management, and availability scheduling.

**Base URL:** `https://api.bonyad-hub.com/api` (Production) or `http://localhost:8080/api` (Development)

**Authentication:** All endpoints require Bearer token authentication unless specified as public.

---

## Table of Contents

1. [Portfolio Management APIs](#portfolio-management-apis)
2. [Subscription Management APIs](#subscription-management-apis)
3. [Availability Management APIs](#availability-management-apis)
4. [Complete Examples](#complete-examples)
5. [Quick Reference](#quick-reference)

---

## Portfolio Management APIs

### 1. Create Portfolio

**Endpoint:** `POST /api/portfolios/create`

**Authentication:** Required (Technician Bearer token)

**Description:** Creates a portfolio for the current technician. Each technician can have only one portfolio.

**Request:**
```bash
curl -X POST http://localhost:8080/api/portfolios/create \
  -H "Authorization: Bearer {technician_token}"
```

**Response:**
```json
{
  "id": 1,
  "userId": 1,
  "userName": "Mohamed Technician",
  "userProfileImage": "/uploads/profiles/user1_profile.jpg",
  "isPublic": true,
  "bio": null,
  "specialties": null,
  "yearsOfExperience": null,
  "createdAt": "2025-01-15T10:00:00",
  "updatedAt": "2025-01-15T10:00:00",
  "pastProjects": []
}
```

**Error Responses:**
```json
{
  "error": "Portfolio already exists for this user"
}
```

---

### 2. Get My Portfolio

**Endpoint:** `GET /api/portfolios/my`

**Authentication:** Required (Technician Bearer token)

**Description:** Get the current technician's portfolio with all past projects.

**Request:**
```bash
curl -X GET http://localhost:8080/api/portfolios/my \
  -H "Authorization: Bearer {technician_token}"
```

**Response:**
```json
{
  "id": 1,
  "userId": 1,
  "userName": "Mohamed Technician",
  "userProfileImage": "/uploads/profiles/user1_profile.jpg",
  "isPublic": true,
  "bio": "Experienced AC technician with 10 years of experience",
  "specialties": "AC Installation, Maintenance, Repair",
  "yearsOfExperience": 10,
  "createdAt": "2025-01-15T10:00:00",
  "updatedAt": "2025-01-15T11:00:00",
  "pastProjects": [
    {
      "id": 1,
      "title": "AC Installation - Villa Project",
      "description": "Complete AC installation for 5-bedroom villa",
      "startDate": "2024-06-01",
      "endDate": "2024-06-15",
      "photos": [
        "/uploads/portfolios/project1_photo1.jpg",
        "/uploads/portfolios/project1_photo2.jpg"
      ],
      "clientName": "Ahmed Client",
      "projectValue": 15000.00,
      "location": "Riyadh, Saudi Arabia",
      "isPublic": true
    }
  ]
}
```

---

### 3. Get Public Portfolio by User ID

**Endpoint:** `GET /api/portfolios/user/{userId}`

**Authentication:** Not required (Public endpoint)

**Description:** Get a technician's public portfolio. Only works if portfolio is set to public.

**Request:**
```bash
curl -X GET http://localhost:8080/api/portfolios/user/5
```

**Response:** Same format as "Get My Portfolio"

**Error Responses:**
```json
{
  "error": "Portfolio is private"
}
```

---

### 4. Update Portfolio

**Endpoint:** `PUT /api/portfolios/update`

**Authentication:** Required (Technician Bearer token)

**Description:** Update portfolio information (bio, specialties, years of experience, public/private status).

**Request:**
```bash
curl -X PUT http://localhost:8080/api/portfolios/update \
  -H "Authorization: Bearer {technician_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Experienced AC technician with 10 years of experience in residential and commercial projects",
    "specialties": "AC Installation, Maintenance, Repair, Ductwork",
    "yearsOfExperience": 10,
    "isPublic": true
  }'
```

**Request Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bio` | String | ❌ | Biography/description |
| `specialties` | String | ❌ | Specialties or skills |
| `yearsOfExperience` | Integer | ❌ | Years of experience |
| `isPublic` | Boolean | ❌ | Make portfolio public/private |

**Response:**
```json
{
  "id": 1,
  "userId": 1,
  "userName": "Mohamed Technician",
  "isPublic": true,
  "bio": "Experienced AC technician with 10 years of experience in residential and commercial projects",
  "specialties": "AC Installation, Maintenance, Repair, Ductwork",
  "yearsOfExperience": 10,
  "updatedAt": "2025-01-15T12:00:00"
}
```

---

### 5. Add Past Project to Portfolio

**Endpoint:** `POST /api/portfolios/projects/add`

**Authentication:** Required (Technician Bearer token)

**Description:** Add a past project to the portfolio. Photos should be uploaded separately and URLs included.

**Request:**
```bash
curl -X POST http://localhost:8080/api/portfolios/projects/add \
  -H "Authorization: Bearer {technician_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AC Installation - Villa Project",
    "description": "Complete AC installation for 5-bedroom villa including ductwork and smart controls",
    "startDate": "2024-06-01",
    "endDate": "2024-06-15",
    "photos": [
      "/uploads/portfolios/project1_photo1.jpg",
      "/uploads/portfolios/project1_photo2.jpg"
    ],
    "clientName": "Ahmed Client",
    "projectValue": 15000.00,
    "location": "Riyadh, Saudi Arabia",
    "isPublic": true
  }'
```

**Request Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | String | ✅ | Project title |
| `description` | String | ✅ | Project description |
| `startDate` | String (YYYY-MM-DD) | ✅ | Project start date |
| `endDate` | String (YYYY-MM-DD) | ✅ | Project end date |
| `photos` | List<String> | ❌ | Array of photo URLs |
| `clientName` | String | ❌ | Client name |
| `projectValue` | Double | ❌ | Project value/cost |
| `location` | String | ❌ | Project location |
| `isPublic` | Boolean | ❌ | Make project public (default: true) |

**Response:**
```json
{
  "id": 1,
  "title": "AC Installation - Villa Project",
  "description": "Complete AC installation for 5-bedroom villa",
  "startDate": "2024-06-01",
  "endDate": "2024-06-15",
  "photos": [
    "/uploads/portfolios/project1_photo1.jpg",
    "/uploads/portfolios/project1_photo2.jpg"
  ],
  "clientName": "Ahmed Client",
  "projectValue": 15000.00,
  "location": "Riyadh, Saudi Arabia",
  "isPublic": true
}
```

---

### 6. Update Past Project

**Endpoint:** `PUT /api/portfolios/projects/{projectId}`

**Authentication:** Required (Technician Bearer token)

**Description:** Update an existing past project in the portfolio.

**Request:**
```bash
curl -X PUT http://localhost:8080/api/portfolios/projects/1 \
  -H "Authorization: Bearer {technician_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AC Installation - Villa Project (Updated)",
    "description": "Complete AC installation with smart home integration",
    "photos": [
      "/uploads/portfolios/project1_photo1.jpg",
      "/uploads/portfolios/project1_photo2.jpg",
      "/uploads/portfolios/project1_photo3.jpg"
    ]
  }'
```

**Response:** Same format as "Add Past Project"

---

### 7. Delete Past Project

**Endpoint:** `DELETE /api/portfolios/projects/{projectId}`

**Authentication:** Required (Technician Bearer token)

**Description:** Delete a past project from the portfolio.

**Request:**
```bash
curl -X DELETE http://localhost:8080/api/portfolios/projects/1 \
  -H "Authorization: Bearer {technician_token}"
```

**Response:**
```json
{
  "message": "Past project deleted successfully"
}
```

---

### 8. Get My Past Projects

**Endpoint:** `GET /api/portfolios/projects/my`

**Authentication:** Required (Technician Bearer token)

**Description:** Get all past projects for the current technician.

**Request:**
```bash
curl -X GET http://localhost:8080/api/portfolios/projects/my \
  -H "Authorization: Bearer {technician_token}"
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "AC Installation - Villa Project",
    "description": "Complete AC installation for 5-bedroom villa",
    "startDate": "2024-06-01",
    "endDate": "2024-06-15",
    "photos": [...],
    "clientName": "Ahmed Client",
    "projectValue": 15000.00,
    "location": "Riyadh, Saudi Arabia",
    "isPublic": true
  }
]
```

---

### 9. Get Public Past Projects by User ID

**Endpoint:** `GET /api/portfolios/projects/user/{userId}`

**Authentication:** Not required (Public endpoint)

**Description:** Get all public past projects for a specific technician.

**Request:**
```bash
curl -X GET http://localhost:8080/api/portfolios/projects/user/5
```

**Response:** Array of public past projects (same format as above)

---

### 10. Upload Photo for Past Project

**Endpoint:** `POST /api/portfolios/projects/upload-photo`

**Authentication:** Required (Technician Bearer token)

**Description:** Upload a photo file for use in past projects. Returns the photo URL to include in project creation/update.

**Request (Multipart Form Data):**
```bash
curl -X POST http://localhost:8080/api/portfolios/projects/upload-photo \
  -H "Authorization: Bearer {technician_token}" \
  -F "file=@photo.jpg"
```

**Response:**
```json
{
  "photoUrl": "/uploads/portfolios/photo_1234567890.jpg"
}
```

**Usage:** Use the returned `photoUrl` in the `photos` array when creating or updating a past project.

---

## Subscription Management APIs

### 1. Get All Subscription Categories (Public)

**Endpoint:** `GET /api/subscriptions`

**Authentication:** Not required (Public endpoint)

**Description:** Get all subscription categories (plans) available for technicians.

**Request:**
```bash
curl -X GET http://localhost:8080/api/subscriptions
```

**Response:**
```json
[
  {
    "id": 1,
    "nameAr": "الباقة الأساسية",
    "nameEn": "Basic Plan",
    "descriptionAr": "باقة أساسية للمبتدئين",
    "descriptionEn": "Basic plan for beginners",
    "price": 99.00,
    "durationDays": 30,
    "bidsPerWeek": 5,
    "isActive": true,
    "discountPercentage": null,
    "discountStartDate": null,
    "discountEndDate": null
  },
  {
    "id": 2,
    "nameAr": "الباقة المميزة",
    "nameEn": "Premium Plan",
    "descriptionAr": "باقة متقدمة مع دعم أولوية",
    "descriptionEn": "Advanced plan with priority support",
    "price": 299.00,
    "durationDays": 30,
    "bidsPerWeek": 20,
    "isActive": true,
    "discountPercentage": 15.00,
    "discountStartDate": "2025-01-01T00:00:00",
    "discountEndDate": "2025-01-31T23:59:59"
  }
]
```

---

### 2. Get Active Subscription Categories (Public)

**Endpoint:** `GET /api/subscriptions/active`

**Authentication:** Not required (Public endpoint)

**Description:** Get only active subscription categories.

**Request:**
```bash
curl -X GET http://localhost:8080/api/subscriptions/active
```

**Response:** Same format as above, filtered to only active categories

---

### 3. Get Subscription Category by ID (Public)

**Endpoint:** `GET /api/subscriptions/{id}`

**Authentication:** Not required (Public endpoint)

**Description:** Get details of a specific subscription category.

**Request:**
```bash
curl -X GET http://localhost:8080/api/subscriptions/1
```

**Response:** Single subscription category object

---

### 4. Subscribe to Subscription Category

**Endpoint:** `POST /api/users/subscribe`

**Authentication:** Required (Technician Bearer token)

**Description:** Subscribe the current technician to a subscription category (plan).

**Request:**
```bash
curl -X POST http://localhost:8080/api/users/subscribe \
  -H "Authorization: Bearer {technician_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionCategoryId": 2
  }'
```

**Request Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subscriptionCategoryId` | Long | ✅ | ID of subscription category to subscribe to |

**Response:**
```json
{
  "message": "Subscription successful",
  "userId": "user7",
  "subscriptionCategoryNameEn": "Premium Plan",
  "subscriptionCategoryNameAr": "الباقة المميزة",
  "price": 299.00,
  "startDate": "2025-01-15T10:00:00",
  "endDate": "2025-02-14T10:00:00"
}
```

**Note:** The subscription duration is automatically set based on the category's `durationDays` field.

**Error Responses:**
```json
{
  "error": "Subscription category not found"
}
```

```json
{
  "error": "This subscription category is not active"
}
```

---

### 5. Get My Subscription

**Endpoint:** `GET /api/users/subscription`

**Authentication:** Required (Technician Bearer token)

**Description:** Get the current technician's subscription details.

**Request:**
```bash
curl -X GET http://localhost:8080/api/users/subscription \
  -H "Authorization: Bearer {technician_token}"
```

**Response (Active Subscription):**
```json
{
  "subscriptionCategory": {
    "id": 2,
    "nameEn": "Premium Plan",
    "nameAr": "الباقة المميزة",
    "price": 299.00,
    "bidsPerWeek": 20
  },
  "startDate": "2025-01-15T10:00:00",
  "endDate": "2025-02-14T10:00:00",
  "isExpired": false,
  "isActive": true
}
```

**Response (No Subscription):**
```json
{
  "message": "No active subscription"
}
```

---

### 6. Get My Subscription Bids (Remaining Weekly Bids)

**Endpoint:** `GET /api/users/subscription/bids`

**Authentication:** Required (Technician Bearer token)

**Description:** Get remaining weekly bids for the current technician based on their subscription plan.

**Request:**
```bash
curl -X GET http://localhost:8080/api/users/subscription/bids \
  -H "Authorization: Bearer {technician_token}"
```

**Response:**
```json
{
  "hasActiveSubscription": true,
  "subscriptionCategoryId": 2,
  "subscriptionCategoryNameEn": "Premium Plan",
  "subscriptionCategoryNameAr": "الباقة المميزة",
  "weeklyQuota": 20,
  "bidsRemaining": 15,
  "lastResetAt": "2025-01-15T00:00:00",
  "nextResetAt": "2025-01-22T00:00:00",
  "secondsUntilReset": 345600
}
```

**Response (No Subscription):**
```json
{
  "hasActiveSubscription": false,
  "message": "No active subscription"
}
```

---

### 7. Cancel Subscription

**Endpoint:** `DELETE /api/users/subscription`

**Authentication:** Required (Technician Bearer token)

**Description:** Cancel the current technician's subscription.

**Request:**
```bash
curl -X DELETE http://localhost:8080/api/users/subscription \
  -H "Authorization: Bearer {technician_token}"
```

**Response:**
```json
{
  "message": "Subscription cancelled successfully"
}
```

**Error Responses:**
```json
{
  "error": "No active subscription to cancel"
}
```

---

## Availability Management APIs

### 1. Set Availability Status and Times

**Endpoint:** `POST /api/technicians/availability/set`

**Authentication:** Required (Technician Bearer token)

**Description:** Set availability status (FIXED_TIMES or AVAILABLE_ANYTIME) and optional time slots.

**Request:**
```bash
curl -X POST http://localhost:8080/api/technicians/availability/set \
  -H "Authorization: Bearer {technician_token}" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

**Request Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | String | ✅ | `FIXED_TIMES` or `AVAILABLE_ANYTIME` |
| `slots` | Array | ✅* | Array of time slots (required if status is `FIXED_TIMES`) |

**Slot Object Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dayOfWeek` | String | ✅ | Day name: `SUNDAY`, `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY` |
| `startTime` | String | ✅ | Start time in `HH:mm` format (e.g., "09:00") |
| `endTime` | String | ✅ | End time in `HH:mm` format (e.g., "17:00") |

**Response:**
```json
{
  "message": "Availability status updated successfully",
  "status": "FIXED_TIMES",
  "slotsCount": 2
}
```

**For AVAILABLE_ANYTIME:**
```bash
curl -X POST http://localhost:8080/api/technicians/availability/set \
  -H "Authorization: Bearer {technician_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "AVAILABLE_ANYTIME"
  }'
```

---

### 2. Get Availability Status

**Endpoint:** `GET /api/technicians/availability/status`

**Authentication:** Required (Technician Bearer token)

**Description:** Get current availability status and all time slots.

**Request:**
```bash
curl -X GET http://localhost:8080/api/technicians/availability/status \
  -H "Authorization: Bearer {technician_token}"
```

**Response:**
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
    },
    {
      "id": 2,
      "dayOfWeek": "MONDAY",
      "startTime": "09:00",
      "endTime": "17:00",
      "isActive": true
    }
  ]
}
```

---

### 3. Add Single Availability Slot

**Endpoint:** `POST /api/technicians/availability`

**Authentication:** Required (Technician Bearer token)

**Description:** Add a single availability slot (recurring weekly).

**Request:**
```bash
curl -X POST http://localhost:8080/api/technicians/availability \
  -H "Authorization: Bearer {technician_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "dayOfWeek": "SUNDAY",
    "startTime": "09:00",
    "endTime": "17:00"
  }'
```

**Response:**
```json
{
  "message": "Availability slot added successfully",
  "slot": {
    "id": 1,
    "dayOfWeek": "SUNDAY",
    "startTime": "09:00",
    "endTime": "17:00",
    "isActive": true
  }
}
```

**Note:** You can add multiple slots for the same day (e.g., morning and evening shifts).

---

### 4. Add Bulk Availability Slots

**Endpoint:** `POST /api/technicians/availability/bulk`

**Authentication:** Required (Technician Bearer token)

**Description:** Add multiple availability slots at once. Replaces all existing availability.

**Request:**
```bash
curl -X POST http://localhost:8080/api/technicians/availability/bulk \
  -H "Authorization: Bearer {technician_token}" \
  -H "Content-Type: application/json" \
  -d '{
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
      },
      {
        "dayOfWeek": "TUESDAY",
        "startTime": "09:00",
        "endTime": "17:00"
      }
    ]
  }'
```

**Response:**
```json
{
  "message": "Availability saved successfully",
  "totalSlots": 4,
  "note": "Weekly recurring schedule set"
}
```

**Note:** 
- This replaces all existing availability slots
- Slots are recurring weekly (not date-specific)
- You can add multiple slots per day (e.g., split shifts)

---

### 5. Get My Availability

**Endpoint:** `GET /api/technicians/availability`

**Authentication:** Required (Technician Bearer token)

**Description:** Get all availability slots for the current technician.

**Request:**
```bash
curl -X GET http://localhost:8080/api/technicians/availability \
  -H "Authorization: Bearer {technician_token}"
```

**Response:**
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
    },
    {
      "id": 2,
      "dayOfWeek": "SUNDAY",
      "startTime": "19:00",
      "endTime": "21:00",
      "isActive": true
    },
    {
      "id": 3,
      "dayOfWeek": "MONDAY",
      "startTime": "09:00",
      "endTime": "17:00",
      "isActive": true
    }
  ]
}
```

---

### 6. Get Technician Availability (Public)

**Endpoint:** `GET /api/technicians/{id}/availability`

**Authentication:** Not required (Public endpoint)

**Description:** Get availability for a specific technician by numeric ID.

**Request:**
```bash
curl -X GET http://localhost:8080/api/technicians/5/availability
```

**Response:**
```json
{
  "id": 5,
  "userId": "tech5",
  "technicianName": "Mohamed Technician",
  "status": "FIXED_TIMES",
  "availability": [
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

### 7. Get Technician Availability by User ID (Public)

**Endpoint:** `GET /api/technicians/user/{userId}/availability`

**Authentication:** Not required (Public endpoint)

**Description:** Get availability for a specific technician by userId string.

**Request:**
```bash
curl -X GET http://localhost:8080/api/technicians/user/tech5/availability
```

**Response:** Same format as above

---

### 8. Delete Specific Availability Slot

**Endpoint:** `DELETE /api/technicians/availability/{id}`

**Authentication:** Required (Technician Bearer token)

**Description:** Delete a specific availability slot by ID.

**Request:**
```bash
curl -X DELETE http://localhost:8080/api/technicians/availability/1 \
  -H "Authorization: Bearer {technician_token}"
```

**Response:**
```json
{
  "message": "Availability slot deleted successfully",
  "deletedSlotId": 1
}
```

**Error Responses:**
```json
{
  "error": "Availability slot not found"
}
```

```json
{
  "error": "You can only delete your own availability slots"
}
```

---

### 9. Clear All Availability

**Endpoint:** `DELETE /api/technicians/availability`

**Authentication:** Required (Technician Bearer token)

**Description:** Delete all availability slots for the current technician.

**Request:**
```bash
curl -X DELETE http://localhost:8080/api/technicians/availability \
  -H "Authorization: Bearer {technician_token}"
```

**Response:**
```json
{
  "message": "All availability cleared",
  "deletedCount": 5
}
```

---

## Availability Status Types

| Status | Description | Time Slots Required |
|--------|-------------|---------------------|
| `FIXED_TIMES` | Technician has specific availability times | ✅ Yes |
| `AVAILABLE_ANYTIME` | Technician is available all the time | ❌ No |

---

## Complete Examples

### Example 1: Complete Technician Setup Flow

#### Step 1: Create Portfolio
```bash
POST /api/portfolios/create
Authorization: Bearer {technician_token}
```
**Result:** Portfolio created

#### Step 2: Update Portfolio Info
```bash
PUT /api/portfolios/update
Authorization: Bearer {technician_token}
{
  "bio": "Experienced AC technician",
  "specialties": "AC Installation, Maintenance",
  "yearsOfExperience": 10,
  "isPublic": true
}
```

#### Step 3: Add Past Projects
```bash
POST /api/portfolios/projects/add
Authorization: Bearer {technician_token}
{
  "title": "Villa AC Installation",
  "description": "Complete installation",
  "startDate": "2024-06-01",
  "endDate": "2024-06-15",
  "photos": ["/uploads/portfolios/photo1.jpg"],
  "clientName": "Ahmed Client",
  "projectValue": 15000.00,
  "location": "Riyadh",
  "isPublic": true
}
```

#### Step 4: Subscribe to Plan
```bash
# First, get available plans
GET /api/subscriptions/active

# Then subscribe
POST /api/users/subscribe
Authorization: Bearer {technician_token}
{
  "subscriptionCategoryId": 2
}
```

#### Step 5: Set Availability
```bash
POST /api/technicians/availability/set
Authorization: Bearer {technician_token}
{
  "status": "FIXED_TIMES",
  "slots": [
    {"dayOfWeek": "SUNDAY", "startTime": "09:00", "endTime": "17:00"},
    {"dayOfWeek": "MONDAY", "startTime": "09:00", "endTime": "17:00"}
  ]
}
```

---

### Example 2: Managing Availability

#### Add Single Slot
```bash
POST /api/technicians/availability
{
  "dayOfWeek": "WEDNESDAY",
  "startTime": "14:00",
  "endTime": "18:00"
}
```

#### Add Multiple Slots for Same Day (Split Shift)
```bash
POST /api/technicians/availability/bulk
{
  "availabilities": [
    {"dayOfWeek": "SUNDAY", "startTime": "09:00", "endTime": "12:00"},
    {"dayOfWeek": "SUNDAY", "startTime": "15:00", "endTime": "18:00"}
  ]
}
```

#### Set to Available Anytime
```bash
POST /api/technicians/availability/set
{
  "status": "AVAILABLE_ANYTIME"
}
```

#### Delete Specific Slot
```bash
DELETE /api/technicians/availability/5
```

#### Clear All Availability
```bash
DELETE /api/technicians/availability
```

---

### Example 3: Subscription Management

#### View Available Plans
```bash
GET /api/subscriptions/active
```

#### Subscribe to Plan
```bash
POST /api/users/subscribe
{
  "subscriptionCategoryId": 2
}
```

#### Check My Subscription
```bash
GET /api/users/subscription
```

#### Check Remaining Bids
```bash
GET /api/users/subscription/bids
```

#### Cancel Subscription
```bash
DELETE /api/users/subscription
```

---

## Quick Reference

### Portfolio APIs

| Action | Endpoint | Method | Auth | Description |
|--------|----------|--------|------|-------------|
| Create Portfolio | `/api/portfolios/create` | POST | ✅ | Create portfolio |
| Get My Portfolio | `/api/portfolios/my` | GET | ✅ | Get my portfolio |
| Get Public Portfolio | `/api/portfolios/user/{userId}` | GET | ❌ | Get public portfolio |
| Update Portfolio | `/api/portfolios/update` | PUT | ✅ | Update portfolio info |
| Add Past Project | `/api/portfolios/projects/add` | POST | ✅ | Add past project |
| Update Past Project | `/api/portfolios/projects/{id}` | PUT | ✅ | Update past project |
| Delete Past Project | `/api/portfolios/projects/{id}` | DELETE | ✅ | Delete past project |
| Get My Past Projects | `/api/portfolios/projects/my` | GET | ✅ | Get all my projects |
| Get Public Past Projects | `/api/portfolios/projects/user/{userId}` | GET | ❌ | Get public projects |
| Upload Photo | `/api/portfolios/projects/upload-photo` | POST | ✅ | Upload project photo |

### Subscription APIs

| Action | Endpoint | Method | Auth | Description |
|--------|----------|--------|------|-------------|
| Get All Categories | `/api/subscriptions` | GET | ❌ | Get all plans |
| Get Active Categories | `/api/subscriptions/active` | GET | ❌ | Get active plans |
| Get Category by ID | `/api/subscriptions/{id}` | GET | ❌ | Get plan details |
| Subscribe | `/api/users/subscribe` | POST | ✅ | Subscribe to plan |
| Get My Subscription | `/api/users/subscription` | GET | ✅ | Get my subscription |
| Get Remaining Bids | `/api/users/subscription/bids` | GET | ✅ | Get bid quota |
| Cancel Subscription | `/api/users/subscription` | DELETE | ✅ | Cancel subscription |

### Availability APIs

| Action | Endpoint | Method | Auth | Description |
|--------|----------|--------|------|-------------|
| Set Availability Status | `/api/technicians/availability/set` | POST | ✅ | Set status & slots |
| Get Availability Status | `/api/technicians/availability/status` | GET | ✅ | Get status & slots |
| Add Single Slot | `/api/technicians/availability` | POST | ✅ | Add one slot |
| Add Bulk Slots | `/api/technicians/availability/bulk` | POST | ✅ | Add multiple slots |
| Get My Availability | `/api/technicians/availability` | GET | ✅ | Get all my slots |
| Get Technician Availability | `/api/technicians/{id}/availability` | GET | ❌ | Get public availability |
| Delete Slot | `/api/technicians/availability/{id}` | DELETE | ✅ | Delete specific slot |
| Clear All | `/api/technicians/availability` | DELETE | ✅ | Delete all slots |

---

## Important Notes

### Portfolio
1. **One Portfolio Per Technician:** Each technician can have only one portfolio
2. **Automatic Addition:** Completed projects are automatically added to portfolio
3. **Photo Upload:** Upload photos first, then use URLs in project creation
4. **Public/Private:** Control visibility of portfolio and individual projects

### Subscription
1. **One Active Subscription:** Only one subscription can be active at a time
2. **Automatic Duration:** Subscription duration is set from category's `durationDays`
3. **Bid Quota:** Weekly bid quota is automatically initialized based on plan
4. **Quota Reset:** Weekly quota resets automatically every 7 days
5. **Discounts:** Active discounts are automatically applied when subscribing

### Availability
1. **Recurring Weekly:** Slots are recurring weekly (not date-specific)
2. **Multiple Slots Per Day:** You can add multiple slots for the same day
3. **Status-Based:** Use `FIXED_TIMES` for specific times, `AVAILABLE_ANYTIME` for always available
4. **Bulk Replace:** Bulk add replaces all existing slots
5. **Public Access:** Availability is publicly viewable for booking purposes

---

## Error Handling

### Common Errors

**Unauthorized:**
```json
{
  "error": "Authorization header is required"
}
```

**Forbidden (Wrong Role):**
```json
{
  "error": "Only technicians can perform this action"
}
```

**Not Found:**
```json
{
  "error": "Portfolio not found"
}
```

**Validation Error:**
```json
{
  "error": "dayOfWeek, startTime, and endTime are required"
}
```

**Already Exists:**
```json
{
  "error": "Portfolio already exists for this user"
}
```

---

**Last Updated:** 2025-01-15  
**API Version:** 1.0