import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
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
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Surface, Portal, List, Divider } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import AnimatedRoleToggle from '../components/AnimatedRoleToggle';
import { PhoneInput, NameInput, EmailInput, PasswordInput, TextAreaInput, CustomPicker, CustomTextInput, UploadButton, SelectedChips, CustomCheckbox } from '../components/CustomInput';
import ThemeToggle from '../components/ThemeToggle';
import { useSignupValidation } from '../validation/useSignupValidation';

// Responsive breakpoints - will be calculated in component

type FocusableField = 'phone' | 'name' | 'email' | 'password' | 'confirm';

// 📝 SIGNUP SCREEN: Based on Signup.swift from iOS app
export default function SignupScreen({ 
  onNavigateToLogin,
  onNavigateToOTP,
  onNavigateToOverview,
}: { 
  onNavigateToLogin: () => void;
  onNavigateToOTP: (phone: string, role: 'user' | 'technician') => void;
  onNavigateToOverview?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const insets = useSafeAreaInsets();
  
  // Alert Popup Hook
  const { alertState, showError, showAlert, showWarning, showAlertWithCountdown, hideAlert } = useAlertPopup();

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
    console.log('🔍 SignupScreen Responsive Debug:', {
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

  // Fetch regions on mount
  useEffect(() => {
    fetchRegions();
  }, []);

  // 🌍 FETCH REGIONS
  const fetchRegions = async () => {
    setIsLoadingRegions(true);
    
    try {
      console.log('📍 Fetching regions...');
      const regionsUrl = buildApiUrl(API_ENDPOINTS.ZONES.LIST);
      console.log('   URL:', regionsUrl);
      
      const response = await fetch(regionsUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log('📥 Regions Response Status:', response.status);
      
      const data = await response.json();
      console.log('📥 Regions Data:', JSON.stringify(data, null, 2));
      
      if (response.ok && Array.isArray(data)) {
        setRegions(data);
        console.log(`✅ Loaded ${data.length} regions`);
      } else {
        console.error('❌ Failed to fetch regions - not an array or response not ok');
        console.error('   Response OK:', response.ok);
        console.error('   Is Array:', Array.isArray(data));
      }
    } catch (error) {
      console.error('❌ Error fetching regions:', error);
    } finally {
      setIsLoadingRegions(false);
    }
  };
  
  // Common fields
  const [selectedRole, setSelectedRole] = useState<'user' | 'technician'>('user');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focusedField, setFocusedField] = useState<FocusableField | null>(null);
  
  // Technician-only fields
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('1');
  const [showExperienceDropdown, setShowExperienceDropdown] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState<any[]>([]);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [regions, setRegions] = useState<any[]>([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  
  // Image states for technician
  const [certificates, setCertificates] = useState<string[]>([]);
  
  // Terms and conditions
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const isArabic = i18n.language.startsWith('ar');
  const alignment: 'flex-start' | 'flex-end' = isArabic ? 'flex-end' : 'flex-start';
  const successColor = colors.success || '#22C55E';
  const mutedColor = colors.textTertiary || colors.textSecondary || '#9CA3AF';

  const { values, flags } = useSignupValidation({
    phone,
    name,
    email,
    password,
    confirmPassword,
  });

  useEffect(() => {
    if (selectedRole !== 'technician' && focusedField === 'email') {
      setFocusedField(null);
    }
  }, [focusedField, selectedRole]);

  // State
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
  
  // Years of experience options (1-10)
  const experienceOptions = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

  const handleFieldFocus = (field: FocusableField) => () => setFocusedField(field);
  const handleFieldBlur = (field: FocusableField) => () => {
    setFocusedField((prev) => (prev === field ? null : prev));
  };

  const handlePhoneChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 9);
    setPhone(digitsOnly);
  };

  const handlePasswordChange = (value: string) => {
    const sanitized = value.replace(/\s/g, '');
    setPassword(sanitized);
  };

  const handleConfirmPasswordChange = (value: string) => {
    const sanitized = value.replace(/\s/g, '');
    setConfirmPassword(sanitized);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value.trim().toLowerCase());
  };

  const ValidationHintItem = ({
    passed,
    label,
    isFirst = false,
  }: {
    passed: boolean;
    label: string;
    isFirst?: boolean;
  }) => (
    <View
      style={[
        styles.validationHintRow,
        {
          marginTop: isFirst ? 0 : 4,
          flexDirection: isArabic ? 'row-reverse' : 'row',
        },
      ]}
    >
      <Ionicons
        name={passed ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={passed ? successColor : mutedColor}
      />
      <Text
        style={[
          styles.validationHintText,
          {
            marginLeft: isArabic ? 0 : 6,
            marginRight: isArabic ? 6 : 0,
            color: passed ? successColor : mutedColor,
            textAlign: isArabic ? 'right' : 'left',
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  // 📷 PICK CERTIFICATES
  const pickCertificates = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        showError(t('auth.errors.galleryPermission'), t('Error'));
        return;
      }

      // Configure options based on platform
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      };

      // Multiple selection is supported on iOS, web, and newer Android versions
      if (Platform.OS === 'ios' || Platform.OS === 'web') {
        options.allowsMultipleSelection = true;
        options.selectionLimit = 0; // 0 means no limit
      } else if (Platform.OS === 'android') {
        // Try to enable multiple selection on Android (supported in newer versions)
        // If not supported, it will fall back to single selection
        options.allowsMultipleSelection = true;
        options.selectionLimit = 0;
      }

      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newCerts = result.assets.map(asset => asset.uri);
        setCertificates([...certificates, ...newCerts]);
        console.log(`✅ Added ${newCerts.length} certificate(s)`);
      } else if (result.canceled) {
        console.log('❌ User canceled certificate selection');
      }
    } catch (error) {
      console.error('❌ Error picking certificates:', error);
      showError(t('auth.errors.certificatePickFailed'), t('Error'));
    }
  };

  // 🗑️ REMOVE CERTIFICATE
  const removeCertificate = (index: number) => {
    const newCerts = certificates.filter((_, i) => i !== index);
    setCertificates(newCerts);
  };

  // 📝 SIGNUP FUNCTION
  const handleSignup = async () => {
    // Check terms first and show alert
    if (!agreedToTerms) {
      showWarning(t('Please agree to terms and conditions'), t('Required'));
      return;
    }

    const formattedPhone = values.phone;
    setPhone(formattedPhone);

    if (!flags.phoneValid) {
      showError(t('signup.validation.phone'), t('validation_failed'));
      return;
    }

    if (!flags.nameValid) {
      showError(t('signup.validation.name'), t('validation_failed'));
      return;
    }

    if (!flags.passwordValid) {
      showError(t('signup.validation.password.requirements'), t('validation_failed'));
      return;
    }

    if (!flags.confirmValid) {
      showError(t('signup.validation.confirm'), t('validation_failed'));
      return;
    }

    // Technician-specific validation
    if (selectedRole === 'technician') {
      if (!flags.emailValid) {
        showError(t('signup.validation.email'), t('validation_failed'));
        return;
      }
      if (selectedRegions.length === 0) {
        showError(t('Please select at least one region'), t('validation_failed'));
        return;
      }
    }

    setIsLoading(true);

    try {
      console.log('📱 Phone Number: ' + formattedPhone);

      if (selectedRole === 'user') {
        // 👤 USER REGISTRATION
        await signupUser(formattedPhone);
      } else {
        // 💼 TECHNICIAN REGISTRATION
        await signupTechnician(formattedPhone);
      }
    } catch (error) {
      console.error('❌ Signup error:', error);
      showError(t('network_error'), t('Error'));
      setIsLoading(false);
    }
  };

  // 👤 USER SIGNUP (JSON)
  const signupUser = async (formattedPhone: string) => {
    const apiURL = buildApiUrl(API_ENDPOINTS.AUTH.REGISTER);
    
    // Generate email: phoneNumber+name+@gmail.com
    const generatedEmail = `${formattedPhone}${name.replace(/\s+/g, '')}@gmail.com`;
    
    console.log('📤 USER Signup Request:');
    console.log('   API URL: ' + apiURL);
    console.log('   Phone Number: ' + formattedPhone);
    console.log('   Name: ' + name);
    console.log('   Password: ' + password.substring(0, 3) + '***');
    console.log('   Generated Email: ' + generatedEmail);
    console.log('   Role: USER');

    // Create JSON body for user registration
    const requestBody: any = {
      name: name,
      phoneNumber: formattedPhone,
      password: password,
      role: 'USER',
      email: generatedEmail,
    };

    console.log('📦 Request Body (JSON):', JSON.stringify(requestBody, null, 2));
    console.log('📦 Request Body (Object):', requestBody);
    console.log('📦 Request Headers:', {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });

    const requestBodyString = JSON.stringify(requestBody);
    console.log('📤 Sending Request:');
    console.log('   Method: POST');
    console.log('   URL: ' + apiURL);
    console.log('   Headers: { "Content-Type": "application/json", "Accept": "application/json" }');
    console.log('   Body (stringified): ' + requestBodyString);
    console.log('   Body length: ' + requestBodyString.length + ' characters');

    const response = await fetch(apiURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: requestBodyString,
    });

    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Status Text:', response.statusText);
    console.log('📥 Response Headers:', {
      'content-type': response.headers.get('content-type'),
      'content-length': response.headers.get('content-length'),
    });

    // Check if response is ok
    if (response.status === 201 || response.ok) {
      try {
        const data = await response.json();
        console.log('📥 USER Signup Response:', data);
        console.log('✅ USER signup successful!');
        setIsLoading(false);
        onNavigateToOTP(formattedPhone, 'user');
      } catch (jsonError) {
        console.error('❌ Error parsing success response:', jsonError);
        setIsLoading(false);
        // Even if JSON parsing fails, if status is 201/ok, proceed
        onNavigateToOTP(formattedPhone, 'user');
      }
    } else {
      // Handle error response
      setIsLoading(false);
      let errorMessage = t('validation_failed');
      let errorCode = '';
      
      try {
        const contentType = response.headers.get('content-type');
        const responseText = await response.text();
        console.log('📥 Error Response Text:', responseText);
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = JSON.parse(responseText);
            errorCode = data.errorCode || '';
            const isArabic = i18n.language.startsWith('ar');
            
            // Existing account (verified or pending) -> show countdown and redirect to login
            if (errorCode === 'USER_ALREADY_EXISTS' || errorCode === 'USER_ALREADY_EXISTS_PENDING') {
              console.log('⚠️ Account already exists - showing countdown to login');
              const message = data.messageEn && data.messageAr 
                ? (isArabic ? data.messageAr : data.messageEn)
                : t('Account already exists. Please sign in instead.');
              const countdownText = isArabic ? 'الانتقال إلى تسجيل الدخول خلال' : 'Navigating to login in';
              
              showAlertWithCountdown(
                t('validation_failed'),
                message,
                'info',
                3,
                countdownText,
                () => onNavigateToLogin()
              );
              return;
            }
            
            // Check for multilingual messages (messageEn/messageAr)
            if (data.messageEn && data.messageAr) {
              errorMessage = isArabic ? data.messageAr : data.messageEn;
            } else {
              errorMessage = data.message || data.error || t('validation_failed');
            }
          } catch (jsonError) {
            // If JSON parsing fails, use the text response
            errorMessage = responseText || t('validation_failed');
          }
        } else {
          // Use text response directly
          errorMessage = responseText || t('validation_failed');
        }
      } catch (parseError) {
        console.error('❌ Error parsing error response:', parseError);
        errorMessage = t('validation_failed');
      }
      
      showError(errorMessage, t('validation_failed'));
    }
  };

  // 💼 TECHNICIAN SIGNUP WITH FILES
  const signupTechnician = async (formattedPhone: string) => {
    const apiURL = buildApiUrl(API_ENDPOINTS.AUTH.REGISTER_WITH_FILES);
    
    console.log('📤 TECHNICIAN Signup Request:');
    console.log('   API URL: ' + apiURL);
    console.log('   Phone Number: ' + formattedPhone);
    console.log('   Name: ' + name);
    console.log('   Email: ' + email);
    console.log('   Password: ' + password.substring(0, 3) + '***');
    console.log('   Role: TECHNICIAN');
    console.log('   Years of Experience: ' + yearsOfExperience);
    console.log('   Bio/Description: ' + (bio || 'Service provider'));
    console.log('   Address: ' + (address || 'N/A'));
    console.log('   Certificates Count: ' + certificates.length);
    console.log('📍 Selected Regions:', selectedRegions.map(r => `${r.nameEn} (ID: ${r.id})`).join(', '));

    // Create multipart form data
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phoneNumber', formattedPhone);
    formData.append('password', password);
    formData.append('role', 'TECHNICIAN');
    
    // Append multiple region IDs
    selectedRegions.forEach(region => {
      formData.append('regionIds', region.id.toString());
    });
    
    formData.append('yearsOfExperience', yearsOfExperience);
    formData.append('description', bio || 'Service provider');
    
    // Log all FormData entries
    console.log('📦 FormData Entries:');
    console.log('   - name: ' + name);
    console.log('   - email: ' + email);
    console.log('   - phoneNumber: ' + formattedPhone);
    console.log('   - password: ' + password.substring(0, 3) + '***');
    console.log('   - role: TECHNICIAN');
    console.log('   - yearsOfExperience: ' + yearsOfExperience);
    console.log('   - description: ' + (bio || 'Service provider'));
    console.log('   - regionIds: [' + selectedRegions.map(r => r.id).join(', ') + ']');
    console.log('   - certificates: ' + certificates.length + ' file(s)');

    // Add certificates if selected
    if (certificates.length > 0) {
      certificates.forEach((certUri, index) => {
        const certData: any = {
          uri: certUri,
          type: 'image/jpeg',
          name: `certificate_${index + 1}.jpg`,
        };
        formData.append('certificates', certData);
        console.log(`   - certificate_${index + 1}: ${certUri.substring(0, 50)}...`);
      });
      console.log(`✅ Added ${certificates.length} certificate(s) to form`);
    }

    console.log('📤 Sending Request:');
    console.log('   Method: POST');
    console.log('   URL: ' + apiURL);
    console.log('   Content-Type: multipart/form-data (FormData)');
    console.log('   FormData entries logged above');

    const response = await fetch(apiURL, {
      method: 'POST',
      body: formData as any,
    });

    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Status Text:', response.statusText);
    console.log('📥 Response Headers:', {
      'content-type': response.headers.get('content-type'),
      'content-length': response.headers.get('content-length'),
    });

    // Check if response is ok
    if (response.status === 201 || response.ok) {
      try {
        const data = await response.json();
        console.log('📥 TECHNICIAN Signup Response:', data);
        console.log('✅ TECHNICIAN signup successful!');
        setIsLoading(false);
        onNavigateToOTP(formattedPhone, 'technician');
      } catch (jsonError) {
        console.error('❌ Error parsing success response:', jsonError);
        setIsLoading(false);
        // Even if JSON parsing fails, if status is 201/ok, proceed
        onNavigateToOTP(formattedPhone, 'technician');
      }
    } else {
      // Handle error response
      setIsLoading(false);
      let errorMessage = t('validation_failed');
      let errorCode = '';
      
      try {
        const contentType = response.headers.get('content-type');
        const responseText = await response.text();
        console.log('📥 Error Response Text:', responseText);
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = JSON.parse(responseText);
            errorCode = data.errorCode || '';
            const isArabic = i18n.language.startsWith('ar');
            
            // Existing account (verified or pending) -> show countdown and redirect to login
            if (errorCode === 'USER_ALREADY_EXISTS' || errorCode === 'USER_ALREADY_EXISTS_PENDING') {
              console.log('⚠️ Account already exists - showing countdown to login');
              const message = data.messageEn && data.messageAr 
                ? (isArabic ? data.messageAr : data.messageEn)
                : t('Account already exists. Please sign in instead.');
              const countdownText = isArabic ? 'الانتقال إلى تسجيل الدخول خلال' : 'Navigating to login in';
              
              showAlertWithCountdown(
                t('validation_failed'),
                message,
                'info',
                3,
                countdownText,
                () => onNavigateToLogin()
              );
              return;
            }
            
            // Check for multilingual messages (messageEn/messageAr)
            if (data.messageEn && data.messageAr) {
              errorMessage = isArabic ? data.messageAr : data.messageEn;
            } else {
              errorMessage = data.message || data.error || t('validation_failed');
            }
          } catch (jsonError) {
            // If JSON parsing fails, use the text response
            errorMessage = responseText || t('validation_failed');
          }
        } else {
          // Use text response directly
          errorMessage = responseText || t('validation_failed');
        }
      } catch (parseError) {
        console.error('❌ Error parsing error response:', parseError);
        errorMessage = t('validation_failed');
      }
      
      showError(errorMessage, t('validation_failed'));
    }
  };


  // Figma Mobile Design Colors
  const figmaMobileColors = {
    background: '#FFFFFF',
    titleBlue: '#1A6DB4',        // Title text
    textDark: '#2D2D2D',         // Subtitle text
    buttonBlue: '#005DAC',       // Create Account button
    linkNavy: '#003867',         // Login link
  };

  // Render Android style (always mobile) OR Web small/medium screen style
  const shouldRenderMobile = Platform.OS !== 'web' || IS_SMALL_WEB || IS_MEDIUM_WEB;
  console.log('📱 SignupScreen Layout Decision:', {
    shouldRenderMobile,
    reason: Platform.OS !== 'web' ? 'Android/iOS' : (IS_SMALL_WEB ? 'Small Web' : IS_MEDIUM_WEB ? 'Medium Web' : 'Large Web'),
  });

  if (shouldRenderMobile) {
    console.log('✅ Rendering MOBILE layout');
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
                  <Text style={[styles.langText, { color: isDarkMode ? colors.primary : figmaMobileColors.buttonBlue, fontWeight: '600' }]}>
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
                <Text style={[styles.mobileWelcomeTitle, { color: isDarkMode ? colors.text : figmaMobileColors.titleBlue }]}>
                  {t('Create an Account')}
                </Text>
                <Text style={[styles.mobileWelcomeSubtitle, { color: isDarkMode ? colors.textSecondary : figmaMobileColors.textDark }]}>
                  {t('Manage your properties and services.')}
                </Text>
              </View>

              {/* Role Toggle - Enhanced with Animation */}
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
        onChangeText={handlePhoneChange}
        placeholder={t('auth.placeholders.phone')}
        autoCapitalize="none"
        maxLength={9}
        selectionColor={colors.primary}
        onFocus={handleFieldFocus('phone')}
        onBlur={handleFieldBlur('phone')}
        style={styles.tightInputSpacing}
      />
      {focusedField === 'phone' && (
        <View style={[styles.validationHintGroup, { alignItems: alignment }]}>
          <ValidationHintItem
            passed={flags.phoneValid}
            label={t('signup.validation.phone')}
            isFirst
          />
        </View>
      )}

      {/* Name Input */}
      <NameInput
        label={t('Full Name')}
        value={name}
        onChangeText={setName}
        placeholder={t('Enter your full name')}
        selectionColor={colors.primary}
        onFocus={handleFieldFocus('name')}
        onBlur={handleFieldBlur('name')}
        style={styles.tightInputSpacing}
      />
      {focusedField === 'name' && (
        <View style={[styles.validationHintGroup, { alignItems: alignment }]}>
          <ValidationHintItem
            passed={flags.nameValid}
            label={t('signup.validation.name')}
            isFirst
          />
        </View>
      )}

      {/* Technician-Only Fields */}
      {selectedRole === 'technician' && (
        <>
          {/* Email */}
          <EmailInput
            label={t('Email')}
            value={email}
            onChangeText={handleEmailChange}
            placeholder={t('Enter your email')}
            selectionColor={colors.primary}
            onFocus={handleFieldFocus('email')}
            onBlur={handleFieldBlur('email')}
            style={styles.tightInputSpacing}
          />
          {focusedField === 'email' && (
            <View style={[styles.validationHintGroup, { alignItems: alignment }]}>
              <ValidationHintItem
                passed={flags.emailValid}
                label={t('signup.validation.email')}
                isFirst
              />
            </View>
          )}

          {/* Bio */}
          <TextAreaInput
            label={t('Bio / Description')}
            value={bio}
            onChangeText={setBio}
            placeholder={t('Enter your bio or description')}
          />

          {/* Address */}
          <CustomTextInput
            label={t('Address')}
            value={address}
            onChangeText={setAddress}
            placeholder={t('Enter your address')}
          />

          {/* Region Selection - Multiple */}
          <CustomPicker
            label={t('Select Regions')}
            value={selectedRegions.length > 0 ? `${selectedRegions.length} ${t('Regions Selected')}` : ''}
            onPress={() => {
              console.log('📍 Region dropdown clicked');
              console.log('   Available regions:', regions.length);
              console.log('   Selected regions:', selectedRegions.length);
              setShowRegionDropdown(true);
            }}
            placeholder={t('Select Regions')}
            disabled={isLoadingRegions}
          />
          {isLoadingRegions && (
            <View style={{ marginTop: -20, marginBottom: 8, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}

          {/* Show selected regions as chips */}
          <SelectedChips
            items={selectedRegions.map(region => ({
              id: region.id,
              label: i18n.language === 'ar' ? region.nameAr : region.nameEn,
            }))}
            onRemove={(id) => {
              setSelectedRegions(selectedRegions.filter(r => r.id !== id));
            }}
          />

          {/* Years of Experience - Dropdown */}
          <CustomPicker
            label={t('Years of Experience')}
            value={yearsOfExperience ? `${yearsOfExperience} ${t('Years')}` : ''}
            onPress={() => setShowExperienceDropdown(true)}
            placeholder={t('Years of Experience')}
          />

          {/* Certificates Upload */}
          <UploadButton
            label={t('Upload Certificates (Optional)')}
            value={certificates.length > 0 ? `${certificates.length} ${t('Certificate(s) Added')}` : ''}
            onPress={pickCertificates}
            placeholder={t('Upload Certificates (Optional)')}
          />

          {certificates.length > 0 && (
            <View style={styles.certificatesContainer}>
              {certificates.map((certUri, index) => (
                <View key={index} style={styles.certificateItem}>
                  <Image source={{ uri: certUri }} style={styles.certificatePreview} />
                  <TouchableOpacity
                    style={styles.removeCertButton}
                    onPress={() => removeCertificate(index)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error || '#F44336'} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Region Dropdown Modal - Multiple Selection */}
      <Modal
        visible={showRegionDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRegionDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('Select Regions')} ({selectedRegions.length})
              </Text>
              <Button 
                mode="text" 
                onPress={() => setShowRegionDropdown(false)}
                icon="close"
              >
                {''}
              </Button>
            </View>

            {/* Select All / Deselect All */}
            <View style={styles.selectAllContainer}>
              <Button
                mode="contained"
                onPress={() => {
                  setSelectedRegions([...regions]);
                  console.log('✅ Selected all regions:', regions.length);
                }}
                style={[styles.selectAllButton, { backgroundColor: colors.primary }]}
                contentStyle={styles.selectAllButtonContent}
                buttonColor={colors.primary}
              >
                {t('Select All')}
              </Button>
              <Button
                mode="outlined"
                onPress={() => {
                  setSelectedRegions([]);
                  console.log('❌ Deselected all regions');
                }}
                style={[styles.deselectAllButton, { borderColor: colors.primary }]}
                contentStyle={styles.selectAllButtonContent}
                textColor={colors.primary}
              >
                {t('Deselect All')}
              </Button>
            </View>

            {regions.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>
                  {isLoadingRegions ? t('Loading...') : t('No regions available')}
                </Text>
              </View>
            ) : (
              <FlatList
                data={regions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => {
                  const isSelected = selectedRegions.some(r => r.id === item.id);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        isSelected && styles.dropdownItemSelected,
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedRegions(selectedRegions.filter(r => r.id !== item.id));
                          console.log(`❌ Removed region: ${item.nameEn}`);
                        } else {
                          setSelectedRegions([...selectedRegions, item]);
                          console.log(`✅ Added region: ${item.nameEn}`);
                        }
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        isSelected && styles.dropdownItemTextSelected,
                      ]}>
                        {i18n.language === 'ar' ? item.nameAr : item.nameEn}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* Done Button */}
            <View style={styles.modalFooter}>
              <Button
                mode="contained"
                onPress={() => setShowRegionDropdown(false)}
                style={[styles.doneButton, { backgroundColor: colors.primary }]}
                contentStyle={styles.doneButtonContent}
                buttonColor={colors.primary}
              >
                {t('Done')} ({selectedRegions.length})
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Experience Dropdown Modal */}
      <Modal
        visible={showExperienceDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExperienceDropdown(false)}
      >
        <View
          style={styles.modalOverlay}
          onTouchEnd={() => setShowExperienceDropdown(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Select Years of Experience')}</Text>
              <Button 
                mode="text" 
                onPress={() => setShowExperienceDropdown(false)}
                icon="close"
              >
                {''}
              </Button>
            </View>
            <FlatList
              data={experienceOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Button
                  mode="text"
                  style={[
                    styles.dropdownItem,
                    yearsOfExperience === item && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setYearsOfExperience(item);
                    setShowExperienceDropdown(false);
                  }}
                  contentStyle={styles.dropdownItemContent}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    yearsOfExperience === item && styles.dropdownItemTextSelected,
                  ]}>
                    {item} {t('Years')}
                  </Text>
                  {yearsOfExperience === item && (
                    <Ionicons name="checkmark" size={24} color={Colors.primary} />
                  )}
                </Button>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Password Input */}
      <PasswordInput
        label={t('Password')}
        value={password}
        onChangeText={handlePasswordChange}
        placeholder={t('auth.placeholders.password')}
        autoCapitalize="none"
        selectionColor={colors.primary}
        onFocus={handleFieldFocus('password')}
        onBlur={handleFieldBlur('password')}
        style={styles.tightInputSpacing}
      />
      {focusedField === 'password' && (
        <View style={[styles.validationHintGroup, { alignItems: alignment }]}>
          <ValidationHintItem
            passed={flags.passwordRules.uppercase}
            label={t('signup.validation.password.uppercase')}
            isFirst
          />
          <ValidationHintItem
            passed={flags.passwordRules.number}
            label={t('signup.validation.password.number')}
          />
          <ValidationHintItem
            passed={flags.passwordRules.special}
            label={t('signup.validation.password.special')}
          />
          <ValidationHintItem
            passed={flags.passwordRules.noSpaces}
            label={t('signup.validation.password.spaces')}
          />
          <ValidationHintItem
            passed={flags.passwordRules.noSequence}
            label={t('signup.validation.password.sequence')}
          />
        </View>
      )}

      {/* Confirm Password Input */}
      <PasswordInput
        label={t('Confirm Password')}
        value={confirmPassword}
        onChangeText={handleConfirmPasswordChange}
        placeholder={t('Confirm your password')}
        autoCapitalize="none"
        selectionColor={colors.primary}
        onFocus={handleFieldFocus('confirm')}
        onBlur={handleFieldBlur('confirm')}
        style={styles.tightInputSpacing}
      />
      {focusedField === 'confirm' && (
        <View style={[styles.validationHintGroup, { alignItems: alignment }]}>
          <ValidationHintItem
            passed={flags.confirmValid}
            label={t('signup.validation.confirm')}
            isFirst
          />
        </View>
      )}

      {/* Terms and Conditions */}
      <CustomCheckbox
        checked={agreedToTerms}
        onPress={() => setAgreedToTerms(!agreedToTerms)}
        label={t('I agree to the')}
        linkText={t('Terms and Conditions')}
      />

              {/* Create Account Button - Figma Style */}
              <TouchableOpacity
                onPress={handleSignup}
                disabled={isLoading || !agreedToTerms}
                style={[
                  styles.mobileRegisterButton,
                  { 
                    backgroundColor: agreedToTerms 
                      ? (isDarkMode ? colors.primary : figmaMobileColors.buttonBlue)
                      : '#9E9E9E' 
                  },
                  (isLoading || !agreedToTerms) && { opacity: 0.7 }
                ]}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.mobileRegisterButtonText}>
                    {t('Create Account')}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Login Link - Figma Style */}
              <View style={[
                styles.mobileLoginLinkContainer,
                { flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }
              ]}>
                <Text style={[styles.mobileLoginLinkText, { color: isDarkMode ? colors.textSecondary : figmaMobileColors.linkNavy }]}>
                  {t('Already have an account?')}
                </Text>
                <TouchableOpacity onPress={onNavigateToLogin}>
                  <Text style={[styles.mobileLoginLinkAction, { color: isDarkMode ? colors.primary : figmaMobileColors.linkNavy }]}>
                    {t('Login')}
                  </Text>
                </TouchableOpacity>
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

  // Render desktop layout (large screens) - Figma Design Implementation
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
          <Text style={[styles.langText, { color: isDarkMode ? colors.primary : figmaColors.primaryBlue, fontWeight: '600' }]}>
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

        {/* Right Side - Signup Form Card */}
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
                  fontSize: scaledSize(24), 
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: 0,
                }]}>
                  {t('Create an Account')}
                </Text>
                <Text style={[styles.desktopFormSubtitle, { 
                  color: isDarkMode ? colors.textSecondary : figmaColors.textDark, 
                  fontSize: scaledSize(16),
                  fontWeight: '400',
                  textAlign: 'center',
                  marginBottom: 0,
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
              <NameInput
                label={t('Full Name')}
                value={name}
                onChangeText={setName}
                placeholder={t('Enter your full name')}
                selectionColor={isDarkMode ? colors.primary : figmaColors.primaryBlue}
                onFocus={handleFieldFocus('name')}
                onBlur={handleFieldBlur('name')}
                style={styles.tightInputSpacing}
              />
              {focusedField === 'name' && (
                <View style={[styles.validationHintGroup, { alignItems: alignment }]}>
                  <ValidationHintItem
                    passed={flags.nameValid}
                    label={t('signup.validation.name')}
                    isFirst
                  />
                </View>
              )}

              <PhoneInput
                label={t('Mobile Number')}
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder={t('auth.placeholders.phone')}
                autoCapitalize="none"
                maxLength={9}
                selectionColor={isDarkMode ? colors.primary : figmaColors.primaryBlue}
                onFocus={handleFieldFocus('phone')}
                onBlur={handleFieldBlur('phone')}
                style={styles.tightInputSpacing}
              />
              {focusedField === 'phone' && (
                <View style={[styles.validationHintGroup, { alignItems: alignment }]}>
                  <ValidationHintItem
                    passed={flags.phoneValid}
                    label={t('signup.validation.phone')}
                    isFirst
                  />
                </View>
              )}

              {/* Technician-Only Fields */}
              {selectedRole === 'technician' && (
                <>
                  <EmailInput
                    label={t('Email')}
                    value={email}
                    onChangeText={handleEmailChange}
                    placeholder={t('Enter your email')}
                    selectionColor={isDarkMode ? colors.primary : figmaColors.primaryBlue}
                    onFocus={handleFieldFocus('email')}
                    onBlur={handleFieldBlur('email')}
                    style={styles.tightInputSpacing}
                  />
                  {focusedField === 'email' && (
                    <View style={[styles.validationHintGroup, { alignItems: alignment }]}>
                      <ValidationHintItem
                        passed={flags.emailValid}
                        label={t('signup.validation.email')}
                        isFirst
                      />
                    </View>
                  )}

                  <TextAreaInput
                    label={t('Bio / Description')}
                    value={bio}
                    onChangeText={setBio}
                    placeholder={t('Enter your bio or description')}
                  />

                  <CustomTextInput
                    label={t('Address')}
                    value={address}
                    onChangeText={setAddress}
                    placeholder={t('Enter your address')}
                  />

                  {/* Region Selection - Multiple */}
                  <CustomPicker
                    label={t('Select Regions')}
                    value={selectedRegions.length > 0 ? `${selectedRegions.length} ${t('Regions Selected')}` : ''}
                    onPress={() => setShowRegionDropdown(true)}
                    placeholder={t('Select Regions')}
                    disabled={isLoadingRegions}
                  />
                  {isLoadingRegions && (
                    <View style={{ marginTop: -20, marginBottom: 8, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={isDarkMode ? colors.primary : figmaColors.primaryBlue} />
                    </View>
                  )}

                  {/* Show selected regions as chips */}
                  <SelectedChips
                    items={selectedRegions.map(region => ({
                      id: region.id,
                      label: i18n.language === 'ar' ? region.nameAr : region.nameEn,
                    }))}
                    onRemove={(id) => {
                      setSelectedRegions(selectedRegions.filter(r => r.id !== id));
                    }}
                  />

                  {/* Years of Experience - Dropdown */}
                  <CustomPicker
                    label={t('Years of Experience')}
                    value={yearsOfExperience ? `${yearsOfExperience} ${t('Years')}` : ''}
                    onPress={() => setShowExperienceDropdown(true)}
                    placeholder={t('Years of Experience')}
                  />

                  {/* Certificates Upload */}
                  <UploadButton
                    label={t('Upload Certificates (Optional)')}
                    value={certificates.length > 0 ? `${certificates.length} ${t('Certificate(s) Added')}` : ''}
                    onPress={pickCertificates}
                    placeholder={t('Upload Certificates (Optional)')}
                  />

                  {certificates.length > 0 && (
                    <View style={styles.certificatesContainer}>
                      {certificates.map((certUri, index) => (
                        <View key={index} style={styles.certificateItem}>
                          <Image source={{ uri: certUri }} style={styles.certificatePreview} />
                          <TouchableOpacity
                            style={styles.removeCertButton}
                            onPress={() => removeCertificate(index)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="close-circle" size={24} color={colors.error || '#F44336'} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              <PasswordInput
                label={t('Password')}
                value={password}
                onChangeText={handlePasswordChange}
                placeholder={t('auth.placeholders.password')}
                autoCapitalize="none"
                selectionColor={isDarkMode ? colors.primary : figmaColors.primaryBlue}
                onFocus={handleFieldFocus('password')}
                onBlur={handleFieldBlur('password')}
                style={styles.tightInputSpacing}
              />
              {focusedField === 'password' && (
                <View style={[styles.validationHintGroup, { alignItems: alignment }]}>
                  <ValidationHintItem
                    passed={flags.passwordRules.uppercase}
                    label={t('signup.validation.password.uppercase')}
                    isFirst
                  />
                  <ValidationHintItem
                    passed={flags.passwordRules.number}
                    label={t('signup.validation.password.number')}
                  />
                  <ValidationHintItem
                    passed={flags.passwordRules.special}
                    label={t('signup.validation.password.special')}
                  />
                  <ValidationHintItem
                    passed={flags.passwordRules.noSpaces}
                    label={t('signup.validation.password.spaces')}
                  />
                  <ValidationHintItem
                    passed={flags.passwordRules.noSequence}
                    label={t('signup.validation.password.sequence')}
                  />
                </View>
              )}

              <PasswordInput
                label={t('Re-Enter Password')}
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                placeholder={t('auth.placeholders.password')}
                autoCapitalize="none"
                selectionColor={isDarkMode ? colors.primary : figmaColors.primaryBlue}
                onFocus={handleFieldFocus('confirm')}
                onBlur={handleFieldBlur('confirm')}
                style={styles.tightInputSpacing}
              />
              {focusedField === 'confirm' && (
                <View style={[styles.validationHintGroup, { alignItems: alignment }]}>
                  <ValidationHintItem
                    passed={flags.confirmValid}
                    label={t('signup.validation.confirm')}
                    isFirst
                  />
                </View>
              )}

              {/* Terms and Conditions */}
              <CustomCheckbox
                checked={agreedToTerms}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                label={t('I agree to the')}
                linkText={t('Terms and Conditions')}
              />

              {/* Create Account Button - Figma Blue */}
              <Button
                mode="contained"
                onPress={handleSignup}
                disabled={isLoading}
                style={[styles.desktopRegisterButton, { 
                  backgroundColor: agreedToTerms 
                    ? (isDarkMode ? colors.primary : figmaColors.primaryBlue)
                    : '#9E9E9E',
                  borderRadius: 8,
                }]}
                contentStyle={[styles.desktopRegisterButtonContent, { paddingVertical: 12 }]}
                labelStyle={{ fontSize: scaledSize(UIFontSizes.buttonMedium), fontWeight: '600', color: '#FFFFFF', fontFamily: FontFamily.button }}
                loading={isLoading}
              >
                {t('Create Account')}
              </Button>

              {/* Login Link */}
              <View style={[
                styles.desktopLoginLink, 
                { 
                  marginTop: 8,
                  flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row',
                  gap: 8, // Add gap between text and link
                }
              ]}>
                <Text style={[styles.desktopLoginText, { 
                  color: isDarkMode ? colors.textSecondary : figmaColors.textNavy, 
                  fontSize: scaledSize(UIFontSizes.link),
                  fontWeight: '300',
                }]}>
                  {t('Already have an account?')}
                </Text>
                <TouchableOpacity onPress={onNavigateToLogin}>
                  <Text style={[styles.desktopLoginLinkText, { 
                    color: isDarkMode ? colors.primary : figmaColors.textNavy,
                    fontSize: scaledSize(UIFontSizes.link),
                    fontWeight: '600',
                    textDecorationLine: 'underline',
                  }]}>
                    {t('Login')}
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

      {/* Modals - Reuse existing modals */}
      <Modal
        visible={showRegionDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRegionDropdown(false)}
      >
        <View
          style={styles.modalOverlay}
          onTouchEnd={() => setShowRegionDropdown(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Select Regions')}</Text>
              <Button 
                mode="text" 
                onPress={() => setShowRegionDropdown(false)}
                icon="close"
              >
                {''}
              </Button>
            </View>
            <FlatList
              data={regions}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Button
                  mode="text"
                  style={[
                    styles.dropdownItem,
                    selectedRegions.some(r => r.id === item.id) && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    if (selectedRegions.some(r => r.id === item.id)) {
                      setSelectedRegions(selectedRegions.filter(r => r.id !== item.id));
                    } else {
                      setSelectedRegions([...selectedRegions, item]);
                    }
                  }}
                  contentStyle={styles.dropdownItemContent}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    selectedRegions.some(r => r.id === item.id) && styles.dropdownItemTextSelected,
                  ]}>
                    {i18n.language === 'ar' ? item.nameAr : item.nameEn}
                  </Text>
                  {selectedRegions.some(r => r.id === item.id) && (
                    <Ionicons name="checkmark" size={24} color={Colors.primary} />
                  )}
                </Button>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showExperienceDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExperienceDropdown(false)}
      >
        <View
          style={styles.modalOverlay}
          onTouchEnd={() => setShowExperienceDropdown(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Select Years of Experience')}</Text>
              <Button 
                mode="text" 
                onPress={() => setShowExperienceDropdown(false)}
                icon="close"
              >
                {''}
              </Button>
            </View>
            <FlatList
              data={experienceOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Button
                  mode="text"
                  style={[
                    styles.dropdownItem,
                    yearsOfExperience === item && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setYearsOfExperience(item);
                    setShowExperienceDropdown(false);
                  }}
                  contentStyle={styles.dropdownItemContent}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    yearsOfExperience === item && styles.dropdownItemTextSelected,
                  ]}>
                    {item} {t('Years')}
                  </Text>
                  {yearsOfExperience === item && (
                    <Ionicons name="checkmark" size={24} color={Colors.primary} />
                  )}
                </Button>
              )}
            />
          </View>
        </View>
      </Modal>
      
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
    paddingHorizontal: 24,
    paddingBottom: 20, // Extra padding inside wrapper
    ...Platform.select({
      web: {
        borderRadius: 20,
        paddingVertical: 40,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
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
  roleToggleWrapper: {
    marginTop: 0, // No extra margin from top
    ...Platform.select({
      web: {
        marginBottom: 28,
      },
      default: {
        marginBottom: 24,
      },
    }),
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
  mobileRegisterButton: {
    width: '100%',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  mobileRegisterButtonText: {
    color: '#FFFFFF',
    fontSize: UIFontSizes.buttonMedium, // Centralized: 18px
    fontWeight: '400',
    textAlign: 'center',
    fontFamily: FontFamily.button,
  },
  mobileLoginLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  mobileLoginLinkText: {
    fontSize: UIFontSizes.link, // Centralized: 16px
    fontWeight: '300',
    fontFamily: FontFamily.body,
  },
  mobileLoginLinkAction: {
    fontSize: UIFontSizes.link, // Centralized: 16px
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontFamily: FontFamily.body,
  },
  roleButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 3,
    ...Platform.select({
      web: {
        paddingVertical: 12,
      },
      default: {
        paddingVertical: 10, // Smaller on mobile
      },
    }),
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
  roleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  roleIcon: {
    fontSize: 18,
  },
  roleIconSvg: {
    width: 24,
    height: 24,
  } as any,
  roleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  roleTextActive: {
    color: '#FFFFFF',
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
  validationHintGroup: {
    marginTop: 4,
    marginBottom: 12,
  },
  validationHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validationHintText: {
    fontSize: 12,
    lineHeight: 16,
  },
  tightInputSpacing: {
    marginBottom: 4,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    minHeight: 100,
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  countryCode: {
    fontSize: 16,
    marginLeft: 8,
  },
  eyeIcon: {
    fontSize: 20,
    padding: 4,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkboxButton: {
    marginRight: 12,
  },
  checkbox: {
    fontSize: 24,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
  },
  termsLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  registerButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    marginBottom: 28,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(0, 128, 224, 0.4)',
      },
      default: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 6,
      },
    }),
  },
  registerButtonDisabled: {
    // Gray color is set inline, no need for opacity
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
    marginVertical: 24,
    position: 'relative',
  },
  loginText: {
    fontSize: 14,
    textAlign: 'center',
    ...Platform.select({
      web: {
        marginBottom: 20,
      },
      default: {
        marginBottom: 30, // Extra margin at bottom for mobile scrolling
      },
    }),
  },
  loginLink: {
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: '#FFF',
  },
  uploadButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 16,
    alignItems: 'center',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: '35%',
  },
  certificatesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  certificateItem: {
    position: 'relative',
    width: 100,
    height: 100,
    marginRight: 12,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  certificatePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  } as any,
  removeCertButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemSelected: {
    backgroundColor: Colors.primary + '10',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  dropdownItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  socialButtonContent: {
    paddingVertical: 8,
  },
  dropdownButton: {
    width: '100%',
  },
  dropdownButtonContent: {
    justifyContent: 'flex-start',
    paddingVertical: 8,
  },
  uploadButtonContent: {
    paddingVertical: 8,
  },
  registerButtonContent: {
    paddingVertical: 8,
  },
  roleButtonContent: {
    paddingVertical: 8,
  },
  dropdownItemContent: {
    justifyContent: 'flex-start',
    paddingVertical: 8,
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
    paddingHorizontal: 4,
  },
  langText: {
    fontSize: UIFontSizes.langToggle, // Centralized: 18px
    fontWeight: '600',
    fontFamily: FontFamily.primary,
  },
  langTextActive: {
    fontWeight: 'bold',
  },
  langSeparator: {
    fontSize: 16,
    marginHorizontal: 4,
  },
  selectedRegionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  regionChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectAllContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  selectAllButton: {
    flex: 1,
  },
  deselectAllButton: {
    flex: 1,
  },
  selectAllButtonContent: {
    paddingVertical: 4,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  doneButton: {
    backgroundColor: Colors.primary,
  },
  doneButtonContent: {
    paddingVertical: 8,
  },
  // Desktop Layout Styles (same as LoginScreen)
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
    paddingLeft: 120, // Push content more to the right
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
    maxWidth: 700,
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
    ...Platform.select({
      web: {
        transition: 'all 0.3s ease' as any,
      },
    }),
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
  desktopTextArea: {
    minHeight: 120,
  },
  desktopDropdownButton: {
    borderRadius: 12,
    borderWidth: 1,
  },
  desktopDropdownButtonContent: {
    paddingVertical: 14,
  },
  desktopSelectedRegionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  desktopRegionChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  desktopUploadButton: {
    borderRadius: 12,
    borderWidth: 1,
  },
  desktopUploadButtonContent: {
    paddingVertical: 14,
  },
  desktopTermsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  desktopCheckboxButton: {
    margin: 0,
    padding: 0,
  },
  desktopTermsText: {
    fontSize: 15,
    flex: 1,
  },
  desktopTermsLink: {
    fontWeight: '600',
  },
  desktopRegisterButton: {
    borderRadius: 12,
    marginBottom: 32,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(0, 128, 224, 0.4)' as any,
      },
    }),
  },
  desktopRegisterButtonDisabled: {
    // Gray color is set inline, no need for opacity
  },
  desktopRegisterButtonContent: {
    paddingVertical: 14,
  },
  desktopLoginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopLoginText: {
    fontSize: UIFontSizes.desktop.linkText, // Centralized: 24px
    fontFamily: FontFamily.body,
  },
  desktopLoginLinkText: {
    fontSize: UIFontSizes.desktop.linkText, // Centralized: 24px
    fontWeight: '600',
    fontFamily: FontFamily.body,
  },
});

