import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Surface, Card, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { Image as ExpoImage } from 'expo-image';
import BonyadLogo from '../components/BonyadLogo';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import AppointmentsScreen from './AppointmentsScreen';
import ProjectsScreen from './ProjectsScreen';
import ChatRoomsListScreen from './ChatRoomsListScreen';
import ChatDetailScreen from './ChatDetailScreen';
import ProfileScreen from './ProfileScreen';
import NewProjectView from './NewProjectView';
import NotificationsScreen from './NotificationsScreen';
import MyDataScreen from './MyDataScreen';
import EditProfileScreen from './EditProfileScreen';
import ChangePasswordScreen from './ChangePasswordScreen';
import ChangePhoneScreen from './ChangePhoneScreen';
import VerifyPhoneChangeScreen from './VerifyPhoneChangeScreen';
import PortfolioManagement from '../components/PortfolioManagement';
import SubscriptionScreen from './SubscriptionScreen';
import ServiceManagementScreen from './ServiceManagementScreen';
import AvailabilityScreen from './AvailabilityScreen';
import ConversationalAIForm from './ConversationalAIForm';
import ManualProjectForm from './ManualProjectForm';
import ServiceTechniciansScreen from './ServiceTechniciansScreen';
import TechnicianProfileView from './TechnicianProfileView';
import ProjectCards from '../components/ProjectCards';
import Footer from '../components/Footer';
import { buildApiUrl, API_ENDPOINTS, getApiUrl, getServerBaseUrl } from '../config/api';
import { storage } from '../utils/storage';
import { FontFamily, FontWeights } from '../constants/Fonts';

interface UserHomeScreenProps {
  onShowProfile: () => void;
  onLogout: () => void;
  onRequestProject?: () => void;
  onShowProjects?: (filter: 'available' | 'running' | 'completed') => void;
  onShowChat?: () => void;
  onShowNotifications?: () => void;
  onShowAppointments?: () => void;
  onShowBooking?: (technicianId: number, technicianName: string, projectId?: number) => void;
  userName?: string;
  // Props for embedded screens
  userId?: number;
  authToken?: string;
  onNavigateToChatDetail?: (roomId: string, receiverId: number, receiverName: string) => void;
  onNavigateToEditProfile?: () => void;
  onNavigateToPortfolio?: () => void;
  onNavigateToSubscription?: () => void;
  onNavigateToServices?: () => void;
  onNavigateToAvailability?: () => void;
  onNavigateToTechnicianProfile?: (technicianId: number) => void;
  projectsFilter?: 'available' | 'running' | 'completed';
  onNavigateToAIForm?: () => void;
  onNavigateToManualForm?: () => void;
}

export default function UserHomeScreen({ 
  onLogout, 
  onShowProfile, 
  onRequestProject, 
  onShowProjects, 
  onShowChat, 
  onShowNotifications, 
  onShowAppointments, 
  onShowBooking, 
  userName,
  userId = 0,
  authToken = '',
  onNavigateToChatDetail,
  onNavigateToEditProfile,
  onNavigateToPortfolio,
  onNavigateToSubscription,
  onNavigateToServices,
  onNavigateToAvailability,
  onNavigateToTechnicianProfile,
  projectsFilter = 'available',
  onNavigateToAIForm,
  onNavigateToManualForm,
}: UserHomeScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'projects' | 'chat' | 'profile' | 'notifications' | 'appointments' | 'new' | 'service-technicians' | 'technician-profile' | 'services-list'>('home');
  
  // Animation values for dropdowns
  const mobileDropdownAnim = useRef(new Animated.Value(0)).current;
  const desktopDropdownAnim = useRef(new Animated.Value(0)).current;
  const [showServicesList, setShowServicesList] = useState(false);
  const [currentProjectsFilter, setCurrentProjectsFilter] = useState<'available' | 'running' | 'completed'>(projectsFilter || 'available');
  const [profileSubView, setProfileSubView] = useState<'myData' | 'editProfile' | 'portfolio' | 'subscription' | 'services' | 'availability' | 'changePassword' | 'changePhone' | 'verifyPhoneChange' | null>(null);
  const [phoneChangeNumber, setPhoneChangeNumber] = useState<string>('');
  const [newProjectSubView, setNewProjectSubView] = useState<'ai' | 'manual' | null>(null);
  const [selectedChat, setSelectedChat] = useState<{ roomId: string; receiverId: number; receiverName: string; projectId?: number | null } | null>(null);
  const [showChatList, setShowChatList] = useState(true);
  const [chatReturnContext, setChatReturnContext] = useState<'home' | 'service-technicians' | null>(null);
  const [serviceTechniciansView, setServiceTechniciansView] = useState<{ serviceId: number; serviceName?: string; source?: 'search' | 'lookForBonyaders' } | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  const [hiringTechnician, setHiringTechnician] = useState<{ id: number; name?: string } | null>(null);
  const insets = useSafeAreaInsets();
  const [userProfile, setUserProfile] = useState<{ name?: string; avatar?: string; profileImage?: string } | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // Reset sub-views when switching tabs
  useEffect(() => {
    if (activeTab !== 'profile') {
      setProfileSubView(null);
    }
    if (activeTab !== 'new') {
      setNewProjectSubView(null);
    }
    if (activeTab !== 'chat') {
      setSelectedChat(null);
      setShowChatList(true);
    }
    if (activeTab !== 'service-technicians' && chatReturnContext !== 'service-technicians') {
      setServiceTechniciansView(null);
    }
    if (activeTab !== 'chat') {
      setChatReturnContext(null);
    }
    if (activeTab !== 'technician-profile') {
      setSelectedTechnicianId(null);
    }
    if (activeTab !== 'new') {
      setHiringTechnician(null);
    }
  }, [activeTab, chatReturnContext]);

  // Sync currentProjectsFilter when projectsFilter prop changes
  useEffect(() => {
    if (projectsFilter) {
      setCurrentProjectsFilter(projectsFilter);
    }
  }, [projectsFilter]);

  // Animate mobile dropdown
  useEffect(() => {
    Animated.timing(mobileDropdownAnim, {
      toValue: showProjectsDropdown ? 1 : 0,
      duration: 300,
      useNativeDriver: false, // height animation doesn't support native driver
    }).start();
  }, [showProjectsDropdown, mobileDropdownAnim]);

  // Animate desktop dropdown
  useEffect(() => {
    Animated.timing(desktopDropdownAnim, {
      toValue: showProjectsDropdown ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showProjectsDropdown, desktopDropdownAnim]);

  // Search state
  const [searchText, setSearchText] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAISearching, setIsAISearching] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const resolveServiceImageSource = (service: any) => {
    if (!service) {
      return null;
    }

    const candidate =
      service.imageUrl ||
      service.image ||
      service.iconUrl ||
      service.icon ||
      service.thumbnailUrl;

    if (!candidate) {
      return null;
    }

    if (typeof candidate === 'number') {
      return candidate;
    }

    if (typeof candidate === 'object' && candidate.uri) {
      return candidate;
    }

    const candidateStr = String(candidate).trim();

    if (!candidateStr) {
      return null;
    }

    if (
      candidateStr.startsWith('http://') ||
      candidateStr.startsWith('https://') ||
      candidateStr.startsWith('data:')
    ) {
      return { uri: candidateStr };
    }

    const baseUrl = getServerBaseUrl();
    const normalizedPath = candidateStr.startsWith('/') ? candidateStr : `/${candidateStr}`;

    return { uri: `${baseUrl}${normalizedPath}` };
  };

  // Debug: Log when unread count changes
  useEffect(() => {
    console.log(`🔔 Unread notification count changed to: ${unreadNotificationCount}`);
  }, [unreadNotificationCount]);

  // Responsive state - updates on window resize
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  // Update screen width on resize
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Calculate responsive breakpoints
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1200;
  const IS_MEDIUM_WEB = IS_WEB && screenWidth >= 768 && screenWidth < 1200;
  const IS_SMALL_WEB = IS_WEB && screenWidth < 768;

  // Fetch user profile for navigation bar
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = authToken || await storage.getAuthToken();
        if (!token) return;

        const response = await fetch(buildApiUrl(API_ENDPOINTS.USER.PROFILE), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Construct full URL for profile image
          if (data.profileImage && !data.profileImage.startsWith('http')) {
            data.profileImage = `${getServerBaseUrl()}${data.profileImage}`;
          }
          if (data.avatar && !data.avatar.startsWith('http')) {
            data.avatar = `${getServerBaseUrl()}${data.avatar}`;
          }
          setUserProfile({
            name: data.name || userName || 'User',
            avatar: data.profileImage || data.avatar,
            profileImage: data.profileImage || data.avatar,
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile({ name: userName || 'User' });
      }
    };

    if (IS_LARGE_WEB) {
      fetchProfile();
    }
  }, [authToken, userName, IS_LARGE_WEB]);

  // Fetch user profile for navigation bar
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = authToken || await storage.getAuthToken();
        if (!token) return;

        const response = await fetch(buildApiUrl(API_ENDPOINTS.USER.PROFILE), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Construct full URL for profile image
          if (data.profileImage && !data.profileImage.startsWith('http')) {
            data.profileImage = `${getServerBaseUrl()}${data.profileImage}`;
          }
          if (data.avatar && !data.avatar.startsWith('http')) {
            data.avatar = `${getServerBaseUrl()}${data.avatar}`;
          }
          setUserProfile({
            name: data.name || userName || 'User',
            avatar: data.profileImage || data.avatar,
            profileImage: data.profileImage || data.avatar,
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile({ name: userName || 'User' });
      }
    };

    if (IS_LARGE_WEB) {
      fetchProfile();
    }
  }, [authToken, userName, IS_LARGE_WEB]);

  const openChat = useCallback(
    (
      roomId: string,
      receiverId: number,
      receiverName: string,
      options?: {
        returnContext?: 'home' | 'service-technicians' | null;
        projectId?: number | null;
      },
    ) => {
      const nextContext = options?.returnContext ?? null;
      const nextProjectId = options?.projectId ?? null;

      setActiveTab('chat');
      setSelectedChat({ roomId, receiverId, receiverName, projectId: nextProjectId ?? undefined });
      setChatReturnContext(nextContext);
      setShowChatList(IS_LARGE_WEB);
    },
    [IS_LARGE_WEB, setActiveTab, setSelectedChat, setChatReturnContext, setShowChatList],
  );

  const handleChatBackNavigation = useCallback(() => {
    if (IS_LARGE_WEB) {
      setSelectedChat(null);
      setChatReturnContext(null);
      setShowChatList(true);
      return;
    }

    if (chatReturnContext === 'service-technicians') {
      setSelectedChat(null);
      setShowChatList(true);
      setChatReturnContext(null);
      setActiveTab('service-technicians');
      return;
    }

    if (chatReturnContext === 'home') {
      setSelectedChat(null);
      setShowChatList(true);
      setChatReturnContext(null);
      setServiceTechniciansView((prev) => (prev?.source === 'search' ? null : prev));
      setActiveTab('home');
      return;
    }

    setSelectedChat(null);
    setShowChatList(true);
    setChatReturnContext(null);
  }, [IS_LARGE_WEB, chatReturnContext, setActiveTab, setSelectedChat, setShowChatList, setChatReturnContext, setServiceTechniciansView]);

  // Load services on mount
  useEffect(() => {
    const loadServices = async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(buildApiUrl(API_ENDPOINTS.SERVICES.LIST), {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          setAllServices(data);
          console.log(`✅ Loaded ${data.length} services`);
        }
      } catch (error) {
        console.error('❌ Error loading services:', error);
      }
    };

    loadServices();
  }, [authToken]);

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    try {
      const token = authToken || await storage.getAuthToken();
      if (!token) {
        console.log('⚠️ No auth token found, skipping unread count fetch');
        return 0;
      }

      const url = buildApiUrl(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
      console.log('🔔 Fetching unread notification count...');
      console.log(`   URL: ${url}`);
      console.log(`   Token: ${token.substring(0, 20)}...`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`📥 Unread count response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`📥 Unread count response data:`, data);
        
        // API might return {count: number} or just a number
        const count = typeof data === 'number' ? data : (data.count || data.unreadCount || data.unread_count || 0);
        console.log(`✅ Unread notification count: ${count}`);
        setUnreadNotificationCount(count);
        return count;
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch unread count. Status:', response.status);
        console.error('   Error body:', errorText);
        // Set to 0 on error to avoid showing stale data
        setUnreadNotificationCount(0);
      }
    } catch (error) {
      console.error('❌ Error fetching unread count:', error);
      setUnreadNotificationCount(0);
    }
    return 0;
  };

  // Load unread count on component mount
  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;
    
    const loadCount = async () => {
      if (!mounted) return;
      await fetchUnreadCount();
    };
    
    // Call immediately on mount with a small delay to ensure token is available
    const timeoutId = setTimeout(() => {
      loadCount();
      
      // Set up interval to refresh periodically (every 30 seconds)
      intervalId = setInterval(() => {
        if (mounted) {
          loadCount();
        }
      }, 30000);
    }, 500); // 500ms delay to ensure token is loaded
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []); // Empty dependency array - only runs on mount

  // Also refresh when authToken becomes available (if it wasn't available on mount)
  useEffect(() => {
    if (authToken) {
      fetchUnreadCount();
    }
  }, [authToken]);

  // Refresh unread count when notifications tab becomes active
  useEffect(() => {
    if (activeTab === 'notifications') {
      console.log('📱 Notifications tab opened, refreshing unread count...');
      fetchUnreadCount();
    }
  }, [activeTab]);

  // Levenshtein distance for fuzzy search
  const levenshteinDistance = (s1: string, s2: string): number => {
    const len1 = s1.length;
    const len2 = s2.length;
    if (s1 === s2) return 0;
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    const distance: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) distance[i][0] = i;
    for (let j = 0; j <= len2; j++) distance[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          distance[i][j] = distance[i - 1][j - 1];
        } else {
          distance[i][j] = Math.min(
            distance[i - 1][j] + 1,
            distance[i][j - 1] + 1,
            distance[i - 1][j - 1] + 1
          );
        }
      }
    }
    return distance[len1][len2];
  };

  // Search functions
  const performExactSearch = (query: string): any[] => {
    const queryLower = query.toLowerCase();
    return allServices.filter((service: any) =>
      service.nameEn?.toLowerCase().includes(queryLower) ||
      service.nameAr?.toLowerCase().includes(queryLower) ||
      service.description?.toLowerCase().includes(queryLower)
    );
  };

  const performFuzzySearch = (query: string): any[] => {
    const queryLower = query.toLowerCase();
    const maxDistance = query.length <= 3 ? 1 : query.length <= 6 ? 2 : 3;

    const matched = allServices
      .map((service: any) => {
        const fields = [
          service.nameEn?.toLowerCase() || '',
          service.nameAr?.toLowerCase() || '',
          service.description?.toLowerCase() || '',
        ];
        let minDistance = Infinity;

        for (const field of fields) {
          const words = field.split(/\s+/);
          for (const word of words) {
            if (word.length >= 3) {
              const distance = levenshteinDistance(queryLower, word);
              minDistance = Math.min(minDistance, distance);
            }
          }
          const fieldDistance = levenshteinDistance(queryLower, field);
          minDistance = Math.min(minDistance, fieldDistance);
        }
        return { service, distance: minDistance };
      })
      .filter((item) => item.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .map((item) => item.service);

    return matched;
  };

  // AI Search function
  const performAISearch = async (query: string): Promise<any[]> => {
    try {
      setIsAISearching(true);
      setAiMessage('Using AI to find best matches...');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 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',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a service matching assistant. Given a user query, find the most relevant services from this list: ${JSON.stringify(allServices.map(s => ({ id: s.id, nameEn: s.nameEn, nameAr: s.nameAr, description: s.description })))}. Return a JSON array of service IDs that match the query. Only return the JSON array, nothing else.`,
            },
            {
              role: 'user',
              content: `Find services matching: "${query}". Return only a JSON array of service IDs like [1, 2, 3].`,
            },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        throw new Error('AI search failed');
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || '[]';
      
      // Parse AI response to get service IDs
      let serviceIds: number[] = [];
      try {
        // Try to extract JSON array from response
        const jsonMatch = aiResponse.match(/\[[\d,\s]+\]/);
        if (jsonMatch) {
          serviceIds = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Error parsing AI response:', e);
      }

      // Find services by IDs
      const aiMatchedServices = allServices.filter(service => 
        serviceIds.includes(service.id)
      );

      setAiMessage(aiMatchedServices.length > 0 
        ? `AI found ${aiMatchedServices.length} relevant services` 
        : 'AI search completed, but no matches found');
      
      setIsAISearching(false);
      return aiMatchedServices;
    } catch (error) {
      console.error('AI search error:', error);
      setAiMessage('');
      setIsAISearching(false);
      return [];
    }
  };

  // Handle search text change
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchText || searchText.trim().length === 0) {
      setShowSearchResults(false);
      setFilteredServices([]);
      setAiMessage('');
      setIsAISearching(false);
      return;
    }

    setShowSearchResults(true);
    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      const trimmedQuery = searchText.trim();
      const exactMatches = performExactSearch(trimmedQuery);

      if (exactMatches.length > 0) {
        setFilteredServices(exactMatches);
        setAiMessage('');
        setIsAISearching(false);
        setIsSearching(false);
      } else {
        const fuzzyMatches = performFuzzySearch(trimmedQuery);
        if (fuzzyMatches.length > 0) {
          setFilteredServices(fuzzyMatches);
          setAiMessage('Found matches with typo correction');
          setIsAISearching(false);
          setIsSearching(false);
        } else {
          // Try AI search as last resort
          const aiMatches = await performAISearch(trimmedQuery);
          if (aiMatches.length > 0) {
            setFilteredServices(aiMatches);
          } else {
            setFilteredServices([]);
            setAiMessage('');
          }
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, allServices]);

  // Handle service selection
  const handleSelectService = (service: any) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [UserHomeScreen] Service clicked!');
    console.log('🔵 [UserHomeScreen] Selected service:', service);
    console.log('🔵 [UserHomeScreen] Service ID:', service?.id);
    console.log('🔵 [UserHomeScreen] Service Name (EN):', service?.nameEn);
    console.log('🔵 [UserHomeScreen] Service Name (AR):', service?.nameAr);
    console.log('🔵 [UserHomeScreen] Current language:', i18n.language);
    
    if (!service || !service.id) {
      console.error('❌ [UserHomeScreen] Invalid service object:', service);
      return;
    }
    
    // Navigate to service technicians screen in tab
    const serviceName = i18n.language === 'ar' && service.nameAr ? service.nameAr : (service.nameEn || 'Service');
    
    console.log('🔵 [UserHomeScreen] Setting serviceTechniciansView with:', {
      serviceId: service.id,
      serviceName: serviceName,
    });
    
    setServiceTechniciansView({
      serviceId: service.id,
      serviceName: serviceName,
      source: 'search',
    });
    
    // Switch to service-technicians tab
    setActiveTab('service-technicians');
    
    // Close search results
    setShowSearchResults(false);
    setSearchText('');
    
    console.log('✅ [UserHomeScreen] Navigation triggered to tab');
    console.log('═══════════════════════════════════════════════════════════');
  };

  // Dummy data based on guide

  // Render Android style (always mobile) OR Web small/medium screen style
  const shouldRenderMobile = Platform.OS !== 'web' || IS_SMALL_WEB || IS_MEDIUM_WEB;

  // Render mobile layout
  if (shouldRenderMobile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* TOP BAR - Figma Design (Node 58:2467) */}
        <View style={[styles.figmaTopBar, { paddingTop: Math.max(insets.top, 10), backgroundColor: isDarkMode ? colors.primary : '#00549B' }]}>
          {/* Logo Section */}
          <View style={styles.figmaLogoContainer}>
            {/* 3D Cube Logo */}
            <View style={styles.figmaLogoIcon}>
              <ExpoImage
                source={require('../../assets/bonyad-cube-logo.svg')}
                style={{
                  width: 53,
                  height: 64,
                } as any}
                contentFit="contain"
              />
            </View>
            {/* Logo Text */}
            <View style={styles.figmaLogoTextContainer}>
              <Text style={styles.figmaLogoText}>Bonyad</Text>
              <Text style={styles.figmaLogoTextArabic}>بُنيـــاد</Text>
            </View>
          </View>
          {/* Icons Section */}
          <View style={styles.figmaTopBarIcons}>
            <TouchableOpacity style={styles.figmaIconButton}>
              <Ionicons name="information-circle-outline" size={24} color="#E6EFF7" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.figmaIconButton} onPress={() => setActiveTab('notifications')}>
              <View style={styles.figmaNotificationWrapper}>
                <Ionicons name="notifications-outline" size={24} color="#E6EFF7" />
                {unreadNotificationCount > 0 && (
                  <View style={styles.figmaNotificationBadge}>
                    <View style={styles.figmaNotificationDot} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

      {/* Render content based on active tab */}
      {activeTab === 'home' && (
        <View style={{ flex: 1 }}>
          {/* Search Bar - Only visible on home tab */}
          <View style={[styles.searchBarContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.searchBar, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('Search services...')}
                placeholderTextColor={colors.textSecondary}
                value={searchText}
                onChangeText={setSearchText}
                onFocus={() => {
                  if (searchText.length > 0) {
                    setShowSearchResults(true);
                  }
                }}
              />
              {searchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchText('');
                    setShowSearchResults(false);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Search Results - Positioned below search bar */}
          {showSearchResults && (
            <View style={styles.searchResultsWrapper} pointerEvents="box-none">
              <View
                style={[
                  styles.resultsContainer,
                  {
                    backgroundColor: colors.cardBackground,
                  },
                ]}
                pointerEvents="auto"
              >
                {/* Results Header */}
                <View style={[styles.resultsHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.resultsTitle, { color: colors.text }]}>
                    {t('Search Results')}
                  </Text>
                      <View style={[styles.resultsCount, { flexDirection: 'row', alignItems: 'center' }]}>
                        <Text style={{ color: colors.textSecondary }}>{filteredServices.length}</Text>
                        <Text style={{ color: colors.textSecondary }}> {t('found')}</Text>
                      </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowSearchResults(false);
                      setSearchText('');
                    }}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* AI Status Banner */}
                {(isAISearching || aiMessage) && (
                  <View style={[styles.aiStatusBanner, { backgroundColor: colors.primary + '15' }]}>
                    {isAISearching ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="sparkles" size={16} color={colors.primary} />
                    )}
                    <Text
                      style={[
                        styles.aiMessage,
                        {
                          color: isAISearching ? colors.textSecondary : colors.primary,
                        },
                      ]}
                    >
                      {isAISearching ? t('Using AI to find best matches...') : aiMessage}
                    </Text>
                  </View>
                )}

                {/* Results Content */}
                {isSearching ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                      {t('Loading services...')}
                    </Text>
                  </View>
                ) : filteredServices.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search" size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      {t('No services found')}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                      {t('Try a different search term')}
                    </Text>
                  </View>
                ) : (
                  <View style={{ maxHeight: 300 }}>
                    <FlatList
                      data={filteredServices}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            console.log('🔵 [UserHomeScreen] Mobile TouchableOpacity pressed for service:', item);
                            handleSelectService(item);
                          }}
                          style={[
                            styles.serviceRow,
                            { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
                          ]}
                        >
                          {(() => {
                            const serviceImageSource = resolveServiceImageSource(item);
                            return (
                              <View
                                style={[
                                  styles.searchServiceImageWrapper,
                                  serviceImageSource
                                    ? styles.searchServiceImageBorder
                                    : styles.searchServiceImageFallback,
                                ]}
                              >
                                {serviceImageSource ? (
                            <Image
                                    source={serviceImageSource}
                                    style={styles.searchServiceImage}
                              resizeMode="cover"
                            />
                          ) : (
                              <Ionicons name="image-outline" size={24} color={colors.textSecondary} />
                          )}
                              </View>
                            );
                          })()}
                          <View style={styles.serviceInfo}>
                            <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={1}>
                              {item.nameEn || item.nameAr || t('Service')}
                            </Text>
                            <Text
                              style={[styles.serviceDescription, { color: colors.textSecondary }]}
                              numberOfLines={2}
                            >
                              {item.description || ''}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      )}
                      keyExtractor={item => item.id?.toString() || Math.random().toString()}
                      style={styles.servicesList}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    />
                  </View>
                )}
              </View>
            </View>
          )}

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={[styles.scrollView, { backgroundColor: colors.background }]}
            contentContainerStyle={{ paddingBottom: 120 }}
          >
          {/* Fixed Buttons - iOS Style Design */}
          <View style={styles.fixedButtons}>
            {/* Look for Bonyaders Button */}
          <TouchableOpacity 
              style={[styles.iosButton, { backgroundColor: colors.cardBackground, borderColor: isDarkMode ? colors.border : 'rgba(0, 0, 0, 0.05)' }]}
              onPress={() => setShowServicesList(true)}
            >
              <View style={[styles.iosButtonIconContainer, { backgroundColor: isDarkMode ? colors.primary + '30' : 'rgba(0, 128, 224, 0.1)' }]}>
                <Ionicons name="people-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.iosButtonText, { color: colors.text, fontSize: scaledSize(16) }]}>{t('Look for Bonyaders')}</Text>
            </TouchableOpacity>

            {/* Project Request Button */}
            <TouchableOpacity 
              style={[styles.iosButton, { backgroundColor: colors.cardBackground, borderColor: isDarkMode ? colors.border : 'rgba(0, 0, 0, 0.05)' }]}
            onPress={() => setActiveTab('new')}
          >
              <View style={[styles.iosButtonIconContainer, { backgroundColor: isDarkMode ? colors.primary + '30' : 'rgba(0, 128, 224, 0.1)' }]}>
                <Ionicons name="calendar-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.iosButtonText, { color: colors.text, fontSize: scaledSize(16) }]}>{t('Project request')}</Text>
          </TouchableOpacity>

            {/* My Projects Button with Sub-navigation */}
          <TouchableOpacity 
              style={[styles.iosButton, { backgroundColor: colors.cardBackground, borderColor: isDarkMode ? colors.border : 'rgba(0, 0, 0, 0.05)' }]}
            onPress={() => setShowProjectsDropdown(!showProjectsDropdown)}
          >
              <View style={[styles.iosButtonIconContainer, { backgroundColor: isDarkMode ? colors.primary + '30' : 'rgba(0, 128, 224, 0.1)' }]}>
                <Ionicons name="folder-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.iosButtonTextContainer}>
                <Text style={[styles.iosButtonText, { color: colors.text, fontSize: scaledSize(16) }]}>{t('My Projects')}</Text>
                <Text style={[styles.iosButtonSubtext, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>{t('View all project statuses')}</Text>
              </View>
              <Ionicons 
                name={showProjectsDropdown ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.textSecondary} 
              />
          </TouchableOpacity>

            {/* Sub-navigation for My Projects - Animated */}
          <Animated.View
              style={[
                styles.iosDropdown,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: isDarkMode ? colors.border : 'rgba(0, 0, 0, 0.05)',
                  maxHeight: mobileDropdownAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 300],
                  }),
                  opacity: mobileDropdownAnim,
                  overflow: 'hidden',
                },
              ]}
            >
              <TouchableOpacity 
                  style={[styles.iosDropdownItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setShowProjectsDropdown(false);
                  setActiveTab('projects');
                  setCurrentProjectsFilter('available');
                }}
              >
                  <View style={[styles.iosDropdownIconContainer, { backgroundColor: isDarkMode ? colors.primary + '30' : 'rgba(0, 128, 224, 0.1)' }]}>
                    <Ionicons name="list-outline" size={22} color={colors.primary} />
                  </View>
                  <Text style={[styles.iosDropdownText, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Available Projects')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                  style={[styles.iosDropdownItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setShowProjectsDropdown(false);
                  setActiveTab('projects');
                  setCurrentProjectsFilter('running');
                }}
              >
                  <View style={[styles.iosDropdownIconContainer, { backgroundColor: isDarkMode ? colors.primary + '30' : 'rgba(0, 128, 224, 0.1)' }]}>
                    <Ionicons name="trending-up-outline" size={22} color={colors.primary} />
                  </View>
                  <Text style={[styles.iosDropdownText, { color: colors.text, fontSize: scaledSize(14) }]}>{t('My Running Projects')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                  style={styles.iosDropdownItem}
                onPress={() => {
                  setShowProjectsDropdown(false);
                  setActiveTab('projects');
                  setCurrentProjectsFilter('completed');
                }}
              >
                  <View style={[styles.iosDropdownIconContainer, { backgroundColor: isDarkMode ? colors.primary + '30' : 'rgba(0, 128, 224, 0.1)' }]}>
                    <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} />
            </View>
                  <Text style={[styles.iosDropdownText, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Completed Projects')}</Text>
          </TouchableOpacity>
                  </Animated.View>

            {/* Appointments Button */}
                  <TouchableOpacity 
              style={[styles.iosButton, { backgroundColor: colors.cardBackground, borderColor: isDarkMode ? colors.border : 'rgba(0, 0, 0, 0.05)' }]}
              onPress={() => setActiveTab('appointments')}
                  >
              <View style={[styles.iosButtonIconContainer, { backgroundColor: isDarkMode ? colors.primary + '30' : 'rgba(0, 128, 224, 0.1)' }]}>
                <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          </View>
              <Text style={[styles.iosButtonText, { color: colors.text, fontSize: scaledSize(16) }]}>{t('Appointments')}</Text>
              </TouchableOpacity>

            {/* My Data Button */}
            <TouchableOpacity 
              style={[styles.iosButton, { backgroundColor: colors.cardBackground, borderColor: isDarkMode ? colors.border : 'rgba(0, 0, 0, 0.05)' }]}
              onPress={() => {
                setActiveTab('profile');
                setProfileSubView('myData');
              }}
            >
              <View style={[styles.iosButtonIconContainer, { backgroundColor: isDarkMode ? colors.primary + '30' : 'rgba(0, 128, 224, 0.1)' }]}>
                <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.iosButtonTextContainer}>
                <Text style={[styles.iosButtonText, { color: colors.text, fontSize: scaledSize(16) }]}>{t('My Data')}</Text>
                <Text style={[styles.iosButtonSubtext, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>{t('Edit profile, phone & password')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Messages Button */}
            <TouchableOpacity 
              style={[styles.iosButton, { backgroundColor: colors.cardBackground, borderColor: isDarkMode ? colors.border : 'rgba(0, 0, 0, 0.05)' }]}
              onPress={() => setActiveTab('chat')}
            >
              <View style={[styles.iosButtonIconContainer, { backgroundColor: isDarkMode ? colors.primary + '30' : 'rgba(0, 128, 224, 0.1)' }]}>
                <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.iosButtonText, { color: colors.text, fontSize: scaledSize(16) }]}>{t('Messages')}</Text>
            </TouchableOpacity>
          </View>

          {/* Project Cards Component */}
          <ProjectCards authToken={authToken} />


          </ScrollView>

          {/* Services List Modal - Mobile */}
          {showServicesList && (
            <Modal
              visible={showServicesList}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowServicesList(false)}
            >
              <View style={styles.mobileServicesListModal}>
                  <TouchableOpacity 
                  style={StyleSheet.absoluteFill}
                  activeOpacity={1}
                  onPress={() => setShowServicesList(false)}
                />
                <View 
                  style={[styles.mobileServicesListContainer, { backgroundColor: colors.cardBackground }]}
                  onStartShouldSetResponder={() => true}
                  onResponderGrant={() => {}}
                >
                  <View style={[styles.mobileServicesListHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.mobileServicesListTitle, { color: colors.text }]}>{t('All Services')}</Text>
                    <TouchableOpacity
                      onPress={() => setShowServicesList(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                  </TouchableOpacity>
        </View>
                  <FlatList
                    data={allServices}
                    keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.mobileServiceListItem, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setShowServicesList(false);
                          const serviceName = i18n.language === 'ar' && item.nameAr ? item.nameAr : (item.nameEn || 'Service');
                          setServiceTechniciansView({ serviceId: item.id, serviceName: serviceName, source: 'lookForBonyaders' });
                          setActiveTab('service-technicians');
                        }}
                      >
                        {(() => {
                          const serviceImageSource = resolveServiceImageSource(item);
                          return (
                            <View
                              style={[
                                styles.mobileServiceListIconContainer,
                                serviceImageSource ? styles.serviceListImageWrapper : styles.serviceListIconFallback,
                              ]}
                            >
                              {serviceImageSource ? (
                                <Image
                                  source={serviceImageSource}
                                  style={styles.serviceListImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <Ionicons
                                  name="briefcase-outline"
                                  size={24}
                                  color={colors.primary || '#0080E0'}
                                />
                              )}
          </View>
                          );
                        })()}
                        <View style={styles.mobileServiceListTextContainer}>
                          <Text style={[styles.mobileServiceListName, { color: colors.text }]}>
                            {i18n.language === 'ar' ? item.nameAr : item.nameEn}
                          </Text>
                          {item.description && (
                            <Text style={[styles.mobileServiceListDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                              {item.description}
                            </Text>
                          )}
              </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <View style={styles.mobileEmptyContainer}>
                        <Ionicons name="briefcase-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.mobileEmptyTitle, { color: colors.text }]}>{t('No services available')}</Text>
        </View>
                    }
                    style={styles.mobileServicesListScroll}
                    showsVerticalScrollIndicator={true}
                  />
                </View>
              </View>
            </Modal>
          )}
        </View>
      )}

      {activeTab === 'projects' && (
        <View style={{ flex: 1 }}>
          <ProjectsScreen
            filter={currentProjectsFilter}
            onFilterChange={(newFilter) => {
              setCurrentProjectsFilter(newFilter as any);
            }}
            onOpenChat={(roomId, receiverId, receiverName) => {
              console.log('🔵 [UserHomeScreen] Opening chat from ProjectsScreen:', receiverId, 'roomId:', roomId, 'receiverName:', receiverName);
              openChat(roomId, receiverId, receiverName);
            }}
            onViewTechnician={onNavigateToTechnicianProfile || (() => {})}
            onBookAppointment={(technicianId, technicianName, projectId) => {
              console.log('🔵 [UserHomeScreen] Book Appointment clicked:', { technicianId, technicianName, projectId });
              onShowBooking?.(technicianId, technicianName, projectId);
            }}
          />
        </View>
      )}

      {activeTab === 'appointments' && (
        <View style={{ flex: 1 }}>
          <AppointmentsScreen />
        </View>
      )}

      {activeTab === 'service-technicians' && serviceTechniciansView && (
        <View style={{ flex: 1 }}>
          <ServiceTechniciansScreen
            serviceId={serviceTechniciansView.serviceId}
            serviceName={serviceTechniciansView.serviceName}
            onBack={() => {
              console.log('🔵 [UserHomeScreen] Back from ServiceTechniciansScreen');
              setActiveTab('home');
              setServiceTechniciansView(null);
            }}
            onNavigateToTechnicianProfile={(technicianId) => {
              console.log('🔵 [UserHomeScreen] Navigating to technician profile:', technicianId);
              setSelectedTechnicianId(technicianId);
              setActiveTab('technician-profile');
            }}
            onNavigateToChat={(roomId, receiverId, receiverName) => {
              console.log('🔵 [UserHomeScreen] Opening chat with technician:', receiverId, 'roomId:', roomId, 'receiverName:', receiverName);
              const source = serviceTechniciansView?.source;
              const returnContext =
                source === 'lookForBonyaders'
                  ? 'service-technicians'
                  : source === 'search'
                  ? 'home'
                  : null;
              openChat(roomId, receiverId, receiverName, { returnContext });
            }}
            onNavigateToBooking={(technicianId, technicianName) => {
              console.log('🔵 [UserHomeScreen] Hire button clicked for technician:', technicianId);
              setHiringTechnician({ id: technicianId, name: technicianName });
              setActiveTab('new');
            }}
          />
        </View>
      )}

      {activeTab === 'technician-profile' && selectedTechnicianId && (
        <View style={{ flex: 1 }}>
          <TechnicianProfileView
            technicianId={selectedTechnicianId}
            onBack={() => {
              console.log('🔵 [UserHomeScreen] Back from TechnicianProfileView');
              setActiveTab('service-technicians');
              setSelectedTechnicianId(null);
            }}
          />
        </View>
      )}

      {activeTab === 'chat' && (
        <View
          style={{
            flex: 1,
            flexDirection: IS_LARGE_WEB ? 'row' : 'column',
          }}
        >
          {/* Chat List - Only show if showChatList is true */}
          {(showChatList || IS_LARGE_WEB) && (
            <View style={[
              { flex: 1 },
              IS_LARGE_WEB && {
                flex: 0.35,
                borderRightWidth: 1,
                borderRightColor: colors.border,
                ...Platform.select({
                  web: {
                    maxWidth: 400,
                    minWidth: 300,
                  } as any,
                }),
              }
            ]}>
            <ChatRoomsListScreen
              onOpenChat={(roomId, receiverId, receiverName, projectId) => {
                openChat(roomId, receiverId, receiverName, { projectId });
              }}
              onBack={
                IS_LARGE_WEB
                  ? undefined
                  : selectedChat
                  ? () => {
                      setSelectedChat(null);
                      setShowChatList(true);
                    }
                  : undefined
              }
            />
          </View>
          )}
          
          {/* Chat Detail - Shows on right side on desktop, or replaces list on mobile */}
          {selectedChat && (
            <View style={[
              { flex: 1 },
              IS_LARGE_WEB && selectedChat && {
                flex: 0.65,
                ...Platform.select({
                  web: {
                    minWidth: 400,
                  } as any,
                }),
              }
            ]}>
            <ChatDetailScreen
              roomId={selectedChat.roomId}
              receiverId={selectedChat.receiverId}
              receiverName={selectedChat.receiverName}
              projectId={selectedChat.projectId ?? undefined}
                onBack={IS_LARGE_WEB ? undefined : handleChatBackNavigation}
              />
            </View>
          )}
        </View>
      )}

      {activeTab === 'notifications' && (
        <View style={{ flex: 1 }}>
          <NotificationsScreen
            onUnreadCountChange={setUnreadNotificationCount}
          />
        </View>
      )}

      {activeTab === 'profile' && (
        <View style={{ flex: 1 }}>
          {profileSubView === null ? (
            <ProfileScreen
              onLogout={onLogout}
              onNavigateToEditProfile={() => setProfileSubView('myData')}
              onNavigateToPortfolio={() => setProfileSubView('portfolio')}
              onNavigateToSubscription={() => setProfileSubView('subscription')}
              onNavigateToServices={() => setProfileSubView('services')}
              onNavigateToAvailability={() => setProfileSubView('availability')}
            />
          ) : profileSubView === 'myData' ? (
            <MyDataScreen
              onBack={() => setProfileSubView(null)}
              onEditProfile={() => setProfileSubView('editProfile')}
              onChangePhone={() => setProfileSubView('changePhone')}
              onChangePassword={() => setProfileSubView('changePassword')}
              onNavigateToSubscription={() => setProfileSubView('subscription')}
              onNavigateToServices={() => setProfileSubView('services')}
              onNavigateToAvailability={() => setProfileSubView('availability')}
              isTechnician={false}
            />
          ) : profileSubView === 'editProfile' ? (
            <EditProfileScreen
              userDetails={{}}
              onBack={() => setProfileSubView('myData')}
              onSave={() => setProfileSubView('myData')}
            />
          ) : profileSubView === 'portfolio' ? (
            <PortfolioManagement
              technicianId={userId}
              isOwnProfile={true}
            />
          ) : profileSubView === 'subscription' ? (
            <SubscriptionScreen
              onBack={() => setProfileSubView(null)}
            />
          ) : profileSubView === 'services' ? (
            <ServiceManagementScreen
              onBack={() => setProfileSubView(null)}
            />
          ) : profileSubView === 'availability' ? (
            <AvailabilityScreen
              onBack={() => setProfileSubView(null)}
            />
          ) : profileSubView === 'changePassword' ? (
            <ChangePasswordScreen
              onBack={() => setProfileSubView(null)}
            />
          ) : profileSubView === 'changePhone' ? (
            <ChangePhoneScreen
              onBack={() => setProfileSubView(null)}
              onOTPSent={(newPhoneNumber) => {
                setPhoneChangeNumber(newPhoneNumber);
                setProfileSubView('verifyPhoneChange');
              }}
            />
          ) : profileSubView === 'verifyPhoneChange' ? (
            <VerifyPhoneChangeScreen
              newPhoneNumber={phoneChangeNumber}
              onBack={() => setProfileSubView('changePhone')}
              onVerified={() => setProfileSubView(null)}
            />
          ) : null}
        </View>
      )}

      {activeTab === 'new' && (
        <View style={{ flex: 1 }}>
          {newProjectSubView === null ? (
            <NewProjectView
              onNavigateToAI={() => setNewProjectSubView('ai')}
              onNavigateToManual={() => setNewProjectSubView('manual')}
              technician={hiringTechnician}
            />
          ) : newProjectSubView === 'ai' ? (
            <ConversationalAIForm
              technician={hiringTechnician}
              onBack={() => {
                setNewProjectSubView(null);
                setHiringTechnician(null);
              }}
              onSuccess={() => {
                setHiringTechnician(null);
                setActiveTab('home');
              }}
            />
          ) : newProjectSubView === 'manual' ? (
            <ManualProjectForm
              technician={hiringTechnician}
              onBack={() => {
                setNewProjectSubView(null);
                setHiringTechnician(null);
              }}
              onSuccess={() => {
                setHiringTechnician(null);
                setActiveTab('home');
              }}
            />
          ) : null}
        </View>
      )}

      {/* TAB BAR - Figma Design (Node 58:2493) */}
      <View style={[styles.figmaTabBarContainer, { paddingBottom: Math.max(insets.bottom, 0), backgroundColor: isDarkMode ? colors.cardBackground : '#FFFFFF', borderTopColor: isDarkMode ? colors.border : '#00549B' }]}>
        <View style={[styles.figmaTabBar, { backgroundColor: isDarkMode ? colors.cardBackground : '#FFFFFF' }]}>
          {/* Projects */}
          <TouchableOpacity 
            style={styles.figmaTabItem}
            onPress={() => setActiveTab('projects')}
          >
            <Ionicons 
              name={activeTab === 'projects' ? "list" : "list-outline"} 
              size={24} 
              color={activeTab === 'projects' ? colors.primary : (isDarkMode ? colors.textSecondary : "#6E6E6E")} 
            />
            <Text style={[
              styles.figmaTabLabel, 
              { color: activeTab === 'projects' ? colors.primary : (isDarkMode ? colors.textSecondary : "#383838"), fontSize: scaledSize(12) }
            ]}>
              {t('Projects')}
            </Text>
          </TouchableOpacity>

          {/* Calendar */}
          <TouchableOpacity 
            style={styles.figmaTabItem}
            onPress={() => setActiveTab('appointments')}
          >
            <Ionicons 
              name={activeTab === 'appointments' ? "calendar" : "calendar-outline"} 
              size={24} 
              color={activeTab === 'appointments' ? colors.primary : (isDarkMode ? colors.textSecondary : "#6E6E6E")} 
            />
            <Text style={[
              styles.figmaTabLabel, 
              { color: activeTab === 'appointments' ? colors.primary : (isDarkMode ? colors.textSecondary : "#383838"), fontSize: scaledSize(12) }
            ]}>
              {t('Calendar')}
            </Text>
          </TouchableOpacity>

          {/* Home */}
          <TouchableOpacity 
            style={styles.figmaTabItem}
            onPress={() => setActiveTab('home')}
          >
            <Ionicons 
              name={activeTab === 'home' ? "home" : "home-outline"} 
              size={24} 
              color={activeTab === 'home' ? colors.primary : (isDarkMode ? colors.textSecondary : "#383838")} 
            />
            <Text style={[
              styles.figmaTabLabel, 
              { color: activeTab === 'home' ? colors.primary : (isDarkMode ? colors.textSecondary : "#383838"), fontSize: scaledSize(12) }
            ]}>
              {t('Home')}
            </Text>
          </TouchableOpacity>

          {/* Profile */}
          <TouchableOpacity 
            style={styles.figmaTabItem}
            onPress={() => setActiveTab('profile')}
          >
            <Ionicons 
              name={activeTab === 'profile' ? "person" : "person-outline"} 
              size={24} 
              color={activeTab === 'profile' ? colors.primary : (isDarkMode ? colors.textSecondary : "#6E6E6E")} 
            />
            <Text style={[
              styles.figmaTabLabel, 
              { color: activeTab === 'profile' ? colors.primary : (isDarkMode ? colors.textSecondary : "#383838"), fontSize: scaledSize(12) }
            ]}>
              {t('Profile')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
    );
  }

  // Render desktop layout for large web screens
  return (
    <View style={[styles.desktopContainer, { backgroundColor: colors.background }]}>
      {/* New Horizontal Navigation Bar - Figma Design */}
      <View style={[styles.desktopNavBar, { backgroundColor: colors.primary }]}>
        {/* Logo Section */}
        <View style={styles.desktopNavLogoSection}>
          <View style={styles.desktopNavLogoIcon}>
            <ExpoImage
              source={require('../../assets/bonyad-cube-logo.svg')}
              style={{ width: 80, height: 97 } as any}
              contentFit="contain"
            />
          </View>
          <View style={styles.desktopNavLogoTextContainer}>
            <Text style={styles.desktopNavLogoText}>Bonyad</Text>
            <Text style={styles.desktopNavLogoTextArabic}>بُنياد</Text>
          </View>
      </View>

        {/* Navigation Tabs */}
        <View style={styles.desktopNavTabs}>
          <TouchableOpacity 
            style={[styles.desktopNavTab, activeTab === 'home' && styles.desktopNavTabActive]}
            onPress={() => setActiveTab('home')}
          >
            <Text style={[styles.desktopNavTabText, activeTab === 'home' && styles.desktopNavTabTextActive]}>
              {t('Dashboard')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.desktopNavTab, activeTab === 'projects' && styles.desktopNavTabActive]}
            onPress={() => setActiveTab('projects')}
          >
            <Text style={[styles.desktopNavTabText, activeTab === 'projects' && styles.desktopNavTabTextActive]}>
              {t('Projects')}
            </Text>
          </TouchableOpacity>
            <TouchableOpacity 
            style={[styles.desktopNavTab, activeTab === 'appointments' && styles.desktopNavTabActive]}
            onPress={() => setActiveTab('appointments')}
          >
            <Text style={[styles.desktopNavTabText, activeTab === 'appointments' && styles.desktopNavTabTextActive]}>
              {t('Appointments')}
            </Text>
            </TouchableOpacity>
                              <TouchableOpacity 
            style={[styles.desktopNavTab, activeTab === 'new' && styles.desktopNavTabActive]}
            onPress={() => setActiveTab('new')}
              >
            <Text style={[styles.desktopNavTabText, activeTab === 'new' && styles.desktopNavTabTextActive]}>
              {t('New Project')}
            </Text>
              </TouchableOpacity>
          </View>

        {/* Icons Section */}
        <View style={styles.desktopNavIcons}>
          <TouchableOpacity style={styles.desktopNavIconButton}>
            <Ionicons name="information-circle-outline" size={24} color="#E6EFF7" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.desktopNavIconButton}
            onPress={() => setActiveTab('chat')}
          >
            <Ionicons name="chatbubble-outline" size={24} color="#E6EFF7" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.desktopNavIconButton}
            onPress={() => setActiveTab('notifications')}
          >
            <View style={styles.desktopNavNotificationWrapper}>
              <Ionicons name="notifications-outline" size={24} color="#E6EFF7" />
              {unreadNotificationCount > 0 && (
                <View style={styles.desktopNavNotificationBadge}>
                  <View style={styles.desktopNavNotificationDot} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.desktopNavProfileSection}>
          <TouchableOpacity 
            style={styles.desktopNavProfileButton}
            onPress={() => setShowProfileDropdown(!showProfileDropdown)}
          >
            <View style={styles.desktopNavProfileAvatar}>
              {userProfile?.avatar || userProfile?.profileImage ? (
                <Image 
                  source={{ uri: userProfile.avatar || userProfile.profileImage }} 
                  style={styles.desktopNavProfileAvatarImage}
                />
              ) : (
                <View style={[styles.desktopNavProfileAvatarPlaceholder, { backgroundColor: '#4D8EC5' }]}>
                  <Text style={styles.desktopNavProfileAvatarText}>
                    {(userProfile?.name || userName || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.desktopNavProfileInfo}>
              <Text style={styles.desktopNavProfileName}>
                {userProfile?.name || userName || t('User')}
              </Text>
              <Text style={styles.desktopNavProfileRole}>{t('User')}</Text>
            </View>
            <Ionicons name="chevron-down" size={24} color="#FFFFFF" style={{ transform: [{ rotate: showProfileDropdown ? '180deg' : '0deg' }] }} />
          </TouchableOpacity>

          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <View style={[styles.desktopNavProfileDropdown, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <TouchableOpacity 
                style={[styles.desktopNavProfileDropdownItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setShowProfileDropdown(false);
                  setActiveTab('profile');
                }}
              >
                <Ionicons name="person-outline" size={20} color={colors.text} />
                <Text style={[styles.desktopNavProfileDropdownText, { color: colors.text }]}>{t('Profile')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.desktopNavProfileDropdownItem}
                onPress={() => {
                  setShowProfileDropdown(false);
                  onLogout();
                }}
            >
                <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.desktopNavProfileDropdownText, { color: colors.textSecondary }]}>{t('Logout')}</Text>
            </TouchableOpacity>
            </View>
          )}
          </View>
        </View>

        {/* Main content - Render based on active tab */}
      <View style={styles.desktopMainContentWrapper}>
        {activeTab === 'home' && (
          <ScrollView 
            style={[styles.desktopMainContent, { backgroundColor: colors.background }]} 
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
            {/* Search Bar - Only visible on home tab */}
            <View style={[styles.desktopSearchBarContainer, { backgroundColor: colors.background }]}>
              <View style={[styles.desktopSearchBar, { backgroundColor: colors.cardBackground }]}>
                <Ionicons name="search" size={22} color={colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.desktopSearchInput, { color: colors.text }]}
                  placeholder={t('Search services...')}
                  placeholderTextColor={colors.textSecondary}
                  value={searchText}
                  onChangeText={setSearchText}
                  onFocus={() => {
                    if (searchText.length > 0) {
                      setShowSearchResults(true);
                    }
                  }}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchText('');
                      setShowSearchResults(false);
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Look for Bonyaders Button - iOS Style */}
            <View style={styles.desktopButtonsContainer}>
              <TouchableOpacity 
                style={[styles.iosButton, { backgroundColor: colors.cardBackground, borderColor: isDarkMode ? colors.border : 'rgba(0, 0, 0, 0.05)' }]}
                onPress={() => setShowServicesList(true)}
              >
                <View style={[styles.iosButtonIconContainer, { backgroundColor: isDarkMode ? colors.primary + '30' : 'rgba(0, 128, 224, 0.1)' }]}>
                  <Ionicons name="people-outline" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.iosButtonText, { color: colors.text }]}>{t('Look for Bonyaders')}</Text>
              </TouchableOpacity>
            </View>

            {/* Project Cards Component - Desktop */}
            <ProjectCards authToken={authToken} />

            {/* Services List Modal */}
            {showServicesList && (
              <View style={styles.servicesListModal}>
                <TouchableOpacity 
                  style={StyleSheet.absoluteFill}
                  activeOpacity={1}
                  onPress={() => setShowServicesList(false)}
                />
                <View 
                  style={[styles.servicesListContainer, { backgroundColor: colors.cardBackground }]}
                >
                  <View style={[styles.servicesListHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.servicesListTitle, { color: colors.text }]}>{t('All Services')}</Text>
                    <TouchableOpacity
                      onPress={() => setShowServicesList(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.servicesListScroll}>
                    {allServices.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="briefcase-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('No services available')}</Text>
                      </View>
                    ) : (
                      allServices.map((service: any) => (
                        <TouchableOpacity
                          key={service.id}
                          style={[styles.serviceListItem, { borderBottomColor: colors.border }]}
                          onPress={() => {
                            setShowServicesList(false);
                            setServiceTechniciansView({
                              serviceId: service.id,
                              serviceName: i18n.language === 'ar' ? service.nameAr : service.nameEn,
                              source: 'lookForBonyaders',
                            });
                            setActiveTab('service-technicians');
                          }}
                        >
                          {(() => {
                            const serviceImageSource = resolveServiceImageSource(service);
                            return (
                              <View
                                style={[
                                  styles.serviceListIconContainer,
                                  serviceImageSource ? styles.serviceListImageWrapper : styles.serviceListIconFallback,
                                ]}
                              >
                                {serviceImageSource ? (
                                  <Image
                                    source={serviceImageSource}
                                    style={styles.serviceListImage}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <Ionicons
                                    name="briefcase-outline"
                                    size={24}
                                    color={colors.primary || '#0080E0'}
                                  />
                                )}
                              </View>
                            );
                          })()}
                          <View style={styles.serviceListTextContainer}>
                            <Text style={[styles.serviceListName, { color: colors.text }]}>
                              {i18n.language === 'ar' ? service.nameAr : service.nameEn}
                            </Text>
                            {service.description && (
                              <Text style={[styles.serviceListDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                                {service.description}
                              </Text>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              </View>
            )}

                          {/* Search Results - Positioned below search bar for Desktop */}
              {showSearchResults && (
                <View style={styles.desktopSearchResultsWrapper}>
                  <View
                    style={[
                      styles.resultsContainer,
                      styles.desktopResultsContainer,
                      {
                        backgroundColor: colors.cardBackground,
                      },
                    ]}
                  >
                    {/* Results Header */}
                    <View style={[styles.resultsHeader, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.resultsTitle, { color: colors.text }]}>
                        {t('Search Results')}
                      </Text>
                      <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
                        <Text>{filteredServices.length}</Text>
                        <Text> {t('found')}</Text>
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setShowSearchResults(false);
                          setSearchText('');
                        }}
                        style={styles.closeButton}
                      >
                        <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                  {/* AI Status Banner */}
                  {(isAISearching || aiMessage) && (
                    <View style={[styles.aiStatusBanner, { backgroundColor: colors.primary + '15' }]}>
                      {isAISearching ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Ionicons name="sparkles" size={16} color={colors.primary} />
                      )}
                      <Text
                        style={[
                          styles.aiMessage,
                          {
                            color: isAISearching ? colors.textSecondary : colors.primary,
                          },
                        ]}
                      >
                        {isAISearching ? t('Using AI to find best matches...') : aiMessage}
                      </Text>
                    </View>
                  )}

                  {/* Results Content */}
                  {isSearching ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        {t('Loading services...')}
                      </Text>
                    </View>
                  ) : filteredServices.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="search" size={48} color={colors.textSecondary} />
                      <Text style={[styles.emptyTitle, { color: colors.text }]}>
                        {t('No services found')}
                      </Text>
                      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        {t('Try a different search term')}
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={filteredServices}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            console.log('🔵 [UserHomeScreen] Desktop TouchableOpacity pressed for service:', item);
                            handleSelectService(item);
                          }}
                          style={[
                            styles.serviceRow,
                            { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
                          ]}
                        >
                          {(() => {
                            const serviceImageSource = resolveServiceImageSource(item);
                            return (
                              <View
                                style={[
                                  styles.searchServiceImageWrapper,
                                  serviceImageSource
                                    ? styles.searchServiceImageBorder
                                    : styles.searchServiceImageFallback,
                                ]}
                              >
                                {serviceImageSource ? (
                          <Image
                                    source={serviceImageSource}
                                    style={styles.searchServiceImage}
                            resizeMode="cover"
                                  />
                                ) : (
                                  <Ionicons name="image-outline" size={24} color={colors.textSecondary} />
                                )}
                              </View>
                            );
                          })()}
                          <View style={styles.serviceInfo}>
                            <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={1}>
                              {item.nameEn || item.nameAr || t('Service')}
                            </Text>
                            <Text
                              style={[styles.serviceDescription, { color: colors.textSecondary }]}
                              numberOfLines={2}
                            >
                              {item.description}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      )}
                      keyExtractor={item => item.id.toString()}
                      style={styles.servicesList}
                      showsVerticalScrollIndicator={true}
                    />
                                      )}
                  </View>
                </View>
              )}

            </View>
            {/* Footer - Inside ScrollView for home tab */}
            <Footer />
          </ScrollView>
        )}

        {activeTab === 'projects' && (
          <ScrollView 
            style={styles.desktopMainContent} 
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              <ProjectsScreen
                filter={currentProjectsFilter}
                onFilterChange={(newFilter) => {
                  setCurrentProjectsFilter(newFilter as any);
                }}
                onOpenChat={(roomId, receiverId, receiverName) => {
                  console.log('🔵 [UserHomeScreen] Opening chat from ProjectsScreen:', receiverId, 'roomId:', roomId, 'receiverName:', receiverName);
                openChat(roomId, receiverId, receiverName);
                }}
                onViewTechnician={onNavigateToTechnicianProfile || (() => {})}
                onBookAppointment={(technicianId, technicianName, projectId) => {
                  console.log('🔵 [UserHomeScreen] Book Appointment clicked:', { technicianId, technicianName, projectId });
                  onShowBooking?.(technicianId, technicianName, projectId);
                }}
              />
            </View>
            <Footer />
          </ScrollView>
        )}

        {activeTab === 'appointments' && (
          <ScrollView 
            style={styles.desktopMainContent} 
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              <AppointmentsScreen />
            </View>
            <Footer />
          </ScrollView>
        )}

        {activeTab === 'service-technicians' && serviceTechniciansView && (
          <ScrollView 
            style={styles.desktopMainContent} 
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              <ServiceTechniciansScreen
                serviceId={serviceTechniciansView.serviceId}
                serviceName={serviceTechniciansView.serviceName}
                onBack={() => {
                  console.log('🔵 [UserHomeScreen] Back from ServiceTechniciansScreen');
                  setActiveTab('home');
                  setServiceTechniciansView(null);
                }}
                onNavigateToTechnicianProfile={(technicianId) => {
                  console.log('🔵 [UserHomeScreen] Navigating to technician profile:', technicianId);
                  setSelectedTechnicianId(technicianId);
                  setActiveTab('technician-profile');
                }}
                onNavigateToChat={(roomId, receiverId, receiverName) => {
                  console.log('🔵 [UserHomeScreen] Opening chat with technician:', receiverId, 'roomId:', roomId, 'receiverName:', receiverName);
                  const source = serviceTechniciansView?.source;
                  const returnContext =
                    source === 'lookForBonyaders'
                      ? 'service-technicians'
                      : source === 'search'
                      ? 'home'
                      : null;
                  openChat(roomId, receiverId, receiverName, { returnContext });
                }}
                onNavigateToBooking={(technicianId, technicianName) => {
                  console.log('🔵 [UserHomeScreen] Hire button clicked for technician:', technicianId);
                  setHiringTechnician({ id: technicianId, name: technicianName });
                  setActiveTab('new');
                }}
              />
            </View>
            <Footer />
          </ScrollView>
        )}

        {activeTab === 'technician-profile' && selectedTechnicianId && (
          <ScrollView 
            style={styles.desktopMainContent} 
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              <TechnicianProfileView
                technicianId={selectedTechnicianId}
                onBack={() => {
                  console.log('🔵 [UserHomeScreen] Back from TechnicianProfileView');
                  setActiveTab('service-technicians');
                  setSelectedTechnicianId(null);
                }}
              />
            </View>
            <Footer />
          </ScrollView>
        )}

        {activeTab === 'chat' && (
          <View
            style={[
              styles.desktopMainContent,
              {
                flexDirection: IS_LARGE_WEB && selectedChat ? 'row' : 'column',
              },
            ]}
          >
            {/* Chat List - Only show if showChatList is true */}
            {(showChatList || IS_LARGE_WEB) && (
              <View style={[
                { flex: 1 },
                selectedChat && IS_LARGE_WEB && {
                  flex: 0.35,
                  borderRightWidth: 1,
                  borderRightColor: colors.border,
                  ...Platform.select({
                    web: {
                      maxWidth: 400,
                      minWidth: 300,
                    } as any,
                  }),
                }
              ]}>
              <ChatRoomsListScreen
                onOpenChat={(roomId, receiverId, receiverName, projectId) => {
                  openChat(roomId, receiverId, receiverName, { projectId });
                }}
              />
            </View>
            )}
            
            {/* Chat Detail - Shows on right side when chat is selected */}
            {selectedChat && (
              <View style={[
                { flex: 1 },
                IS_LARGE_WEB && {
                  flex: 0.65,
                  ...Platform.select({
                    web: {
                      minWidth: 400,
                    } as any,
                  }),
                }
              ]}>
              <ChatDetailScreen
                roomId={selectedChat.roomId}
                receiverId={selectedChat.receiverId}
                receiverName={selectedChat.receiverName}
                projectId={selectedChat.projectId ?? undefined}
                  onBack={IS_LARGE_WEB ? undefined : handleChatBackNavigation}
                />
              </View>
            )}
          </View>
        )}

        {activeTab === 'notifications' && (
          <ScrollView 
            style={styles.desktopMainContent} 
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              <NotificationsScreen
                onUnreadCountChange={setUnreadNotificationCount}
              />
            </View>
            <Footer />
          </ScrollView>
        )}

        {activeTab === 'profile' && (
          <ScrollView 
            style={styles.desktopMainContent} 
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              {profileSubView === null ? (
                <ProfileScreen
                  onLogout={onLogout}
                  onNavigateToEditProfile={() => setProfileSubView('myData')}
                  onNavigateToPortfolio={() => setProfileSubView('portfolio')}
                  onNavigateToSubscription={() => setProfileSubView('subscription')}
                  onNavigateToServices={() => setProfileSubView('services')}
                  onNavigateToAvailability={() => setProfileSubView('availability')}
                />
              ) : profileSubView === 'myData' ? (
                <MyDataScreen
                  onBack={() => setProfileSubView(null)}
                  onEditProfile={() => setProfileSubView('editProfile')}
                  onChangePhone={() => setProfileSubView('changePhone')}
                  onChangePassword={() => setProfileSubView('changePassword')}
                  onNavigateToSubscription={() => setProfileSubView('subscription')}
                  onNavigateToServices={() => setProfileSubView('services')}
                  onNavigateToAvailability={() => setProfileSubView('availability')}
                  isTechnician={false}
                />
              ) : profileSubView === 'editProfile' ? (
                <EditProfileScreen
                  userDetails={{}}
                  onBack={() => setProfileSubView('myData')}
                  onSave={() => setProfileSubView('myData')}
                />
              ) : profileSubView === 'portfolio' ? (
                <PortfolioManagement
                  technicianId={userId}
                  isOwnProfile={true}
                />
              ) : profileSubView === 'subscription' ? (
                <SubscriptionScreen
                  onBack={() => setProfileSubView(null)}
                />
              ) : profileSubView === 'services' ? (
                <ServiceManagementScreen
                  onBack={() => setProfileSubView(null)}
                />
              ) : profileSubView === 'availability' ? (
                <AvailabilityScreen
                  onBack={() => setProfileSubView(null)}
                />
              ) : profileSubView === 'changePassword' ? (
                <ChangePasswordScreen
                  onBack={() => setProfileSubView(null)}
                />
              ) : profileSubView === 'changePhone' ? (
                <ChangePhoneScreen
                  onBack={() => setProfileSubView(null)}
                  onOTPSent={(newPhoneNumber) => {
                    setPhoneChangeNumber(newPhoneNumber);
                    setProfileSubView('verifyPhoneChange');
                  }}
                />
              ) : profileSubView === 'verifyPhoneChange' ? (
                <VerifyPhoneChangeScreen
                  newPhoneNumber={phoneChangeNumber}
                  onBack={() => setProfileSubView('changePhone')}
                  onVerified={() => setProfileSubView(null)}
                />
              ) : null}
            </View>
            <Footer />
          </ScrollView>
        )}

        {activeTab === 'new' && (
          <ScrollView 
            style={styles.desktopMainContent} 
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              {newProjectSubView === null ? (
                <NewProjectView
                  onNavigateToAI={() => setNewProjectSubView('ai')}
                  onNavigateToManual={() => setNewProjectSubView('manual')}
                  technician={hiringTechnician}
                />
              ) : newProjectSubView === 'ai' ? (
                <ConversationalAIForm
                  technician={hiringTechnician}
                  onBack={() => {
                    setNewProjectSubView(null);
                    setHiringTechnician(null);
                  }}
                  onSuccess={() => {
                    setHiringTechnician(null);
                    setActiveTab('home');
                  }}
                />
              ) : newProjectSubView === 'manual' ? (
                <ManualProjectForm
                  technician={hiringTechnician}
                  onBack={() => {
                    setNewProjectSubView(null);
                    setHiringTechnician(null);
                  }}
                  onSuccess={() => {
                    setHiringTechnician(null);
                    setActiveTab('home');
                  }}
                />
              ) : null}
            </View>
            <Footer />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Figma Top Bar Styles (Node 58:2467)
  figmaTopBar: {
    backgroundColor: '#00549B', // Blue-Primary/70
    paddingTop: 30,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    minHeight: 120,
  },
  figmaLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 66.56,
  },
  figmaLogoIcon: {
    width: 53,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  figmaLogoTextContainer: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  figmaLogoText: {
    fontSize: 20,
    fontWeight: '800', // Extra Bold
    color: '#E6EFF7', // Blue-Primary/10
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  figmaLogoTextArabic: {
    fontSize: 20,
    fontWeight: '800', // Extra Bold
    color: '#E6EFF7', // Blue-Primary/10
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  figmaTopBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  figmaIconButton: {
    padding: 6,
  },
  figmaNotificationWrapper: {
    position: 'relative',
  },
  figmaNotificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  figmaNotificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFB703', // Amber/60
  },
  // Figma Bottom Tab Bar Styles (Node 58:2493)
  figmaTabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0.5,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    ...Platform.select({
      web: {
        position: 'fixed' as any,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  figmaTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 11.5,
    paddingBottom: 11.5,
    paddingHorizontal: 12,
    height: 59,
  },
  figmaTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    gap: 2,
  },
  figmaTabLabel: {
    fontSize: 10,
    fontWeight: '400', // Regular
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  // Legacy Top Bar Styles (kept for desktop)
  topBar: {
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    height: 40,
    width: 120,
  },
  logoImage: {
    height: '100%',
    width: '100%',
  },
  topBarIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    padding: 5,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchText: {
    fontSize: 14,
  },
  searchResultsWrapper: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 120 : 100,
    left: 16,
    right: 16,
    zIndex: 9999,
    ...Platform.select({
      android: {
        elevation: 20,
      },
      ios: {
        zIndex: 9999,
      },
      web: {
        zIndex: 9999,
        position: 'absolute' as any,
      },
    }),
  },
  desktopSearchResultsWrapper: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  resultsContainer: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
    maxHeight: 450,
    zIndex: 10000,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    width: '100%',
    overflow: 'hidden',
    ...Platform.select({
      android: {
        elevation: 20,
        maxHeight: 400,
      },
      ios: {
        zIndex: 10000,
        maxHeight: 400,
      },
      web: {
        zIndex: 10000,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        position: 'relative' as any,
        maxHeight: 450,
      },
    }),
  },
  desktopResultsContainer: {
    maxWidth: 600,
    width: '90%',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  resultsCount: {
    fontSize: 12,
    marginRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  aiStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  aiMessage: {
    fontSize: 12,
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    marginTop: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  servicesList: {
    maxHeight: 300,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  searchServiceImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  searchServiceImageBorder: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: '#FFFFFF',
  },
  searchServiceImageFallback: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  searchServiceImage: {
    width: '100%',
    height: '100%',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  fixedButtons: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  // iOS Style Button
  iosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 0.5,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
      },
    }),
  },
  iosButtonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iosButtonTextContainer: {
    flex: 1,
  },
  iosButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  iosButtonSubtext: {
    fontSize: 13,
    fontWeight: '400',
    color: '#999999',
    marginTop: 2,
  },
  // iOS Style Dropdown
  iosDropdown: {
    marginBottom: 12,
    marginLeft: 0,
    marginRight: 0,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 0.5,
  },
  iosDropdownItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iosDropdownIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iosDropdownText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  // Legacy styles (keeping for backward compatibility)
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  dropdown: {
    marginBottom: 10,
    marginLeft: 20,
    marginRight: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownIcon: {
    marginRight: 0,
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  storiesScroll: {
    flexDirection: 'row',
  },
  storyCircle: {
    alignItems: 'center',
    marginRight: 15,
    width: 80,
  },
  storyRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  storyRingNew: {
  },
  storyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyInitial: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  newBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF0000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  storyName: {
    fontSize: 12,
    marginTop: 4,
  },
  recommendationCard: {
    width: Dimensions.get('window').width * 0.75,
    marginRight: 15,
    elevation: 5,
  },
  matchBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  matchBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  techName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  techService: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCount: {
    fontSize: 12,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
  },
  distanceText: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
  },
  separator: {
    fontSize: 12,
  },
  quickHireButton: {
    paddingVertical: 10,
    borderRadius: 8,
  },
  quickHireText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  mapCard: {
    elevation: 5,
  },
  mapPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontSize: 14,
    marginTop: 10,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
    ...Platform.select({
      web: {
        position: 'fixed' as any,
      },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 25,
    backgroundColor: '#0080E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginHorizontal: 8,
    minHeight: 60,
    position: 'relative',
    overflow: 'visible',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabItemBeforeHome: {
    marginRight: 36, // Add space on right for home button (half of button width)
  },
  tabItemAfterHome: {
    marginLeft: 36, // Add space on left for home button (half of button width)
  },
  tabIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  homeButtonWrapper: {
    position: 'absolute',
    left: '50%',
    top: -8, // Lowered further from -12 to -8
    marginLeft: -36, // Half of button width (56/2) + padding (8*2/2)
    zIndex: 10,
    backgroundColor: 'transparent',
    width: 72, // 56 + 16 (8 padding on each side)
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 8, // Add padding from left and right
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  homeButtonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  tabLabel: {
    fontSize: 10,
    color: '#B0E0FF',
    fontWeight: '500',
    marginTop: 2,
  },
  tabItemActive: {
    // Active state styling
  },
  tabLabelActive: {
    fontWeight: '600',
  },
  // Desktop styles
  desktopContainer: {
    flex: 1,
    flexDirection: 'column',
    ...Platform.select({
      web: {
        position: 'relative' as any,
        overflow: 'visible' as any,
      },
    }),
  },
  desktopTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' as any,
      },
    }),
  },
  desktopTopBarIcons: {
    flexDirection: 'row',
    gap: 15,
  },
  desktopIconButton: {
    padding: 8,
  },
  desktopContent: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopSidebar: {
    width: 250,
    paddingVertical: 20,
    paddingHorizontal: 20,
    ...Platform.select({
      web: {
        borderRightWidth: 1,
        borderRightColor: '#E0E0E0',
        display: 'flex' as any,
        flexDirection: 'column' as any,
      },
    }),
  },
  desktopSidebarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  desktopSidebarText: {
    fontSize: 16,
    fontWeight: '500',
  },
  desktopMainContentWrapper: {
    flex: 1,
    paddingTop: 0,
  },
  desktopMainContent: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
    width: '100%',
  },
  scrollContentWithFooter: {
    flexGrow: 1,
    ...Platform.select({
      web: {
        minHeight: '100%',
      },
    }),
  },
  mainContentWrapper: {
    flex: 1,
  },
  // New Desktop Navigation Bar Styles
  desktopNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 110,
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        zIndex: 1000,
      },
    }),
  },
  desktopNavLogoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 210,
  },
  desktopNavLogoIcon: {
    width: 80,
    height: 97,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopNavLogoTextContainer: {
    marginLeft: 11,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
  },
  desktopNavLogoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#E6EFF7',
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  desktopNavLogoTextArabic: {
    fontSize: 20,
    color: '#E6EFF7',
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  desktopNavTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    flex: 1,
    justifyContent: 'center',
  },
  desktopNavTab: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomWidth: 0,
  },
  desktopNavTabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#FFFFFF',
  },
  desktopNavTabText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#B3CEE6',
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  desktopNavTabTextActive: {
    color: '#FFFFFF',
  },
  desktopNavIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  desktopNavIconButton: {
    padding: 8,
  },
  desktopNavNotificationWrapper: {
    position: 'relative',
  },
  desktopNavNotificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  desktopNavNotificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFB703',
  },
  desktopNavProfileSection: {
    position: 'relative',
  },
  desktopNavProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderRadius: 6,
  },
  desktopNavProfileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#4D8EC5',
  },
  desktopNavProfileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  desktopNavProfileAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopNavProfileAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  desktopNavProfileInfo: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'flex-start',
  },
  desktopNavProfileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  desktopNavProfileRole: {
    fontSize: 14,
    fontWeight: '300',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  desktopNavProfileDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 200,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' as any,
        zIndex: 1001,
      },
    }),
    elevation: 10,
  },
  desktopNavProfileDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  desktopNavProfileDropdownText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  desktopSearchBarContainer: {
    marginBottom: 20,
  },
  desktopButtonsContainer: {
    marginBottom: 30,
  },
  servicesListModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        position: 'fixed' as any,
      },
    }),
  },
  servicesListContainer: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 1001,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)' as any,
      },
    }),
    elevation: 10,
  },
  servicesListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  servicesListTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  servicesListScroll: {
    maxHeight: 500,
  },
  serviceListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  serviceListIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  serviceListIconFallback: {
    backgroundColor: 'rgba(0, 128, 224, 0.1)',
  },
  serviceListImageWrapper: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: '#FFFFFF',
  },
  serviceListImage: {
    width: '100%',
    height: '100%',
  },
  serviceListTextContainer: {
    flex: 1,
  },
  serviceListName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceListDescription: {
    fontSize: 13,
  },
  // Mobile Services List Modal Styles
  mobileServicesListModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    ...Platform.select({
      android: {
        padding: 0,
      },
      ios: {
        padding: 0,
      },
      web: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      },
    }),
  },
  mobileServicesListContainer: {
    width: '100%',
    ...Platform.select({
      android: {
        maxHeight: '90%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        elevation: 10,
      },
      ios: {
        maxHeight: '90%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      web: {
        maxWidth: 500,
        maxHeight: '80%',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)' as any,
      },
    }),
    overflow: 'hidden',
  },
  mobileServicesListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  mobileServicesListTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  mobileServicesListScroll: {
    maxHeight: 500,
  },
  mobileServiceListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  mobileServiceListIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mobileServiceListTextContainer: {
    flex: 1,
  },
  mobileServiceListName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mobileServiceListDescription: {
    fontSize: 13,
  },
  mobileEmptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  mobileEmptyTitle: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  desktopSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    maxWidth: 600,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' as any,
      },
    }),
  },
  desktopSearchText: {
    fontSize: 16,
  },
  desktopSearchInput: {
    flex: 1,
    fontSize: 16,
  },
  desktopSection: {
    marginBottom: 40,
  },
  desktopSectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  desktopSectionSubtitle: {
    fontSize: 18,
  },
  desktopSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  desktopSeeAllText: {
    fontSize: 16,
    fontWeight: '600',
  },
  desktopHorizontalScroll: {
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  desktopStoryCard: {
    width: 180,
    marginRight: 16,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' as any,
      },
    }),
  },
  desktopStoryContent: {
    alignItems: 'center',
  },
  desktopStoryAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  desktopStoryInitial: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  desktopStoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  desktopStoryProject: {
    fontSize: 14,
    marginBottom: 8,
  },
  desktopNewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  desktopNewBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  desktopRecommendationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -12,
    gap: 16,
  },
  desktopRecommendationCard: {
    width: 320,
    borderRadius: 16,
    marginBottom: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' as any,
      },
    }),
  },
  desktopRecommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  desktopTechAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopTechInitial: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  desktopMatchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  desktopMatchBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  desktopTechName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  desktopTechService: {
    fontSize: 14,
    marginBottom: 12,
  },
  desktopRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  desktopRatingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  desktopReviewCount: {
    fontSize: 14,
  },
  desktopDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  desktopDistanceText: {
    fontSize: 14,
  },
  desktopStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  desktopStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  desktopStatNumber: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  desktopStatLabel: {
    fontSize: 12,
  },
  desktopStatSeparator: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
  },
  desktopQuickHireButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  desktopQuickHireText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  desktopDropdownContainer: {
    position: 'relative',
  },
  desktopDropdown: {
    marginTop: 4,
    marginLeft: 48,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' as any,
      },
    }),
  },
  desktopDropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer' as any,
        transition: 'background-color 0.2s' as any,
      },
    }),
  },
  desktopDropdownIcon: {
    marginRight: 0,
  },
  desktopDropdownText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  iconButtonWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
