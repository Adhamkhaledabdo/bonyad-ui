import SwiftUI

// 📋 PROJECTS LIST VIEW: Displays all available projects with filtering
// This view shows all user's projects from backend API with category filtering and search
struct ProjectsListView: View {
    @Environment(\.dismiss) private var dismiss  // 📱 Allows dismissing the sheet
    @State private var projects: [ProjectRequest] = []  // 📦 All projects from Firestore
    @State private var filteredProjects: [ProjectRequest] = []  // 🔍 Filtered projects for display
    @State private var selectedCategory: String = "All"  // 🏷️ Currently selected category filter
    @State private var isLoading = false  // ⏳ Loading state during data fetch
    @State private var errorMessage: String?  // ❌ Error message if fetch fails
    @State private var showError = false  // 📱 Controls error alert presentation
    @State private var searchText = ""  // 🔍 Search text for filtering
    @StateObject private var serviceAPI = ProjectServiceAPI.shared  // 🏷️ Service API for dynamic categories
    
    // 🎯 FILTER PARAMETERS: Controls what type of projects to show
    let showDirectDealsOnly: Bool  // 🎯 If true, shows only direct deals for current technician
    
    // 🎯 INITIALIZER: Creates ProjectsListView with optional filter
    init(showDirectDealsOnly: Bool = false) {
        self.showDirectDealsOnly = showDirectDealsOnly
    }
    
    // 🏷️ CATEGORIES: All available categories plus "All" option
    private var categories: [String] {
        ["All"] + ProjectRequest.getAvailableCategories()
    }
    
    // 🌍 LOCALIZED CATEGORIES: Translated category names for UI display
    private var localizedCategories: [String] {
        ["All".localized] + ProjectRequest.getLocalizedCategories()
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // 🔍 SEARCH AND FILTER BAR: Search text and category filter
                VStack(spacing: 16) {
                    // Search Bar
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                        
                        TextField("search_projects".localized, text: $searchText)
                            .textFieldStyle(PlainTextFieldStyle())
                            .onChange(of: searchText) { _ in
                                filterProjects()  // 🔍 Filter projects when search text changes
                            }
                        
                        if !searchText.isEmpty {
                            Button(action: {
                                searchText = ""  // 🧹 Clear search text
                            }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(Color(.systemGray6))
                    )
                    
                    // Category Filter ScrollView
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(Array(categories.enumerated()), id: \.offset) { index, category in
                                Button(action: {
                                    selectedCategory = category  // 🏷️ Select category
                                    filterProjects()  // 🔍 Filter projects
                                }) {
                                    Text(localizedCategories[index])
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 8)
                                        .background(
                                            RoundedRectangle(cornerRadius: 20)
                                                .fill(selectedCategory == category ? Color.blue : Color(.systemGray5))
                                        )
                                        .foregroundColor(selectedCategory == category ? .white : .primary)
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                }
                .padding(.vertical, 16)
                .background(Color(.systemBackground))
                
                // 📋 PROJECTS LIST: Displays filtered projects in a grid
                if isLoading {
                    // ⏳ LOADING STATE: Shows progress indicator
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.2)
                        
                        Text("loading_projects".localized)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if filteredProjects.isEmpty {
                    // 📭 EMPTY STATE: Shows when no projects are found
                    VStack(spacing: 20) {
                        Image(systemName: "folder.badge.plus")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        
                        Text(showDirectDealsOnly ? "no_direct_deals".localized : "no_projects_found".localized)
                            .font(.title2)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                        
                        Text(showDirectDealsOnly ? "no_direct_deals_description".localized : "no_projects_description".localized)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    // 📋 PROJECTS GRID: Displays projects in a responsive grid
                    ScrollView {
                        LazyVGrid(columns: [
                            GridItem(.flexible(), spacing: 16),
                            GridItem(.flexible(), spacing: 16)
                        ], spacing: 16) {
                            ForEach(filteredProjects) { project in
                                AvailableProjectCard(project: project)  // 🎴 Individual project card
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 20)
                    }
                }
            }
            .navigationTitle(showDirectDealsOnly ? "direct_offers".localized : "available_projects".localized)  // 🌍 Dynamic title based on filter
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                loadProjects()  // 📥 Load projects when view appears
                Task {
                    await serviceAPI.fetchServices()  // 🏷️ Fetch dynamic categories from API
                }
            }
        }
        // ❌ ERROR ALERT: Shows error message if loading fails
        .alert("error".localized, isPresented: $showError) {
            Button("ok".localized) { }  // 🌍 OK button
        } message: {
            Text(errorMessage ?? "unknown_error".localized)  // 🌍 Error message
        }
        .navigationViewStyle(.stack)  // 📱 Force single column layout on iPad (no split view)
        .rtlNavigation()  // 🌍 Apply RTL/LTR support based on language
    }
    
    // 📥 LOAD PROJECTS: Fetches projects from backend API (role-based)
    private func loadProjects() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let backendProjects: [BackendProject]
                
                // 🔄 ROLE-BASED FETCHING
                if SessionManager.shared.role?.uppercased() == "TECHNICIAN" {
                    if showDirectDealsOnly {
                        // 🎯 DIRECT DEALS: Fetch projects directly assigned to this technician
                        print("🎯 Loading DIRECT deals for technician")
                        guard let token = SessionManager.shared.token else {
                            throw NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "No auth token"])
                        }
                        // ✅ Use dedicated endpoint for direct assignments
                        backendProjects = try await fetchDirectAssignedProjects(token: token)
                    } else {
                        // 🔧 ALL PROJECTS: Fetch ALL available projects for technicians to bid on
                        print("🔧 Loading ALL available projects for technician")
                        backendProjects = try await fetchAllProjects()
                    }
                } else {
                    // 👤 USER: Fetch only projects created by this user
                    print("👤 Loading my projects from backend API")
                    guard let token = SessionManager.shared.token else {
                        throw NSError(domain: "", code: -1, userInfo: [NSLocalizedDescriptionKey: "No auth token found"])
                    }
                    backendProjects = try await fetchMyProjects(token: token)
                }
                
                // Convert backend projects to ProjectRequest format
                let fetchedProjects = backendProjects.map { backendProject in
                    // Use localized service name based on current language
                    let serviceName = Localizer.shared.currentLanguage == .arabic 
                        ? backendProject.serviceNameAr 
                        : backendProject.serviceNameEn
                    
                    return ProjectRequest(
                        id: "\(backendProject.id)",
                        userId: "\(backendProject.userId)",
                        title: serviceName,
                        description: backendProject.description,
                        category: backendProject.serviceNameEn,  // Use English for category matching
                        budget: backendProject.budget,
                        durationWeeks: (backendProject.timeRequiredDays ?? 0) / 7,
                        needsHouseVisit: false,
                        needsBooking: false,
                        address: backendProject.address,
                        latitude: backendProject.latitude,
                        longitude: backendProject.longitude,
                        photos: [],
                        createdAt: Date(),
                        status: backendProject.status,
                        phases: backendProject.phases.map { phase in
                            // Calculate percentage based on phase amount and total budget
                            let percentage = backendProject.budget > 0 
                                ? (phase.moneySpent / backendProject.budget) * 100 
                                : 0.0
                            
                            return ProjectPhase(
                                title: "Phase \(phase.phaseNumber)",
                                description: phase.description,
                                percentage: percentage,
                                amount: phase.moneySpent,
                                durationWeeks: phase.timeSpentDays / 7
                            )
                        }
                    )
                }
                
                // 🎯 UPDATE UI: Update projects on main thread
                await MainActor.run {
                    self.projects = fetchedProjects
                    self.filteredProjects = fetchedProjects
                    self.isLoading = false
                }
                
                print("✅ Loaded \(fetchedProjects.count) projects from backend")
                
            } catch {
                // ❌ ERROR HANDLING: Handle fetch failure
                print("❌ Failed to load projects: \(error)")
                await MainActor.run {
                    self.isLoading = false
                    self.errorMessage = "failed_to_load_projects".localized + ": \(error.localizedDescription)"
                    self.showError = true
                }
            }
        }
    }
    
    // 🌐 Fetch my projects from backend
    private func fetchMyProjects(token: String) async throws -> [BackendProject] {
        let apiURL = "https://bonyad-hub.com/api/projects/my"
        
        var request = URLRequest(url: URL(string: apiURL)!)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        print("🔍 Fetching my projects...")
        print("   URL: \(apiURL)")
        print("   Authorization: Bearer \(token.prefix(20))...")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        
        print("📥 My Projects Response:")
        print("   Status: \(status)")
        
        if let responseString = String(data: data, encoding: .utf8) {
            print("   Response: \(responseString.prefix(500))...")
        }
        
        guard status == 200 else {
            throw NSError(domain: "", code: status, userInfo: [NSLocalizedDescriptionKey: "Server error: \(status)"])
        }
        
        let projects = try JSONDecoder().decode([BackendProject].self, from: data)
        print("✅ Decoded \(projects.count) projects")
        
        return projects
    }
    
    // 🌐 Fetch all projects from backend (for technicians)
    private func fetchAllProjects() async throws -> [BackendProject] {
        let apiURL = "https://bonyad-hub.com/api/projects"
        
        var request = URLRequest(url: URL(string: apiURL)!)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        print("🔍 Fetching all projects...")
        print("   URL: \(apiURL)")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        
        print("📥 All Projects Response:")
        print("   Status: \(status)")
        
        if let responseString = String(data: data, encoding: .utf8) {
            print("   Response: \(responseString.prefix(500))...")
        }
        
        guard status == 200 else {
            throw NSError(domain: "", code: status, userInfo: [NSLocalizedDescriptionKey: "Server error: \(status)"])
        }
        
        let projects = try JSONDecoder().decode([BackendProject].self, from: data)
        print("✅ Decoded \(projects.count) projects")
        
        return projects
    }
    
    // 🎯 FETCH DIRECT ASSIGNED PROJECTS: Get projects directly assigned to technician
    private func fetchDirectAssignedProjects(token: String) async throws -> [BackendProject] {
        let apiURL = "https://bonyad-hub.com/api/projects/my-assigned?type=DIRECT_ASSIGNMENT"
        
        var request = URLRequest(url: URL(string: apiURL)!)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        print("🎯 Fetching direct assigned projects...")
        print("   URL: \(apiURL)")
        print("   Authorization: Bearer \(token.prefix(20))...")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        
        print("📥 Direct Assigned Projects Response:")
        print("   Status: \(status)")
        
        if let responseString = String(data: data, encoding: .utf8) {
            print("   Response: \(responseString.prefix(500))...")
        }
        
        guard status == 200 else {
            throw NSError(domain: "", code: status, userInfo: [NSLocalizedDescriptionKey: "Server error: \(status)"])
        }
        
        let projects = try JSONDecoder().decode([BackendProject].self, from: data)
        print("✅ Decoded \(projects.count) direct assigned projects")
        
        return projects
    }
    
    // 🔍 FILTER PROJECTS: Filters projects based on category and search text
    private func filterProjects() {
        var filtered = projects
        
        // 🏷️ CATEGORY FILTER: Filter by selected category
        if selectedCategory != "All" {
            filtered = filtered.filter { $0.category == selectedCategory }
        }
        
        // 🔍 SEARCH FILTER: Filter by search text
        if !searchText.isEmpty {
            filtered = filtered.filter { project in
                project.description.localizedCaseInsensitiveContains(searchText) ||
                project.category.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        filteredProjects = filtered
    }
}

// 🎴 AVAILABLE PROJECT CARD: Individual project display card with uniform size
struct AvailableProjectCard: View {
    let project: ProjectRequest
    @ObservedObject private var themeManager = ThemeManager.shared  // 🎨 Theme management
    @State private var showProjectDetail = false  // 📱 Controls project detail popup
    
    var body: some View {
        Button(action: {
            showProjectDetail = true  // 📱 Show project detail popup
        }) {
            VStack(alignment: .leading, spacing: 12) {
                // 💰 BUDGET: Shows project budget with Saudi Riyal logo
                HStack {
                    Spacer()
                    HStack(spacing: 4) {
                        Text(project.formattedBudget)
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                        
                        Image(themeManager.selectedTheme == .dark ? "saudi_riyal_logo_dark" : "saudi_riyal_logo")
                            .resizable()
                            .frame(width: 16, height: 16)
                            .foregroundColor(.blue)
                    }
                }
                
                // 📝 DESCRIPTION: Project description (limited to 2 lines)
                Text(project.description)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                
                // 🏷️ CATEGORY: Shows project category at bottom
                HStack {
                    Text(project.category.localized)
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.blue.opacity(0.1))
                        )
                        .foregroundColor(.blue)
                    
                    Spacer()
                    
                    // 👁️ VIEW ICON: Indicates card is tappable
                    Image(systemName: "eye.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(16)
            .frame(height: 120)  // 🔧 FIXED HEIGHT: Ensures all cards have same size
            .frame(maxWidth: .infinity)  // 🔧 FIXED WIDTH: Ensures all cards have same width
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(themeManager.selectedTheme.backgroundColor)
                    .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())  // 🎨 Removes default button styling
        .sheet(isPresented: $showProjectDetail) {
            ProjectDetailPopup(project: project)  // 📱 Shows detailed project information
        }
    }
}

// 📋 PROJECT DETAIL POPUP: Shows complete project information
struct ProjectDetailPopup: View {
    let project: ProjectRequest
    @Environment(\.dismiss) private var dismiss  // 📱 Allows dismissing the popup
    @ObservedObject private var themeManager = ThemeManager.shared  // 🎨 Theme management
    @State private var showBidForm = false  // 📱 Controls bid form presentation
    @State private var bids: [Bid] = []  // 💰 All bids for this project
    @State private var isLoadingBids = false  // ⏳ Loading state for bids
    @State private var bidsError: String?  // ❌ Error message for bids
    @State private var technicianHasAlreadyBid = false  // 🔒 Tracks if technician has already bid
    @State private var currentProjectStatus: String = "PENDING"  // 📊 Current project status (PENDING, ACCEPTED, etc.)
    @State private var acceptedBidId: String?  // 🎯 ID of the accepted bid (if any)
    @State private var visitRequests: [BackendVisitRequest] = []  // 🏠 Visit requests for this project
    @State private var isLoadingVisits = false  // ⏳ Loading state for visit requests
    @State private var visitsError: String?  // ❌ Error message for visit requests
    @State private var showVisitConfirmation = false  // 🔔 Shows confirmation alert for visit request
    @State private var showVisitSuccess = false  // ✅ Shows success alert for visit request
    @State private var showVisitError = false  // ❌ Shows error alert for visit request
    @State private var visitErrorMessage = ""  // 📝 Error message for visit request
    @State private var technicianHasAlreadyAskedForVisit = false  // 🔒 Tracks if technician has already asked for visit
    @State private var showDeleteConfirmation = false
    @State private var showDeleteSuccess = false
    @State private var deleteErrorMessage = ""
    
    // 🏠 VISIT REQUESTS SECTION TITLE: Only for users
    private var visitRequestsSectionTitle: String {
        return "users_asking_for_visits".localized
    }
    
    // 🏷️ CATEGORY BADGE: Shows project category
    private var categoryBadge: some View {
        HStack {
            Text(project.category.localized)
                .font(.headline)
                .fontWeight(.bold)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.blue.opacity(0.1))
                )
                .foregroundColor(.blue)
            
            Spacer()
        }
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    categoryBadge
                    
                    // 💰 BUDGET: Shows project budget with Saudi Riyal logo
                    VStack(alignment: .leading, spacing: 8) {
                        Text("budget".localized)
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        HStack(spacing: 6) {
                            Text(project.formattedBudget)
                                .font(.title)
                                .fontWeight(.bold)
                                .foregroundColor(.blue)
                            
                            Group {
                                if themeManager.selectedTheme == .dark {
                                    Image("saudi_riyal_logo_dark")
                                        .resizable()
                                        .frame(width: 20, height: 20)
                                        .foregroundColor(.blue)
                                } else {
                                    Image("saudi_riyal_logo")
                                        .resizable()
                                        .frame(width: 20, height: 20)
                                        .foregroundColor(.blue)
                                }
                            }
                        }
                    }
                    
                    // 📝 DESCRIPTION: Full project description
                    VStack(alignment: .leading, spacing: 8) {
                        Text("description".localized)
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Text(project.description)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.leading)
                    }
                    
                    // ⏰ DURATION: Project duration
                    VStack(alignment: .leading, spacing: 8) {
                        Text("duration".localized)
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        HStack {
                            Image(systemName: "clock")
                                .font(.title2)
                                .foregroundColor(.blue)
                            
                            Text("\(project.durationWeeks) \(project.durationWeeks == 1 ? "week".localized : "weeks".localized)")
                                .font(.title2)
                                .fontWeight(.medium)
                                .foregroundColor(.primary)
                        }
                    }
                    
                    // 🏠 REQUIREMENTS: House visit and booking requirements
                    VStack(alignment: .leading, spacing: 12) {
                        Text("requirements".localized)
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        VStack(spacing: 8) {
                            if project.needsHouseVisit {
                                HStack {
                                    Image(systemName: "house.fill")
                                        .font(.title2)
                                        .foregroundColor(.orange)
                                    
                                    Text("house_visit".localized)
                                        .font(.body)
                                        .fontWeight(.medium)
                                        .foregroundColor(.primary)
                                    
                                    Spacer()
                                    
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.title2)
                                        .foregroundColor(.green)
                                }
                            }
                            
                            if project.needsBooking {
                                HStack {
                                    Image(systemName: "calendar")
                                        .font(.title2)
                                        .foregroundColor(.blue)
                                    
                                    Text("booking_required".localized)
                                        .font(.body)
                                        .fontWeight(.medium)
                                        .foregroundColor(.primary)
                                    
                                    Spacer()
                                    
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.title2)
                                        .foregroundColor(.green)
                                }
                            }
                        }
                    }
                    
                    // 📍 ADDRESS: Project address (if available) - Clickable to open in Maps
                    if !project.address.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("address".localized)
                                .font(.headline)
                                .foregroundColor(.primary)
                            
                            Button(action: {
                                openInMaps(address: project.address, latitude: project.latitude, longitude: project.longitude)
                            }) {
                                HStack {
                                    Image(systemName: "location.fill")
                                        .font(.title2)
                                        .foregroundColor(.red)
                                    
                                    Text(project.address)
                                        .font(.body)
                                        .foregroundColor(.blue)
                                        .multilineTextAlignment(.leading)
                                    
                                    Spacer()
                                    
                                    Image(systemName: "arrow.up.right.square")
                                        .font(.title3)
                                        .foregroundColor(.blue)
                                }
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    
                    // 📸 PHOTOS: Project photos gallery (if available)
                    if !project.photos.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("project_photos".localized)
                                .font(.headline)
                                .foregroundColor(.primary)
                            
                            PhotoGalleryView(photoURLs: project.photos)
                        }
                    } else {
                        // 📭 NO PHOTOS: Show when no photos available
                        VStack(alignment: .leading, spacing: 12) {
                            Text("project_photos".localized)
                                .font(.headline)
                                .foregroundColor(.primary)
                            
                            Text("No photos available for this project")  // 🔍 Debug info
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    // 📋 WORK PHASES: Project phases breakdown (if available)
                    if !project.phases.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("work_phases".localized)
                                .font(.headline)
                                .foregroundColor(.primary)
                            
                            VStack(spacing: 12) {
                                ForEach(Array(project.phases.enumerated()), id: \.offset) { index, phase in
                                    ProjectPhaseCardView(phase: phase, phaseNumber: index + 1)
                                }
                            }
                        }
                    }
                    
                    // 🔒 BIDDING CLOSED BANNER: Shows when project is accepted
                    if currentProjectStatus.uppercased() == "ACCEPTED" {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "lock.fill")
                                    .font(.title2)
                                    .foregroundColor(.orange)
                                
                                Text("bidding_closed".localized)
                                    .font(.headline)
                                    .fontWeight(.bold)
                                    .foregroundColor(.orange)
                                
                                Spacer()
                                
                                Text("project_accepted".localized)
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundColor(.orange)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.orange.opacity(0.1))
                                    .cornerRadius(6)
                            }
                            
                            Text("bidding_closed_message".localized)
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.leading)
                        }
                        .padding(16)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.orange.opacity(0.1))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.orange.opacity(0.3), lineWidth: 1)
                        )
                    }
                    
                    // 🚫 BIDDING CLOSED FOR TECHNICIANS: Show alert when project is accepted
                    if SessionManager.shared.role?.uppercased() == "TECHNICIAN" && currentProjectStatus.uppercased() == "ACCEPTED" {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "lock.fill")
                                    .font(.title2)
                                    .foregroundColor(.red)
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("bidding_closed".localized)
                                        .font(.headline)
                                        .fontWeight(.bold)
                                        .foregroundColor(.red)
                                    
                                    Text("bidding_closed_tech_message".localized)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                
                                Spacer()
                            }
                        }
                        .padding(16)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.red.opacity(0.1))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.red.opacity(0.3), lineWidth: 1)
                        )
                    }
                    
                    // 💰 BID SECTION: Button to place a bid or show already bid status (only for technicians)
                    if SessionManager.shared.role?.uppercased() == "TECHNICIAN" && currentProjectStatus.uppercased() != "ACCEPTED" {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("place_bid".localized)
                                .font(.headline)
                                .foregroundColor(.primary)
                            
                            if !technicianHasAlreadyBid {
                                // 🔄 BUTTONS ROW: Ask for Visit and Bid Now buttons
                                HStack(spacing: 12) {
                                    // 🏠 ASK FOR VISIT BUTTON
                                    Button(action: {
                                        showVisitConfirmation = true
                                    }) {
                                        HStack(spacing: 8) {
                                            Image(systemName: technicianHasAlreadyAskedForVisit ? "checkmark.circle.fill" : "house.fill")
                                                .font(.title3)
                                                .foregroundColor(.white)
                                            
                                            Text(technicianHasAlreadyAskedForVisit ? "visit_requested".localized : "ask_for_visit".localized)
                                                .font(.subheadline)
                                                .fontWeight(.semibold)
                                                .foregroundColor(.white)
                                        }
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 12)
                                        .background(
                                            RoundedRectangle(cornerRadius: 10)
                                                .fill(technicianHasAlreadyAskedForVisit ? Color.gray : Color.green)
                                        )
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                    .disabled(technicianHasAlreadyAskedForVisit)
                                    
                                    // 💰 BID NOW BUTTON: Button to place a bid
                                    Button(action: {
                                        print("🎯 [UI] Bid Now button tapped - opening bid form")
                                        showBidForm = true
                                    }) {
                                        HStack(spacing: 8) {
                                            Image(systemName: "hand.raised.fill")
                                                .font(.title3)
                                                .foregroundColor(.white)
                                            
                                            Text("bid_now".localized)
                                                .font(.subheadline)
                                                .fontWeight(.semibold)
                                                .foregroundColor(.white)
                                        }
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 12)
                                        .background(
                                            RoundedRectangle(cornerRadius: 10)
                                                .fill(Color.blue)
                                        )
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                        }
                    }
                    
                    // 🏠 VISIT REQUESTS: Shows visit requests from technicians
                    // Only show for users, not for technicians
                    if SessionManager.shared.role?.uppercased() == "USER" && !visitRequests.isEmpty {
                        let _ = print("🔍 [DEBUG] Displaying visit requests section with \(visitRequests.count) items")
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Image(systemName: "house.fill")
                                    .font(.title2)
                                    .foregroundColor(.orange)
                                
                                Text(visitRequestsSectionTitle)
                                    .font(.headline)
                                    .fontWeight(.bold)
                                    .foregroundColor(.primary)
                                
                                Spacer()
                                
                                Text("(\(visitRequests.count))")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(.secondary)
                            }
                            
                            if isLoadingVisits {
                                HStack {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                    Text("loading_visits".localized)
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                .frame(maxWidth: .infinity, alignment: .center)
                                .padding(.vertical, 20)
                            } else if let error = visitsError {
                                VStack(spacing: 8) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .font(.title2)
                                        .foregroundColor(.red)
                                    
                                    Text("error_loading_visits".localized)
                                        .font(.subheadline)
                                        .foregroundColor(.red)
                                        .multilineTextAlignment(.center)
                                }
                                .frame(maxWidth: .infinity, alignment: .center)
                                .padding(.vertical, 20)
                            } else {
                                LazyVStack(spacing: 12) {
                                    ForEach(visitRequests) { visitRequest in
                                        BackendVisitRequestCard(visitRequest: visitRequest)
                                    }
                                }
                            }
                        }
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(themeManager.selectedTheme.cardBackground)
                                .shadow(color: .black.opacity(0.05), radius: 3, x: 0, y: 2)
                        )
                    } else {
                        let _ = print("🔍 [DEBUG] Visit requests section NOT displayed - visitRequests.isEmpty: \(visitRequests.isEmpty), count: \(visitRequests.count)")
                    }
                    
                    // 💰 EXISTING BIDS: Shows all bids for this project
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            Image(systemName: "list.bullet.rectangle")
                                .font(.title2)
                                .foregroundColor(.green)
                            
                            Text("existing_bids".localized)
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                            
                            Spacer()
                            
                            Text("(\(bids.count))")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(
                                    RoundedRectangle(cornerRadius: 6)
                                        .fill(Color.gray.opacity(0.1))
                                )
                        }
                        
                        if isLoadingBids {
                            // ⏳ LOADING STATE: Shows loading indicator
                            HStack {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("loading_bids".localized)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.vertical, 20)
                        } else if let error = bidsError {
                            // ❌ ERROR STATE: Shows error message
                            VStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.title2)
                                    .foregroundColor(.red)
                                
                                Text(error)
                                    .font(.subheadline)
                                    .foregroundColor(.red)
                                    .multilineTextAlignment(.center)
                            }
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.vertical, 20)
                        } else if bids.isEmpty {
                            // 📭 NO BIDS: Shows when no bids are available
                            VStack(spacing: 8) {
                                Image(systemName: "hand.raised.slash")
                                    .font(.title2)
                                    .foregroundColor(.gray)
                                
                                Text("no_bids_yet".localized)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.vertical, 20)
                        } else {
                            // 📋 BIDS LIST: Shows all bids in designed cards
                            LazyVStack(spacing: 12) {
                                ForEach(bids) { bid in
                                    BidCard(
                                        bid: bid, 
                                        projectStatus: currentProjectStatus,
                                        acceptedBidId: acceptedBidId,
                                        onStatusChange: {
                                            fetchProjectStatus()
                                            loadBids()
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
                
                // 🗑️ DELETE PROJECT BUTTON: Only show for project owner (user role)
                if SessionManager.shared.role?.uppercased() == "USER" && SessionManager.shared.userId == Int(project.userId) {
                    VStack(spacing: 12) {
                        Divider()
                            .padding(.vertical, 8)
                        
                        Button(action: {
                            showDeleteConfirmation = true
                        }) {
                            HStack {
                                Image(systemName: "trash.fill")
                                    .font(.title3)
                                Text("delete_project".localized)
                                    .font(.headline)
                                    .fontWeight(.semibold)
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.red)
                            .cornerRadius(12)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
            }
            .padding(20)
            .navigationTitle("project_details".localized)  // 🌍 "Project Details" / "تفاصيل المشروع"
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("close".localized) {  // 🌍 "Close" / "إغلاق"
                        dismiss()
                    }
                    .foregroundColor(.blue)
                }
            }
        }
            .alert("confirm_delete_project".localized, isPresented: $showDeleteConfirmation) {
                Button("cancel".localized, role: .cancel) { }
                Button("delete_project".localized, role: .destructive) {
                    Task {
                        await deleteProject()
                    }
                }
            } message: {
                Text("confirm_delete_project".localized)
            }
            .alert("project_deleted_successfully".localized, isPresented: $showDeleteSuccess) {
                Button("ok".localized) {
                    dismiss()
                }
            } message: {
                Text("project_deleted_successfully".localized)
            }
            .alert("error".localized, isPresented: Binding<Bool>(
                get: { !deleteErrorMessage.isEmpty },
                set: { if !$0 { deleteErrorMessage = "" } }
            )) {
                Button("ok".localized) { }
            } message: {
                Text(deleteErrorMessage)
            }
            .sheet(isPresented: $showBidForm) {
                BidForm(project: project)
            }
            .alert("confirm_visit_request".localized, isPresented: $showVisitConfirmation) {
                Button("cancel".localized, role: .cancel) { }
                Button("confirm".localized) {
                    Task {
                        await requestVisit(project: project)
                    }
                }
            } message: {
                Text("visit_request_confirmation_message".localized)
            }
            .alert("visit_request_sent".localized, isPresented: $showVisitSuccess) {
                Button("ok".localized) { }
            } message: {
                Text("visit_request_success_message".localized)
            }
            .alert("visit_request_failed".localized, isPresented: $showVisitError) {
                Button("ok".localized) { }
            } message: {
                Text(visitErrorMessage)
            }
            .onAppear {
                print("🔍 [UI] ProjectDetailPopup onAppear - loading project data")
                
                // Set initial status from project
                currentProjectStatus = project.status.uppercased()
                print("📊 [PROJECT STATUS] Initial status: \(currentProjectStatus)")
                
                loadBids()  // This will also check if technician has bid (after loading)
                fetchProjectStatus()  // Will update with accepted bid info after bids are loaded
                loadVisitRequests()
                // For technicians, we still need to know if they've already asked for a visit
                if SessionManager.shared.role?.uppercased() == "TECHNICIAN" {
                    Task { await loadVisitFlagForTechnician() }
                }
            }
    }
    
    // 🗺️ OPEN IN MAPS: Opens the address in Apple Maps
    private func openInMaps(address: String, latitude: Double?, longitude: Double?) {
        var mapURL: URL?
        
        if let lat = latitude, let lon = longitude {
            // Use coordinates if available
            mapURL = URL(string: "http://maps.apple.com/?q=\(lat),\(lon)")
        } else {
            // Use address if coordinates not available
            let encodedAddress = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            mapURL = URL(string: "http://maps.apple.com/?q=\(encodedAddress)")
        }
        
        if let url = mapURL {
            UIApplication.shared.open(url)
        }
    }
    
    // 💰 LOAD BIDS: Fetches all bids for this project from backend API
    private func loadBids() {
        guard !project.id.isEmpty else {
            bidsError = "project_id_not_found".localized
            return
        }
        
        isLoadingBids = true
        bidsError = nil
        
        Task {
            do {
                let backendBids = try await fetchProjectBids(projectId: project.id)
                
                // Convert backend bids to Bid model
                let fetchedBids = backendBids.map { backendBid in
                    Bid(
                        id: "\(backendBid.id)",
                        projectId: project.id,
                        techId: "\(backendBid.technicianId)",
                        techName: backendBid.technicianName,
                        techYearsExperience: backendBid.technicianYearsExperience,
                        price: backendBid.proposedBudget,
                        description: backendBid.comment,
                        comments: backendBid.comment,
                        createdAt: parseDate(backendBid.createdAt) ?? Date(),
                        status: backendBid.status,
                        bidNumber: backendBid.id
                    )
                }
                
                await MainActor.run {
                    self.bids = fetchedBids
                    self.isLoadingBids = false
                    print("✅ Loaded \(fetchedBids.count) bids from backend")
                    
                    // ✅ Check if technician has already bid (after bids are loaded)
                    self.checkIfTechnicianHasAlreadyBid()
                }
            } catch {
                await MainActor.run {
                    self.bidsError = error.localizedDescription
                    self.isLoadingBids = false
                    print("❌ Failed to load bids: \(error)")
                }
            }
        }
    }
    
    // 🌐 FETCH PROJECT BIDS FROM BACKEND
    private func fetchProjectBids(projectId: String) async throws -> [BackendBid] {
        let apiURL = "https://bonyad-hub.com/api/bids/project/\(projectId)"
        
        var request = URLRequest(url: URL(string: apiURL)!)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        print("🔍 Fetching bids for project \(projectId)...")
        print("   URL: \(apiURL)")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        
        print("📥 Project Bids Response:")
        print("   Status: \(status)")
        
        if let responseString = String(data: data, encoding: .utf8) {
            print("   Response: \(responseString.prefix(500))...")
        }
        
        guard status == 200 else {
            throw NSError(domain: "", code: status, userInfo: [NSLocalizedDescriptionKey: "Server error: \(status)"])
        }
        
        let bids = try JSONDecoder().decode([BackendBid].self, from: data)
        print("✅ Decoded \(bids.count) bids")
        
        return bids
    }
    
    // 📅 PARSE DATE: Helper to parse ISO date string
    private func parseDate(_ dateString: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        return formatter.date(from: dateString)
    }
    
    // 🏠 REQUEST VISIT: Creates a visit request for the project
    private func requestVisit(project: ProjectRequest) async {
        guard let technicianId = SessionManager.shared.userId,
              let token = SessionManager.shared.token,
              let projectIdInt = Int(project.id) else {
            await MainActor.run {
                visitErrorMessage = "Missing required data (technician ID, token, or invalid project ID)"
                showVisitError = true
            }
            return
        }
        
        do {
            let visitRequest = try await VisitRequestService.shared.createVisitRequest(
                projectId: projectIdInt,
                technicianId: technicianId,
                requestedDate: nil, // No specific date requested
                notes: "I would like to schedule a site visit to better understand the project requirements before submitting my bid.",
                token: token
            )
            
            await MainActor.run {
                print("✅ [DEBUG] Visit request created successfully with ID: \(visitRequest.id)")
                showVisitSuccess = true
                // Immediately reflect UI state so button becomes disabled and shows "Visit Requested"
                technicianHasAlreadyAskedForVisit = true
                // Reload visit requests to show the new one
                loadVisitRequests()
            }
        } catch {
            await MainActor.run {
                print("❌ [DEBUG] Failed to create visit request: \(error.localizedDescription)")
                visitErrorMessage = error.localizedDescription
                showVisitError = true
            }
        }
    }
    
    // 🔍 CHECK IF TECHNICIAN ALREADY ASKED FOR VISIT: Checks if current technician has already requested a visit
    private func checkIfTechnicianHasAlreadyAskedForVisit() {
        guard let currentTechnicianId = SessionManager.shared.userId else {
            print("❌ [DEBUG] No current technician ID found")
            return
        }
        
        print("🔍 [DEBUG] Checking if technician \(currentTechnicianId) has already asked for visit")
        
        // Check if any visit request exists for this technician and project
        let hasAskedForVisit = visitRequests.contains { visitRequest in
            visitRequest.technicianId == currentTechnicianId
        }
        
        technicianHasAlreadyAskedForVisit = hasAskedForVisit
        print("🔍 [DEBUG] Technician has already asked for visit: \(hasAskedForVisit)")
    }
    
    // 🏠 LOAD VISIT REQUESTS: Fetches all visit requests for this project (only for users)
    private func loadVisitRequests() {
        // Only load visit requests for users, not for technicians
        guard SessionManager.shared.role?.uppercased() == "USER" else {
            print("🔍 [DEBUG] Skipping visit requests load - user role is not 'user': \(SessionManager.shared.role ?? "unknown")")
            return
        }
        
        guard !project.id.isEmpty else {
            print("❌ [DEBUG] Project ID is empty, cannot load visit requests")
            visitsError = "project_id_not_found".localized
            return
        }
        
        print("🔍 [DEBUG] ===== LOADING VISIT REQUESTS =====")
        print("🔍 [DEBUG] Project ID (String): '\(project.id)'")
        print("🔍 [DEBUG] Project ID length: \(project.id.count)")
        print("🔍 [DEBUG] Current user role: \(SessionManager.shared.role ?? "unknown")")
        guard let projectIdInt = Int(project.id) else {
            print("❌ [DEBUG] Invalid project ID: '\(project.id)' - cannot convert to Int")
            visitsError = "invalid_project_id".localized
            return
        }
        print("🔍 [DEBUG] Project ID (Int): \(projectIdInt)")
        
        print("🔍 [DEBUG] Calling backend API for visit requests...")
        
        isLoadingVisits = true
        visitsError = nil
        
        Task {
            do {
                print("🔍 [DEBUG] About to call backend API...")
                let fetchedVisits = try await VisitRequestService.shared.getProjectVisitRequests(projectId: projectIdInt)
                print("✅ [DEBUG] Backend API call successful - received \(fetchedVisits.count) visit requests")
                
                // Log each visit request
                for (index, visit) in fetchedVisits.enumerated() {
                    print("🔍 [DEBUG] Visit \(index + 1): ID=\(visit.id), Status=\(visit.status), ProjectId=\(visit.projectId)")
                }
                
                await MainActor.run {
                    self.visitRequests = fetchedVisits
                    self.isLoadingVisits = false
                    print("✅ [DEBUG] Visit requests updated in UI: \(self.visitRequests.count) items")
                    print("🔍 [DEBUG] ===== VISIT REQUESTS LOADING COMPLETE =====")
                    
                    // Check if technician has already asked for visit
                    self.checkIfTechnicianHasAlreadyAskedForVisit()
                }
            } catch {
                print("❌ [DEBUG] Backend API call failed with error: \(error)")
                print("❌ [DEBUG] Error details: \(error.localizedDescription)")
                await MainActor.run {
                    self.visitsError = error.localizedDescription
                    self.isLoadingVisits = false
                    print("🔍 [DEBUG] ===== VISIT REQUESTS LOADING FAILED =====")
                }
            }
        }
    }

    // 🏠 TECHNICIAN VISIT FLAG: For technicians, load only the flag (no UI list)
    private func loadVisitFlagForTechnician() async {
        guard let currentTechnicianId = SessionManager.shared.userId,
              let projectIdInt = Int(project.id) else { 
            print("❌ [DEBUG] No technician ID or invalid project ID")
            return 
        }
        
        do {
            let visits = try await VisitRequestService.shared.getProjectVisitRequests(projectId: projectIdInt)
            let hasAsked = visits.contains { $0.technicianId == currentTechnicianId }
            await MainActor.run {
                self.technicianHasAlreadyAskedForVisit = hasAsked
                print("🔍 [DEBUG] Technician visit flag (tech view): \(hasAsked)")
            }
        } catch {
            print("❌ [DEBUG] Failed to load technician visit flag: \(error.localizedDescription)")
        }
    }

    // 🗑️ DELETE PROJECT: Handles project deletion using backend API
    private func deleteProject() async {
        print("🗑️ Attempting to delete project: \(project.id)")
        
        guard let token = SessionManager.shared.token else {
            await MainActor.run {
                deleteErrorMessage = "No auth token found"
                print("❌ No auth token found")
            }
            return
        }
        
        do {
            try await deleteProjectFromBackend(projectId: project.id, token: token)
            await MainActor.run {
                print("✅ Project deleted successfully")
                showDeleteSuccess = true
            }
        } catch {
            await MainActor.run {
                print("❌ Error deleting project: \(error.localizedDescription)")
                deleteErrorMessage = error.localizedDescription
            }
        }
    }
    
    // 🌐 DELETE PROJECT FROM BACKEND
    private func deleteProjectFromBackend(projectId: String, token: String) async throws {
        let apiURL = "https://bonyad-hub.com/api/projects/\(projectId)"
        
        var request = URLRequest(url: URL(string: apiURL)!)
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        print("🗑️ Deleting project from backend...")
        print("   URL: \(apiURL)")
        print("   Authorization: Bearer \(token.prefix(20))...")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        
        print("📥 Delete Project Response:")
        print("   Status: \(status)")
        
        if let responseString = String(data: data, encoding: .utf8) {
            print("   Response: \(responseString)")
        }
        
        guard status == 200 || status == 204 else {
            throw NSError(domain: "", code: status, userInfo: [NSLocalizedDescriptionKey: "Server error: \(status)"])
        }
        
        print("✅ Project deleted from backend")
    }
    
    // 📊 FETCH PROJECT STATUS: Gets current project status from project data
    private func fetchProjectStatus() {
        // Status is already in the project object from backend
        currentProjectStatus = project.status.uppercased()
        
        // Find accepted bid from bids list
        if let acceptedBid = bids.first(where: { $0.status.uppercased() == "ACCEPTED" }) {
            acceptedBidId = acceptedBid.id
            print("📊 [PROJECT STATUS] Current status: \(currentProjectStatus), Accepted bid: \(acceptedBid.id ?? "none")")
        } else {
            acceptedBidId = nil
            print("📊 [PROJECT STATUS] Current status: \(currentProjectStatus), No accepted bid")
        }
    }
    
    // 🔒 CHECK IF TECHNICIAN HAS ALREADY BID: Checks if current technician has already placed a bid
    private func checkIfTechnicianHasAlreadyBid() {
        guard SessionManager.shared.role?.uppercased() == "TECHNICIAN",
              let technicianId = SessionManager.shared.userId else {
            print("🔍 [BID CHECK] Not a technician or no user ID - skipping bid check")
            return
        }
        
        print("🔍 [BID CHECK] Checking if technician \(technicianId) has already bid on project \(project.id)")
        
        // Check if the technician's ID exists in the loaded bids
        let hasBid = bids.contains { bid in
            bid.techId == String(technicianId)
        }
        
        technicianHasAlreadyBid = hasBid
        print("🔍 [BID CHECK] Technician has already bid: \(hasBid)")
        
        if hasBid {
            if let myBid = bids.first(where: { $0.techId == String(technicianId) }) {
                print("💰 [BID CHECK] Found existing bid:")
                print("   Bid ID: \(myBid.id ?? "unknown")")
                print("   Price: \(myBid.price)")
                print("   Status: \(myBid.status)")
            }
        }
    }
}

// 💰 BID CARD: Displays individual bid information in a designed card
struct BidCard: View {
    let bid: Bid
    let projectStatus: String
    let acceptedBidId: String?
    let onStatusChange: () -> Void  // 🔄 Callback to refresh project status
    @ObservedObject private var themeManager = ThemeManager.shared
    @State private var showAcceptPopup = false  // 📱 Controls accept bid popup
    @State private var showWithdrawPopup = false  // 📱 Controls withdraw bid popup
    @State private var selectedTechnicianId: String?
    @State private var selectedTechnicianName: String?
    
    // 🎯 CHECK IF THIS IS CURRENT TECHNICIAN'S BID
    private var isCurrentTechnicianBid: Bool {
        guard SessionManager.shared.role?.uppercased() == "TECHNICIAN",
              let userId = SessionManager.shared.userId else {
            return false
        }
        return bid.techId == String(userId)
    }
    
    // ✅ CHECK IF THIS BID IS ACCEPTED
    private var isAcceptedBid: Bool {
        return bid.id == acceptedBidId && projectStatus.uppercased() == "ACCEPTED"
    }
    
    // 🔒 CHECK IF BIDDING IS CLOSED
    private var isBiddingClosed: Bool {
        return projectStatus.uppercased() == "ACCEPTED"
    }
    
    // 🎯 MY BID INDICATOR: Special header for current technician's bid
    private var myBidIndicator: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "checkmark.seal.fill")
                    .font(.title3)
                    .foregroundColor(.green)
                
                Text("my_bid".localized)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.green)
                
                Spacer()
                
                Text("your_submitted_bid".localized)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.green)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(6)
            }
            
            // 🗑️ WITHDRAWAL BUTTON: Only show if bid is still pending
            if bid.status.lowercased() == "pending" {
                HStack {
                    Spacer()
                    Button(action: {
                        showWithdrawPopup = true
                    }) {
                        HStack(spacing: 6) {
                            Image(systemName: "trash.fill")
                                .font(.caption)
                            Text("withdraw_bid".localized)
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.red.opacity(0.1))
                        .foregroundColor(.red)
                        .cornerRadius(8)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
        }
        .padding(.bottom, 8)
    }
    
    // 👤 BIDDER PROFILE HEADER: Role-based bidder info display
    private var bidderProfileHeader: some View {
        HStack(spacing: 12) {
            profileIcon
            bidderInfo
            Spacer()
            chatOrPrivateButton
        }
    }
    
    // 👤 PROFILE ICON: Clickable for users, static for technicians
    private var profileIcon: some View {
        Group {
            if SessionManager.shared.role?.uppercased() == "USER" {
                NavigationLink(destination: TechUserProfileView(technicianId: Int(bid.techId) ?? 0)) {
                    Circle()
                        .fill(Color.blue.opacity(0.1))
                        .frame(width: 50, height: 50)
                        .overlay(
                            Image(systemName: "person.fill")
                                .foregroundColor(.blue)
                                .font(.title2)
                        )
                }
                .buttonStyle(PlainButtonStyle())
            } else {
                Circle()
                    .fill(Color.gray.opacity(0.1))
                    .frame(width: 50, height: 50)
                    .overlay(
                        Image(systemName: "person.fill")
                            .foregroundColor(.gray)
                            .font(.title2)
                    )
            }
        }
    }
    
    // 📝 BIDDER INFO: Name and experience display
    private var bidderInfo: some View {
        VStack(alignment: .leading, spacing: 4) {
            if SessionManager.shared.role?.uppercased() == "USER" {
                // Show technician name for users
                if let techName = bid.techName {
                    Text(techName)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                } else {
                    Text("technician".localized + " #\(bid.techId)")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                }
                
                // Show years of experience if available
                if let yearsExp = bid.techYearsExperience {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.caption2)
                            .foregroundColor(.orange)
                        Text("\(yearsExp) " + "years_experience".localized)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            } else {
                // For technicians, show private indicator
                Text("bidder_info_private".localized)
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }
    }
    
    // 💬 CHAT OR PRIVATE BUTTON: Chat for users, private indicator for technicians
    private var chatOrPrivateButton: some View {
        Group {
            if SessionManager.shared.role?.uppercased() == "USER" {
                Button(action: {
                    selectedTechnicianId = bid.techId
                    selectedTechnicianName = bid.techName ?? "Technician #\(bid.techId)"
                    print("🔍 Chat button tapped for bidder: \(bid.techName ?? bid.techId)")
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "bubble.left.and.bubble.right.fill")
                            .font(.title3)
                        Text("chat".localized)
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.green.opacity(0.1))
                    .foregroundColor(.green)
                    .cornerRadius(8)
                }
                .buttonStyle(PlainButtonStyle())
            } else {
                HStack(spacing: 4) {
                    Image(systemName: "lock.fill")
                        .font(.caption)
                    Text("private".localized)
                        .font(.caption)
                        .fontWeight(.medium)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.gray.opacity(0.1))
                .foregroundColor(.gray)
                .cornerRadius(8)
            }
        }
    }
    
    // 💰 BID PRICE HEADER: Shows bid number and price
    private var bidPriceHeader: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("bid_number".localized)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                if let bidNumber = bid.bidNumber {
                    Text("#\(bidNumber)")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.blue)
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("price".localized)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                HStack(spacing: 4) {
                    Image("saudi_riyal_logo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 16, height: 16)
                        .foregroundColor(.green)
                    
                    Text("\(bid.formattedPrice)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }
            }
        }
    }
    
    // 📝 BID DESCRIPTION SECTION: Main description of the bid
    private var bidDescriptionSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("description".localized)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.primary)
            
            Text(bid.description)
                .font(.body)
                .foregroundColor(.secondary)
                .lineLimit(3)
        }
    }
    
    // 💬 BID COMMENTS SECTION: Additional comments if available
    private var bidCommentsSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("comments".localized)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.primary)
            
            Text(bid.comments)
                .font(.body)
                .foregroundColor(.secondary)
                .lineLimit(2)
        }
    }
    
    // 📅 BID STATUS INFO: Status badge and creation date
    private var bidStatusInfo: some View {
        HStack {
            // Status badge
            HStack(spacing: 4) {
                Circle()
                    .fill(statusColor)
                    .frame(width: 8, height: 8)
                
                Text(bid.status.localized)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(statusColor)
            }
            
            Spacer()
            
            // Creation date
            Text(bid.createdAt.formatted(date: .abbreviated, time: .omitted))
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
    
    // ✅ ACCEPT BID SECTION: Shows accept button or status based on project state
    private var acceptBidSection: some View {
        Group {
            if isAcceptedBid {
                acceptedBidStatus
            } else if isBiddingClosed {
                notSelectedBidStatus
            } else if bid.status.lowercased() == "pending" {
                activeBidButton
            }
        }
    }
    
    // ✅ ACCEPTED BID STATUS: Green status for accepted bid
    private var acceptedBidStatus: some View {
        HStack {
            Image(systemName: "checkmark.seal.fill")
                .font(.title3)
                .foregroundColor(.green)
            
            Text("bid_accepted".localized)
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundColor(.green)
            
            Spacer()
            
            Text("selected".localized)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.green)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.green.opacity(0.1))
                .cornerRadius(6)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.green.opacity(0.1))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.green.opacity(0.3), lineWidth: 1)
        )
    }
    
    // ❌ NOT SELECTED BID STATUS: Gray status for not selected bid
    private var notSelectedBidStatus: some View {
        HStack {
            Image(systemName: "xmark.circle.fill")
                .font(.title3)
                .foregroundColor(.gray)
            
            Text("not_selected".localized)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.gray)
            
            Spacer()
            
            Text("bidding_closed".localized)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.gray)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.gray.opacity(0.1))
                .cornerRadius(6)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.gray.opacity(0.05))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
    }
    
    // 💰 ACTIVE BID BUTTON: Accept button for pending bids
    private var activeBidButton: some View {
        Button(action: {
            showAcceptPopup = true
        }) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title3)
                    .foregroundColor(.white)
                
                Text("accept_bid".localized)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Spacer()
                
                Image(systemName: "arrow.right")
                    .font(.caption)
                    .foregroundColor(.white)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [.green, .green.opacity(0.8)]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(8)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // 🎯 MY BID INDICATOR: Special header for current technician's bid
            if isCurrentTechnicianBid {
                myBidIndicator
            }
            
            // 👤 BIDDER PROFILE HEADER: Role-based bidder info display
            bidderProfileHeader
            
            // 💰 BID HEADER: Price and bid number
            bidPriceHeader
            
            // 📝 BID DESCRIPTION: Main description of the bid
            bidDescriptionSection
            
            // 📅 BID INFO: Status and creation date
            bidStatusInfo
            
            // ✅ ACCEPT BID BUTTON OR STATUS: Shows accept button or status based on project state
            if SessionManager.shared.role?.uppercased() != "TECHNICIAN" {
                acceptBidSection
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isCurrentTechnicianBid ? Color.green.opacity(0.05) : themeManager.selectedTheme.cardBackground)
                .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isCurrentTechnicianBid ? Color.green.opacity(0.6) : Color.blue.opacity(0.2), 
                       lineWidth: isCurrentTechnicianBid ? 2 : 1)
        )
        .sheet(isPresented: $showAcceptPopup) {
            AcceptBidPopup(bid: bid, onAcceptSuccess: onStatusChange)
        }
        .sheet(isPresented: $showWithdrawPopup) {
            WithdrawBidPopup(bid: bid)
        }
        .background(
            // Hidden NavigationLink for chat
            NavigationLink(
                destination: Group {
                    if let technicianIdString = selectedTechnicianId,
                       let technicianName = selectedTechnicianName,
                       let userId = SessionManager.shared.userId,
                       let technicianId = Int(technicianIdString) {
                        // Generate room ID: room-{smallerId}-{largerId}
                        let roomId = userId < technicianId 
                            ? "room-\(userId)-\(technicianId)" 
                            : "room-\(technicianId)-\(userId)"
                        
                        ChatsModule.DetailView(
                            roomId: roomId,
                            receiverId: technicianId,
                            receiverName: technicianName
                        )
                    } else {
                        Text("No technician selected")
                            .foregroundColor(.red)
                    }
                },
                isActive: Binding(
                    get: { selectedTechnicianId != nil },
                    set: { if !$0 { selectedTechnicianId = nil; selectedTechnicianName = nil } }
                )
            ) {
                EmptyView()
            }
            .hidden()
        )
    }
    
    // 🎨 STATUS COLOR: Returns appropriate color for bid status
    private var statusColor: Color {
        switch bid.status.lowercased() {
        case "pending":
            return .orange
        case "accepted":
            return .green
        case "rejected":
            return .red
        default:
            return .gray
        }
    }
}

// ✅ ACCEPT BID POPUP: Popup for accepting a bid with comment
struct AcceptBidPopup: View {
    let bid: Bid
    let onAcceptSuccess: () -> Void  // 🔄 Callback to refresh project status
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var themeManager = ThemeManager.shared
    
    @State private var acceptanceComment: String = ""
    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var showPhasePlanning = false
    
    private let maxCommentLength = 500
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    bidSummarySection
                    acceptanceCommentSection
                    acceptanceWarningSection
                }
                .padding(20)
            }
            .navigationTitle("accept_bid".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                cancelButton
                acceptButton
            }
        }
        .alert("success".localized, isPresented: $showSuccess) {
            Button("ok".localized) {
                dismiss()
            }
        } message: {
            Text("bid_accepted_successfully".localized)
        }
        .alert("error".localized, isPresented: $showError) {
            Button("ok".localized) { }
        } message: {
            Text(errorMessage ?? "unknown_error".localized)
        }
    }
    
    // 📋 BID SUMMARY SECTION
    private var bidSummarySection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "info.circle.fill")
                    .font(.title2)
                    .foregroundColor(.blue)
                
                Text("bid_summary".localized)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                
                Spacer()
            }
            
            VStack(alignment: .leading, spacing: 12) {
                bidPriceRow
                bidDescriptionRow
                bidCommentsRow
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.gray.opacity(0.1))
            )
        }
    }
    
    // 💰 BID PRICE ROW
    private var bidPriceRow: some View {
        HStack {
            Text("bid_price".localized)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.primary)
            
            Spacer()
            
            HStack(spacing: 4) {
                Image("saudi_riyal_logo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 16, height: 16)
                    .foregroundColor(.green)
                
                Text("\(bid.formattedPrice)")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.green)
            }
        }
    }
    
    // 📝 BID DESCRIPTION ROW
    private var bidDescriptionRow: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("description".localized)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.primary)
            
            Text(bid.description)
                .font(.body)
                .foregroundColor(.secondary)
        }
    }
    
    // 💬 BID COMMENTS ROW
    private var bidCommentsRow: some View {
        Group {
            if !bid.comments.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("bidder_comments".localized)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    Text(bid.comments)
                        .font(.body)
                        .foregroundColor(.secondary)
                }
            }
        }
    }
    
    // 💬 ACCEPTANCE COMMENT SECTION
    private var acceptanceCommentSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .font(.title2)
                    .foregroundColor(.orange)
                
                Text("acceptance_comment".localized)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                
                Spacer()
                
                Text("optional".localized)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.gray.opacity(0.1))
                    )
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Text("comment_placeholder".localized)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                commentTextField
                characterCounter
                characterLimitWarning
            }
        }
    }
    
    // 📝 COMMENT TEXT FIELD
    private var commentTextField: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 16)
                    .fill(themeManager.selectedTheme.textFieldBackground)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(
                                LinearGradient(
                                    gradient: Gradient(colors: [Color.blue.opacity(0.6), Color.blue.opacity(0.2)]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1.5
                            )
                    )
                    .shadow(color: Color.blue.opacity(0.1), radius: 4, x: 0, y: 2)
                
                TextEditor(text: $acceptanceComment)
                    .font(.body)
                    .foregroundColor(themeManager.selectedTheme.textColor)
                    .padding(16)
                    .background(Color.clear)
                    .frame(minHeight: 120)
                    .scrollContentBackground(.hidden)
            }
            
            // Character count with progress bar
            VStack(spacing: 4) {
                HStack {
                    Text("\(acceptanceComment.count)/\(maxCommentLength)")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(acceptanceComment.count > maxCommentLength ? .red : .blue)
                    
                    Spacer()
                    
                    if acceptanceComment.count > maxCommentLength {
                        Text("character_limit_exceeded".localized)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
                
                // Progress bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.gray.opacity(0.2))
                            .frame(height: 4)
                        
                        RoundedRectangle(cornerRadius: 2)
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: acceptanceComment.count > maxCommentLength ? 
                                        [Color.red, Color.red.opacity(0.7)] : 
                                        [Color.blue, Color.blue.opacity(0.7)]
                                    ),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(
                                width: min(geometry.size.width * CGFloat(acceptanceComment.count) / CGFloat(maxCommentLength), geometry.size.width),
                                height: 4
                            )
                            .animation(.easeInOut(duration: 0.2), value: acceptanceComment.count)
                    }
                }
                .frame(height: 4)
            }
        }
    }
    
    // 🔢 CHARACTER COUNTER
    private var characterCounter: some View {
        HStack {
            Spacer()
            Text("\(acceptanceComment.count)/\(maxCommentLength)")
                .font(.caption)
                .foregroundColor(acceptanceComment.count > maxCommentLength ? .red : .secondary)
        }
    }
    
    // ⚠️ CHARACTER LIMIT WARNING
    private var characterLimitWarning: some View {
        Group {
            if acceptanceComment.count > maxCommentLength {
                Text("character_limit_exceeded".localized)
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
    }
    
    // ⚠️ ACCEPTANCE WARNING SECTION
    private var acceptanceWarningSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.title3)
                    .foregroundColor(.orange)
                
                Text("acceptance_warning".localized)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.orange)
            }
            
            Text("acceptance_warning_text".localized)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.leading)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.orange.opacity(0.1))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.orange.opacity(0.3), lineWidth: 1)
        )
    }
    
    // ❌ CANCEL BUTTON
    @ToolbarContentBuilder
    private var cancelButton: some ToolbarContent {
        ToolbarItem(placement: .navigationBarLeading) {
            Button(action: { dismiss() }) {
                HStack(spacing: 4) {
                    Image(systemName: "xmark")
                    Text("cancel".localized)
                }
                .foregroundColor(.red)
            }
        }
    }
    
    // ✅ ACCEPT BUTTON
    @ToolbarContentBuilder
    private var acceptButton: some ToolbarContent {
        ToolbarItem(placement: .navigationBarTrailing) {
            Button(action: { acceptBid() }) {
                HStack(spacing: 6) {
                    if isSubmitting {
                        ProgressView()
                            .scaleEffect(0.8)
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Image(systemName: "checkmark.circle.fill")
                    }
                    Text(isSubmitting ? "accepting".localized : "accept_bid".localized)
                }
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [.green, .green.opacity(0.8)]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                )
            }
            .disabled(isSubmitting || acceptanceComment.count > maxCommentLength)
            .opacity((isSubmitting || acceptanceComment.count > maxCommentLength) ? 0.6 : 1.0)
        }
    }
    
    // ✅ ACCEPT BID: Handles bid acceptance (UI only for now)
    private func acceptBid() {
        guard acceptanceComment.count <= maxCommentLength else {
            errorMessage = "character_limit_exceeded".localized
            showError = true
            return
        }
        
        guard !acceptanceComment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "comment_required".localized
            showError = true
            return
        }
        
        isSubmitting = true
        
        Task {
            do {
                guard let token = SessionManager.shared.token else {
                    throw URLError(.userAuthenticationRequired)
                }
                
                // 🌐 BACKEND API: Accept bid
                // Parse backend ID from bid (stored as string in id field)
                guard let bidIdInt = Int(bid.id ?? "0"), bidIdInt > 0 else {
                    throw URLError(.badURL)
                }
                try await acceptBidOnBackend(bidId: bidIdInt, token: token)
                
                await MainActor.run {
                    isSubmitting = false
                    showSuccess = true
                    
                    print("✅ Bid accepted successfully!")
                    print("💰 Bid ID: \(bid.id ?? "unknown")")
                    print("💬 Acceptance Comment: \(acceptanceComment)")
                    print("📝 Bid Details: \(bid.description)")
                    print("💰 Bid Price: \(bid.formattedPrice)")
                    
                    // 🔄 REFRESH PROJECT STATUS: Notify parent to refresh
                    onAcceptSuccess()
                }
                
            } catch {
                await MainActor.run {
                    isSubmitting = false
                    errorMessage = error.localizedDescription
                    showError = true
                    print("❌ Failed to accept bid: \(error)")
                }
            }
        }
    }
    
    // 🌐 BACKEND API: Accept Bid
    private func acceptBidOnBackend(bidId: Int, token: String) async throws {
        let urlString = "https://bonyad-hub.com/api/bids/\(bidId)/accept"
        guard let url = URL(string: urlString) else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        print("🚀 Accepting bid...")
        print("   URL: \(urlString)")
        print("   Bid ID: \(bidId)")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        print("📥 Accept Bid Response:")
        print("   Status: \(httpResponse.statusCode)")
        
        if let responseString = String(data: data, encoding: .utf8) {
            print("   Response: \(responseString)")
        }
        
        guard httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        print("✅ Bid accepted on backend")
    }
}

// 🗑️ WITHDRAW BID POPUP: Allows technician to withdraw their bid with reason
struct WithdrawBidPopup: View {
    let bid: Bid
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var themeManager = ThemeManager.shared
    
    @State private var withdrawalReason: String = ""
    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var showError = false
    @State private var errorMessage: String = ""
    
    private let maxReasonLength = 200
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // 🗑️ HEADER: Withdrawal confirmation
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.title2)
                                .foregroundColor(.orange)
                            
                            Text("withdraw_bid_confirmation".localized)
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                        }
                        
                        Text("withdraw_bid_warning".localized)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.leading)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    
                    // 💰 BID SUMMARY: Show bid details
                    VStack(alignment: .leading, spacing: 12) {
                        Text("bid_summary".localized)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("price".localized + ":")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text(bid.formattedPrice + " SAR")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.primary)
                            }
                            
                            HStack {
                                Text("status".localized + ":")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text(bid.status.capitalized)
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.blue)
                            }
                        }
                        .padding(16)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(themeManager.selectedTheme.cardBackground)
                        )
                    }
                    .padding(.horizontal, 20)
                    
                    // 📝 WITHDRAWAL REASON: Text field for reason
                    VStack(alignment: .leading, spacing: 12) {
                        Text("withdrawal_reason".localized)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                        
                        Text("withdrawal_reason_description".localized)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        ZStack(alignment: .topLeading) {
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.blue, lineWidth: 1)
                                .frame(minHeight: 100)
                            
                            TextEditor(text: $withdrawalReason)
                                .padding(12)
                                .background(Color.clear)
                                .frame(minHeight: 100)
                        }
                        
                        HStack {
                            Spacer()
                            Text("\(withdrawalReason.count)/\(maxReasonLength)")
                                .font(.caption)
                                .foregroundColor(withdrawalReason.count > maxReasonLength ? .red : .secondary)
                        }
                    }
                    .padding(.horizontal, 20)
                    
                    // ⚠️ WARNING MESSAGE
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "info.circle.fill")
                                .font(.title3)
                                .foregroundColor(.blue)
                            
                            Text("important_note".localized)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.blue)
                        }
                        
                        Text("withdrawal_consequences".localized)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.leading)
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.blue.opacity(0.1))
                    )
                    .padding(.horizontal, 20)
                    
                    // 🔘 ACTION BUTTONS: Withdraw and Cancel
                    VStack(spacing: 12) {
                        // Withdraw Button
                        Button(action: withdrawBid) {
                            HStack {
                                if isSubmitting {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(0.8)
                                } else {
                                    Image(systemName: "trash.fill")
                                        .font(.title3)
                                }
                                
                                Text(isSubmitting ? "withdrawing".localized : "confirm_withdrawal".localized)
                                    .font(.headline)
                                    .fontWeight(.bold)
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                LinearGradient(
                                    gradient: Gradient(colors: [.red, .red.opacity(0.8)]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(12)
                        }
                        .disabled(isSubmitting || withdrawalReason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        .buttonStyle(PlainButtonStyle())
                        
                        // Cancel Button
                        Button(action: {
                            dismiss()
                        }) {
                            Text("cancel".localized)
                                .font(.headline)
                                .fontWeight(.medium)
                                .foregroundColor(.primary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                        .fill(Color.clear)
                                )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("withdraw_bid".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("cancel".localized) {
                        dismiss()
                    }
                }
            }
        }
        .alert("success".localized, isPresented: $showSuccess) {
            Button("ok".localized) {
                dismiss()
            }
        } message: {
            Text("bid_withdrawn_successfully".localized)
        }
        .alert("error".localized, isPresented: $showError) {
            Button("ok".localized) { }
        } message: {
            Text(errorMessage)
        }
    }
    
    // 🗑️ WITHDRAW BID: Performs the withdrawal action using backend API
    private func withdrawBid() {
        guard withdrawalReason.count <= maxReasonLength else {
            errorMessage = "character_limit_exceeded".localized
            showError = true
            return
        }
        
        guard !withdrawalReason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "withdrawal_reason_required".localized
            showError = true
            return
        }
        
        guard let token = SessionManager.shared.token else {
            errorMessage = "No auth token found"
            showError = true
            return
        }
        
        guard let bidId = bid.id else {
            errorMessage = "Invalid bid ID"
            showError = true
            return
        }
        
        isSubmitting = true
        
        Task {
            do {
                // 🗑️ DELETE BID: Call backend API
                try await deleteBidFromBackend(bidId: bidId, token: token)
                
                await MainActor.run {
                    isSubmitting = false
                    showSuccess = true
                    
                    print("✅ Bid withdrawn successfully!")
                    print("💰 Bid ID: \(bidId)")
                    print("📝 Withdrawal Reason: \(withdrawalReason)")
                }
                
            } catch {
                await MainActor.run {
                    isSubmitting = false
                    errorMessage = error.localizedDescription
                    showError = true
                    print("❌ Failed to withdraw bid: \(error)")
                }
            }
        }
    }
    
    // 🌐 DELETE BID FROM BACKEND
    private func deleteBidFromBackend(bidId: String, token: String) async throws {
        let apiURL = "https://bonyad-hub.com/api/bids/\(bidId)"
        
        var request = URLRequest(url: URL(string: apiURL)!)
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        print("🗑️ Deleting bid from backend...")
        print("   URL: \(apiURL)")
        print("   Authorization: Bearer \(token.prefix(20))...")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        
        print("📥 Delete Bid Response:")
        print("   Status: \(status)")
        
        if let responseString = String(data: data, encoding: .utf8) {
            print("   Response: \(responseString)")
        }
        
        guard status == 200 || status == 204 else {
            throw NSError(domain: "", code: status, userInfo: [NSLocalizedDescriptionKey: "Server error: \(status)"])
        }
        
        print("✅ Bid deleted from backend")
    }
}

// MARK: - Backend Project Models
struct BackendProject: Codable {
    let id: Int
    let description: String
    let budget: Double
    let status: String
    let address: String
    let latitude: Double
    let longitude: Double
    let projectType: String
    let timeRequiredDays: Int?
    let userId: Int
    let userName: String
    let serviceId: Int
    let serviceNameEn: String
    let serviceNameAr: String
    let assignedTechnicianId: Int?
    let assignedTechnicianName: String?
    let phases: [BackendPhase]
}

struct BackendPhase: Codable {
    let id: Int
    let projectId: Int
    let phaseNumber: Int
    let description: String
    let timeSpentDays: Int
    let moneySpent: Double
    let paymentStatus: String
    let paidAt: String?
    let approved: Bool
    let completed: Bool
    let createdAt: String
    let updatedAt: String
}

// MARK: - Project Phase Card View (for project detail popup)
struct ProjectPhaseCardView: View {
    let phase: ProjectPhase
    let phaseNumber: Int
    @ObservedObject private var theme = ThemeManager.shared
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Phase Header
            HStack {
                HStack(spacing: 8) {
                    ZStack {
                        Circle()
                            .fill(Color.blue.opacity(0.1))
                            .frame(width: 32, height: 32)
                        
                        Text("\(phaseNumber)")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.blue)
                    }
                    
                    Text(phase.title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.primary)
                }
                
                Spacer()
                
                // Phase percentage
                Text("\(Int(phase.percentage))%")
                    .font(.caption.weight(.bold))
                    .foregroundColor(.blue)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(6)
            }
            
            // Phase Description
            Text(phase.description)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(3)
            
            // Phase Details Row
            HStack(spacing: 20) {
                // Amount
                HStack(spacing: 4) {
                    Image(systemName: "banknote")
                        .font(.caption)
                        .foregroundColor(.green)
                    
                    Text("\(Int(phase.amount)) SAR")
                        .font(.caption.weight(.medium))
                        .foregroundColor(.primary)
                }
                
                // Duration
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.caption)
                        .foregroundColor(.orange)
                    
                    Text("\(phase.durationWeeks) " + (phase.durationWeeks == 1 ? "week".localized : "weeks".localized))
                        .font(.caption.weight(.medium))
                        .foregroundColor(.primary)
                }
                
                Spacer()
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(theme.selectedTheme.cardBackground)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.blue.opacity(0.2), lineWidth: 1)
        )
    }
}

struct BackendBid: Codable {
    let id: Int
    let projectId: Int
    let projectDescription: String
    let projectBudget: Double
    let userId: Int
    let userName: String
    let userPhone: String
    let technicianId: Int
    let technicianName: String
    let technicianPhone: String
    let technicianProfileImage: String?
    let technicianYearsExperience: Int?
    let proposedBudget: Double
    let comment: String
    let status: String
    let estimatedDurationDays: Int
    let createdAt: String
}

#Preview {
    ProjectsListView()
}
