import { useEffect, useState } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FCM_TOKEN_KEY = '@fcm_token';

/**
 * 🔔 COMPREHENSIVE FCM NOTIFICATIONS HOOK
 * Handles all aspects of FCM:
 * - Request permissions
 * - Get FCM token
 * - Handle foreground notifications
 * - Handle background notifications
 * - Handle notification taps (app opened from notification)
 */
export const useFCMNotifications = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeFCM();
    
    // Cleanup
    return () => {
      // Unsubscribe listeners are handled automatically
    };
  }, []);

  const initializeFCM = async () => {
    try {
      console.log('🔔 Initializing FCM...');
      setIsLoading(true);

      // Step 1: Check if platform is supported
      if (Platform.OS === 'web') {
        console.log('⚠️ Web platform - FCM not supported');
        setIsLoading(false);
        return;
      }

      // Step 2: Request notification permissions
      console.log('🔔 Step 1: Requesting notification permissions...');
      const permissionGranted = await requestNotificationPermissions();
      setHasPermission(permissionGranted);

      if (!permissionGranted) {
        console.log('❌ Notification permissions denied');
        setIsLoading(false);
        return;
      }

      console.log('✅ Notification permissions granted!');

      // Step 3: Get FCM token
      console.log('🔔 Step 2: Getting FCM token...');
      const token = await getFCMToken();
      
      if (token) {
        console.log('✅ FCM Token obtained:', token.substring(0, 50) + '...');
        setFcmToken(token);
        await saveTokenToStorage(token);
      } else {
        console.log('⚠️ No FCM token received');
      }

      // Step 4: Set up notification handlers
      console.log('🔔 Step 3: Setting up notification handlers...');
      setupNotificationHandlers();

      // Step 5: Check if app was opened from notification
      checkInitialNotification();

      setIsLoading(false);
      console.log('✅ FCM initialization complete!');

    } catch (error: any) {
      console.error('❌ Error initializing FCM:', error?.message);
      setIsLoading(false);
    }
  };

  /**
   * Request notification permissions
   */
  const requestNotificationPermissions = async (): Promise<boolean> => {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log('📱 Permission status:', {
        status: authStatus,
        enabled,
        AUTHORIZED: messaging.AuthorizationStatus.AUTHORIZED,
        PROVISIONAL: messaging.AuthorizationStatus.PROVISIONAL,
        NOT_DETERMINED: messaging.AuthorizationStatus.NOT_DETERMINED,
        DENIED: messaging.AuthorizationStatus.DENIED,
      });

      return enabled;
    } catch (error: any) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  };

  /**
   * Get FCM token
   */
  const getFCMToken = async (): Promise<string | null> => {
    try {
      const token = await messaging().getToken();
      
      if (token) {
        console.log('✅ FCM Token length:', token.length);
        console.log('✅ FCM Token (first 100 chars):', token.substring(0, 100));
        return token;
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ Error getting FCM token:', error);
      return null;
    }
  };

  /**
   * Save token to AsyncStorage
   */
  const saveTokenToStorage = async (token: string) => {
    try {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      console.log('✅ Token saved to storage');
    } catch (error) {
      console.error('❌ Error saving token:', error);
    }
  };

  /**
   * Set up notification handlers
   */
  const setupNotificationHandlers = () => {
    // 1. Foreground notifications (app is open)
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('🔔 FOREGROUND notification received!');
      console.log('📦 Notification data:', remoteMessage);
      
      // Show alert
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || 'Notification',
          remoteMessage.notification.body || '',
          [
            {
              text: 'OK',
              onPress: () => {
                // Handle notification tap
                handleNotificationPress(remoteMessage);
              },
            },
          ]
        );
      }
    });

    // 2. Background/Quit notifications (app was closed or in background)
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('🔔 APP OPENED FROM BACKGROUND NOTIFICATION!');
      console.log('📦 Notification data:', remoteMessage);
      handleNotificationPress(remoteMessage);
    });

    // 3. Token refresh
    messaging().onTokenRefresh(newToken => {
      console.log('🔄 FCM Token refreshed:', newToken);
      setFcmToken(newToken);
      saveTokenToStorage(newToken);
    });

    return () => {
      unsubscribeForeground();
    };
  };

  /**
   * Check if app was opened from a notification
   */
  const checkInitialNotification = async () => {
    try {
      const remoteMessage = await messaging().getInitialNotification();
      
      if (remoteMessage) {
        console.log('🔔 APP OPENED FROM QUIT STATE NOTIFICATION!');
        console.log('📦 Notification data:', remoteMessage);
        handleNotificationPress(remoteMessage);
      }
    } catch (error) {
      console.error('❌ Error checking initial notification:', error);
    }
  };

  /**
   * Handle notification press/tap
   */
  const handleNotificationPress = (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    console.log('👆 Notification tapped!');
    
    // Extract notification data
    const data = remoteMessage.data;
    const notification = remoteMessage.notification;

    // Example: Navigate to a specific screen based on notification data
    if (data?.screen) {
      console.log('📱 Navigate to screen:', data.screen);
      // You can implement navigation here using React Navigation or your navigation system
    }

    // Example: Open a URL if provided
    if (data?.url) {
      console.log('🔗 Opening URL:', data.url);
      Linking.openURL(data.url).catch(err => console.error('Error opening URL:', err));
    }

    // Example: Show alert with notification content
    if (notification?.title || notification?.body) {
      Alert.alert(
        notification.title || 'Notification',
        notification.body || '',
        [{ text: 'OK' }]
      );
    }
  };

  return {
    fcmToken,
    hasPermission,
    isLoading,
    refreshToken: async () => {
      const token = await getFCMToken();
      if (token) {
        setFcmToken(token);
        await saveTokenToStorage(token);
      }
    },
  };
};
