

import SwiftUI

struct ProfileView: View {
   @ObservedObject var session = SessionManager.shared
   @ObservedObject var localizer = Localizer.shared
   @ObservedObject var themeManager = ThemeManager.shared   // ✅ Theme Manager
   @State private var isLoggingOut = false
   @State private var restartApp = false
   @State private var userDetails: UserDetails? = nil

   var body: some View {
       ScrollView(showsIndicators: false) {
               VStack(spacing: 20) {
                   
                   // MARK: - Header
                   VStack(spacing: 16) {
                       // Profile Image with Blue Border
                       ZStack {
                           // Outer blue border
                           Circle()
                               .stroke(
                                   LinearGradient(
                                       gradient: Gradient(colors: [Color.blue, Color.blue.opacity(0.6)]),
                                       startPoint: .topLeading,
                                       endPoint: .bottomTrailing
                                   ),
                                   lineWidth: 4
                               )
                               .frame(width: 120, height: 120)
                           
                           // Inner circle background
                           Circle()
                               .fill(Color(.systemGray6))
                               .frame(width: 110, height: 110)
                           
                           if let avatar = userDetails?.avatar,
                              let url = URL(string: avatar) {
                               AsyncImage(url: url) { phase in
                                   switch phase {
                                   case .empty:
                                       ProgressView()
                                           .frame(width: 60, height: 60)
                                           .tint(.blue)
                                   case .success(let image):
                                       image
                                           .resizable()
                                           .scaledToFill()
                                           .frame(width: 100, height: 100)
                                           .clipShape(Circle())
                                           .overlay(
                                               Circle()
                                                   .stroke(Color.white, lineWidth: 3)
                                           )
                                   case .failure(_):
                                       Image(systemName: "person.fill")
                                           .resizable()
                                           .scaledToFit()
                                           .frame(width: 60, height: 60)
                                           .foregroundColor(.blue)
                                   @unknown default:
                                       EmptyView()
                                   }
                               }
                           } else {
                               Image(systemName: "person.fill")
                                   .resizable()
                                   .scaledToFit()
                                   .frame(width: 60, height: 60)
                                   .foregroundColor(.blue)
                           }
                       }
                       .padding(.top, 30)
                       
                       // User Info Card
                       VStack(spacing: 8) {
                           Text(userDetails?.name ?? session.name ?? "Username".localized)
                               .font(.title2)
                               .fontWeight(.bold)
                               .foregroundColor(.primary)
                           
                           if let phone = userDetails?.phone ?? session.phone {
                               HStack(spacing: 6) {
                                   Image(systemName: "phone.fill")
                                       .foregroundColor(.blue)
                                       .font(.caption)
                                   Text(phone)
                                       .font(.subheadline)
                                       .foregroundColor(.secondary)
                               }
                           }
                           
                           Text(session.role?.uppercased() == "TECHNICIAN" ? "Service Provider".localized : "User".localized)
                               .font(.subheadline)
                               .foregroundColor(.blue)
                               .fontWeight(.medium)
                           
                       }
                       .padding(.horizontal, 20)
                       .padding(.vertical, 12)
                       .background(
                           RoundedRectangle(cornerRadius: 12)
                               .fill(Color(.systemGray6))
                               .overlay(
                                   RoundedRectangle(cornerRadius: 12)
                                       .stroke(
                                           LinearGradient(
                                               gradient: Gradient(colors: [Color.blue.opacity(0.3), Color.blue.opacity(0.1)]),
                                               startPoint: .topLeading,
                                               endPoint: .bottomTrailing
                                           ),
                                           lineWidth: 1
                                       )
                               )
                       )
                   }
                   
                   Divider().padding(.horizontal)
                   
                   // MARK: - Role specific menu
                   if session.role?.uppercased() == "TECHNICIAN" {
                       VStack(spacing: 16) {
                           // Profile Management (Services & Availability only)
                           NavigationLink(destination: TechnicianProfileManagementView()) {
                               ProfileMenuCard(title: "manage_profile".localized, icon: "person.text.rectangle.fill")
                           }
                           
                           NavigationLink {
                                       MyProfileView()
                                   } label: {
                                       ProfileMenuCard(title: "My Data".localized, icon: "person.fill")
                                   }
                           
                           // Portfolio Management (technician only)
                           NavigationLink(destination: PortfolioManagementView()) {
                               ProfileMenuCard(title: "my_portfolio".localized, icon: "briefcase.fill")
                           }
                           
                           // Subscription Management (standalone)
                           NavigationLink(destination: SubscriptionManagementView()) {
                               ProfileMenuCard(title: "subscription".localized, icon: "star.circle.fill")
                           }
                           
                           // Home Features Toggle (for both users and technicians)
                           NavigationLink(destination: HomeFeatureTogglesView()) {
                               ProfileMenuCard(title: "home_features".localized, icon: "slider.horizontal.3")
                           }
                       }
                       .padding(.horizontal)
                   } else {
                       VStack(spacing: 16) {
                           NavigationLink {
                                       MyProfileView()
                                   } label: {
                                       ProfileMenuCard(title: "My Data".localized, icon: "person.fill")
                                   }
                           
                           // Home Features Toggle (for users)
                           NavigationLink(destination: HomeFeatureTogglesView()) {
                               ProfileMenuCard(title: "home_features".localized, icon: "slider.horizontal.3")
                           }
                       }
                       .padding(.horizontal)
                   }
                   
                   // MARK: - Change Language
                   Button(action: {
                       if localizer.currentLanguage == .arabic {
                           localizer.setLanguage(.english)
                       } else {
                           localizer.setLanguage(.arabic)
                       }
                   }) {
                       HStack(spacing: 12) {
                           ZStack {
                               Circle()
                                   .fill(Color.blue.opacity(0.1))
                                   .frame(width: 40, height: 40)
                               
                               Image(systemName: "globe")
                                   .foregroundColor(.blue)
                                   .font(.system(size: 16, weight: .medium))
                           }
                           
                           Text("Change Language".localized)
                               .font(.system(size: 16, weight: .medium))
                               .foregroundColor(.primary)
                           
                           Spacer()
                           
                           Text(localizer.currentLanguage == .arabic ? "AR" : "EN")
                               .font(.system(size: 14, weight: .semibold))
                               .foregroundColor(.blue)
                               .padding(.horizontal, 8)
                               .padding(.vertical, 4)
                               .background(
                                   RoundedRectangle(cornerRadius: 6)
                                       .fill(Color.blue.opacity(0.1))
                               )
                       }
                       .padding(.horizontal, 16)
                       .padding(.vertical, 14)
                       .background(
                           RoundedRectangle(cornerRadius: 12)
                               .fill(Color(.systemGray6))
                               .overlay(
                                   RoundedRectangle(cornerRadius: 12)
                                       .stroke(
                                           LinearGradient(
                                               gradient: Gradient(colors: [Color.blue.opacity(0.2), Color.blue.opacity(0.05)]),
                                               startPoint: .topLeading,
                                               endPoint: .bottomTrailing
                                           ),
                                           lineWidth: 1
                                       )
                               )
                       )
                       .padding(.horizontal)
                   }
                   
                   // MARK: - Dark / Light Mode
                   HStack(spacing: 12) {
                       ZStack {
                           Circle()
                               .fill(Color.blue.opacity(0.1))
                               .frame(width: 40, height: 40)
                           
                           Image(systemName: themeManager.selectedTheme == .dark ? "moon.fill" : "sun.max.fill")
                               .foregroundColor(.blue)
                               .font(.system(size: 16, weight: .medium))
                       }
                       
                       Text("Dark Mode".localized)
                           .font(.system(size: 16, weight: .medium))
                           .foregroundColor(.primary)
                       
                       Spacer()
                       
                       Toggle("", isOn: Binding<Bool>(
                           get: { themeManager.selectedTheme == .dark },
                           set: { isDark in
                               themeManager.selectedTheme = isDark ? .dark : .light
                           }
                       ))
                       .toggleStyle(SwitchToggleStyle(tint: .blue))
                   }
                   .padding(.horizontal, 16)
                   .padding(.vertical, 14)
                   .background(
                       RoundedRectangle(cornerRadius: 12)
                           .fill(Color(.systemGray6))
                           .overlay(
                               RoundedRectangle(cornerRadius: 12)
                                   .stroke(
                                       LinearGradient(
                                           gradient: Gradient(colors: [Color.blue.opacity(0.2), Color.blue.opacity(0.05)]),
                                           startPoint: .topLeading,
                                           endPoint: .bottomTrailing
                                       ),
                                       lineWidth: 1
                                   )
                           )
                   )
                   .padding(.horizontal)

                   
                   // MARK: - Logout
                   Button(action: {
                       // ✅ Clear session and restart app from splash screen
                       SessionManager.shared.logout()
                       
                       // ✅ CRITICAL: Clear any pending onboarding navigation flags
                       // This prevents the splash screen from showing onboarding after logout
                       SetupDataManager.shared.clearTempData()
                       
                       restartApp = true
                   }) {
                       HStack {
                           Image(systemName: "rectangle.portrait.and.arrow.right")
                               .foregroundColor(.red)      // ✅ red icon
                           Text("Logout".localized)
                               .foregroundColor(.red)      // ✅ red text
                               .font(.headline)
                           Spacer()
                       }
                       .padding()
                       .background(
                           Color(UIColor { traitCollection in
                               traitCollection.userInterfaceStyle == .dark ? .black : .white
                           })
                       ) // ✅ white in light mode, black in dark mode
                       .overlay(
                           RoundedRectangle(cornerRadius: 12)
                               .stroke(Color.red, lineWidth: 2)   // ✅ red border
                       )
                       .cornerRadius(12)
                       .padding(.horizontal)
                   }
                   .padding(.top, 10)
                   
Spacer()
               }
               .padding(.bottom, 40)
               
             
           }
          .navigationDestination(isPresented: $isLoggingOut) {
              LoginView_Icon()
                  .navigationBarBackButtonHidden(true)
          }
          .fullScreenCover(isPresented: $restartApp) {
              SplashScreenView()
                  .environmentObject(session)
                  .id(UUID())  // ✅ Force new instance every time
          }
          .navigationTitle("Profile".localized)
          .onAppear {
              fetchUserDetails()
          }
          .rtlNavigation()
  }
   
   // MARK: - API Integration
   private func fetchUserDetails() {
       guard let token = session.token else {
           print("❌ No token available")
           return
       }
       
       // ✅ New token-based endpoint (no userId needed)
       let apiURL = "https://glynda-unvexatious-felisa.ngrok-free.dev/api/users/profile"
       
       print("🔐 DEBUG: Fetching user profile (ProfileView)")
       print("   Token: \(token.prefix(20))...")
       print("   URL: \(apiURL)")
       
       guard let url = URL(string: apiURL) else { return }
       
       var request = URLRequest(url: url)
       request.httpMethod = "GET"
       request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
       
       print("🔑 DEBUG: Request Headers:")
       print("   Authorization: Bearer \(token.prefix(20))...")
       
       URLSession.shared.dataTask(with: request) { data, response, error in
           if let data = data {
               let status = (response as? HTTPURLResponse)?.statusCode ?? 0
               
               print("📥 Profile API Response (ProfileView):")
               print("   Status: \(status)")
               
               if let responseString = String(data: data, encoding: .utf8) {
                   print("   Response: \(responseString)")
               }
               
               do {
                   // ✅ Decode user data directly (no "data" wrapper)
                   var decoded = try JSONDecoder().decode(UserDetails.self, from: data)
                   
                   // ✅ Construct full URL for profile image (check both profileImage and avatar)
                   let profileImagePath = decoded.profileImage ?? decoded.avatar
                   if let avatarPath = profileImagePath, !avatarPath.isEmpty {
                       if !avatarPath.starts(with: "http") {
                           decoded.avatar = "https://glynda-unvexatious-felisa.ngrok-free.dev\(avatarPath)"
                           print("🖼️ Constructed full image URL: \(decoded.avatar ?? "")")
                       } else {
                           decoded.avatar = avatarPath
                       }
                   }
                   
                   // ✅ Construct full URLs for certificates if they're relative paths
                   if let certs = decoded.certificates, !certs.isEmpty {
                       let fullCerts = certs.map { cert -> Certificate in
                           let path = cert.name
                           if !path.isEmpty && !path.starts(with: "http") {
                               var updatedCert = cert
                               updatedCert.name = "https://glynda-unvexatious-felisa.ngrok-free.dev\(path)"
                               return updatedCert
                           }
                           return cert
                       }
                       decoded.certificates = fullCerts
                   }
                   
                   // ✅ Update session hasPortfolio if present
                   if let hasPortfolio = decoded.hasPortfolio {
                       SessionManager.shared.updateHasPortfolio(hasPortfolio)
                   }
                   
                   DispatchQueue.main.async {
                       self.userDetails = decoded
                       print("✅ Profile loaded: \(decoded.name)")
                       if let regions = decoded.regions {
                           print("📍 Regions: \(regions.count)")
                       }
                       if let years = decoded.years {
                           print("📅 Years of experience: \(years)")
                       }
                   }
               } catch {
                   print("❌ Failed to decode user details: \(error)")
               }
           } else if let error = error {
               print("❌ Error fetching user details: \(error)")
           }
       }.resume()
   }
}

// MARK: - Reusable Menu Card
struct ProfileMenuCard: View {
   let title: String
   let icon: String
   
   var body: some View {
       HStack(spacing: 12) {
           // Icon with blue background
           ZStack {
               Circle()
                   .fill(Color.blue.opacity(0.1))
                   .frame(width: 40, height: 40)
               
               Image(systemName: icon)
                   .foregroundColor(.blue)
                   .font(.system(size: 16, weight: .medium))
           }
           
           Text(title)
               .font(.system(size: 16, weight: .medium))
               .foregroundColor(.primary)
           
           Spacer()
           
           Image(systemName: "chevron.right")
               .foregroundColor(.blue.opacity(0.6))
               .font(.system(size: 14, weight: .medium))
       }
       .padding(.horizontal, 16)
       .padding(.vertical, 14)
       .background(
           RoundedRectangle(cornerRadius: 12)
               .fill(Color(.systemGray6))
               .overlay(
                   RoundedRectangle(cornerRadius: 12)
                       .stroke(
                           LinearGradient(
                               gradient: Gradient(colors: [Color.blue.opacity(0.2), Color.blue.opacity(0.05)]),
                               startPoint: .topLeading,
                               endPoint: .bottomTrailing
                           ),
                           lineWidth: 1
                       )
               )
       )
   }
}
