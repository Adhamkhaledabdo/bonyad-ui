import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_BASE_URL, API_ENDPOINTS, buildApiUrl } from '../config/api';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';

// Figma Design Colors
const FIGMA_COLORS = {
  primary: '#005DAC',
  primaryDark: '#003867',
  primaryLight: '#E6EFF7',
  purple: '#6A0DAD',
  purpleLight: '#EFE6F5',
  greenSuccess: '#1A9F78',
  greenLight: '#E6F5EC',
  textBody: '#383838',
  textSecondary: '#999999',
  textGray: '#A3A3A3',
  divider: '#D9D9D9',
  white: '#FFFFFF',
  iconBg: '#E6EFF7',
};

interface ProfileScreenProps {
  onLogout: () => void;
  onBack?: () => void;
  onNavigateToEditProfile?: () => void;
  onNavigateToPortfolio?: () => void;
  onNavigateToSubscription?: () => void;
  onNavigateToServices?: () => void;
  onNavigateToAvailability?: () => void;
}

interface UserDetails {
  id: number;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  phoneNumber?: string;
  avatar?: string;
  profileImage?: string;
  role: string;
  status?: string;
  regions?: Array<{ id: number; nameEn: string; nameAr: string }>;
  yearsOfExperience?: number;
  hasPortfolio?: boolean;
  certificates?: Array<any>;
  description?: string;
  services?: Array<any>;
  averageRating?: number;
  subscriptionCategory?: {
    id: number;
    nameEn: string;
    nameAr: string;
    price: number;
    durationDays: number;
  };
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  propertiesCount?: number;
  appointmentsCount?: number;
  ticketsCount?: number;
}

export default function ProfileScreen({ 
  onLogout, 
  onBack, 
  onNavigateToEditProfile, 
  onNavigateToPortfolio, 
  onNavigateToSubscription, 
  onNavigateToServices, 
  onNavigateToAvailability 
}: ProfileScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, theme, toggleTheme } = useTheme();
  const { fontFamily, fontSizeScale, setFontSizeScale, scaledSize } = useFontFamily();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState(i18n.language);
  const isDarkMode = theme === 'dark';
  const isRTL = i18n.language === 'ar';
  
  // Custom popup hooks
  const { alertState, showError, hideAlert } = useAlertPopup();
  const { confirmState, showLogoutConfirmation, hideConfirmation } = useConfirmationPopup();

  // Watch for language changes and force re-render
  useEffect(() => {
    setLanguage(i18n.language);
    
    const handleLanguageChange = (lng: string) => {
      console.log('🌐 Language changed to:', lng);
      setLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('No authentication token found'), t('Error'));
        return;
      }

      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.USER.PROFILE),
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Construct full URLs for images
        if (data.profileImage || data.avatar) {
          const imagePath = data.profileImage || data.avatar;
          if (!imagePath.startsWith('http')) {
            data.avatar = `${API_BASE_URL.replace('/api', '')}${imagePath}`;
          } else {
            data.avatar = imagePath;
          }
        }

        setUserDetails(data);
      } else {
        showError(t('Failed to load profile'), t('Error'));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showError(t('Failed to load profile'), t('Error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    showLogoutConfirmation(
      t('Logout'),
      t('profile.confirmLogout'),
      onLogout
    );
  };

  const toggleLanguage = () => {
    const currentLang = i18n.language;
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    
    i18n.changeLanguage(newLang).then(() => {
      console.log('Language changed to:', newLang);
      setLanguage(newLang);
      
      // Force document direction change on web for RTL support
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.documentElement.setAttribute('dir', newLang === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', newLang);
      }
    }).catch((error) => {
      console.error('Error changing language:', error);
    });
  };

  const cycleFontSize = () => {
    const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
    const currentIndex = sizes.indexOf(fontSizeScale);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setFontSizeScale(sizes[nextIndex]);
  };

  const getFontSizeLabel = () => {
    switch (fontSizeScale) {
      case 'small': return isRTL ? 'صغير' : 'S';
      case 'medium': return isRTL ? 'متوسط' : 'M';
      case 'large': return isRTL ? 'كبير' : 'L';
      default: return 'M';
    }
  };

  const handleToggleDarkMode = () => {
    toggleTheme();
  };

  // Theme-aware colors
  const bgColor = isDarkMode ? colors.background : FIGMA_COLORS.white;
  const cardBgColor = isDarkMode ? colors.cardBackground : FIGMA_COLORS.white;
  const textColor = isDarkMode ? colors.text : FIGMA_COLORS.textBody;
  const headerTextColor = isDarkMode ? colors.text : FIGMA_COLORS.primaryDark;
  const secondaryTextColor = isDarkMode ? colors.textSecondary : FIGMA_COLORS.textSecondary;
  const dividerColor = isDarkMode ? colors.border : FIGMA_COLORS.divider;
  const primaryColor = isDarkMode ? colors.primary : FIGMA_COLORS.primary;
  const iconBgColor = isDarkMode ? colors.surface : FIGMA_COLORS.iconBg;
  const statBgColor = isDarkMode ? colors.surface : FIGMA_COLORS.purpleLight;
  const statBorderColor = isDarkMode ? colors.border : FIGMA_COLORS.purple;
  const successColor = isDarkMode ? colors.success : FIGMA_COLORS.greenSuccess;
  const successBgColor = isDarkMode ? 'rgba(26, 159, 120, 0.15)' : FIGMA_COLORS.greenLight;
  const avatarBgColor = isDarkMode ? colors.surface : FIGMA_COLORS.primaryLight;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top, backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  const user = userDetails;
  const isTechnician = user?.role?.toUpperCase() === 'TECHNICIAN';
  const isVerified = user?.status === 'APPROVED' || user?.status === 'VERIFIED';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 120), paddingTop: 16 }}
      >
        {/* Page Title */}
        <View style={styles.pageTitleContainer}>
          <Text style={[styles.pageTitle, { color: headerTextColor, fontFamily, fontSize: scaledSize(20) }]}>{t('profile.myProfile')}</Text>
        </View>

        {/* Main Profile Card */}
        <View style={[styles.mainCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
          {/* User Welcome Section - Clickable to open settings */}
          <TouchableOpacity 
            style={[styles.userWelcomeSection, isRTL && styles.rowRTL]} 
            onPress={() => {
              // For technicians, navigate to MyDataScreen (settings screen)
              if (isTechnician) {
                onNavigateToEditProfile?.();
              } else {
                onNavigateToEditProfile?.();
              }
            }}
          >
            <View style={[styles.profileImageContainer, { backgroundColor: avatarBgColor }]}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.profileImage} />
              ) : (
                <Ionicons name="person" size={24} color={primaryColor} />
              )}
            </View>
            <View style={[styles.userWelcomeText, isRTL && styles.textContainerRTL]}>
              <Text style={[styles.welcomeLabel, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
                {t('Welcome')}
              </Text>
              <Text style={[styles.userName, { color: headerTextColor, fontFamily, fontSize: scaledSize(16) }, isRTL && styles.textRTL]}>
                {user?.name || t('profile.usernamePlaceholder')}
              </Text>
            </View>
            <Ionicons 
              name={isRTL ? 'chevron-back' : 'chevron-forward'} 
              size={24} 
              color={primaryColor} 
            />
          </TouchableOpacity>

          {/* Divider */}
          <View style={[styles.cardDivider, { backgroundColor: dividerColor }]} />

          {/* My Info Section */}
          <View style={styles.myInfoSection}>
            <View style={[styles.myInfoHeader, isRTL && styles.rowRTL]}>
              <View style={isRTL && styles.textContainerRTL}>
                <Text style={[styles.myInfoTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }, isRTL && styles.textRTL]}>
                  {t('profile.myInfo')}
                </Text>
                <Text style={[styles.myInfoSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
                  {t('profile.userAccount')}
                </Text>
            </View>
          </View>

            {/* Info Rows */}
            <View style={styles.infoRows}>
              {/* Account Status */}
              <View style={[styles.infoRow, isRTL && styles.rowRTL]}>
                <Text style={[styles.infoLabel, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
                  {t('profile.accountStatus')}
                </Text>
                <View style={[styles.verifiedBadge, { backgroundColor: successBgColor, borderColor: successColor }]}>
                  <Ionicons name="checkmark-circle" size={10} color={successColor} />
                  <Text style={[styles.verifiedText, { color: successColor, fontFamily, fontSize: scaledSize(14) }]}>
                    {isVerified ? t('profile.verified') : t('profile.pending')}
                  </Text>
                </View>
              </View>

              {/* Email */}
              <View style={[styles.infoRow, isRTL && styles.rowRTL]}>
                <Text style={[styles.infoLabel, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
                  {t('profile.email')}
                </Text>
                <Text style={[styles.infoValue, { color: textColor, fontFamily, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
                  {user?.email || '-'}
                </Text>
              </View>

              {/* Phone Number */}
              <View style={[styles.infoRow, isRTL && styles.rowRTL]}>
                <Text style={[styles.infoLabel, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
                  {t('profile.phoneNumber')}
                </Text>
                <Text style={[styles.infoValue, { color: textColor, fontFamily, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
                  {user?.phone || user?.phoneNumber || '-'}
                </Text>
              </View>
                </View>
                </View>

          {/* Stats Cards */}
          <View style={[styles.statsContainer, isRTL && styles.rowRTL]}>
            <View style={[styles.statCard, { backgroundColor: statBgColor, borderColor: statBorderColor }]}>
              <Text style={[styles.statNumber, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>{user?.propertiesCount || 0}</Text>
              <Text style={[styles.statLabel, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>{t('profile.properties')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: statBgColor, borderColor: statBorderColor }]}>
              <Text style={[styles.statNumber, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>{user?.appointmentsCount || 0}</Text>
              <Text style={[styles.statLabel, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>{t('profile.appointments')}</Text>
                  </View>
            <View style={[styles.statCard, { backgroundColor: statBgColor, borderColor: statBorderColor }]}>
              <Text style={[styles.statNumber, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>{user?.ticketsCount || 0}</Text>
              <Text style={[styles.statLabel, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>{t('profile.ticket')}</Text>
                    </View>
                  </View>
                  </View>

        {/* Settings Section Card */}
       
        {/* Technician Menu Items - Only Portfolio and Subscription */}
        {isTechnician && (
          <>
            {/* My Portfolio Card */}
            <View style={[styles.technicianCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
              <TouchableOpacity 
                style={[styles.menuItem, isRTL && styles.rowRTL]}
                onPress={() => onNavigateToPortfolio?.()}
              >
                <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
                  <Ionicons name="briefcase-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
                </View>
                <View style={[styles.settingTextContainer, isRTL && styles.textContainerRTL]}>
                  <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }, isRTL && styles.textRTL]}>
                    {t('My Portfolio')}
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
                    {t('Add your works here')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* My Subscriptions Card */}
            <View style={[styles.technicianCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
              <TouchableOpacity 
                style={[styles.menuItem, isRTL && styles.rowRTL]}
                onPress={() => onNavigateToSubscription?.()}
              >
                <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
                  <Ionicons name="card-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
                </View>
                <View style={[styles.settingTextContainer, isRTL && styles.textContainerRTL]}>
                  <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }, isRTL && styles.textRTL]}>
                    {t('My Subscriptions')}
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
                    {t('Manage your subscriptions')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* User Menu Items */}
        {!isTechnician && (
          <View style={[styles.userMenuCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
            <TouchableOpacity 
              style={[styles.menuItem, isRTL && styles.rowRTL]}
              onPress={() => onNavigateToEditProfile?.()}
            >
              <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
                <Ionicons name="person-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
              </View>
              <View style={[styles.settingTextContainer, isRTL && styles.textContainerRTL]}>
                <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }, isRTL && styles.textRTL]}>
                  {t('My Data')}
                </Text>
                <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
                  {t('profile.editPersonalInfo')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
         <View style={[styles.settingsCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
          {/* Language */}
          <TouchableOpacity 
            style={[styles.settingItem, isRTL && styles.rowRTL]}
            onPress={toggleLanguage}
          >
            <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
              <Ionicons name="globe-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
            </View>
            <View style={[styles.settingTextContainer, isRTL && styles.textContainerRTL]}>
              <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }, isRTL && styles.textRTL]}>
                {t('profile.language')}
              </Text>
              <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
                {t('profile.appLanguage')}
              </Text>
            </View>
            <View style={[styles.languageBadge, { backgroundColor: iconBgColor }]}>
              <Text style={[styles.languageBadgeText, { color: isDarkMode ? colors.text : '#666666', fontFamily, fontSize: scaledSize(14) }]}>
              {language === 'en' ? 'EN' : 'AR'}
            </Text>
            </View>
          </TouchableOpacity>

          {/* Font Size */}
          <TouchableOpacity 
            style={[styles.settingItem, isRTL && styles.rowRTL]}
            onPress={cycleFontSize}
          >
            <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
              <Ionicons name="text-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
            </View>
            <View style={[styles.settingTextContainer, isRTL && styles.textContainerRTL]}>
              <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }, isRTL && styles.textRTL]}>
                {t('profile.fontSize')}
              </Text>
              <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
                {t('profile.textSize')}
              </Text>
            </View>
            <View style={[styles.fontSizeSelector, isRTL && styles.rowRTL]}>
              <TouchableOpacity 
                style={[
                  styles.fontSizeOption, 
                  { backgroundColor: fontSizeScale === 'small' ? primaryColor : iconBgColor }
                ]}
                onPress={() => setFontSizeScale('small')}
              >
                <Text style={[
                  styles.fontSizeOptionText, 
                  { 
                    color: fontSizeScale === 'small' ? FIGMA_COLORS.white : (isDarkMode ? colors.text : '#666666'),
                    fontFamily,
                    fontSize: 12,
                  }
                ]}>
                  {isRTL ? 'ص' : 'S'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.fontSizeOption, 
                  { backgroundColor: fontSizeScale === 'medium' ? primaryColor : iconBgColor }
                ]}
                onPress={() => setFontSizeScale('medium')}
              >
                <Text style={[
                  styles.fontSizeOptionText, 
                  { 
                    color: fontSizeScale === 'medium' ? FIGMA_COLORS.white : (isDarkMode ? colors.text : '#666666'),
                    fontFamily,
                    fontSize: 14,
                  }
                ]}>
                  {isRTL ? 'م' : 'M'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.fontSizeOption, 
                  { backgroundColor: fontSizeScale === 'large' ? primaryColor : iconBgColor }
                ]}
                onPress={() => setFontSizeScale('large')}
              >
                <Text style={[
                  styles.fontSizeOptionText, 
                  { 
                    color: fontSizeScale === 'large' ? FIGMA_COLORS.white : (isDarkMode ? colors.text : '#666666'),
                    fontFamily,
                    fontSize: 16,
                  }
                ]}>
                  {isRTL ? 'ك' : 'L'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* Dark Mode */}
          <View style={[styles.settingItem, isRTL && styles.rowRTL]}>
            <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
              <Ionicons name="moon-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
            </View>
            <View style={[styles.settingTextContainer, isRTL && styles.textContainerRTL]}>
              <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }, isRTL && styles.textRTL]}>
                {t('Dark Mode')}
              </Text>
              <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
                {isDarkMode ? t('On') : t('Off')}
              </Text>
            </View>
            <TouchableOpacity onPress={handleToggleDarkMode}>
              <View style={[styles.toggleSwitch, { backgroundColor: isDarkMode ? primaryColor : 'rgba(153, 153, 153, 0.5)' }]}>
                <View style={[styles.toggleThumb, isDarkMode && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </View>

          {/* User Mode Toggle (for regular users) */}
          {!isTechnician && (
            <View style={[styles.settingItem, isRTL && styles.rowRTL]}>
              <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
                <Ionicons name="person-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
              </View>
              <View style={[styles.settingTextContainer, isRTL && styles.textContainerRTL]}>
                <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }, isRTL && styles.textRTL]}>
                  {t('User Mode')}
                </Text>
                <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
                  {t('Advanced')}
                </Text>
              </View>
              <View style={[styles.toggleSwitch, { backgroundColor: 'rgba(153, 153, 153, 0.5)' }]}>
                <View style={styles.toggleThumb} />
              </View>
            </View>
          )}

          {/* Support Center */}
          <TouchableOpacity style={[styles.settingItem, isRTL && styles.rowRTL]}>
            <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
              <Ionicons name="help-circle-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
            </View>
            <View style={[styles.settingTextContainer, isRTL && styles.textContainerRTL]}>
              <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }, isRTL && styles.textRTL]}>
                {t('profile.supportCenter')}
              </Text>
              <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
                {t('profile.getHelpContactUs')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>


        {/* Logout Card */}
        <View style={[styles.logoutCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
        <TouchableOpacity 
          style={[styles.logoutItem, isRTL && styles.rowRTL]}
          onPress={handleLogout}
        >
          <View style={styles.logoutIconContainer}>
              <Ionicons name="log-out-outline" size={24} color={FIGMA_COLORS.purple} />
          </View>
            <Text style={[styles.logoutText, { fontFamily, fontSize: scaledSize(16) }, isRTL && styles.textRTL]}>{t('Logout')}</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      
      {/* Confirmation Popup */}
      <ConfirmationPopup
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmStyle={confirmState.confirmStyle}
        icon={confirmState.icon}
        onConfirm={confirmState.onConfirm}
        onCancel={hideConfirmation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },

  // Page Title
  pageTitleContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '400',
  },

  // Main Card
  mainCard: {
    marginHorizontal: 16,
    borderRadius: 6,
    borderWidth: 0.5,
    paddingVertical: 16,
  },

  // User Welcome Section
  userWelcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 24,
  },
  profileImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userWelcomeText: {
    flex: 1,
    gap: 6,
  },
  welcomeLabel: {
    fontSize: 14,
    fontWeight: '300',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Card Divider
  cardDivider: {
    height: 0.5,
    marginHorizontal: 16,
    marginVertical: 6,
  },

  // My Info Section
  myInfoSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  myInfoHeader: {
    marginBottom: 16,
  },
  myInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  myInfoSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },
  infoRows: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '400',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: '400',
  },

  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 0.5,
    padding: 8,
    gap: 6,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '200',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '400',
  },

  // Settings Card
  settingsCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 6,
    borderWidth: 0.5,
    padding: 16,
    gap: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
    gap: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },

  // Language Badge
  languageBadge: {
    paddingHorizontal: 15,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  languageBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Font Size Selector
  fontSizeSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  fontSizeOption: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeOptionText: {
    fontWeight: '600',
    textAlign: 'center',
  },

  // Toggle Switch
  toggleSwitch: {
    width: 48,
    height: 24,
    borderRadius: 9999,
    justifyContent: 'center',
    padding: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: FIGMA_COLORS.white,
  },
  toggleThumbActive: {
    transform: [{ translateX: 24 }],
  },

  // Technician Card
  technicianCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    padding: 16,
  },

  // User Menu Card
  userMenuCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 6,
    borderWidth: 0.5,
    padding: 16,
    gap: 16,
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },

  // Logout Card
  logoutCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 6,
    borderWidth: 0.5,
    padding: 16,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: FIGMA_COLORS.purple,
  },

  // RTL Support
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
  textContainerRTL: {
    alignItems: 'flex-end',
  },
});
