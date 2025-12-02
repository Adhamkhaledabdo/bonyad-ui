import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  I18nManager,
  Modal,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { 
  Button, 
  Input, 
  Text as TamaguiText, 
  YStack, 
  XStack, 
  Card, 
  Separator,
  H2,
  H3,
  Paragraph,
  Switch,
  Label
} from 'tamagui';
import { Colors } from '../constants/Colors';
import { useFCMToken } from '../utils/useFCMToken';
import { ThemeToggle } from '../components/ThemeToggle';
import * as ImagePicker from 'expo-image-picker';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';

// 📝 SIGNUP SCREEN: Based on Signup.swift from iOS app
export default function SignupScreen({ 
  onNavigateToLogin,
  onNavigateToOTP
}: { 
  onNavigateToLogin: () => void;
  onNavigateToOTP: (phone: string, role: 'user' | 'technician') => void;
}) {
  const { t, i18n } = useTranslation();
  const fcmToken = useFCMToken(); // Get real FCM token
  
  // Toggle language and RTL
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    
    // Enable/disable RTL based on language
    if (Platform.OS !== 'web') {
      const isRTL = newLang === 'ar';
      if (I18nManager.isRTL !== isRTL) {
        I18nManager.forceRTL(isRTL);
        Alert.alert(
          t('Language Changed'),
          t('Please restart the app for the change to take full effect'),
          [{ text: 'OK' }]
        );
      }
    }
  };
  
  // Set RTL direction on mount based on current language
  useEffect(() => {
    if (Platform.OS !== 'web') {
      const isRTL = i18n.language === 'ar';
      if (I18nManager.isRTL !== isRTL) {
        I18nManager.forceRTL(isRTL);
      }
    }
  }, []);

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
      console.log('📥 Regions Response Headers:', response.headers);
      
      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error Response Body:', errorText);
        return;
      }
      
      const data = await response.json();
      console.log('📥 Regions Data:', JSON.stringify(data, null, 2));
      
      if (Array.isArray(data)) {
        setRegions(data);
        // Set first region as default
        if (data.length > 0) {
          setSelectedRegion(data[0]);
          console.log(`✅ Default region set: ${data[0].nameEn} (ID: ${data[0].id})`);
        }
        console.log(`✅ Loaded ${data.length} regions`);
      } else {
        console.error('❌ Failed to fetch regions - not an array');
        console.error('   Data type:', typeof data);
        console.error('   Data:', data);
        
        // Fallback: Use sample regions if API fails
        const fallbackRegions = [
          { id: 1, nameAr: "الرياض", nameEn: "Riyadh" },
          { id: 2, nameAr: "جدة", nameEn: "Jeddah" },
          { id: 3, nameAr: "الدمام", nameEn: "Dammam" }
        ];
        console.log('🔄 Using fallback regions:', fallbackRegions);
        setRegions(fallbackRegions);
        setSelectedRegion(fallbackRegions[0]);
      }
    } catch (error) {
      console.error('❌ Error fetching regions:', error);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
      
      // Fallback: Use sample regions if API fails
      const fallbackRegions = [
        { id: 1, nameAr: "الرياض", nameEn: "Riyadh" },
        { id: 2, nameAr: "جدة", nameEn: "Jeddah" },
        { id: 3, nameAr: "الدمام", nameEn: "Dammam" }
      ];
      console.log('🔄 Using fallback regions due to error:', fallbackRegions);
      setRegions(fallbackRegions);
      setSelectedRegion(fallbackRegions[0]);
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Technician-only fields
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('1');
  const [showExperienceDropdown, setShowExperienceDropdown] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [regions, setRegions] = useState<any[]>([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  
  // Image states for technician
  const [certificates, setCertificates] = useState<string[]>([]);
  
  // Terms and conditions
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  
  // Years of experience options (1-10)
  const experienceOptions = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

  // 📷 PICK CERTIFICATES
  const pickCertificates = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(t('Error'), t('auth.errors.galleryPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newCerts = result.assets.map(asset => asset.uri);
      setCertificates([...certificates, ...newCerts]);
      console.log(`✅ Added ${newCerts.length} certificate(s)`);
    }
  };

  // 🗑️ REMOVE CERTIFICATE
  const removeCertificate = (index: number) => {
    const newCerts = certificates.filter((_, i) => i !== index);
    setCertificates(newCerts);
  };

  // 📝 SIGNUP FUNCTION
  const handleSignup = async () => {
    // Validation
    if (!phone || !name || !password || !confirmPassword) {
      Alert.alert('Error', t('missing_fields'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', t('passwords_not_matching'));
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', t('password_too_short'));
      return;
    }

    // Technician-specific validation
    if (selectedRole === 'technician' && !email) {
      Alert.alert('Error', t('Email is required for technicians'));
      return;
    }

    if (!agreedToTerms) {
      Alert.alert('Error', t('terms_required'));
      return;
    }

    setIsLoading(true);

    try {
      // Format phone - 9 digits only (remove country code)
      let formattedPhone = phone.trim();
      if (formattedPhone.startsWith('+966')) {
        formattedPhone = formattedPhone.substring(4);
      } else if (formattedPhone.startsWith('966')) {
        formattedPhone = formattedPhone.substring(3);
      } else if (formattedPhone.startsWith('0')) {
        formattedPhone = formattedPhone.substring(1);
      }

      console.log('📱 Formatted Phone: ' + formattedPhone);

      if (selectedRole === 'user') {
        // 👤 USER REGISTRATION
        await signupUser(formattedPhone);
      } else {
        // 💼 TECHNICIAN REGISTRATION
        await signupTechnician(formattedPhone);
      }
    } catch (error) {
      console.error('❌ Signup error:', error);
      Alert.alert('Error', t('network_error'));
      setIsLoading(false);
    }
  };

  // 👤 USER SIGNUP (JSON)
  const signupUser = async (formattedPhone: string) => {
    const apiURL = buildApiUrl(API_ENDPOINTS.AUTH.REGISTER);
    
    console.log('📤 USER Signup Request:');
    console.log('   API: ' + apiURL);
    console.log('   Phone: ' + formattedPhone);
    console.log('   Name: ' + name);
    console.log('   Role: USER');

    // Create JSON body for user registration
    const requestBody: any = {
      name: name,
      phoneNumber: formattedPhone,
      password: password,
      role: 'USER',
    };

    if (email) {
      requestBody.email = email;
    }

    console.log('📦 Request Body:', requestBody);

    const response = await fetch(apiURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('📥 USER Signup Response:', data);

    if (response.ok) {
      console.log('✅ USER signup successful!');
      setIsLoading(false);
      onNavigateToOTP(formattedPhone, 'user');
    } else {
      setIsLoading(false);
      const message = data.message || t('validation_failed');
      Alert.alert('Error', message);
    }
  };

  // 💼 TECHNICIAN SIGNUP WITH FILES
  const signupTechnician = async (formattedPhone: string) => {
    const apiURL = buildApiUrl(API_ENDPOINTS.AUTH.REGISTER_WITH_FILES);
    
    console.log('📤 TECHNICIAN Signup Request:');
    console.log('   API: ' + apiURL);
    console.log('   Phone: ' + formattedPhone);
    console.log('   Name: ' + name);
    console.log('   Email: ' + email);
    console.log('   Role: TECHNICIAN');
    console.log('   Years of Experience: ' + yearsOfExperience);
    console.log('   Certificates: ' + certificates.length);

    // Create multipart form data
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phoneNumber', formattedPhone);
    formData.append('password', password);
    formData.append('role', 'TECHNICIAN');
    formData.append('regionId', selectedRegion?.id?.toString() || '1'); // Use selected region or default
    formData.append('yearsOfExperience', yearsOfExperience);
    formData.append('description', bio || 'Service provider');
    
    console.log('📍 Region: ' + (selectedRegion ? `${selectedRegion.nameEn} (ID: ${selectedRegion.id})` : 'Default'));

    // Add certificates if selected
    if (certificates.length > 0) {
      certificates.forEach((certUri, index) => {
        const certData: any = {
          uri: certUri,
          type: 'image/jpeg',
          name: `certificate_${index + 1}.jpg`,
        };
        formData.append('certificates', certData);
      });
      console.log(`✅ Added ${certificates.length} certificate(s) to form`);
    }

    const response = await fetch(apiURL, {
      method: 'POST',
      body: formData as any,
    });

    const data = await response.json();
    console.log('📥 TECHNICIAN Signup Response:', data);

    if (response.ok) {
      console.log('✅ TECHNICIAN signup successful!');
      setIsLoading(false);
      onNavigateToOTP(formattedPhone, 'technician');
    } else {
      setIsLoading(false);
      const message = data.message || t('validation_failed');
      Alert.alert('Error', message);
    }
  };

  // 🔹 SOCIAL SIGNUP PLACEHOLDERS
  const handleGoogleSignup = () => {
    Alert.alert(t('Coming Soon'), 'Google Sign-Up');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.contentWrapper}>
        {/* Header */}
        <View style={styles.header}>
          {/* Language Toggle with Globe Icon */}
          <TouchableOpacity style={styles.languageToggle} onPress={toggleLanguage}>
            <Ionicons name="globe-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.languageText}>{i18n.language === 'en' ? 'AR' : 'EN'}</Text>
          </TouchableOpacity>
          
          <Image
            source={require('../../assets/bonyad-logo.svg')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.welcomeTitle}>{t('Create Account')}</Text>
          <Text style={styles.welcomeSubtitle}>{t('Sign up to get started')}</Text>
        </View>

      {/* Role Toggle (User / Technician) */}
      <View style={styles.roleToggleContainer}>
        <TouchableOpacity
          style={[
            styles.roleButton,
            selectedRole === 'user' && styles.roleButtonActive,
          ]}
          onPress={() => setSelectedRole('user')}
        >
          <View style={styles.roleIconContainer}>
            <Image
              source={require('../../assets/user.svg')}
              style={styles.roleIconSvg}
              contentFit="contain"
            />
          </View>
          <Text
            style={[
              styles.roleText,
              selectedRole === 'user' && styles.roleTextActive,
            ]}
          >
            {t('Customer')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleButton,
            selectedRole === 'technician' && styles.roleButtonActive,
          ]}
          onPress={() => setSelectedRole('technician')}
        >
          <View style={styles.roleIconContainer}>
            <Image
              source={require('../../assets/serviceprovider.svg')}
              style={styles.roleIconSvg}
              contentFit="contain"
            />
          </View>
          <Text
            style={[
              styles.roleText,
              selectedRole === 'technician' && styles.roleTextActive,
            ]}
          >
            {t('Specialized')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Phone Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={t('Mobile number')}
          placeholderTextColor="#999"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
        <Text style={styles.countryCode}>| 966</Text>
      </View>

      {/* Name Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={t('Full Name')}
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      </View>

      {/* Technician-Only Fields */}
      {selectedRole === 'technician' && (
        <>
          {/* Email */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('Email')}
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Bio */}
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('Bio / Description')}
              placeholderTextColor="#999"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Address */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('Address')}
              placeholderTextColor="#999"
              value={address}
              onChangeText={setAddress}
            />
          </View>

          {/* Region Selection - Dropdown */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => {
              console.log('📍 Region dropdown clicked');
              console.log('   Available regions:', regions.length);
              console.log('   Regions:', regions.map(r => r.nameEn).join(', '));
              setShowRegionDropdown(true);
            }}
          >
            <Text style={[styles.input, { color: selectedRegion ? '#1A1A1A' : '#999' }]}>
              {selectedRegion 
                ? (i18n.language === 'ar' ? selectedRegion.nameAr : selectedRegion.nameEn)
                : t('Select Region')}
            </Text>
            {isLoadingRegions ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : regions.length === 0 ? (
              <TouchableOpacity onPress={fetchRegions}>
                <Ionicons name="refresh" size={20} color={Colors.primary} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-down" size={20} color="#666" />
            )}
          </TouchableOpacity>

          {/* Years of Experience - Dropdown */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowExperienceDropdown(true)}
          >
            <Text style={[styles.input, { color: yearsOfExperience ? '#1A1A1A' : '#999' }]}>
              {yearsOfExperience ? `${yearsOfExperience} ${t('Years')}` : t('Years of Experience')}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {/* Certificates Upload */}
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickCertificates}
          >
            <Ionicons name="document" size={24} color={Colors.primary} />
            <Text style={styles.uploadButtonText}>
              {certificates.length > 0 
                ? `${certificates.length} ${t('Certificate(s) Added')}` 
                : t('Upload Certificates (Optional)')}
            </Text>
          </TouchableOpacity>

          {certificates.length > 0 && (
            <View style={styles.certificatesContainer}>
              {certificates.map((certUri, index) => (
                <View key={index} style={styles.certificateItem}>
                  <Image source={{ uri: certUri }} style={styles.certificatePreview} />
                  <TouchableOpacity
                    style={styles.removeCertButton}
                    onPress={() => removeCertificate(index)}
                  >
                    <Ionicons name="close-circle" size={20} color="#F44336" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Region Dropdown Modal */}
      <Modal
        visible={showRegionDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRegionDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            console.log('📍 Closing region dropdown');
            setShowRegionDropdown(false);
          }}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Select Region')}</Text>
              <TouchableOpacity onPress={() => setShowRegionDropdown(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
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
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      selectedRegion?.id === item.id && styles.dropdownItemSelected,
                    ]}
                    onPress={() => {
                      console.log(`📍 Selected region: ${item.nameEn} (ID: ${item.id})`);
                      setSelectedRegion(item);
                      setShowRegionDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      selectedRegion?.id === item.id && styles.dropdownItemTextSelected,
                    ]}>
                      {i18n.language === 'ar' ? item.nameAr : item.nameEn}
                    </Text>
                    {selectedRegion?.id === item.id && (
                      <Ionicons name="checkmark" size={24} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Experience Dropdown Modal */}
      <Modal
        visible={showExperienceDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExperienceDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowExperienceDropdown(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Select Years of Experience')}</Text>
              <TouchableOpacity onPress={() => setShowExperienceDropdown(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={experienceOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    yearsOfExperience === item && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setYearsOfExperience(item);
                    setShowExperienceDropdown(false);
                  }}
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
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Password Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder={t('Password')}
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Confirm Password Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder={t('Confirm Password')}
          placeholderTextColor="#999"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
          <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Terms and Conditions */}
      <View style={styles.termsContainer}>
        <TouchableOpacity
          style={styles.checkboxButton}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
        >
          <Text style={styles.checkbox}>{agreedToTerms ? '☑️' : '⬜'}</Text>
        </TouchableOpacity>
        <Text style={styles.termsText}>
          {t('I agree to the')}{' '}
          <Text style={styles.termsLink}>{t('Terms and Conditions')}</Text>
        </Text>
      </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[
            styles.registerButton,
            (!agreedToTerms || isLoading) && styles.registerButtonDisabled,
          ]}
          onPress={handleSignup}
          disabled={!agreedToTerms || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.registerButtonText}>{t('Create Account')}</Text>
          )}
        </TouchableOpacity>

        {/* Social Signup */}
        <Text style={styles.orText}>{t('Or sign up with')}</Text>

        <View style={styles.socialContainer}>
          <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignup}>
            <Text style={styles.socialIcon}>G</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.socialButton} 
            onPress={() => Alert.alert(t('Coming Soon'), 'Twitter signup')}
          >
            <Text style={styles.socialIcon}>𝕏</Text>
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <TouchableOpacity onPress={onNavigateToLogin}>
          <Text style={styles.loginText}>
            {t('Already have an account?')}{' '}
            <Text style={styles.loginLink}>{t('Login')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 40,
    ...Platform.select({
      web: {
        justifyContent: 'center',
      },
    }),
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 450,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  languageToggle: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  logo: {
    width: 150,
    height: 60,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  roleToggleContainer: {
    flexDirection: 'row',
    padding: 4,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 15,
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  roleButtonActive: {
    backgroundColor: Colors.primary,
  },
  roleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  roleIcon: {
    fontSize: 18,
  },
  roleIconSvg: {
    width: 24,
    height: 24,
  },
  roleText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  roleTextActive: {
    color: '#FFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 12 : 8,
    marginBottom: 16,
    backgroundColor: '#FFF',
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    minHeight: 100,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 4,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  countryCode: {
    fontSize: 16,
    color: '#666',
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
    color: '#666',
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  registerButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 128, 224, 0.3)',
      },
      default: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 5,
      },
    }),
  },
  registerButtonDisabled: {
    opacity: 0.5,
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 128, 224, 0.3)',
      },
      default: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  socialIcon: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold',
  },
  loginText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  loginLink: {
    color: Colors.primary,
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
    width: 80,
    height: 80,
  },
  certificatePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  removeCertButton: {
    position: 'absolute',
    top: -6,
    right: -6,
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
});

