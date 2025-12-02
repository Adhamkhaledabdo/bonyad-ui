import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import { storage } from '../utils/storage';

/**
 * Request password reset OTP
 * @param phoneNumber - User's phone number
 * @param role - User role (USER or TECHNICIAN)
 * @returns Promise with success message
 */
export const forgotPassword = async (phoneNumber: string, role: 'USER' | 'TECHNICIAN'): Promise<{ message: string }> => {
  try {
    const url = buildApiUrl(API_ENDPOINTS.AUTH.FORGOT_PASSWORD);
    
    console.log('📤 [AuthService] Requesting password reset OTP...');
    console.log('   Phone:', phoneNumber);
    console.log('   Role:', role);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        role,
      }),
    });
    
    const status = response.status;
    console.log('📥 [AuthService] Response Status:', status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [AuthService] Error:', errorData);
      throw new Error(errorData.message || `Failed to request password reset: ${status}`);
    }
    
    const data = await response.json();
    console.log('✅ [AuthService] OTP sent successfully');
    return data;
  } catch (error: any) {
    console.error('❌ [AuthService] Forgot password error:', error);
    throw error;
  }
};

/**
 * Resend password reset OTP
 * @param phoneNumber - User's phone number
 * @param role - User role (USER or TECHNICIAN)
 * @returns Promise with success message
 */
export const resendForgotPasswordOTP = async (phoneNumber: string, role: 'USER' | 'TECHNICIAN'): Promise<{ message: string }> => {
  try {
    const url = 'https://bonyad-hub.com/api/auth/forgot-password/resend';
    
    console.log('📤 [AuthService] Resending password reset OTP...');
    console.log('   Phone:', phoneNumber);
    console.log('   Role:', role);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        role,
      }),
    });
    
    const status = response.status;
    console.log('📥 [AuthService] Response Status:', status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [AuthService] Error:', errorData);
      throw new Error(errorData.message || `Failed to resend OTP: ${status}`);
    }
    
    const data = await response.json();
    console.log('✅ [AuthService] OTP resent successfully');
    return data;
  } catch (error: any) {
    console.error('❌ [AuthService] Resend OTP error:', error);
    throw error;
  }
};

/**
 * Reset password with OTP
 * @param phoneNumber - User's phone number
 * @param role - User role (USER or TECHNICIAN)
 * @param otpCode - OTP code received via SMS
 * @param newPassword - New password
 * @param confirmPassword - Confirm new password
 * @returns Promise with success message
 */
export const resetPassword = async (
  phoneNumber: string,
  role: 'USER' | 'TECHNICIAN',
  otpCode: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ message: string }> => {
  try {
    const url = 'https://bonyad-hub.com/api/auth/reset-password';
    
    console.log('📤 [AuthService] Resetting password...');
    console.log('   Phone:', phoneNumber);
    console.log('   Role:', role);
    
    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        role,
        otpCode,
        newPassword,
        confirmPassword,
      }),
    });
    
    const status = response.status;
    console.log('📥 [AuthService] Response Status:', status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [AuthService] Error:', errorData);
      throw new Error(errorData.message || `Failed to reset password: ${status}`);
    }
    
    const data = await response.json();
    console.log('✅ [AuthService] Password reset successfully');
    return data;
  } catch (error: any) {
    console.error('❌ [AuthService] Reset password error:', error);
    throw error;
  }
};

