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
import { requestPhoneChange } from '../services/ProfileService';
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

interface ChangePhoneScreenProps {
  onBack: () => void;
  onOTPSent?: (newPhoneNumber: string) => void;
}

interface UserProfile {
  name?: string;
  phone?: string;
  phoneNumber?: string;
  avatar?: string;
  profileImage?: string;
}

export default function ChangePhoneScreen({ onBack, onOTPSent }: ChangePhoneScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const isRTL = i18n.language === 'ar';
  
  const { alertState, showAlert, showError, hideAlert } = useAlertPopup();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentPhone, setCurrentPhone] = useState('');
  const [newPhone, setNewPhone] = useState('');
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
        setCurrentPhone(data.phoneNumber || data.phone || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleRequestChange = async () => {
    if (!newPhone.trim()) {
      showError(t('Please enter a new phone number'));
      return;
    }
    
    if (newPhone === currentPhone) {
      showError(t('New phone number must be different'));
      return;
    }
    
    // Format phone (9 digits)
    let formatted = newPhone.trim();
    if (formatted.startsWith('0')) {
      formatted = formatted.substring(1);
    }
    if (formatted.startsWith('+966')) {
      formatted = formatted.substring(4);
    }
    if (formatted.startsWith('966')) {
      formatted = formatted.substring(3);
    }
    
    if (formatted.length !== 9) {
      showError(t('Phone number must be 9 digits'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await requestPhoneChange(formatted);
      
      showAlert(t('Success'), result.message, 'success', [
        {
          text: t('OK'),
          onPress: () => {
            if (onOTPSent) {
              onOTPSent(formatted);
            }
          }
        }
      ]);
      
    } catch (error: any) {
      showError(error.message || t('Failed to send OTP'));
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
          {t('Change Phone Number')}
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
          {/* Confirm Old Number */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
              {t('Confirm old number')}:
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBgColor, borderColor: inputBorderColor }]}>
              <TextInput
                style={[styles.input, { color: inputTextColor }, isRTL && styles.textRTL]}
                value={currentPhone}
                editable={false}
                placeholderTextColor={isDarkMode ? '#888888' : '#999999'}
              />
            </View>
          </View>

          {/* New Number */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor, fontSize: scaledSize(14) }, isRTL && styles.textRTL]}>
              {t('New Number')}:
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBgColor, borderColor: inputBorderColor }]}>
                <TextInput
                style={[styles.input, { color: inputTextColor }, isRTL && styles.textRTL]}
                  value={newPhone}
                  onChangeText={setNewPhone}
                placeholder="5XXXXXXXX"
                placeholderTextColor={isDarkMode ? '#888888' : '#999999'}
                keyboardType="phone-pad"
                  maxLength={9}
                />
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
            onPress={handleRequestChange}
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
