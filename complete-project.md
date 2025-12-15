# Phase Payment, Review, and Project Completion APIs

Complete guide for paying phases, completing phases, reviewing users/technicians, and completing projects from the technician side.

**Base URL:** `https://www.bonyad-hub.com/api` (Production) or `http://localhost:8080/api` (Development)

---

## 📋 Table of Contents

1. [Pay for Phase API (User/Project Owner)](#1-pay-for-phase-api-userproject-owner)
2. [Complete Phase API (Technician)](#2-complete-phase-api-technician)
3. [Review User API](#3-review-user-api)
4. [Review Technician API](#4-review-technician-api)
5. [Complete Project API (Technician)](#5-complete-project-api-technician)
6. [Complete Workflow Example](#6-complete-workflow-example)

---

## 1. Pay for Phase API (User/Project Owner) 💰

### Endpoint
```
POST /api/phases/{phaseId}/pay
```

### Authentication
- **Required:** Yes
- **Role:** Project Owner (USER role)
- **Header:** `Authorization: Bearer {user_token}`

### Description
Allows the project owner to pay for an approved phase. The phase must be approved before payment can be made.

### Prerequisites
- ✅ Phase must be approved (`isApproved: true`)
- ✅ Phase payment status must be `PENDING` or `REQUESTED_PAYMENT`
- ✅ User account must be `APPROVED` status
- ✅ User must be the project owner

### Request

**Method:** `POST`  
**URL:** `/api/phases/{phaseId}/pay`  
**Headers:**
```
Authorization: Bearer {user_token}
Content-Type: application/json
```

**Path Parameters:**
- `phaseId` (Long, required) - The ID of the phase to pay for

**Example:**
```bash
POST /api/phases/1/pay
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

### Response

**Success (200 OK):**
```json
{
  "message": "Payment successful! Phase is now PAID.",
  "phaseId": 1,
  "phaseNumber": 1,
  "paymentStatus": "PAID",
  "paidAt": "2025-01-15T14:30:00",
  "moneySpent": 1500.00,
  "paidBy": "user3",
  "paidByName": "Sara Ali"
}
```

**Error Responses:**

**400 Bad Request - Phase not approved:**
```json
{
  "message": "Phase must be approved before payment"
}
```

**400 Bad Request - Already paid:**
```json
{
  "message": "Phase already paid"
}
```

**403 Forbidden - Not project owner:**
```json
{
  "message": "Only the project owner can pay for phases. You are not the owner of this project."
}
```

**403 Forbidden - Account not approved:**
```json
{
  "message": "Your account must be verified to make payments"
}
```

### cURL Example
```bash
curl -X POST "https://www.bonyad-hub.com/api/phases/1/pay" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json"
```

### Postman Example
```
Method: POST
URL: https://www.bonyad-hub.com/api/phases/1/pay
Headers:
  Authorization: Bearer YOUR_USER_TOKEN
```

### iOS Swift Example
```swift
func payForPhase(phaseId: Int, token: String) async throws -> [String: Any] {
    let url = URL(string: "\(baseURL)/api/phases/\(phaseId)/pay")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw URLError(.badServerResponse)
    }
    
    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
    return json ?? [:]
}
```

### What Happens After Payment
- ✅ Phase payment status changes to `PAID`
- ✅ `paidAt` timestamp is set
- ✅ Notification sent to technician about payment received
- ✅ Audit log entry created

---

## 2. Complete Phase API (Technician) ✅

### Endpoint
```
POST /api/phases/{phaseId}/complete
```

### Authentication
- **Required:** Yes
- **Role:** Technician (assigned to the project)
- **Header:** `Authorization: Bearer {technician_token}`

### Description
Allows the assigned technician to mark a phase as completed. The phase must be paid before it can be completed.

### Prerequisites
- ✅ Phase must be paid (`paymentStatus: PAID`)
- ✅ Technician must be assigned to the project
- ✅ Technician must be authenticated

### Request

**Method:** `POST`  
**URL:** `/api/phases/{phaseId}/complete`  
**Headers:**
```
Authorization: Bearer {technician_token}
Content-Type: application/json
```

**Path Parameters:**
- `phaseId` (Long, required) - The ID of the phase to complete

**Example:**
```bash
POST /api/phases/1/complete
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

### Response

**Success (200 OK):**
```json
{
  "message": "Phase marked as completed",
  "phase": {
    "id": 1,
    "projectId": 38,
    "phaseNumber": 1,
    "description": "Phase 1: Site preparation",
    "timeSpentDays": 3,
    "moneySpent": 1500.00,
    "isApproved": true,
    "paymentStatus": "PAID",
    "paidAt": "2025-01-15T14:30:00",
    "isCompleted": true
  }
}
```

**Error Responses:**

**400 Bad Request - Phase not paid:**
```json
{
  "message": "Phase must be paid before it can be marked as completed"
}
```

**403 Forbidden - Not assigned technician:**
```json
{
  "message": "You can only complete phases for your assigned projects"
}
```

### cURL Example
```bash
curl -X POST "https://www.bonyad-hub.com/api/phases/1/complete" \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json"
```

### Postman Example
```
Method: POST
URL: https://www.bonyad-hub.com/api/phases/1/complete
Headers:
  Authorization: Bearer YOUR_TECHNICIAN_TOKEN
```

### iOS Swift Example
```swift
func completePhase(phaseId: Int, token: String) async throws -> [String: Any] {
    let url = URL(string: "\(baseURL)/api/phases/\(phaseId)/complete")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw URLError(.badServerResponse)
    }
    
    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
    return json ?? [:]
}
```

### What Happens After Completion
- ✅ Phase `isCompleted` field changes to `true`
- ✅ Notification sent to project owner about phase completion
- ✅ Audit log entry created

---

## 3. Review User API ⭐

### Endpoint
```
POST /api/reviews
```

### Authentication
- **Required:** Yes
- **Role:** Any authenticated user (can be Technician reviewing User, or User reviewing User)
- **Header:** `Authorization: Bearer {token}`

### Description
Allows any authenticated user to review another user. This is typically used when a technician reviews a project owner (user) after completing work together.

### Prerequisites
- ✅ Cannot review yourself
- ✅ Rating must be between 0.0 and 5.0
- ✅ Comment is mandatory if rating < 3.0
- ✅ Comment is optional if rating >= 3.0

### Request

**Method:** `POST`  
**URL:** `/api/reviews`  
**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "reviewedUserId": 59,
  "rating": 4.5,
  "comment": "Great client! Clear communication and paid on time.",
  "projectId": 38
}
```

**Fields:**
- `reviewedUserId` (Long, required) - ID of the user being reviewed
- `rating` (Float, required) - Rating from 0.0 to 5.0
- `comment` (String, optional) - Review comment (mandatory if rating < 3.0)
- `projectId` (Long, optional) - ID of the project this review is related to

**Example:**
```bash
POST /api/reviews
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "reviewedUserId": 59,
  "rating": 4.5,
  "comment": "Great client! Clear communication and paid on time.",
  "projectId": 38
}
```

### Response

**Success (201 Created):**
```json
{
  "id": 10,
  "reviewerId": 60,
  "reviewerName": "Ahmed Technician",
  "reviewedUserId": 59,
  "reviewedUserName": "Sara Ali",
  "rating": 4.5,
  "comment": "Great client! Clear communication and paid on time.",
  "createdAt": "2025-01-15T15:00:00",
  "projectId": 38,
  "projectDescription": "AC Repair for Villa..."
}
```

**Error Responses:**

**400 Bad Request - Cannot review yourself:**
```json
{
  "message": "You cannot review yourself"
}
```

**400 Bad Request - Comment required for low rating:**
```json
{
  "message": "Comment is mandatory for ratings below 3.0"
}
```

**404 Not Found - User not found:**
```json
{
  "message": "User not found"
}
```

### cURL Example
```bash
curl -X POST "https://www.bonyad-hub.com/api/reviews" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewedUserId": 59,
    "rating": 4.5,
    "comment": "Great client! Clear communication and paid on time.",
    "projectId": 38
  }'
```

### Postman Example
```
Method: POST
URL: https://www.bonyad-hub.com/api/reviews
Headers:
  Authorization: Bearer YOUR_TOKEN
  Content-Type: application/json
Body (JSON):
{
  "reviewedUserId": 59,
  "rating": 4.5,
  "comment": "Great client! Clear communication and paid on time.",
  "projectId": 38
}
```

### iOS Swift Example
```swift
struct CreateReviewRequest: Codable {
    let reviewedUserId: Int
    let rating: Float
    let comment: String?
    let projectId: Int?
}

struct ReviewResponse: Codable {
    let id: Int
    let reviewerId: Int
    let reviewerName: String
    let reviewedUserId: Int
    let reviewedUserName: String
    let rating: Float
    let comment: String?
    let createdAt: String
    let projectId: Int?
    let projectDescription: String?
}

func reviewUser(
    reviewedUserId: Int,
    rating: Float,
    comment: String?,
    projectId: Int?,
    token: String
) async throws -> ReviewResponse {
    let url = URL(string: "\(baseURL)/api/reviews")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body = CreateReviewRequest(
        reviewedUserId: reviewedUserId,
        rating: rating,
        comment: comment,
        projectId: projectId
    )
    request.httpBody = try JSONEncoder().encode(body)
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 201 else {
        throw URLError(.badServerResponse)
    }
    
    return try JSONDecoder().decode(ReviewResponse.self, from: data)
}
```

### What Happens After Review
- ✅ Review is saved to database
- ✅ Notification sent to the reviewed user
- ✅ Content moderation check performed on comment (if provided)

---

## 4. Review Technician API ⭐

### Endpoint
```
POST /api/reviews
```

### Authentication
- **Required:** Yes
- **Role:** Any authenticated user (typically User reviewing Technician)
- **Header:** `Authorization: Bearer {token}`

### Description
Same endpoint as reviewing a user, but used when a project owner (user) reviews a technician after completing work together.

### Prerequisites
- ✅ Cannot review yourself
- ✅ Rating must be between 0.0 and 5.0
- ✅ Comment is mandatory if rating < 3.0
- ✅ Comment is optional if rating >= 3.0

### Request

**Method:** `POST`  
**URL:** `/api/reviews`  
**Headers:**
```
Authorization: Bearer {user_token}
Content-Type: application/json
```

**Body:**
```json
{
  "reviewedUserId": 60,
  "rating": 5.0,
  "comment": "Excellent work! Completed all phases professionally and on time. Highly recommend!",
  "projectId": 38
}
```

**Fields:**
- `reviewedUserId` (Long, required) - ID of the technician being reviewed
- `rating` (Float, required) - Rating from 0.0 to 5.0
- `comment` (String, optional) - Review comment (mandatory if rating < 3.0)
- `projectId` (Long, optional) - ID of the project this review is related to

**Example:**
```bash
POST /api/reviews
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "reviewedUserId": 60,
  "rating": 5.0,
  "comment": "Excellent work! Completed all phases professionally and on time. Highly recommend!",
  "projectId": 38
}
```

### Response

**Success (201 Created):**
```json
{
  "id": 11,
  "reviewerId": 59,
  "reviewerName": "Sara Ali",
  "reviewedUserId": 60,
  "reviewedUserName": "Ahmed Technician",
  "rating": 5.0,
  "comment": "Excellent work! Completed all phases professionally and on time. Highly recommend!",
  "createdAt": "2025-01-15T15:30:00",
  "projectId": 38,
  "projectDescription": "AC Repair for Villa..."
}
```

**Error Responses:**

Same as Review User API (see section 3).

### cURL Example
```bash
curl -X POST "https://www.bonyad-hub.com/api/reviews" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewedUserId": 60,
    "rating": 5.0,
    "comment": "Excellent work! Completed all phases professionally and on time. Highly recommend!",
    "projectId": 38
  }'
```

### Postman Example
```
Method: POST
URL: https://www.bonyad-hub.com/api/reviews
Headers:
  Authorization: Bearer YOUR_USER_TOKEN
  Content-Type: application/json
Body (JSON):
{
  "reviewedUserId": 60,
  "rating": 5.0,
  "comment": "Excellent work! Completed all phases professionally and on time. Highly recommend!",
  "projectId": 38
}
```

### iOS Swift Example
```swift
// Same as Review User API - use the same function
func reviewTechnician(
    technicianId: Int,
    rating: Float,
    comment: String?,
    projectId: Int?,
    token: String
) async throws -> ReviewResponse {
    // Use the same reviewUser function, just pass technicianId as reviewedUserId
    return try await reviewUser(
        reviewedUserId: technicianId,
        rating: rating,
        comment: comment,
        projectId: projectId,
        token: token
    )
}
```

### What Happens After Review
- ✅ Review is saved to database
- ✅ Notification sent to the reviewed technician
- ✅ Content moderation check performed on comment (if provided)

---

## 5. Complete Project API (Technician) 🎉

### Endpoint
```
POST /api/projects/{projectId}/complete
```

### Authentication
- **Required:** Yes
- **Role:** Technician (must be assigned to the project)
- **Header:** `Authorization: Bearer {technician_token}`

### Description
Allows the assigned technician to mark a project as completed. All phases must be completed and paid before the project can be marked as complete.

### Prerequisites
- ✅ Project must be in `IN_PROGRESS` status
- ✅ Technician must be assigned to the project
- ✅ All phases must be completed (`isCompleted: true`)
- ✅ All phases must be paid (`paymentStatus: PAID`)

### Request

**Method:** `POST`  
**URL:** `/api/projects/{projectId}/complete`  
**Headers:**
```
Authorization: Bearer {technician_token}
Content-Type: application/json
```

**Path Parameters:**
- `projectId` (Long, required) - The ID of the project to complete

**Example:**
```bash
POST /api/projects/38/complete
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

### Response

**Success (200 OK):**
```json
{
  "id": 38,
  "description": "AC Repair for Villa",
  "status": "COMPLETED",
  "user": {
    "id": 59,
    "name": "Sara Ali"
  },
  "assignedTechnician": {
    "id": 60,
    "name": "Ahmed Technician"
  },
  "phases": [
    {
      "id": 1,
      "phaseNumber": 1,
      "isCompleted": true,
      "paymentStatus": "PAID"
    },
    {
      "id": 2,
      "phaseNumber": 2,
      "isCompleted": true,
      "paymentStatus": "PAID"
    }
  ],
  "updatedAt": "2025-01-15T16:00:00"
}
```

**Error Responses:**

**400 Bad Request - Project not IN_PROGRESS:**
```json
{
  "message": "Project must be IN_PROGRESS to be completed. Current status: CONTRACT_SIGNING"
}
```

**400 Bad Request - Phases not completed:**
```json
{
  "message": "All phases must be completed before marking project as complete. 2 phase(s) still pending."
}
```

**400 Bad Request - Phases not paid:**
```json
{
  "message": "All phases must be paid before marking project as complete. 1 phase(s) still unpaid."
}
```

**400 Bad Request - No phases:**
```json
{
  "message": "Project has no phases. Cannot mark as completed."
}
```

**403 Forbidden - Not assigned technician:**
```json
{
  "message": "Only the assigned technician can mark project as completed"
}
```

### cURL Example
```bash
curl -X POST "https://www.bonyad-hub.com/api/projects/38/complete" \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json"
```

### Postman Example
```
Method: POST
URL: https://www.bonyad-hub.com/api/projects/38/complete
Headers:
  Authorization: Bearer YOUR_TECHNICIAN_TOKEN
```

### iOS Swift Example
```swift
func completeProject(projectId: Int, token: String) async throws -> [String: Any] {
    let url = URL(string: "\(baseURL)/api/projects/\(projectId)/complete")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw URLError(.badServerResponse)
    }
    
    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
    return json ?? [:]
}
```

### What Happens After Completion
- ✅ Project status changes to `COMPLETED`
- ✅ Notification sent to project owner about project completion
- ✅ Project added to technician's portfolio
- ✅ Audit log entry created

---

## 6. Complete Workflow Example 🔄

### Scenario: AC Repair Project

**Project:** AC Repair for Villa  
**Budget:** $5,000  
**Technician:** Ahmed Technician (ID: 60)  
**Client:** Sara Ali (ID: 59)  
**Project ID:** 38

### Step-by-Step Flow

#### 1. User Pays for Phase 1
```bash
POST /api/phases/1/pay
Authorization: Bearer {sara_user_token}
```
**Result:** Phase 1 payment status → `PAID`

#### 2. Technician Completes Phase 1
```bash
POST /api/phases/1/complete
Authorization: Bearer {ahmed_technician_token}
```
**Result:** Phase 1 `isCompleted` → `true`

#### 3. User Pays for Phase 2
```bash
POST /api/phases/2/pay
Authorization: Bearer {sara_user_token}
```
**Result:** Phase 2 payment status → `PAID`

#### 4. Technician Completes Phase 2
```bash
POST /api/phases/2/complete
Authorization: Bearer {ahmed_technician_token}
```
**Result:** Phase 2 `isCompleted` → `true`

#### 5. Technician Completes Project
```bash
POST /api/projects/38/complete
Authorization: Bearer {ahmed_technician_token}
```
**Result:** Project status → `COMPLETED`

#### 6. User Reviews Technician
```bash
POST /api/reviews
Authorization: Bearer {sara_user_token}
Content-Type: application/json

{
  "reviewedUserId": 60,
  "rating": 5.0,
  "comment": "Excellent work! Completed all phases professionally and on time.",
  "projectId": 38
}
```
**Result:** Review created and notification sent to technician

#### 7. Technician Reviews User
```bash
POST /api/reviews
Authorization: Bearer {ahmed_technician_token}
Content-Type: application/json

{
  "reviewedUserId": 59,
  "rating": 4.5,
  "comment": "Great client! Clear communication and paid on time.",
  "projectId": 38
}
```
**Result:** Review created and notification sent to user

---

## 📊 Summary Table

| API | Endpoint | Method | Auth Role | Purpose |
|-----|----------|--------|-----------|---------|
| Pay Phase | `/api/phases/{phaseId}/pay` | POST | Project Owner | Pay for approved phase |
| Complete Phase | `/api/phases/{phaseId}/complete` | POST | Technician | Mark phase as completed |
| Review User | `/api/reviews` | POST | Any User | Review a user (typically by technician) |
| Review Technician | `/api/reviews` | POST | Any User | Review a technician (typically by user) |
| Complete Project | `/api/projects/{projectId}/complete` | POST | Technician | Mark project as completed |

---

## 🔐 Authentication Notes

- All endpoints require `Authorization: Bearer {token}` header
- Tokens are obtained via `/api/auth/login` endpoint
- Token must be valid and user account must be `APPROVED`
- Role-based access control is enforced for each endpoint

---

## 📱 Base URLs

- **Production:** `https://www.bonyad-hub.com/api`
- **Staging:** `http://bonyad.me-central-1.elasticbeanstalk.com/api`
- **Local Development:** `http://localhost:8080/api`

---

## ⚠️ Important Notes

1. **Payment Flow:** Phase must be approved before payment, and must be paid before completion
2. **Review Validation:** Comment is mandatory for ratings below 3.0
3. **Project Completion:** All phases must be completed AND paid before project can be completed
4. **Notifications:** All actions trigger notifications to relevant parties
5. **Audit Logging:** All actions are logged for audit purposes

---

## 🆘 Support

For issues or questions, contact the development team or refer to the main API documentation.