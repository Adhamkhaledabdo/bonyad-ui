import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  AUTH_TOKEN: '@bonyad_auth_token',
  USER_ROLE: '@bonyad_user_role',
  DEVICE_TOKEN: '@bonyad_device_token',
  USER_ID: '@bonyad_user_id',
  FONT_SIZE: '@bonyad_font_size',
};

export const storage = {
  // Save auth data
  async saveAuthData(token: string, role: string, userId: number, deviceToken?: string) {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token),
        AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, role),
        AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId.toString()),
      ]);
      
      if (deviceToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_TOKEN, deviceToken);
      }
      
      console.log('✅ Auth data saved to storage');
    } catch (error) {
      console.error('❌ Error saving auth data:', error);
    }
  },

  // Get auth token
  async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
      return null;
    }
  },

  // Get user role
  async getUserRole(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
    } catch (error) {
      console.error('❌ Error getting user role:', error);
      return null;
    }
  },

  // Get device token
  async getDeviceToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_TOKEN);
    } catch (error) {
      console.error('❌ Error getting device token:', error);
      return null;
    }
  },

  // Get user ID
  async getUserId(): Promise<number | null> {
    try {
      const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      return userId ? parseInt(userId, 10) : null;
    } catch (error) {
      console.error('❌ Error getting user ID:', error);
      return null;
    }
  },

  // Clear all auth data
  async clearAuthData() {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_ID),
        AsyncStorage.removeItem(STORAGE_KEYS.DEVICE_TOKEN),
      ]);
      console.log('✅ Auth data cleared');
    } catch (error) {
      console.error('❌ Error clearing auth data:', error);
    }
  },

  // Get font size preference
  async getFontSize(): Promise<'small' | 'medium' | 'large'> {
    try {
      const fontSize = await AsyncStorage.getItem(STORAGE_KEYS.FONT_SIZE);
      if (fontSize === 'small' || fontSize === 'medium' || fontSize === 'large') {
        return fontSize;
      }
      return 'medium'; // Default
    } catch (error) {
      console.error('❌ Error getting font size:', error);
      return 'medium';
    }
  },

  // Save font size preference
  async saveFontSize(fontSize: 'small' | 'medium' | 'large') {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FONT_SIZE, fontSize);
      console.log('✅ Font size saved:', fontSize);
    } catch (error) {
      console.error('❌ Error saving font size:', error);
    }
  },
};
