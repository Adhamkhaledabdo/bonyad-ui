import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Surface, Card } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BonyadLogo from '../components/BonyadLogo';
import { useTheme } from '../context/ThemeContext';
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
  const { colors } = useTheme();
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
        {/* TOP BAR - Mobile */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 50), backgroundColor: colors.cardBackground }]}>
          <View style={styles.topBarIcons}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => setActiveTab('notifications')}
            >
              <View style={styles.iconButtonWrapper}>
                <Ionicons name="notifications-outline" size={24} color={colors.primary} />
                {unreadNotificationCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: '#FF0000' }]}>
                    <Text style={styles.badgeText}>{String(unreadNotificationCount > 99 ? '99+' : unreadNotificationCount)}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => {
                setSelectedChat(null);
                setShowChatList(true);
                setActiveTab('chat');
              }}
            >
              <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogout} style={styles.iconButton}>
              <Ionicons name="log-out-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.logoContainer}>
            <BonyadLogo width={140} height={40} />
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
              style={[styles.iosButton, { backgroundColor: colors.cardBackground || '#FFFFFF', borderColor: '#FF9500', borderWidth: 2 }]}
              onPress={() => {
                // Navigate to portfolio management
                setActiveTab('profile');
                setProfileSubView('portfolio');
              }}
            >
              <View style={[styles.iosButtonIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                <Ionicons name="folder-open-outline" size={24} color="#FF9500" />
              </View>
              <Text style={[styles.iosButtonText, { color: colors.text || '#000000' }]}>
                {t('Create Portfolio')}
              </Text>
          </TouchableOpacity>
          )}

          {/* Projects Button with Sub-navigation */}
          <TouchableOpacity 
            style={[styles.iosButton, { backgroundColor: colors.cardBackground || '#FFFFFF' }]}
            onPress={() => setShowProjectsDropdown(!showProjectsDropdown)}
          >
            <View style={styles.iosButtonIconContainer}>
              <Ionicons name="briefcase-outline" size={24} color={colors.primary || '#0080E0'} />
            </View>
            <View style={styles.iosButtonTextContainer}>
              <Text style={[styles.iosButtonText, { color: colors.text || '#000000' }]}>{t('Projects')}</Text>
              <Text style={[styles.iosButtonSubtext, { color: colors.textSecondary || '#999999' }]}>{t('View all project statuses')}</Text>
            </View>
            <Ionicons 
              name={showProjectsDropdown ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colors.textSecondary || '#999999'} 
            />
          </TouchableOpacity>

          {/* Sub-navigation for Projects - Animated */}
          <Animated.View
            style={[
              styles.iosDropdown,
              {
                backgroundColor: colors.cardBackground || '#FFFFFF',
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
              style={[styles.iosDropdownItem, { borderBottomColor: colors.border || '#E5E5E5' }]}
                onPress={() => {
                  setShowProjectsDropdown(false);
                  setActiveTab('projects');
                  setCurrentProjectsFilter('available');
                }}
              >
              <View style={styles.iosDropdownIconContainer}>
                <Ionicons name="list-outline" size={22} color={colors.primary || '#0080E0'} />
              </View>
              <Text style={[styles.iosDropdownText, { color: colors.text || '#000000' }]}>{t('Look for Offers')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
              style={[styles.iosDropdownItem, { borderBottomColor: colors.border || '#E5E5E5' }]}
                onPress={() => {
                  setShowProjectsDropdown(false);
                  setActiveTab('projects');
                  setCurrentProjectsFilter('direct_offers');
                }}
              >
              <View style={styles.iosDropdownIconContainer}>
                <Ionicons name="mail-outline" size={22} color={colors.primary || '#0080E0'} />
              </View>
              <Text style={[styles.iosDropdownText, { color: colors.text || '#000000' }]}>{t('Direct Offers')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
              style={[styles.iosDropdownItem, { borderBottomColor: colors.border || '#E5E5E5' }]}
                onPress={() => {
                  setShowProjectsDropdown(false);
                  setActiveTab('projects');
                  setCurrentProjectsFilter('running');
                }}
              >
              <View style={styles.iosDropdownIconContainer}>
                <Ionicons name="trending-up-outline" size={22} color={colors.primary || '#0080E0'} />
              </View>
              <Text style={[styles.iosDropdownText, { color: colors.text || '#000000' }]}>{t('My Assigned Projects')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
              style={styles.iosDropdownItem}
                onPress={() => {
                  setShowProjectsDropdown(false);
                  setActiveTab('projects');
                  setCurrentProjectsFilter('bid_received');
                }}
              >
              <View style={styles.iosDropdownIconContainer}>
                <Ionicons name="checkmark-done-outline" size={22} color={colors.primary || '#0080E0'} />
            </View>
              <Text style={[styles.iosDropdownText, { color: colors.text || '#000000' }]}>{t('My Bids')}</Text>
          </TouchableOpacity>
          </Animated.View>

          {/* Appointments Button */}
          <TouchableOpacity 
            style={[styles.iosButton, { backgroundColor: colors.cardBackground || '#FFFFFF' }]}
            onPress={() => setActiveTab('appointments')}
          >
            <View style={styles.iosButtonIconContainer}>
              <Ionicons name="calendar-outline" size={24} color={colors.primary || '#0080E0'} />
          </View>
            <Text style={[styles.iosButtonText, { color: colors.text || '#000000' }]}>{t('Appointments')}</Text>
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

        {/* Mobile TAB BAR - New Design with Blue Container and White Home Button */}
        <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={[styles.tabBar, { backgroundColor: colors.primary || '#0080E0' }]}>
          <TouchableOpacity 
              style={styles.tabItem}
            onPress={() => setActiveTab('profile')}
          >
              <View style={styles.tabIconContainer}>
            <Ionicons 
                  name={activeTab === 'profile' ? "person" : "person-outline"} 
                  size={20} 
                  color={activeTab === 'profile' ? "#FFFFFF" : "#B0E0FF"} 
                />
              </View>
              <Text 
                style={[styles.tabLabel, activeTab === 'profile' && { color: '#FFFFFF' }]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.6}
              >
              {t('Profile')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
              style={[styles.tabItem, styles.tabItemBeforeHome]}
            onPress={() => setActiveTab('projects')}
          >
            <View style={styles.tabIconContainer}>
            <Ionicons 
                  name={activeTab === 'projects' ? "briefcase" : "briefcase-outline"} 
                  size={20} 
                  color={activeTab === 'projects' ? "#FFFFFF" : "#B0E0FF"} 
                />
              </View>
              <Text 
                style={[styles.tabLabel, activeTab === 'projects' && { color: '#FFFFFF' }]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.6}
              >
              {t('Projects')}
            </Text>
          </TouchableOpacity>

            {/* Home Button - Bigger with White Circle Background - Positioned Absolutely */}
            <View style={styles.homeButtonWrapper}>
          <TouchableOpacity 
                style={styles.homeTabItem}
            onPress={() => setActiveTab('home')}
          >
                <View style={styles.homeButtonCircle}>
            <Ionicons 
                    name="home" 
                    size={26} 
                    color={colors.primary || '#0080E0'} 
                  />
                </View>
          </TouchableOpacity>
            </View>

          <TouchableOpacity 
              style={[styles.tabItem, styles.tabItemAfterHome]}
            onPress={() => setActiveTab('appointments')}
          >
              <View style={styles.tabIconContainer}>
            <Ionicons 
                  name={activeTab === 'appointments' ? "calendar" : "calendar-outline"} 
                  size={20} 
                  color={activeTab === 'appointments' ? "#FFFFFF" : "#B0E0FF"} 
                />
              </View>
              <Text 
                style={[styles.tabLabel, activeTab === 'appointments' && { color: '#FFFFFF' }]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.6}
              >
                {t('appointments')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
              style={styles.tabItem}
            onPress={() => setActiveTab('wallet')}
          >
              <View style={styles.tabIconContainer}>
            <Ionicons 
                  name={activeTab === 'wallet' ? "wallet" : "wallet-outline"} 
                  size={20} 
                  color={activeTab === 'wallet' ? "#FFFFFF" : "#B0E0FF"} 
                />
              </View>
              <Text 
                style={[styles.tabLabel, activeTab === 'wallet' && { color: '#FFFFFF' }]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.6}
              >
              {t('Pay')}
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
      {/* Desktop Layout */}
      <View style={[styles.desktopContainer, isRTL && styles.desktopContainerRTL]}>
        {/* Sidebar - Positioned left for LTR, right for RTL */}
        <View style={[
          styles.desktopSidebar, 
          { backgroundColor: colors.cardBackground },
          isRTL 
            ? { borderLeftColor: colors.border, borderLeftWidth: 1, borderRightWidth: 0 }
            : { borderRightColor: colors.border, borderRightWidth: 1, borderLeftWidth: 0 },
          Platform.OS === 'web' && (isRTL ? { right: 0, left: 'auto' } : { left: 0, right: 'auto' })
        ]}>
          <View style={styles.desktopSidebarHeader}>
            <BonyadLogo width={140} height={40} />
          </View>

          <View style={styles.desktopSidebarContent}>
            <TouchableOpacity 
              style={[styles.desktopSidebarItem, activeTab === 'home' && styles.desktopSidebarItemActive, activeTab === 'home' && { backgroundColor: colors.primary + '15' }]}
              onPress={() => setActiveTab('home')}
            >
              <Ionicons 
                name={activeTab === 'home' ? 'home' : 'home-outline'} 
                size={24} 
                color={activeTab === 'home' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[styles.desktopSidebarText, { color: activeTab === 'home' ? colors.primary : colors.textSecondary }]}>
                {t('Home')}
              </Text>
            </TouchableOpacity>

            {/* Projects Dropdown */}
            <View>
              <TouchableOpacity 
                style={[styles.desktopSidebarItem, (activeTab === 'projects' || showProjectsDropdown) && styles.desktopSidebarItemActive, (activeTab === 'projects' || showProjectsDropdown) && { backgroundColor: colors.primary + '15' }]}
                onPress={() => {
                  // If clicking on Projects button, show dropdown and set active tab if not already active
                  if (!showProjectsDropdown) {
                    setShowProjectsDropdown(true);
                  } else {
                    setShowProjectsDropdown(false);
                  }
                  // Always set active tab to projects when clicking the Projects button
                  if (activeTab !== 'projects') {
                    setActiveTab('projects');
                  }
                }}
              >
                <Ionicons 
                  name={activeTab === 'projects' ? 'briefcase' : 'briefcase-outline'} 
                  size={24} 
                  color={(activeTab === 'projects' || showProjectsDropdown) ? colors.primary : colors.textSecondary} 
                />
                <Text style={[styles.desktopSidebarText, { color: (activeTab === 'projects' || showProjectsDropdown) ? colors.primary : colors.textSecondary }]}>
                  {t('Projects')}
                </Text>
                <Ionicons 
                  name={showProjectsDropdown ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={(activeTab === 'projects' || showProjectsDropdown) ? colors.primary : colors.textSecondary} 
                  style={{ marginLeft: 'auto' }} 
                />
              </TouchableOpacity>
              
              <Animated.View
                style={[
                  styles.desktopDropdown,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    maxHeight: desktopDropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 250],
                    }),
                    opacity: desktopDropdownAnim,
                    overflow: 'hidden',
                  },
                ]}
              >
                  <TouchableOpacity 
                    style={[styles.desktopDropdownItem, { borderBottomColor: colors.border, backgroundColor: currentProjectsFilter === 'available' ? colors.primary + '10' : 'transparent' }]}
                    onPress={() => {
                      setShowProjectsDropdown(false);
                      // Set active tab to projects and update filter - no navigation
                      setActiveTab('projects');
                      setCurrentProjectsFilter('available');
                    }}
                  >
                    <Ionicons name="search-outline" size={20} color={colors.primary} style={styles.desktopDropdownIcon} />
                    <Text style={[styles.desktopDropdownText, { color: currentProjectsFilter === 'available' ? colors.primary : colors.text, fontWeight: currentProjectsFilter === 'available' ? '600' : 'normal' }]}>
                      {t('Look for Offers')} <Text style={[styles.bidBadge, { color: colors.primary }]}>BID NOW!!!</Text>
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.desktopDropdownItem, { borderBottomColor: colors.border, backgroundColor: currentProjectsFilter === 'direct_offers' ? colors.warning + '10' : 'transparent' }]}
                    onPress={() => {
                      setShowProjectsDropdown(false);
                      // Set active tab to projects and update filter - no navigation
                      setActiveTab('projects');
                      setCurrentProjectsFilter('direct_offers');
                    }}
                  >
                    <Ionicons name="mail-outline" size={20} color={colors.warning} style={styles.desktopDropdownIcon} />
                    <Text style={[styles.desktopDropdownText, { color: currentProjectsFilter === 'direct_offers' ? colors.warning : colors.text, fontWeight: currentProjectsFilter === 'direct_offers' ? '600' : 'normal' }]}>{t('Direct Offers')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.desktopDropdownItem, { borderBottomColor: colors.border, backgroundColor: currentProjectsFilter === 'running' ? colors.success + '10' : 'transparent' }]}
                    onPress={() => {
                      setShowProjectsDropdown(false);
                      // Set active tab to projects and update filter - no navigation
                      setActiveTab('projects');
                      setCurrentProjectsFilter('running');
                    }}
                  >
                    <Ionicons name="build-outline" size={20} color="#4CAF50" style={styles.desktopDropdownIcon} />
                    <Text style={[styles.desktopDropdownText, { color: currentProjectsFilter === 'running' ? colors.success : colors.text, fontWeight: currentProjectsFilter === 'running' ? '600' : 'normal' }]}>{t('My Assigned Projects')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.desktopDropdownItem, { backgroundColor: currentProjectsFilter === 'bid_received' ? colors.warning + '10' : 'transparent' }]}
                    onPress={() => {
                      setShowProjectsDropdown(false);
                      // Set active tab to projects and update filter - no navigation
                      setActiveTab('projects');
                      setCurrentProjectsFilter('bid_received');
                    }}
                  >
                    <Ionicons name="cash-outline" size={20} color="#FFA500" style={styles.desktopDropdownIcon} />
                    <Text style={[styles.desktopDropdownText, { color: currentProjectsFilter === 'bid_received' ? '#FFA500' : colors.text, fontWeight: currentProjectsFilter === 'bid_received' ? '600' : 'normal' }]}>{t('My Bids')}</Text>
                  </TouchableOpacity>
              </Animated.View>
            </View>

            <TouchableOpacity 
              style={[styles.desktopSidebarItem, activeTab === 'appointments' && styles.desktopSidebarItemActive, activeTab === 'appointments' && { backgroundColor: colors.primary + '15' }]}
              onPress={() => setActiveTab('appointments')}
            >
              <Ionicons 
                name={activeTab === 'appointments' ? 'calendar' : 'calendar-outline'} 
                size={24} 
                color={activeTab === 'appointments' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[styles.desktopSidebarText, { color: activeTab === 'appointments' ? colors.primary : colors.textSecondary }]}>
                {t('Appointments')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.desktopSidebarItem, activeTab === 'chat' && styles.desktopSidebarItemActive, activeTab === 'chat' && { backgroundColor: colors.primary + '15' }]}
              onPress={() => {
                setSelectedChat(null);
                setShowChatList(true);
                setActiveTab('chat');
              }}
            >
              <View style={styles.iconButtonWrapper}>
                <Ionicons 
                  name={activeTab === 'chat' ? 'chatbubbles' : 'chatbubbles-outline'} 
                  size={24} 
                  color={activeTab === 'chat' ? colors.primary : colors.textSecondary} 
                />
              </View>
              <Text style={[styles.desktopSidebarText, { color: activeTab === 'chat' ? colors.primary : colors.textSecondary }]}>
                {t('Chat')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.desktopSidebarItem, activeTab === 'notifications' && styles.desktopSidebarItemActive, activeTab === 'notifications' && { backgroundColor: colors.primary + '15' }]}
              onPress={() => setActiveTab('notifications')}
            >
              <View style={styles.iconButtonWrapper}>
                <Ionicons 
                  name={activeTab === 'notifications' ? 'notifications' : 'notifications-outline'} 
                  size={24} 
                  color={activeTab === 'notifications' ? colors.primary : colors.textSecondary} 
                />
                {unreadNotificationCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: '#FF0000' }]}>
                    <Text style={styles.badgeText}>{String(unreadNotificationCount > 99 ? '99+' : unreadNotificationCount)}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.desktopSidebarText, { color: activeTab === 'notifications' ? colors.primary : colors.textSecondary }]}>
                {t('Notifications')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.desktopSidebarItem, activeTab === 'wallet' && styles.desktopSidebarItemActive, activeTab === 'wallet' && { backgroundColor: colors.primary + '15' }]}
              onPress={() => setActiveTab('wallet')}
            >
              <Ionicons 
                name={activeTab === 'wallet' ? 'wallet' : 'wallet-outline'} 
                size={24} 
                color={activeTab === 'wallet' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[styles.desktopSidebarText, { color: activeTab === 'wallet' ? colors.primary : colors.textSecondary }]}>
                {t('Pay')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.desktopSidebarItem, activeTab === 'profile' && styles.desktopSidebarItemActive, activeTab === 'profile' && { backgroundColor: colors.primary + '15' }]}
              onPress={() => setActiveTab('profile')}
            >
              <Ionicons 
                name={activeTab === 'profile' ? 'person' : 'person-outline'} 
                size={24} 
                color={activeTab === 'profile' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[styles.desktopSidebarText, { color: activeTab === 'profile' ? colors.primary : colors.textSecondary }]}>
                {t('Profile')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.desktopSidebarFooter}>
            <TouchableOpacity 
              style={[styles.desktopSidebarItem]}
              onPress={onLogout}
            >
              <Ionicons name="log-out-outline" size={24} color={colors.textSecondary} />
              <Text style={[styles.desktopSidebarText, { color: colors.textSecondary }]}>
                {t('Logout')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Area */}
        <View style={[
          styles.desktopMainContainer,
          Platform.OS === 'web' && (isRTL ? { marginRight: 250 } : { marginLeft: 250 })
        ]}>
          {/* Top Header */}
          <View style={[styles.desktopHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
            <Text style={[styles.desktopHeaderTitle, { color: colors.text }]}>
              {activeTab === 'home' ? t('Home') :
               activeTab === 'projects' ? t('Projects') :
               activeTab === 'appointments' ? t('Appointments') :
               activeTab === 'chat' ? t('Chat') :
               activeTab === 'notifications' ? t('Notifications') :
               activeTab === 'wallet' ? t('Pay') :
               activeTab === 'profile' ? t('Profile') : t('Home')}
            </Text>
          </View>

          {/* Tab Content */}
          {activeTab === 'home' && (
            <ScrollView style={[styles.desktopMainContent, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={true}>

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


            </ScrollView>
          )}

          {activeTab === 'projects' && (
            <View style={styles.desktopMainContent}>
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
            <View style={styles.desktopMainContent}>
              <AppointmentsScreen />
            </View>
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
            <View style={styles.desktopMainContent}>
              <NotificationsScreen
                onUnreadCountChange={setUnreadNotificationCount}
              />
            </View>
          )}

          {activeTab === 'wallet' && (
            <View style={styles.desktopMainContent}>
              <CommissionPaymentScreen />
            </View>
          )}

          {activeTab === 'profile' && (
            <View style={styles.desktopMainContent}>
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
              ) : null}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
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
    backgroundColor: 'rgba(0, 128, 224, 0.1)',
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
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  iosDropdownItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: '#E5E5E5',
  },
  iosDropdownIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 128, 224, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iosDropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
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
    flexDirection: 'row',
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
  desktopMainContent: {
    flex: 1,
    paddingHorizontal: 40,
    paddingVertical: 30,
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
