import { storage } from '../utils/storage';
import { buildApiUrlWithParams, buildApiUrl } from '../config/api';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Change password (requires old password)
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<object>}
 */
export const changePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  try {
    const token = await storage.getAuthToken();
    const userId = await storage.getUserId();
    
    if (!token || !userId) {
      throw new Error('No authentication data');
    }
    
    const url = buildApiUrlWithParams('/users/:userId/change-password', { userId: String(userId) });
    
    console.log('🔐 [ProfileService] Changing password...');
    console.log('   User ID:', userId);
    console.log('   URL:', url);
    
    // Validate inputs
    if (!oldPassword || !newPassword) {
      throw new Error('All fields are required');
    }
    
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        oldPassword: oldPassword,
        newPassword: newPassword
      })
    });
    
    const status = response.status;
    console.log('📥 [ProfileService] Response Status:', status);
    
    const data = await response.json();
    console.log('📥 [ProfileService] Response:', data);
    
    if (status === 200) {
      console.log('✅ [ProfileService] Password changed successfully');
      return {
        success: true,
        message: data.message || 'Password changed successfully'
      };
    } else {
      throw new Error(data.message || 'Failed to change password');
    }
    
  } catch (error: any) {
    console.error('❌ [ProfileService] Error changing password:', error);
    throw error;
  }
};

/**
 * Request phone number change (sends OTP to new number)
 * @param {string} newPhoneNumber - New phone number (9 digits)
 * @returns {Promise<object>}
 */
export const requestPhoneChange = async (newPhoneNumber: string): Promise<{ success: boolean; message: string; phoneNumber: string }> => {
  try {
    const token = await storage.getAuthToken();
    const userId = await storage.getUserId();
    
    if (!token || !userId) {
      throw new Error('No authentication data');
    }
    
    const url = buildApiUrlWithParams('/users/:userId/change-phone-request', { userId: String(userId) });
    
    console.log('📱 [ProfileService] Requesting phone change...');
    console.log('   User ID:', userId);
    console.log('   New Phone:', newPhoneNumber);
    console.log('   URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        newPhoneNumber: newPhoneNumber
      })
    });
    
    const status = response.status;
    console.log('📥 [ProfileService] Response Status:', status);
    
    const data = await response.json();
    console.log('📥 [ProfileService] Response:', data);
    
    if (status === 200) {
      console.log('✅ [ProfileService] OTP sent to new phone number');
      return {
        success: true,
        message: data.message || 'OTP sent successfully',
        phoneNumber: newPhoneNumber
      };
    } else {
      throw new Error(data.message || 'Failed to send OTP');
    }
    
  } catch (error: any) {
    console.error('❌ [ProfileService] Error requesting phone change:', error);
    throw error;
  }
};

/**
 * Verify phone number change with OTP
 * @param {string} otpCode - 4-digit OTP
 * @returns {Promise<object>}
 */
export const verifyPhoneChange = async (otpCode: string): Promise<{ success: boolean; message: string; newPhoneNumber?: string }> => {
  try {
    const token = await storage.getAuthToken();
    const userId = await storage.getUserId();
    
    if (!token || !userId) {
      throw new Error('No authentication data');
    }
    
    const url = buildApiUrlWithParams('/users/:userId/change-phone-verify', { userId: String(userId) });
    
    console.log('🔐 [ProfileService] Verifying phone change OTP...');
    console.log('   User ID:', userId);
    console.log('   OTP:', otpCode);
    console.log('   URL:', url);
    
    if (otpCode.length !== 4) {
      throw new Error('OTP must be 4 digits');
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        otpCode: otpCode
      })
    });
    
    const status = response.status;
    console.log('📥 [ProfileService] Response Status:', status);
    
    const data = await response.json();
    console.log('📥 [ProfileService] Response:', data);
    
    if (status === 200) {
      console.log('✅ [ProfileService] Phone number updated successfully');
      
      // Note: Phone number will be updated in the user profile, no need to store separately
      
      return {
        success: true,
        message: data.message || 'Phone number updated successfully',
        newPhoneNumber: data.newPhoneNumber
      };
    } else {
      throw new Error(data.message || 'Failed to verify OTP');
    }
    
  } catch (error: any) {
    console.error('❌ [ProfileService] Error verifying phone change:', error);
    throw error;
  }
};

/**
 * Resend OTP for phone change
 * @param {string} newPhoneNumber - New phone number
 * @returns {Promise<object>}
 */
export const resendPhoneChangeOTP = async (newPhoneNumber: string): Promise<{ success: boolean; message: string }> => {
  try {
    const token = await storage.getAuthToken();
    const userId = await storage.getUserId();
    
    if (!token || !userId) {
      throw new Error('No authentication data');
    }
    
    const url = buildApiUrlWithParams('/users/:userId/change-phone-request', { userId: String(userId) });
    
    console.log('🔄 [ProfileService] Resending OTP...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        newPhoneNumber: newPhoneNumber
      })
    });
    
    const status = response.status;
    const data = await response.json();
    
    if (status === 200) {
      console.log('✅ [ProfileService] OTP resent successfully');
      return {
        success: true,
        message: data.message || 'OTP resent successfully'
      };
    } else {
      throw new Error(data.message || 'Failed to resend OTP');
    }
    
  } catch (error: any) {
    console.error('❌ [ProfileService] Error resending OTP:', error);
    throw error;
  }
};

/**
 * Get current user profile (includes profile image)
 * @returns {Promise<object>}
 */
export const getUserProfile = async (): Promise<any> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const url = buildApiUrl('/users/profile');
    
    console.log('👤 [ProfileService] Fetching user profile...');
    console.log('   URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const status = response.status;
    console.log('📥 [ProfileService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ProfileService] Error response:', errorText);
      throw new Error(`Failed to fetch profile: ${status}`);
    }
    
    const profile = await response.json();
    
    console.log('✅ [ProfileService] Profile loaded:', profile.name);
    
    // Construct full URL for profile image
    if (profile.profileImage && !profile.profileImage.startsWith('http')) {
      profile.profileImage = `https://bonyad-hub.com${profile.profileImage}`;
    }
    
    // Also check avatar field
    if (profile.avatar && !profile.avatar.startsWith('http')) {
      profile.avatar = `https://bonyad-hub.com${profile.avatar}`;
    }
    
    console.log('🖼️ [ProfileService] Profile Image URL:', profile.profileImage || profile.avatar || 'No image');
    
    return profile;
    
  } catch (error: any) {
    console.error('❌ [ProfileService] Error fetching profile:', error);
    throw error;
  }
};

/**
 * Upload profile image
 * @param {ImagePicker.ImagePickerAsset} imageAsset - Image asset from ImagePicker
 * @returns {Promise<object>}
 */
export const uploadProfileImage = async (imageAsset: ImagePicker.ImagePickerAsset): Promise<{ success: boolean; message: string; profileImage: string }> => {
  try {
    const token = await storage.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    const url = buildApiUrl('/users/update-profile-image');
    
    console.log('📸 [ProfileService] Uploading profile image...');
    console.log('   URL:', url);
    console.log('   Platform:', Platform.OS);
    console.log('   Image URI:', imageAsset.uri);
    
    // Create form data
    const formData = new FormData();
    const filename = imageAsset.uri.split('/').pop() || 'profile.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    if (Platform.OS === 'web') {
      try {
        // For web, fetch the image as a blob
        const response = await fetch(imageAsset.uri);
        const blob = await response.blob();
        formData.append('profileImage', blob, filename);
      } catch (error) {
        console.error('❌ [ProfileService] Error creating blob:', error);
        formData.append('profileImage', {
          uri: imageAsset.uri,
          type: type,
          name: filename,
        } as any);
      }
    } else {
      // For mobile, use the URI directly
      formData.append('profileImage', {
        uri: imageAsset.uri,
        type: type,
        name: filename,
      } as any);
    }
    
    console.log('📤 [ProfileService] Sending multipart request...');
    console.log('   Field name: profileImage');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type for FormData - let the browser set it with boundary
      },
      body: formData
    });
    
    const status = response.status;
    console.log('📥 [ProfileService] Response Status:', status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ProfileService] Upload failed:', errorText);
      throw new Error(`Failed to upload image: ${status}`);
    }
    
    const data = await response.json();
    console.log('📥 [ProfileService] Response:', data);
    
    // Construct full URL
    let fullImageUrl = data.profileImage || data.avatar;
    if (fullImageUrl && !fullImageUrl.startsWith('http')) {
      fullImageUrl = `https://bonyad-hub.com${fullImageUrl}`;
    }
    
    console.log('✅ [ProfileService] Profile image uploaded successfully');
    console.log('   Path:', data.profileImage || data.avatar);
    console.log('   Full URL:', fullImageUrl);
    
    return {
      success: true,
      message: data.message || 'Image uploaded successfully',
      profileImage: fullImageUrl
    };
    
  } catch (error: any) {
    console.error('❌ [ProfileService] Error uploading profile image:', error);
    throw error;
  }
};

