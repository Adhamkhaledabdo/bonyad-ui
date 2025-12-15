# 📋 Approve All Phases + Signature + Contract Flow

Complete guide for the approve all phases, signature request, and contract viewing/download flow in the iOS app.

---

## 🔄 Complete Flow Overview

```
1. Fetch User Email (from SessionManager or API)
   ↓
2. Fetch Technician Email: GET /api/users/{technicianId}/profile
   ↓
3. User Reviews Phases
   ↓
4. User Clicks "Approve All"
   ↓
5. POST /api/phases/project/{projectId}/approve-all
   ↓
6. Project Status → CONTRACT_SIGNING
   ↓
7. POST /api/signatures (with emails)
   ↓
8. Backend generates PDF from HTML → Sends to Signit
   ↓
9. Both parties receive signing links via email
   ↓
10. View/Download Contract: POST /api/contracts/test/generate-pdf
```

---

## 📧 API 0: Fetch User and Technician Emails

Before creating a signature request, you need to fetch the email addresses of both the user and technician.

---

### API 0a: Get Current User Email

**Option 1: From SessionManager (Recommended)**
```swift
// User email is stored in SessionManager after login
let userEmail = SessionManager.shared.email ?? ""
```

**Option 2: From User Profile API**
```
GET /api/users/me
```

**Production URL:**
```
GET https://www.bonyad-hub.com/api/users/me
```

**Headers:**
```
Authorization: Bearer YOUR_USER_TOKEN
Content-Type: application/json
```

**Response:**
```json
{
  "id": 59,
  "name": "Ahmed",
  "email": "user@example.com",
  "phoneNumber": "554541844",
  "role": "USER"
}
```

---

### API 0b: Get Technician Email

### Endpoint
```
GET /api/users/{userId}/profile
```

**Production URL:**
```
GET https://www.bonyad-hub.com/api/users/{userId}/profile
```

---

### Request

**Method:** `GET`  
**Content-Type:** `application/json`

**Headers:**
```
Authorization: Bearer YOUR_USER_TOKEN (optional)
Content-Type: application/json
Accept: application/json
```

**URL Parameters:**
- `userId` (path parameter) - The technician's user ID

---

### cURL Example

```bash
curl -X GET https://www.bonyad-hub.com/api/users/35/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"
```

---

### Response

**Success (200 OK):**
```json
{
  "id": 35,
  "userId": 35,
  "name": "Farahat",
  "email": "tech@example.com",
  "phoneNumber": "554541888",
  "role": "TECHNICIAN",
  "regionId": 1,
  "regionNameEn": "Riyadh",
  "regionNameAr": "الرياض",
  "profileImage": "/uploads/profiles/tech-35.jpg",
  "yearsOfExperience": 5,
  "averageRating": 4.5,
  "services": [
    {
      "id": 1,
      "nameEn": "Plumbing",
      "nameAr": "سباكة"
    }
  ],
  "description": "Expert technician"
}
```

**Key Field:**
- `email`: Technician's email address (required for signature)

---

### iOS Implementation

**Location:** `PhaseApprovalView.swift` - `fetchTechnicianEmailFromProfile()`

```swift
private func fetchTechnicianEmailFromProfile(userId: Int) async {
    guard let url = URL(string: "https://www.bonyad-hub.com/api/users/\(userId)/profile") else {
        return
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    
    // Optional: Add auth token if available
    if let token = SessionManager.shared.token, !token.isEmpty {
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
    
    do {
        let (data, response) = try await URLSession.shared.dataWithFallback(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            print("⚠️ Failed to fetch technician profile")
            return
        }
        
        // Parse email from response
        struct TechnicianProfileResponse: Codable {
            let email: String?
        }
        
        let profile = try JSONDecoder().decode(TechnicianProfileResponse.self, from: data)
        
        if let email = profile.email, !email.isEmpty {
            await MainActor.run {
                self.technicianEmail = email
            }
            print("✅ Technician email fetched: \(email)")
        }
    } catch {
        print("❌ Error fetching technician email: \(error.localizedDescription)")
    }
}
```

**Complete Example - Fetching Both Emails:**

```swift
// Get user email from SessionManager
let userEmail = SessionManager.shared.email ?? ""

// Fetch technician email from API
guard let technicianId = assignedTechnicianId else {
    throw ContractAPIError.missingTechnicianId
}

await fetchTechnicianEmailFromProfile(userId: technicianId)
let technicianEmail = self.technicianEmail

// Now you have both emails for signature request
guard !userEmail.isEmpty, let techEmail = technicianEmail, !techEmail.isEmpty else {
    throw ContractAPIError.missingEmail
}
```

---

## 📡 API 1: Approve All Phases

### Endpoint
```
POST /api/phases/project/{projectId}/approve-all
```

**Production URL:**
```
POST https://www.bonyad-hub.com/api/phases/project/{projectId}/approve-all
```

---

### Request

**Method:** `POST`  
**Content-Type:** `application/json`

**Headers:**
```
Authorization: Bearer YOUR_USER_TOKEN
```

**URL Parameters:**
- `projectId` (path parameter) - The project ID

**No request body required**

---

### cURL Example

```bash
curl -X POST https://www.bonyad-hub.com/api/phases/project/97/approve-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Response

**Success (200 OK):**
```json
{
  "message": "All phases approved successfully",
  "projectId": 97,
  "status": "CONTRACT_SIGNING"
}
```

**What Happens:**
- ✅ All pending phases are approved
- ✅ Project status changes to `CONTRACT_SIGNING`
- ✅ Project is now ready for contract signing

---

### iOS Implementation

**Location:** `PhaseApprovalView.swift` - `approveAllPhasesAPI()`

```swift
private func approveAllPhasesAPI(projectId: String, token: String) async throws {
    let apiURL = "https://www.bonyad-hub.com/api/phases/project/\(projectId)/approve-all"
    
    var request = URLRequest(url: URL(string: apiURL)!)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    
    print("🚀 Approving all phases for project \(projectId)...")
    
    let (_, response) = try await URLSession.shared.dataWithFallback(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
        throw URLError(.badServerResponse)
    }
    
    print("✅ All phases approved")
}
```

---

## ✍️ API 2: Create Signature Request

### Endpoint
```
POST /api/signatures
```

**Production URL:**
```
POST https://www.bonyad-hub.com/api/signatures
```

---

### Request

**Method:** `POST`  
**Content-Type:** `application/x-www-form-urlencoded`

**Headers:**
```
Authorization: Bearer YOUR_USER_TOKEN
Content-Type: application/x-www-form-urlencoded
Accept-Language: en (or ar)
```

**Form Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `projectId` | String | ✅ Yes | Project ID | `"97"` |
| `technicianId` | String | ✅ Yes | Technician ID | `"35"` |
| `userEmail` | String | ✅ Yes | User email address | `"user@example.com"` |
| `technicianEmail` | String | ✅ Yes | Technician email address | `"tech@example.com"` |
| `phaseIds` | String | ✅ Yes | Comma-separated phase IDs | `"19,20,21,22"` |
| `language` | String | ❌ No | `"EN"` or `"AR"` | `"EN"` |
| `contractTerms` | String | ❌ No | Optional contract terms | `"Payment 50% upfront..."` |

**⚠️ Important:** 
- **Do NOT send `contractPdf`** - Backend automatically generates PDF from HTML template
- **Do NOT send phone numbers** - Using email-based signing only

---

### cURL Example

```bash
curl -X POST https://www.bonyad-hub.com/api/signatures \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept-Language: en" \
  -d "projectId=97" \
  -d "technicianId=35" \
  -d "userEmail=user@example.com" \
  -d "technicianEmail=tech@example.com" \
  -d "phaseIds=19,20,21,22" \
  -d "language=EN"
```

---

### Response

**Success (200/201):**
```json
{
  "id": 17,
  "project": {
    "id": 97,
    "status": "CONTRACT_SIGNING"
  },
  "user": {
    "id": 59,
    "name": "Ahmed",
    "email": "user@example.com"
  },
  "technician": {
    "id": 35,
    "name": "Farahat",
    "email": "tech@example.com"
  },
  "status": "PENDING",
  "thirdPartyReferenceId": "12345678-1234-1234-1234-123456789abc",
  "createdAt": "2025-10-19T22:00:00"
}
```

**What Happens:**
- ✅ Backend generates contract PDF from HTML template (with all approved phases)
- ✅ PDF is uploaded to Signit
- ✅ Signature request is created in Signit
- ✅ Both parties receive signing links via **email**
- ✅ Signature record created in database with status `PENDING`

---

### iOS Implementation

**Location:** `DigitalSigningService.swift` - `initiateDigitalSigningWithBackend()`

```swift
func initiateDigitalSigningWithBackend(
    contractURL: String,
    userEmail: String?,
    technicianEmail: String?,
    userPhone: String?,
    technicianPhone: String?,
    projectTitle: String,
    projectId: String,
    technicianId: Int,
    phaseIds: [Int],
    contractTerms: String? = nil
) async {
    guard let token = SessionManager.shared.token else {
        throw SigningError.invalidCredentials
    }
    
    guard let url = URL(string: "https://www.bonyad-hub.com/api/signatures") else {
        throw SigningError.invalidURL
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
    request.setValue(Localizer.shared.currentLanguage.rawValue, forHTTPHeaderField: "Accept-Language")
    
    // Build form URL-encoded body
    var components = URLComponents()
    components.queryItems = []
    
    // Required fields
    components.queryItems?.append(URLQueryItem(name: "projectId", value: projectId))
    components.queryItems?.append(URLQueryItem(name: "technicianId", value: "\(technicianId)"))
    
    // Language (EN or AR)
    let language = Localizer.shared.currentLanguage == .arabic ? "AR" : "EN"
    components.queryItems?.append(URLQueryItem(name: "language", value: language))
    
    // Contact information - using emails for signing
    if let userEmail = userEmail, !userEmail.isEmpty {
        components.queryItems?.append(URLQueryItem(name: "userEmail", value: userEmail))
    }
    if let technicianEmail = technicianEmail, !technicianEmail.isEmpty {
        components.queryItems?.append(URLQueryItem(name: "technicianEmail", value: technicianEmail))
    }
    
    // Phase IDs (comma-separated string)
    if !phaseIds.isEmpty {
        let phaseIdsString = phaseIds.map { "\($0)" }.joined(separator: ",")
        components.queryItems?.append(URLQueryItem(name: "phaseIds", value: phaseIdsString))
    }
    
    // Optional contract terms
    if let contractTerms = contractTerms, !contractTerms.isEmpty {
        components.queryItems?.append(URLQueryItem(name: "contractTerms", value: contractTerms))
    }
    
    // Note: Do NOT send contractPdf or contractUrl - backend generates PDF from HTML automatically
    
    // Convert to form-encoded string
    let formString = components.query ?? ""
    request.httpBody = formString.data(using: .utf8)
    
    let (data, response) = try await URLSession.shared.dataWithFallback(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse,
          (200...201).contains(httpResponse.statusCode) else {
        let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
        throw SigningError.serverError("Backend signature API returned \(httpResponse.statusCode): \(errorMessage)")
    }
    
    // Parse response
    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    let signatureResponse = try decoder.decode(BackendSignatureResponse.self, from: data)
    
    print("✅ Signature created successfully: ID \(signatureResponse.id)")
}
```

---

## 📄 API 3: Generate Contract PDF (View/Download)

### Endpoint
```
POST /api/contracts/test/generate-pdf
```

**Production URL:**
```
POST https://www.bonyad-hub.com/api/contracts/test/generate-pdf
```

---

### Request

**Method:** `POST`  
**Content-Type:** `application/x-www-form-urlencoded`

**Headers:**
```
Authorization: Bearer YOUR_USER_TOKEN
Content-Type: application/x-www-form-urlencoded
```

**Form Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `projectId` | String | ✅ Yes | Project ID | `"97"` |
| `technicianId` | String | ✅ Yes | Technician ID | `"35"` |
| `language` | String | ❌ No | `"EN"` (English) or `"AR"` (Arabic) | `"EN"` |
| `returnPdf` | String | ❌ No | If `"true"`, returns PDF file. If `"false"`, returns JSON with PDF URL | `"false"` |

---

### cURL Example

#### Generate PDF and Get URL (JSON Response)

```bash
curl -X POST https://www.bonyad-hub.com/api/contracts/test/generate-pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "projectId=97" \
  -d "technicianId=35" \
  -d "language=EN" \
  -d "returnPdf=false"
```

#### Generate PDF and Download Directly

```bash
curl -X POST https://www.bonyad-hub.com/api/contracts/test/generate-pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "projectId=97" \
  -d "technicianId=35" \
  -d "language=EN" \
  -d "returnPdf=true" \
  -o contract.pdf
```

---

### Response (returnPdf=false)

**Success (200 OK):**
```json
{
  "success": true,
  "message": "PDF generated successfully from HTML template",
  "pdfUrl": "/uploads/contracts/contract-97-1733932800000.pdf",
  "pdfSizeBytes": 125000,
  "projectId": 97,
  "technicianId": 35,
  "language": "EN",
  "downloadUrl": "/uploads/contracts/contract-97-1733932800000.pdf"
}
```

**Key Fields:**
- `pdfUrl`: Relative path to the PDF file
- `downloadUrl`: Full URL to download/view the PDF (same as pdfUrl)
- `pdfSizeBytes`: Size of the PDF in bytes
- `language`: Language used (`EN` or `AR`)

---

### Response (returnPdf=true)

Returns the PDF file directly with:
- **Content-Type:** `application/pdf`
- **Content-Disposition:** `attachment; filename="contract-test.pdf"`

---

### View/Download PDF

After getting the `pdfUrl` or `downloadUrl` from the response, you can:

**View in Browser:**
```
GET https://www.bonyad-hub.com/uploads/contracts/contract-97-1733932800000.pdf
```

**Download PDF:**
```bash
curl -X GET https://www.bonyad-hub.com/uploads/contracts/contract-97-1733932800000.pdf \
  -o contract.pdf
```

---

### iOS Implementation

**Location:** `ContractServiceAPI.swift` - `generateContractPDF()`

```swift
func generateContractPDF(
    projectId: Int, 
    technicianId: Int, 
    language: String = "EN", 
    returnPdf: Bool = false
) async throws -> ContractPDFResponse {
    let endpoint = "\(baseURL)/test/generate-pdf"
    guard let url = URL(string: endpoint) else {
        throw ContractAPIError.invalidURL
    }
    
    guard let token = SessionManager.shared.token else {
        throw ContractAPIError.missingToken
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
    
    // Build form-encoded body
    var components = URLComponents()
    components.queryItems = [
        URLQueryItem(name: "projectId", value: String(projectId)),
        URLQueryItem(name: "technicianId", value: String(technicianId)),
        URLQueryItem(name: "language", value: language),
        URLQueryItem(name: "returnPdf", value: String(returnPdf))
    ]
    
    request.httpBody = components.query?.data(using: .utf8)
    
    let (data, response) = try await session.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse,
          (200..<300).contains(httpResponse.statusCode) else {
        throw ContractAPIError.httpError(httpResponse.statusCode, parseErrorMessage(from: data))
    }
    
    // Decode JSON response
    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    let pdfResponse = try decoder.decode(ContractPDFResponse.self, from: data)
    
    // Resolve relative URLs to absolute URLs
    let resolvedPdfUrl = ContractAPIResult.absoluteURL(from: pdfResponse.pdfUrl, host: baseHost)
    let resolvedDownloadUrl = ContractAPIResult.absoluteURL(from: pdfResponse.downloadUrl, host: baseHost)
    
    return ContractPDFResponse(
        success: pdfResponse.success,
        message: pdfResponse.message,
        pdfUrl: resolvedPdfUrl,
        pdfSizeBytes: pdfResponse.pdfSizeBytes,
        projectId: pdfResponse.projectId,
        technicianId: pdfResponse.technicianId,
        language: pdfResponse.language,
        downloadUrl: resolvedDownloadUrl,
        pdfData: nil
    )
}
```

**Usage in Contract Viewer:**

**Location:** `PDFViewer.swift` - `prepareContract()`

```swift
// Generate PDF from HTML template using the new API
let languageCode = Localizer.shared.currentLanguage == .arabic ? "AR" : "EN"
let pdfResponse = try await ContractServiceAPI.shared.generateContractPDF(
    projectId: projectInt,
    technicianId: technicianInt,
    language: languageCode,
    returnPdf: false
)

// Use downloadUrl if available, otherwise use pdfUrl
let pdfURL = pdfResponse.downloadUrl.isEmpty ? pdfResponse.pdfUrl : pdfResponse.downloadUrl

// Download and display PDF
try await downloadAndStorePDF(from: pdfURL)
```

---

## 🔄 Complete Flow Example

### Step 0: Fetch Emails

```swift
// Get user email from SessionManager
let userEmail = SessionManager.shared.email ?? ""

// Fetch technician email from API
guard let technicianId = assignedTechnicianId else {
    throw ContractAPIError.missingTechnicianId
}

// Fetch technician profile to get email
let technicianEmail = try await fetchTechnicianEmail(technicianId: technicianId)

guard !userEmail.isEmpty, let techEmail = technicianEmail, !techEmail.isEmpty else {
    throw ContractAPIError.missingEmail
}

print("📧 User email: \(userEmail)")
print("📧 Technician email: \(techEmail)")
```

### Step 1: Approve All Phases

```swift
// User clicks "Approve All" button
try await approveAllPhasesAPI(projectId: "97", token: token)
// ✅ All phases approved, project status → CONTRACT_SIGNING
```

### Step 2: Create Signature Request

```swift
// Use the emails fetched in Step 0
await signingService.initiateDigitalSigningWithBackend(
    contractURL: "",
    userEmail: userEmail,  // From Step 0
    technicianEmail: techEmail,  // From Step 0
    userPhone: nil,  // Not using phone numbers
    technicianPhone: nil,  // Not using phone numbers
    projectTitle: "Build a house",
    projectId: "97",
    technicianId: 35,
    phaseIds: [19, 20, 21, 22],
    contractTerms: nil
)
// ✅ Signature request created, both parties receive email
```

### Step 3: View/Download Contract

```swift
// Generate contract PDF
let pdfResponse = try await ContractServiceAPI.shared.generateContractPDF(
    projectId: 97,
    technicianId: 35,
    language: "EN",
    returnPdf: false
)

// Get PDF URL
let pdfURL = pdfResponse.downloadUrl.isEmpty ? pdfResponse.pdfUrl : pdfResponse.downloadUrl

// Download PDF
let pdfData = try await downloadContractPDF(from: pdfURL)

// Display in PDFViewer
PDFViewer(pdfData: pdfData, title: "Contract")
```

---

## 📋 API Summary

| API | Endpoint | Method | Purpose |
|-----|----------|--------|---------|
| **Get User Email** | `SessionManager.shared.email` or `/api/users/me` | `GET` | Get current user's email |
| **Get Technician Email** | `/api/users/{userId}/profile` | `GET` | Get technician's email from profile |
| **Approve All Phases** | `/api/phases/project/{projectId}/approve-all` | `POST` | Approve all phases, move to CONTRACT_SIGNING |
| **Create Signature** | `/api/signatures` | `POST` | Create signature request (backend generates PDF) |
| **Generate Contract PDF** | `/api/contracts/test/generate-pdf` | `POST` | Generate contract PDF from HTML template |
| **View/Download PDF** | `{pdfUrl}` | `GET` | View or download the generated PDF |

---

## ✅ Key Points

0. **Fetch Emails:**
   - User email is typically stored in `SessionManager.shared.email` after login
   - Technician email must be fetched from `/api/users/{userId}/profile` API
   - Both emails are required before creating signature request
   - Technician profile API may work without authentication, but token is recommended

1. **Approve All Phases:**
   - No request body needed
   - Automatically approves all pending phases
   - Changes project status to `CONTRACT_SIGNING`

2. **Create Signature:**
   - **Do NOT send `contractPdf`** - Backend generates PDF automatically
   - **Use emails only** - Phone numbers not needed for email-based signing
   - **Emails are required** - Must fetch user and technician emails first
   - Backend generates PDF from HTML template with all approved phases
   - Both parties receive signing links via email

3. **Generate Contract PDF:**
   - Supports both English (`EN`) and Arabic (`AR`)
   - Can return JSON with URL or PDF file directly
   - PDF includes all project data, phases, and contract terms
   - PDFs are publicly accessible (no auth required to view/download)

---

## 🎯 Language Support

| Language | Code | Description |
|----------|------|-------------|
| **English** | `EN` | English contract template |
| **Arabic** | `AR` | Arabic contract template (RTL) |

---

## 📊 Response Status Codes

| Code | Meaning |
|------|---------|
| `200` | ✅ Success |
| `201` | ✅ Created (for signature request) |
| `400` | ❌ Bad request (missing required fields) |
| `401` | ❌ Unauthorized (invalid/missing token) |
| `404` | ❌ Not found (project/technician doesn't exist) |
| `422` | ❌ Unprocessable entity (validation error) |
| `500` | ❌ Server error |

---

## 🚀 Production URLs

**Get User Email:**
```
GET https://www.bonyad-hub.com/api/users/me
```

**Get Technician Email:**
```
GET https://www.bonyad-hub.com/api/users/{userId}/profile
```

**Approve All Phases:**
```
POST https://www.bonyad-hub.com/api/phases/project/{projectId}/approve-all
```

**Create Signature:**
```
POST https://www.bonyad-hub.com/api/signatures
```

**Generate Contract PDF:**
```
POST https://www.bonyad-hub.com/api/contracts/test/generate-pdf
```

**View/Download PDF:**
```
GET https://www.bonyad-hub.com/uploads/contracts/{filename}.pdf
```

---

## 📝 Notes

- **Email Fetching:**
  - User email is stored in `SessionManager.shared.email` after login (no API call needed)
  - Technician email must be fetched from `/api/users/{userId}/profile` API
  - Technician profile API may work without authentication, but token is recommended for better reliability

- **Authentication:**
  - Most APIs require authentication (Bearer token)
  - Technician profile API (`/api/users/{userId}/profile`) may work without auth, but token is recommended
  - PDFs are publicly accessible once generated (no auth required to view/download)

- **Contract PDFs:**
  - Generated from HTML templates with all project data
  - Supports both English and Arabic languages

- **Signature Requests:**
  - Use email-based signing only (no SMS/phone)
  - Both user and technician emails are required
  - Backend automatically generates PDF from HTML template

- **Language:**
  - Automatically detected from app settings (AR/EN)
  - Can be explicitly set in API calls

---

**All APIs are ready for use!** 🚀📄✍️