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
 * Checks if user is authenticated
 * Validates token with backend API and returns user data if valid
 * Returns null if no token exists or token is invalid
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

    // Validate token with backend API
    const validationResult = await validateToken(token);
    
    if (!validationResult || !validationResult.valid) {
      console.log('❌ Token validation failed - clearing invalid token');
      // Clear invalid token from storage
      await storage.clearAuthData();
      return null;
    }

    // Token is valid - get user data from validation result or storage
    const userId = validationResult.userId || validationResult.user?.id || await storage.getUserId() || 0;
    const role = validationResult.role || validationResult.user?.role || await storage.getUserRole() || '';
    
    // Determine role from validation result or storage
    let userRole = role.toUpperCase();
    if (!userRole && token.includes('user')) {
      userRole = 'USER';
    } else if (!userRole && token.includes('technician')) {
      userRole = 'TECHNICIAN';
    } else if (!userRole) {
      userRole = 'USER'; // Default to USER
    }

    console.log('✅ Token validated successfully');
    console.log('   User ID:', userId);
    console.log('   Role:', userRole);
    
    return {
      token,
      userId,
      role: userRole,
      user: validationResult.user || {
        id: userId,
        role: userRole,
        phoneNumber: validationResult.phoneNumber || '',
        name: validationResult.user?.name || '',
        status: validationResult.status || validationResult.user?.status || 'ACTIVE',
      },
    };
  } catch (error) {
    console.error('❌ Error checking authentication:', error);
    // On error, clear potentially invalid token
    await storage.clearAuthData();
    return null;
  }
};
