import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';

/**
 * Submit a review for a technician
 * @param technicianId - The technician's user ID
 * @param rating - Rating from 1-5
 * @param comment - Review comment
 * @returns Promise with success status and message
 */
export const submitTechnicianReview = async (
  technicianId: number,
  rating: number,
  comment: string,
  projectId?: number
) => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const url = buildApiUrl(API_ENDPOINTS.REVIEWS.CREATE);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📤 [ReviewService] Submitting review for technician');
    console.log('📤 [ReviewService] Reviewed User ID:', technicianId);
    console.log('📤 [ReviewService] Rating:', rating);
    console.log('📤 [ReviewService] Comment:', comment);
    console.log('📤 [ReviewService] URL:', url);
    console.log('═══════════════════════════════════════════════════════════');
    
    const requestBody: Record<string, any> = {
      reviewedUserId: technicianId,
      rating: parseFloat(rating.toString()),
      comment: comment,
    };

    if (projectId) {
      requestBody.projectId = projectId;
    }
    
    console.log('📤 [ReviewService] Request Body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const status = response.status;
    console.log('📥 [ReviewService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ReviewService] Server Error:', errorText);
      throw new Error(`Failed to submit review: ${status}`);
    }
    
    const data = await response.json();
    console.log('✅ [ReviewService] Review submitted successfully');
    console.log('✅ [ReviewService] Response Data:', data);
    console.log('═══════════════════════════════════════════════════════════');
    
    return {
      success: true,
      message: 'Review submitted successfully',
      data,
    };
    
  } catch (error: any) {
    console.error('❌ [ReviewService] Error submitting review:', error);
    throw error;
  }
};

/**
 * Get reviews for a technician
 * @param technicianId - The technician's user ID
 * @returns Promise with array of reviews
 */
export const getTechnicianReviews = async (technicianId: number) => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const url = buildApiUrlWithParams(API_ENDPOINTS.REVIEWS.BY_USER, {
      userId: technicianId,
    });
    
    console.log('🔍 [ReviewService] Fetching reviews for technician:', technicianId);
    console.log('🔍 [ReviewService] URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ReviewService] Failed to fetch reviews:', errorText);
      throw new Error('Failed to fetch reviews');
    }
    
    const reviews = await response.json();
    console.log('✅ [ReviewService] Loaded reviews:', reviews.length);
    
    return reviews;
    
  } catch (error: any) {
    console.error('❌ [ReviewService] Error fetching reviews:', error);
    throw error;
  }
};

export interface ProjectReviewStatus {
  hasReview: boolean;
  review?: any;
}

export const getProjectReviewStatus = async (projectId: number): Promise<ProjectReviewStatus> => {
  try {
    const token = await storage.getAuthToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    const url = buildApiUrlWithParams(API_ENDPOINTS.REVIEWS.STATUS_BY_PROJECT, {
      projectId,
    });

    console.log('🔍 [ReviewService] Checking project review status:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ReviewService] Failed to fetch review status:', errorText);
      throw new Error('Failed to fetch review status');
    }

    const data = await response.json();
    console.log('✅ [ReviewService] Review status response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error: any) {
    console.error('❌ [ReviewService] Error fetching review status:', error);
    throw error;
  }
};

export const updateReview = async (reviewId: number, rating: number, comment: string, projectId?: number) => {
  try {
    const token = await storage.getAuthToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    const url = buildApiUrl(API_ENDPOINTS.REVIEWS.REVIEW_DETAIL.replace(':reviewId', String(reviewId)));

    const body: Record<string, any> = {
      rating: parseFloat(rating.toString()),
      comment,
    };

    if (projectId) {
      body.projectId = projectId;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ReviewService] Failed to update review:', errorText);
      throw new Error('Failed to update review');
    }

    return await response.json();
  } catch (error: any) {
    console.error('❌ [ReviewService] Error updating review:', error);
    throw error;
  }
};

export const deleteReview = async (reviewId: number) => {
  try {
    const token = await storage.getAuthToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    const url = buildApiUrl(API_ENDPOINTS.REVIEWS.REVIEW_DETAIL.replace(':reviewId', String(reviewId)));

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ReviewService] Failed to delete review:', errorText);
      throw new Error('Failed to delete review');
    }

    return true;
  } catch (error: any) {
    console.error('❌ [ReviewService] Error deleting review:', error);
    throw error;
  }
};

