# Phase Planning Flow - Complete Guide

## Overview
This document explains the complete flow for phase planning after a project status becomes `APPROVED`, including all the files involved and the user/technician interactions.

## Project Status Flow

```
PENDING → APPROVED → PHASE_PLANNING → PHASE_PLANNING_APPROVED → CONTRACT_SIGNING → IN_PROGRESS → COMPLETED
```

## Key Files Location

### 1. **Phase Planning & Approval**
   - **File**: `src/screens/PhaseApprovalModal.tsx`
   - **Purpose**: Handles phase planning (technician) and phase approval (user)
   - **Features**:
     - Technician can create/edit phases when project status is `APPROVED`
     - User can review and approve phases when project status is `PHASE_PLANNING`
     - User can pay for phases
     - Technician can mark phases as complete
     - User can send feedback on phases

### 2. **Contract Signing**
   - **File**: `src/screens/ContractViewerModal.tsx`
   - **Purpose**: Handles contract viewing and signing with dual email signatures
   - **Features**:
     - View contract PDF
     - Sign contract with user and technician emails
     - Contract signing changes status to `CONTRACT_SIGNING` → `IN_PROGRESS`

### 3. **Project Detail View**
   - **File**: `src/screens/ProjectDetailModal.tsx`
   - **Purpose**: Shows project details including phases
   - **Shows**: Phases section with buttons for phase planning/approval and contract signing

### 4. **Projects Screen**
   - **File**: `src/screens/ProjectsScreen.tsx`
   - **Purpose**: Lists projects with filters
   - **Running Projects Filter**: Shows projects with statuses:
     - `APPROVED`
     - `PHASE_PLANNING`
     - `PHASE_PLANNING_APPROVED`
     - `CONTRACT_SIGNING`
     - `IN_PROGRESS`

### 5. **Payment Screen** (Commission)
   - **File**: `src/screens/CommissionPaymentScreen.tsx`
   - **Purpose**: Handles commission payments (1% of project amount)
   - **Note**: Phase payments are handled within `PhaseApprovalModal.tsx`

## Detailed Flow

### Step 1: Project Gets Approved (Status: `APPROVED`)

**When**: User accepts a bid from a technician

**What Happens**:
- Project status changes from `PENDING` → `APPROVED`
- Project appears in "Running Projects" filter
- Both user and technician can see it in their running projects

**Files Involved**:
- `src/screens/ProjectsScreen.tsx` - Shows project in running filter
- `src/screens/ProjectDetailModal.tsx` - Shows project details

---

### Step 2: Phase Planning (Status: `APPROVED` → `PHASE_PLANNING`)

**Who**: Technician

**What Happens**:
1. Technician opens project from "Running Projects"
2. Technician clicks **"Plan Phases"** button (only visible when status is `APPROVED`)
3. `PhaseApprovalModal.tsx` opens in **technician mode** (`isTechnician={true}`)
4. Technician can:
   - **Create phases**: Add new phases with description, time, and money
   - **Edit phases**: Modify existing phases
   - **Delete phases**: Remove phases
5. When technician saves phases, project status changes to `PHASE_PLANNING`

**File**: `src/screens/PhaseApprovalModal.tsx`
- Lines 56-222: Feedback functionality
- Lines 224-273: Payment functionality (`payForPhase`)
- Lines 275-324: Mark phase complete (`markPhaseComplete`)
- Lines 326-338: Edit phase functionality
- Lines 340-410: Create phase functionality

**API Endpoints Used**:
- `GET /api/phases?projectId={id}` - Load phases
- `POST /api/phases` - Create phase
- `PUT /api/phases/{id}` - Update phase
- `DELETE /api/phases/{id}` - Delete phase

---

### Step 3: Phase Approval (Status: `PHASE_PLANNING` → `PHASE_PLANNING_APPROVED`)

**Who**: User

**What Happens**:
1. User opens project from "Running Projects"
2. User sees **"Review & Approve Phases"** button (only visible when status is `PHASE_PLANNING`)
3. `PhaseApprovalModal.tsx` opens in **user mode** (`isTechnician={false}`)
4. User can:
   - **Review all phases**: See all phases planned by technician
   - **Approve phases**: Click "Approve All Phases" button
   - **Send feedback**: Provide feedback on phases before approval
5. When user approves, project status changes to `PHASE_PLANNING_APPROVED`

**File**: `src/screens/PhaseApprovalModal.tsx`
- Lines 420-500: Phase approval logic
- Lines 502-650: Phase rendering and approval UI

**API Endpoints Used**:
- `POST /api/phases/approve` - Approve all phases for a project
- `POST /api/feedback` - Send feedback to technician

---

### Step 4: Contract Signing (Status: `PHASE_PLANNING_APPROVED` → `CONTRACT_SIGNING` → `IN_PROGRESS`)

**Who**: Both User and Technician

**What Happens**:
1. User or Technician opens project from "Running Projects"
2. User/Technician sees **"View Contract"** or **"Sign Contract"** button
3. `ContractViewerModal.tsx` opens
4. Both parties can:
   - **View contract PDF**: See the generated contract
   - **Sign with emails**: 
     - User enters their email
     - Technician enters their email
     - Both emails are sent for signature
   - **Download contract**: Save contract PDF
5. After both parties sign, project status changes to `IN_PROGRESS`

**File**: `src/screens/ContractViewerModal.tsx`
- Lines 97-200: Load project data and phases
- Lines 200-400: Contract generation and PDF viewing
- Lines 400-600: Email signature form and signing logic
- Lines 600-800: Contract signing API calls

**API Endpoints Used**:
- `GET /api/contracts/{projectId}` - Get contract
- `POST /api/contracts/{projectId}/sign` - Sign contract with emails

---

### Step 5: Phase Execution & Payment (Status: `IN_PROGRESS`)

**Who**: Both User and Technician

**What Happens During `IN_PROGRESS`**:

#### Technician Side:
1. Technician works on phases
2. When phase is complete, technician clicks **"Mark Phase Complete"**
3. Phase status changes to `completed: true`
4. User receives notification

#### User Side:
1. User sees completed phase in project details
2. User can **"Pay for Phase"** button for completed phases
3. User pays the phase amount
4. Phase payment status updates to `PAID`
5. Technician can start next phase

**File**: `src/screens/PhaseApprovalModal.tsx`
- Lines 224-273: `payForPhase()` function
- Lines 275-324: `markPhaseComplete()` function

**API Endpoints Used**:
- `POST /api/phases/{phaseId}/pay` - Pay for a phase
- `POST /api/phases/{phaseId}/complete` - Mark phase as complete

---

### Step 6: Feedback System

**Who**: User

**When**: Anytime during phase planning or execution

**What Happens**:
1. User can send feedback on any phase
2. Feedback is sent to technician
3. Technician can see feedback and adjust work accordingly

**File**: `src/screens/PhaseApprovalModal.tsx`
- Lines 165-222: `submitFeedback()` function

**API Endpoints Used**:
- `POST /api/feedback` - Send feedback

---

## Where to Find Files

### Main Files:
1. **PhaseApprovalModal.tsx** - `src/screens/PhaseApprovalModal.tsx`
   - Complete phase planning, approval, payment, and feedback logic

2. **ContractViewerModal.tsx** - `src/screens/ContractViewerModal.tsx`
   - Contract viewing, PDF generation, and dual email signing

3. **ProjectDetailModal.tsx** - `src/screens/ProjectDetailModal.tsx`
   - Lines 354-444: Phase section with buttons
   - Shows phases and action buttons based on project status

4. **ProjectsScreen.tsx** - `src/screens/ProjectsScreen.tsx`
   - Lines 304-315: Running projects filter logic
   - Filters projects by status for "Running Projects" tab

### API Configuration:
- **API Endpoints**: `src/config/api.ts`
- Look for `API_ENDPOINTS.PHASES.*` and `API_ENDPOINTS.CONTRACTS.*`

---

## UI Flow Summary

### For Technician:
1. Open "Running Projects" → See `APPROVED` projects
2. Click project → See "Plan Phases" button
3. Click "Plan Phases" → Open `PhaseApprovalModal` (technician mode)
4. Create/Edit phases → Save → Status becomes `PHASE_PLANNING`
5. Wait for user approval → Status becomes `PHASE_PLANNING_APPROVED`
6. Sign contract → Status becomes `IN_PROGRESS`
7. Work on phases → Mark phases complete → User pays

### For User:
1. Open "Running Projects" → See `APPROVED` projects
2. Click project → See phases section (if technician has planned)
3. When status is `PHASE_PLANNING` → See "Review & Approve Phases" button
4. Click button → Open `PhaseApprovalModal` (user mode)
5. Review phases → Approve → Status becomes `PHASE_PLANNING_APPROVED`
6. Sign contract → Status becomes `IN_PROGRESS`
7. Pay for completed phases → Technician continues work

---

## Key Status Transitions

| Status | Who Can Act | Action Available |
|--------|-------------|------------------|
| `APPROVED` | Technician | Plan Phases |
| `PHASE_PLANNING` | User | Review & Approve Phases |
| `PHASE_PLANNING_APPROVED` | Both | View/Sign Contract |
| `CONTRACT_SIGNING` | Both | Complete Contract Signing |
| `IN_PROGRESS` | Both | Execute phases, Pay, Mark complete |

---

## Notes

- **Phase Payment**: Payments are made per phase, not all at once
- **Feedback**: Can be sent at any time during phase planning or execution
- **Contract Signing**: Requires both user and technician email signatures
- **Running Projects**: Shows all projects except `PENDING` and `COMPLETED`
- **Phase Approval**: User must approve all phases before contract can be signed
