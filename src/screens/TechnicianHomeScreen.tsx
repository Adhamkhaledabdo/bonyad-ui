import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Surface, Card } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import BonyadLogo from '../components/BonyadLogo';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import ProjectsScreen from './ProjectsScreen';
import AppointmentsScreen from './AppointmentsScreen';
import ChatRoomsListScreen from './ChatRoomsListScreen';
import ChatDetailScreen from './ChatDetailScreen';
import NotificationsScreen from './NotificationsScreen';
import ProfileScreen from './ProfileScreen';
import MyDataScreen from './MyDataScreen';
import EditProfileScreen from './EditProfileScreen';
import ChangePasswordScreen from './ChangePasswordScreen';
import ChangePhoneScreen from './ChangePhoneScreen';
import VerifyPhoneChangeScreen from './VerifyPhoneChangeScreen';
import PortfolioManagement from '../components/PortfolioManagement';
import SubscriptionScreen from './SubscriptionScreen';
import ServiceManagementScreen from './ServiceManagementScreen';
import AvailabilityScreen from './AvailabilityScreen';
import CommissionPaymentScreen from './CommissionPaymentScreen';
import Footer from '../components/Footer';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import { storage } from '../utils/storage';
import { checkHasPortfolio } from '../services/PortfolioService';

interface TechnicianHomeScreenProps {
  onShowProfile: () => void;
  onLogout: () => void;
  onShowProjects?: (filter?: 'all' | 'available') => void;
  onShowChat?: () => void;
  onShowRunningProjects?: () => void;
  onShowNotifications?: () => void;
  onShowAppointments?: () => void;
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
  projectsFilter?: 'available' | 'running' | 'completed' | 'bid_received' | 'direct_offers';
}

export default function TechnicianHomeScreen({ 
  onLogout, 
  onShowProfile, 
  onShowProjects, 
  onShowChat, 
  onShowRunningProjects, 
  onShowNotifications, 
  onShowAppointments, 
  userName,
  userId = 0,
  authToken = '',
  onNavigateToChatDetail,
  onNavigateToEditProfile,
  onNavigateToPortfolio,
  onNavigateToSubscription,
  onNavigateToServices,
  onNavigateToAvailability,
  projectsFilter = 'available',
}: TechnicianHomeScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const [isAvailable, setIsAvailable] = useState(true);
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [currentProjectsFilter, setCurrentProjectsFilter] = useState<'available' | 'running' | 'completed' | 'bid_received' | 'direct_offers'>(projectsFilter || 'available');
  const [profileSubView, setProfileSubView] = useState<'myData' | 'editProfile' | 'portfolio' | 'subscription' | 'services' | 'availability' | 'changePassword' | 'changePhone' | 'verifyPhoneChange' | null>(null);
  const [phoneChangeNumber, setPhoneChangeNumber] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<{ roomId: string; receiverId: number; receiverName: string; projectId?: number | null } | null>(null);
  const [showChatList, setShowChatList] = useState(true);
  const insets = useSafeAreaInsets();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [hasPortfolio, setHasPortfolio] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<{ name?: string; avatar?: string; profileImage?: string } | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // Animation values for dropdowns
  const mobileDropdownAnim = useRef(new Animated.Value(0)).current;
  const desktopDropdownAnim = useRef(new Animated.Value(0)).current;
  
  // RTL detection
  const isRTL = i18n.language === 'ar';
  
  // Update document direction on web when language changes
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', i18n.language);
    }
  }, [isRTL, i18n.language]);

  // Check portfolio status on mount and when returning to home tab
  useEffect(() => {
    const fetchPortfolioStatus = async () => {
      try {
        const hasPortfolioStatus = await checkHasPortfolio();
        setHasPortfolio(hasPortfolioStatus);
      } catch (error) {
        console.error('❌ [TechnicianHomeScreen] Error checking portfolio:', error);
        setHasPortfolio(false); // Default to false on error
      }
    };

    if (activeTab === 'home') {
      fetchPortfolioStatus();
    }
  }, [activeTab]);

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
  
  // Reset sub-views when switching tabs
  useEffect(() => {
    if (activeTab !== 'profile') {
      setProfileSubView(null);
    }
    if (activeTab !== 'chat') {
      setSelectedChat(null);
      setShowChatList(true);
    }
  }, [activeTab]);

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
  const shouldRenderMobile = !IS_WEB || IS_SMALL_WEB;

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
          const baseUrl = 'https://bonyad-hub.com';
          if (data.profileImage && !data.profileImage.startsWith('http')) {
            data.profileImage = `${baseUrl}${data.profileImage}`;
          }
          if (data.avatar && !data.avatar.startsWith('http')) {
            data.avatar = `${baseUrl}${data.avatar}`;
          }
          setUserProfile({
            name: data.name || userName || 'Technician',
            avatar: data.profileImage || data.avatar,
            profileImage: data.profileImage || data.avatar,
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile({ name: userName || 'Technician' });
      }
    };

    if (IS_WEB && screenWidth >= 1200) {
      fetchProfile();
    }
  }, [authToken, userName, screenWidth, IS_WEB]);

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    try {
      const token = authToken || await storage.getAuthToken();
      if (!token) {
        return 0;
      }

      const url = buildApiUrl(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const count = typeof data === 'number' ? data : (data.count || data.unreadCount || data.unread_count || 0);
        setUnreadNotificationCount(count);
        return count;
      }
    } catch (error) {
      console.error('❌ Error fetching unread count:', error);
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
    
    const timeoutId = setTimeout(() => {
      loadCount();
      
      intervalId = setInterval(() => {
        if (mounted) {
          loadCount();
        }
      }, 30000);
    }, 500);
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // Also refresh when authToken becomes available
  useEffect(() => {
    if (authToken) {
      fetchUnreadCount();
    }
  }, [authToken]);

  // Refresh unread count when notifications tab becomes active
  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchUnreadCount();
    }
  }, [activeTab]);

  const activeJobs = [
    { id: 1, customer: 'Ahmed Ali', service: 'Fix Leaky Faucet', location: 'Riyadh', price: '150 SAR', status: 'Active' },
    { id: 2, customer: 'Sara Mohamed', service: 'Install AC Unit', location: 'Jeddah', price: '300 SAR', status: 'Active' },
  ];

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

        {/* Render tab content */}
        {activeTab === 'home' && (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={[styles.scrollView, { backgroundColor: colors.background }]}
            contentContainerStyle={{ paddingBottom: 120 }}
          >

        {/* Fixed Buttons - iOS Style Design */}
        <View style={styles.section}>
          {/* Create Portfolio Button - Only show if portfolio doesn't exist */}
          {hasPortfolio === false && (
            <TouchableOpacity 
              style={[styles.iosButton, { backgroundColor: colors.cardBackground, borderColor: '#FF9500', borderWidth: 2 }]}
              onPress={() => {
                // Navigate to portfolio management
                setActiveTab('profile');
                setProfileSubView('portfolio');
              }}
            >
              <View style={[styles.iosButtonIconContainer, { backgroundColor: isDarkMode ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.1)' }]}>
                <Ionicons name="folder-open-outline" size={24} color="#FF9500" />
              </View>
              <Text style={[styles.iosButtonText, { color: colors.text, fontSize: scaledSize(16) }]}>
                {t('Create Portfolio')}
              </Text>
          </TouchableOpacity>
          )}

          {/* Projects Button with Sub-navigation */}
          <TouchableOpacity 
            style={[styles.iosButton, { backgroundColor: colors.cardBackground, borderColor: isDarkMode ? colors.border : 'rgba(0, 0, 0, 0.05)' }]}
            onPress={() => setShowProjectsDropdown(!showProjectsDropdown)}
          >
            <View style={[styles.iosButtonIconContainer, { backgroundColor: isDarkMode ? colors.primary + '30' : 'rgba(0, 128, 224, 0.1)' }]}>
              <Ionicons name="briefcase-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.iosButtonTextContainer}>
              <Text style={[styles.iosButtonText, { color: colors.text, fontSize: scaledSize(16) }]}>{t('Projects')}</Text>
              <Text style={[styles.iosButtonSubtext, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>{t('View all project statuses')}</Text>
            </View>
            <Ionicons 
              name={showProjectsDropdown ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          {/* Sub-navigation for Projects - Animated */}
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
              <Text style={[styles.iosDropdownText, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Look for Offers')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
              style={[styles.iosDropdownItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setShowProjectsDropdown(false);
                  setActiveTab('projects');
                  setCurrentProjectsFilter('direct_offers');
                }}
              >
              <View style={[styles.iosDropdownIconContainer, { backgroundColor: isDarkMode ? colors.primary + '30' : 'rgba(0, 128, 224, 0.1)' }]}>
                <Ionicons name="mail-outline" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.iosDropdownText, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Direct Offers')}</Text>
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
              <Text style={[styles.iosDropdownText, { color: colors.text, fontSize: scaledSize(14) }]}>{t('My Assigned Projects')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
              style={styles.iosDropdownItem}
                onPress={() => {
                  setShowProjectsDropdown(false);
                  setActiveTab('projects');
                  setCurrentProjectsFilter('bid_received');
                }}
              >
              <View style={[styles.iosDropdownIconContainer, { backgroundColor: isDarkMode ? colors.primary + '30' : 'rgba(0, 128, 224, 0.1)' }]}>
                <Ionicons name="checkmark-done-outline" size={22} color={colors.primary} />
            </View>
              <Text style={[styles.iosDropdownText, { color: colors.text, fontSize: scaledSize(14) }]}>{t('My Bids')}</Text>
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


            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {/* Render other tabs */}
        {activeTab === 'projects' && (
          <View style={{ flex: 1 }}>
            <ProjectsScreen
              onRequestVisit={(userId, userName, projectId) => {
                // For technicians, requesting a visit means booking an appointment with the user
                // This will be handled by the booking system
                console.log('🔵 [TechnicianHomeScreen] Request visit for user:', userId, 'project:', projectId);
                // TODO: Implement visit request flow for technicians
              }}
              filter={currentProjectsFilter}
              onFilterChange={(newFilter) => {
                setCurrentProjectsFilter(newFilter as any);
              }}
              onOpenChat={onNavigateToChatDetail || (() => {})}
            />
          </View>
        )}

        {activeTab === 'appointments' && (
          <View style={{ flex: 1 }}>
            <AppointmentsScreen />
          </View>
        )}

        {activeTab === 'chat' && (
          <View
            style={{
              flex: 1,
              flexDirection: IS_LARGE_WEB ? 'row' : 'column',
            }}
          >
            {(showChatList || IS_LARGE_WEB) && (
              <View
                style={[
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
                  },
                ]}
              >
              <ChatRoomsListScreen
                onOpenChat={(roomId, receiverId, receiverName, projectId) => {
                  setSelectedChat({ roomId, receiverId, receiverName, projectId: projectId ?? undefined });
                  setShowChatList(IS_LARGE_WEB);
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

            {selectedChat && (
              <View
                style={[
                  { flex: 1 },
                  IS_LARGE_WEB && {
                    flex: 0.65,
                    ...Platform.select({
                      web: {
                        minWidth: 400,
                      } as any,
                    }),
                  },
                ]}
              >
              <ChatDetailScreen
                roomId={selectedChat.roomId}
                receiverId={selectedChat.receiverId}
                receiverName={selectedChat.receiverName}
                  projectId={selectedChat.projectId ?? undefined}
                  onBack={
                    IS_LARGE_WEB
                      ? undefined
                      : () => {
                          setSelectedChat(null);
                          setShowChatList(true);
                        }
                  }
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

        {activeTab === 'wallet' && (
          <View style={{ flex: 1 }}>
            <CommissionPaymentScreen />
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
                isTechnician={true}
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

            {/* Payments/Wallet */}
            <TouchableOpacity 
              style={styles.figmaTabItem}
              onPress={() => setActiveTab('wallet')}
            >
              <Ionicons 
                name={activeTab === 'wallet' ? "card" : "card-outline"} 
                size={24} 
                color={activeTab === 'wallet' ? colors.primary : (isDarkMode ? colors.textSecondary : "#6E6E6E")} 
              />
              <Text style={[
                styles.figmaTabLabel, 
                { color: activeTab === 'wallet' ? colors.primary : (isDarkMode ? colors.textSecondary : "#383838"), fontSize: scaledSize(12) }
              ]}>
                {t('Payments')}
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

  // Render desktop/web layout
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            <Text style={[styles.desktopNavTabText, activeTab === 'home' && styles.desktopNavTabTextActive, { fontSize: scaledSize(16) }]}>
              {t('Dashboard')}
              </Text>
            </TouchableOpacity>
              <TouchableOpacity 
            style={[styles.desktopNavTab, activeTab === 'projects' && styles.desktopNavTabActive]}
            onPress={() => setActiveTab('projects')}
              >
            <Text style={[styles.desktopNavTabText, activeTab === 'projects' && styles.desktopNavTabTextActive, { fontSize: scaledSize(16) }]}>
                  {t('Projects')}
                </Text>
              </TouchableOpacity>
                  <TouchableOpacity 
            style={[styles.desktopNavTab, activeTab === 'appointments' && styles.desktopNavTabActive]}
            onPress={() => setActiveTab('appointments')}
                  >
            <Text style={[styles.desktopNavTabText, activeTab === 'appointments' && styles.desktopNavTabTextActive, { fontSize: scaledSize(16) }]}>
              {t('Appointments')}
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
                    {(userProfile?.name || userName || 'T').charAt(0).toUpperCase()}
              </Text>
                  </View>
                )}
              </View>
            <View style={styles.desktopNavProfileInfo}>
              <Text style={styles.desktopNavProfileName}>
                {userProfile?.name || userName || t('Technician')}
              </Text>
              <Text style={styles.desktopNavProfileRole}>{t('Technician')}</Text>
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
                <Text style={[styles.desktopNavProfileDropdownText, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Profile')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.desktopNavProfileDropdownItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setShowProfileDropdown(false);
                  setActiveTab('wallet');
                }}
            >
                <Ionicons name="wallet-outline" size={20} color={colors.text} />
                <Text style={[styles.desktopNavProfileDropdownText, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Pay')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.desktopNavProfileDropdownItem}
                onPress={() => {
                  setShowProfileDropdown(false);
                  onLogout();
                }}
            >
                <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.desktopNavProfileDropdownText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>{t('Logout')}</Text>
            </TouchableOpacity>
          </View>
          )}
        </View>
          </View>

      {/* Main Content Area */}
      <View style={styles.desktopMainContentWrapper}>
          {/* Tab Content */}
          {activeTab === 'home' && (
            <ScrollView 
              style={[styles.desktopMainContent, { backgroundColor: colors.background }]} 
              contentContainerStyle={styles.scrollContentWithFooter}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.mainContentWrapper}>
              {/* Create Portfolio Button - Desktop - Only show if portfolio doesn't exist */}
              {hasPortfolio === false && (
              <View style={styles.desktopSection}>
                  <TouchableOpacity 
                    style={[styles.desktopCreatePortfolioButton, { backgroundColor: colors.cardBackground || '#FFFFFF', borderColor: '#FF9500' }]}
                    onPress={() => {
                      // Navigate to portfolio management
                      setActiveTab('profile');
                      setProfileSubView('portfolio');
                    }}
                  >
                    <View style={[styles.desktopCreatePortfolioIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                      <Ionicons name="folder-open-outline" size={28} color="#FF9500" />
                </View>
                    <View style={styles.desktopCreatePortfolioTextContainer}>
                      <Text style={[styles.desktopCreatePortfolioTitle, { color: colors.text || '#000000' }]}>
                        {t('Create Portfolio')}
                            </Text>
                      <Text style={[styles.desktopCreatePortfolioSubtitle, { color: colors.textSecondary || '#666666' }]}>
                        {t('Start building your professional portfolio today')}
                          </Text>
                          </View>
                    <Ionicons name="chevron-forward" size={24} color="#FF9500" />
                  </TouchableOpacity>
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
                onRequestVisit={(userId, userName, projectId) => {
                  // For technicians, requesting a visit means booking an appointment with the user
                  // This will be handled by the booking system
                  console.log('🔵 [TechnicianHomeScreen] Request visit for user:', userId, 'project:', projectId);
                  // TODO: Implement visit request flow for technicians
                }}
                  filter={currentProjectsFilter}
                  onFilterChange={(newFilter) => {
                    setCurrentProjectsFilter(newFilter as any);
                  }}
                  onOpenChat={onNavigateToChatDetail || (() => {})}
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

          {activeTab === 'chat' && (
            <View style={[styles.desktopMainContent, { flexDirection: selectedChat ? 'row' : 'column' }]}>
              {/* Chat List - Always visible on left when chat is selected */}
              <View style={[
                { flex: 1 },
                selectedChat && {
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
                    setSelectedChat({ roomId, receiverId, receiverName, projectId: projectId ?? undefined });
                    setShowChatList(IS_LARGE_WEB);
                  }}
                />
              </View>
              
              {/* Chat Detail - Shows on right side when chat is selected */}
              {selectedChat && (
                <View style={[
                  { flex: 1 },
                  {
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
                  onBack={
                    IS_LARGE_WEB
                      ? undefined
                      : () => {
                          setSelectedChat(null);
                          setShowChatList(true);
                        }
                  }
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

          {activeTab === 'wallet' && (
            <ScrollView 
              style={styles.desktopMainContent} 
              contentContainerStyle={styles.scrollContentWithFooter}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.mainContentWrapper}>
                <CommissionPaymentScreen />
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
                    isTechnician={true}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#f5f5f5',
    ...Platform.select({
      web: {
        position: 'relative' as any,
        overflow: 'visible' as any,
      },
    }),
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
    backgroundColor: Colors.primary,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    padding: 5,
  },
  logoContainer: {
    height: 40,
    width: 120,
  },
  logoImage: {
    height: '100%',
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  availabilityCard: {
    elevation: 3,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  availabilityStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  toggle: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  },
  iosButtonSubtext: {
    fontSize: 13,
    fontWeight: '400',
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
    backgroundColor: '#fff',
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
    color: '#333',
    flex: 1,
  },
  dropdown: {
    backgroundColor: '#fff',
    marginBottom: 10,
    marginLeft: 40,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
  },
  bidBadge: {
    color: '#FF0000',
    fontWeight: 'bold',
  },
  earningsCard: {
    elevation: 3,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  earningsCurrency: {
    fontSize: 18,
    marginBottom: 10,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    marginBottom: 15,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalProgress: {
    marginTop: 10,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  goalText: {
    fontSize: 12,
    marginTop: 8,
  },
  levelCard: {
    elevation: 3,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  levelBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  levelNumber: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  levelStats: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  streakText: {
    fontSize: 12,
    color: '#666',
  },
  xpBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  xpText: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
  },
  hotProjectCard: {
    width: Dimensions.get('window').width * 0.8,
    marginRight: 15,
    elevation: 5,
  },
  hotProjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  hotProjectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  hotProjectCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  hotProjectDetails: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10,
  },
  hotProjectDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hotProjectBudget: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  hotProjectDuration: {
    fontSize: 14,
    color: '#666',
  },
  hotProjectFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 15,
  },
  postedTime: {
    fontSize: 12,
    color: '#999',
  },
  separator: {
    fontSize: 12,
    color: '#ccc',
  },
  biddersText: {
    fontSize: 12,
    color: '#999',
  },
  bidNowButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bidNowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  aiCard: {
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B00',
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  aiIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '600',
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  aiMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  aiButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    paddingHorizontal: 8, // Add horizontal padding for spacing
    marginHorizontal: 4, // Add margin between buttons
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
  // Badge styles
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
  desktopDropdown: {
    marginTop: 4,
    marginLeft: 48,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' as any,
        zIndex: 1000,
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
  // Desktop styles
  desktopContainer: {
    flex: 1,
    flexDirection: 'column',
    ...Platform.select({
      web: {
        minHeight: '100vh' as any,
        position: 'relative' as any,
        overflow: 'visible' as any,
      },
    }),
  },
  desktopContainerRTL: {
    flexDirection: 'row-reverse',
  },
  desktopSidebar: {
    width: 250,
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      top: 0,
      bottom: 0,
      height: '100vh' as any,
    }),
  },
  desktopSidebarHeader: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  desktopSidebarContent: {
    flex: 1,
    paddingVertical: 20,
  },
  desktopSidebarFooter: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  desktopSidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 12,
  },
  desktopSidebarItemActive: {
    // Active state handled by inline styles
  },
  desktopSidebarText: {
    fontSize: 16,
    fontWeight: '500',
  },
  desktopMainContainer: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      // Margin will be set dynamically based on RTL in component
    }),
  },
  desktopHeader: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  desktopHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
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
  desktopSection: {
    marginBottom: 40,
  },
  desktopCreatePortfolioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF9500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...Platform.select({
      web: {
        maxWidth: 600,
        cursor: 'pointer' as any,
        transition: 'all 0.3s ease' as any,
        ':hover': {
          transform: 'translateY(-2px)' as any,
          boxShadow: '0 4px 12px rgba(255, 149, 0, 0.2)' as any,
        },
      },
    }),
  },
  desktopCreatePortfolioIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  desktopCreatePortfolioTextContainer: {
    flex: 1,
  },
  desktopCreatePortfolioTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  desktopCreatePortfolioSubtitle: {
    fontSize: 14,
    fontWeight: '400',
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
  desktopRatingRow: {
    flexDirection: 'row',
    gap: 2,
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
  desktopHotProjectCard: {
    width: 350,
    marginRight: 16,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' as any,
      },
    }),
  },
});
