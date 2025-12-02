import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PREFIX = '@bonyad-onboarding';

const isAndroid = Platform.OS === 'android';
const isWeb = Platform.OS === 'web';

const buildKey = (key: string) => `${PREFIX}:${key}`;

const storage = {
  async set(key: string, value: string) {
    try {
      if (isAndroid) {
        await AsyncStorage.setItem(buildKey(key), value);
        return;
      }

      if (isWeb && typeof window !== 'undefined') {
        window.sessionStorage.setItem(buildKey(key), value);
      }
    } catch (error) {
      console.warn('⚠️ Failed to persist onboarding value', key, error);
    }
  },
  async get(key: string) {
    try {
      if (isAndroid) {
        return await AsyncStorage.getItem(buildKey(key));
      }

      if (isWeb && typeof window !== 'undefined') {
        return window.sessionStorage.getItem(buildKey(key));
      }

      return null;
    } catch (error) {
      console.warn('⚠️ Failed to read onboarding value', key, error);
      return null;
    }
  },
  async clear() {
    try {
      if (isAndroid) {
        const keys = await AsyncStorage.getAllKeys();
        const onboardingKeys = keys.filter(k => k.startsWith(PREFIX));
        if (onboardingKeys.length > 0) {
          await AsyncStorage.multiRemove(onboardingKeys);
        }
      }

      if (isWeb && typeof window !== 'undefined') {
        Object.keys(window.sessionStorage)
          .filter(key => key.startsWith(PREFIX))
          .forEach(key => window.sessionStorage.removeItem(key));
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear onboarding storage', error);
    }
  },
};

export default storage;

