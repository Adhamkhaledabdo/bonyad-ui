import SwiftUI
import PhotosUI

struct ManualProjectForm: View {
    let technician: Technician?  // 👤 Optional technician for direct deal assignment
    @Environment(\.dismiss) private var dismiss
    
    init(technician: Technician? = nil) {
        self.technician = technician
    }
    
    // Form input states
    @State private var title = ""
    @State private var description = ""
    @State private var category = "Plumbing"
    @State private var budget: Double = 0
    @State private var durationWeeks = 1
    @State private var needsHouseVisit = false
    @State private var needsBooking = false
    @State private var selectedAddress = ""
    @State private var selectedLat: Double?
    @State private var selectedLong: Double?
    @State private var selectedPhotos: [UIImage] = []  // Store actual images
    
    // UI states
    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var showMapPicker = false
    @State private var refreshTrigger = UUID() // 🔄 Force view refresh
    
    // Use dynamic categories from ServiceAPI
    private var categories: [String] {
        ProjectRequest.getAvailableCategories()
    }
    
    // 🌍 LOCALIZED CATEGORIES: Translated category names for UI display
    private var localizedCategories: [String] {
        ProjectRequest.getLocalizedCategories()
    }
    
    // 🔄 CREATE REQUEST: Create ProjectRequest from form state
    private func createRequest() -> ProjectRequest {
        return ProjectRequest(
            userId: SessionManager.shared.userId?.description ?? "unknown",
            title: title.isEmpty ? String(description.prefix(50)) : title,
            description: description,
            category: category,
            budget: budget,
            durationWeeks: durationWeeks,
            needsHouseVisit: needsHouseVisit,
            needsBooking: needsBooking,
            address: selectedAddress,
            latitude: selectedLat,
            longitude: selectedLong,
            photos: []  // Photos uploaded directly with project, not stored as URLs
        )
    }
    
    var body: some View {
        GeometryReader { geometry in
            NavigationStack {
                ZStack {
                    // Background color to prevent white flash
                    Color(.systemBackground)
                        .ignoresSafeArea()
                    
                    ScrollView {
                        LazyVStack(spacing: 24) {
                            headerSection
                            formFieldsSection
                            actionButtonsSection
                        }
                        .padding(.top, 1) // Small padding to ensure proper layout
                        .frame(minHeight: geometry.size.height) // 👈 Use minHeight instead of maxHeight
                    }
                    .opacity(isSubmitting ? 0.6 : 1.0)
                    .disabled(isSubmitting)
                    
                    // Loading overlay
                    if isSubmitting {
                        VStack {
                            ProgressView()
                                .scaleEffect(1.2)
                            Text("submitting".localized)
                                .font(.headline)
                                .padding(.top, 8)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.black.opacity(0.1))
                    }
                }
                .navigationTitle("manual_project_form".localized)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button("cancel".localized) {
                            dismiss()
                        }
                        .disabled(isSubmitting)
                    }
                }
                .sheet(isPresented: $showMapPicker) {
                    // TODO: Implement MapPickerView or use alternative map selection
                    Text("Map picker not implemented yet")
                        .padding()
                }
                .sheet(isPresented: $showImagePicker) {
                    MultiImagePicker(images: $selectedPhotos, selectionLimit: 5)
                }
            .alert("success".localized, isPresented: $showSuccess) {
                Button("ok".localized) {
                    // 🔄 Trigger refresh and dismiss
                    refreshTrigger = UUID()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        dismiss()
                    }
                }
            } message: {
                Text(technician != nil ? "deal_sent_successfully".localized : "project_submitted_successfully".localized)
            }
            .onAppear {
                print("🟢 ManualProjectForm appeared, size: \(geometry.size)")
                
                // 🎯 Debug: Check if technician is received
                if let tech = technician {
                    print("🎯 ManualProjectForm loaded WITH technician:")
                    print("   ID: \(tech.id)")
                    print("   Name: \(tech.name)")
                    print("   This will be a DIRECT ASSIGNMENT")
                } else {
                    print("📢 ManualProjectForm loaded WITHOUT technician (regular project)")
                }
                    
                    // Fetch services if not already loaded
                    if ProjectServiceAPI.shared.services.isEmpty {
                        Task {
                            await ProjectServiceAPI.shared.fetchServices()
                        }
                    }
                }
                .background(Color.yellow.opacity(0.1)) // 👈 Debug visual layer
                .id(refreshTrigger) // 🔄 Force view refresh when trigger changes
            }
            .navigationViewStyle(.stack)  // 📱 Force single column layout on iPad
        }
    }
    
    // 📋 HEADER SECTION: Title and description
    private var headerSection: some View {
        VStack(spacing: 16) {
            Image(systemName: "pencil.and.outline")
                .font(.system(size: 50))
                .foregroundColor(.blue)
            
            Text("manual_project_form".localized)
                .font(.title.bold())
                .multilineTextAlignment(.center)
            
            Text("fill_project_details_manually".localized)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 20)
    }
    
    // 📝 FORM FIELDS SECTION: All input fields
    private var formFieldsSection: some View {
        VStack(spacing: 20) {
            // Description Section
            descriptionSection
            
            // Project Details Grid
            projectDetailsGrid
            
            // Budget Section
            budgetSection
            
            // Options Section
            optionsSection
            
            // Address Section
            addressSection
            
            // Photos Section
            photosSection
        }
        .padding(.horizontal, 20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.bottom, 20) // 👈 Add bottom padding for better spacing
    }
    
    // 📝 DESCRIPTION SECTION: Project description input
    private var descriptionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("project_description".localized)
                .font(.headline)
                .foregroundColor(.primary)
            
            ZStack(alignment: .topLeading) {
                TextEditor(text: $description)
                    .frame(minHeight: 120)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
                    .onChange(of: description) { newValue in
                        title = String(newValue.prefix(50))
                    }
                
                if description.isEmpty {
                    Text("enter_project_description_placeholder".localized)
                        .foregroundColor(.gray)
                        .padding(.leading, 16)
                        .padding(.top, 20)
                        .allowsHitTesting(false)
                }
            }
        }
    }
    
    // 📊 PROJECT DETAILS GRID: Category and duration
    private var projectDetailsGrid: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 16) {
            // Category
            VStack(alignment: .leading, spacing: 8) {
                Text("category".localized)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                
                Picker("Category", selection: $category) {
                    ForEach(Array(categories.enumerated()), id: \.offset) { index, categoryName in
                        Text(localizedCategories[index]).tag(categoryName)
                    }
                }
                .pickerStyle(MenuPickerStyle())
                .padding(8)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.gray.opacity(0.1))
                )
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            // Duration
            VStack(alignment: .leading, spacing: 8) {
                Text("duration_weeks".localized)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                
                HStack {
                    Stepper("", value: $durationWeeks, in: 1...52)
                    Text("\(durationWeeks) " + "weeks".localized)
                        .font(.body)
                        .foregroundColor(.secondary)
                }
                .padding(8)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.gray.opacity(0.1))
                )
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
    
    // 💰 BUDGET SECTION: Budget input
    private var budgetSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("budget".localized)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.primary)
            
            HStack {
                TextField("enter_budget".localized, value: $budget, format: .number)
                    .keyboardType(.decimalPad)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
                
                Text("SAR")
                    .font(.body)
                    .foregroundColor(.secondary)
            }
        }
    }
    
    // ⚙️ OPTIONS SECTION: Checkboxes for house visit and booking
    private var optionsSection: some View {
        VStack(spacing: 16) {
            Toggle("needs_house_visit".localized, isOn: $needsHouseVisit)
                .toggleStyle(SwitchToggleStyle(tint: .blue))
            
            Toggle("needs_booking".localized, isOn: $needsBooking)
                .toggleStyle(SwitchToggleStyle(tint: .blue))
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.gray.opacity(0.1))
        )
    }
    
    // 📍 ADDRESS SECTION: Address input and map picker
    private var addressSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("project_address".localized)
                .font(.headline)
                .foregroundColor(.primary)
            
            HStack {
                TextField("enter_address".localized, text: $selectedAddress)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
                
                Button(action: {
                    showMapPicker = true
                }) {
                    Image(systemName: "map")
                        .foregroundColor(.blue)
                        .padding(12)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.blue.opacity(0.1))
                        )
                }
            }
        }
    }
    
    // 📷 PHOTOS SECTION: Photo upload
    private var photosSection: some View {
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
    }
    
    // 📷 ADD PHOTO BUTTON
    private var addPhotoButton: some View {
        Button(action: {
            // Show image picker
            presentImagePicker()
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
    
    // 📷 IMAGE PICKER
    @State private var showImagePicker = false
    
    private func presentImagePicker() {
        showImagePicker = true
    }
    
    // 🔘 ACTION BUTTONS SECTION: Submit and cancel buttons
    private var actionButtonsSection: some View {
        VStack(spacing: 16) {
            Button(action: submitProject) {
                HStack {
                    if isSubmitting {
                        ProgressView()
                            .scaleEffect(0.8)
                            .foregroundColor(.white)
                    } else {
                        Image(systemName: "paperplane.fill")
                    }
                    Text(isSubmitting ? "submitting".localized : (technician != nil ? "send_deal".localized : "submit_project".localized))
            }
            .frame(maxWidth: .infinity)
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(isSubmitting ? Color.gray : Color.blue)
                )
                .foregroundColor(.white)
                .fontWeight(.semibold)
            }
            .disabled(isSubmitting || description.isEmpty)
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 20)
    }
    
    // 🚀 SUBMIT PROJECT: Submit to backend API
    private func submitProject() {
        guard !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return
        }
        
        guard let token = SessionManager.shared.token else {
            print("❌ No auth token found")
            return
        }
        
        guard let userId = SessionManager.shared.userId else {
            print("❌ No user ID found")
            return
        }
        
        isSubmitting = true
        
        print("📸 ============ MANUAL PROJECT SUBMISSION ============")
        print("📋 Project Details:")
        print("   Description: \(description)")
        print("   Duration: \(durationWeeks) weeks → \(durationWeeks * 7) days")
        print("   Category: \(category)")
        print("   Budget: \(budget) SAR")
        print("   Address: \(selectedAddress)")
        print("   Latitude: \(selectedLat ?? 0)")
        print("   Longitude: \(selectedLong ?? 0)")
        print("   Photos: \(selectedPhotos.count)")
        
        Task {
            do {
                // Calculate timeRequiredDays and log it
                let calculatedDays = durationWeeks * 7
                print("🔢 Duration Calculation:")
                print("   durationWeeks: \(durationWeeks)")
                print("   calculatedDays (weeks * 7): \(calculatedDays)")
                print("   Type: \(type(of: calculatedDays))")
                
                // 🎯 Check if this is a direct assignment
                if let tech = technician {
                    print("🎯 DIRECT ASSIGNMENT MODE:")
                    print("   Technician ID: \(tech.id)")
                    print("   Technician Name: \(tech.name)")
                    print("   Assignment Type: DIRECT_ASSIGNMENT")
                } else {
                    print("📢 REGULAR PROJECT MODE (no technician assigned)")
                }
                
                let projectId = try await submitToBackend(
                    description: description,
                    category: category,
                    budget: budget,
                    address: selectedAddress,
                    latitude: selectedLat ?? 0,
                    longitude: selectedLong ?? 0,
                    timeRequiredDays: calculatedDays,  // Convert weeks to days
                    projectType: technician != nil ? "DIRECT_ASSIGNMENT" : "ALL",  // 🎯 Set projectType based on technician
                    photos: selectedPhotos,  // Pass actual images
                    token: token,
                    userId: userId,
                    assignedTechnicianId: technician?.id,  // 🎯 Pass technician ID if hiring directly
                    assignmentType: technician != nil ? "DIRECT_ASSIGNMENT" : nil  // 🎯 Mark as direct assignment
                )
                
                await MainActor.run {
                    isSubmitting = false
                    showSuccess = true
                    print("✅ Project submitted successfully with ID: \(projectId)")
                    print("📸 ============ PROJECT SUBMISSION END ============")
                }
            } catch {
                await MainActor.run {
                    isSubmitting = false
                    print("❌ Error submitting project: \(error.localizedDescription)")
                    print("📸 ============ PROJECT SUBMISSION END (ERROR) ============")
                }
            }
        }
    }
    
    // 🌐 BACKEND API: Submit project to backend
    private func submitToBackend(
        description: String,
        category: String,
        budget: Double,
        address: String,
        latitude: Double,
        longitude: Double,
        timeRequiredDays: Int,
        projectType: String,
        photos: [UIImage],
        token: String,
        userId: Int,
        assignedTechnicianId: Int? = nil,  // 🎯 For direct assignment
        assignmentType: String? = nil  // 🎯 "DIRECT_ASSIGNMENT" for hired technicians
    ) async throws -> Int {
        
        // Get serviceId from category name
        guard let service = ProjectServiceAPI.shared.services.first(where: { $0.name == category }),
              let serviceId = service.id as Int? else {
            print("❌ Could not find serviceId for category: \(category)")
            throw NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid service category"])
        }
        
        let apiURL = "https://glynda-unvexatious-felisa.ngrok-free.dev/api/projects/create"
        guard let url = URL(string: apiURL) else {
            throw NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        print("📤 Creating multipart request:")
        print("   serviceId: \(serviceId)")
        print("   timeRequiredDays: \(timeRequiredDays)")
        print("   projectType: \(projectType)")
        
        // Add text fields
        var fields: [String: String] = [
            "description": description,
            "serviceId": "\(serviceId)",
            "budget": "\(budget)",
            "address": address,
            "latitude": "\(latitude)",
            "longitude": "\(longitude)",
            "timeRequired": "\(timeRequiredDays)",  // API expects "timeRequired" (in days)
            "projectType": projectType
        ]
        
        // 🎯 Add direct assignment fields if hiring specific technician
        print("🎯 Checking direct assignment parameters:")
        print("   assignedTechnicianId parameter: \(assignedTechnicianId?.description ?? "nil")")
        print("   assignmentType parameter: \(assignmentType ?? "nil")")
        
        if let technicianId = assignedTechnicianId {
            fields["assignedTechnicianId"] = "\(technicianId)"
            print("   ✅ ADDED assignedTechnicianId to form: \(technicianId)")
        } else {
            print("   ⚠️ NO assignedTechnicianId - this is a regular project")
        }
        
        if let type = assignmentType {
            fields["assignmentType"] = type
            print("   ✅ ADDED assignmentType to form: \(type)")
        } else {
            print("   ⚠️ NO assignmentType - this is a regular project")
        }
        
        for (key, value) in fields {
            body.append("--\(boundary)\r\n")
            body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n")
            body.append("\(value)\r\n")
            print("   📋 Field: \(key) = \(value)")
        }
        
        // 📷 Add photo files to multipart form as "images"
        for (index, image) in photos.enumerated() {
            if let imageData = image.jpegData(compressionQuality: 0.8) {
                body.append("--\(boundary)\r\n")
                body.append("Content-Disposition: form-data; name=\"images\"; filename=\"photo_\(index).jpg\"\r\n")
                body.append("Content-Type: image/jpeg\r\n\r\n")
                body.append(imageData)
                body.append("\r\n")
                print("   📷 Added image \(index + 1) (\(imageData.count) bytes)")
            }
        }
        
        body.append("--\(boundary)--\r\n")
        request.httpBody = body
        
        print("🚀 Sending project to backend...")
        print("   URL: \(apiURL)")
        print("   Authorization: Bearer \(token.prefix(20))...")
        print("📏 Total body size: \(body.count) bytes")
        
        // Print ONLY the timeRequired section for debugging
        if let bodyString = String(data: body, encoding: .utf8) {
            // Find the timeRequired section
            if let range = bodyString.range(of: "name=\"timeRequired\"") {
                let start = bodyString.index(range.lowerBound, offsetBy: -50, limitedBy: bodyString.startIndex) ?? bodyString.startIndex
                let end = bodyString.index(range.upperBound, offsetBy: 100, limitedBy: bodyString.endIndex) ?? bodyString.endIndex
                let snippet = bodyString[start..<end]
                print("🔍 timeRequired in body:")
                print(snippet)
            } else {
                print("❌ WARNING: timeRequired NOT FOUND in request body!")
            }
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        
        print("📥 Backend Response:")
        print("   Status: \(status)")
        
        if let responseString = String(data: data, encoding: .utf8) {
            print("   Response: \(responseString)")
        }
        
        guard status == 200 || status == 201 else {
            throw NSError(domain: "", code: status, userInfo: [NSLocalizedDescriptionKey: "Server error: \(status)"])
        }
        
        // Parse response to get project ID
        // New API returns project directly (not wrapped in "project" key)
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let projectId = json["id"] as? Int {
            print("✅ Parsed project ID: \(projectId)")
            return projectId
        }
        
        throw NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "Could not parse project ID"])
    }
}

// MARK: - MultiImagePicker
struct MultiImagePicker: UIViewControllerRepresentable {
    @Binding var images: [UIImage]
    var selectionLimit: Int
    @Environment(\.dismiss) private var dismiss
    
    func makeUIViewController(context: Context) -> PHPickerViewController {
        var config = PHPickerConfiguration()
        config.filter = .images
        config.selectionLimit = selectionLimit - images.count // Allow up to remaining slots
        
        let picker = PHPickerViewController(configuration: config)
        picker.delegate = context.coordinator
        return picker
    }
    
    func updateUIViewController(_ uiViewController: PHPickerViewController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, PHPickerViewControllerDelegate {
        let parent: MultiImagePicker
        
        init(_ parent: MultiImagePicker) {
            self.parent = parent
        }
        
        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            parent.dismiss()
            
            for result in results {
                if result.itemProvider.canLoadObject(ofClass: UIImage.self) {
                    result.itemProvider.loadObject(ofClass: UIImage.self) { image, error in
                        if let image = image as? UIImage {
                            DispatchQueue.main.async {
                                if self.parent.images.count < self.parent.selectionLimit {
                                    self.parent.images.append(image)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    ManualProjectForm()
}