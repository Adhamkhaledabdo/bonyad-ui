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
import { resetPassword } from '../services/AuthService';
import { showAlert, showError } from '../utils/alert';
import { PasswordInput } from '../components/CustomInput';

interface ResetPasswordScreenProps {
  phoneNumber: string;
  role: 'USER' | 'TECHNICIAN';
  otpCode: string;
  onBack: () => void;
  onPasswordReset: () => void;
}

export default function ResetPasswordScreen({ phoneNumber, role, otpCode, onBack, onPasswordReset }: ResetPasswordScreenProps) {
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

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    if (!newPassword.trim()) {
      showError(t('Please enter a new password'));
      return;
    }

    if (newPassword.length < 6) {
      showError(t('Password must be at least 6 characters'));
      return;
    }

    if (newPassword !== confirmPassword) {
      showError(t('Passwords do not match'));
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(phoneNumber, role, otpCode, newPassword, confirmPassword);
      showAlert(t('Password reset successfully'));
      onPasswordReset();
    } catch (error: any) {
      showError(error.message || t('Failed to reset password'));
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
            <Text style={[styles.title, { color: colors.text, fontSize: scaledSize(24) }]}>{t('Reset Password')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
              {t('Enter your new password')}
            </Text>
          </View>

          {/* New Password Input */}
          <PasswordInput
            label={t('New Password')}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t('Enter your new password')}
          />

          {/* Confirm Password Input */}
          <PasswordInput
            label={t('Confirm Password')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('Confirm your new password')}
          />

          {/* Reset Button */}
          <Button
            mode="contained"
            onPress={handleReset}
            disabled={isLoading || !newPassword.trim() || !confirmPassword.trim() || newPassword !== confirmPassword}
            style={[styles.resetButton, { backgroundColor: colors.primary }]}
            contentStyle={styles.resetButtonContent}
            loading={isLoading}
          >
            {t('Reset Password')}
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
            <Text style={[styles.desktopTitle, { color: colors.text, fontSize: scaledSize(28) }]}>{t('Reset Password')}</Text>
            <Text style={[styles.desktopSubtitle, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
              {t('Enter your new password')}
            </Text>
          </View>

          {/* New Password Input */}
          <PasswordInput
            label={t('New Password')}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t('Enter your new password')}
          />

          {/* Confirm Password Input */}
          <PasswordInput
            label={t('Confirm Password')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('Confirm your new password')}
          />

          {/* Reset Button */}
          <Button
            mode="contained"
            onPress={handleReset}
            disabled={isLoading || !newPassword.trim() || !confirmPassword.trim() || newPassword !== confirmPassword}
            style={[styles.desktopResetButton, { backgroundColor: colors.primary }]}
            contentStyle={styles.desktopResetButtonContent}
            loading={isLoading}
          >
            {t('Reset Password')}
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
  resetButton: {
    borderRadius: 12,
    marginBottom: 16,
  },
  resetButtonContent: {
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
  desktopResetButton: {
    borderRadius: 12,
    marginBottom: 16,
  },
  desktopResetButtonContent: {
    paddingVertical: 12,
  },
  desktopBackToLoginText: {
    fontSize: 15,
  },
});

