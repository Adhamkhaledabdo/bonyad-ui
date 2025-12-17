import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { storage } from '../utils/storage';
import { API_BASE_URL, API_ENDPOINTS, buildApiUrl } from '../config/api';

// Figma Design Colors
const FIGMA_COLORS = {
  primary: '#005DAC',
  primaryDark: '#003867',
  primaryLight: '#E6EFF7',
  white: '#FFFFFF',
  textBody: '#383838',
  textSecondary: '#666666',
  divider: '#D9D9D9',
  borderLight: '#E6EFF7',
};

interface MyDataScreenProps {
  onBack: () => void;
  onEditProfile: () => void;
  onChangePhone: () => void;
  onChangePassword: () => void;
  onNavigateToSubscription?: () => void;
  onNavigateToServices?: () => void;
  onNavigateToAvailability?: () => void;
  isTechnician?: boolean;
}

interface UserProfile {
  name?: string;
  avatar?: string;
  profileImage?: string;
}

export default function MyDataScreen({ 
  onBack, 
  onEditProfile, 
  onChangePhone, 
  onChangePassword,
  onNavigateToSubscription,
  onNavigateToServices,
  onNavigateToAvailability,
  isTechnician = false 
}: MyDataScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const isRTL = i18n.language === 'ar';
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        setIsLoading(false);
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
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Theme-aware colors
  const bgColor = isDarkMode ? colors.background : FIGMA_COLORS.white;
  const cardBgColor = isDarkMode ? colors.cardBackground : FIGMA_COLORS.white;
  const textColor = isDarkMode ? colors.text : FIGMA_COLORS.primaryDark;
  const iconBgColor = isDarkMode ? colors.surface : FIGMA_COLORS.primaryLight;
  const iconColor = isDarkMode ? colors.textSecondary : FIGMA_COLORS.textSecondary;
  const borderColor = isDarkMode ? colors.border : FIGMA_COLORS.borderLight;
  const dividerColor = isDarkMode ? colors.border : FIGMA_COLORS.divider;
  const primaryColor = isDarkMode ? colors.primary : FIGMA_COLORS.primary;
  const avatarBgColor = isDarkMode ? colors.surface : FIGMA_COLORS.primaryLight;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bgColor, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  const MenuOption = ({ 
    icon, 
    title, 
    onPress 
  }: { 
    icon: keyof typeof Ionicons.glyphMap; 
    title: string; 
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.menuOption,
        { 
          borderColor: FIGMA_COLORS.borderLight,
          backgroundColor: cardBgColor,
        },
        isRTL && styles.rowRTL,
      ]}
      onPress={onPress}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={[styles.menuTextContainer, isRTL && styles.textContainerRTL]}>
        <Text style={[styles.menuTitle, { color: textColor, fontSize: scaledSize(16) }, isRTL && styles.textRTL]}>
          {title}
        </Text>
      </View>
      <Ionicons 
        name={isRTL ? 'chevron-back' : 'chevron-forward'} 
        size={24} 
        color={primaryColor} 
      />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.headerRow, isRTL && styles.rowRTL]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons
            name={isRTL ? 'chevron-forward' : 'chevron-back'}
            size={24}
            color={textColor}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor, fontSize: scaledSize(18) }]}>
          {isTechnician ? t('Service Provider Profile') : t('User Profile')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 120) }
        ]}
      >
        {/* User Avatar Section - Centered */}
        <View style={styles.userSection}>
          <View style={[styles.avatarContainer, { backgroundColor: avatarBgColor }]}>
            {userProfile?.avatar ? (
              <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={60} color={primaryColor} />
            )}
          </View>
          <Text style={[styles.userName, { color: textColor, fontSize: scaledSize(18) }]}>
            {userProfile?.name || t('profile.usernamePlaceholder')}
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

        {/* Menu Options - Matching Figma Design Order */}
        <View style={styles.menuSection}>
          <MenuOption
            icon="person-outline"
            title={t('Edit Profile Info')}
            onPress={onEditProfile}
          />

          <MenuOption
            icon="call-outline"
            title={t('Change Phone Number')}
            onPress={onChangePhone}
          />

          <MenuOption
            icon="lock-closed-outline"
            title={t('Change Password')}
            onPress={onChangePassword}
          />

          {/* Technician-specific options - Services, Availability, Subscription */}
          {isTechnician && (
            <>
              <MenuOption
                icon="construct-outline"
                title={t('Services')}
                onPress={() => onNavigateToServices?.()}
              />

              <MenuOption
                icon="calendar-outline"
                title={t('Availability')}
                onPress={() => onNavigateToAvailability?.()}
              />

            </>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: primaryColor }]}
          onPress={onBack}
        >
          <Text style={styles.saveButtonText}>{t('Save')}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '400',
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 24,
  },
  userSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 24,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    color: FIGMA_COLORS.primaryDark,
  },
  divider: {
    height: 0.5,
    width: '100%',
  },
  menuSection: {
    gap: 16,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    gap: 12,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: FIGMA_COLORS.textBody,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
  },
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
