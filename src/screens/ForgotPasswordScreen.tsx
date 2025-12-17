import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { forgotPassword } from '../services/AuthService';
import { showAlert, showError } from '../utils/alert';
import AnimatedRoleToggle from '../components/AnimatedRoleToggle';
import { PhoneInput } from '../components/CustomInput';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onOTPSent: (phoneNumber: string, role: 'USER' | 'TECHNICIAN') => void;
}

// Helper to convert role format
const convertRole = (role: 'user' | 'technician'): 'USER' | 'TECHNICIAN' => {
  return role.toUpperCase() as 'USER' | 'TECHNICIAN';
};

export default function ForgotPasswordScreen({ onBack, onOTPSent }: ForgotPasswordScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  const shouldRenderMobile = Platform.OS !== 'web' || !IS_LARGE_WEB;

  const [selectedRole, setSelectedRole] = useState<'user' | 'technician'>('user');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const formatPhoneNumber = (text: string): string => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');
    return digits;
  };

  const handleSubmit = async () => {
    if (!phone.trim()) {
      showError(t('Please enter your phone number'));
      return;
    }

    if (phone.length < 9) {
      showError(t('Please enter a valid phone number'));
      return;
    }

    setIsLoading(true);
    try {
      const roleUpper = convertRole(selectedRole);
      await forgotPassword(phone, roleUpper);
      showAlert(t('OTP sent successfully to your phone'));
      onOTPSent(phone, roleUpper);
    } catch (error: any) {
      showError(error.message || t('Failed to send OTP'));
    } finally {
      setIsLoading(false);
    }
  };

  if (shouldRenderMobile) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Image
              source={require('../../assets/bonyad-logo.svg')}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={[styles.title, { color: colors.text, fontSize: scaledSize(24) }]}>{t('Forgot Password?')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
              {t('Enter your phone number to receive OTP')}
            </Text>
          </View>

          {/* Role Toggle - Enhanced with Animation */}
          <View style={styles.roleToggleWrapper}>
            <AnimatedRoleToggle
              selectedRole={selectedRole}
              onRoleChange={(role) => setSelectedRole(role)}
            />
          </View>

          {/* Phone Input */}
          <PhoneInput
            label={t('Phone Number')}
            value={phone}
            onChangeText={(text) => setPhone(formatPhoneNumber(text))}
            placeholder={t('auth.placeholders.phone')}
          />

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={isLoading || !phone.trim()}
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            contentStyle={styles.submitButtonContent}
            loading={isLoading}
          >
            {t('Send OTP')}
          </Button>

          {/* Back to Login */}
          <Button
            mode="text"
            onPress={onBack}
            labelStyle={[styles.backToLoginText, { color: colors.textSecondary }]}
          >
            {t('Back to Login')}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Desktop layout
  return (
    <View style={[styles.desktopContainer, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.desktopScrollContent, { paddingTop: insets.top }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.desktopFormContainer, { backgroundColor: colors.cardBackground }]}>
          {/* Header */}
          <View style={styles.desktopHeader}>
            <TouchableOpacity onPress={onBack} style={styles.desktopBackButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Image
              source={require('../../assets/bonyad-logo.svg')}
              style={styles.desktopLogo}
              contentFit="contain"
            />
            <Text style={[styles.desktopTitle, { color: colors.text, fontSize: scaledSize(28) }]}>{t('Forgot Password?')}</Text>
            <Text style={[styles.desktopSubtitle, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
              {t('Enter your phone number to receive OTP')}
            </Text>
          </View>

          {/* Role Toggle - Enhanced with Animation */}
          <View style={styles.desktopRoleToggleWrapper}>
            <AnimatedRoleToggle
              selectedRole={selectedRole}
              onRoleChange={(role) => setSelectedRole(role)}
            />
          </View>

          {/* Phone Input */}
              <PhoneInput
                label={t('Phone Number')}
                value={phone}
                onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                placeholder={t('auth.placeholders.phone')}
          />

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={isLoading || !phone.trim()}
            style={[styles.desktopSubmitButton, { backgroundColor: colors.primary }]}
            contentStyle={styles.desktopSubmitButtonContent}
            loading={isLoading}
          >
            {t('Send OTP')}
          </Button>

          {/* Back to Login */}
          <Button
            mode="text"
            onPress={onBack}
            labelStyle={[styles.desktopBackToLoginText, { color: colors.textSecondary }]}
          >
            {t('Back to Login')}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 8,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  roleToggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
  },
  roleToggleWrapper: {
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    marginHorizontal: 2,
  },
  roleButtonContent: {
    paddingVertical: 8,
  },
  submitButton: {
    borderRadius: 12,
    marginBottom: 16,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  backToLoginText: {
    fontSize: 14,
  },
  // Desktop styles
  desktopContainer: {
    flex: 1,
  },
  desktopScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  desktopFormContainer: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 40,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      } as any,
    }),
  },
  desktopHeader: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  desktopBackButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 8,
  },
  desktopLogo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  desktopTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  desktopSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  desktopRoleToggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
    borderWidth: 1,
  },
  desktopRoleToggleWrapper: {
    marginBottom: 32,
  },
  desktopRoleButton: {
    flex: 1,
    marginHorizontal: 2,
  },
  desktopRoleButtonContent: {
    paddingVertical: 10,
  },
  desktopSubmitButton: {
    borderRadius: 12,
    marginBottom: 16,
  },
  desktopSubmitButtonContent: {
    paddingVertical: 12,
  },
  desktopBackToLoginText: {
    fontSize: 15,
  },
});

