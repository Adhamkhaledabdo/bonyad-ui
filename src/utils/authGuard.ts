import { Platform } from 'react-native';
import { storage } from './storage';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import { showError } from './alert';

interface ValidateTokenResponse {
  valid: boolean;
  message: string;
  userId?: number;
  phoneNumber?: string;
  role?: string;
  status?: string;
  user?: {
    id: number;
    userId: string;
    name: string;
    phoneNumber: string;
    role: string;
    status: string;
    [key: string]: any;
  };
}

/**
 * Validates a JWT token with the backend API
 * @param token The JWT token to validate
 * @returns Promise with validation result
 */
export const validateToken = async (token: string): Promise<ValidateTokenResponse | null> => {
  try {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.AUTH.VALIDATE_TOKEN), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (response.ok && data.valid) {
      console.log('✅ Token validated successfully');
      return data;
    } else {
      console.log('❌ Token validation failed:', data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error validating token:', error);
    return null;
  }
};

/**
 * Checks if user is authenticated and validates token
 * Returns user data if valid, null if invalid
 */
export const checkAuthentication = async (): Promise<{
  token: string;
  userId: number;
  role: string;
  user: any;
} | null> => {
  try {
    // Get token from storage
    const token = await storage.getAuthToken();
    
    if (!token) {
      console.log('❌ No token found in storage');
      return null;
    }

    // Validate token with API
    const validationResult = await validateToken(token);

    if (!validationResult || !validationResult.valid) {
      console.log('❌ Token is invalid or expired');
      // Clear invalid token from storage
      await storage.clearAuthData();
      return null;
    }

    // Return authenticated user data
    return {
      token,
      userId: validationResult.userId || validationResult.user?.id || 0,
      role: validationResult.role || validationResult.user?.role || '',
      user: validationResult.user || {},
    };
  } catch (error) {
    console.error('❌ Error checking authentication:', error);
    return null;
  }
};
