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
import { Button, TextInput } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resendForgotPasswordOTP } from '../services/AuthService';
import { showAlert, showError } from '../utils/alert';

interface OTPVerificationScreenProps {
  phoneNumber: string;
  role: 'USER' | 'TECHNICIAN';
  onBack: () => void;
  onOTPVerified: (otpCode: string) => void;
}

export default function OTPVerificationScreen({ phoneNumber, role, onBack, onOTPVerified }: OTPVerificationScreenProps) {
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

  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(RNTextInput | null)[]>([]);
  const isVerifyingRef = useRef(false);
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Auto-verify when all 4 digits are entered
  useEffect(() => {
    const otpCode = otp.join('');
    if (otpCode.length === 4 && !isVerifyingRef.current && !hasVerifiedRef.current) {
      console.log('🔐 [ForgotPasswordOTPScreen] Auto-verifying OTP:', otpCode);
      isVerifyingRef.current = true;
      setIsVerifying(true);
      
      // Small delay to ensure all inputs are captured
      const timer = setTimeout(() => {
        try {
          console.log('🔐 [ForgotPasswordOTPScreen] Calling onOTPVerified with:', otpCode);
          onOTPVerified(otpCode);
          hasVerifiedRef.current = true;
        } catch (error) {
          console.error('❌ [ForgotPasswordOTPScreen] Error in onOTPVerified:', error);
          setIsVerifying(false);
          isVerifyingRef.current = false;
        }
      }, 200);
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
    // Reset verification state if user deletes a digit
    if (e.nativeEvent.key === 'Backspace' && (hasVerifiedRef.current || isVerifyingRef.current)) {
      hasVerifiedRef.current = false;
      isVerifyingRef.current = false;
      setIsVerifying(false);
    }
  };

  const handleVerify = () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 4) {
      return;
    }
    onOTPVerified(otpCode);
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    // Reset verification state
    hasVerifiedRef.current = false;
    isVerifyingRef.current = false;
    setIsVerifying(false);
    
    setIsLoading(true);
    try {
      await resendForgotPasswordOTP(phoneNumber, role);
      showAlert(t('OTP resent successfully'));
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
            <Text style={[styles.title, { color: colors.text, fontSize: scaledSize(24) }]}>{t('Enter OTP')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
              {t('We sent a code to')} {phoneNumber}
            </Text>
          </View>

          {/* OTP Inputs */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <View
                key={index}
                style={[
                  styles.otpInputWrapper,
                  digit && styles.otpInputFilled,
                  focusedIndex === index && styles.otpInputFocused,
                  isVerifying && styles.otpInputVerifying,
                  { 
                    borderColor: digit 
                      ? colors.primary 
                      : focusedIndex === index 
                        ? colors.primary 
                        : colors.border 
                  }
                ]}
              >
                <RNTextInput
                  ref={(ref) => {
                    if (ref) inputRefs.current[index] = ref;
                  }}
                  style={[styles.otpInput, { color: colors.text }]}
                  value={digit}
                  onChangeText={(text) => handleOTPChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                  editable={!isVerifying}
                />
              </View>
            ))}
          </View>
          
          {/* Verifying Indicator */}
          {isVerifying && (
            <View style={styles.verifyingContainer}>
              <Text style={[styles.verifyingText, { color: colors.primary, fontSize: scaledSize(16) }]}>
                {t('Verifying...')}
              </Text>
            </View>
          )}

          {/* Resend OTP */}
          <View style={styles.resendContainer}>
            <Text style={[styles.resendText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
              {t("Didn't receive the code?")}
            </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={!canResend || isLoading}
              style={[styles.resendButton, !canResend && styles.resendButtonDisabled]}
            >
              <Text style={[styles.resendButtonText, { color: canResend ? colors.primary : colors.textTertiary, fontSize: scaledSize(14) }]}>
                {canResend ? t('Resend OTP') : t('Resend in')} {canResend ? '' : `${resendTimer}s`}
              </Text>
            </TouchableOpacity>
          </View>

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
            <Text style={[styles.desktopTitle, { color: colors.text, fontSize: scaledSize(28) }]}>{t('Enter OTP')}</Text>
            <Text style={[styles.desktopSubtitle, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
              {t('We sent a code to')} {phoneNumber}
            </Text>
          </View>

          {/* OTP Inputs */}
          <View style={styles.desktopOtpContainer}>
            {otp.map((digit, index) => (
              <View
                key={index}
                style={[
                  styles.desktopOtpInputWrapper,
                  digit && styles.desktopOtpInputFilled,
                  focusedIndex === index && styles.desktopOtpInputFocused,
                  isVerifying && styles.desktopOtpInputVerifying,
                  { 
                    borderColor: digit 
                      ? colors.primary 
                      : focusedIndex === index 
                        ? colors.primary 
                        : colors.border 
                  }
                ]}
              >
                <RNTextInput
                  ref={(ref) => {
                    if (ref) inputRefs.current[index] = ref;
                  }}
                  style={[styles.desktopOtpInput, { color: colors.text }]}
                  value={digit}
                  onChangeText={(text) => handleOTPChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                  editable={!isVerifying}
                />
              </View>
            ))}
          </View>
          
          {/* Verifying Indicator */}
          {isVerifying && (
            <View style={styles.desktopVerifyingContainer}>
              <Text style={[styles.desktopVerifyingText, { color: colors.primary, fontSize: scaledSize(18) }]}>
                {t('Verifying...')}
              </Text>
            </View>
          )}

          {/* Resend OTP */}
          <View style={styles.desktopResendContainer}>
            <Text style={[styles.desktopResendText, { color: colors.textSecondary, fontSize: scaledSize(15) }]}>
              {t("Didn't receive the code?")}
            </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={!canResend || isLoading}
              style={[styles.desktopResendButton, !canResend && styles.desktopResendButtonDisabled]}
            >
              <Text style={[styles.desktopResendButtonText, { color: canResend ? colors.primary : colors.textTertiary, fontSize: scaledSize(15) }]}>
                {canResend ? t('Resend OTP') : t('Resend in')} {canResend ? '' : `${resendTimer}s`}
              </Text>
            </TouchableOpacity>
          </View>

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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 16,
  },
  otpInputWrapper: {
    width: 70,
    height: 70,
    borderRadius: 16,
    borderWidth: 2.5,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  otpInputFilled: {
    borderWidth: 3,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
      } as any,
      default: {
        elevation: 4,
      },
    }),
  },
  otpInput: {
    width: '100%',
    height: '100%',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
    margin: 0,
  },
  otpInputFocused: {
    borderWidth: 3,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(33, 150, 243, 0.25)',
      } as any,
      default: {
        elevation: 3,
      },
    }),
  },
  otpInputVerifying: {
    opacity: 0.7,
  },
  verifyingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyingText: {
    fontSize: 16,
    fontWeight: '600',
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
  desktopOtpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
    gap: 20,
  },
  desktopOtpInputWrapper: {
    width: 80,
    height: 80,
    borderRadius: 18,
    borderWidth: 3,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
        transition: 'all 0.3s ease',
      } as any,
      default: {
        elevation: 3,
      },
    }),
  },
  desktopOtpInputFilled: {
    borderWidth: 3.5,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(33, 150, 243, 0.4)',
        transform: 'scale(1.05)',
      } as any,
      default: {
        elevation: 5,
      },
    }),
  },
  desktopOtpInput: {
    width: '100%',
    height: '100%',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
    margin: 0,
  },
  desktopOtpInputFocused: {
    borderWidth: 3.5,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 24px rgba(33, 150, 243, 0.35)',
        transform: 'scale(1.08)',
      } as any,
      default: {
        elevation: 4,
      },
    }),
  },
  desktopOtpInputVerifying: {
    opacity: 0.7,
  },
  desktopVerifyingContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  desktopVerifyingText: {
    fontSize: 18,
    fontWeight: '600',
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
  desktopBackToLoginText: {
    fontSize: 15,
  },
});
