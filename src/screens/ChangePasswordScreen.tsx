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
import { changePassword } from '../services/ProfileService';
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

interface ChangePasswordScreenProps {
  onBack: () => void;
}

interface UserProfile {
  name?: string;
  avatar?: string;
  profileImage?: string;
}

export default function ChangePasswordScreen({ onBack }: ChangePasswordScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const isRTL = i18n.language === 'ar';
  
  const { alertState, showAlert, showError, hideAlert } = useAlertPopup();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        setIsFetching(false);
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
      setIsFetching(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      showError(t('All fields are required'));
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showError(t('New passwords do not match'));
      return;
    }
    
    if (newPassword.length < 6) {
      showError(t('New password must be at least 6 characters'));
      return;
    }
    
    if (oldPassword === newPassword) {
      showError(t('New password must be different from current password'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await changePassword(oldPassword, newPassword);
      
      showAlert(t('Success'), result.message, 'success', [
        {
          text: t('OK'),
          onPress: () => {
            // Clear fields
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            
            // Go back to profile
            onBack();
          }
        }
      ]);
      
    } catch (error: any) {
      showError(error.message || t('Failed to change password'));
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
  const primaryColor = isDarkMode ? colors.primary : FIGMA_COLORS.primary;
  const dividerColor = isDarkMode ? colors.border : FIGMA_COLORS.divider;
  const avatarBgColor = isDarkMode ? colors.surface : FIGMA_COLORS.primaryLight;

  if (isFetching) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bgColor, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

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
          {t('Change Password')}
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
          <View style={[styles.avatarContainer, { backgroundColor: avatarBgColor }]}>
            {userProfile?.avatar ? (
              <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={50} color={primaryColor} />
            )}
          </View>
          <Text style={[styles.userName, { color: headerTextColor, fontSize: scaledSize(18) }]}>
            {userProfile?.name || t('profile.usernamePlaceholder')}
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Enter Current Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
              {t('Enter Current Password')}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBgColor, borderColor: inputBorderColor }]}>
                <TextInput
                style={[styles.input, { color: inputTextColor }, isRTL && styles.textRTL]}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  placeholder={t('Enter current password')}
                placeholderTextColor={isDarkMode ? '#888888' : '#999999'}
                  secureTextEntry={!showOldPassword}
                />
              <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showOldPassword ? 'eye-off' : 'eye'}
                    size={20}
                  color={isDarkMode ? '#888888' : FIGMA_COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
          </View>

          {/* Enter New Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
              {t('Enter New Password')}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBgColor, borderColor: inputBorderColor }]}>
                <TextInput
                style={[styles.input, { color: inputTextColor }, isRTL && styles.textRTL]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('Enter new password')}
                placeholderTextColor={isDarkMode ? '#888888' : '#999999'}
                  secureTextEntry={!showNewPassword}
                />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showNewPassword ? 'eye-off' : 'eye'}
                    size={20}
                  color={isDarkMode ? '#888888' : FIGMA_COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
          </View>

          {/* Re-Enter New Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
              {t('Re-Enter New Password')}
              </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBgColor, borderColor: inputBorderColor }]}>
                <TextInput
                style={[styles.input, { color: inputTextColor }, isRTL && styles.textRTL]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('Confirm new password')}
                placeholderTextColor={isDarkMode ? '#888888' : '#999999'}
                  secureTextEntry={!showConfirmPassword}
                />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                  color={isDarkMode ? '#888888' : FIGMA_COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
          </View>
        </View>

        {/* Save Button */}
          <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: primaryColor },
            isLoading && styles.buttonDisabled,
          ]}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
            <Text style={styles.saveButtonText}>{t('Save')}</Text>
            )}
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderRadius: 8,
    height: 43,
    paddingHorizontal: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '300',
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
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
