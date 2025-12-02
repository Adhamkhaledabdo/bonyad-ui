import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Card } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL, API_ENDPOINTS, buildApiUrl } from '../config/api';

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
}

export default function ProfileScreen({ onLogout, onBack, onNavigateToEditProfile, onNavigateToPortfolio, onNavigateToSubscription, onNavigateToServices, onNavigateToAvailability }: ProfileScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, theme, toggleTheme } = useTheme();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState(i18n.language);
  const isDarkMode = theme === 'dark';

  // Watch for language changes and force re-render
  useEffect(() => {
    // Set initial language state
    setLanguage(i18n.language);
    
    const handleLanguageChange = (lng: string) => {
      console.log('🌐 Language changed to:', lng);
      setLanguage(lng);
    };

    // Listen for language changes
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
        Alert.alert(t('Error'), t('No authentication token found'));
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
        Alert.alert(t('Error'), t('Failed to load profile'));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert(t('Error'), t('Failed to load profile'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    // Use platform-specific confirmation
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(t('profile.confirmLogout'));
      if (confirmed) {
        // Execute logout for web
        onLogout();
      }
    } else {
      // Use Alert for mobile
      Alert.alert(
        t('Logout'),
        t('profile.confirmLogout'),
        [
          { text: t('Cancel'), style: 'cancel' },
          {
            text: t('Logout'),
            style: 'destructive',
            onPress: () => {
              onLogout();
            },
          },
        ]
      );
    }
  };

  const toggleLanguage = () => {
    const currentLang = i18n.language;
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    
    // Change language
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

  const handleToggleDarkMode = () => {
    toggleTheme();
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const user = userDetails;
  const isTechnician = user?.role?.toUpperCase() === 'TECHNICIAN';

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Back Button */}
      {onBack && (
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.cardBackground }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      )}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 120) }}
      >
        <View style={styles.content}>
          {/* Profile Image with Blue Border */}
          <View style={styles.profileImageContainer}>
            <View style={[styles.profileImageBorder, { borderColor: colors.primary, backgroundColor: colors.cardBackground }]}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.gray100 }]}>
                  <Ionicons name="person" size={50} color={colors.primary} />
                </View>
              )}
            </View>
          </View>

          {/* User Info Card */}
          <Card style={[styles.userInfoCard, { backgroundColor: colors.cardBackground }]}>
            <Card.Content style={styles.userInfoContent}>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.name || t('profile.usernamePlaceholder')}</Text>
              {(user?.phone || user?.phoneNumber) && (
                <View style={styles.phoneRow}>
                  <Ionicons name="call" size={14} color={colors.primary} />
                  <Text style={[styles.phoneText, { color: colors.textSecondary }]}>{user.phone || user.phoneNumber}</Text>
                </View>
              )}
              {user?.email && (
                <View style={styles.phoneRow}>
                  <Ionicons name="mail" size={14} color={colors.primary} />
                  <Text style={[styles.phoneText, { color: colors.textSecondary }]}>{user.email}</Text>
                </View>
              )}
              <Text style={[styles.roleText, { color: colors.primary }]}>
                {isTechnician ? t('Service Provider') : t('User')}
              </Text>
              {user?.status && (
                <View style={[styles.statusBadge, { backgroundColor: user.status === 'APPROVED' ? '#4CAF50' : '#FF9800' }]}>
                  <Text style={styles.statusText}>{user.status}</Text>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Additional Info for Technicians */}
          {isTechnician && (
            <Card style={[styles.additionalInfoCard, { backgroundColor: colors.cardBackground }]}>
              <Card.Content style={styles.additionalInfoContent}>
                {user?.yearsOfExperience && (
                  <View style={styles.infoRow}>
                    <Ionicons name="time" size={18} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.text }]}>
                      {user.yearsOfExperience} {t('Years of Experience')}
                    </Text>
                  </View>
                )}
                {user?.regions && user.regions.length > 0 && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={18} color={colors.primary} />
                    <View style={styles.regionsContainer}>
                      <Text style={[styles.infoText, { color: colors.text }]}>
                        {user.regions.map((region, index) => 
                          i18n.language === 'ar' ? region.nameAr : region.nameEn
                        ).join(', ')}
                      </Text>
                    </View>
                  </View>
                )}
                {user?.description && (
                  <View style={styles.infoRow}>
                    <Ionicons name="document-text" size={18} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.text }]}>
                      {user.description}
                    </Text>
                  </View>
                )}
                {user?.averageRating && (
                  <View style={styles.infoRow}>
                    <Ionicons name="star" size={18} color="#FFD700" />
                    <Text style={[styles.infoText, { color: colors.text }]}>
                      {user.averageRating.toFixed(1)} / 5.0
                    </Text>
                  </View>
                )}
                {user?.subscriptionCategory && (
                  <View style={styles.infoRow}>
                    <Ionicons name="card" size={18} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.text }]}>
                      {i18n.language === 'ar' ? user.subscriptionCategory.nameAr : user.subscriptionCategory.nameEn}
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          )}

          {/* Menu Items */}
          <View style={styles.menuSection}>
            {isTechnician ? (
              <>
                <ProfileMenuCard
                  title={t('My Data')}
                  icon="person"
                  onPress={() => onNavigateToEditProfile?.()}
                  colors={colors}
                />
                <ProfileMenuCard
                  title={t('My Portfolio')}
                  icon="briefcase"
                  onPress={() => onNavigateToPortfolio?.()}
                  colors={colors}
                />
              </>
            ) : (
              <>
                <ProfileMenuCard
                  title={t('My Data')}
                  icon="person"
                  onPress={() => onNavigateToEditProfile?.()}
                  colors={colors}
                />
              </>
            )}
          </View>

          {/* Change Language */}
          <TouchableOpacity 
            key={`language-toggle-${language}`}
            style={[styles.settingsRow, { backgroundColor: colors.cardBackground }]} 
            onPress={toggleLanguage}
          >
            <View style={[styles.settingsIconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="globe" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.settingsText, { color: colors.text }]}>{t('Change Language')}</Text>
            <Text 
              key={`language-badge-${language}`}
              style={[styles.languageBadge, { color: colors.primary, backgroundColor: colors.primary + '20' }]}
            >
              {language === 'en' ? 'EN' : 'AR'}
            </Text>
          </TouchableOpacity>

          {/* Dark Mode Toggle */}
          <View style={[styles.settingsRow, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.settingsIconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons
                name={isDarkMode ? 'moon' : 'sunny'}
                size={20}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.settingsText, { color: colors.text }]}>{t('Dark Mode')}</Text>
            <TouchableOpacity onPress={handleToggleDarkMode}>
              <View style={[styles.toggleSwitch, isDarkMode && styles.toggleSwitchActive, { backgroundColor: isDarkMode ? colors.primary : colors.gray300 }]}>
                <View style={[styles.toggleThumb, isDarkMode && styles.toggleThumbActive, { backgroundColor: colors.white }]} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.cardBackground, borderColor: colors.error }]} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>{t('Logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Profile Menu Card Component
interface ProfileMenuCardProps {
  title: string;
  icon: string;
  onPress: () => void;
  colors: any;
}

function ProfileMenuCard({ title, icon, onPress, colors }: ProfileMenuCardProps) {
  return (
    <TouchableOpacity style={[styles.menuCard, { backgroundColor: colors.cardBackground }]} onPress={onPress}>
      <View style={[styles.menuIconContainer, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
      </View>
      <Text style={[styles.menuText, { color: colors.text }]}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  profileImageBorder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  profileImagePlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoCard: {
    marginBottom: 30,
  },
  userInfoContent: {
    alignItems: 'center',
    padding: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  phoneText: {
    fontSize: 14,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  additionalInfoCard: {
    marginBottom: 20,
  },
  additionalInfoContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  regionsContainer: {
    flex: 1,
  },
  menuSection: {
    gap: 12,
    marginBottom: 20,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  languageBadge: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    padding: 2,
  },
  toggleSwitchActive: {},
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 20,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
