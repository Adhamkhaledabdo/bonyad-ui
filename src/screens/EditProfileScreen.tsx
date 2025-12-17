import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { storage } from '../utils/storage';
import { API_BASE_URL, API_ENDPOINTS, buildApiUrl } from '../config/api';
import * as ImagePicker from 'expo-image-picker';
import { getUserProfile, uploadProfileImage } from '../services/ProfileService';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

// Figma Design Colors
const FIGMA_COLORS = {
  primary: '#005DAC',
  primaryDark: '#003867',
  primaryLight: '#E6EFF7',
  inputBorder: '#80AED6',
  inputBackground: '#F0F0F0',
  textHeader: '#003867',
  textBody: '#2D2D2D',
  textSecondary: '#6E6E6E',
  white: '#FFFFFF',
  divider: '#D9D9D9',
};

interface EditProfileScreenProps {
  userDetails: any;
  onBack: () => void;
  onSave: () => void;
}

export default function EditProfileScreen({ userDetails, onBack, onSave }: EditProfileScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const isRTL = i18n.language === 'ar';
  
  // Custom alert hook
  const { alertState, showSuccess, showError, showAlert, hideAlert } = useAlertPopup();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [selectedImageAsset, setSelectedImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const profile = await getUserProfile();
      
      // Split name into first and last name
      const fullName = profile.name || '';
      const nameParts = fullName.split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      
      setEmail(profile.email || '');
      setPhone(profile.phone || profile.phoneNumber || '');
      
      const imagePath = profile.profileImage || profile.avatar || null;
      if (imagePath) {
        if (!imagePath.startsWith('http')) {
          setProfileImage(`${API_BASE_URL.replace('/api', '')}${imagePath}`);
        } else {
          setProfileImage(imagePath);
        }
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      showError(error.message || t('Failed to load profile'), t('Error'));
    }
  };

  const handleSelectImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        showError(t('Please grant permission to access your photos'), t('Permission Required'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImageAsset(asset);
        setProfileImage(asset.uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      showError(error.message || t('Failed to select image'), t('Error'));
    }
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const token = await storage.getAuthToken();
      const userId = await storage.getUserId();

      if (!token || !userId) {
        showError(t('No authentication token found'), t('Error'));
        setIsLoading(false);
        return;
      }

      // Combine first and last name
      const fullName = `${firstName} ${lastName}`.trim();

      // Update profile data
      const updateResponse = await fetch(
        buildApiUrl(API_ENDPOINTS.USER.UPDATE_PROFILE),
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: fullName,
            email,
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error('Failed to update profile');
      }

      // Upload profile image if a new one was selected
      if (selectedImageAsset) {
        try {
          const uploadResult = await uploadProfileImage(selectedImageAsset);
          setProfileImage(uploadResult.profileImage);
          setSelectedImageAsset(null);
        } catch (uploadError: any) {
          console.error('Error uploading image:', uploadError);
          showError(uploadError.message || t('Failed to upload image'), t('Error'));
          setIsLoading(false);
          return;
        }
      }
      
      showAlert(t('Success'), t('Profile updated successfully'), 'success', [
        { text: t('OK'), onPress: onSave },
      ]);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showError(error.message || t('Failed to update profile'), t('Error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Theme-aware colors
  const bgColor = isDarkMode ? colors.background : FIGMA_COLORS.white;
  const textColor = isDarkMode ? colors.text : FIGMA_COLORS.textBody;
  const headerTextColor = isDarkMode ? colors.text : FIGMA_COLORS.primaryDark;
  const inputBgColor = isDarkMode ? colors.cardBackground : FIGMA_COLORS.inputBackground;
  const inputBorderColor = isDarkMode ? colors.border : FIGMA_COLORS.inputBorder;
  const inputTextColor = isDarkMode ? colors.text : FIGMA_COLORS.primaryDark;
  const disabledInputBgColor = isDarkMode ? colors.surface : '#F5F5F5';
  const disabledTextColor = isDarkMode ? colors.textSecondary : FIGMA_COLORS.textSecondary;
  const primaryColor = isDarkMode ? colors.primary : FIGMA_COLORS.primary;
  const dividerColor = isDarkMode ? colors.border : FIGMA_COLORS.divider;
  const avatarBgColor = isDarkMode ? colors.surface : FIGMA_COLORS.primaryLight;

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.headerRow, isRTL && styles.rowRTL]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons
            name={isRTL ? 'chevron-forward' : 'chevron-back'}
            size={24}
            color={headerTextColor}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: headerTextColor, fontSize: scaledSize(18) }]}>
          {t('Edit Profile Information')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + 24 }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* User Avatar Section */}
        <View style={styles.userSection}>
            <TouchableOpacity
            style={[styles.avatarContainer, { backgroundColor: avatarBgColor }]}
            onPress={handleSelectImage}
            disabled={isUploadingImage}
            >
              {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
              ) : (
                  <Ionicons name="person" size={50} color={primaryColor} />
              )}
                <View style={[styles.cameraOverlay, { backgroundColor: primaryColor }]}>
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={18} color="#fff" />
                  )}
                </View>
            </TouchableOpacity>
          <Text style={[styles.userName, { color: headerTextColor, fontSize: scaledSize(18) }]}>
            {`${firstName} ${lastName}`.trim() || t('profile.usernamePlaceholder')}
          </Text>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* Form Fields */}
          <View style={styles.formSection}>
          {/* First Name */}
            <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
              {t('First Name')}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBgColor, borderColor: inputBorderColor }]}>
                <TextInput
                style={[styles.input, { color: inputTextColor }, isRTL && styles.textRTL]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t('Enter your first name')}
                placeholderTextColor={isDarkMode ? '#888888' : '#999999'}
                  autoCapitalize="words"
                />
              </View>
            </View>

          {/* Last Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
              {t('Last Name')}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBgColor, borderColor: inputBorderColor }]}>
              <TextInput
                style={[styles.input, { color: inputTextColor }, isRTL && styles.textRTL]}
                value={lastName}
                onChangeText={setLastName}
                placeholder={t('Enter your last name')}
                placeholderTextColor={isDarkMode ? '#888888' : '#999999'}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email */}
            <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
              {t('Email')}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBgColor, borderColor: inputBorderColor }]}>
                <TextInput
                style={[styles.input, { color: inputTextColor }, isRTL && styles.textRTL]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('Enter your email')}
                placeholderTextColor={isDarkMode ? '#888888' : '#999999'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
            </View>
              </View>

          {/* Phone Number (Disabled) */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor }, isRTL && styles.textRTL]}>
              {t('Phone Number')}
            </Text>
            <View style={[styles.inputWrapper, styles.disabledInputWrapper, { backgroundColor: disabledInputBgColor, borderColor: inputBorderColor }, isRTL && styles.rowRTL]}>
              {isRTL && <Ionicons name="lock-closed" size={16} color={disabledTextColor} style={styles.lockIcon} />}
              <TextInput
                style={[styles.input, styles.disabledInput, { color: disabledTextColor }, isRTL && styles.textRTL]}
                value={phone || t('Not available')}
                editable={false}
                placeholderTextColor={isDarkMode ? '#888888' : '#999999'}
              />
              {!isRTL && <Ionicons name="lock-closed" size={16} color={disabledTextColor} style={styles.lockIcon} />}
            </View>
            <Text style={[styles.helpText, { color: disabledTextColor }, isRTL && styles.textRTL]}>
              {t('Phone number is verified and cannot be edited. Use "Change Phone Number" option to update it.')}
            </Text>
          </View>
            </View>

        {/* Save Button */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
            { backgroundColor: primaryColor },
            isLoading && styles.buttonDisabled,
                ]}
                onPress={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>{t('Save')}</Text>
                )}
              </TouchableOpacity>
             <View style={{ height:20 }} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    gap: 32,
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 24,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  divider: {
    height: 0.5,
    width: '100%',
  },
  formSection: {
    gap: 12,
  },
  fieldGroup: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 0,
    height: 32,
    lineHeight: 32,
  },
  inputWrapper: {
    borderWidth: 0.5,
    borderRadius: 8,
    height: 43,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
    fontWeight: '300',
    paddingVertical: 0,
  },
  disabledInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.7,
  },
  disabledInput: {
    flex: 1,
  },
  lockIcon: {
    marginHorizontal: 8,
  },
  helpText: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
    fontStyle: 'italic',
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
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
});
