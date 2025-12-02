import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';

/**
 * Complete a project by marking it as COMPLETED
 * @param projectId - The ID of the project to complete
 * @returns Promise with the completed project data
 */
export const completeProject = async (projectId: number) => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const url = buildApiUrlWithParams(API_ENDPOINTS.PROJECTS.COMPLETE, {
      id: projectId,
    });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ [ProjectService] Marking project as complete');
    console.log('✅ [ProjectService] Project ID:', projectId);
    console.log('✅ [ProjectService] URL:', url);
    console.log('✅ [ProjectService] Method: POST');
    console.log('═══════════════════════════════════════════════════════════');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const status = response.status;
    console.log('📥 [ProjectService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ProjectService] Error response:', errorText);
      
      // Parse error message
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Failed to complete project: ${status}`);
      } catch {
        throw new Error(`Server error: ${status}`);
      }
    }
    
    const data = await response.json();
    console.log('📥 [ProjectService] Response Data:', data);
    console.log(`✅ [ProjectService] Project ${projectId} marked as COMPLETED`);
    console.log('═══════════════════════════════════════════════════════════');
    
    return data;
    
  } catch (error: any) {
    console.error('❌ [ProjectService] Error completing project:', error);
    throw error;
  }
};

/**
 * Complete a project by technician - marks project as COMPLETED
 * @param projectId - The ID of the project to complete
 * @returns Promise with success status and message
 */
export const completeProjectByTechnician = async (projectId: number) => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const url = buildApiUrlWithParams(API_ENDPOINTS.PROJECTS.COMPLETE, {
      id: projectId,
    });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ [ProjectService] Technician marking project as complete');
    console.log('📤 [ProjectService] API URL:', url);
    console.log('📤 [ProjectService] Method: POST');
    console.log('📤 [ProjectService] Token:', token.substring(0, 20) + '...');
    console.log('═══════════════════════════════════════════════════════════');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const status = response.status;
    console.log('📥 [ProjectService] Status Code:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ProjectService] Server returned error:', errorText);
      throw new Error(`Failed to complete project: ${status}`);
    }
    
    const responseText = await response.text();
    console.log('📥 [ProjectService] Response Body:', responseText);
    console.log(`✅ [ProjectService] Project ${projectId} marked as COMPLETED by technician`);
    console.log('═══════════════════════════════════════════════════════════');
    
    return {
      success: true,
      message: 'Project completed successfully',
    };
    
  } catch (error: any) {
    console.error('❌ [ProjectService] Error completing project:', error);
    throw error;
  }
};

