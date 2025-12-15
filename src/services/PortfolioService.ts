import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { storage } from '../utils/storage';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/api';

/**
 * Check if user has a portfolio
 * @returns Promise with hasPortfolio boolean
 */
export const checkHasPortfolio = async (): Promise<boolean> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const url = `${API_BASE_URL}/users/profile`;
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 [PortfolioService] Checking portfolio status...');
    console.log('🔍 [PortfolioService] URL:', url);
    console.log('═══════════════════════════════════════════════════════════');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const status = response.status;
    console.log('📥 [PortfolioService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [PortfolioService] Error response:', errorText);
      throw new Error(`Failed to check portfolio: ${status}`);
    }
    
    const data = await response.json();
    const hasPortfolio = data.hasPortfolio || false;
    
    console.log('✅ [PortfolioService] Has Portfolio:', hasPortfolio);
    console.log('═══════════════════════════════════════════════════════════');
    
    return hasPortfolio;
    
  } catch (error: any) {
    console.error('❌ [PortfolioService] Check portfolio error:', error);
    throw error;
  }
};

/**
 * Create a new portfolio
 * @returns Promise with created portfolio data
 */
export const createPortfolio = async (): Promise<any> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const url = `${API_BASE_URL}/portfolios/create`;
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📤 [PortfolioService] Creating portfolio...');
    console.log('📤 [PortfolioService] URL:', url);
    console.log('═══════════════════════════════════════════════════════════');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const status = response.status;
    console.log('📥 [PortfolioService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [PortfolioService] Error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to create portfolio: ${status}`);
      } catch {
        throw new Error(`Failed to create portfolio: ${status}`);
      }
    }
    
    const portfolio = await response.json();
    console.log('✅ [PortfolioService] Portfolio created successfully:', portfolio.id);
    console.log('═══════════════════════════════════════════════════════════');
    
    return portfolio;
    
  } catch (error: any) {
    console.error('❌ [PortfolioService] Create portfolio error:', error);
    throw error;
  }
};

/**
 * Upload a photo to the portfolio
 * @param imageAsset - Image asset from ImagePicker
 * @returns Promise with the photo URL
 */
export const uploadPortfolioPhoto = async (imageAsset: ImagePicker.ImagePickerAsset): Promise<string> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const url = `${API_BASE_URL}/portfolios/projects/upload-photo`;
    
    // Determine MIME type - use from asset if available, otherwise detect from URI
    let mimeType = 'image/jpeg';
    if (imageAsset.mimeType) {
      mimeType = imageAsset.mimeType;
    } else if (imageAsset.uri) {
      const uriLower = imageAsset.uri.toLowerCase();
      if (uriLower.includes('.png')) mimeType = 'image/png';
      else if (uriLower.includes('.gif')) mimeType = 'image/gif';
      else if (uriLower.includes('.webp')) mimeType = 'image/webp';
    }
    
    // Generate a proper filename with extension
    const extension = mimeType.split('/')[1] || 'jpg';
    const timestamp = Date.now();
    const filename = `portfolio_${timestamp}.${extension}`;
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📤 [PortfolioService] Uploading photo...');
    console.log('📤 [PortfolioService] URL:', url);
    console.log('📤 [PortfolioService] Platform:', Platform.OS);
    console.log('📤 [PortfolioService] Image URI:', imageAsset.uri?.substring(0, 100) + '...');
    console.log('📤 [PortfolioService] MIME Type:', mimeType);
    console.log('📤 [PortfolioService] Filename:', filename);
    console.log('═══════════════════════════════════════════════════════════');
    
    // Create form data
    const formData = new FormData();
    
    // Handle file differently for web vs mobile
    if (Platform.OS === 'web') {
      // For web, we need to fetch the blob and append it properly
      try {
        const imageResponse = await fetch(imageAsset.uri);
        const blob = await imageResponse.blob();
        
        // Create a File object from blob for better compatibility
        const file = new File([blob], filename, { type: mimeType });
        formData.append('file', file);
        
        console.log('📤 [PortfolioService] Web: Created File object, size:', file.size);
      } catch (blobError) {
        console.error('❌ [PortfolioService] Error creating blob/file:', blobError);
        throw new Error('Failed to process image for upload');
      }
    } else {
      // For mobile (Android/iOS), use the URI directly with proper structure
      formData.append('file', {
        uri: imageAsset.uri,
        type: mimeType,
        name: filename,
      } as any);
      
      console.log('📤 [PortfolioService] Mobile: Using URI directly');
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type - let fetch/FormData handle the boundary
      },
      body: formData,
    });
    
    const status = response.status;
    console.log('📥 [PortfolioService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [PortfolioService] Error response:', errorText);
      throw new Error(`Upload failed: ${status} - ${errorText}`);
    }
    
    const data = await response.json();
    const fullUrl = data.photoUrl?.startsWith('http') 
      ? data.photoUrl 
      : `${API_BASE_URL.replace('/api', '')}${data.photoUrl}`;
    
    console.log('✅ [PortfolioService] Photo uploaded:', fullUrl);
    console.log('═══════════════════════════════════════════════════════════');
    
    return fullUrl;
    
  } catch (error: any) {
    console.error('❌ [PortfolioService] Photo upload error:', error);
    throw error;
  }
};

export interface PortfolioProjectData {
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  clientName?: string;
  projectValue?: number;
  location?: string;
  photos?: string[];
  isPublic?: boolean;
}

/**
 * Add a new project to portfolio
 * @param projectData - Project details
 * @returns Promise with created project data
 */
export const addPortfolioProject = async (projectData: PortfolioProjectData): Promise<any> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const url = `${API_BASE_URL}/portfolios/projects/add`;
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📤 [PortfolioService] Adding portfolio project...');
    console.log('📤 [PortfolioService] URL:', url);
    console.log('📤 [PortfolioService] Data:', JSON.stringify(projectData, null, 2));
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
    console.log('📥 [PortfolioService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [PortfolioService] Error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to add project: ${status}`);
      } catch {
        throw new Error(`Failed to add project: ${status}`);
      }
    }
    
    const project = await response.json();
    console.log('✅ [PortfolioService] Project added successfully:', project.id);
    console.log('═══════════════════════════════════════════════════════════');
    
    return project;
    
  } catch (error: any) {
    console.error('❌ [PortfolioService] Add project error:', error);
    throw error;
  }
};

/**
 * Update an existing portfolio project
 * @param projectId - Project ID
 * @param projectData - Updated project details
 * @returns Promise with updated project data
 */
export const updatePortfolioProject = async (
  projectId: number,
  projectData: Partial<PortfolioProjectData>
): Promise<any> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const url = `${API_BASE_URL}/portfolios/projects/${projectId}`;
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📤 [PortfolioService] Updating project ${projectId}...`);
    console.log('📤 [PortfolioService] URL:', url);
    console.log('📤 [PortfolioService] Data:', JSON.stringify(projectData, null, 2));
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
    console.log('📥 [PortfolioService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [PortfolioService] Error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to update project: ${status}`);
      } catch {
        throw new Error(`Failed to update project: ${status}`);
      }
    }
    
    const project = await response.json();
    console.log('✅ [PortfolioService] Project updated successfully');
    console.log('═══════════════════════════════════════════════════════════');
    
    return project;
    
  } catch (error: any) {
    console.error('❌ [PortfolioService] Update project error:', error);
    throw error;
  }
};

/**
 * Delete a portfolio project
 * @param projectId - Project ID
 * @returns Promise with success status
 */
export const deletePortfolioProject = async (projectId: number): Promise<void> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const url = `${API_BASE_URL}/portfolios/projects/${projectId}`;
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🗑️ [PortfolioService] Deleting project ${projectId}...`);
    console.log('🗑️ [PortfolioService] URL:', url);
    console.log('═══════════════════════════════════════════════════════════');
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const status = response.status;
    console.log('📥 [PortfolioService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [PortfolioService] Error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to delete project: ${status}`);
      } catch {
        throw new Error(`Failed to delete project: ${status}`);
      }
    }
    
    const data = await response.json();
    console.log('✅ [PortfolioService]', data.message || 'Project deleted successfully');
    console.log('═══════════════════════════════════════════════════════════');
    
  } catch (error: any) {
    console.error('❌ [PortfolioService] Delete project error:', error);
    throw error;
  }
};

/**
 * Generate portfolio PDF
 * @param options - PDF generation options
 * @returns Promise with PDF info
 */
export interface GeneratePDFOptions {
  regenerate?: boolean;
  companyName?: string;
  preferredStyle?: string; // "hero-grid", "cards", "grid", "timeline", "masonry", or ""
  headerColor?: string; // Hex color code
  textColor?: string; // Hex color code
  backgroundColor?: string; // Hex color code
}

export interface PortfolioPDFInfo {
  id: number;
  userId: number;
  pdfUrl: string;
  qrCodeUrl: string;
  publicUrl: string;
  companyName: string | null;
  generatedAt: string;
  isActive: boolean;
}

export const generatePortfolioPDF = async (options: GeneratePDFOptions = {}): Promise<PortfolioPDFInfo> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const url = `${API_BASE_URL}/portfolios/generate-pdf`;
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📄 [PortfolioService] Generating portfolio PDF...');
    console.log('📄 [PortfolioService] URL:', url);
    console.log('📄 [PortfolioService] Options:', JSON.stringify(options, null, 2));
    console.log('═══════════════════════════════════════════════════════════');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        regenerate: options.regenerate === true, // Explicitly check for true
        companyName: options.companyName || null,
        preferredStyle: options.preferredStyle || null,
        headerColor: options.headerColor || null,
        textColor: options.textColor || null,
        backgroundColor: options.backgroundColor || null,
      }),
    });
    
    const status = response.status;
    console.log('📥 [PortfolioService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [PortfolioService] Error response:', errorText);
      throw new Error(`Failed to generate PDF: ${status}`);
    }
    
    const pdfInfo = await response.json();
    console.log('✅ [PortfolioService] PDF generated successfully');
    console.log('═══════════════════════════════════════════════════════════');
    
    return pdfInfo;
    
  } catch (error: any) {
    console.error('❌ [PortfolioService] Generate PDF error:', error);
    throw error;
  }
};

/**
 * Get my PDF info
 * @returns Promise with PDF info or null if not generated
 */
export const getMyPDFInfo = async (): Promise<PortfolioPDFInfo | null> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const url = `${API_BASE_URL}/portfolios/my-pdf`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.status === 404) {
      return null; // PDF not generated yet
    }
    
    if (!response.ok) {
      throw new Error(`Failed to get PDF info: ${response.status}`);
    }
    
    const pdfInfo = await response.json();
    return pdfInfo;
    
  } catch (error: any) {
    if (error.message?.includes('404')) {
      return null;
    }
    console.error('❌ [PortfolioService] Get PDF info error:', error);
    throw error;
  }
};

/**
 * Get public portfolio by user ID
 * @param userId - User ID
 * @returns Promise with portfolio data
 */
export const getPublicPortfolio = async (userId: number): Promise<any> => {
  try {
    const url = `${API_BASE_URL}/portfolios/user/${userId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get public portfolio: ${response.status}`);
    }
    
    const portfolio = await response.json();
    return portfolio;
    
  } catch (error: any) {
    console.error('❌ [PortfolioService] Get public portfolio error:', error);
    throw error;
  }
};

/**
 * Get public PDF info by user ID
 * @param userId - User ID
 * @returns Promise with PDF info or null
 */
export const getPublicPDFInfo = async (userId: number): Promise<PortfolioPDFInfo | null> => {
  try {
    const url = `${API_BASE_URL}/portfolios/pdf-info/${userId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.status === 404) {
      return null; // PDF not found
    }
    
    if (!response.ok) {
      throw new Error(`Failed to get public PDF info: ${response.status}`);
    }
    
    const pdfInfo = await response.json();
    return pdfInfo;
    
  } catch (error: any) {
    if (error.message?.includes('404')) {
      return null;
    }
    console.error('❌ [PortfolioService] Get public PDF info error:', error);
    throw error;
  }
};

/**
 * Get QR code image URL for user
 * @param userId - User ID
 * @returns QR code image URL
 */
export const getQRCodeUrl = (userId: number): string => {
  return `${API_BASE_URL}/portfolios/qr-code/${userId}`;
};

