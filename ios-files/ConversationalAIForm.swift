import SwiftUI
import PhotosUI

// 💬 CONVERSATIONAL AI FORM: Chat-based project generation with intelligent follow-up questions
struct ConversationalAIForm: View {
    let technician: Technician?
    @Environment(\.dismiss) private var dismiss
    
    // Chat state
    @State private var messages: [ConversationalChatMessage] = []
    @State private var userInput: String = ""
    @State private var isAIThinking = false
    @State private var conversationState: ConversationalFlowState = .initial
    @State private var projectContext: ConversationalProjectContext = ConversationalProjectContext()
    
    // Final result
    @State private var finalProject: ProjectRequest?
    @State private var showError = false
    @State private var errorMessage: String?
    
    // Photos
    @State private var selectedPhotos: [UIImage] = []
    @State private var showImagePicker = false
    
    // Submission progress
    @State private var isSubmitting = false
    @State private var submissionProgress: Double = 0.0
    @State private var submissionMessage = ""
    @State private var showSuccessAlert = false
    
    @StateObject private var serviceAPI = ProjectServiceAPI.shared
    
    init(technician: Technician? = nil) {
        self.technician = technician
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 40) {
                    // Show final project summary when ready
                    if let project = finalProject {
                        VStack(spacing: 20) {
                            // Success Header
                            VStack(spacing: 12) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 70))
                                    .foregroundColor(.green)
                                
                                Text("project_generated_successfully".localized)
                                    .font(.title.bold())
                                    .multilineTextAlignment(.center)
                            }
                            .padding(.top, 20)
                            
                            // Project Summary
                            ProjectSummaryView(
                                request: project, 
                                technician: technician,
                                selectedPhotos: $selectedPhotos
                            ) { updatedRequest in
                                submitProject(updatedRequest)
                            }
                        }
                    } else {
                        // PROJECT CREATION WIZARD
                        VStack(spacing: 30) {
                            // Header Icon & Title
                            VStack(spacing: 16) {
                                Image(systemName: "sparkles")
                                    .font(.system(size: 70))
                                    .foregroundColor(.blue)
                                    .padding(.top, 40)
                                
                                Text("ai_project_generator".localized)
                                    .font(.largeTitle.bold())
                                    .multilineTextAlignment(.center)
                                
                                // AI Question/Guidance
                                if let lastAIMessage = messages.last(where: { $0.sender == .ai }) {
                                    VStack(spacing: 16) {
                                        Text(lastAIMessage.content)
                                            .font(.title3)
                                            .multilineTextAlignment(.center)
                                            .foregroundColor(.primary)
                                            .padding(.horizontal, 20)
                                        
                                        // Examples Section
                                        if !lastAIMessage.examples.isEmpty {
                                            VStack(alignment: .leading, spacing: 12) {
                                                Text("examples".localized + ":")
                                                    .font(.subheadline)
                                                    .fontWeight(.semibold)
                                                    .foregroundColor(.secondary)
                                                
                                                ForEach(lastAIMessage.examples, id: \.self) { example in
                                                    HStack(spacing: 12) {
                                                        Image(systemName: "lightbulb.fill")
                                                            .foregroundColor(.orange)
                                                        Text(example)
                                                            .font(.body)
                                                            .foregroundColor(.secondary)
                                                    }
                                                    .frame(maxWidth: .infinity, alignment: .leading)
                                                    .padding(12)
                                                    .background(
                                                        RoundedRectangle(cornerRadius: 12)
                                                            .fill(Color.orange.opacity(0.1))
                                                    )
                                                }
                                            }
                                            .padding(.horizontal, 20)
                                        }
                                    }
                                    .padding(.top, 10)
                                } else {
                                    Text("describe_your_project_ai".localized)
                                        .font(.title3)
                                        .foregroundColor(.secondary)
                                        .multilineTextAlignment(.center)
                                        .padding(.horizontal, 20)
                                }
                            }
                            
                            // CENTERED TEXT INPUT AREA
                            VStack(spacing: 20) {
                                // Large Text Editor
                                ZStack(alignment: .topLeading) {
                                    if userInput.isEmpty {
                                        Text("enter_project_description_placeholder".localized)
                                            .foregroundColor(.gray)
                                            .padding(.top, 16)
                                            .padding(.leading, 16)
                                    }
                                    
                                    TextEditor(text: $userInput)
                                        .frame(minHeight: 150)
                                        .font(.body)
                                        .padding(12)
                                        .background(
                                            RoundedRectangle(cornerRadius: 16)
                                                .stroke(Color.blue.opacity(0.3), lineWidth: 2)
                                                .background(
                                                    RoundedRectangle(cornerRadius: 16)
                                                        .fill(Color(.systemBackground))
                                                )
                                        )
                                        .disabled(isAIThinking)
                                }
                                .padding(.horizontal, 20)
                                
                                // AI Thinking Indicator
                                if isAIThinking {
                                    HStack(spacing: 12) {
                                        ProgressView()
                                            .scaleEffect(1.2)
                                        Text("ai_thinking".localized)
                                            .font(.headline)
                                            .foregroundColor(.blue)
                                    }
                                    .padding(.vertical, 10)
                                } else {
                                    // Generate/Continue Button
                                    Button(action: {
                                        sendMessage()
                                    }) {
                                        HStack(spacing: 12) {
                                            Image(systemName: conversationState == .initial ? "sparkles" : "arrow.right.circle.fill")
                                                .font(.title3)
                                            Text(conversationState == .initial ? "generate_with_ai".localized : "continue".localized)
                                                .fontWeight(.semibold)
                                                .font(.headline)
                                        }
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 18)
                                        .background(
                                            LinearGradient(
                                                gradient: Gradient(colors: [.blue, .blue.opacity(0.8)]),
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            )
                                        )
                                        .foregroundColor(.white)
                                        .cornerRadius(16)
                                    }
                                    .disabled(userInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                                    .opacity(userInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.5 : 1.0)
                                    .padding(.horizontal, 20)
                                }
                            }
                            .padding(.top, 20)
                        }
                    }
                }
                .padding(.bottom, 40)
            }
            .navigationTitle("ai_assistant".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: {
                        dismiss()
                    }) {
                        Image(systemName: "arrow.left")
                            .font(.title2)
                            .foregroundColor(.blue)
                    }
                }
            }
            .onAppear {
                // 🎯 Debug: Check if technician is received
                if let tech = technician {
                    print("🎯 ConversationalAIForm loaded WITH technician:")
                    print("   ID: \(tech.id)")
                    print("   Name: \(tech.name)")
                    print("   This will be a DIRECT ASSIGNMENT")
                } else {
                    print("📢 ConversationalAIForm loaded WITHOUT technician (regular project)")
                }
                
                Task {
                    await serviceAPI.fetchServices()
                }
            }
        }
        .alert("error".localized, isPresented: $showError) {
            Button("ok".localized) { }
        } message: {
            Text(errorMessage ?? "unknown_error".localized)
        }
        .alert("success".localized, isPresented: $showSuccessAlert) {
            Button("ok".localized) {
                dismiss()
            }
        } message: {
            Text("project_submitted_successfully".localized)
        }
        .sheet(isPresented: $showImagePicker) {
            MultiImagePicker(images: $selectedPhotos, selectionLimit: 5)
        }
        .overlay {
            if isSubmitting {
                SubmissionLoadingView(
                    progress: submissionProgress,
                    message: submissionMessage
                )
            }
        }
    }
    
    // 📤 SEND MESSAGE: Process user input and get AI response
    private func sendMessage() {
        guard !userInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        
        let userMessage = ConversationalChatMessage(content: userInput, sender: .user)
        messages.append(userMessage)
        
        // Store user input in context
        projectContext.addUserInput(userInput)
        
        let inputText = userInput
        userInput = ""
        
        Task {
            await processConversation(userInput: inputText)
        }
    }
    
    // 🤖 PROCESS CONVERSATION: Main AI conversation logic
    private func processConversation(userInput: String) async {
        isAIThinking = true
        
        do {
            switch conversationState {
            case .initial:
                // First message - check if detailed enough
                let analysis = try await analyzeDescription(userInput)
                
                if analysis.isDetailed {
                    // Generate project immediately
                    conversationState = .generating
                    let project = try await generateProject()
                    await MainActor.run {
                        finalProject = project
                        isAIThinking = false
                    }
                } else {
                    // Ask for more details
                    conversationState = .askingDetails
                    await MainActor.run {
                        let aiMessage = ConversationalChatMessage(
                            content: analysis.followUpQuestion,
                            sender: .ai,
                            examples: analysis.examples
                        )
                        messages.append(aiMessage)
                        isAIThinking = false
                    }
                }
                
            case .askingDetails:
                // User provided more details - now generate
                conversationState = .generating
                let project = try await generateProject()
                await MainActor.run {
                    finalProject = project
                    isAIThinking = false
                }
            
            case .generating:
                // Already generated
                await MainActor.run {
                    isAIThinking = false
                }
            }
        } catch {
            await MainActor.run {
                isAIThinking = false
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }
    
    // 🔍 ANALYZE DESCRIPTION: Check if user input is detailed enough
    private func analyzeDescription(_ description: String) async throws -> ConversationalDescriptionAnalysis {
        let currentLanguage = Localizer.shared.currentLanguage
        let isArabic = currentLanguage == .arabic
        
        let prompt = """
        You are an expert construction project analyzer. Analyze if this project description has ENOUGH information to create a realistic project with phases and budget.
        
        \(isArabic ? "يجب أن ترد بالعربية فقط" : "You must respond in English only")
        
        Project Description: "\(description)"
        
        Return ONLY valid JSON with this structure (no markdown, no extra text):
        {
            "isDetailed": false,
            "followUpQuestion": "\(isArabic ? "سؤال المتابعة بالعربية" : "Follow-up question in English")",
            "examples": ["\(isArabic ? "مثال 1" : "Example 1")", "\(isArabic ? "مثال 2" : "Example 2")"]
        }
        
        DETAILED ENOUGH (isDetailed = true, followUpQuestion = "") if description includes:
        ✓ Clear scope of work (what needs to be done)
        ✓ Location type mentioned (kitchen, bathroom, bedroom, etc.)
        ✓ At least 2-3 specific details (materials, colors, sizes, preferences)
        ✓ OR any numbers/measurements mentioned
        ✓ OR timeline/urgency mentioned
        ✓ OR budget range mentioned
        
        Examples of DETAILED descriptions:
        - "Renovate kitchen with white cabinets and granite countertops"
        - "Paint 3 bedrooms, need eco-friendly paint"
        - "Install new bathroom fixtures, modern style, budget 5000 SAR"
        - "Fix leaking pipes in kitchen and bathroom"
        - "Build garden shed 3x4 meters with wooden materials"
        
        NOT DETAILED (isDetailed = false) - ONLY if extremely vague:
        - Single word: "renovation", "fix", "build"
        - No scope: "I need help with my house"
        - No location: "some work needed"
        - No specifics at all
        
        If NOT detailed, ask ONE specific question about the MOST important missing information:
        - If no location → ask where
        - If no scope → ask what needs to be done
        - If no specifics → ask for 2-3 key details
        
        Provide 3-4 relevant examples that match the project type mentioned.
        Keep questions brief and helpful.
        
        \(isArabic ? "مثال: 'رائع! أين سيتم العمل بالضبط وما هي التفاصيل الرئيسية؟'" : "Example: 'Great! Where exactly will the work be done and what are the key details?'")
        """
        
        let response = try await ChatGPTService.shared.askConversationalQuestion(prompt: prompt)
        
        // Parse JSON response
        let cleanResponse = response
            .replacingOccurrences(of: "```json", with: "")
            .replacingOccurrences(of: "```", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        
        guard let data = cleanResponse.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw AIServiceError.parsingFailed
        }
        
        let isDetailed = json["isDetailed"] as? Bool ?? false
        let followUpQuestion = json["followUpQuestion"] as? String ?? ""
        let examples = json["examples"] as? [String] ?? []
        
        return ConversationalDescriptionAnalysis(
            isDetailed: isDetailed,
            followUpQuestion: followUpQuestion,
            examples: examples
        )
    }
    
    // 🏗️ GENERATE PROJECT: Create final project with all details
    private func generateProject() async throws -> ProjectRequest {
        let fullDescription = projectContext.getCombinedDescription()
        return try await ChatGPTService.shared.generateProjectRequest(from: fullDescription)
    }
    
    // 🚀 SUBMIT PROJECT: Submit to Firestore
    private func submitProject(_ request: ProjectRequest) {
        guard let token = SessionManager.shared.token else {
            print("❌ No auth token found")
            return
        }
        
        guard let userId = SessionManager.shared.userId else {
            print("❌ No user ID found")
            return
        }
        
        print("📸 ============ AI PROJECT SUBMISSION ============")
        print("📋 AI-Generated Project Details:")
        print("   Description: \(request.description)")
        print("   Duration: \(request.durationWeeks) weeks → \(request.durationWeeks * 7) days")
        print("   Category: \(request.category)")
        print("   Budget: \(request.budget) SAR")
        print("   Address: \(request.address)")
        print("   Latitude: \(request.latitude ?? 0)")
        print("   Longitude: \(request.longitude ?? 0)")
        print("   Phases: \(request.phases.count)")
        for (index, phase) in request.phases.enumerated() {
            print("   Phase \(index + 1): \(phase.title)")
            print("      Amount: \(phase.amount) SAR (\(phase.percentage)%)")
            print("      Duration: \(phase.durationWeeks) weeks → \(phase.durationWeeks * 7) days")
        }
        
        Task {
            await MainActor.run {
                isSubmitting = true
                submissionProgress = 0.0
                submissionMessage = "preparing_project".localized
            }
            
            do {
                // Simulate smooth progress animation
                await updateProgress(0.1, message: "preparing_project".localized)
                
                let projectId = try await submitToBackendWithPhases(
                    request: request,
                    token: token,
                    userId: userId
                )
                
                await updateProgress(1.0, message: "project_submitted".localized)
                
                // Small delay to show 100% completion
                try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
                
                await MainActor.run {
                    print("✅ AI Project submitted successfully with ID: \(projectId)")
                    print("📸 ============ AI PROJECT SUBMISSION END ============")
                    isSubmitting = false
                    showSuccessAlert = true
                }
            } catch {
                print("❌ Failed to submit AI project: \(error.localizedDescription)")
                print("📸 ============ AI PROJECT SUBMISSION END (ERROR) ============")
                
                await MainActor.run {
                    isSubmitting = false
                    errorMessage = "failed_to_submit_project".localized
                    showError = true
                }
            }
        }
    }
    
    // 🌐 BACKEND API: Submit AI project with phases (two-step process)
    private func submitToBackendWithPhases(
        request: ProjectRequest,
        token: String,
        userId: Int
    ) async throws -> Int {
        
        // STEP 1: Create project (without phases)
        await updateProgress(0.2, message: "creating_project".localized)
        print("📝 STEP 1: Creating project...")
        // Calculate timeRequiredDays and log it
        let calculatedDays = request.durationWeeks * 7
        print("🔢 Duration Calculation:")
        print("   durationWeeks: \(request.durationWeeks)")
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
        
        let projectId = try await createProject(
            description: request.description,
            category: request.category,
            budget: request.budget,
            address: request.address,
            latitude: request.latitude ?? 0,
            longitude: request.longitude ?? 0,
            timeRequiredDays: calculatedDays,
            projectType: technician != nil ? "DIRECT_ASSIGNMENT" : "ALL",  // 🎯 Set projectType based on technician
            photos: selectedPhotos,
            token: token,
            assignedTechnicianId: technician?.id,  // 🎯 Pass technician ID if hiring directly
            assignmentType: technician != nil ? "DIRECT_ASSIGNMENT" : nil  // 🎯 Mark as direct if technician provided
        )
        
        await updateProgress(0.5, message: "uploading_photos".localized)
        print("✅ Project created with ID: \(projectId)")
        
        // STEP 2: Create phases for the project
        if !request.phases.isEmpty {
            await updateProgress(0.6, message: "creating_phases".localized)
            print("📝 STEP 2: Creating \(request.phases.count) phases...")
            
            for (index, phase) in request.phases.enumerated() {
                // Update progress for each phase (0.6 to 0.9)
                let phaseProgress = 0.6 + (0.3 * Double(index + 1) / Double(request.phases.count))
                await updateProgress(phaseProgress, message: "creating_phase".localized + " \(index + 1)/\(request.phases.count)")
                
                do {
                    let phaseId = try await createPhase(
                        projectId: projectId,
                        phaseNumber: index + 1,
                        description: phase.description,
                        timeSpentDays: phase.durationWeeks * 7,
                        moneySpent: phase.amount,
                        token: token
                    )
                    print("✅ Phase \(index + 1) created with ID: \(phaseId)")
                } catch {
                    print("❌ Failed to create phase \(index + 1): \(error)")
                    // Continue with other phases even if one fails
                }
            }
            
            await updateProgress(0.95, message: "finalizing".localized)
            print("✅ All phases created successfully")
        }
        
        return projectId
    }
    
    // 🏗️ CREATE PROJECT: Submit project to backend (without phases)
    private func createProject(
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
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let boundary = "Boundary-\(UUID().uuidString)"
        urlRequest.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        print("📤 Creating project (multipart):")
        print("   serviceId: \(serviceId)")
        print("   budget: \(budget)")
        print("   timeRequiredDays: \(timeRequiredDays)")
        print("   projectType: \(projectType)")
        
        // Add text fields (matching API spec)
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
        urlRequest.httpBody = body
        
        print("🚀 Sending project creation request...")
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
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        
        print("📥 Project Creation Response:")
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
    
    // 📋 CREATE PHASE: Submit phase to backend
    private func createPhase(
        projectId: Int,
        phaseNumber: Int,
        description: String,
        timeSpentDays: Int,
        moneySpent: Double,
        token: String
    ) async throws -> Int {
        
        let apiURL = "https://glynda-unvexatious-felisa.ngrok-free.dev/api/phases"
        guard let url = URL(string: apiURL) else {
            throw NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let requestBody: [String: Any] = [
            "projectId": projectId,
            "phaseNumber": phaseNumber,
            "description": description,
            "timeSpentDays": timeSpentDays,
            "moneySpent": moneySpent
        ]
        
        urlRequest.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        
        print("📤 Creating phase \(phaseNumber):")
        print("   projectId: \(projectId)")
        print("   description: \(description)")
        print("   timeSpentDays: \(timeSpentDays)")
        print("   moneySpent: \(moneySpent)")
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        
        print("📥 Phase Creation Response:")
        print("   Status: \(status)")
        
        if let responseString = String(data: data, encoding: .utf8) {
            print("   Response: \(responseString)")
        }
        
        guard status == 200 || status == 201 else {
            throw NSError(domain: "", code: status, userInfo: [NSLocalizedDescriptionKey: "Server error: \(status)"])
        }
        
        // Parse response to get phase ID
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let phaseId = json["id"] as? Int {
            return phaseId
        }
        
        return 0
    }
    
    // 📊 UPDATE PROGRESS: Helper function to smoothly update progress
    private func updateProgress(_ progress: Double, message: String) async {
        await MainActor.run {
            withAnimation(.easeInOut(duration: 0.3)) {
                self.submissionProgress = progress
                self.submissionMessage = message
            }
        }
    }
}

// MARK: - Supporting Views

struct ConversationalWelcomeMessageView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "sparkles.rectangle.stack.fill")
                .font(.system(size: 60))
                .foregroundColor(.blue)
            
            Text("ai_project_assistant".localized)
                .font(.title.bold())
                .multilineTextAlignment(.center)
            
            Text("describe_project_i_will_help".localized)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)
        }
        .padding(.vertical, 40)
    }
}

struct ConversationalChatBubble: View {
    let message: ConversationalChatMessage
    
    var body: some View {
        HStack {
            if message.sender == .user {
                Spacer(minLength: 50)
            }
            
            VStack(alignment: message.sender == .user ? .trailing : .leading, spacing: 8) {
                Text(message.content)
                    .font(.body)
                    .foregroundColor(message.sender == .user ? .white : .primary)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(message.sender == .user ?
                                  LinearGradient(
                                    gradient: Gradient(colors: [.blue, .blue.opacity(0.8)]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                  ) :
                                  LinearGradient(
                                    gradient: Gradient(colors: [Color.gray.opacity(0.1), Color.gray.opacity(0.15)]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                  )
                            )
                    )
                
                // Show examples if AI message has them
                if message.sender == .ai, !message.examples.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("examples".localized + ":")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)
                        
                        ForEach(message.examples, id: \.self) { example in
                            HStack(spacing: 8) {
                                Image(systemName: "lightbulb.fill")
                                    .font(.caption)
                                    .foregroundColor(.orange)
                                Text(example)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.orange.opacity(0.1))
                            )
                        }
                    }
                    .padding(.horizontal, 12)
                }
            }
            
            if message.sender == .ai {
                Spacer(minLength: 50)
            }
        }
    }
}

struct ConversationalAIThinkingView: View {
    @State private var dotCount = 0
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .foregroundColor(.blue)
                    Text("ai_thinking".localized + String(repeating: ".", count: dotCount))
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.gray.opacity(0.1))
                )
            }
            Spacer(minLength: 50)
        }
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { timer in
                dotCount = (dotCount + 1) % 4
            }
        }
    }
}

struct ConversationalChatInputView: View {
    @Binding var userInput: String
    let isAIThinking: Bool
    let onSend: () -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            Divider()
            
            HStack(spacing: 12) {
                TextField("type_your_message".localized, text: $userInput, axis: .vertical)
                    .lineLimit(1...5)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.gray.opacity(0.1))
                    )
                    .disabled(isAIThinking)
                
                Button(action: onSend) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(userInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? .gray : .blue)
                }
                .disabled(userInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isAIThinking)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color(.systemBackground))
        }
    }
}

// MARK: - Data Models

struct ConversationalChatMessage: Identifiable {
    let id = UUID()
    let content: String
    let sender: ConversationalMessageSender
    let examples: [String]
    
    init(content: String, sender: ConversationalMessageSender, examples: [String] = []) {
        self.content = content
        self.sender = sender
        self.examples = examples
    }
}

enum ConversationalMessageSender {
    case user
    case ai
}

enum ConversationalFlowState {
    case initial
    case askingDetails
    case generating
}

struct ConversationalDescriptionAnalysis {
    let isDetailed: Bool
    let followUpQuestion: String
    let examples: [String]
}

class ConversationalProjectContext {
    private var userInputs: [String] = []
    
    func addUserInput(_ input: String) {
        userInputs.append(input)
    }
    
    func getCombinedDescription() -> String {
        return userInputs.joined(separator: "\n\n")
    }
}

// MARK: - ChatGPT Service Extension

extension ChatGPTService {
    func askConversationalQuestion(prompt: String) async throws -> String {
        let currentLanguage = Localizer.shared.currentLanguage
        let isArabic = currentLanguage == .arabic
        
        let url = URL(string: "https://api.openai.com/v1/chat/completions")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer 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", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "model": "gpt-4o-mini",
            "messages": [
                ["role": "system", "content": isArabic ?
                    "أنت مساعد ذكاء اصطناعي متخصص في مشاريع البناء. يجب أن ترجع JSON صحيح فقط." :
                    "You are an AI assistant specialized in construction projects. You must return valid JSON only."],
                ["role": "user", "content": prompt]
            ],
            "temperature": 0.3,
            "max_tokens": 300
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AIServiceError.invalidResponse
        }
        
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let choices = json?["choices"] as? [[String: Any]],
              let firstChoice = choices.first,
              let message = firstChoice["message"] as? [String: Any],
              let content = message["content"] as? String else {
            throw AIServiceError.invalidResponse
        }
        
        return content
    }
}

// MARK: - Submission Loading View
struct SubmissionLoadingView: View {
    let progress: Double
    let message: String
    
    var body: some View {
        ZStack {
            // Dark overlay
            Color.black.opacity(0.7)
                .ignoresSafeArea()
            
            // Loading card
            VStack(spacing: 30) {
                // Progress circle
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.3), lineWidth: 8)
                        .frame(width: 120, height: 120)
                    
                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(
                            LinearGradient(
                                colors: [.blue, .cyan],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            style: StrokeStyle(lineWidth: 8, lineCap: .round)
                        )
                        .frame(width: 120, height: 120)
                        .rotationEffect(.degrees(-90))
                        .animation(.easeInOut(duration: 0.3), value: progress)
                    
                    Text("\(Int(progress * 100))%")
                        .font(.title.bold())
                        .foregroundColor(.white)
                }
                
                // Message
                VStack(spacing: 8) {
                    Text("uploading_project".localized)
                        .font(.headline)
                        .foregroundColor(.white)
                    
                    Text(message)
                        .font(.subheadline)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
                
                // Animated dots
                HStack(spacing: 8) {
                    ForEach(0..<3) { index in
                        Circle()
                            .fill(Color.blue)
                            .frame(width: 8, height: 8)
                            .scaleEffect(animatingDot(index: index) ? 1.2 : 0.8)
                            .animation(
                                Animation.easeInOut(duration: 0.6)
                                    .repeatForever()
                                    .delay(Double(index) * 0.2),
                                value: progress
                            )
                    }
                }
            }
            .padding(40)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color(.systemBackground))
                    .shadow(radius: 20)
            )
            .padding(40)
        }
    }
    
    private func animatingDot(index: Int) -> Bool {
        let delay = Double(index) * 0.2
        let time = Date().timeIntervalSince1970
        return sin(time * 3 + delay) > 0
    }
}

#Preview {
    ConversationalAIForm()
}

