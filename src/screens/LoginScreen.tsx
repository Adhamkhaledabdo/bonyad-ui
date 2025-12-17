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
import { FontFamily, UIFontSizes } from '../constants/Fonts';
import { storage } from '../utils/storage';
import { Button, Card, Surface } from 'react-native-paper';
import { useFCMNotifications } from '../utils/useFCMNotifications';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
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
  const { fontFamily, scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const insets = useSafeAreaInsets();
  
  // FCM Notifications Hook
  const { fcmToken, hasPermission, isLoading: fcmLoading } = useFCMNotifications();
  
  // Alert Popup Hook
  const { alertState, showError, showAlert, hideAlert } = useAlertPopup();
  
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
        showError(t('auth.errors.missingCredentials'), t('validation_failed'));
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
      // Handle errorCode: USER_ALREADY_EXISTS_PENDING
      if (data.errorCode === 'USER_ALREADY_EXISTS_PENDING' || 
          (data.message && (
            data.message.toLowerCase().includes('pending verification') || 
            data.message.toLowerCase().includes('otp sent')
          ))
      ) {
        console.log('⚠️ Account pending verification - redirecting to OTP screen');
        // Note: OTP is already sent by backend, no need to call resend endpoint here
        
        setIsLoading(false);
        // Navigate to OTP screen with phone number and role
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
        // Check for multilingual messages (messageEn/messageAr)
        const isArabic = i18n.language.startsWith('ar');
        let message = t('validation_failed');
        if (data.messageEn && data.messageAr) {
          message = isArabic ? data.messageAr : data.messageEn;
        } else {
          message = data.message || data.error || t('validation_failed');
        }
        showError(message, t('validation_failed'));
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      showError(t('network_error'), t('Error'));
    } finally {
      setIsLoading(false);
    }
  };


  // Figma Mobile Design Colors
  const figmaMobileColors = {
    background: '#FFFFFF',
    titleBlue: '#1A6DB4',        // Welcome back text
    textDark: '#2D2D2D',         // Subtitle text
    buttonBlue: '#005DAC',       // Login button
    linkNavy: '#003867',         // Create account link
  };

  // Render Android style (always mobile) OR Web small screen style
  if (Platform.OS !== 'web' || IS_SMALL_WEB || IS_MEDIUM_WEB) {
    return (
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: isDarkMode ? colors.background : figmaMobileColors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[styles.mainContainer, { flex: 1, paddingTop: Platform.OS === 'web' ? 0 : insets.top, paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom }]}>
          <ScrollView 
            style={[styles.container, { backgroundColor: isDarkMode ? colors.background : figmaMobileColors.background }]} 
            contentContainerStyle={[styles.scrollContent, Platform.OS === 'web' && styles.webScrollContent]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={[styles.contentWrapper, { backgroundColor: isDarkMode ? colors.cardBackground : figmaMobileColors.background }]}>
              {/* Language Toggle at Top */}
              <View style={styles.languageToggleTop}>
                <TouchableOpacity 
                  onPress={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')} 
                  style={styles.languageToggleButton}
                >
                  <Ionicons 
                    name="globe-outline" 
                    size={18} 
                    color={isDarkMode ? colors.primary : figmaMobileColors.buttonBlue} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.langText, { color: isDarkMode ? colors.primary : figmaMobileColors.buttonBlue, fontWeight: '600', fontSize: scaledSize(18) }]}>
                    {i18n.language === 'ar' ? 'AR' : 'EN'}
                  </Text>
                </TouchableOpacity>
              </View>

                {/* Logo Section - Figma Style: Cube + Text */}
              <View style={styles.mobileLogoSection}>
                <View style={styles.mobileLogoContainer}>
                  <Image
                    source={require('../../assets/bonyad-cube-logo.svg')}
                    style={styles.mobileCubeLogo}
                    contentFit="contain"
                  />
                  <View style={styles.mobileLogoTextContainer}>
                    <Text style={[styles.mobileLogoText, { color: isDarkMode ? colors.text : figmaMobileColors.buttonBlue, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' }]}>
                      Bonyad
                    </Text>
                    <Text style={[styles.mobileLogoArabic, { color: isDarkMode ? colors.textSecondary : figmaMobileColors.buttonBlue, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' }]}>
                      بُنيـــاد
                    </Text>
                  </View>
                </View>
              </View>

              {/* Welcome Section - Figma Style */}
              <View style={styles.mobileWelcomeSection}>
                <Text style={[styles.mobileWelcomeTitle, { color: isDarkMode ? colors.text : figmaMobileColors.titleBlue, fontSize: scaledSize(UIFontSizes.welcomeTitle) }]}>
                  {t('Welcome back')}
                </Text>
                <Text style={[styles.mobileWelcomeSubtitle, { color: isDarkMode ? colors.textSecondary : figmaMobileColors.textDark, fontSize: scaledSize(UIFontSizes.welcomeSubtitle) }]}>
                  {t('Manage your properties and services.')}
                </Text>
              </View>

              {/* Role Toggle (User / Technician) */}
              <View style={styles.roleToggleWrapper}>
                <AnimatedRoleToggle
                  selectedRole={selectedRole}
                  onRoleChange={setSelectedRole}
                />
              </View>

              {/* Form Section */}
              <View style={styles.mobileFormSection}>
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

                {/* Login Button - Figma Style */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isLoading}
                  style={[
                    styles.mobileLoginButton,
                    { backgroundColor: isDarkMode ? colors.primary : figmaMobileColors.buttonBlue },
                    isLoading && { opacity: 0.7 }
                  ]}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={[styles.mobileLoginButtonText, { fontSize: scaledSize(UIFontSizes.buttonMedium) }]}>
                      {t('Login')}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Create Account Link - Figma Style */}
                <View style={[
                  styles.mobileCreateAccountContainer,
                  { flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }
                ]}>
                  <Text style={[styles.mobileCreateAccountText, { color: isDarkMode ? colors.textSecondary : figmaMobileColors.linkNavy, fontSize: scaledSize(14) }]}>
                    {t("Don't have an account?")}
                  </Text>
                  <TouchableOpacity onPress={onNavigateToSignup}>
                    <Text style={[styles.mobileCreateAccountLink, { color: isDarkMode ? colors.primary : figmaMobileColors.linkNavy, fontSize: scaledSize(14) }]}>
                      {t('Create an account')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Theme Toggle */}
              <ThemeToggle />
            </View>
          </ScrollView>
        </View>
          
        {/* Alert Popup */}
        <AlertPopup
          visible={alertState.visible}
          title={alertState.title}
          message={alertState.message}
          type={alertState.type}
          buttons={alertState.buttons}
          countdown={alertState.countdown}
          onClose={hideAlert}
        />
      </KeyboardAvoidingView>
    );
  }

  // Render web desktop layout (large screens only on web)
  console.log('🖥️ Rendering DESKTOP layout (Web large screen)');
  console.log('🎨 Desktop Layout Branding Panel:', { IS_LARGE_WEB, willShow: IS_LARGE_WEB });
  
  // Figma Design Colors
  const figmaColors = {
    background: '#E6EFF7',       // Light blue background
    cardBackground: '#FFFFFF',   // White card
    primaryBlue: '#005DAC',      // Primary blue for buttons
    titleBlue: '#1A6DB4',        // Title text blue
    textDark: '#2D2D2D',         // Dark text
    textNavy: '#003867',         // Navy text for inputs
    inputBg: '#F0F0F0',          // Input background
    inputBorder: '#80AED6',      // Input border
    amberActive: '#FFB703',      // Amber for active toggle
    amberBg: '#FFF2CF',          // Light amber background
  };
  
  return (
    <View style={[styles.desktopContainer, { backgroundColor: isDarkMode ? colors.background : figmaColors.background }]}>
      {/* Language Toggle at Top Right */}
      <View style={styles.desktopLanguageToggle}>
        <TouchableOpacity 
          onPress={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')} 
          style={styles.languageToggleButton}
        >
          <Ionicons 
            name="globe-outline" 
            size={18} 
            color={isDarkMode ? colors.primary : figmaColors.primaryBlue} 
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.langText, { color: isDarkMode ? colors.primary : figmaColors.primaryBlue, fontWeight: '600', fontSize: scaledSize(18) }]}>
            {i18n.language === 'ar' ? 'AR' : 'EN'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.desktopWrapper, !IS_LARGE_WEB && styles.desktopWrapperNoBranding]}>
        {/* Left Side - Bonyad Logo & Branding (Only on large web screens >= 1024px) */}
        {IS_LARGE_WEB && (
          <Animated.View
            style={[
              styles.desktopLeftPanel,
              {
                backgroundColor: isDarkMode ? colors.cardBackground : figmaColors.background,
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Figma Layout: Cube Logo + Text Side by Side - NEVER FLIP */}
            <Animated.View 
              style={[
                styles.desktopBranding,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                  flexDirection: 'row', // Always LTR - logo should not flip
                  alignItems: 'center',
                  gap: 33, // Figma: gap-[33px]
                }
              ]}
            >
              {/* Bonyad 3D Cube Logo - Figma: 221x265px */}
              <Image
                source={require('../../assets/bonyad-cube-logo.svg')}
                style={{
                  width: 221,
                  height: 265,
                } as any}
                contentFit="contain"
              />
              
              {/* Brand Text Container - Figma: w-[414px], gap-[19px] */}
              <View style={{ 
                flexDirection: 'column', 
                gap: 19, // Figma: gap-[19px]
                alignItems: 'flex-start', // Always left-aligned
                width: 414, // Figma: w-[414px]
              }}>
                {/* "Bonyad" Text - Figma: 96px, Extra Bold, #005DAC */}
                <Animated.Text 
                  style={[
                    {
                      opacity: fadeAnim,
                      color: isDarkMode ? colors.text : figmaColors.primaryBlue,
                      fontSize: 96, // Figma: text-[96px]
                      fontWeight: '800', // Figma: font-extrabold
                      letterSpacing: -1,
                      lineHeight: 96,
                      fontFamily: Platform.OS === 'web' ? 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' : undefined,
                    }
                  ]}
                >
                  Bonyad
                </Animated.Text>
                
                {/* Arabic "بُنياد" Text - Figma: ~64px styled text, #005DAC */}
                <Animated.Text 
                  style={[
                    {
                      opacity: fadeAnim,
                      color: isDarkMode ? colors.textSecondary : figmaColors.primaryBlue,
                      fontSize: 72, // Scaled to match Figma proportions
                      fontWeight: '700',
                      letterSpacing: 8, // Add letter spacing for Arabic styling
                      lineHeight: 116, // Figma: h-[116px]
                      textAlign: 'left', // Always left-aligned
                      fontFamily: Platform.OS === 'web' ? 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' : undefined,
                    }
                  ]}
                >
                  بُنيـــاد
                </Animated.Text>
              </View>
            </Animated.View>
          </Animated.View>
        )}

        {/* Right Side - Login Form Card */}
        <Animated.View
          style={[
            styles.desktopRightPanel,
            { 
              backgroundColor: isDarkMode ? colors.background : figmaColors.background,
              paddingHorizontal: 40,
              paddingVertical: 40,
            },
            !IS_LARGE_WEB && styles.desktopRightPanelFullWidth,
            {
              opacity: fadeAnim,
              transform: [{ translateX: Animated.multiply(slideAnim, -1) }],
            },
          ]}
        >
          <ScrollView 
            contentContainerStyle={[styles.desktopFormContainer, { justifyContent: 'center' }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={styles.desktopScrollView}
          >
            {/* White Card Container */}
            <Animated.View
              style={[
                styles.desktopForm,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                  backgroundColor: isDarkMode ? colors.cardBackground : figmaColors.cardBackground,
                  padding: 32,
                  borderRadius: 8,
                  maxWidth: 557,
                  width: '100%',
                  alignSelf: 'center',
                  ...Platform.select({
                    web: {
                      boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)' as any,
                    },
                  }),
                },
              ]}
            >
              {/* Welcome Header */}
              <View style={{ alignItems: 'center', marginBottom: 24, gap: 8 }}>
                <Text style={[styles.desktopFormTitle, { 
                  color: isDarkMode ? colors.text : figmaColors.titleBlue, 
                  fontSize: scaledSize(28), 
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: 0,
                  fontFamily: FontFamily.heading,
                }]}>
                  {t('Welcome Back')}
                </Text>
                <Text style={[styles.desktopFormSubtitle, { 
                  color: isDarkMode ? colors.textSecondary : figmaColors.textDark, 
                  fontSize: scaledSize(18),
                  fontWeight: '400',
                  textAlign: 'center',
                  marginBottom: 0,
                  fontFamily: FontFamily.body,
                }]}>
                  {t('Manage your properties and services.')}
                </Text>
              </View>

              {/* Role Toggle - Enhanced with Figma Amber Colors */}
              <View style={[styles.desktopRoleToggleWrapper, { marginBottom: 24 }]}>
                <AnimatedRoleToggle
                  selectedRole={selectedRole}
                  onRoleChange={setSelectedRole}
                />
              </View>

              {/* Form Fields */}
              <PhoneInput
                label={t('Mobile Number')}
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
                labelStyle={[styles.desktopForgotPasswordText, { color: isDarkMode ? colors.primary : figmaColors.primaryBlue }]}
              >
                {t('Forgot Password?')}
              </Button>

              {/* Login Button - Figma Blue */}
              <Button
                mode="contained"
                onPress={handleLogin}
                disabled={isLoading}
                style={[styles.desktopLoginButton, { 
                  backgroundColor: isDarkMode ? colors.primary : figmaColors.primaryBlue,
                  borderRadius: 8,
                }]}
                contentStyle={[styles.desktopLoginButtonContent, { paddingVertical: 12 }]}
                labelStyle={{ fontSize: scaledSize(UIFontSizes.buttonMedium), fontWeight: '600', color: '#FFFFFF', fontFamily: FontFamily.button }}
                loading={isLoading}
              >
                {t('Login')}
              </Button>

              {/* Sign Up Link */}
              <View style={[
                styles.desktopSignupLink, 
                { 
                  marginTop: 8,
                  flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row',
                  gap: 8, // Add gap between text and link
                }
              ]}>
                <Text style={[styles.desktopSignupText, { 
                  color: isDarkMode ? colors.textSecondary : figmaColors.textNavy, 
                  fontSize: scaledSize(22),
                  fontWeight: '300',
                  fontFamily: FontFamily.body,
                }]}>
                  {t("Don't have an account?")}
                </Text>
                <TouchableOpacity onPress={onNavigateToSignup}>
                  <Text style={[styles.desktopSignupLinkText, { 
                    color: isDarkMode ? colors.primary : figmaColors.textNavy,
                    fontSize: scaledSize(22),
                    fontWeight: '600',
                    textDecorationLine: 'underline',
                    fontFamily: FontFamily.body,
                  }]}>
                    {t('Create an account')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Theme Toggle */}
              <View style={{ marginTop: 16 }}>
                <ThemeToggle />
              </View>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </View>
      
      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        countdown={alertState.countdown}
        onClose={hideAlert}
      />
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
    // paddingHorizontal: 24,
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
    fontFamily: FontFamily.heading,
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
    fontFamily: FontFamily.body,
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
    fontFamily: FontFamily.primary,
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
    fontSize: UIFontSizes.link,
    fontWeight: '600',
    fontFamily: FontFamily.primary,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: FontFamily.button,
  },
  signupText: {
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: FontFamily.body,
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
    fontFamily: FontFamily.body,
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
    fontSize: UIFontSizes.langToggle, // Centralized: 18px
    fontWeight: '600',
    fontFamily: FontFamily.primary,
  },
  langTextActive: {
    fontWeight: 'bold',
    fontFamily: FontFamily.primary,
  },
  langSeparator: {
    fontSize: 16,
    marginHorizontal: 4,
    fontFamily: FontFamily.primary,
  },
  roleToggleWrapper: {
    marginBottom: 24,
    marginTop: 0, // No extra margin from top
  },
  // Mobile Figma Design Styles
  mobileLogoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 8,
  },
  mobileLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileCubeLogo: {
    width: 53,
    height: 64,
  } as any,
  mobileLogoTextContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  mobileLogoText: {
    fontSize: UIFontSizes.logoText, // Centralized: 30px
    fontWeight: '800',
    letterSpacing: -0.5,
    // Logo uses system font, not SakkalMajalla
  },
  mobileLogoArabic: {
    fontSize: UIFontSizes.logoArabic, // Centralized: 24px
    fontWeight: '600',
    letterSpacing: 2,
    // Logo uses system font, not SakkalMajalla
  },
  mobileWelcomeSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  mobileWelcomeTitle: {
    fontSize: UIFontSizes.welcomeTitle, // Centralized: 32px
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: FontFamily.heading,
  },
  mobileWelcomeSubtitle: {
    fontSize: UIFontSizes.welcomeSubtitle, // Centralized: 20px
    fontWeight: '400',
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  mobileFormSection: {
    width: '100%',
    paddingHorizontal: 6,
    gap: 24,
  },
  mobileLoginButton: {
    width: '100%',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  mobileLoginButtonText: {
    color: '#FFFFFF',
    fontSize: UIFontSizes.buttonMedium, // Centralized: 18px
    fontWeight: '400',
    textAlign: 'center',
    fontFamily: FontFamily.button,
  },
  mobileCreateAccountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  mobileCreateAccountText: {
    fontSize: UIFontSizes.link, // Centralized: 16px
    fontWeight: '300',
    fontFamily: FontFamily.body,
  },
  mobileCreateAccountLink: {
    fontSize: UIFontSizes.link, // Centralized: 16px
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontFamily: FontFamily.body,
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
    paddingVertical: 60,
    paddingLeft: 200, // Push content more to the right
    paddingRight: 40,
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
    fontFamily: FontFamily.heading,
    ...Platform.select({
      web: {
        zIndex: 10,
        textShadow: '0 2px 10px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.2)' as any,
        WebkitFontSmoothing: 'antialiased' as any,
        MozOsxFontSmoothing: 'grayscale' as any,
      },
    }),
  },
  desktopBrandingLogo: {
    width: 221,
    height: 265,
  } as any,
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
    fontFamily: FontFamily.body,
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
    fontFamily: FontFamily.body,
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
    fontSize: UIFontSizes.desktop.formTitle, // Centralized: 44px
    fontWeight: '700',
    marginBottom: 12,
    fontFamily: FontFamily.heading,
  },
  desktopFormSubtitle: {
    fontSize: UIFontSizes.desktop.formSubtitle, // Centralized: 22px
    marginBottom: 40,
    lineHeight: 30,
    fontFamily: FontFamily.body,
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
    fontSize: UIFontSizes.linkSmall,
    fontWeight: '600',
    fontFamily: FontFamily.body,
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
    fontSize: UIFontSizes.desktop.linkText, // Centralized: 24px
    fontFamily: FontFamily.body,
  },
  desktopSignupLinkText: {
    fontSize: UIFontSizes.desktop.linkText, // Centralized: 24px
    fontWeight: '600',
    fontFamily: FontFamily.body,
  },
});

