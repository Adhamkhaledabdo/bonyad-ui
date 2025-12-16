# 📅 Appointment & Booking APIs - Complete Guide

## 📋 Overview

Complete guide for all appointment booking APIs including creating time requests, accepting/rejecting, managing appointments, and fetching availability.

---

## 🔄 Booking Flow

```
1. User creates time request → Status: PENDING
2. Technician accepts → Creates BookedAppointment (Status: CONFIRMED)
3. Technician completes → Status: COMPLETED
OR
2. Technician rejects → Status: REJECTED
```

---

## 📡 All Booking & Appointment APIs

### **1. Create Time Request (Book Appointment)**

**Endpoint:** `POST /api/time-requests`  
**Auth:** Required (User/Client token)  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "technicianId": 65,
  "projectId": 42,
  "requestedDate": "2025-10-28",
  "requestedStartTime": "06:30",
  "requestedEndTime": "07:30",
  "address": "123 Main St, Riyadh"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "userId": 59,
  "userName": "Ahmed",
  "technicianId": 65,
  "technicianName": "Mohamed Al-Farsi",
  "projectId": 42,
  "projectDescription": "Plumbing repair needed",
  "requestedDate": "2025-10-28",
  "requestedStartTime": "06:30:00",
  "requestedEndTime": "07:30:00",
  "status": "PENDING",
  "address": "123 Main St, Riyadh",
  "createdAt": "2025-10-20T12:30:00"
}
```

**What Happens:**
- ✅ Time request created with status `PENDING`
- ✅ Technician receives push notification
- ✅ If visit request exists for same user+technician+project → status changes to `BOOKED`

**cURL:**
```bash
curl -X POST \
  http://localhost:8080/api/time-requests \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "technicianId": 65,
    "projectId": 42,
    "requestedDate": "2025-10-28",
    "requestedStartTime": "06:30",
    "requestedEndTime": "07:30",
    "address": "123 Main St, Riyadh"
  }'
```

**Postman:**
- Method: `POST`
- URL: `{{base_url}}/api/time-requests`
- Headers: `Authorization: Bearer {{user_token}}`
- Body (JSON): As shown above

---

### **2. Accept Time Request (Technician)**

**Endpoint:** `POST /api/time-requests/{id}/accept`  
**Auth:** Required (Technician token)

**Response (200 OK):**
```json
{
  "message": "Time request accepted",
  "timeRequest": {
    "id": 1,
    "status": "ACCEPTED",
    ...
  },
  "bookedAppointment": {
    "id": 1,
    "userId": 59,
    "userName": "Ahmed",
    "technicianId": 65,
    "technicianName": "Mohamed Al-Farsi",
    "projectId": 42,
    "appointmentDate": "2025-10-28",
    "startTime": "06:30:00",
    "endTime": "07:30:00",
    "status": "CONFIRMED",
    "address": "123 Main St, Riyadh"
  }
}
```

**What Happens:**
- ✅ Time request status → `ACCEPTED`
- ✅ **BookedAppointment created** with status `CONFIRMED`
- ✅ User receives push notification
- ✅ Appointment is now in the system

**cURL:**
```bash
curl -X POST \
  http://localhost:8080/api/time-requests/1/accept \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN"
```

**Postman:**
- Method: `POST`
- URL: `{{base_url}}/api/time-requests/1/accept`
- Headers: `Authorization: Bearer {{technician_token}}`

---

### **3. Reject Time Request (Technician)**

**Endpoint:** `POST /api/time-requests/{id}/reject`  
**Auth:** Required (Technician token)

**Response (200 OK):**
```json
{
  "message": "Time request rejected",
  "timeRequest": {
    "id": 1,
    "status": "REJECTED",
    ...
  }
}
```

**What Happens:**
- ✅ Time request status → `REJECTED`
- ✅ User receives push notification
- ✅ No appointment is created

**cURL:**
```bash
curl -X POST \
  http://localhost:8080/api/time-requests/1/reject \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN"
```

---

### **4. Delete Time Request (User/Client)**

**Endpoint:** `DELETE /api/time-requests/{id}`  
**Auth:** Required (User token - must be the creator)

**Response (204 No Content)**

**Rules:**
- ✅ Only the user who created the request can delete it
- ❌ Cannot delete if status is `ACCEPTED` (it's now a booked appointment - cancel appointment instead)

**cURL:**
```bash
curl -X DELETE \
  http://localhost:8080/api/time-requests/1 \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

---

### **5. Get My Time Requests (User/Client)**

**Endpoint:** `GET /api/time-requests/my-requests`  
**Auth:** Required (User token)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "userId": 59,
    "userName": "Ahmed",
    "technicianId": 65,
    "technicianName": "Mohamed Al-Farsi",
    "projectId": 42,
    "requestedDate": "2025-10-28",
    "requestedStartTime": "06:30:00",
    "requestedEndTime": "07:30:00",
    "status": "PENDING",
    "address": "123 Main St, Riyadh",
    "createdAt": "2025-10-20T12:30:00"
  }
]
```

**cURL:**
```bash
curl -X GET \
  http://localhost:8080/api/time-requests/my-requests \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

---

### **6. Get Time Requests For Me (Technician)**

**Endpoint:** `GET /api/time-requests/for-me`  
**Auth:** Required (Technician token)

**Query Parameters (Optional):**
- `status` - Filter by status: `PENDING`, `ACCEPTED`, `REJECTED`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "userId": 59,
    "userName": "Ahmed",
    "technicianId": 65,
    "technicianName": "Mohamed Al-Farsi",
    "projectId": 42,
    "requestedDate": "2025-10-28",
    "requestedStartTime": "06:30:00",
    "requestedEndTime": "07:30:00",
    "status": "PENDING",
    "address": "123 Main St, Riyadh",
    "createdAt": "2025-10-20T12:30:00"
  }
]
```

**cURL:**
```bash
# Get all requests
curl -X GET \
  http://localhost:8080/api/time-requests/for-me \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN"

# Get only pending requests
curl -X GET \
  "http://localhost:8080/api/time-requests/for-me?status=PENDING" \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN"
```

---

### **7. Get My Booked Appointments**

**Endpoint:** `GET /api/time-requests/my-bookings`  
**Auth:** Required (User or Technician token)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "userId": 59,
    "userName": "Ahmed",
    "technicianId": 65,
    "technicianName": "Mohamed Al-Farsi",
    "projectId": 42,
    "projectDescription": "Plumbing repair needed",
    "appointmentDate": "2025-10-28",
    "startTime": "06:30:00",
    "endTime": "07:30:00",
    "status": "CONFIRMED",
    "address": "123 Main St, Riyadh"
  }
]
```

**Note:**
- For **Users**: Returns appointments where they are the client
- For **Technicians**: Returns appointments where they are the technician

**cURL:**
```bash
curl -X GET \
  http://localhost:8080/api/time-requests/my-bookings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### **8. Get Upcoming Appointments (Technician)**

**Endpoint:** `GET /api/time-requests/upcoming-appointments`  
**Auth:** Required (Technician token)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "userId": 59,
    "userName": "Ahmed",
    "technicianId": 65,
    "technicianName": "Mohamed Al-Farsi",
    "projectId": 42,
    "appointmentDate": "2025-10-28",
    "startTime": "06:30:00",
    "endTime": "07:30:00",
    "status": "CONFIRMED",
    "address": "123 Main St, Riyadh"
  }
]
```

**What It Returns:**
- ✅ Next 3 upcoming appointments
- ✅ Only `CONFIRMED` status
- ✅ Future dates or today with future time
- ✅ Ordered by date (ascending), then time (ascending)

**cURL:**
```bash
curl -X GET \
  http://localhost:8080/api/time-requests/upcoming-appointments \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN"
```

---

### **9. Get Completed Appointments (Technician)**

**Endpoint:** `GET /api/time-requests/completed-appointments`  
**Auth:** Required (Technician token)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "userId": 59,
    "userName": "Ahmed",
    "technicianId": 65,
    "technicianName": "Mohamed Al-Farsi",
    "projectId": 42,
    "appointmentDate": "2025-10-25",
    "startTime": "06:30:00",
    "endTime": "07:30:00",
    "status": "COMPLETED",
    "address": "123 Main St, Riyadh"
  }
]
```

**What It Returns:**
- ✅ Last 3 completed appointments
- ✅ Only `COMPLETED` status
- ✅ Ordered by date (descending), then time (descending)

**cURL:**
```bash
curl -X GET \
  http://localhost:8080/api/time-requests/completed-appointments \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN"
```

---

### **10. Complete Appointment (Technician)**

**Endpoint:** `POST /api/time-requests/appointments/{id}/complete`  
**Auth:** Required (Technician token)

**Response (200 OK):**
```json
{
  "message": "Appointment marked as completed",
  "appointment": {
    "id": 1,
    "status": "COMPLETED",
    ...
  }
}
```

**Rules:**
- ✅ Only technician assigned to appointment can complete
- ✅ Only `CONFIRMED` appointments can be completed
- ✅ Status changes to `COMPLETED`
- ✅ User receives notification

**cURL:**
```bash
curl -X POST \
  http://localhost:8080/api/time-requests/appointments/1/complete \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN"
```

---

### **11. Cancel Appointment**

**⚠️ Note:** There is currently **no dedicated cancel endpoint** in the API. The `BookedAppointment` entity supports `CANCELLED` status, but you need to implement the cancel endpoint.

**Current Workaround:**

**Option A: Delete the time request (if not accepted yet)**
- Use `DELETE /api/time-requests/{id}` (only if status is `PENDING`)
- Cannot delete if status is `ACCEPTED` (it's now a booked appointment)

**Option B: Manual database update (not recommended)**
- Update appointment status to `CANCELLED` directly in database

**Recommended Implementation:**
Create a cancel endpoint:
```
POST /api/time-requests/appointments/{id}/cancel
Authorization: Bearer {user_token or technician_token}
```

**Expected Behavior:**
- User or Technician can cancel
- Status changes to `CANCELLED`
- Other party receives notification
- Appointment remains in system with cancelled status

---

## 📅 Availability APIs

### **12. Get Technician Availability (Public)**

**Endpoint:** `GET /api/technicians/{technicianId}/availability`  
**Auth:** Not required (Public)

**Response (200 OK):**
```json
{
  "id": 65,
  "userId": "tech123",
  "technicianName": "Mohamed Al-Farsi",
  "status": "FIXED_TIMES",
  "availability": [
    {
      "id": 1,
      "dayOfWeek": "MONDAY",
      "startTime": "09:00:00",
      "endTime": "17:00:00",
      "isActive": true
    },
    {
      "id": 2,
      "dayOfWeek": "TUESDAY",
      "startTime": "09:00:00",
      "endTime": "17:00:00",
      "isActive": true
    }
  ]
}
```

**cURL:**
```bash
curl -X GET \
  http://localhost:8080/api/technicians/65/availability
```

---

### **13. Get My Availability (Technician)**

**Endpoint:** `GET /api/technicians/availability`  
**Auth:** Required (Technician token)

**Response (200 OK):**
```json
{
  "status": "FIXED_TIMES",
  "slots": [
    {
      "id": 1,
      "dayOfWeek": "MONDAY",
      "startTime": "09:00:00",
      "endTime": "17:00:00",
      "isActive": true
    }
  ]
}
```

**cURL:**
```bash
curl -X GET \
  http://localhost:8080/api/technicians/availability \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN"
```

---

### **14. Set Availability (Technician)**

**Endpoint:** `POST /api/technicians/availability/set`  
**Auth:** Required (Technician token)  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "status": "FIXED_TIMES",
  "slots": [
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
}
```

**Status Values:**
- `FIXED_TIMES` - Use specific time slots
- `AVAILABLE_ANYTIME` - Available all the time

**cURL:**
```bash
curl -X POST \
  http://localhost:8080/api/technicians/availability/set \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "FIXED_TIMES",
    "slots": [
      {
        "dayOfWeek": "MONDAY",
        "startTime": "09:00",
        "endTime": "17:00"
      }
    ]
  }'
```

---

### **15. Add Single Availability Slot (Technician)**

**Endpoint:** `POST /api/technicians/availability`  
**Auth:** Required (Technician token)  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "dayOfWeek": "MONDAY",
  "startTime": "09:00",
  "endTime": "17:00"
}
```

**cURL:**
```bash
curl -X POST \
  http://localhost:8080/api/technicians/availability \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dayOfWeek": "MONDAY",
    "startTime": "09:00",
    "endTime": "17:00"
  }'
```

---

### **16. Add Bulk Availability (Technician)**

**Endpoint:** `POST /api/technicians/availability/bulk`  
**Auth:** Required (Technician token)  
**Content-Type:** `application/json`

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
      "dayOfWeek": "MONDAY",
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
```

**cURL:**
```bash
curl -X POST \
  http://localhost:8080/api/technicians/availability/bulk \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "availabilities": [
      {
        "dayOfWeek": "MONDAY",
        "startTime": "09:00",
        "endTime": "17:00"
      }
    ]
  }'
```

---

### **17. Delete Availability Slot (Technician)**

**Endpoint:** `DELETE /api/technicians/availability/{slotId}`  
**Auth:** Required (Technician token)

**Response (200 OK):**
```json
{
  "message": "Availability slot deleted successfully",
  "deletedSlotId": 1
}
```

**cURL:**
```bash
curl -X DELETE \
  http://localhost:8080/api/technicians/availability/1 \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN"
```

---

### **18. Clear All Availability (Technician)**

**Endpoint:** `DELETE /api/technicians/availability`  
**Auth:** Required (Technician token)

**Response (200 OK):**
```json
{
  "message": "All availability cleared",
  "deletedCount": 5
}
```

**cURL:**
```bash
curl -X DELETE \
  http://localhost:8080/api/technicians/availability \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN"
```

---

## 📊 Complete API Summary

| # | Endpoint | Method | Auth | Who |
|---|----------|--------|------|-----|
| 1 | `/api/time-requests` | POST | ✅ User | Create booking request |
| 2 | `/api/time-requests/{id}/accept` | POST | ✅ Technician | Accept → Creates appointment |
| 3 | `/api/time-requests/{id}/reject` | POST | ✅ Technician | Reject request |
| 4 | `/api/time-requests/{id}` | DELETE | ✅ User | Delete request (if PENDING) |
| 5 | `/api/time-requests/my-requests` | GET | ✅ User | Get my requests |
| 6 | `/api/time-requests/for-me` | GET | ✅ Technician | Get requests for me |
| 7 | `/api/time-requests/my-bookings` | GET | ✅ User/Technician | Get my appointments |
| 8 | `/api/time-requests/upcoming-appointments` | GET | ✅ Technician | Get next 3 upcoming |
| 9 | `/api/time-requests/completed-appointments` | GET | ✅ Technician | Get last 3 completed |
| 10 | `/api/time-requests/appointments/{id}/complete` | POST | ✅ Technician | Mark as completed |
| 11 | `/api/technicians/{id}/availability` | GET | ❌ Public | Get technician availability |
| 12 | `/api/technicians/availability` | GET | ✅ Technician | Get my availability |
| 13 | `/api/technicians/availability/set` | POST | ✅ Technician | Set availability status & slots |
| 14 | `/api/technicians/availability` | POST | ✅ Technician | Add single slot |
| 15 | `/api/technicians/availability/bulk` | POST | ✅ Technician | Add bulk slots |
| 16 | `/api/technicians/availability/{id}` | DELETE | ✅ Technician | Delete single slot |
| 17 | `/api/technicians/availability` | DELETE | ✅ Technician | Clear all availability |

---

## 🔄 Complete Workflow Example

### **Step 1: User Books Appointment**
```bash
POST /api/time-requests
{
  "technicianId": 65,
  "projectId": 42,
  "requestedDate": "2025-10-28",
  "requestedStartTime": "06:30",
  "requestedEndTime": "07:30",
  "address": "123 Main St"
}
```
→ Status: `PENDING`

### **Step 2: Technician Accepts**
```bash
POST /api/time-requests/1/accept
```
→ Time Request Status: `ACCEPTED`  
→ BookedAppointment Created: Status `CONFIRMED`

### **Step 3: Technician Completes**
```bash
POST /api/time-requests/appointments/1/complete
```
→ Appointment Status: `COMPLETED`

---

## 📱 iOS Swift Examples

### **Create Time Request:**
```swift
func createTimeRequest(
    technicianId: Int,
    projectId: Int?,
    date: String,
    startTime: String,
    endTime: String,
    address: String,
    token: String
) async throws -> [String: Any] {
    let url = URL(string: "\(baseURL)/api/time-requests")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body: [String: Any] = [
        "technicianId": technicianId,
        "projectId": projectId as Any,
        "requestedDate": date,
        "requestedStartTime": startTime,
        "requestedEndTime": endTime,
        "address": address
    ]
    
    request.httpBody = try JSONSerialization.data(withJSONObject: body)
    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONSerialization.jsonObject(with: data) as! [String: Any]
}
```

### **Accept Time Request:**
```swift
func acceptTimeRequest(id: Int, token: String) async throws -> [String: Any] {
    let url = URL(string: "\(baseURL)/api/time-requests/\(id)/accept")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    
    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONSerialization.jsonObject(with: data) as! [String: Any]
}
```

### **Get My Bookings:**
```swift
func getMyBookings(token: String) async throws -> [[String: Any]] {
    let url = URL(string: "\(baseURL)/api/time-requests/my-bookings")!
    var request = URLRequest(url: url)
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    
    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONSerialization.jsonObject(with: data) as! [[String: Any]]
}
```

### **Get Technician Availability:**
```swift
func getTechnicianAvailability(technicianId: Int) async throws -> [String: Any] {
    let url = URL(string: "\(baseURL)/api/technicians/\(technicianId)/availability")!
    let (data, _) = try await URLSession.shared.data(for: URLRequest(url: url))
    return try JSONSerialization.jsonObject(with: data) as! [String: Any]
}
```

---

## ⚠️ Important Notes

1. **Time Request vs Appointment:**
   - **Time Request** = Request from user (PENDING → ACCEPTED/REJECTED)
   - **BookedAppointment** = Created when technician accepts (CONFIRMED → COMPLETED)

2. **Status Flow:**
   - Time Request: `PENDING` → `ACCEPTED` or `REJECTED`
   - Appointment: `CONFIRMED` → `COMPLETED` (or `CANCELLED` if implemented)

3. **Deletion Rules:**
   - Can delete time request only if status is `PENDING`
   - Cannot delete if `ACCEPTED` (it's now a booked appointment)

4. **Availability Status:**
   - `FIXED_TIMES` - Uses specific time slots
   - `AVAILABLE_ANYTIME` - Available all the time

5. **Day of Week Values:**
   - `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY`

---

## ✅ Testing Checklist

- [ ] Create time request (User)
- [ ] Get my requests (User)
- [ ] Get requests for me (Technician)
- [ ] Accept time request (Technician) → Creates appointment
- [ ] Reject time request (Technician)
- [ ] Get my bookings (User/Technician)
- [ ] Get upcoming appointments (Technician)
- [ ] Get completed appointments (Technician)
- [ ] Complete appointment (Technician)
- [ ] Delete time request (User - if PENDING)
- [ ] Get technician availability (Public)
- [ ] Set availability (Technician)
- [ ] Add/Delete availability slots (Technician)

---

**Created:** 2024  
**Total Endpoints:** 17  
**Last Updated:** 2024