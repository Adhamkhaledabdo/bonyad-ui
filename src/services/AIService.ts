// 🤖 AI SERVICE: ChatGPT API integration for project generation
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/api';

// OpenAI API Key (stored in environment variables in production)
const OPENAI_API_KEY = '';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Service Category from Backend
export interface ServiceCategory {
  id: number;
  nameAr: string;
  nameEn: string;
  description: string;
  imageUrl: string;
}

export interface ProjectPhase {
  title: string;
  description: string;
  durationWeeks: number;
  amount: number;
  percentage: number;
}

export interface ProjectRequest {
  title: string;
  description: string;
  category: string;
  serviceId?: number; // Service category ID from backend
  budget?: number; // Optional budget
  budgetUnspecified?: boolean; // Flag to indicate budget is not specified (send null)
  durationWeeks: number;
  needsHouseVisit: boolean;
  needsBooking: boolean;
  address?: string;
  latitude?: number;
  longitude?: number;
  bidsCloseAt?: string; // ISO-8601 DateTime format: YYYY-MM-DDTHH:mm:ss
  phases?: ProjectPhase[];
}

export interface DescriptionAnalysis {
  isDetailed: boolean;
  questions: string[]; // 3-4 clarifying questions
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 🤖 Generate Project Request from Description
 * Uses ChatGPT to create a complete project from user description
 */
export async function generateProjectRequest(
  description: string,
  language: 'en' | 'ar' = 'en',
  categories: ServiceCategory[] = []
): Promise<ProjectRequest> {
  const prompt = createPrompt(description, language, categories);
  const response = await askChatGPT(prompt);
  return parseProjectRequest(response);
}

/**
 * ✨ Enhance Project Description
 * Makes a description more professional for portfolio display
 */
export async function enhanceDescription(
  description: string,
  language: 'en' | 'ar' = 'en'
): Promise<string> {
  const isArabic = language === 'ar';
  
  const prompt = isArabic
    ? `أنت كاتب محترف متخصص في وصف مشاريع البناء والتشييد.
    
مهمتك: إعادة صياغة الوصف التالي ليصبح احترافيًا ومناسبًا لعرضه في محفظة أعمال فني.

المتطلبات:
- اجعل الوصف احترافيًا وجذابًا
- أضف تفاصيل تقنية عند الحاجة
- استخدم مصطلحات البناء السعودية
- اجعله واضحًا وموجزًا (2-3 جمل)
- احتفظ بجوهر المعلومات الأصلية

الوصف الأصلي: "${description}"

مهم جداً: أرجع النص المحسن مباشرة بدون JSON، بدون علامات اقتباس.`
    : `You are a professional writer specialized in construction and building project descriptions.

Your task: Rephrase the following description to make it professional and suitable for a portfolio.

Requirements:
- Make it professional and appealing
- Add technical details when appropriate
- Use Saudi construction terminology
- Keep it clear and concise (2-3 sentences)
- Maintain the core information from original text

Original description: "${description}"

CRITICAL: Return ONLY the enhanced plain text description. NO JSON, NO quotes, NO formatting.`;

  const response = await askChatGPT(prompt);
  
  // Clean up response
  let cleaned = response.trim();
  
  // Remove JSON wrapper if present
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const json = JSON.parse(cleaned);
      cleaned = json.description || cleaned;
    } catch (e) {
      // Not JSON, continue with original
    }
  }
  
  // Remove quotes
  cleaned = cleaned.replace(/^["']|["']$/g, '');
  
  return cleaned.trim();
}

/**
 * 📝 Create AI Prompt
 */
function createPrompt(description: string, language: 'en' | 'ar', serviceCategories: ServiceCategory[] = []): string {
  const isArabic = language === 'ar';
  
  // Use fetched categories from API if available, otherwise fallback
  let categoriesList = 'Design Services, Contracting Services, Building Materials Supply, Technical Consultations, Landscape Design, Maintenance & Renovation, Project Management, Digital Design, Permits & Licensing, Furniture Sourcing, Financial Solutions, Logistics Coordination';
  
  if (serviceCategories.length > 0) {
    // Create list from fetched categories
    const names = serviceCategories.map(cat => isArabic ? cat.nameAr : cat.nameEn);
    categoriesList = names.join(', ');
  }
  
  const languageInstruction = isArabic
    ? 'IMPORTANT: Respond in Arabic language. All text in the JSON response must be in Arabic.'
    : 'IMPORTANT: Respond in English language. All text in the JSON response must be in English.';

  return `You are an expert construction estimator in Saudi Arabia.
${languageInstruction}

The user described their project need as: "${description}"

Based on this description, generate a complete project JSON with the following structure:
{
  "title": "Short descriptive title",
  "description": "Detailed project description in ${isArabic ? 'Arabic' : 'English'}",
  "category": "One of: ${categoriesList}",
  "budget": <number in SAR>,
  "durationWeeks": <number of weeks>,
  "needsHouseVisit": <boolean>,
  "needsBooking": <boolean>,
  "address": "Optional address if mentioned",
  "phases": [
    {
      "title": "Phase 1 title",
      "description": "What will be done in this phase",
      "durationWeeks": <weeks for this phase>,
      "amount": <cost in SAR for this phase>,
      "percentage": <percentage of total budget for this phase>
    }
  ]
}

Important:
- Create 2-4 realistic phases that break down the project
- Each phase should have clear deliverables
- Phases should be in chronological order
- Total of all phase amounts should equal budget
- Total of all phase durations should equal durationWeeks
- Phases should be logical progression (e.g., Planning → Execution → Finishing)
- Use realistic Saudi market rates and durations

Return ONLY valid JSON. No explanations, no markdown formatting, just the JSON object.`;
}

/**
 * 🔍 Analyze Description
 * Check if user input is detailed enough to generate project
 */
export async function analyzeDescription(
  description: string,
  language: 'en' | 'ar' = 'en'
): Promise<DescriptionAnalysis> {
  const isArabic = language === 'ar';
  
  const prompt = `You are an expert construction project consultant in Saudi Arabia. 
The user provided this brief project description: "${description}"

${isArabic ? 'يجب أن ترد بالعربية فقط' : 'You must respond in English only'}

Your task: Generate 3-4 specific clarifying questions to get more details about the project.

Return ONLY valid JSON with this structure (no markdown, no extra text):
{
  "isDetailed": true,
  "questions": [
    "${isArabic ? 'ما هي المساحة التقريبية للمشروع؟' : 'What is the approximate area/size of the project?'}",
    "${isArabic ? 'ما هي الميزانية التقريبية المتاحة؟' : 'What is your approximate budget?'}",
    "${isArabic ? 'متى تريد أن يبدأ العمل؟' : 'When would you like the work to start?'}",
    "${isArabic ? 'هل هناك أي تفضيلات محددة للمواد أو الأسلوب؟' : 'Do you have any specific material or style preferences?'}"
  ]
}

Guidelines for questions:
- Ask about budget/cost expectations
- Ask about timeline/urgency
- Ask about materials/quality preferences
- Ask about specific requirements or constraints
- Ask about location/accessibility if relevant
- Keep questions clear, specific, and relevant to "${description}"
- Each question should help create accurate project phases and estimates`;

  const response = await askChatGPT(prompt);
  
  let cleaned = response.trim();
  cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  try {
    const parsed = JSON.parse(cleaned);
    return {
      isDetailed: parsed.isDetailed ?? true,
      questions: parsed.questions ?? [],
    };
  } catch (error) {
    console.error('❌ Error parsing analysis:', error);
    // Fallback questions
    return {
      isDetailed: true,
      questions: isArabic ? [
        'ما هي الميزانية التقريبية المتاحة؟',
        'ما هو الإطار الزمني المتوقع للمشروع؟',
        'هل هناك متطلبات محددة أو تفضيلات خاصة؟'
      ] : [
        'What is your approximate budget?',
        'What is the expected timeline for the project?',
        'Are there any specific requirements or preferences?'
      ],
    };
  }
}

/**
 * 🤖 Ask ChatGPT
 */
async function askChatGPT(prompt: string): Promise<string> {
  try {
    console.log('🤖 Calling ChatGPT API...');
    
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant for construction project estimation in Saudi Arabia.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ChatGPT API error:', errorText);
      throw new Error(`ChatGPT API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from ChatGPT');
    }

    const content = data.choices[0].message.content;
    console.log('✅ ChatGPT response received');
    
    return content;
  } catch (error) {
    console.error('❌ Error calling ChatGPT:', error);
    throw error;
  }
}

/**
 * 📦 Parse Project Request from ChatGPT Response
 */
function parseProjectRequest(response: string): ProjectRequest {
  // Extract JSON from response
  let jsonString = response.trim();
  
  // Remove markdown code blocks if present
  jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Find JSON object in response
  const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonString = jsonMatch[0];
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    
    // Parse phases if present
    const phases = parsed.phases && Array.isArray(parsed.phases)
      ? parsed.phases.map((phase: any) => ({
          title: phase.title || 'Phase',
          description: phase.description || '',
          durationWeeks: phase.durationWeeks || 1,
          amount: phase.amount || 0,
          percentage: phase.percentage || 0,
        }))
      : undefined;

    // Validate and provide defaults
    return {
      title: parsed.title || 'Project',
      description: parsed.description || '',
      category: parsed.category || 'General',
      budget: parsed.budget || 10000,
      durationWeeks: parsed.durationWeeks || 2,
      needsHouseVisit: parsed.needsHouseVisit !== undefined ? parsed.needsHouseVisit : false,
      needsBooking: parsed.needsBooking !== undefined ? parsed.needsBooking : false,
      address: parsed.address,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      phases,
    };
  } catch (error) {
    console.error('❌ Error parsing project request:', error);
    console.log('Response was:', response);
    
    // Return default project on parse error
    return {
      title: 'Project',
      description: 'Project description',
      category: 'General',
      budget: 10000,
      durationWeeks: 2,
      needsHouseVisit: false,
      needsBooking: false,
    };
  }
}

/**
 * 📋 Fetch Service Categories from Backend
 */
export async function fetchServiceCategories(): Promise<ServiceCategory[]> {
  try {
    console.log('📋 Fetching service categories...');
    
    const response = await fetch(`${API_BASE_URL}/services`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status}`);
    }

    const categories: ServiceCategory[] = await response.json();
    console.log(`✅ Fetched ${categories.length} service categories`);
    
    return categories;
  } catch (error) {
    console.error('❌ Error fetching service categories:', error);
    // Return fallback categories
    return [
      { id: 1, nameEn: 'Design Services', nameAr: 'خدمات التصميم', description: 'Design services', imageUrl: '' },
      { id: 2, nameEn: 'Contracting Services', nameAr: 'خدمات المقاولات', description: 'Contracting', imageUrl: '' },
      { id: 10, nameEn: 'General', nameAr: 'عام', description: 'General services', imageUrl: '' },
    ];
  }
}

/**
 * 🎯 Match Category Name to Service ID
 */
export function matchCategoryToServiceId(categoryName: string, services: ServiceCategory[], language: 'en' | 'ar' = 'en'): number {
  const searchTerm = categoryName.toLowerCase();
  
  // Try exact match first
  const exactMatch = services.find(s => 
    s.nameEn.toLowerCase() === searchTerm || 
    s.nameAr === categoryName
  );
  if (exactMatch) return exactMatch.id;
  
  // Try partial match
  const partialMatch = services.find(s => 
    s.nameEn.toLowerCase().includes(searchTerm) ||
    s.nameAr.includes(categoryName) ||
    s.description.toLowerCase().includes(searchTerm)
  );
  if (partialMatch) return partialMatch.id;
  
  // Default to first service or ID 10 (General)
  return services.find(s => s.id === 10)?.id || services[0]?.id || 1;
}

// Singleton instance for easier use
class AIService {
  async generateProject(description: string, language: 'en' | 'ar' = 'en', categories: ServiceCategory[] = []) {
    return generateProjectRequest(description, language, categories);
  }

  async enhance(description: string, language: 'en' | 'ar' = 'en') {
    return enhanceDescription(description, language);
  }

  async getServiceCategories() {
    return fetchServiceCategories();
  }

  matchServiceId(categoryName: string, services: ServiceCategory[], language: 'en' | 'ar' = 'en') {
    return matchCategoryToServiceId(categoryName, services, language);
  }
}

export default new AIService();
