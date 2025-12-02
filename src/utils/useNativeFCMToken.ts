import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';

/**
 * 🔔 NATIVE FCM TOKEN HOOK
 * Uses React Native Firebase for real FCM tokens
 * Works in development and production builds
 */
export const useNativeFCMToken = () => {
  const [fcmToken, setFcmToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestFCMToken();
  }, []);

  const requestFCMToken = async () => {
    try {
      console.log('🔔 Starting NATIVE FCM token registration...');
      console.log('📱 Platform:', Platform.OS);

      if (Platform.OS === 'web') {
        console.log('⚠️ Web platform - using fallback');
        setFcmToken(generateFallbackToken());
        setIsLoading(false);
        return;
      }

      // Request permission
      console.log('🔔 Requesting notification permission...');
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log('📱 Permission status:', authStatus);
      console.log('📱 Notifications enabled:', enabled);

      if (!enabled) {
        console.log('❌ Notification permissions denied');
        setError('Permissions denied');
        setFcmToken(generateFallbackToken());
        setIsLoading(false);
        return;
      }

      console.log('✅ Notification permissions GRANTED!');

      // Get FCM token
      console.log('🔔 Getting FCM token from Firebase...');
      const token = await messaging().getToken();

      if (token) {
        console.log('✅✅✅ REAL FCM TOKEN OBTAINED!');
        console.log('📱 FCM Token:', token);
        console.log('📱 Token length:', token.length);
        console.log('📱 Token type: Native Firebase FCM');
        
        setFcmToken(token);
        setError(null);
      } else {
        console.log('⚠️ No FCM token received - using fallback');
        setFcmToken(generateFallbackToken());
        setError('No token received');
      }

      setIsLoading(false);

      // Listen for token refresh
      const unsubscribe = messaging().onTokenRefresh(newToken => {
        console.log('🔄 FCM Token refreshed:', newToken);
        setFcmToken(newToken);
      });

      return () => unsubscribe();

    } catch (err: any) {
      console.log('❌❌❌ ERROR getting FCM token:');
      console.log('Error message:', err?.message);
      console.log('Error code:', err?.code);
      console.log('Full error:', err);
      
      setError(err?.message || 'Unknown error');
      setFcmToken(generateFallbackToken());
      setIsLoading(false);
    }
  };

  const generateFallbackToken = () => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    return `fallback-token-${timestamp}-${randomId}`;
  };

  return { fcmToken, isLoading, error };
};

/**
 * 🔔 Request FCM Token (Standalone Function)
 */
export async function requestNativeFCMToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      console.log('⚠️ Web platform - FCM not supported');
      return null;
    }

    console.log('🔔 Requesting native FCM token...');

    // Request permission
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('❌ Notification permissions denied');
      return null;
    }

    // Get token
    const token = await messaging().getToken();
    
    if (token) {
      console.log('✅ Native FCM Token:', token);
      return token;
    }

    console.log('⚠️ No token received');
    return null;

  } catch (error: any) {
    console.error('❌ Error getting native FCM token:', error?.message);
    return null;
  }
}

