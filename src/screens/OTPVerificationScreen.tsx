import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Dimensions,
  TextInput as RNTextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { showAlert, showError } from '../utils/alert';

interface OTPVerificationScreenProps {
  phoneNumber: string;
  role: 'user' | 'technician';
  onVerificationSuccess: (token: string, userId: number, role: string) => void;
  onBack: () => void;
}

export default function OTPVerificationScreen({ phoneNumber, role, onVerificationSuccess, onBack }: OTPVerificationScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
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

  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(RNTextInput | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  useEffect(() => {
    // Auto-verify when all 4 digits are entered
    if (otp.every(digit => digit !== '') && otp.join('').length === 4) {
      const timer = setTimeout(() => {
        handleVerify();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [otp]);

  const handleOTPChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Handle paste
      const digits = text.replace(/\D/g, '').slice(0, 4);
      const newOtp = [...otp];
      digits.split('').forEach((digit, i) => {
        if (index + i < 4) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      // Focus last input
      if (inputRefs.current[Math.min(index + digits.length - 1, 3)]) {
        inputRefs.current[Math.min(index + digits.length - 1, 3)]?.focus();
      }
    } else {
      const newOtp = [...otp];
      newOtp[index] = text.replace(/\D/g, '');
      setOtp(newOtp);
      
      // Auto-focus next input
      if (text && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 4) {
      showError(t('Please enter the complete OTP code'));
      return;
    }

    setIsLoading(true);
    try {
      const url = buildApiUrl(API_ENDPOINTS.AUTH.VERIFY_OTP);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          role: role.toUpperCase(),
          otpCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('Invalid OTP code'));
      }

      const data = await response.json();
      await storage.saveAuthData(data.token, data.user.role, data.user.id, '');
      showAlert(t('Account verified successfully!'));
      onVerificationSuccess(data.token, data.user.id, data.user.role);
    } catch (error: any) {
      showError(error.message || t('Invalid OTP code'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    try {
      const url = buildApiUrl(API_ENDPOINTS.AUTH.RESEND_OTP);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          role: role.toUpperCase(),
        }),
      });

      if (!response.ok) {
        throw new Error(t('Failed to resend OTP'));
      }

      showAlert(t('OTP code sent successfully!'));
      setResendTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      showError(error.message || t('Failed to resend OTP'));
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
            <Text style={[styles.title, { color: colors.text }]}>{t('Enter Verification Code')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('We sent a code to')} {phoneNumber}
            </Text>
          </View>

          {/* OTP Inputs */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <RNTextInput
                key={index}
                ref={(ref) => {
                  if (ref) inputRefs.current[index] = ref;
                }}
                style={[styles.otpInput, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                value={digit}
                onChangeText={(text) => handleOTPChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Verify Button */}
          <Button
            mode="contained"
            onPress={handleVerify}
            disabled={otp.join('').length !== 4 || isLoading}
            style={[styles.verifyButton, { backgroundColor: colors.primary }]}
            contentStyle={styles.verifyButtonContent}
            loading={isLoading}
          >
            {isLoading ? t('Verifying...') : t('Verify')}
          </Button>

          {/* Resend OTP */}
          <View style={styles.resendContainer}>
            <Text style={[styles.resendText, { color: colors.textSecondary }]}>
              {t("Didn't receive code?")}
            </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={!canResend || isLoading}
              style={[styles.resendButton, !canResend && styles.resendButtonDisabled]}
            >
              <Text style={[styles.resendButtonText, { color: canResend ? colors.primary : colors.textTertiary }]}>
                {canResend ? t('Resend') : `${t('Resend code in')} ${resendTimer}s`}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Desktop layout - same as mobile for consistency
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
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
            <Text style={[styles.desktopTitle, { color: colors.text }]}>{t('Enter Verification Code')}</Text>
            <Text style={[styles.desktopSubtitle, { color: colors.textSecondary }]}>
              {t('We sent a code to')} {phoneNumber}
            </Text>
          </View>

          {/* OTP Inputs */}
          <View style={styles.desktopOtpContainer}>
            {otp.map((digit, index) => (
              <RNTextInput
                key={index}
                ref={(ref) => {
                  if (ref) inputRefs.current[index] = ref;
                }}
                style={[styles.desktopOtpInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={digit}
                onChangeText={(text) => handleOTPChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Verify Button */}
          <Button
            mode="contained"
            onPress={handleVerify}
            disabled={otp.join('').length !== 4 || isLoading}
            style={[styles.desktopVerifyButton, { backgroundColor: colors.primary }]}
            contentStyle={styles.desktopVerifyButtonContent}
            loading={isLoading}
          >
            {isLoading ? t('Verifying...') : t('Verify')}
          </Button>

          {/* Resend OTP */}
          <View style={styles.desktopResendContainer}>
            <Text style={[styles.desktopResendText, { color: colors.textSecondary }]}>
              {t("Didn't receive code?")}
            </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={!canResend || isLoading}
              style={[styles.desktopResendButton, !canResend && styles.desktopResendButtonDisabled]}
            >
              <Text style={[styles.desktopResendButtonText, { color: canResend ? colors.primary : colors.textTertiary }]}>
                {canResend ? t('Resend') : `${t('Resend code in')} ${resendTimer}s`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  otpInput: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    padding: 0,
    margin: 0,
  },
  verifyButton: {
    borderRadius: 12,
    marginBottom: 24,
  },
  verifyButtonContent: {
    paddingVertical: 8,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    marginBottom: 8,
  },
  resendButton: {
    padding: 8,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Desktop styles
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
  desktopOtpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    gap: 16,
  },
  desktopOtpInput: {
    width: 70,
    height: 70,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 28,
    fontWeight: 'bold',
  },
  desktopVerifyButton: {
    borderRadius: 12,
    marginBottom: 32,
  },
  desktopVerifyButtonContent: {
    paddingVertical: 12,
  },
  desktopResendContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  desktopResendText: {
    fontSize: 15,
    marginBottom: 8,
  },
  desktopResendButton: {
    padding: 8,
  },
  desktopResendButtonDisabled: {
    opacity: 0.5,
  },
  desktopResendButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
