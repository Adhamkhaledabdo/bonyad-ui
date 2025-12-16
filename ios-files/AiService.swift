import Foundation

// 🤖 CHATGPT SERVICE: Singleton class that handles AI-powered project generation
// This service communicates with OpenAI's ChatGPT API to generate project details
final class ChatGPTService {
    static let shared = ChatGPTService()  // 🔑 Singleton instance
    private let apiKey = ""  // 🔐 OpenAI API key
    
    // 🚀 MAIN FUNCTION: Generates a complete ProjectRequest from user description
    // This is the main entry point called by AIProjectForm
    func generateProjectRequest(from description: String) async throws -> ProjectRequest {
        let prompt = createPrompt(for: description)  // 📝 Create AI prompt
        let response = try await ask(prompt: prompt)  // 🤖 Call ChatGPT API
        return try parseProjectRequest(from: response)  // 📦 Parse response to ProjectRequest
    }
    
    // ✨ ENHANCE DESCRIPTION: Enhances project description for portfolio
    // This function takes a simple description and makes it professional and detailed
    func enhanceDescription(_ description: String) async throws -> String {
        let currentLanguage = Localizer.shared.currentLanguage
        let isArabic = currentLanguage == .arabic
        
        let prompt = isArabic ?
            """
            أنت كاتب محترف متخصص في وصف مشاريع البناء والتشييد.
            
            مهمتك: إعادة صياغة الوصف التالي ليصبح احترافيًا ومناسبًا لعرضه في محفظة أعمال فني.
            
            المتطلبات:
            - اجعل الوصف احترافيًا وجذابًا
            - أضف تفاصيل تقنية عند الحاجة
            - استخدم مصطلحات البناء السعودية
            - اجعله واضحًا وموجزًا (2-3 جمل)
            - احتفظ بجوهر المعلومات الأصلية
            - لا تضف معلومات غير موجودة في النص الأصلي
            
            الوصف الأصلي: "\(description)"
            
            مهم جداً: أرجع النص المحسن مباشرة بدون JSON، بدون علامات اقتباس، بدون أي تنسيق إضافي. فقط النص المحسن.
            """ :
            """
            You are a professional writer specialized in construction and building project descriptions.
            
            Your task: Rephrase the following description to make it professional and suitable for a portfolio.
            
            Requirements:
            - Make it professional and appealing
            - Add technical details when appropriate
            - Use Saudi construction terminology
            - Keep it clear and concise (2-3 sentences)
            - Maintain the core information from original text
            - Don't add information not present in the original
            
            Original description: "\(description)"
            
            CRITICAL: Return ONLY the enhanced plain text description. NO JSON, NO quotes, NO formatting, NO explanations. Just the enhanced text itself.
            """
        
        var response = try await ask(prompt: prompt)
        response = response.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Handle if AI returns JSON despite instructions
        if response.hasPrefix("{") && response.hasSuffix("}") {
            print("⚠️ AI returned JSON, extracting description field...")
            if let data = response.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let extractedDescription = json["description"] as? String {
                print("✅ Extracted description from JSON")
                return extractedDescription.trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }
        
        // Remove any remaining quotes
        response = response.trimmingCharacters(in: CharacterSet(charactersIn: "\""))
        
        return response
    }
    
    // 📝 CREATE PROMPT: Builds the AI prompt with project description and guidelines
    // This function creates a detailed prompt that instructs ChatGPT how to respond
    private func createPrompt(for description: String) -> String {
        // 🌍 DETECT PHONE LANGUAGE: Get current device language
        let currentLanguage = Localizer.shared.currentLanguage
        let isArabic = currentLanguage == .arabic
        
        // 📝 LANGUAGE-SPECIFIC INSTRUCTIONS
        let languageInstruction = isArabic ? 
            "IMPORTANT: Respond in Arabic language. All text in the JSON response must be in Arabic." :
            "IMPORTANT: Respond in English language. All text in the JSON response must be in English."
        
        // 🏗️ DYNAMIC CATEGORIES: Get categories from ServiceAPI
        let availableCategories = ProjectRequest.getAvailableCategories()
        let categories = availableCategories.joined(separator: ", ")
        
        // 📊 DYNAMIC MARKET DATA: Create market data based on actual categories
        let marketData = createMarketData(for: availableCategories, isArabic: isArabic)
        
        return """
        You are an expert construction estimator in Saudi Arabia. 
        \(languageInstruction)
        
        Available Service Categories: \(categories)
        
        Use the following baseline market data to estimate budget & duration:
        \(marketData)

        Cultural Notes:
        - Consider Saudi climate (very hot summers, avoid outdoor projects in July–August).
        - Saudis value privacy: assume technicians need house visits for most physical jobs.
        - Families prefer projects scheduled around weekends (Thu–Sat).
        - Labor costs: 150-300 SAR/day for skilled technicians.
        - Materials often imported, add 15-25% for import costs.
        - Consider Ramadan timing (shorter work days, higher demand).

        Return ONLY valid JSON with these EXACT fields (no extra text, no markdown):
        {
            "description": "\(isArabic ? "وصف مفصل للمشروع بناءً على مدخلات المستخدم، مع مراعاة ممارسات البناء السعودية والتفضيلات الثقافية" : "Detailed project description based on user input, considering Saudi construction practices and cultural preferences")",
            "durationWeeks": 4,
            "category": "\(availableCategories.first ?? "Other")",
            "budget": 1500.0,
            "needsHouseVisit": true,
            "needsBooking": true,
            "address": "",
            "latitude": null,
            "longitude": null,
            "photos": [],
            "phases": [
                {
                    "title": "\(isArabic ? "عنوان المرحلة" : "Phase Title")",
                    "description": "\(isArabic ? "وصف تفصيلي للأعمال المطلوبة في هذه المرحلة" : "Detailed description of work required in this phase")",
                    "durationWeeks": 1,
                    "amount": 500.0,
                    "percentage": 33.33
                }
            ]
        }
        
        CRITICAL PHASE REQUIREMENTS:
        - Generate realistic work phases that break down the project into logical steps
        - Each phase MUST have: title, description, durationWeeks (minimum 1), amount, and percentage
        
        BUDGET RULES (STRICT):
        - The sum of all phase amounts MUST EXACTLY equal the total budget
        - The sum of all phase percentages MUST EXACTLY equal 100.0
        - No rounding errors - amounts must add up perfectly
        
        DURATION RULES (STRICT):
        - The sum of all phase durationWeeks MUST EXACTLY equal the total durationWeeks
        - Each phase must have realistic duration (minimum 1 week)
        - Distribute weeks logically across phases based on work complexity
        - Example: 4 weeks total = Phase1(1 week) + Phase2(2 weeks) + Phase3(1 week) = 4 weeks ✓
        
        PHASE DISTRIBUTION GUIDELINES:
        - Preparation/Planning: 15-20% of time and budget
        - Main Execution: 50-60% of time and budget
        - Finishing/Cleanup: 15-20% of time and budget
        - Final Inspection: 5-10% of time and budget
        - For Saudi construction: account for prayer breaks, weekend (Fri-Sat), hot weather delays
        
        IMPORTANT: 
        - Choose category from: \(categories)
        - Return ONLY the JSON object above, no explanations, no markdown formatting, no additional text.

        Project Description: "\(description)"
        """
    }
    
    // 📊 CREATE MARKET DATA: Generate market data based on actual categories
    private func createMarketData(for categories: [String], isArabic: Bool) -> String {
        var marketData = ""
        
        for category in categories {
            let (budgetRange, durationRange) = getMarketDataForCategory(category)
            let categoryName = isArabic ? getArabicCategoryName(category) : category
            marketData += "- \(categoryName): \(budgetRange), duration \(durationRange).\n"
        }
        
        return marketData
    }
    
    // 💰 GET MARKET DATA: Returns budget and duration ranges for each category
    private func getMarketDataForCategory(_ category: String) -> (String, String) {
        switch category.lowercased() {
        case let cat where cat.contains("design") && cat.contains("architectural"):
            return ("3000–50000 SAR", "4–20 weeks")
        case let cat where cat.contains("contracting") || cat.contains("execution"):
            return ("5000–100000+ SAR", "4–30 weeks")
        case let cat where cat.contains("materials"):
            return ("1000–50000 SAR", "1–8 weeks")
        case let cat where cat.contains("technical") || cat.contains("engineering"):
            return ("500–10000 SAR", "1–4 weeks")
        case let cat where cat.contains("landscape") || cat.contains("garden"):
            return ("2000–25000 SAR", "2–12 weeks")
        case let cat where cat.contains("maintenance") || cat.contains("renovation"):
            return ("500–30000 SAR", "1–16 weeks")
        case let cat where cat.contains("project management"):
            return ("2000–20000 SAR", "2–20 weeks")
        case let cat where cat.contains("digital") || cat.contains("3d"):
            return ("1000–15000 SAR", "1–8 weeks")
        case let cat where cat.contains("permits") || cat.contains("licensing"):
            return ("500–5000 SAR", "1–4 weeks")
        case let cat where cat.contains("furniture"):
            return ("1000–30000 SAR", "1–12 weeks")
        case let cat where cat.contains("financial"):
            return ("500–2000 SAR", "1–2 weeks")
        case let cat where cat.contains("logistics"):
            return ("1000–10000 SAR", "1–6 weeks")
        default:
            return ("500–20000 SAR", "1–8 weeks")
        }
    }
    
    // 🌍 GET ARABIC CATEGORY NAME: Returns Arabic name for category
    private func getArabicCategoryName(_ category: String) -> String {
        switch category.lowercased() {
        case let cat where cat.contains("design") && cat.contains("architectural"):
            return "خدمات التصميم (معماري / داخلي / ديكور)"
        case let cat where cat.contains("contracting") || cat.contains("execution"):
            return "خدمات المقاولات / تنفيذ المشاريع"
        case let cat where cat.contains("materials"):
            return "توريد مواد البناء"
        case let cat where cat.contains("technical") || cat.contains("engineering"):
            return "الاستشارات التقنية / الهندسية"
        case let cat where cat.contains("landscape") || cat.contains("garden"):
            return "تصميم المناظر الطبيعية / الحدائق / الخارجي"
        case let cat where cat.contains("maintenance") || cat.contains("renovation"):
            return "خدمات الصيانة والتجديد"
        case let cat where cat.contains("project management"):
            return "إدارة المشاريع / إشراف التنفيذ"
        case let cat where cat.contains("digital") || cat.contains("3d"):
            return "التصميم الرقمي / نماذج ثلاثية الأبعاد والواقع الافتراضي"
        case let cat where cat.contains("permits") || cat.contains("licensing"):
            return "خدمات التراخيص والتصاريح"
        case let cat where cat.contains("furniture"):
            return "توريد الأثاث والمعدات / التسويق"
        case let cat where cat.contains("financial"):
            return "الحلول المالية / مرافق الدفع"
        case let cat where cat.contains("logistics"):
            return "خدمات التنسيق اللوجستي"
        default:
            return category
        }
    }
    
    // 🌐 ASK CHATGPT: Makes HTTP request to OpenAI API
    // This function handles the actual API call to ChatGPT
    private func ask(prompt: String) async throws -> String {
        // 🌍 DETECT PHONE LANGUAGE: Get current device language for system message
        let currentLanguage = Localizer.shared.currentLanguage
        let isArabic = currentLanguage == .arabic
        
        let url = URL(string: "https://api.openai.com/v1/chat/completions")!  // 🔗 OpenAI API endpoint
        var request = URLRequest(url: url)
        request.httpMethod = "POST"  // 📤 POST request
        request.addValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")  // 🔐 API key header
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")  // 📋 Content type
        
        let body: [String: Any] = [
            "model": "gpt-4o-mini",  // 🤖 ChatGPT model
            "messages": [
                ["role": "system", "content": isArabic ? 
                    "أنت خبير في تقدير مشاريع البناء. يجب أن ترجع JSON صحيح فقط بدون أي نص إضافي أو تنسيق markdown. استخدم نفس البنية المطلوبة بالضبط." : 
                    "You are an expert construction project estimator. You MUST return ONLY valid JSON with no additional text, no markdown formatting, no explanations. Use the exact structure provided in the prompt."],  // 🎯 System instruction
                ["role": "user", "content": prompt]  // 👤 User prompt
            ],
            "temperature": 0.1,  // 🎯 Low temperature for consistent responses
            "max_tokens": 500  // 📏 Limit response length
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)  // 📦 Convert to JSON data
        
        let (data, response) = try await URLSession.shared.data(for: request)  // 🌐 Make HTTP request
        
        // ✅ HTTP VALIDATION: Check if response is valid HTTP
        guard let httpResponse = response as? HTTPURLResponse else {
            print("❌ Invalid HTTP response")
            throw AIServiceError.invalidResponse
        }
        
        print("📡 HTTP Status: \(httpResponse.statusCode)")  // 📊 Log HTTP status
        
        // ✅ STATUS CHECK: Ensure request was successful
        guard httpResponse.statusCode == 200 else {
            print("❌ HTTP Error: \(httpResponse.statusCode)")
            if let errorData = String(data: data, encoding: .utf8) {
                print("❌ Error Response: \(errorData)")  // 📝 Log error details
            }
            throw AIServiceError.invalidResponse
        }
        
        do {
            // 📦 JSON PARSING: Parse the response JSON
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            print("📦 JSON Response: \(json ?? [:])")  // 📊 Log full response
            
            // 🔍 EXTRACT CONTENT: Get the AI-generated content from response
            guard let choices = json?["choices"] as? [[String: Any]],
                  let firstChoice = choices.first,
                  let message = firstChoice["message"] as? [String: Any],
                  let content = message["content"] as? String else {
                print("❌ Failed to parse response structure")
                throw AIServiceError.invalidResponse
            }
            
            print("🤖 AI Response: \(content)")  // 📝 Log AI response
            return content  // 🎯 Return the AI-generated text
        } catch {
            print("❌ JSON Parsing Error: \(error)")  // 📝 Log parsing error
            throw AIServiceError.invalidData
        }
    }
    
    // 📦 AI PHASE RESPONSE: Temporary struct for parsing AI phases
    private struct AIPhaseResponse: Codable {
        let title: String
        let description: String
        let durationWeeks: Int
        let amount: Double
        let percentage: Double
    }
    
    // 📦 AI PROJECT RESPONSE: Temporary struct for parsing AI response
    private struct AIProjectResponse: Codable {
        let description: String
        let durationWeeks: Int
        let category: String
        let budget: Double
        let needsHouseVisit: Bool
        let needsBooking: Bool
        let address: String
        let latitude: Double?
        let longitude: Double?
        let photos: [String]
        let phases: [AIPhaseResponse]?
    }
    
    // 📦 PARSE PROJECT REQUEST: Converts AI response to ProjectRequest object
    // This function cleans and parses the JSON response from ChatGPT
    private func parseProjectRequest(from response: String) throws -> ProjectRequest {
        print("🔍 RAW AI RESPONSE: \(response)")  // 📝 Log raw response
        print("🔍 RESPONSE LENGTH: \(response.count) characters")  // 📝 Log response length
        
        // 🧹 CLEAN RESPONSE: Remove any markdown formatting from AI response
        let cleanResponse = response
            .replacingOccurrences(of: "```json", with: "")  // Remove markdown code blocks
            .replacingOccurrences(of: "```", with: "")
            .replacingOccurrences(of: "```json\n", with: "")  // Remove more markdown variants
            .replacingOccurrences(of: "\n```", with: "")
            .replacingOccurrences(of: "json", with: "")  // Remove any remaining "json" text
            .trimmingCharacters(in: .whitespacesAndNewlines)  // Remove whitespace
        
        print("🧹 Cleaned response: \(cleanResponse)")  // 📝 Log cleaned response
        
        // 🔍 EXTRACT JSON: Try to extract JSON from the response if it's wrapped in text
        var jsonString = cleanResponse
        
        // Find the first opening brace
        if let jsonStart = cleanResponse.range(of: "{") {
            let startIndex = jsonStart.lowerBound
            var braceCount = 0
            var endIndex: String.Index?
            
            // Count braces to find the matching closing brace
            for i in cleanResponse.indices[startIndex...] {
                let char = cleanResponse[i]
                if char == "{" {
                    braceCount += 1
                } else if char == "}" {
                    braceCount -= 1
                    if braceCount == 0 {
                        endIndex = i
                        break
                    }
                }
            }
            
            // Extract the JSON if we found a matching closing brace
            if let endIndex = endIndex {
                jsonString = String(cleanResponse[startIndex...endIndex])
            }
        }
        
        print("🔍 Extracted JSON: \(jsonString)")  // 📝 Log extracted JSON
        
        // 📦 CONVERT TO DATA: Convert string to Data for JSON decoding
        guard let data = jsonString.data(using: .utf8) else {
            print("❌ Failed to convert response to data")
            throw AIServiceError.invalidData
        }
        
        do {
            // 🔄 JSON DECODING: Decode JSON to AIProjectResponse first
            let aiResponse = try JSONDecoder().decode(AIProjectResponse.self, from: data)
            print("✅ Successfully decoded AI response: \(aiResponse)")  // 📝 Log success
            
            // ✅ VALIDATION: Validate the decoded response
            guard ProjectRequest.getAvailableCategories().contains(aiResponse.category) else {
                print("❌ Invalid category: \(aiResponse.category)")
                throw AIServiceError.invalidCategory
            }
            
            guard aiResponse.durationWeeks >= 1 && aiResponse.durationWeeks <= 52 else {
                print("❌ Invalid duration: \(aiResponse.durationWeeks)")
                throw AIServiceError.invalidDuration
            }
            
            guard aiResponse.budget >= 0 else {
                print("❌ Invalid budget: \(aiResponse.budget)")
                throw AIServiceError.invalidBudget
            }
            
            // 📋 CONVERT AI PHASES TO PROJECT PHASES
            var projectPhases: [ProjectPhase] = []
            if let aiPhases = aiResponse.phases, !aiPhases.isEmpty {
                print("📋 Converting \(aiPhases.count) AI phases to ProjectPhases")
                
                // Validate phases
                let totalAmount = aiPhases.reduce(0.0) { $0 + $1.amount }
                let totalPercentage = aiPhases.reduce(0.0) { $0 + $1.percentage }
                let totalDuration = aiPhases.reduce(0) { $0 + $1.durationWeeks }
                
                print("📊 Phase validation:")
                print("   - Total amount: \(totalAmount) (should be \(aiResponse.budget))")
                print("   - Total percentage: \(totalPercentage) (should be 100.0)")
                print("   - Total duration: \(totalDuration) weeks (should be \(aiResponse.durationWeeks))")
                
                // Convert each AI phase to ProjectPhase
                for (index, aiPhase) in aiPhases.enumerated() {
                    let projectPhase = ProjectPhase(
                        title: aiPhase.title,
                        description: aiPhase.description,
                        status: "pending",
                        percentage: aiPhase.percentage,
                        amount: aiPhase.amount,
                        durationWeeks: aiPhase.durationWeeks,  // Include duration from AI
                        dueDate: nil,  // Will be set later when project starts
                        completedAt: nil,
                        paidAt: nil
                    )
                    projectPhases.append(projectPhase)
                    print("✅ Phase \(index + 1): \(projectPhase.title)")
                    print("   - Amount: \(projectPhase.formattedAmount) (\(projectPhase.percentage)%)")
                    print("   - Duration: \(aiPhase.durationWeeks) week(s)")
                }
            } else {
                print("⚠️ No phases provided by AI, will use empty phases array")
            }
            
            // 🏗️ CREATE PROJECT REQUEST: Convert AI response to ProjectRequest
            var request = ProjectRequest(
                userId: SessionManager.shared.userId?.description ?? "unknown",
                title: String(aiResponse.description.prefix(50)),  // Use first 50 chars as title
                description: aiResponse.description,
                category: aiResponse.category,
                budget: aiResponse.budget,
                durationWeeks: aiResponse.durationWeeks,
                needsHouseVisit: aiResponse.needsHouseVisit,
                needsBooking: aiResponse.needsBooking,
                address: aiResponse.address,
                latitude: aiResponse.latitude,
                longitude: aiResponse.longitude,
                photos: aiResponse.photos,
                phases: projectPhases
            )
            
            // 🇸🇦 SAUDI MARKET VALIDATION: Validate budget against Saudi market ranges
            validateBudget(for: &request)
            
            print("✅ ProjectRequest validation passed with \(request.phases.count) phases")  // 📝 Log validation success
            return request  // 🎯 Return validated ProjectRequest
        } catch let decodingError as DecodingError {
            // ❌ DECODING ERROR: Handle specific JSON decoding errors
            print("❌ Decoding Error: \(decodingError)")
            switch decodingError {
            case .keyNotFound(let key, let context):
                print("❌ Missing key: \(key) in context: \(context)")
            case .typeMismatch(let type, let context):
                print("❌ Type mismatch: \(type) in context: \(context)")
            case .valueNotFound(let type, let context):
                print("❌ Value not found: \(type) in context: \(context)")
            case .dataCorrupted(let context):
                print("❌ Data corrupted: \(context)")
            @unknown default:
                print("❌ Unknown decoding error")
            }
            
            // 🔄 FALLBACK PARSING: Try to parse with manual field extraction
            print("🔄 Attempting fallback parsing...")
            do {
                let fallbackRequest = try parseWithFallback(jsonString: jsonString)
                print("✅ Fallback parsing successful: \(fallbackRequest)")
                return fallbackRequest
            } catch {
                print("❌ Fallback parsing also failed: \(error)")
                throw AIServiceError.parsingFailed
            }
        } catch {
            // ❌ GENERAL ERROR: Handle any other parsing errors
            print("❌ General JSON Parsing Error: \(error)")
            print("Raw response: \(cleanResponse)")  // 📝 Log raw response for debugging
            
            // 🔄 FALLBACK PARSING: Try to parse with manual field extraction
            print("🔄 Attempting fallback parsing...")
            do {
                let fallbackRequest = try parseWithFallback(jsonString: jsonString)
                print("✅ Fallback parsing successful: \(fallbackRequest)")
                return fallbackRequest
            } catch {
                print("❌ Fallback parsing also failed: \(error)")
                throw AIServiceError.parsingFailed
            }
        }
    }
    
    // 🔄 FALLBACK PARSING: Manual field extraction when JSON decoding fails
    private func parseWithFallback(jsonString: String) throws -> ProjectRequest {
        print("🔄 Fallback parsing JSON: \(jsonString)")
        
        // Try to parse as a dictionary manually
        guard let data = jsonString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw AIServiceError.parsingFailed
        }
        
        print("🔄 Parsed JSON dictionary: \(json)")
        
        // Extract fields with fallbacks
        let description = json["description"] as? String ?? "Project description"
        let durationWeeks = json["durationWeeks"] as? Int ?? json["duration_weeks"] as? Int ?? 1
        let category = json["category"] as? String ?? "Other"
        let budget = json["budget"] as? Double ?? json["estimated_budget"] as? Double ?? 1000.0
        let needsHouseVisit = json["needsHouseVisit"] as? Bool ?? json["needs_house_visit"] as? Bool ?? false
        let needsBooking = json["needsBooking"] as? Bool ?? json["needs_booking"] as? Bool ?? false
        let address = json["address"] as? String ?? ""
        let latitude = json["latitude"] as? Double
        let longitude = json["longitude"] as? Double
        let photos = json["photos"] as? [String] ?? []
        
        print("🔄 Extracted fields - Description: \(description), Category: \(category), Budget: \(budget)")
        
        // 📋 EXTRACT PHASES: Parse phases array if present
        var projectPhases: [ProjectPhase] = []
        if let phasesArray = json["phases"] as? [[String: Any]] {
            print("🔄 Found \(phasesArray.count) phases in fallback parsing")
            
            for (index, phaseDict) in phasesArray.enumerated() {
                let title = phaseDict["title"] as? String ?? "Phase \(index + 1)"
                let phaseDescription = phaseDict["description"] as? String ?? ""
                let phaseDuration = phaseDict["durationWeeks"] as? Int ?? 1
                let amount = phaseDict["amount"] as? Double ?? 0.0
                let percentage = phaseDict["percentage"] as? Double ?? 0.0
                
                let phase = ProjectPhase(
                    title: title,
                    description: phaseDescription,
                    status: "pending",
                    percentage: percentage,
                    amount: amount,
                    durationWeeks: phaseDuration,  // Include duration
                    dueDate: nil,
                    completedAt: nil,
                    paidAt: nil
                )
                projectPhases.append(phase)
                print("🔄 Fallback Phase \(index + 1): \(title) - \(amount) SAR (\(percentage)%) - \(phaseDuration) week(s)")
            }
        } else {
            print("⚠️ No phases found in fallback parsing")
        }
        
        // Validate category
        let validCategory = ProjectRequest.getAvailableCategories().contains(category) ? category : "Other"
        
        // Create ProjectRequest with extracted data
        var request = ProjectRequest(
            userId: SessionManager.shared.userId?.description ?? "unknown",
            title: description.prefix(50).description, // Use first 50 chars as title
            description: description,
            category: validCategory,
            budget: max(0, budget), // Ensure non-negative
            durationWeeks: max(1, min(durationWeeks, 52)), // Clamp between 1-52
            needsHouseVisit: needsHouseVisit,
            needsBooking: needsBooking,
            address: address,
            latitude: latitude,
            longitude: longitude,
            photos: photos,
            phases: projectPhases
        )
        
        // Apply Saudi market validation
        validateBudget(for: &request)
        
        print("✅ Fallback parsing completed with \(request.phases.count) phases")
        return request
    }
    
    // 🇸🇦 VALIDATE BUDGET: Ensures budget is within realistic Saudi market ranges
    // This function clamps budgets to appropriate ranges based on project category
    private func validateBudget(for request: inout ProjectRequest) {
        let ranges: [String: ClosedRange<Double>] = [
            "Plumbing": 200...2000,
            "Electrical": 300...3000,
            "Painting": 500...5000,
            "Carpentry": 1000...8000,
            "Renovation": 5000...50000,
            "Cleaning": 100...1500,
            "Gardening": 200...5000,
            "HVAC": 500...7000,
            "Roofing": 2000...20000,
            "Tiling": 2000...15000,
            "Interior Design": 3000...25000,
            "Other": 100...10000
        ]
        
        if let range = ranges[request.category] {
            if !range.contains(request.budget) {
                // Clamp budget into Saudi range
                let originalBudget = request.budget
                let adjustedBudget = max(range.lowerBound, min(request.budget, range.upperBound))
                
                // Create new ProjectRequest with adjusted budget
                request = ProjectRequest(
                    id: request.id,
                    userId: request.userId,
                    technicianId: request.technicianId,
                    title: request.title,
                    description: request.description,
                    category: request.category,
                    budget: adjustedBudget,
                    durationWeeks: request.durationWeeks,
                    needsHouseVisit: request.needsHouseVisit,
                    needsBooking: request.needsBooking,
                    address: request.address,
                    latitude: request.latitude,
                    longitude: request.longitude,
                    photos: request.photos,
                    createdAt: request.createdAt,
                    status: request.status,
                    phases: request.phases,
                    paymentPlan: request.paymentPlan,
                    contract: request.contract,
                    ratings: request.ratings
                )
                
                print("🇸🇦 Budget adjusted for Saudi market: \(originalBudget) → \(adjustedBudget) SAR for \(request.category)")
            }
        }
    }
}

// ❌ AI SERVICE ERROR: Error types for AI service failures
// These errors are localized and provide user-friendly messages
enum AIServiceError: Error, LocalizedError {
    case invalidResponse  // 🌐 Invalid HTTP response
    case invalidData  // 📦 Invalid data format
    case invalidCategory  // 🏷️ Invalid project category
    case invalidDuration  // ⏰ Invalid project duration
    case invalidBudget  // 💰 Invalid project budget
    case parsingFailed  // 🔄 JSON parsing failed
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "ai_error_invalid_response".localized  // 🌍 Localized error message
        case .invalidData:
            return "ai_error_invalid_data".localized
        case .invalidCategory:
            return "ai_error_invalid_category".localized
        case .invalidDuration:
            return "ai_error_invalid_duration".localized
        case .invalidBudget:
            return "ai_error_invalid_budget".localized
        case .parsingFailed:
            return "ai_error_parsing_failed".localized
        }
    }
}

