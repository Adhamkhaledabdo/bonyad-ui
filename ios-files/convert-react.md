# 📱 React Native Conversion - File Mapping Guide

## 🎯 FILES TO CONVERT FOR REACT NATIVE

---

## 1️⃣ **PROFILE SCREEN**

### **Main File:**
- **Path:** `/App/Screens/profile.swift`
- **Purpose:** Profile tab screen showing user info and menu options
- **Lines:** 459 lines

### **Components:**
```
ProfileView (Main component)
├── Profile Image (circular with gradient border)
├── User Info Card (name, phone, role)
├── Menu Items (Technician):
│   ├── Manage Profile → TechnicianProfileManagementView
│   ├── My Data → MyProfileView
│   ├── My Portfolio → PortfolioManagementView
│   ├── Subscription → SubscriptionManagementView
│   └── Home Features → HomeFeatureTogglesView
├── Menu Items (User):
│   ├── My Data → MyProfileView
│   └── Home Features → HomeFeatureTogglesView
├── Change Language Button
├── Dark Mode Toggle
└── Logout Button

ProfileMenuCard (Reusable component)
└── Icon + Title + Chevron
```

### **API Calls:**
```http
GET /api/users/profile
Headers:
  Authorization: Bearer {token}

Response:
{
  "id": 123,
  "name": "Ahmed Al-Rashid",
  "email": "ahmed@example.com",
  "phone": "+966501234567",
  "avatar": "/uploads/avatar123.jpg",
  "profileImage": "/uploads/profile123.jpg",
  "role": "TECHNICIAN",
  "regions": [{"id": 1, "nameEn": "Riyadh", "nameAr": "الرياض"}],
  "yearsOfExperience": 8,
  "hasPortfolio": true,
  "certificates": [...]
}
```

### **State Management:**
- SessionManager (singleton) - stores token, userId, name, role
- Localizer (singleton) - manages language (EN/AR)
- ThemeManager (singleton) - manages dark/light mode

---

## 2️⃣ **REQUEST PROJECT FLOW**

### **Entry Point:**
- **Path:** `/App/Screens/new_request/aipopup.swift`
- **Purpose:** Choose between AI or Manual project creation
- **Lines:** 239 lines

### **File Structure:**
```
NewProjectView (Entry point)
├── Header (logo + title)
├── Choice Buttons:
│   ├── "Use AI Assistant" button → ConversationalAIForm
│   └── "Fill Manually" button → ManualProjectForm
└── Typing animation (example prompts)
```

### **Navigation Flow:**
```
User clicks "Request Project"
         ↓
   NewProjectView (aipopup.swift)
         ↓
    ┌────────┴────────┐
    ↓                 ↓
AI Route         Manual Route
    ↓                 ↓
ConversationalAIForm  ManualProjectForm
```

### **No APIs in this file** - Just navigation

---

## 3️⃣ **AI PROJECT CREATION**

### **Files:**

#### **A. Conversational AI Form**
- **Path:** `/App/Screens/new_request/ConversationalAIForm.swift`
- **Purpose:** Chat interface where AI asks questions
- **Approximate Lines:** ~800-1000 lines

**Features:**
- Chat bubble interface
- AI asks follow-up questions
- Builds project data incrementally
- Uses ChatGPT API

**Flow:**
```
1. AI: "What type of project?" → User: "Kitchen renovation"
2. AI: "What's your budget?" → User: "15,000 SAR"
3. AI: "Duration?" → User: "3 weeks"
4. AI: "Location?" → User: "Riyadh, Al-Malqa"
5. AI generates complete project
6. Shows ProjectSummaryView for confirmation
```

#### **B. AI Service**
- **Path:** `/App/Screens/new_request/AiService.swift`
- **Purpose:** Handles ChatGPT API calls
- **Lines:** 680 lines (you saw this already)

**Key Functions:**
```swift
// Main function
func generateProjectRequest(from description: String) async throws -> ProjectRequest

// Description enhancement
func enhanceDescription(_ description: String) async throws -> String
```

**API Used:**
```http
POST https://api.openai.com/v1/chat/completions
Headers:
  Authorization: Bearer sk-proj-YOUR_KEY
  Content-Type: application/json

Body:
{
  "model": "gpt-4o-mini",
  "messages": [
    {"role": "system", "content": "You are an expert construction estimator..."},
    {"role": "user", "content": "I need to renovate my kitchen"}
  ],
  "temperature": 0.1,
  "max_tokens": 500
}

Response:
{
  "choices": [{
    "message": {
      "content": "{\"description\": \"...\", \"budget\": 15000, ...}"
    }
  }]
}
```

#### **C. AI Project Form** (Older version)
- **Path:** `/App/Screens/new_request/AIProjectForm.swift`
- **Purpose:** Single-prompt AI generation (simpler than conversational)

---

## 4️⃣ **MANUAL PROJECT CREATION**

### **File:**
- **Path:** `/App/Screens/new_request/ManualProjectForm.swift`
- **Purpose:** Traditional form for creating project
- **Approximate Lines:** ~600-800 lines

### **Form Fields:**
```
Manual Project Form
├── Project Title (text input)
├── Description (multiline text)
├── Category (picker/dropdown)
├── Budget (number input)
├── Duration (number input + unit)
├── Needs House Visit? (toggle)
├── Needs Booking? (toggle)
├── Address (text input)
├── Location (map picker)
├── Photos (image picker - multiple)
└── Phases (optional breakdown)
    ├── Phase 1 (title, description, duration, budget)
    ├── Phase 2 (...)
    └── Add More Phases button
```

### **API Calls:**
```http
POST /api/projects
Headers:
  Authorization: Bearer {token}
  Content-Type: multipart/form-data

Body:
{
  "title": "Kitchen Renovation",
  "description": "Complete kitchen remodel...",
  "category": "Carpentry",
  "budget": 15000,
  "durationWeeks": 3,
  "needsHouseVisit": true,
  "needsBooking": true,
  "address": "123 Main St, Riyadh",
  "latitude": 24.7136,
  "longitude": 46.6753,
  "photos": [File, File, File],
  "phases": [
    {
      "title": "Phase 1: Planning",
      "description": "Initial planning and design",
      "durationWeeks": 1,
      "percentage": 20,
      "amount": 3000
    }
  ],
  "type": "all" or "direct",
  "targetTechnicianId": 123 (if direct)
}
```

---

## 5️⃣ **PROJECT SUMMARY & CONFIRMATION**

### **File:**
- **Path:** `/App/Screens/new_request/ProjectSummaryView.swift`
- **Purpose:** Shows generated/created project before final submission

### **Shows:**
- Project title & description
- Budget & duration
- Category & requirements
- Address & location
- Photos preview
- Phases breakdown
- Edit button (returns to form)
- Submit button (creates project)

---

## 📂 **COMPLETE FILE LIST FOR REACT CONVERSION:**

### **Core Screens:**
```
1. profile.swift (459 lines) ✅ Shown above
2. aipopup.swift (239 lines) ✅ Shown above  
3. ConversationalAIForm.swift (~800-1000 lines)
4. AiService.swift (680 lines) - AI logic
5. ManualProjectForm.swift (~600-800 lines)
6. ProjectSummaryView.swift (~400-500 lines)
```

### **Supporting Files:**
```
7. SessionManager.swift - Auth state
8. Localizer.swift - i18n
9. ThemeManager.swift - Dark/Light mode
10. UserDetails.swift - Data model
11. ProjectRequest.swift - Data model
12. ProjectServiceAPI.swift - Categories API
```

### **Home Components (Already Created):**
```
13. SmartRecommendationsComponent.swift
14. EarningsVisualizationComponent.swift
15. StoriesFeatureComponent.swift
16. MapIntegrationComponent.swift
17. TechnicianMapComponent.swift
18. AISuggestionsComponent.swift
19. GamificationComponent.swift
20. BidNowProjectsComponent.swift
21. AdvertisementComponent.swift
22. HomeFeatureSettings.swift
```

---

## 🗂️ **FILE LOCATIONS:**

All files are in:
```
/Users/ahmedfarahat/Desktop/bonyad-cr-2/bonyad-cr-2/App/Screens/

Profile:
  - profile.swift

Request Project:
  - new_request/aipopup.swift (entry)
  - new_request/ConversationalAIForm.swift
  - new_request/AIProjectForm.swift
  - new_request/ManualProjectForm.swift
  - new_request/ProjectSummaryView.swift
  - new_request/AiService.swift

Home Components:
  - HomeComponents/*.swift (9 files)

Models:
  - models/UserDetails.swift
  - new_request/ProjectRequest.swift
```

---

## 🔑 **API ENDPOINTS USED:**

### **Profile Screen:**
```http
GET /api/users/profile
→ Fetches user details
```

### **Request Project:**
```http
POST /api/projects
→ Creates new project

GET /api/services
→ Gets categories list
```

### **AI Service:**
```http
POST https://api.openai.com/v1/chat/completions
→ ChatGPT API for project generation
```

---

## 📋 **WHAT YOU NEED TO DO:**

### **For React Native Conversion:**

1. **Show these files to Cursor AI:**
   - `profile.swift` ✅
   - `aipopup.swift` ✅
   - `ConversationalAIForm.swift`
   - `AiService.swift`
   - `ManualProjectForm.swift`

2. **Ask Cursor to convert each file**

3. **Use these React Native equivalents:**
   - SwiftUI → React Native Components
   - NavigationLink → React Navigation
   - @State → useState hook
   - @ObservedObject → useContext/Redux
   - Sheet → Modal component
   - Async/await → Same in JS
   - URLSession → fetch() or axios

4. **Keep same API endpoints** - Backend unchanged

---

## 🎯 **RECOMMENDATION:**

**Convert these files in order:**

1. **profile.swift** (easiest - simple layout)
2. **aipopup.swift** (medium - navigation + animation)
3. **ManualProjectForm.swift** (complex - many form fields)
4. **AiService.swift** (medium - API calls)
5. **ConversationalAIForm.swift** (complex - chat interface)

---

**Would you like me to show you any specific file content? Just ask and I'll display the full file!**

