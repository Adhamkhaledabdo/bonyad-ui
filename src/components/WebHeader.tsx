import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';

type Screen = 'splash' | 'welcome' | 'overview' | 'login' | 'signup' | 'otp' | 'home' | 'profile' | 'editProfile' | 'myData' | 'changePhone' | 'changePassword' | 'portfolio' | 'services' | 'availability' | 'subscription' | 'newProject' | 'manualForm' | 'aiForm' | 'projects' | 'runningProjects' | 'chatRooms' | 'chatDetail' | 'notifications' | 'appointments' | 'booking' | 'technicianProfile' | 'roomDesign' | 'voiceAI' | 'costExplorer' | 'roomVisualizer' | 'askBonyadAI' | 'projectsMap';

interface WebHeaderProps {
  currentScreen?: Screen;
  onNavigateToHome?: () => void;
  onNavigateToOverview?: () => void;
  onNavigateToLogin?: () => void;
  onLogout?: () => void;
  isAuthenticated?: boolean;
  userRole?: 'user' | 'technician';
  // For overview page toggle
  showToggle?: boolean;
  userType?: 'user' | 'provider';
  onToggleChange?: (type: 'user' | 'provider') => void;
}

export default function WebHeader({
  currentScreen,
  onNavigateToHome,
  onNavigateToOverview,
  onNavigateToLogin,
  onLogout,
  isAuthenticated = false,
  userRole,
  showToggle = false,
  userType = 'user',
  onToggleChange,
}: WebHeaderProps) {
  const { colors, theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { t, i18n } = useTranslation();
  const [hoveringUser, setHoveringUser] = React.useState(false);
  const [hoveringBonyader, setHoveringBonyader] = React.useState(false);
  const toggleSlideAnim = React.useRef(new Animated.Value(userType === 'user' ? 0 : 100)).current;
  const userToggleAnim = React.useRef(new Animated.Value(0)).current;
  const bonyaderToggleAnim = React.useRef(new Animated.Value(0)).current;

  // Update animation when userType changes
  React.useEffect(() => {
    Animated.timing(toggleSlideAnim, {
      toValue: userType === 'user' ? 0 : 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [userType]);

  if (Platform.OS !== 'web') {
    return null; // Only render on web
  }

  const userConfig = {
    primaryColor: '#0080E0',
    secondaryColor: '#E3F2FD',
  };

  const providerConfig = {
    primaryColor: '#1A1A1A',
    secondaryColor: '#333333',
  };

  const headerBackground = isDarkMode ? colors.primary : colors.cardBackground;
  const headerBorder = isDarkMode ? colors.primaryDark : colors.border;

  // Determine if we should show login/get started button
  const shouldShowLoginButton = !isAuthenticated && (currentScreen === 'overview' || currentScreen === 'welcome');

  return (
    <View style={[styles.header, { backgroundColor: headerBackground, borderBottomColor: headerBorder }]}>
      <View style={styles.headerContent}>
        {/* Logo */}
        <TouchableOpacity 
          style={styles.logoContainer}
          onPress={onNavigateToHome || onNavigateToOverview}
        >
          <Image 
            source={require('../../assets/bonyad-logo.svg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Navigation Links */}
        <View style={styles.navLinks}>
          {/* User/Bonyader Toggle - Only on Overview page */}
          {showToggle && onToggleChange && (
            <View style={styles.headerToggleContainer}>
              <Animated.View 
                style={[
                  styles.toggleBackgroundSlider,
                  {
                    backgroundColor: toggleSlideAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: [userConfig.primaryColor, providerConfig.primaryColor],
                    }),
                    transform: [{
                      translateX: toggleSlideAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    }],
                  }
                ]}
              />
              
              <TouchableOpacity
                style={styles.headerToggleButton}
                onPress={() => onToggleChange('user')}
                {...(Platform.OS === 'web' ? {
                  onMouseEnter: () => setHoveringUser(true),
                  onMouseLeave: () => setHoveringUser(false),
                } : {}) as any}
              >
                <Animated.Text
                  style={[
                    styles.toggleText,
                    {
                      color: userType === 'user' ? '#fff' : colors.text,
                      transform: [
                        {
                          scale: hoveringUser && userType !== 'user'
                            ? userToggleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] })
                            : 1,
                        },
                      ],
                    },
                  ]}
                >
                  {i18n.language === 'en' ? 'User' : 'مستخدم'}
                </Animated.Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.headerToggleButton}
                onPress={() => onToggleChange('provider')}
                {...(Platform.OS === 'web' ? {
                  onMouseEnter: () => setHoveringBonyader(true),
                  onMouseLeave: () => setHoveringBonyader(false),
                } : {}) as any}
              >
                <Animated.Text
                  style={[
                    styles.toggleText,
                    {
                      color: userType === 'provider' ? '#fff' : colors.text,
                      transform: [
                        {
                          scale: hoveringBonyader && userType !== 'provider'
                            ? bonyaderToggleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] })
                            : 1,
                        },
                      ],
                    },
                  ]}
                >
                  {i18n.language === 'en' ? 'Bonyader' : 'بنيدر'}
                </Animated.Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Home Link - Show on all pages except home itself */}
          {currentScreen !== 'home' && currentScreen !== 'welcome' && (
            <TouchableOpacity 
              style={styles.navLink}
              onPress={isAuthenticated ? onNavigateToHome : onNavigateToOverview}
            >
              <Text style={[styles.navLinkText, { color: colors.text }]}>
                {i18n.language === 'en' ? 'Home' : 'الرئيسية'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Authentication Buttons */}
          {!isAuthenticated ? (
            <>
              {currentScreen !== 'login' && (
                <TouchableOpacity 
                  style={styles.navLink}
                  onPress={onNavigateToLogin}
                >
                  <Text style={[styles.navLinkText, { color: colors.text }]}>
                    {i18n.language === 'en' ? 'Login' : 'تسجيل الدخول'}
                  </Text>
                </TouchableOpacity>
              )}
              
              {shouldShowLoginButton && (
                <TouchableOpacity 
                  style={[styles.loginButton, { backgroundColor: colors.primary }]}
                  onPress={onNavigateToLogin}
                >
                  <Text style={styles.loginButtonText}>
                    {i18n.language === 'en' ? 'Get Started' : 'ابدأ الآن'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              {/* User role badge */}
              {userRole && (
                <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                    {userRole === 'user' 
                      ? (i18n.language === 'en' ? 'User' : 'مستخدم')
                      : (i18n.language === 'en' ? 'Bonyader' : 'بنيدر')
                    }
                  </Text>
                </View>
              )}
              
              {/* Logout Button */}
              {onLogout && (
                <TouchableOpacity 
                  style={[styles.logoutButton, { borderColor: colors.border }]}
                  onPress={onLogout}
                >
                  <Ionicons name="log-out-outline" size={18} color={colors.text} />
                  <Text style={[styles.logoutButtonText, { color: colors.text }]}>
                    {i18n.language === 'en' ? 'Logout' : 'تسجيل الخروج'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  headerContent: {
    maxWidth: 1200,
    width: '100%',
    marginHorizontal: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    ...Platform.select({
      web: {
        '@media (max-width: 768px)': {
          paddingHorizontal: 16,
          paddingVertical: 12,
        },
      } as any,
    }),
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 40,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    ...Platform.select({
      web: {
        '@media (max-width: 768px)': {
          gap: 16,
        },
      } as any,
    }),
  },
  navLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navLinkText: {
    fontSize: 16,
    fontWeight: '500',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'color 0.2s',
        ':hover': {
          opacity: 0.7,
        },
      } as any,
    }),
  },
  loginButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'opacity 0.2s',
        ':hover': {
          opacity: 0.9,
        },
      } as any,
    }),
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
    marginRight: 16,
    minWidth: 160,
  },
  toggleBackgroundSlider: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '50%',
    borderRadius: 8,
    zIndex: 0,
  },
  headerToggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    ...Platform.select({
      web: {
        transition: 'color 0.2s' as any,
      },
    }),
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
          opacity: 0.7,
        },
      } as any,
    }),
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
