import SwiftUI

// 🤖 AI PROJECT FORM: The AI-powered project description input screen
// This is the third screen in the flow - user enters project description for AI processing
struct AIProjectForm: View {
    let technician: Technician?  // 👤 Optional technician for direct deal assignment
    @Environment(\.dismiss) private var dismiss  // 📱 Allows dismissing the sheet
    @State private var description: String = ""  // 📝 User's project description input
    @State private var result: ProjectRequest?  // 📦 AI-generated project data
    @State private var isLoading = false  // ⏳ Loading state during AI processing
    @State private var errorMessage: String?  // ❌ Error message if AI fails
    @State private var showError = false  // 📱 Controls error alert presentation
    @State private var animatedPlaceholder = ""  // ⌨️ Animated placeholder text
    @State private var currentPlaceholderIndex = 0  // 📍 Current placeholder index
    @State private var isTypingPlaceholder = true  // ⌨️ Typing animation state
    @State private var selectedPhotos: [UIImage] = []  // 📸 Selected photos for the project
    @StateObject private var serviceAPI = ProjectServiceAPI.shared  // 🏷️ Service API for dynamic categories
    
    init(technician: Technician? = nil) {
        self.technician = technician
    }
    
    // 📝 EXAMPLE PROMPTS: Sample descriptions for AI to show users how to write
    private let examplePrompts = [
        "I need to renovate my kitchen with modern cabinets and new appliances",
        "أريد تجديد مطبخي بخزائن حديثة وأجهزة جديدة",
        "Looking for someone to fix my bathroom plumbing and install new tiles",
        "أبحث عن شخص لإصلاح سباكة الحمام وتركيب بلاط جديد",
        "Need help designing and building a garden shed in my backyard",
        "أحتاج مساعدة في تصميم وبناء كوخ حديقة في الفناء الخلفي",
        "Want to install new electrical outlets and lighting fixtures",
        "أريد تركيب مآخذ كهربائية جديدة وتركيبات إضاءة"
    ]
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // 🤖 AI HEADER: Title and instructions for AI generation
                    // Uses localized strings that change based on current language
        VStack(spacing: 16) {
                        Image(systemName: "sparkles")  // ✨ AI magic icon
                            .font(.system(size: 50))
                            .foregroundColor(.blue)
                        
                        Text("ai_project_generator".localized)  // 🌍 "AI Project Generator" / "مولد المشاريع الذكي"
                            .font(.title.bold())
                            .multilineTextAlignment(.center)
                        
                        Text("describe_your_project_ai".localized)  // 🌍 AI instructions text
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 20)
                    
                    // 📝 DESCRIPTION INPUT: Text editor for project description
                    // User types their project needs here for AI processing
                    VStack(alignment: .leading, spacing: 12) {
                        Text("project_description".localized)  // 🌍 "Project Description" / "وصف المشروع"
                .font(.headline)
                            .foregroundColor(.primary)
                        
                        ZStack(alignment: .topLeading) {
                            TextEditor(text: $description)  // 📝 Multi-line text input
                                .frame(minHeight: 150)
                                .padding(12)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                )
                            
                            // ⌨️ ANIMATED PLACEHOLDER: Shows typing animation when text is empty
                            if description.isEmpty {
                                VStack {
                                    HStack {
                                        Text(animatedPlaceholder.isEmpty ? "enter_project_description_placeholder".localized : animatedPlaceholder)
                                            .foregroundColor(.gray)
                                            .padding(.leading, 16)
                                            .padding(.top, 20)
                                            .animation(.easeInOut(duration: 0.1), value: animatedPlaceholder)
                                        Spacer()
                                    }
                                    Spacer()
                                }
                            }
                        }
                        
                        Text("ai_estimation_note".localized)  // 🌍 Note about AI estimation
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    // 🤖 GENERATE BUTTON: Triggers AI processing of the description
                    // Calls generateWithAI() function which uses ChatGPTService
                    Button(action: {
                        Task { await generateWithAI() }  // 🚀 Async call to AI service
                    }) {
                        HStack {
                            if isLoading {
                                ProgressView()  // ⏳ Loading spinner
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: "sparkles")  // ✨ AI icon
                            }
                            
                            Text(isLoading ? "generating_with_ai".localized : "generate_with_ai".localized)  // 🌍 Button text
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            LinearGradient(  // 🎨 Gradient background
                                gradient: Gradient(colors: [.blue, .blue.opacity(0.7)]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoading)  // 🚫 Disabled if empty or loading
                    .opacity(description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.6 : 1.0)  // 👻 Faded if empty
                    
                    // ⏳ LOADING STATE: Shows progress indicator during AI processing
                    if isLoading {
                        VStack(spacing: 12) {
                            ProgressView()  // 🔄 Loading spinner
                                .scaleEffect(1.2)
                            
                            Text("ai_thinking".localized)  // 🌍 "AI is thinking..." / "الذكاء الاصطناعي يفكر..."
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 20)
                    }
                    
                    // 📦 RESULTS: Shows ProjectSummaryView when AI generation is complete
                    // This displays the AI-generated project details for review and editing
                    if let result = result {
                        ProjectSummaryView(
                            request: result, 
                            technician: technician,
                            selectedPhotos: $selectedPhotos  // 📸 Pass photos binding
                        ) { updatedRequest in  // 🎯 NEXT: Goes to project summary screen
                            // Submit action with updated request (includes photos and address)
                            submitProject(updatedRequest)  // 🚀 Calls submit function when user confirms
                        }
                    }
                    
                    Spacer(minLength: 50)
                }
                .padding(.horizontal, 20)
            }
            .navigationTitle("ai_assistant".localized)  // 🌍 "AI Assistant" / "المساعد الذكي"
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: {
                        dismiss()  // 📱 Dismisses back to main screen
                    }) {
                        Image(systemName: "arrow.left")
                            .font(.title2)
                            .foregroundColor(.blue)
                    }
                }
            }
            .onAppear {
                startTypingAnimation()  // ⌨️ Start animated placeholder
                Task {
                    await serviceAPI.fetchServices()  // 🏷️ Fetch dynamic categories from API
                }
            }
        }
        // ❌ ERROR ALERT: Shows error message if AI generation fails
        .alert("error".localized, isPresented: $showError) {
            Button("ok".localized) { }  // 🌍 OK button
        } message: {
            Text(errorMessage ?? "unknown_error".localized)  // 🌍 Error message
        }
        .navigationViewStyle(.stack)  // 📱 Force single column layout on iPad (no split view)
        .rtlNavigation()  // 🌍 Apply RTL/LTR support based on language
    }
    
    // 🤖 GENERATE WITH AI: Main function that calls ChatGPT service
    // This function handles the entire AI generation process
    private func generateWithAI() async {
        // ✅ VALIDATION: Check if description is not empty
        guard !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "please_enter_description".localized  // 🌍 Error message
            showError = true  // 📱 Show error alert
            return
        }
        
        isLoading = true  // ⏳ Start loading state
        errorMessage = nil  // 🧹 Clear previous errors
        result = nil  // 🔄 Clear previous result to force new generation
        
        do {
            // 🚀 AI CALL: Call ChatGPT service to generate project details
            let generatedRequest = try await ChatGPTService.shared.generateProjectRequest(from: description)
            
            // 🎯 SUCCESS: Update UI on main thread
            await MainActor.run {
                self.result = generatedRequest  // 📦 Store generated result
                self.isLoading = false  // ✅ Stop loading
            }
        } catch {
            // ❌ ERROR: Handle AI generation failure
            await MainActor.run {
                self.isLoading = false  // ✅ Stop loading
                self.errorMessage = error.localizedDescription  // 📝 Store error message
                self.showError = true  // 📱 Show error alert
            }
        }
    }
    
    // 🚀 SUBMIT PROJECT: Handles project submission to Firestore
    // TODO: Implement with backend API
    // This function submits the project to Firebase Firestore
    private func submitProject(_ request: ProjectRequest) {
        Task {
//            do {
//                // 🔥 SUBMIT TO FIRESTORE: Save project to 'projects' collection
//                let projectType: ProjectType = technician != nil ? .direct : .all
//                let targetTechnicianId = technician?.id
//                let projectId = try await FirestoreService.shared.submitProject(request, userId: SessionManager.shared.userId?.description ?? "unknown", type: projectType, targetTechnicianId: targetTechnicianId)  // 👤 Using real user ID from SessionManager
//                print("✅ Project submitted successfully with ID: \(projectId)")
//
//                // 📱 DISMISS ON SUCCESS: Close the form after successful submission
//                await MainActor.run {
//                    dismiss()
//                }
//            } catch {
//                // ❌ ERROR HANDLING: Show error if submission fails
//                print("❌ Failed to submit project: \(error)")
//                await MainActor.run {
//                    errorMessage = "failed_to_submit_project".localized
//                    showError = true
//                }
//            }
            
            await MainActor.run {
                errorMessage = "Project submission will be implemented with backend API"
                showError = true
            }
        }
    }
    
    // ⌨️ TYPING ANIMATION: Creates typing effect for example prompts
    private func startTypingAnimation() {
        let currentLanguage = Localizer.shared.currentLanguage
        let prompts = currentLanguage == .arabic ?
            examplePrompts.filter { $0.rangeOfCharacter(from: CharacterSet(charactersIn: "أبتثجحخدذرزسشصضطظعغفقكلمنهوي")) != nil } :
            examplePrompts.filter { $0.rangeOfCharacter(from: CharacterSet(charactersIn: "أبتثجحخدذرزسشصضطظعغفقكلمنهوي")) == nil }
        
        guard !prompts.isEmpty else { return }
        
        let targetText = prompts[currentPlaceholderIndex % prompts.count]
        
        if isTypingPlaceholder {
            // Typing forward
            if animatedPlaceholder.count < targetText.count {
                animatedPlaceholder = String(targetText.prefix(animatedPlaceholder.count + 1))
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    startTypingAnimation()
                }
            } else {
                // Finished typing, wait then start erasing
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                    isTypingPlaceholder = false
                    startTypingAnimation()
                }
            }
        } else {
            // Erasing backward
            if !animatedPlaceholder.isEmpty {
                animatedPlaceholder = String(animatedPlaceholder.dropLast())
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                    startTypingAnimation()
                }
            } else {
                // Finished erasing, move to next text
                currentPlaceholderIndex += 1
                isTypingPlaceholder = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    startTypingAnimation()
                }
            }
        }
    }
}

#Preview {
    AIProjectForm()
}
