


import SwiftUI

struct ProjectSummaryView: View {
    let request: ProjectRequest
    let technician: Technician?  // 👤 Optional technician for direct deal assignment
    @Binding var selectedPhotos: [UIImage]  // 📸 Binding for photos from parent
    let onSubmit: (ProjectRequest) -> Void
    
    @State private var isEditing = false
    @State private var editedDescription: String
    @State private var editedDurationWeeks: Int
    @State private var editedCategory: String
    @State private var editedBudget: Double
    @State private var editedNeedsHouseVisit: Bool
    @State private var editedNeedsBooking: Bool
    @State private var editedAddress: String
    @State private var editedLatitude: Double?
    @State private var editedLongitude: Double?
    @State private var editedPhotos: [String]
    @State private var editedPhases: [ProjectPhase]  // 📋 Editable phases
    @State private var showMapPicker = false  // 📱 Controls map picker presentation
    @State private var selectedAddress = ""  // 📍 Selected address from map
    @State private var selectedLat: Double = 0.0  // 🗺️ Selected latitude
    @State private var selectedLong: Double = 0.0  // 🗺️ Selected longitude
    @State private var showImagePicker = false  // 📸 Show image picker
    @State private var showPhaseEditor = false  // 📋 Controls phase editor presentation
    @State private var showBudgetAlert = false  // 💰 Show budget mismatch alert
    @State private var budgetAlertMessage = ""  // 💰 Budget alert message
    
    init(request: ProjectRequest, technician: Technician? = nil, selectedPhotos: Binding<[UIImage]>, onSubmit: @escaping (ProjectRequest) -> Void) {
        self.request = request
        self.technician = technician
        self._selectedPhotos = selectedPhotos
        self.onSubmit = onSubmit
        self._editedDescription = State(initialValue: request.description)
        self._editedDurationWeeks = State(initialValue: request.durationWeeks)
        self._editedCategory = State(initialValue: request.category)
        self._editedBudget = State(initialValue: request.budget)
        self._editedNeedsHouseVisit = State(initialValue: request.needsHouseVisit)
        self._editedNeedsBooking = State(initialValue: request.needsBooking)
        self._editedAddress = State(initialValue: request.address)
        self._editedLatitude = State(initialValue: request.latitude)
        self._editedLongitude = State(initialValue: request.longitude)
        self._editedPhotos = State(initialValue: request.photos)
        self._editedPhases = State(initialValue: request.phases)
    }
    
    // Use dynamic categories from ProjectServiceAPI
    private var categories: [String] {
        ProjectRequest.getAvailableCategories()
    }
    
    // 🌍 LOCALIZED CATEGORIES: Translated category names for UI display
    private var localizedCategories: [String] {
        ProjectRequest.getLocalizedCategories()
    }
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            VStack(spacing: 12) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.green)
                
                Text("ai_generated_project".localized)
                    .font(.title2.bold())
                    .multilineTextAlignment(.center)
                
                Text("review_and_edit".localized)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, 20)
            
            // Project Details Card
            VStack(spacing: 16) {
                // Description
                VStack(alignment: .leading, spacing: 8) {
                    Text("description".localized)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    if isEditing {
                        TextEditor(text: $editedDescription)
                            .frame(minHeight: 80)
                            .padding(8)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                            )
                    } else {
                        Text(editedDescription)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(12)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.gray.opacity(0.1))
                            )
                    }
                }
                
                // Project Details Grid
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 16) {
                    // Category
                    DetailCard(
                        title: "category".localized,
                        value: editedCategory,
                        icon: "folder.fill",
                        color: .blue
                    ) {
                        Group {
                            if isEditing {
                                CategoryPicker(selection: $editedCategory)
                            } else {
                                Text(editedCategory.localized)
                                    .font(.body)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    
                    // Duration
                    DetailCard(
                        title: "duration".localized,
                        value: "\(editedDurationWeeks) " + "weeks".localized,
                        icon: "clock.fill",
                        color: .orange
                    ) {
                        Group {
                            if isEditing {
                                Stepper("", value: $editedDurationWeeks, in: 1...52)
                            } else {
                                Text("\(editedDurationWeeks) " + "weeks".localized)
                                    .font(.body)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    
                    // Budget
                    DetailCard(
                        title: "budget".localized,
                        value: String(format: "$%.0f", editedBudget),
                        icon: "dollarsign.circle.fill",
                        color: .green
                    ) {
                        Group {
                            if isEditing {
                                TextField("Budget", value: $editedBudget, format: .number)
                                    .keyboardType(.decimalPad)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                            } else {
                                HStack(spacing: 4) {
                                    Text(String(format: "%.0f SAR", editedBudget))
                                        .font(.body)
                                        .foregroundColor(.secondary)
                                    
                                    Image(ThemeManager.shared.selectedTheme == .dark ? "saudi_riyal_logo_dark" : "saudi_riyal_logo")
                                        .resizable()
                                        .frame(width: 16, height: 16)
                                        .foregroundColor(.blue)
                                }
                            }
                        }
                    }
                    
                    // House Visit
                    DetailCard(
                        title: "house_visit".localized,
                        value: editedNeedsHouseVisit ? "yes".localized : "no".localized,
                        icon: "house.fill",
                        color: .purple
                    ) {
                        Group {
                            if isEditing {
                                Toggle("", isOn: $editedNeedsHouseVisit)
                            } else {
                                Text(editedNeedsHouseVisit ? "yes".localized : "no".localized)
                                    .font(.body)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                
                // Booking Requirement
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "calendar.badge.plus")
                            .foregroundColor(.indigo)
                        Text("booking_required".localized)
                            .font(.headline)
                    }
                    
                    if isEditing {
                        Toggle("needs_booking".localized, isOn: $editedNeedsBooking)
                    } else {
                        Text(editedNeedsBooking ? "yes".localized : "no".localized)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .padding(.leading, 24)
                    }
                }
                .padding(.top, 8)
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(.systemBackground))
                    .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
            )
            
            // 📋 WORK PHASES SECTION: Display and edit AI-generated phases
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Image(systemName: "list.number")
                        .foregroundColor(.blue)
                        .font(.title3)
                    Text("work_phases".localized)
                        .font(.headline)
                        .foregroundColor(.primary)
                    Spacer()
                    if !editedPhases.isEmpty {
                        Text("\(editedPhases.count) " + "phases".localized)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(
                                Capsule()
                                    .fill(Color.blue.opacity(0.1))
                            )
                    }
                }
                
                if editedPhases.isEmpty {
                    // No phases message
                    VStack(spacing: 12) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.orange)
                        Text("no_phases_generated".localized)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        Text("add_phases_manually_or_regenerate".localized)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                } else {
                    // Display phases
                    VStack(spacing: 12) {
                        ForEach(Array(editedPhases.enumerated()), id: \.element.id) { index, phase in
                            PhaseCard(
                                phase: phase,
                                index: index + 1,
                                totalPhases: editedPhases.count,
                                isEditing: isEditing,
                                budget: editedBudget,  // Pass budget for auto-calculation
                                onEdit: { updatedPhase in
                                    editedPhases[index] = updatedPhase
                                },
                                onDelete: {
                                    editedPhases.remove(at: index)
                                }
                            )
                        }
                        
                        // Total summary with validation
                        PhaseTotalSummary(
                            phases: editedPhases,
                            budget: editedBudget,
                            duration: editedDurationWeeks
                        )
                    }
                }
                
                // Add Phase Button (when editing)
                if isEditing {
                    Button(action: {
                        let newPhase = ProjectPhase(
                            title: "New Phase",
                            description: "Phase description",
                            status: "pending",
                            percentage: 0.0,
                            amount: 0.0,
                            durationWeeks: 1
                        )
                        editedPhases.append(newPhase)
                    }) {
                        HStack {
                            Image(systemName: "plus.circle.fill")
                            Text("add_phase".localized)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.blue, lineWidth: 2)
                        )
                        .foregroundColor(.blue)
                    }
                }
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(.systemBackground))
                    .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
            )
            
            // Address Section
            VStack(alignment: .leading, spacing: 16) {
                Text("project_address".localized)
                    .font(.headline)
                    .foregroundColor(.primary)
                
                VStack(spacing: 12) {
                    // Manual Address Input
                    VStack(alignment: .leading, spacing: 8) {
                        Text("address".localized)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                        
                        TextField("enter_address".localized, text: $editedAddress)
                            .padding(12)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                            )
                    }
                    
                    // Map Picker Button
                    Button(action: {
                        showMapPicker = true
                    }) {
                        HStack {
                            Image(systemName: "map.fill")
                                .foregroundColor(.blue)
                            Text("select_from_map".localized)
                                .foregroundColor(.blue)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundColor(.blue)
                                .font(.caption)
                        }
                        .padding(12)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.blue.opacity(0.3), lineWidth: 1)
                        )
                    }
                    
                    // Selected Address Display
                    if !editedAddress.isEmpty {
                        HStack {
                            Image(systemName: "location.fill")
                                .foregroundColor(.green)
                            Text(editedAddress)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Spacer()
                            Button("clear".localized) {
                                editedAddress = ""
                                editedLatitude = nil
                                editedLongitude = nil
                            }
                            .font(.caption)
                            .foregroundColor(.red)
                        }
                        .padding(8)
                        .background(
                            RoundedRectangle(cornerRadius: 6)
                                .fill(Color.green.opacity(0.1))
                        )
                    }
                }
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(.systemBackground))
                    .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
            )
            
            // 📸 PHOTO SECTION: Upload project photos
            VStack(alignment: .leading, spacing: 12) {
                Text("project_photos".localized)
                    .font(.headline)
                    .foregroundColor(.primary)
                
                // Photo Grid
                if !selectedPhotos.isEmpty {
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 12) {
                        ForEach(Array(selectedPhotos.enumerated()), id: \.offset) { index, image in
                            ZStack(alignment: .topTrailing) {
                                Image(uiImage: image)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 100, height: 100)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                
                                // Delete button
                                Button(action: {
                                    selectedPhotos.remove(at: index)
                                }) {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundColor(.white)
                                        .background(Circle().fill(Color.red))
                                        .padding(4)
                                }
                            }
                        }
                        
                        // Add more button
                        if selectedPhotos.count < 5 {
                            addPhotoButton
                        }
                    }
                } else {
                    addPhotoButton
                }
                
                Text("add_up_to_5_photos".localized)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(.systemBackground))
                    .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
            )
            
            // Action Buttons
            HStack(spacing: 16) {
                Button(action: {
                    isEditing.toggle()
                }) {
                    HStack {
                        Image(systemName: isEditing ? "checkmark" : "pencil")
                        Text(isEditing ? "done_editing".localized : "edit_project".localized)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color.blue, lineWidth: 2)
                    )
                    .foregroundColor(.blue)
                }
                
                Button(action: {
                    // Validate budget and duration before submitting
                    let totalAmount = editedPhases.reduce(0.0) { $0 + $1.amount }
                    let totalDuration = editedPhases.reduce(0) { $0 + $1.durationWeeks }
                    let budgetDifference = totalAmount - editedBudget
                    let durationDifference = totalDuration - editedDurationWeeks
                    
                    if abs(budgetDifference) >= 1.0 || durationDifference != 0 {
                        // Budget or duration doesn't match - show alert
                        var messages: [String] = []
                        
                        if abs(budgetDifference) >= 1.0 {
                            if budgetDifference > 0 {
                                messages.append(String(format: "phases_over_budget_by".localized, budgetDifference))
                            } else {
                                messages.append(String(format: "phases_under_budget_by".localized, abs(budgetDifference)))
                            }
                        }
                        
                        if durationDifference != 0 {
                            if durationDifference > 0 {
                                messages.append(String(format: "phases_over_duration_by".localized, durationDifference))
                            } else {
                                messages.append(String(format: "phases_under_duration_by".localized, abs(durationDifference)))
                            }
                        }
                        
                        budgetAlertMessage = messages.joined(separator: "\n\n")
                        showBudgetAlert = true
                    } else {
                        // Budget and duration match - proceed with submit
                        submitProject()
                    }
                }) {
                    HStack {
                        Image(systemName: "paperplane.fill")
                        Text(technician != nil ? "send_deal".localized : "submit_project".localized)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [.blue, .blue.opacity(0.7)]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
            }
            
            Spacer(minLength: 20)
        }
        .padding(.horizontal, 20)
        .sheet(isPresented: $showMapPicker) {
            MapPage(
                selectedAddress: $selectedAddress,
                selectedLat: $selectedLat,
                selectedLong: $selectedLong
            )
            .onDisappear {
                if !selectedAddress.isEmpty {
                    editedAddress = selectedAddress
                    editedLatitude = selectedLat
                    editedLongitude = selectedLong
                }
            }
        }
        .alert("budget_validation".localized, isPresented: $showBudgetAlert) {
            Button("fix_phases".localized, role: .cancel) { }
            Button("submit_anyway".localized, role: .destructive) {
                submitProject()
            }
        } message: {
            Text(budgetAlertMessage)
        }
        .navigationViewStyle(.stack)  // 📱 Force single column layout on iPad
        .rtlNavigation()  // 🌍 Apply RTL/LTR support based on language
        .sheet(isPresented: $showImagePicker) {
            MultiImagePicker(images: $selectedPhotos, selectionLimit: 5)
        }
    }
    
    // 📷 ADD PHOTO BUTTON
    private var addPhotoButton: some View {
        Button(action: {
            showImagePicker = true
        }) {
            VStack {
                Image(systemName: "photo.badge.plus")
                    .font(.system(size: 32))
                    .foregroundColor(.blue)
                Text("add_photos".localized)
                    .font(.caption)
                    .foregroundColor(.blue)
            }
            .frame(width: 100, height: 100)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.blue.opacity(0.5), style: StrokeStyle(lineWidth: 2, dash: [5]))
            )
        }
    }
    
    // 🚀 SUBMIT PROJECT: Create and submit the updated project
    private func submitProject() {
        let updatedRequest = ProjectRequest(
            id: request.id,
            userId: request.userId,
            technicianId: request.technicianId,
            title: request.title,
            description: editedDescription,
            category: editedCategory,
            budget: editedBudget,
            durationWeeks: editedDurationWeeks,
            needsHouseVisit: editedNeedsHouseVisit,
            needsBooking: editedNeedsBooking,
            address: editedAddress,
            latitude: editedLatitude,
            longitude: editedLongitude,
            photos: [],  // Photos are uploaded directly, not stored as URLs
            createdAt: request.createdAt,
            status: request.status,
            phases: editedPhases,  // Include edited phases
            paymentPlan: request.paymentPlan,
            contract: request.contract,
            ratings: request.ratings
        )
        onSubmit(updatedRequest)
    }
}

struct DetailCard<Content: View>: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    let content: () -> Content
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .font(.title3)
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                Spacer()
            }
            
            content()
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(color.opacity(0.1))
        )
    }
}

struct CategoryPicker: View {
    @Binding var selection: String
    
    // Use dynamic categories from ProjectServiceAPI
    private var categories: [String] {
        ProjectRequest.getAvailableCategories()
    }
    
    // 🌍 LOCALIZED CATEGORIES: Translated category names for UI display
    private var localizedCategories: [String] {
        ProjectRequest.getLocalizedCategories()
    }
    
    var body: some View {
        Picker("Category", selection: $selection) {
            ForEach(Array(categories.enumerated()), id: \.offset) { index, category in
                Text(localizedCategories[index]).tag(category)
            }
        }
        .pickerStyle(MenuPickerStyle())
    }
}

// 📊 PHASE TOTAL SUMMARY: Separate component to avoid type-checking issues
struct PhaseTotalSummary: View {
    let phases: [ProjectPhase]
    let budget: Double
    let duration: Int
    
    var body: some View {
        let totalAmount = phases.reduce(0.0) { $0 + $1.amount }
        let totalPercentage = phases.reduce(0.0) { $0 + $1.percentage }
        let totalDuration = phases.reduce(0) { $0 + $1.durationWeeks }
        let isBudgetMatch = abs(totalAmount - budget) < 1.0
        let isDurationMatch = totalDuration == duration
        let budgetDifference = totalAmount - budget
        let durationDifference = totalDuration - duration
        
        return VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("total".localized)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    Text("\(phases.count) " + "phases".localized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    HStack(spacing: 4) {
                        Text(String(format: "%.0f SAR", totalAmount))
                            .font(.headline)
                            .foregroundColor(isBudgetMatch ? .green : .red)
                        Image(ThemeManager.shared.selectedTheme == .dark ? "saudi_riyal_logo_dark" : "saudi_riyal_logo")
                            .resizable()
                            .frame(width: 20, height: 20)
                    }
                    HStack(spacing: 4) {
                        Text("\(totalDuration) " + "weeks".localized)
                            .font(.subheadline)
                            .foregroundColor(isDurationMatch ? .green : .red)
                        Text("•")
                            .foregroundColor(.secondary)
                        Text(String(format: "%.1f%%", totalPercentage))
                            .font(.caption)
                            .foregroundColor(isBudgetMatch ? .green : .red)
                    }
                }
            }
            
            // Budget validation indicator
            if abs(budgetDifference) >= 1.0 {
                ValidationMessage(
                    icon: budgetDifference > 0 ? "exclamationmark.triangle.fill" : "exclamationmark.circle.fill",
                    message: (budgetDifference > 0 ? "phases_over_budget".localized : "phases_under_budget".localized) + " " + String(format: "%.0f SAR", abs(budgetDifference)),
                    color: .red
                )
            }
            
            // Duration validation indicator
            if durationDifference != 0 {
                ValidationMessage(
                    icon: durationDifference > 0 ? "exclamationmark.triangle.fill" : "exclamationmark.circle.fill",
                    message: (durationDifference > 0 ? "phases_over_duration".localized : "phases_under_duration".localized) + " " + String(format: "%d", abs(durationDifference)) + " " + "weeks".localized,
                    color: .orange
                )
            }
            
            // Perfect match indicator
            if abs(budgetDifference) < 1.0 && durationDifference == 0 {
                ValidationMessage(
                    icon: "checkmark.circle.fill",
                    message: "phases_match_perfectly".localized,
                    color: .green
                )
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.blue.opacity(0.1))
        )
    }
}

// 📝 VALIDATION MESSAGE: Reusable validation indicator component
struct ValidationMessage: View {
    let icon: String
    let message: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(color)
                .font(.caption)
            Text(message)
                .font(.caption)
                .foregroundColor(color)
            Spacer()
        }
        .padding(.horizontal, 8)
    }
}

// 📋 PHASE CARD: Beautiful card component for displaying and editing a phase
struct PhaseCard: View {
    let phase: ProjectPhase
    let index: Int
    let totalPhases: Int
    let isEditing: Bool
    let budget: Double  // 💰 Total budget for percentage calculation
    let onEdit: (ProjectPhase) -> Void
    let onDelete: () -> Void
    
    @State private var editedTitle: String
    @State private var editedDescription: String
    @State private var editedAmount: Double
    @State private var editedPercentage: Double
    @State private var editedDuration: Int
    @State private var showDeleteConfirmation = false
    @State private var isExpanded = false
    
    init(phase: ProjectPhase, index: Int, totalPhases: Int, isEditing: Bool, budget: Double, onEdit: @escaping (ProjectPhase) -> Void, onDelete: @escaping () -> Void) {
        self.phase = phase
        self.index = index
        self.totalPhases = totalPhases
        self.isEditing = isEditing
        self.budget = budget
        self.onEdit = onEdit
        self.onDelete = onDelete
        self._editedTitle = State(initialValue: phase.title)
        self._editedDescription = State(initialValue: phase.description)
        self._editedAmount = State(initialValue: phase.amount)
        self._editedPercentage = State(initialValue: phase.percentage)
        self._editedDuration = State(initialValue: phase.durationWeeks)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header Section
            HStack(spacing: 12) {
                // Phase Number Badge
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [.blue, .blue.opacity(0.7)]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 44, height: 44)
                    
                    Text("\(index)")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    if isEditing {
                        TextField("phase_title".localized, text: $editedTitle)
                            .font(.headline)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .onChange(of: editedTitle) { _ in
                                updatePhase()
                            }
                    } else {
                        Text(editedTitle)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                    }
                    
                    HStack(spacing: 8) {
                        // Amount
                        HStack(spacing: 4) {
                            if isEditing {
                                TextField("0", value: $editedAmount, format: .number)
                                    .keyboardType(.decimalPad)
                                    .frame(width: 80)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .onChange(of: editedAmount) { newAmount in
                                        // Auto-calculate percentage when amount changes
                                        if budget > 0 {
                                            editedPercentage = (newAmount / budget) * 100.0
                                        }
                                        updatePhase()
                                    }
                                Text("SAR")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            } else {
                                Text(String(format: "%.0f", editedAmount))
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(.green)
                                Image(ThemeManager.shared.selectedTheme == .dark ? "saudi_riyal_logo_dark" : "saudi_riyal_logo")
                                    .resizable()
                                    .frame(width: 14, height: 14)
                            }
                        }
                        
                        Text("•")
                            .foregroundColor(.secondary)
                        
                        // Duration
                        HStack(spacing: 4) {
                            if isEditing {
                                TextField("0", value: $editedDuration, format: .number)
                                    .keyboardType(.numberPad)
                                    .frame(width: 40)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .onChange(of: editedDuration) { _ in
                                        updatePhase()
                                    }
                                Text("wk")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            } else {
                                Text("\(editedDuration)")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(.blue)
                                Text("wk")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Text("•")
                            .foregroundColor(.secondary)
                        
                        // Percentage (auto-calculated, read-only)
                        HStack(spacing: 2) {
                            Text(String(format: "%.1f%%", editedPercentage))
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(isEditing ? .orange : .purple)
                            if isEditing {
                                Image(systemName: "function")
                                    .font(.caption2)
                                    .foregroundColor(.orange)
                            }
                        }
                    }
                }
                
                Spacer()
                
                // Expand/Collapse Button
                Button(action: {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        isExpanded.toggle()
                    }
                }) {
                    Image(systemName: isExpanded ? "chevron.up.circle.fill" : "chevron.down.circle.fill")
                        .font(.title3)
                        .foregroundColor(.blue)
                        .rotationEffect(.degrees(isExpanded ? 0 : 0))
                }
            }
            .padding(16)
            
            // Expandable Description Section
            if isExpanded {
                VStack(alignment: .leading, spacing: 12) {
                    Divider()
                    
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "doc.text.fill")
                                .foregroundColor(.blue)
                                .font(.caption)
                            Text("description".localized)
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.secondary)
                        }
                        
                        if isEditing {
                            TextEditor(text: $editedDescription)
                                .frame(minHeight: 80)
                                .padding(8)
                                .background(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                )
                                .onChange(of: editedDescription) { _ in
                                    updatePhase()
                                }
                        } else {
                            Text(editedDescription)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                                .padding(.leading, 24)
                        }
                    }
                    
                    // Progress Indicator
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "chart.bar.fill")
                                .foregroundColor(.green)
                                .font(.caption)
                            Text("phase_progress".localized)
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text(String(format: "%.1f%%", editedPercentage))
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(.green)
                        }
                        
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.gray.opacity(0.2))
                                    .frame(height: 8)
                                
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(
                                        LinearGradient(
                                            gradient: Gradient(colors: [.green, .green.opacity(0.7)]),
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .frame(width: geometry.size.width * CGFloat(min(editedPercentage, 100.0) / 100.0), height: 8)
                            }
                        }
                        .frame(height: 8)
                    }
                    
                    // Delete Button (when editing)
                    if isEditing {
                        Button(action: {
                            showDeleteConfirmation = true
                        }) {
                            HStack {
                                Image(systemName: "trash.fill")
                                Text("delete_phase".localized)
                            }
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.red.opacity(0.5), lineWidth: 1)
                                    .background(
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(Color.red.opacity(0.05))
                                    )
                            )
                        }
                        .alert("confirm_delete".localized, isPresented: $showDeleteConfirmation) {
                            Button("cancel".localized, role: .cancel) { }
                            Button("delete".localized, role: .destructive) {
                                onDelete()
                            }
                        } message: {
                            Text("delete_phase_confirmation".localized)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 4)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    LinearGradient(
                        gradient: Gradient(colors: [.blue.opacity(0.3), .blue.opacity(0.1)]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
    }
    
    private func updatePhase() {
        let updatedPhase = ProjectPhase(
            id: phase.id,
            title: editedTitle,
            description: editedDescription,
            status: phase.status,
            percentage: editedPercentage,
            amount: editedAmount,
            durationWeeks: max(1, editedDuration),  // Ensure minimum 1 week
            dueDate: phase.dueDate,
            completedAt: phase.completedAt,
            paidAt: phase.paidAt
        )
        onEdit(updatedPhase)
    }
}

#Preview {
    struct PreviewWrapper: View {
        @State private var selectedPhotos: [UIImage] = []
        
        var body: some View {
            ProjectSummaryView(
                request: ProjectRequest(
                    userId: "test_user",
                    title: "Kitchen Renovation",
                    description: "I need to renovate my kitchen with new cabinets, countertops, and appliances. The space is about 200 sq ft.",
                    category: "Renovation",
                    budget: 15000,
                    durationWeeks: 4,
                    needsHouseVisit: true,
                    needsBooking: true,
                    phases: [
                        ProjectPhase(
                            title: "Preparation & Planning",
                            description: "Initial site assessment, measurements, and material selection",
                            percentage: 15.0,
                            amount: 2250.0,
                            durationWeeks: 1
                        ),
                        ProjectPhase(
                            title: "Demolition & Removal",
                            description: "Remove old cabinets, countertops, and appliances",
                            percentage: 20.0,
                            amount: 3000.0,
                            durationWeeks: 1
                        ),
                        ProjectPhase(
                            title: "Installation & Finishing",
                            description: "Install new cabinets, countertops, appliances, and final touches",
                            percentage: 65.0,
                            amount: 9750.0,
                            durationWeeks: 2
                        )
                    ]
                ),
                selectedPhotos: $selectedPhotos,
                onSubmit: { _ in }
            )
        }
    }
    
    return PreviewWrapper()
}

