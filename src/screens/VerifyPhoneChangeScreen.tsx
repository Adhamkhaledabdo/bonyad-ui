import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { verifyPhoneChange, resendPhoneChangeOTP } from '../services/ProfileService';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

interface VerifyPhoneChangeScreenProps {
  newPhoneNumber: string;
  onBack: () => void;
  onVerified?: () => void;
}

export default function VerifyPhoneChangeScreen({ newPhoneNumber, onBack, onVerified }: VerifyPhoneChangeScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  
  // Custom alert hook
  const { alertState, showError, showAlert, hideAlert } = useAlertPopup();
  
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const hasVerifiedRef = useRef(false);
  const isVerifyingRef = useRef(false);

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    
    if (code.length !== 4) {
      showError(t('Please enter the 4-digit verification code'));
      setIsVerifying(false);
      return;
    }
    
    // Prevent multiple verification attempts
    if (hasVerifiedRef.current) {
      return;
    }
    
    hasVerifiedRef.current = true;
    setIsLoading(true);
    setIsVerifying(true);
    
    try {
      console.log('🔐 [VerifyPhoneChangeScreen] Verifying OTP:', code);
      const result = await verifyPhoneChange(code);
      
      console.log('✅ [VerifyPhoneChangeScreen] Verification successful:', result);
      
      showAlert(t('Success'), result.message, 'success', [
        {
          text: t('OK'),
          onPress: () => {
            // Navigate back to profile
            if (onVerified) {
              onVerified();
            } else {
              onBack();
            }
          }
        }
      ]);
      
    } catch (error: any) {
      console.error('❌ [VerifyPhoneChangeScreen] Verification error:', error);
      showError(error.message || t('Failed to verify OTP'));
      setIsVerifying(false);
      hasVerifiedRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-verify when all 4 digits are entered
  useEffect(() => {
    const otpCode = otp.join('');
    if (otpCode.length === 4 && !isVerifyingRef.current && !hasVerifiedRef.current) {
      console.log('🔐 [VerifyPhoneChangeScreen] Auto-verifying OTP:', otpCode);
      isVerifyingRef.current = true;
      setIsVerifying(true);
      
      // Small delay to ensure all inputs are captured
      const timer = setTimeout(async () => {
        const code = otpCode;
        
        if (code.length !== 4) {
          setIsVerifying(false);
          isVerifyingRef.current = false;
          return;
        }
        
        // Prevent multiple verification attempts
        if (hasVerifiedRef.current) {
          isVerifyingRef.current = false;
          setIsVerifying(false);
          return;
        }
        
        hasVerifiedRef.current = true;
        setIsLoading(true);
        
        try {
          console.log('🔐 [VerifyPhoneChangeScreen] Verifying OTP:', code);
          const result = await verifyPhoneChange(code);
          
          console.log('✅ [VerifyPhoneChangeScreen] Verification successful:', result);
          
          showAlert(t('Success'), result.message, 'success', [
            {
              text: t('OK'),
              onPress: () => {
                // Navigate back to profile
                if (onVerified) {
                  onVerified();
                } else {
                  onBack();
                }
              }
            }
          ]);
          
        } catch (error: any) {
          console.error('❌ [VerifyPhoneChangeScreen] Verification error:', error);
          showError(error.message || t('Failed to verify OTP'));
          setIsVerifying(false);
          hasVerifiedRef.current = false;
          isVerifyingRef.current = false;
        } finally {
          setIsLoading(false);
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

  const handleResendOTP = async () => {
    try {
      // Reset verification state
      hasVerifiedRef.current = false;
      isVerifyingRef.current = false;
      setIsVerifying(false);
      setIsLoading(false);
      
      const result = await resendPhoneChangeOTP(newPhoneNumber);
      showAlert(t('Success'), result.message);
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      showError(error.message || t('Failed to resend OTP'));
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(18) }]}>{t('Verify Phone Number')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header Icon and Text */}
          <View style={styles.headerSection}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="shield-checkmark" size={60} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text, fontSize: scaledSize(24) }]}>{t('Verify Phone Number')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
              {t('Enter the verification code sent to')}
            </Text>
            <Text style={[styles.phoneHighlight, { color: colors.primary, fontSize: scaledSize(16) }]}>
              +966 {newPhoneNumber}
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
                <TextInput
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
                  editable={!isVerifying && !isLoading}
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
          <TouchableOpacity style={styles.resendButton} onPress={handleResendOTP}>
            <Text style={[styles.resendButtonText, { color: colors.primary, fontSize: scaledSize(14) }]}>
              {t('Resend Code')}
            </Text>
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  phoneHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
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
  otpInput: {
    width: '100%',
    height: '100%',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
    margin: 0,
  },
  verifyingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

