import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

type Screen = 'splash' | 'welcome' | 'overview' | 'about' | 'contact' | 'introToApp' | 'login' | 'signup' | 'otp' | 'forgotPassword' | 'otpVerification' | 'resetPassword' | 'home' | 'profile' | 'editProfile' | 'myData' | 'changePhone' | 'changePassword' | 'portfolio' | 'services' | 'availability' | 'subscription' | 'newProject' | 'manualForm' | 'aiForm' | 'projects' | 'runningProjects' | 'chatRooms' | 'chatDetail' | 'notifications' | 'appointments' | 'booking' | 'technicianProfile' | 'technicianOnboarding' | 'roomDesign' | 'voiceAI' | 'costExplorer' | 'roomVisualizer' | 'askBonyadAI' | 'projectsMap';

// Screen to path mapping
const screenToPath: Record<Screen, string> = {
  splash: '/',
  welcome: '/welcome',
  overview: '/overview',
  about: '/about',
  contact: '/contact',
  introToApp: '/intro-to-app',
  login: '/login',
  signup: '/signup',
  otp: '/otp',
  forgotPassword: '/forgot-password',
  otpVerification: '/forgot-password/otp',
  resetPassword: '/forgot-password/reset',
  home: '/home',
  technicianOnboarding: '/onboarding',
  profile: '/profile',
  editProfile: '/profile/edit',
  myData: '/profile/data',
  changePhone: '/profile/data/phone',
  changePassword: '/profile/data/password',
  portfolio: '/portfolio',
  services: '/services',
  availability: '/availability',
  subscription: '/subscription',
  newProject: '/projects/new',
  manualForm: '/projects/new/manual',
  aiForm: '/projects/new/ai',
  projects: '/projects',
  runningProjects: '/projects/running',
  chatRooms: '/chat',
  chatDetail: '/chat/:roomId',
  notifications: '/notifications',
  appointments: '/appointments',
  booking: '/booking',
  technicianProfile: '/technician/:id',
  roomDesign: '/features/design',
  voiceAI: '/features/voice',
  costExplorer: '/features/cost',
  roomVisualizer: '/features/visualizer',
  askBonyadAI: '/features/ai',
  projectsMap: '/features/map',
};

// Path to screen mapping (reverse)
const pathToScreen: Record<string, Screen> = {
  '/': 'welcome', // Root goes to welcome on web
  '/welcome': 'welcome',
  '/overview': 'overview',
  '/about': 'about',
  '/contact': 'contact',
  '/intro-to-app': 'introToApp',
  '/login': 'login',
  '/signup': 'signup',
  '/otp': 'otp',
  '/forgot-password': 'forgotPassword',
  '/forgot-password/otp': 'otpVerification',
  '/forgot-password/reset': 'resetPassword',
  '/home': 'home',
  '/onboarding': 'technicianOnboarding',
  '/profile': 'profile',
  '/profile/edit': 'editProfile',
  '/profile/data': 'myData',
  '/profile/data/phone': 'changePhone',
  '/profile/data/password': 'changePassword',
  '/portfolio': 'portfolio',
  '/services': 'services',
  '/availability': 'availability',
  '/subscription': 'subscription',
  '/projects/new': 'newProject',
  '/projects/new/manual': 'manualForm',
  '/projects/new/ai': 'aiForm',
  '/projects': 'projects',
  '/projects/running': 'runningProjects',
  '/chat': 'chatRooms',
  '/notifications': 'notifications',
  '/appointments': 'appointments',
  '/booking': 'booking',
  '/features/design': 'roomDesign',
  '/features/voice': 'voiceAI',
  '/features/cost': 'costExplorer',
  '/features/visualizer': 'roomVisualizer',
  '/features/ai': 'askBonyadAI',
  '/features/map': 'projectsMap',
};

const isWeb = Platform.OS === 'web';

// Base path for web deployment (e.g., '/app' for https://www.bonyad-hub.com/app)
const BASE_PATH = '/app';

/**
 * Strip base path from URL path
 */
const stripBasePath = (path: string): string => {
  if (path.startsWith(BASE_PATH)) {
    return path.slice(BASE_PATH.length) || '/';
  }
  return path;
};

/**
 * Add base path to URL path
 */
const addBasePath = (path: string): string => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${normalizedPath}`;
};

/**
 * Custom routing hook that syncs state with browser URL on web
 * Uses simple state on mobile platforms
 */
export function useRouter(currentScreen: Screen, setCurrentScreen: (screen: Screen) => void) {
  // Get current path from URL (with base path stripped)
  const getPathFromUrl = useCallback((): string => {
    if (!isWeb || typeof window === 'undefined') return '';
    const fullPath = window.location.pathname;
    return stripBasePath(fullPath);
  }, []);

  // Get screen from URL path (path should already have base path stripped)
  const getScreenFromPath = useCallback((path: string): Screen | null => {
    // Handle dynamic routes
    if (path.startsWith('/chat/')) {
      return 'chatDetail';
    }
    if (path.startsWith('/technician/')) {
      return 'technicianProfile';
    }
    
    // Direct mapping
    return pathToScreen[path] || null;
  }, []);

  // Get path for screen (without base path)
  const getPathForScreen = useCallback((screen: Screen, params?: Record<string, string>): string => {
    let path = screenToPath[screen] || '/';
    
    // Replace dynamic params
    if (params) {
      Object.keys(params).forEach(key => {
        path = path.replace(`:${key}`, params[key]);
      });
    }
    
    return path;
  }, []);

  // Update browser URL on web (with base path added)
  const updateUrl = useCallback((screen: Screen, params?: Record<string, string>, replace: boolean = false) => {
    if (!isWeb || typeof window === 'undefined') return;
    
    const path = getPathForScreen(screen, params);
    const url = addBasePath(path);
    
    if (replace) {
      window.history.replaceState({ screen }, '', url);
    } else {
      window.history.pushState({ screen }, '', url);
    }
  }, [getPathForScreen]);

  // Navigate to screen
  const navigate = useCallback((screen: Screen, params?: Record<string, string>, replace: boolean = false) => {
    setCurrentScreen(screen);
    if (isWeb) {
      updateUrl(screen, params, replace);
    }
  }, [setCurrentScreen, updateUrl]);

  // Initialize: Sync URL with state on mount (web only)
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;

    // Get initial screen from URL
    const path = getPathFromUrl();
    const screenFromUrl = getScreenFromPath(path);
    
    if (screenFromUrl && screenFromUrl !== currentScreen) {
      // URL exists, sync state to URL
      setCurrentScreen(screenFromUrl);
      updateUrl(screenFromUrl, undefined, true);
    } else if (!screenFromUrl && currentScreen) {
      // No URL match, sync URL to current state
      updateUrl(currentScreen, undefined, true);
    }

    // Listen to browser back/forward buttons
    const handlePopState = (event: PopStateEvent) => {
      const path = getPathFromUrl();
      const screen = getScreenFromPath(path);
      
      if (screen) {
        console.log('🔙 Browser navigation to:', screen, 'from path:', path);
        setCurrentScreen(screen);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []); // Only run on mount

  // Sync URL when screen changes (web only)
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    
    const path = getPathFromUrl();
    const expectedPath = getPathForScreen(currentScreen);
    
    // Only update URL if it doesn't match (avoid loops)
    if (path !== expectedPath) {
      updateUrl(currentScreen, undefined, false);
    }
  }, [currentScreen, getPathFromUrl, getPathForScreen, updateUrl]);

  return {
    navigate,
    currentPath: isWeb ? getPathFromUrl() : null,
    getPathForScreen,
    getScreenFromPath,
  };
}

/**
 * Helper to extract dynamic params from URL (e.g., /chat/123 -> { roomId: '123' })
 */
export function extractRouteParams(path: string, pattern: string): Record<string, string> {
  const params: Record<string, string> = {};
  
  if (!isWeb || typeof window === 'undefined') return params;
  
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  
  patternParts.forEach((part, index) => {
    if (part.startsWith(':')) {
      const paramName = part.slice(1);
      params[paramName] = pathParts[index] || '';
    }
  });
  
  return params;
}
