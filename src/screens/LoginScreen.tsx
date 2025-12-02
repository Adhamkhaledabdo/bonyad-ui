import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { storage } from '../utils/storage';
import { Button, Card, Surface } from 'react-native-paper';
import { useFCMNotifications } from '../utils/useFCMNotifications';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { showAlert, showError } from '../utils/alert';
import AnimatedRoleToggle from '../components/AnimatedRoleToggle';
import { PhoneInput, PasswordInput } from '../components/CustomInput';
import ThemeToggle from '../components/ThemeToggle';

// Responsive breakpoints - will be calculated in component

// 🔐 LOGIN SCREEN: Based on login.swift from iOS app
export default function LoginScreen({ 
  onNavigateToSignup, 
  onNavigateToForgotPassword,
  onLoginSuccess,
  onNavigateToOTP,
  onNavigateToOverview,
}: { 
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword: () => void;
  onLoginSuccess: (role: 'user' | 'technician', token: string, userId: number) => void;
  onNavigateToOTP: (phone: string, role: 'user' | 'technician') => void;
  onNavigateToOverview?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const insets = useSafeAreaInsets();
  
  // FCM Notifications Hook
  const { fcmToken, hasPermission, isLoading: fcmLoading } = useFCMNotifications();
  
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

  // Calculate responsive breakpoints based on current screen width
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  const IS_MEDIUM_WEB = IS_WEB && screenWidth >= 768 && screenWidth < 1024;
  const IS_SMALL_WEB = IS_WEB && screenWidth < 768;

  // Debug logs for responsive breakpoints
  useEffect(() => {
    console.log('🔍 LoginScreen Responsive Debug:', {
      platform: Platform.OS,
      screenWidth,
      IS_WEB,
      IS_LARGE_WEB,
      IS_MEDIUM_WEB,
      IS_SMALL_WEB,
      willRenderMobile: Platform.OS !== 'web' || IS_SMALL_WEB || IS_MEDIUM_WEB,
      willRenderDesktop: IS_LARGE_WEB,
    });
  }, [screenWidth, IS_WEB, IS_LARGE_WEB, IS_MEDIUM_WEB, IS_SMALL_WEB]);
  
  // State
  const [selectedRole, setSelectedRole] = useState<'user' | 'technician'>('user');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation values for desktop layout
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const blurAnim = useRef(new Animated.Value(8)).current; // Start blurred (8px)
  
  // Start animations when component mounts (desktop only)
  useEffect(() => {
    if (IS_LARGE_WEB) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(blurAnim, {
          toValue: 0, // Animate to clear (0px blur)
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false, // Blur can't use native driver
        }),
      ]).start();
    }
  }, [IS_LARGE_WEB]);
  

  // 🔐 LOGIN FUNCTION: Matches login() from login.swift
  const handleLogin = async () => {
    setIsLoading(true);

    try {
      // Get phone number as typed (no formatting)
      const formattedPhone = phone.trim();

      // Validation
      if (!formattedPhone || !password) {
        showError(t('auth.errors.missingCredentials'));
        setIsLoading(false);
        return;
      }

      // API Request
      console.log('📤 Login Request:');
      console.log('   Phone:', formattedPhone);
      console.log('   Role:', selectedRole === 'user' ? 'USER' : 'TECHNICIAN');
      console.log('   FCM Token:', fcmToken || 'no-token');
      
      const response = await fetch(buildApiUrl(API_ENDPOINTS.AUTH.LOGIN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          password: password,
          role: selectedRole === 'user' ? 'USER' : 'TECHNICIAN',
          fcmToken: fcmToken || 'no-token',
        }),
      });

      const data = await response.json();

      console.log('📥 Login Response:', data);

      // Check for pending verification FIRST (before status/token checks)
      if (data.message && (
        data.message.toLowerCase().includes('pending verification') || 
        data.message.toLowerCase().includes('otp sent')
      )) {
        console.log('⚠️ Account pending verification - redirecting to OTP');
        setIsLoading(false);
        
        // Navigate to OTP screen with phone number, role, and password
        // The OTP screen will handle verification and then navigate to home
        onNavigateToOTP(formattedPhone, selectedRole);
        return;
      }

      if (response.ok && data.token) {
        // Success - save session and navigate
        console.log('✅ Login successful');
        console.log('   Token: ' + data.token.substring(0, 20) + '...');
        console.log('   User ID: ' + (data.user?.id || data.userId || data.id));
        console.log('   Role: ' + (data.user?.role || data.role || selectedRole));
        
        const userId = data.user?.id || data.userId || data.id || 0;
        const userRole = data.user?.role || data.role || (selectedRole === 'user' ? 'USER' : 'TECHNICIAN');
        
        // Save to AsyncStorage
        await storage.saveAuthData(data.token, userRole, userId, data.user?.deviceToken || 'no-token');
        console.log('✅ Saved auth data to storage');
        console.log('   Saved token:', data.token);
        console.log('   Saved userId:', userId);
        console.log('   Saved role:', userRole);
        
        onLoginSuccess(selectedRole, data.token, userId);
      } else {
        const message = data.message || t('validation_failed');
        showAlert(t('validation_failed'), message);
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      showError(t('network_error'));
    } finally {
      setIsLoading(false);
    }
  };


  // Render Android style (always mobile) OR Web small screen style
  if (Platform.OS !== 'web' || IS_SMALL_WEB || IS_MEDIUM_WEB) {
    return (
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[styles.mainContainer, { flex: 1, paddingTop: Platform.OS === 'web' ? 0 : insets.top, paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom }]}>
          <ScrollView 
            style={[styles.container, { backgroundColor: colors.background }]} 
            contentContainerStyle={[styles.scrollContent, Platform.OS === 'web' && styles.webScrollContent]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            <View style={[styles.contentWrapper, Platform.OS === 'web' && { backgroundColor: colors.cardBackground }]}>
              {/* Language Toggle at Top */}
              <View style={styles.languageToggleTop}>
                <TouchableOpacity 
                  onPress={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')} 
                  style={styles.languageToggleButton}
                >
                  <Ionicons 
                    name="globe-outline" 
                    size={18} 
                    color={colors.primary} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.langText, { color: colors.primary, fontWeight: '600' }]}>
                    {i18n.language === 'ar' ? 'AR' : 'EN'}
                  </Text>
                </TouchableOpacity>
              </View>

        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/bonyad-logo.svg')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>
            {t('Welcome back')}
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
            {t('Log in to your account')}
          </Text>
        </View>

      {/* Role Toggle (User / Technician) - Enhanced with Animation */}
      <View style={styles.roleToggleWrapper}>
        <AnimatedRoleToggle
          selectedRole={selectedRole}
          onRoleChange={setSelectedRole}
        />
      </View>

      {/* Phone Input */}
      <PhoneInput
        label={t('Mobile number')}
        value={phone}
        onChangeText={setPhone}
        placeholder={t('auth.placeholders.phone')}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Password Input */}
      <PasswordInput
        label={t('Password')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.placeholders.password')}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Forgot Password */}
      <Button
        mode="text"
        onPress={onNavigateToForgotPassword}
        style={styles.forgotPasswordButton}
        labelStyle={[styles.forgotPasswordText, { color: colors.primary }]}
      >
        {t('Forgot Password?')}
      </Button>

        {/* Login Button */}
        <Button
          mode="contained"
          onPress={handleLogin}
          disabled={isLoading}
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled, { backgroundColor: colors.primary }]}
          contentStyle={styles.loginButtonContent}
          loading={isLoading}
        >
          {t('Login')}
        </Button>

        {/* Sign Up Link */}
        <Button 
          mode="text" 
          onPress={onNavigateToSignup}
          labelStyle={[styles.signupText, { color: colors.textSecondary }]}
        >
          {t("Don't have an account?")} <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('Sign Up')}</Text>
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />
          </View>
          

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      );
    }

  // Render web desktop layout (large screens only on web)
  console.log('🖥️ Rendering DESKTOP layout (Web large screen)');
  console.log('🎨 Desktop Layout Branding Panel:', { IS_LARGE_WEB, willShow: IS_LARGE_WEB });
  
  return (
    <View style={[styles.desktopContainer, { backgroundColor: colors.background }]}>
      {/* Language Toggle at Top Right */}
      <View style={styles.desktopLanguageToggle}>
        <TouchableOpacity 
          onPress={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')} 
          style={styles.languageToggleButton}
        >
          <Ionicons 
            name="globe-outline" 
            size={18} 
            color={colors.primary} 
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.langText, { color: colors.primary, fontWeight: '600' }]}>
            {i18n.language === 'ar' ? 'AR' : 'EN'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.desktopWrapper, !IS_LARGE_WEB && styles.desktopWrapperNoBranding]}>
        {/* Left Side - Branding (Only on large web screens >= 1024px) */}
        {IS_LARGE_WEB && (
          <Animated.View
            style={[
              styles.desktopLeftPanel,
              {
                backgroundColor: isDarkMode ? colors.cardBackground : colors.primary,
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
                borderRightWidth: isDarkMode ? StyleSheet.hairlineWidth : 0,
                borderRightColor: isDarkMode ? colors.border : 'transparent',
                ...(Platform.OS === 'web'
                  ? {
                      boxShadow: isDarkMode
                        ? 'inset -12px 0 32px rgba(0,0,0,0.55)'
                        : 'inset -10px 0 30px rgba(0,0,0,0.12)',
                    }
                  : {}),
              },
            ]}
          >
            <View
              style={[
                styles.desktopLeftPanelGradient,
                {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)',
                },
              ]}
            >
              <Animated.View 
                style={[
                  styles.desktopBranding,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                  }
                ]}
              >
                <Animated.Text 
                  style={[
                    styles.desktopBrandTitle,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                      color: isDarkMode ? colors.text : '#FFFFFF',
                      ...Platform.select({
                        web: {
                          filter: blurAnim.interpolate({
                            inputRange: [0, 8],
                            outputRange: ['blur(0px)', 'blur(8px)'],
                            extrapolate: 'clamp',
                          }) as any,
                          WebkitFilter: blurAnim.interpolate({
                            inputRange: [0, 8],
                            outputRange: ['blur(0px)', 'blur(8px)'],
                            extrapolate: 'clamp',
                          }) as any,
                        },
                      }),
                    }
                  ]}
                >
                  {t('Welcome back')}
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.desktopBrandSubtitle,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                      color: isDarkMode ? colors.textSecondary : 'rgba(255,255,255,0.85)',
                    }
                  ]}
                >
                  {t('Log in to your account')}
                </Animated.Text>
                <View style={styles.desktopFeatures}>
                  <Animated.View
                    style={[
                      styles.desktopFeature,
                      {
                        opacity: fadeAnim,
                        transform: [{ translateX: slideAnim }],
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.2)',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.desktopFeatureIcon,
                        { backgroundColor: isDarkMode ? 'rgba(51,163,255,0.25)' : 'rgba(255,255,255,0.25)' },
                      ]}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={28}
                        color={isDarkMode ? colors.primaryLight || colors.primary : '#FFFFFF'}
                      />
                    </View>
                    <Animated.Text
                      style={[
                        styles.desktopFeatureText,
                        {
                          opacity: fadeAnim,
                          color: isDarkMode ? colors.text : '#FFFFFF',
                        },
                      ]}
                    >
                      {t('Secure & Safe')}
                    </Animated.Text>
                  </Animated.View>
                  <Animated.View
                    style={[
                      styles.desktopFeature,
                      {
                        opacity: fadeAnim,
                        transform: [{ translateX: slideAnim }],
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.2)',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.desktopFeatureIcon,
                        { backgroundColor: isDarkMode ? 'rgba(51,163,255,0.25)' : 'rgba(255,255,255,0.25)' },
                      ]}
                    >
                      <Ionicons
                        name="people"
                        size={28}
                        color={isDarkMode ? colors.primaryLight || colors.primary : '#FFFFFF'}
                      />
                    </View>
                    <Animated.Text
                      style={[
                        styles.desktopFeatureText,
                        {
                          opacity: fadeAnim,
                          color: isDarkMode ? colors.text : '#FFFFFF',
                        },
                      ]}
                    >
                      {t('Trusted by Thousands')}
                    </Animated.Text>
                  </Animated.View>
                  <Animated.View
                    style={[
                      styles.desktopFeature,
                      {
                        opacity: fadeAnim,
                        transform: [{ translateX: slideAnim }],
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.2)',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.desktopFeatureIcon,
                        { backgroundColor: isDarkMode ? 'rgba(51,163,255,0.25)' : 'rgba(255,255,255,0.25)' },
                      ]}
                    >
                      <Ionicons
                        name="rocket"
                        size={28}
                        color={isDarkMode ? colors.primaryLight || colors.primary : '#FFFFFF'}
                      />
                    </View>
                    <Animated.Text
                      style={[
                        styles.desktopFeatureText,
                        {
                          opacity: fadeAnim,
                          color: isDarkMode ? colors.text : '#FFFFFF',
                        },
                      ]}
                    >
                      {t('Fast & Reliable')}
                    </Animated.Text>
                  </Animated.View>
                </View>
              </Animated.View>
            </View>
          </Animated.View>
        )}

        {/* Right Side - Login Form (Takes full width if no branding panel) */}
        <Animated.View
          style={[
            styles.desktopRightPanel,
            { backgroundColor: colors.cardBackground },
            !IS_LARGE_WEB && styles.desktopRightPanelFullWidth,
            {
              opacity: fadeAnim,
              transform: [{ translateX: Animated.multiply(slideAnim, -1) }],
            },
          ]}
        >
          <ScrollView 
            contentContainerStyle={styles.desktopFormContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            bounces={false}
            style={styles.desktopScrollView}
          >
            <Animated.View
              style={[
                styles.desktopForm,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
               {/* Logo on Desktop */}
               <Image
                 source={require('../../assets/bonyad-logo.svg')}
                 style={styles.desktopFormLogo as any}
                 contentFit="contain"
               />

              <Text style={[styles.desktopFormTitle, { color: colors.text }]}>{t('Welcome back')}</Text>
              <Text style={[styles.desktopFormSubtitle, { color: colors.textSecondary }]}>{t('Log in to your account')}</Text>

              {/* Role Toggle - Enhanced with Animation */}
              <View style={styles.desktopRoleToggleWrapper}>
                <AnimatedRoleToggle
                  selectedRole={selectedRole}
                  onRoleChange={setSelectedRole}
                />
              </View>

              {/* Form Fields */}
              <PhoneInput
                label={t('Mobile number')}
                value={phone}
                onChangeText={setPhone}
                placeholder={t('auth.placeholders.phone')}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <PasswordInput
                label={t('Password')}
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.placeholders.password')}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Forgot Password */}
              <Button
                mode="text"
                onPress={onNavigateToForgotPassword}
                style={styles.desktopForgotPassword}
                labelStyle={[styles.desktopForgotPasswordText, { color: colors.primary }]}
              >
                {t('Forgot Password?')}
              </Button>

              {/* Login Button */}
              <Button
                mode="contained"
                onPress={handleLogin}
                disabled={isLoading}
                style={[styles.desktopLoginButton, { backgroundColor: colors.primary }]}
                contentStyle={styles.desktopLoginButtonContent}
                loading={isLoading}
              >
                {t('Login')}
              </Button>

              {/* Sign Up Link */}
              <View style={styles.desktopSignupLink}>
                <Text style={[styles.desktopSignupText, { color: colors.textSecondary }]}>
                  {t("Don't have an account?")}{' '}
                </Text>
                <TouchableOpacity onPress={onNavigateToSignup}>
                  <Text style={[styles.desktopSignupLinkText, { color: colors.primary }]}>
                    {t('Sign Up')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Theme Toggle */}
              <ThemeToggle />
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    ...Platform.select({
      web: {
        minHeight: 'calc(100vh - 64px)' as any, // Subtract header height
        display: 'flex' as any,
        flexDirection: 'column' as any,
      },
    }),
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 60, // Extra padding at bottom to ensure last element is visible
    paddingHorizontal: 16, // Add horizontal padding for mobile
    ...Platform.select({
      web: {
        justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)' as any, // Account for header only
        paddingBottom: 80,
      },
      ios: {
        paddingBottom: 80, // Extra padding for iOS safe area
      },
      android: {
        paddingBottom: 80, // Extra padding for Android
      },
    }),
  },
  webScrollContent: {
    ...Platform.select({
      web: {
        paddingVertical: 60,
        paddingBottom: 100, // Extra padding for web footer
      },
    }),
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderRadius: 20,
    ...Platform.select({
      web: {
        paddingHorizontal: 36,
        paddingVertical: 40,
      },
      default: {
        paddingHorizontal: 20, // Less padding on mobile
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  logo: {
    width: 160,
    height: 64,
    marginBottom: 24,
  } as any,
  welcomeTitle: {
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    ...Platform.select({
      web: {
        fontSize: 28,
      },
      default: {
        fontSize: 24, // Smaller on mobile
      },
    }),
  },
  welcomeSubtitle: {
    textAlign: 'center',
    lineHeight: 24,
    ...Platform.select({
      web: {
        fontSize: 16,
      },
      default: {
        fontSize: 14, // Smaller on mobile
      },
    }),
  },
  roleToggleContainer: {
    flexDirection: 'row',
    padding: 6,
    borderWidth: 2,
    borderRadius: 16,
    ...Platform.select({
      web: {
        marginBottom: 28,
      },
      default: {
        marginBottom: 24, // Less spacing on mobile
      },
    }),
  },
  roleButton: {
    flex: 1,
    marginHorizontal: 3,
    borderRadius: 12,
  },
  roleButtonActive: {
    backgroundColor: Colors.primary,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 128, 224, 0.3)',
      },
      default: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  roleButtonContent: {
    ...Platform.select({
      web: {
        paddingVertical: 12,
      },
      default: {
        paddingVertical: 10, // Smaller on mobile
      },
    }),
  },
  inputContainer: {
    ...Platform.select({
      web: {
        marginBottom: 20,
      },
      default: {
        marginBottom: 16, // Less spacing on mobile
      },
    }),
  },
  input: {
    borderRadius: 16, // More rounded for better appearance
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
      },
    }),
  },
  countryCode: {
    fontSize: 16,
    marginLeft: 8,
  },
  eyeIcon: {
    fontSize: 20,
    padding: 4,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    ...Platform.select({
      web: {
        marginBottom: 24,
      },
      default: {
        marginBottom: 20, // Less spacing on mobile
      },
    }),
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginButtonContent: {
    ...Platform.select({
      web: {
        paddingVertical: 12,
      },
      default: {
        paddingVertical: 14, // More touchable area on mobile
      },
    }),
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(0, 128, 224, 0.4)',
        marginBottom: 24,
      },
      default: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 6,
        marginBottom: 20, // Less spacing on mobile
      },
    }),
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  signupText: {
    textAlign: 'center',
    lineHeight: 22,
    ...Platform.select({
      web: {
        fontSize: 15,
      },
      default: {
        fontSize: 14, // Smaller on mobile
        marginBottom: 20, // Extra margin at bottom
      },
    }),
  },
  signupLink: {
    fontWeight: '600',
  },
  languageToggleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 20,
    gap: 10,
  },
  languageToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  langOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  langOptionActive: {
    backgroundColor: '#E6F2FF',
  },
  langText: {
    fontSize: 16,
    fontWeight: '600',
  },
  langTextActive: {
    fontWeight: 'bold',
  },
  langSeparator: {
    fontSize: 16,
    marginHorizontal: 4,
  },
  roleToggleWrapper: {
    marginBottom: 24,
    marginTop: 0, // No extra margin from top
  },
  // Desktop Layout Styles
  desktopContainer: {
    flex: 1,
    ...Platform.select({
      web: {
        minHeight: '100vh' as any,
        position: 'relative' as any,
        overflow: 'hidden' as any,
      },
    }),
  },
  desktopLanguageToggle: {
    position: 'absolute',
    top: 24,
    right: 32,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  desktopWrapper: {
    flex: 1,
    flexDirection: 'row',
    ...Platform.select({
      web: {
        minHeight: '100vh' as any,
      },
    }),
  },
  desktopWrapperNoBranding: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopLeftPanel: {
    flex: 0.45,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
    position: 'relative',
    overflow: 'hidden' as any,
  },
  desktopLeftPanelGradient: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  desktopBranding: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 500,
    paddingHorizontal: 40,
    position: 'relative',
    zIndex: 10,
    ...Platform.select({
      web: {
        zIndex: 10,
      },
    }),
  },
  desktopLogo: {
    width: 200,
    height: 80,
    marginBottom: 40,
    ...Platform.select({
      web: {
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' as any,
      },
    }),
  } as any,
  desktopBrandTitle: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -1,
    position: 'relative',
    ...Platform.select({
      web: {
        zIndex: 10,
        textShadow: '0 2px 10px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.2)' as any,
        WebkitFontSmoothing: 'antialiased' as any,
        MozOsxFontSmoothing: 'grayscale' as any,
      },
    }),
  },
  desktopBrandSubtitle: {
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 56,
    textAlign: 'center',
    lineHeight: 30,
    opacity: 0.9,
    fontWeight: '500',
    letterSpacing: 0.5,
    position: 'relative',
    ...Platform.select({
      web: {
        zIndex: 10,
        textShadow: '0 2px 8px rgba(0,0,0,0.2)' as any,
      },
    }),
  },
  desktopFeatures: {
    width: '100%',
    gap: 24,
  },
  desktopFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 16,
    marginBottom: 18,
    width: '100%',
    borderWidth: 1,
    ...Platform.select({
      web: {
        transition: 'all 0.3s ease' as any,
        cursor: 'default' as any,
      },
    }),
  },
  desktopFeatureIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopFeatureText: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
    letterSpacing: 0.3,
    ...Platform.select({
      web: {
        textShadow: '0 2px 8px rgba(0,0,0,0.2)' as any,
      },
    }),
  },
  desktopRightPanel: {
    flex: 0.55,
    paddingHorizontal: 80,
    paddingVertical: 60,
    ...Platform.select({
      web: {
        overflow: 'auto' as any,
        maxHeight: '100vh' as any,
      },
    }),
  },
  desktopRightPanelFullWidth: {
    flex: 1,
    paddingHorizontal: 40,
    maxWidth: 600,
  },
  desktopScrollView: {
    flex: 1,
  },
  desktopFormContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 20,
    paddingBottom: 40,
  },
  desktopForm: {
    width: '100%',
  },
  desktopFormLogo: {
    width: 140,
    height: 56,
    marginBottom: 32,
    alignSelf: 'flex-start',
  } as any,
  desktopFormTitle: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 12,
  },
  desktopFormSubtitle: {
    fontSize: 18,
    marginBottom: 40,
    lineHeight: 26,
  },
  desktopRoleToggle: {
    flexDirection: 'row',
    padding: 6,
    borderWidth: 2,
    borderRadius: 16,
    marginBottom: 32,
  },
  desktopRoleToggleWrapper: {
    marginTop: 0, // No extra margin from top
    marginBottom: 32,
  },
  desktopRoleButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  desktopRoleButtonContent: {
    paddingVertical: 14,
  },
  desktopInputContainer: {
    marginBottom: 24,
  },
  desktopInput: {
    borderRadius: 16, // More rounded for better appearance
    fontSize: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' as any,
      },
    }),
  },
  desktopForgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  desktopForgotPasswordText: {
    fontSize: 15,
    fontWeight: '600',
  },
  desktopLoginButton: {
    borderRadius: 12,
    elevation: 4,
    marginBottom: 32,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)' as any,
        transition: 'all 0.3s ease' as any,
        cursor: 'pointer' as any,
        ':hover': {
          transform: 'translateY(-2px)' as any,
          boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)' as any,
        } as any,
        ':active': {
          transform: 'translateY(0)' as any,
        } as any,
      },
    }),
  },
  desktopLoginButtonContent: {
    paddingVertical: 14,
  },
  desktopSignupLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopSignupText: {
    fontSize: 16,
  },
  desktopSignupLinkText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

