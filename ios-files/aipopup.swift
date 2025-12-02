 import SwiftUI

 // 🎯 PROJECT FLOW ENUM: Defines the different states in the project creation flow
 // This enum tracks whether user is choosing, using AI, or filling manually
 enum ProjectFlow: Identifiable, CaseIterable {
     case choose    // 🤔 Initial state - user is choosing between AI or manual
     case ai        // 🤖 User chose AI-powered generation
     case manual    // ✋ User chose manual form filling
    
     var id: String { rawValue }  // 🔑 Required for Identifiable protocol
    
     var rawValue: String {
         switch self {
         case .choose: return "choose"
         case .ai: return "ai"
         case .manual: return "manual"
         }
     }
 }

 // 🎯 NEW PROJECT VIEW: The main choice screen where users pick AI or manual input
 // This is the second screen in the flow after TestNewRequestView
struct NewProjectView: View {
    let technician: Technician?  // 👤 Optional technician for direct deal assignment
    @Environment(\.dismiss) private var dismiss  // 📱 Allows dismissing back to main screen
    @State private var flow: ProjectFlow = .choose  // 📱 Current flow state (starts at .choose)
    @State private var showAIPopup = false  // 📱 Controls AI form presentation
    @State private var animatedText = ""  // 📝 Animated typing text
    @State private var currentTextIndex = 0  // 📍 Current character index
    @State private var isTyping = true  // ⌨️ Typing animation state
    @StateObject private var localizer = Localizer.shared  // 🌍 Language management
    @ObservedObject private var themeManager = ThemeManager.shared  // 🎨 Theme management (shared instance)
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
         "أحتاج مساعدة في تصميم وبناء كوخ حديقة في الفناء الخلفي"
     ]
    
    var body: some View {
         NavigationView {
             ScrollView {
                 VStack(spacing: 30) {
                 // 🔙 BACK BUTTON: Returns to main screen
                 HStack {
                     Button(action: {
                         dismiss()  // 📱 Dismiss back to main screen
                     }) {
                         Image(systemName: "arrow.left")
                             .font(.title2)
                             .foregroundColor(.blue)
                             .padding(12)
                             .background(
                                 Circle()
                                     .fill(Color.blue.opacity(0.1))
                             )
                     }
                     
                     Spacer()
                 }
                 .padding(.top, 20)
                 .padding(.horizontal, 20)
                
                 // 🏗️ HEADER: Project creation title and description
                 // Uses localized strings that change based on current language
                 VStack(spacing: 16) {
                     Image(systemName: "hammer.fill")
                         .font(.system(size: 60))
                         .foregroundColor(.blue)
                    
                     Text("create_new_project".localized)  // 🌍 "Create New Project" / "إنشاء مشروع جديد"
                         .font(.largeTitle.bold())
                         .multilineTextAlignment(.center)
                    
                     Text("describe_your_project_need".localized)  // 🌍 "Describe your project needs" / "صف احتياجات مشروعك"
                         .font(.subheadline)
                         .foregroundColor(.secondary)
                         .multilineTextAlignment(.center)
                 }
                 .padding(.top, 40)
                
                 Spacer()
                
                 // 🎯 MAIN CHOICE BUTTONS: Four options for project interaction
                 VStack(spacing: 20) {
                     // 🤖 AI OPTION: Triggers AI-powered project generation
                     // When tapped, shows AIProjectForm as a sheet
                     Button(action: { 
                         showAIPopup = true  // 📱 Triggers sheet presentation
                     }) {
                         VStack(spacing: 12) {
                             Image(systemName: "sparkles")  // ✨ AI magic icon
                                 .font(.system(size: 40))
                                 .foregroundColor(.white)
                            
                             Text("use_ai_assistant".localized)  // 🌍 "Use AI Assistant" / "استخدم المساعد الذكي"
                                 .font(.title2.bold())
                                 .foregroundColor(.white)
                            
                         // ⌨️ ANIMATED TYPING TEXT: Shows example prompts with typing effect
                         Text(animatedText.isEmpty ? "ai_description".localized : animatedText)
                             .font(.subheadline)
                             .foregroundColor(.white.opacity(0.9))
                             .multilineTextAlignment(.center)
                             .animation(.easeInOut(duration: 0.1), value: animatedText)
                         }
                         .frame(maxWidth: .infinity)
                         .padding(.vertical, 30)
                         .background(
                             LinearGradient(  // 🎨 Gradient background for AI option
                                 gradient: Gradient(colors: [.blue, .blue.opacity(0.7)]),
                                 startPoint: .leading,
                                 endPoint: .trailing
                             )
                         )
                         .cornerRadius(20)
                     }
                    
                     // ✋ MANUAL OPTION: Triggers manual form filling
                     // When tapped, sets flow = .manual, which shows ManualProjectForm
                     Button(action: { 
                         // 👈 Small delay to ensure layout is ready
                         DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                             flow = .manual  // 📱 Changes flow state to manual
                         }
                     }) {
                         VStack(spacing: 12) {
                             Image(systemName: "pencil.and.outline")  // ✏️ Manual input icon
                                 .font(.system(size: 40))
                                 .foregroundColor(.blue)
                            
                             Text("fill_manually".localized)  // 🌍 "Fill Manually" / "املأ يدوياً"
                                 .font(.title2.bold())
                                 .foregroundColor(.blue)
                            
                             Text("manual_description".localized)  // 🌍 Manual description text
                                 .font(.subheadline)
                                 .foregroundColor(.secondary)
                                 .multilineTextAlignment(.center)
                         }
                         .frame(maxWidth: .infinity)
                         .padding(.vertical, 30)
                         .background(
                             RoundedRectangle(cornerRadius: 20)  // 🎨 Border style for manual option
                                 .stroke(Color.blue, lineWidth: 2)
                         )
                     }
                 }
                 .padding(.horizontal, 20)
                
                 Spacer()
                 }
                 .padding(.bottom, 20)  // 📱 Add bottom padding for better scrolling
             }
             .navigationTitle("")
             .navigationBarHidden(true)
         }
        // 📱 AI FORM PRESENTATION: Shows ConversationalAIForm as a sheet
        // This is where user chats with AI to create project with intelligent follow-up questions
        .sheet(isPresented: $showAIPopup) {
            ConversationalAIForm(technician: technician)  // 🎯 NEXT: Goes to conversational AI chat screen
        }
         // 📱 MANUAL FORM PRESENTATION: Shows ManualProjectForm as full screen cover
         // This is where user fills all project details manually
         .fullScreenCover(isPresented: Binding<Bool>(
             get: { flow == .manual },  // 📱 Shows when flow is .manual
             set: { if !$0 { flow = .choose } }  // 📱 Returns to .choose when dismissed
         )) {
             ManualProjectForm(technician: technician)  // 🎯 NEXT: Goes to manual form input screen
         }
        .onAppear {
            startTypingAnimation()  // ⌨️ Start typing animation when view appears
            Task {
                await serviceAPI.fetchServices()  // 🏷️ Fetch dynamic categories from API
            }
        }
        .preferredColorScheme(themeManager.colorScheme)  // 🌙 Apply light/dark mode
        .environmentObject(themeManager)  // 🎨 Pass theme manager to child views
        .navigationViewStyle(.stack)  // 📱 Force single column layout on iPad (no split view)
        .rtlNavigation()  // 🌍 Apply RTL/LTR support based on language
    }
    
     // ⌨️ TYPING ANIMATION: Creates typing effect for example prompts
     private func startTypingAnimation() {
         let currentLanguage = Localizer.shared.currentLanguage
         let prompts = currentLanguage == .arabic ? 
             examplePrompts.filter { $0.rangeOfCharacter(from: CharacterSet(charactersIn: "أبتثجحخدذرزسشصضطظعغفقكلمنهوي")) != nil } :
             examplePrompts.filter { $0.rangeOfCharacter(from: CharacterSet(charactersIn: "أبتثجحخدذرزسشصضطظعغفقكلمنهوي")) == nil }
        
         guard !prompts.isEmpty else { return }
        
         let targetText = prompts[currentTextIndex % prompts.count]
        
         if isTyping {
             // Typing forward
             if animatedText.count < targetText.count {
                 animatedText = String(targetText.prefix(animatedText.count + 1))
                 DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                     startTypingAnimation()
                 }
             } else {
                 // Finished typing, wait then start erasing
                 DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                     isTyping = false
                     startTypingAnimation()
                 }
             }
         } else {
             // Erasing backward
             if !animatedText.isEmpty {
                 animatedText = String(animatedText.dropLast())
                 DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                     startTypingAnimation()
                 }
             } else {
                 // Finished erasing, move to next text
                 currentTextIndex += 1
                 isTyping = true
                 DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                     startTypingAnimation()
                 }
             }
         }
     }
 }

 #Preview {
     NewProjectView()
 }
