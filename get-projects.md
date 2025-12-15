# User Projects & Related APIs

## Overview

APIs for project owners (users) to:
1. Get their projects
2. Get bids on their projects
3. Get visit requests for their projects
4. Book visits with technicians (technician chooses timing)

---

## 1. Get User's Projects

**Endpoint:** `GET /api/projects/my`

**Controller:** `ProjectController.java` (line 727)

**What It Does:**
- Returns all projects created by the authenticated user
- Projects ordered by creation date (newest first)
- Includes project phases

### Request

```bash
GET /api/projects/my
Authorization: Bearer {token}
```

### Response (200 OK)

```json
[
  {
    "id": 38,
    "userId": 1,
    "userName": "Ahmed Client",
    "description": "Kitchen renovation",
    "status": "CONTRACT_SIGNING",
    "budget": 50000.00,
    "address": "123 Main St, Riyadh",
    "createdAt": "2025-12-11T10:00:00",
    "assignedTechnician": {
      "id": 60,
      "name": "Mohamed Technician"
    },
    "phases": [
      {
        "id": 19,
        "phaseNumber": 1,
        "description": "Demolition",
        "moneySpent": 5000.00,
        "approved": true
      },
      {
        "id": 20,
        "phaseNumber": 2,
        "description": "Installation",
        "moneySpent": 10000.00,
        "approved": true
      }
    ]
  },
  {
    "id": 39,
    "userId": 1,
    "userName": "Ahmed Client",
    "description": "Bathroom renovation",
    "status": "BID_RECEIVED",
    "budget": 30000.00,
    "address": "456 Oak Ave, Jeddah",
    "createdAt": "2025-12-10T14:30:00",
    "assignedTechnician": null,
    "phases": []
  }
]
```

### cURL Example

```bash
TOKEN="your_token_here"

curl -X GET http://localhost:8080/api/projects/my \
  -H "Authorization: Bearer $TOKEN"
```

### Postman Example

**Request:**
```
Method: GET
URL: http://localhost:8080/api/projects/my
Headers:
  Authorization: Bearer {your_token}
```

---

## 2. Get Bids on User's Projects

**Endpoint:** `GET /api/bids/project/{projectId}`

**Controller:** `BidController.java` (line 188)

**What It Does:**
- Returns all bids for a specific project
- Public endpoint (no auth required, but recommended)
- Bids ordered by creation date (newest first)

### Request

```bash
GET /api/bids/project/{projectId}
Authorization: Bearer {token}  # Optional but recommended
```

### Response (200 OK)

```json
[
  {
    "id": 15,
    "technicianId": 60,
    "technicianName": "Mohamed Technician",
    "technicianPhone": "555123456",
    "projectId": 38,
    "amount": 45000.00,
    "message": "I can complete this project in 2 weeks",
    "status": "ACCEPTED",
    "createdAt": "2025-12-11T11:00:00"
  },
  {
    "id": 16,
    "technicianId": 61,
    "technicianName": "Ahmed Technician",
    "technicianPhone": "555654321",
    "projectId": 38,
    "amount": 48000.00,
    "message": "Experienced in kitchen renovations",
    "status": "PENDING",
    "createdAt": "2025-12-11T12:00:00"
  }
]
```

### cURL Example

```bash
TOKEN="your_token_here"
PROJECT_ID=38

curl -X GET http://localhost:8080/api/bids/project/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Postman Example

**Request:**
```
Method: GET
URL: http://localhost:8080/api/bids/project/38
Headers:
  Authorization: Bearer {your_token}
```

### Note

To get bids for all user's projects, you need to:
1. Call `GET /api/projects/my` to get all project IDs
2. For each project, call `GET /api/bids/project/{projectId}`

---

## 3. Get Visit Requests for User's Projects

**Endpoint:** `GET /api/visit-requests/for-me`

**Controller:** `VisitRequestController.java` (line 91)

**What It Does:**
- Returns all visit requests for projects owned by the authenticated user
- User can accept/reject these visit requests
- Visit requests ordered by creation date

### Request

```bash
GET /api/visit-requests/for-me
Authorization: Bearer {token}
```

### Response (200 OK)

```json
[
  {
    "id": 5,
    "projectId": 38,
    "projectDescription": "Kitchen renovation",
    "technicianId": 60,
    "technicianName": "Mohamed Technician",
    "technicianPhone": "555123456",
    "requestedDate": "2025-12-15",
    "notes": "Would like to visit to assess the space",
    "status": "PENDING",
    "rejectionReason": null,
    "createdAt": "2025-12-11T10:00:00",
    "updatedAt": "2025-12-11T10:00:00"
  },
  {
    "id": 6,
    "projectId": 39,
    "projectDescription": "Bathroom renovation",
    "technicianId": 61,
    "technicianName": "Ahmed Technician",
    "technicianPhone": "555654321",
    "requestedDate": "2025-12-16",
    "notes": "Need to check plumbing",
    "status": "ACCEPTED",
    "rejectionReason": null,
    "createdAt": "2025-12-11T11:00:00",
    "updatedAt": "2025-12-11T11:30:00"
  }
]
```

### Status Values

- `PENDING` - Waiting for user to accept/reject
- `ACCEPTED` - User accepted the visit request
- `REJECTED` - User rejected the visit request
- `BOOKED` - Visit has been booked (appointment created)

### cURL Example

```bash
TOKEN="your_token_here"

curl -X GET http://localhost:8080/api/visit-requests/for-me \
  -H "Authorization: Bearer $TOKEN"
```

### Postman Example

**Request:**
```
Method: GET
URL: http://localhost:8080/api/visit-requests/for-me
Headers:
  Authorization: Bearer {your_token}
```

### Alternative: Get Visit Requests for Specific Project

**Endpoint:** `GET /api/visit-requests/project/{projectId}`

**Request:**
```bash
GET /api/visit-requests/project/38
```

**Response:** Same format as above, but filtered for specific project

---

## 4. Book Visit with Technician (Technician Chooses Timing)

This is a two-step process:
1. **User creates time request** - User requests a time slot
2. **Technician accepts time request** - Technician confirms and creates appointment

### Step 1: Create Time Request (User)

**Endpoint:** `POST /api/time-requests`

**Controller:** `TimeRequestController.java` (line 59)

**What It Does:**
- User creates a time request for a technician
- User specifies date, start time, end time, and address
- Can be linked to a project (optional)
- Technician will receive notification and can accept/reject

### Request

```bash
POST /api/time-requests
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "technicianId": 60,
  "projectId": 38,
  "requestedDate": "2025-12-20",
  "requestedStartTime": "09:00:00",
  "requestedEndTime": "11:00:00",
  "address": "123 Main St, Riyadh"
}
```

**Parameters:**
- `technicianId` (required): Technician ID
- `projectId` (optional): Project ID (must be user's project)
- `requestedDate` (required): Date in format "YYYY-MM-DD"
- `requestedStartTime` (required): Start time in format "HH:mm:ss"
- `requestedEndTime` (required): End time in format "HH:mm:ss"
- `address` (required): Address for the visit

### Response (201 Created)

```json
{
  "id": 10,
  "userId": 1,
  "userName": "Ahmed Client",
  "technicianId": 60,
  "technicianName": "Mohamed Technician",
  "projectId": 38,
  "projectDescription": "Kitchen renovation",
  "requestedDate": "2025-12-20",
  "requestedStartTime": "09:00:00",
  "requestedEndTime": "11:00:00",
  "address": "123 Main St, Riyadh",
  "status": "PENDING",
  "createdAt": "2025-12-11T14:00:00"
}
```

### cURL Example

```bash
TOKEN="your_token_here"

curl -X POST http://localhost:8080/api/time-requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "technicianId": 60,
    "projectId": 38,
    "requestedDate": "2025-12-20",
    "requestedStartTime": "09:00:00",
    "requestedEndTime": "11:00:00",
    "address": "123 Main St, Riyadh"
  }'
```

### Postman Example

**Request:**
```
Method: POST
URL: http://localhost:8080/api/time-requests
Headers:
  Authorization: Bearer {your_token}
  Content-Type: application/json
Body (raw JSON):
{
  "technicianId": 60,
  "projectId": 38,
  "requestedDate": "2025-12-20",
  "requestedStartTime": "09:00:00",
  "requestedEndTime": "11:00:00",
  "address": "123 Main St, Riyadh"
}
```

---

### Step 2: Accept Time Request (Technician)

**Endpoint:** `POST /api/time-requests/{id}/accept`

**Controller:** `TimeRequestController.java` (line 240)

**What It Does:**
- Technician accepts the time request
- Creates a `BookedAppointment` with status `CONFIRMED`
- Updates visit request status to `BOOKED` (if exists)
- Sends notification to user

### Request

```bash
POST /api/time-requests/{id}/accept
Authorization: Bearer {technician_token}
```

### Response (200 OK)

```json
{
  "message": "Time request accepted and appointment created",
  "bookedAppointment": {
    "id": 25,
    "userId": 1,
    "userName": "Ahmed Client",
    "technicianId": 60,
    "technicianName": "Mohamed Technician",
    "projectId": 38,
    "projectDescription": "Kitchen renovation",
    "appointmentDate": "2025-12-20",
    "startTime": "09:00:00",
    "endTime": "11:00:00",
    "address": "123 Main St, Riyadh",
    "status": "CONFIRMED",
    "createdAt": "2025-12-11T15:00:00"
  }
}
```

### cURL Example

```bash
TECHNICIAN_TOKEN="technician_token_here"
TIME_REQUEST_ID=10

curl -X POST http://localhost:8080/api/time-requests/$TIME_REQUEST_ID/accept \
  -H "Authorization: Bearer $TECHNICIAN_TOKEN"
```

### Postman Example

**Request:**
```
Method: POST
URL: http://localhost:8080/api/time-requests/10/accept
Headers:
  Authorization: Bearer {technician_token}
```

---

## Complete Flow Example

### 1. User gets their projects
```bash
GET /api/projects/my
→ Returns list of user's projects
```

### 2. User gets bids for a project
```bash
GET /api/bids/project/38
→ Returns all bids for project 38
```

### 3. User gets visit requests for their projects
```bash
GET /api/visit-requests/for-me
→ Returns all visit requests for user's projects
```

### 4. User accepts a visit request (optional)
```bash
POST /api/visit-requests/5/accept
→ Accepts visit request ID 5
```

### 5. User creates time request for booking
```bash
POST /api/time-requests
Body: {
  "technicianId": 60,
  "projectId": 38,
  "requestedDate": "2025-12-20",
  "requestedStartTime": "09:00:00",
  "requestedEndTime": "11:00:00",
  "address": "123 Main St, Riyadh"
}
→ Creates time request, technician receives notification
```

### 6. Technician accepts time request
```bash
POST /api/time-requests/10/accept
→ Technician accepts, appointment is created and confirmed
```

---

## Additional Endpoints

### Get My Booked Appointments

**Endpoint:** `GET /api/time-requests/appointments/my`

**What It Does:**
- Returns all booked appointments for the authenticated user
- Works for both users (as client) and technicians (as service provider)

**Request:**
```bash
GET /api/time-requests/appointments/my
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 25,
    "userId": 1,
    "userName": "Ahmed Client",
    "technicianId": 60,
    "technicianName": "Mohamed Technician",
    "projectId": 38,
    "projectDescription": "Kitchen renovation",
    "appointmentDate": "2025-12-20",
    "startTime": "09:00:00",
    "endTime": "11:00:00",
    "address": "123 Main St, Riyadh",
    "status": "CONFIRMED",
    "createdAt": "2025-12-11T15:00:00"
  }
]
```

---

## Status Values Reference

### Visit Request Status
- `PENDING` - Waiting for user to accept/reject
- `ACCEPTED` - User accepted
- `REJECTED` - User rejected
- `BOOKED` - Appointment created

### Appointment Status
- `PENDING` - Waiting for technician to accept
- `CONFIRMED` - Technician accepted, appointment confirmed
- `COMPLETED` - Appointment completed
- `CANCELLED` - Appointment cancelled

---

## Important Notes

1. **Authentication Required:**
   - All endpoints require `Authorization: Bearer {token}` header
   - Token must be valid and belong to the user

2. **Project Ownership:**
   - User can only see bids/visit requests for their own projects
   - User can only create time requests for their own projects

3. **Time Request Flow:**
   - User creates time request → Technician receives notification
   - Technician accepts → Appointment created with `CONFIRMED` status
   - Technician can also reject the time request

4. **Visit Request vs Time Request:**
   - **Visit Request:** Technician requests to visit user's project
   - **Time Request:** User requests specific time slot from technician

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Authorization header is required"
}
```

### 403 Forbidden
```json
{
  "error": "You can only access your own projects"
}
```

### 404 Not Found
```json
{
  "error": "Project not found"
}
```

### 400 Bad Request
```json
{
  "error": "Start time must be before end time"
}
```