import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { checkAuthentication } from '../utils/authGuard';
import { useRouter } from '../utils/useRouter';

type Screen = 'splash' | 'welcome' | 'overview' | 'login' | 'signup' | 'otp' | 'home' | 'profile' | 'editProfile' | 'myData' | 'changePhone' | 'changePassword' | 'portfolio' | 'services' | 'availability' | 'subscription' | 'newProject' | 'manualForm' | 'aiForm' | 'projects' | 'runningProjects' | 'chatRooms' | 'chatDetail' | 'notifications' | 'appointments' | 'booking' | 'technicianProfile' | 'roomDesign' | 'voiceAI' | 'costExplorer' | 'roomVisualizer' | 'askBonyadAI' | 'projectsMap';

// Protected screens that require authentication
const PROTECTED_SCREENS: Screen[] = [
  'home',
  'profile',
  'editProfile',
  'myData',
  'changePhone',
  'changePassword',
  'portfolio',
  'services',
  'availability',
  'subscription',
  'newProject',
  'manualForm',
  'aiForm',
  'projects',
  'runningProjects',
  'chatRooms',
  'chatDetail',
  'notifications',
  'appointments',
  'booking',
  'technicianProfile',
];

// Public screens that don't require authentication
const PUBLIC_SCREENS: Screen[] = [
  'splash',
  'welcome',
  'overview',
  'login',
  'signup',
  'otp',
  'roomDesign',
  'voiceAI',
  'costExplorer',
  'roomVisualizer',
  'askBonyadAI',
  'projectsMap',
];

/**
 * Custom hook to guard protected routes
 * Validates token and redirects to login if not authenticated
 */
export const useAuthGuard = (
  currentScreen: Screen,
  setCurrentScreen: (screen: Screen) => void,
  router: any,
  authToken: string,
  setAuthToken: (token: string) => void,
  setUserId: (id: number) => void,
  setUserRole: (role: 'user' | 'technician') => void,
) => {
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!authToken);

  useEffect(() => {
    const validateAuth = async () => {
      // Skip check for public screens
      if (PUBLIC_SCREENS.includes(currentScreen)) {
        return;
      }

      // If it's a protected screen, validate authentication
      if (PROTECTED_SCREENS.includes(currentScreen)) {
        setIsCheckingAuth(true);

        try {
          const authResult = await checkAuthentication();

          if (!authResult) {
            // Not authenticated - redirect to login
            console.log('🚫 Access denied - redirecting to login');
            setIsAuthenticated(false);
            setAuthToken('');
            setUserId(0);
            setUserRole('user');

            // Navigate to login
            if (Platform.OS === 'web' && router) {
              router.navigate('login');
            } else {
              setCurrentScreen('login');
            }
          } else {
            // Authenticated - update app state
            console.log('✅ Authentication verified');
            setIsAuthenticated(true);
            setAuthToken(authResult.token);
            setUserId(authResult.userId);
            setUserRole(authResult.role.toLowerCase() as 'user' | 'technician');
          }
        } catch (error) {
          console.error('❌ Auth guard error:', error);
          setIsAuthenticated(false);
          setAuthToken('');
          
          // Navigate to login on error
          if (Platform.OS === 'web' && router) {
            router.navigate('login');
          } else {
            setCurrentScreen('login');
          }
        } finally {
          setIsCheckingAuth(false);
        }
      }
    };

    validateAuth();
  }, [currentScreen]);

  return { isCheckingAuth, isAuthenticated };
};
