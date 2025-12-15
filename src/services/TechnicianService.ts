import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrlWithParams, API_BASE_URL } from '../config/api';

/**
 * Technician Profile Interface
 */
export interface TechnicianProfile {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  profileImage?: string;
  description?: string;
  averageRating: number;
  totalReviews: number;
  completedProjects: number;
  activeBids: number;
  yearsOfExperience?: number;
  services?: TechnicianService[];
  reviews?: TechnicianReview[];
}

/**
 * Technician Service Interface
 */
export interface TechnicianService {
  id: number;
  nameEn: string;
  nameAr?: string;
  description: string;
  imageUrl?: string;
}

/**
 * Technician Review Interface
 */
export interface TechnicianReview {
  id: number;
  reviewerName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

/**
 * Technician Portfolio Interface
 */
export interface TechnicianPortfolio {
  id: number;
  userId: number;
  bio?: string;
  yearsOfExperience?: number;
  isPublic: boolean;
  pastProjects?: PortfolioProject[];
}

/**
 * Portfolio Project Interface
 */
export interface PortfolioProject {
  id: number;
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  projectValue?: number;
  clientName?: string;
  photos?: string[];
  files?: string[]; // Alternative field name for photos (used in owner-edit endpoint)
  isPublic?: boolean;
}

/**
 * Fetch complete technician profile
 * @param technicianId - The technician's user ID
 * @returns Promise with technician profile data
 */
export const getTechnicianProfile = async (technicianId: number): Promise<TechnicianProfile> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    // Use the user profile endpoint with technician ID
    const url = buildApiUrlWithParams(API_ENDPOINTS.USER.PROFILE_BY_ID, { id: technicianId });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 [TechnicianService] Fetching technician profile...');
    console.log('🔍 [TechnicianService] Technician ID:', technicianId);
    console.log('🔍 [TechnicianService] URL:', url);
    console.log('═══════════════════════════════════════════════════════════');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const status = response.status;
    console.log('📥 [TechnicianService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [TechnicianService] Error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to fetch profile: ${status}`);
      } catch {
        throw new Error(`Failed to fetch profile: ${status}`);
      }
    }
    
    const profile = await response.json();
    
    console.log('✅ [TechnicianService] Profile loaded for:', profile.name);
    console.log('✅ [TechnicianService] Services:', profile.services?.length || 0);
    console.log('✅ [TechnicianService] Reviews:', profile.totalReviews || 0);
    console.log('✅ [TechnicianService] Rating:', profile.averageRating || 0);
    console.log('✅ [TechnicianService] Completed Projects:', profile.completedProjects || 0);
    console.log('═══════════════════════════════════════════════════════════');
    
    return profile;
    
  } catch (error: any) {
    console.error('❌ [TechnicianService] Error fetching technician profile:', error);
    throw error;
  }
};

/**
 * Fetch technician portfolio
 * @param technicianId - The technician's user ID
 * @returns Promise with technician portfolio data or null if not found
 */
export const getTechnicianPortfolio = async (technicianId: number): Promise<TechnicianPortfolio | null> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const url = buildApiUrlWithParams(API_ENDPOINTS.PORTFOLIO.BY_USER, { userId: technicianId });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📤 [TechnicianService] Fetching technician portfolio...');
    console.log('📤 [TechnicianService] Technician ID:', technicianId);
    console.log('📤 [TechnicianService] URL:', url);
    console.log('═══════════════════════════════════════════════════════════');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const status = response.status;
    console.log('📥 [TechnicianService] Portfolio Response Status:', status);
    
    if (!response.ok) {
      if (status === 404) {
        // No portfolio found - this is not an error
        console.log('ℹ️ [TechnicianService] No portfolio found for technician:', technicianId);
        return null;
      }
      
      const errorText = await response.text();
      console.error('❌ [TechnicianService] Error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to fetch portfolio: ${status}`);
      } catch {
        throw new Error(`Failed to fetch portfolio: ${status}`);
      }
    }
    
    const portfolio = await response.json();
    
    console.log('✅ [TechnicianService] Portfolio loaded');
    console.log('✅ [TechnicianService] Past Projects:', portfolio.pastProjects?.length || 0);
    console.log('✅ [TechnicianService] Public:', portfolio.isPublic || false);
    console.log('✅ [TechnicianService] Years Experience:', portfolio.yearsOfExperience || 0);
    console.log('═══════════════════════════════════════════════════════════');
    
    return portfolio;
    
  } catch (error: any) {
    console.error('❌ [TechnicianService] Error fetching portfolio:', error);
    throw error;
  }
};

/**
 * Create a new portfolio project
 * @param projectData - Portfolio project data
 * @returns Promise with created project data
 */
export const createPortfolioProject = async (projectData: {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location?: string;
  projectValue?: number;
  clientName?: string;
  photos?: string[];
  isPublic?: boolean;
}): Promise<PortfolioProject> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const url = `${API_BASE_URL}${API_ENDPOINTS.PORTFOLIO.ADD_PROJECT}`;
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📤 [TechnicianService] Creating portfolio project...');
    console.log('📤 [TechnicianService] URL:', url);
    console.log('📤 [TechnicianService] Title:', projectData.title);
    console.log('═══════════════════════════════════════════════════════════');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });
    
    const status = response.status;
    console.log('📥 [TechnicianService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [TechnicianService] Error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to create portfolio project: ${status}`);
      } catch {
        throw new Error(`Failed to create portfolio project: ${status}`);
      }
    }
    
    const project = await response.json();
    console.log('✅ [TechnicianService] Portfolio project created:', project.id);
    console.log('═══════════════════════════════════════════════════════════');
    
    return project;
    
  } catch (error: any) {
    console.error('❌ [TechnicianService] Error creating portfolio project:', error);
    throw error;
  }
};

/**
 * Update a portfolio project
 * @param projectId - Portfolio project ID
 * @param projectData - Updated portfolio project data
 * @returns Promise with updated project data
 */
export const updatePortfolioProject = async (
  projectId: number,
  projectData: {
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    projectValue?: number;
    clientName?: string;
    photos?: string[];
    isPublic?: boolean;
  }
): Promise<PortfolioProject> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const url = buildApiUrlWithParams(API_ENDPOINTS.PORTFOLIO.UPDATE_PROJECT, { projectId });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📤 [TechnicianService] Updating portfolio project...');
    console.log('📤 [TechnicianService] URL:', url);
    console.log('📤 [TechnicianService] Project ID:', projectId);
    console.log('═══════════════════════════════════════════════════════════');
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });
    
    const status = response.status;
    console.log('📥 [TechnicianService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [TechnicianService] Error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to update portfolio project: ${status}`);
      } catch {
        throw new Error(`Failed to update portfolio project: ${status}`);
      }
    }
    
    const project = await response.json();
    console.log('✅ [TechnicianService] Portfolio project updated:', project.id);
    console.log('═══════════════════════════════════════════════════════════');
    
    return project;
    
  } catch (error: any) {
    console.error('❌ [TechnicianService] Error updating portfolio project:', error);
    throw error;
  }
};

/**
 * Delete a portfolio project
 * @param projectId - Portfolio project ID
 * @returns Promise with success status
 */
export const deletePortfolioProject = async (projectId: number): Promise<void> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const url = buildApiUrlWithParams(API_ENDPOINTS.PORTFOLIO.DELETE_PROJECT, { projectId });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🗑️ [TechnicianService] Deleting portfolio project...');
    console.log('🗑️ [TechnicianService] URL:', url);
    console.log('🗑️ [TechnicianService] Project ID:', projectId);
    console.log('═══════════════════════════════════════════════════════════');
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const status = response.status;
    console.log('📥 [TechnicianService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [TechnicianService] Error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to delete portfolio project: ${status}`);
      } catch {
        throw new Error(`Failed to delete portfolio project: ${status}`);
      }
    }
    
    console.log('✅ [TechnicianService] Portfolio project deleted:', projectId);
    console.log('═══════════════════════════════════════════════════════════');
    
  } catch (error: any) {
    console.error('❌ [TechnicianService] Error deleting portfolio project:', error);
    throw error;
  }
};

/**
 * Fetch technicians by service ID
 * @param serviceId - The service ID to filter by
 * @returns Promise with array of technicians
 */
export const getTechniciansByService = async (serviceId: number): Promise<any[]> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const url = `${API_BASE_URL}/users?role=TECHNICIAN&serviceId=${serviceId}`;
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 [TechnicianService] Fetching technicians for service:', serviceId);
    console.log('🔍 [TechnicianService] URL:', url);
    console.log('═══════════════════════════════════════════════════════════');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const status = response.status;
    console.log('📥 [TechnicianService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [TechnicianService] Error Response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to fetch technicians: ${status}`);
      } catch {
        throw new Error(`Failed to fetch technicians: ${status}`);
      }
    }
    
    const technicians = await response.json();
    
    console.log('✅ [TechnicianService] Fetched technicians:', technicians.length);
    if (technicians.length > 0) {
      console.log('✅ [TechnicianService] First technician:', technicians[0]?.name);
    }
    console.log('═══════════════════════════════════════════════════════════');
    
    return technicians;
    
  } catch (error: any) {
    console.error('❌ [TechnicianService] Error fetching technicians:', error);
    throw error;
  }
};

/**
 * Fetch all technicians (no filter)
 * @returns Promise with array of technicians
 */
export const getAllTechnicians = async (): Promise<any[]> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const url = `${API_BASE_URL}/users?role=TECHNICIAN`;
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 [TechnicianService] Fetching all technicians...');
    console.log('🔍 [TechnicianService] URL:', url);
    console.log('═══════════════════════════════════════════════════════════');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const status = response.status;
    console.log('📥 [TechnicianService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [TechnicianService] Error Response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to fetch technicians: ${status}`);
      } catch {
        throw new Error(`Failed to fetch technicians: ${status}`);
      }
    }
    
    const technicians = await response.json();
    
    console.log('✅ [TechnicianService] Fetched technicians:', technicians.length);
    console.log('═══════════════════════════════════════════════════════════');
    
    return technicians;
    
  } catch (error: any) {
    console.error('❌ [TechnicianService] Error fetching technicians:', error);
    throw error;
  }
};

