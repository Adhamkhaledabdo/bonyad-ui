# Subscription and Bid Management APIs

## Overview

Complete API documentation for subscription management and bid quota tracking for technicians.

**Base URL:** `https://api.bonyad-hub.com/api` (Production) or `http://localhost:8080/api` (Development)

**Authentication:** All endpoints require Bearer token authentication.

---

## 1. Subscribe to a Plan

**Endpoint:** `POST /api/users/subscribe`

**Authentication:** Required (Technician Bearer token only)

**Description:** Subscribe to a subscription category/plan. Only approved technicians can subscribe. If the user already has a subscription, the old quota is cleared and replaced with the new plan's quota.

**Request:**
```bash
curl -X POST http://localhost:8080/api/users/subscribe \
  -H "Authorization: Bearer {technician_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionCategoryId": 1
  }'
```

**Request Body:**
```json
{
  "subscriptionCategoryId": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subscriptionCategoryId` | Long | ✅ | ID of the subscription category to subscribe to |

**Response (200 OK):**
```json
{
  "message": "Subscription successful",
  "userId": 5,
  "subscriptionCategoryNameEn": "Premium Plan",
  "subscriptionCategoryNameAr": "الباقة المميزة",
  "price": 299.00,
  "startDate": "2025-01-15T10:00:00",
  "endDate": "2025-02-15T10:00:00"
}
```

**Error Responses:**

- **401 Unauthorized:** Missing or invalid token
- **403 Forbidden:** User is not a technician or technician is not approved
- **400 Bad Request:** 
  - Subscription category not found
  - Subscription category is not active

**Prerequisites:**
- User must be a technician
- Technician must be approved
- Subscription category must exist and be active

**What Happens:**
1. Old subscription quota is cleared (if exists)
2. New subscription is assigned to user
3. Subscription start date is set to current time
4. Subscription end date is calculated based on category's `durationDays`
5. Weekly bid quota is initialized based on category's `bidsPerWeek`

---

## 2. Get Remaining Bids Count

**Endpoint:** `GET /api/users/subscription/bids`

**Authentication:** Required (Technician Bearer token only)

**Description:** Get the current subscription bid quota information including remaining bids, weekly quota, and reset times.

**Request:**
```bash
curl -X GET http://localhost:8080/api/users/subscription/bids \
  -H "Authorization: Bearer {technician_token}"
```

**Response (200 OK) - With Active Subscription:**
```json
{
  "hasActiveSubscription": true,
  "subscriptionCategoryId": 1,
  "subscriptionCategoryNameEn": "Premium Plan",
  "subscriptionCategoryNameAr": "الباقة المميزة",
  "weeklyQuota": 10,
  "bidsRemaining": 7,
  "lastResetAt": "2025-01-08T10:00:00",
  "nextResetAt": "2025-01-15T10:00:00",
  "secondsUntilReset": 345600
}
```

**Response (200 OK) - No Active Subscription:**
```json
{
  "hasActiveSubscription": false,
  "message": "No active subscription"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `hasActiveSubscription` | Boolean | Whether user has an active subscription |
| `subscriptionCategoryId` | Long | ID of subscription category |
| `subscriptionCategoryNameEn` | String | English name of subscription plan |
| `subscriptionCategoryNameAr` | String | Arabic name of subscription plan |
| `weeklyQuota` | Integer | Total bids allowed per week |
| `bidsRemaining` | Integer | Number of bids remaining in current week |
| `lastResetAt` | DateTime | When the quota was last reset |
| `nextResetAt` | DateTime | When the quota will next reset (7 days after last reset) |
| `secondsUntilReset` | Long | Seconds until next quota reset |

**Error Responses:**

- **401 Unauthorized:** Missing or invalid token
- **403 Forbidden:** User is not a technician

**Notes:**
- Quota resets weekly (7 days from last reset)
- If no usage record exists yet, returns default quota from subscription category
- `secondsUntilReset` is calculated as the difference between current time and `nextResetAt`

---

## 3. Unsubscribe / Cancel Subscription

**Endpoint:** `DELETE /api/users/subscription`

**Authentication:** Required (Technician Bearer token only)

**Description:** Cancel the current subscription. Clears subscription details and bid quota.

**Request:**
```bash
curl -X DELETE http://localhost:8080/api/users/subscription \
  -H "Authorization: Bearer {technician_token}"
```

**Response (200 OK):**
```json
{
  "message": "Subscription cancelled successfully"
}
```

**Error Responses:**

- **401 Unauthorized:** Missing or invalid token
- **403 Forbidden:** User is not a technician
- **400 Bad Request:** No active subscription to cancel

**Prerequisites:**
- User must be a technician
- User must have an active subscription

**What Happens:**
1. Subscription category is removed from user
2. Subscription start date is cleared
3. Subscription end date is cleared
4. Bid quota is cleared

**Note:** After unsubscribing, the technician will not be able to create bids until they subscribe to a new plan.

---

## Quick Reference

| Action | Endpoint | Method | Auth | Description |
|--------|----------|--------|------|-------------|
| Subscribe | `/api/users/subscribe` | POST | Technician | Subscribe to a subscription plan |
| Get Bid Count | `/api/users/subscription/bids` | GET | Technician | Get remaining bids and quota info |
| Unsubscribe | `/api/users/subscription` | DELETE | Technician | Cancel current subscription |

---

## Complete Flow Example

```bash
# 1. Subscribe to Premium Plan (ID: 1)
POST /api/users/subscribe
{
  "subscriptionCategoryId": 1
}

# Response: Subscription successful, quota initialized

# 2. Check remaining bids
GET /api/users/subscription/bids

# Response: {
#   "hasActiveSubscription": true,
#   "weeklyQuota": 10,
#   "bidsRemaining": 10
# }

# 3. Create bids (bidsRemaining decreases with each bid)
# ... after creating 3 bids ...

# 4. Check remaining bids again
GET /api/users/subscription/bids

# Response: {
#   "hasActiveSubscription": true,
#   "weeklyQuota": 10,
#   "bidsRemaining": 7
# }

# 5. Unsubscribe (if needed)
DELETE /api/users/subscription

# Response: Subscription cancelled successfully
```

---

## Important Notes

### Subscription
- Only **approved technicians** can subscribe
- If user already has a subscription, old quota is cleared before assigning new one
- Subscription duration is based on category's `durationDays` field
- Weekly bid quota is initialized based on category's `bidsPerWeek` field

### Bid Quota
- Quota resets **weekly** (7 days from last reset)
- Each bid creation consumes 1 bid from the quota
- If quota is 0, technician cannot create new bids
- Quota is automatically refreshed by a scheduled job

### Unsubscribe
- Cancelling subscription immediately removes all subscription benefits
- Bid quota is cleared
- Technician cannot create bids without an active subscription

---

## Related Endpoints

- **Get My Subscription Details:** `GET /api/users/subscription`
- **Get Available Subscription Plans:** `GET /api/subscriptions/categories`
- **Create Bid:** `POST /api/bids/create` (requires active subscription with available quota)

---

**Last Updated:** 2025-01-15  
**API Version:** 1.0