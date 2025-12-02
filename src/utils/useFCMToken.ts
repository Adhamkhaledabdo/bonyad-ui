import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// 🔔 Configure notification behavior (only if notifications are available)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  console.log('⚠️ Notification handler setup skipped (Expo Go limitation)');
}

/**
 * 🔔 FCM TOKEN HOOK
 * Properly registers device for push notifications and returns FCM token
 */
export const useFCMToken = () => {
  const [fcmToken, setFcmToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  const registerForPushNotifications = async () => {
    try {
      console.log('🔔 Starting FCM token registration...');
      console.log('📱 Platform:', Platform.OS);
      console.log('📱 Is Device:', Device.isDevice);
      console.log('📱 App Ownership:', Constants.appOwnership);
      
      // Check if running in Expo Go
      const isExpoGo = Constants.appOwnership === 'expo';
      
      if (isExpoGo) {
        console.log('⚠️ Running in Expo Go - FCM not fully supported in SDK 53+');
        console.log('ℹ️  Using fallback token. For full FCM support, build a development build.');
        setFcmToken(generateFallbackToken());
        setIsLoading(false);
        return;
      }

      // We're in a development/standalone build!
      console.log('✅ Running in DEVELOPMENT BUILD - Will get real FCM token!');

      // Check if running on web
      if (Platform.OS === 'web') {
        console.log('⚠️ Running on web - using fallback token');
        setFcmToken(generateFallbackToken());
        setIsLoading(false);
        return;
      }

      // Get existing permission status
      console.log('🔔 Checking notification permissions...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('📱 Current permission status:', existingStatus);
      
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        console.log('🔔 Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('📱 New permission status:', finalStatus);
      }

      // If permission not granted, use fallback
      if (finalStatus !== 'granted') {
        console.log('❌ Notification permissions NOT granted by user');
        console.log('ℹ️  Using fallback token - notifications will not work');
        setFcmToken(generateFallbackToken());
        setIsLoading(false);
        return;
      }

      console.log('✅ Notification permissions GRANTED!');
      console.log('🔔 Requesting Expo Push Token from Expo servers...');
      
      // Get the Expo push token (no projectId needed for dev builds)
      const tokenResponse = await Notifications.getExpoPushTokenAsync();

      const token = tokenResponse.data;
      console.log('✅✅✅ REAL FCM/Expo Push Token obtained!');
      console.log('📱 Token:', token);
      console.log('📱 Token length:', token.length);
      
      setFcmToken(token);
      setIsLoading(false);

      // Configure Android-specific settings
      if (Platform.OS === 'android') {
        console.log('🔔 Configuring Android notification channel...');
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0080E0',
        });
        console.log('✅ Android notification channel configured!');
      }

      console.log('🎉 FCM setup complete! Ready to receive notifications!');

    } catch (error: any) {
      console.log('❌❌❌ ERROR getting real FCM token:');
      console.log('Error message:', error?.message);
      console.log('Error code:', error?.code);
      console.log('Full error:', JSON.stringify(error, null, 2));
      console.log('ℹ️  Using fallback token as last resort');
      setFcmToken(generateFallbackToken());
      setIsLoading(false);
    }
  };

  const generateFallbackToken = () => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    return `fallback-token-${timestamp}-${randomId}`;
  };

  return { fcmToken, isLoading };
};

/**
 * 🔔 Standalone function to register for push notifications
 * Use this in App.tsx or a dedicated notifications service
 */
export async function registerForPushNotificationsAsync() {
  try {
    // Check if running in Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';
    
    if (isExpoGo) {
      console.log('⚠️ Expo Go detected - FCM not supported in SDK 53+');
      console.log('ℹ️  Build a development build for full push notification support');
      return null;
    }

    if (!Device.isDevice) {
      console.log('⚠️ Push notifications only work on physical devices');
      return null;
    }

    if (Platform.OS === 'web') {
      console.log('⚠️ Push notifications not supported on web');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ Failed to get push notification permissions');
      return null;
    }

    // For development builds, getExpoPushTokenAsync works without projectId
    console.log('🔔 Requesting Expo Push Token...');
    
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    console.log('📱 FCM/Expo Token:', token);

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0080E0',
      });
    }

    return token;
  } catch (error: any) {
    console.log('⚠️ Could not register for push notifications:', error?.message || error);
    console.log('ℹ️  Continuing without push notifications');
    return null;
  }
}
