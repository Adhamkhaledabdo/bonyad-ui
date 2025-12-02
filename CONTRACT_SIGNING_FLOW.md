# Contract Signing Flow Documentation

## Overview
The contract signing flow allows both users (homeowners) and technicians to sign project contracts using dual email signatures. This document explains how the contract signing process works in the app.

## Flow Steps

### 1. **Project Status Progression**
The contract signing flow is triggered when a project reaches `PHASE_PLANNING_APPROVED` status:

- **PENDING** → User creates project
- **APPROVED** → Technician plans phases
- **PHASE_PLANNING** → User reviews and approves phases
- **PHASE_PLANNING_APPROVED** → **Contract signing becomes available**
- **CONTRACT_SIGNING** → Both parties are signing
- **IN_PROGRESS** → Contract fully signed, work begins

### 2. **Accessing Contract Signing**

#### For Users (Homeowners):
- Navigate to **"Running Projects"** tab
- Open a project with status `PHASE_PLANNING_APPROVED`, `CONTRACT_SIGNING`, or `IN_PROGRESS`
- Click **"View Contract"** or **"Sign Contract"** button

#### For Technicians:
- Navigate to **"My Assigned Projects"** (running projects)
- Open a project with status `PHASE_PLANNING_APPROVED`, `CONTRACT_SIGNING`, or `IN_PROGRESS`
- Click **"View Contract"** or **"Sign Contract"** button

### 3. **Contract Signing Process**

#### Step 1: View Contract Details
- **Project Details**: Description, location, budget, parties involved
- **Phases**: All approved phases with costs and timelines
- **Terms & Conditions**: Payment terms, warranty information
- **PDF View**: View the contract PDF template

#### Step 2: Enter Email Addresses (First Time Only)
When initiating the signature for the first time:
- **User Email**: Homeowner's email address
- **Technician Email**: Technician's email address
- Both emails are required to send the contract for signing

#### Step 3: Sign Contract
- Click **"Sign Contract"** button
- System creates a contract with:
  - Project details
  - All approved phases
  - Contract terms
  - PDF document
- Contract is sent to both parties' email addresses

#### Step 4: Email Signature Process
1. **First Signer** (whoever clicks first):
   - Receives email with contract link
   - Signs via email
   - Status updates to "Signed" for that party

2. **Second Signer** (other party):
   - Receives email with contract link
   - Signs via email
   - When both parties sign, contract status becomes "All Signed"

### 4. **Signature Status Display**

#### Status Indicators:
- **"Contract Signed by Both Parties"** (Green badge):
  - Both parties have signed
  - Project can proceed to `IN_PROGRESS`
  
- **"Waiting for Signatures"** (Orange badge):
  - One or both parties haven't signed yet
  - Shows individual signature status

#### Individual Status:
- **Signed**: Shows checkmark, email, and signed date
- **Pending**: Shows clock icon and "Pending" text

### 5. **Contract PDF**

#### Viewing Options:
- **Template PDF**: View the contract template before signing
- **Signed PDF**: View the fully signed contract after both parties sign

#### PDF Access:
- Click **"View Contract Template PDF"** or **"View Signed Contract PDF"** button
- On web: Opens inline PDF viewer
- On mobile: Opens PDF in external viewer or sharing options

## Technical Implementation

### Files Involved:

1. **`ContractViewerModal.tsx`**:
   - Main component for viewing and signing contracts
   - Handles email form, signature submission, status checking
   - Location: `src/screens/ContractViewerModal.tsx`

2. **`ProjectDetailModal.tsx`**:
   - Shows "View Contract" / "Sign Contract" button based on project status
   - Passes `isTechnician` prop to `ContractViewerModal`
   - Location: `src/screens/ProjectDetailModal.tsx`

3. **`ProjectsScreen.tsx`**:
   - Routes to `ProjectDetailModal` for running projects
   - Handles project status filtering
   - Location: `src/screens/ProjectsScreen.tsx`

### API Endpoints:

1. **`GET /api/contracts/status?projectId={id}`**:
   - Check current signature status
   - Returns: Contract status, signatories, signed dates

2. **`POST /api/contracts/create`**:
   - Create contract and initiate signatures
   - Body: `FormData` with:
     - `projectId`
     - `technicianId`
     - `phaseIds` (comma-separated)
     - `contractTerms`
     - `projectTitle`
     - `userEmail`
     - `technicianEmail`
     - `contractPdf` (file)

### Key Functions:

#### `checkSignatureStatus()`:
- Fetches current signature status from API
- Updates UI to show who has signed

#### `signContract()`:
- Initiates signature process
- Shows email form if emails not provided
- Calls `submitSignature()` with emails

#### `submitSignature()`:
- Creates FormData with project details and PDF
- Sends POST request to create contract
- Triggers email sending to both parties

#### `viewPdfContract()`:
- Opens PDF viewer
- Uses signed PDF URL if available
- Falls back to template PDF from assets

## User Experience Flow

### Scenario 1: User Initiates Signing
1. User opens project → Sees "View Contract" button
2. Clicks button → `ContractViewerModal` opens
3. User enters both emails → Clicks "Submit"
4. Contract created → Emails sent to both parties
5. User signs via email → Status updates
6. Technician signs via email → Contract complete

### Scenario 2: Technician Initiates Signing
1. Technician opens project → Sees "View Contract" button
2. Same flow as Scenario 1

### Scenario 3: Viewing Already-Signed Contract
1. User/Technician opens project → Sees "View Contract" button
2. Clicks button → `ContractViewerModal` opens
3. Status shows "Contract Signed by Both Parties"
4. Can view signed PDF
5. Cannot sign again (already signed)

## Features

### ✅ Implemented:
- Dual email signature system
- Contract PDF generation
- Signature status tracking
- Email-based signing workflow
- PDF viewing (web and mobile)
- RTL support for Arabic language
- Role-based access (user vs technician)

### 🔄 Status Transitions:
- `PHASE_PLANNING_APPROVED` → Contract available
- `CONTRACT_SIGNING` → One or both parties signing
- `IN_PROGRESS` → Contract fully signed, work begins

## Notes

- The contract PDF template is stored in `assets/contract.pdf`
- Both parties must sign via email for the contract to be fully executed
- The signature status is checked in real-time when the modal opens
- The contract includes all approved phases and their costs
- Payment terms and warranty are included in the contract terms

