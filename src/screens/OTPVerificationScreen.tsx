import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  TextInput as RNTextInput,
  Animated,
  Easing,
  ActivityIndicator,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { FontFamily, UIFontSizes } from '../constants/Fonts';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { showAlert, showError } from '../utils/alert';

interface OTPVerificationPopupProps {
  visible: boolean;
  phoneNumber: string;
  role: 'user' | 'technician';
  onVerificationSuccess: (token: string, userId: number, role: string) => void;
  onClose: () => void;
}

// Figma Design Colors
const figmaColors = {
  background: '#E6EFF7',       // Blue- Primary/10
  cardBackground: '#FFFFFF',
  iconCircle: '#D6B3E1',       // Purple/20
  iconColor: '#5E0BA1',        // Purple/70
  titleBlue: '#1A6DB4',        // Blue- Primary/50
  textDark: '#2D2D2D',
  buttonBlue: '#005DAC',       // Blue- Primary/60
  buttonGreen: '#22C55E',      // Success green
  buttonRed: '#EF4444',        // Error red
  linkNavy: '#003867',         // Blue- Primary/100
  resendPurple: '#5E0BA1',     // Purple/70
  otpBackground: '#FFF2CF',    // Amber/10
  otpBorder: '#FFB703',        // Amber/60
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export default function OTPVerificationPopup({ 
  visible, 
  phoneNumber, 
  role, 
  onVerificationSuccess, 
  onClose 
}: OTPVerificationPopupProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';
  
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;

  // 4-digit OTP
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [buttonState, setButtonState] = useState<'idle' | 'loading' | 'success' | 'navigating' | 'error'>('idle');
  const [typewriterText, setTypewriterText] = useState('');
  const inputRefs = useRef<(RNTextInput | null)[]>([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonColorAnim = useRef(new Animated.Value(0)).current; // 0 = blue, 1 = green, 2 = red
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const buttonShakeAnim = useRef(new Animated.Value(0)).current;
  const keyboardOffsetAnim = useRef(new Animated.Value(0)).current; // For keyboard avoidance

  // Pending success data to close popup after animation
  const pendingSuccessData = useRef<{ token: string; userId: number; role: string } | null>(null);

  // Keyboard handling for mobile
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const keyboardWillShow = (event: KeyboardEvent) => {
      const keyboardHeight = event.endCoordinates.height;
      // Move popup up by half the keyboard height (adjust as needed)
      Animated.spring(keyboardOffsetAnim, {
        toValue: -(keyboardHeight * 0.4),
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();
    };

    const keyboardWillHide = () => {
      Animated.spring(keyboardOffsetAnim, {
        toValue: 0,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();
    };

    // iOS uses 'keyboardWillShow/Hide', Android uses 'keyboardDidShow/Hide'
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, keyboardWillShow);
    const hideSubscription = Keyboard.addListener(hideEvent, keyboardWillHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setOtp(['', '', '', '']);
      setResendTimer(60);
      setCanResend(false);
      setIsLoading(false);
      setButtonState('idle');
      setTypewriterText('');
      buttonColorAnim.setValue(0);
      buttonScaleAnim.setValue(1);
      buttonShakeAnim.setValue(0);
      keyboardOffsetAnim.setValue(0);
      pendingSuccessData.current = null;
      
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Focus first input after a short delay
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      buttonColorAnim.setValue(0);
      buttonScaleAnim.setValue(1);
      buttonShakeAnim.setValue(0);
      keyboardOffsetAnim.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
  }, [resendTimer, visible]);

  useEffect(() => {
    // Auto-verify instantly when all 4 digits are entered
    if (visible && otp.every(digit => digit !== '') && otp.join('').length === 4 && buttonState === 'idle') {
      handleVerify();
    }
  }, [otp, visible, buttonState]);

  // Mask phone number for display
  const getMaskedPhone = () => {
    if (phoneNumber.length >= 4) {
      const lastFour = phoneNumber.slice(-4);
      return `+966 *****${lastFour}`;
    }
    return phoneNumber;
  };

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

  // Typewriter animation function
  const animateTypewriter = (text: string, onComplete: () => void) => {
    setTypewriterText('');
    let currentIndex = 0;
    
    const typeNextChar = () => {
      if (currentIndex < text.length) {
        setTypewriterText(text.substring(0, currentIndex + 1));
        currentIndex++;
        setTimeout(typeNextChar, 50); // 50ms per character
      } else {
        // Wait a moment after finishing, then complete
        setTimeout(onComplete, 500);
      }
    };
    
    typeNextChar();
  };

  const animateButtonSuccess = (data: { token: string; userId: number; role: string }) => {
    setButtonState('success');
    pendingSuccessData.current = data;
    
    // Set color directly to green (no animation through intermediate colors)
    buttonColorAnim.setValue(1);
    
    // Bounce effect
    Animated.sequence([
      Animated.spring(buttonScaleAnim, {
        toValue: 1.08,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After showing "Verified!", start typewriter animation
      setTimeout(() => {
        setButtonState('navigating');
        const navigatingText = t('Navigating to home...');
        animateTypewriter(navigatingText, () => {
          // After typewriter finishes, proceed with login
          if (pendingSuccessData.current) {
            onVerificationSuccess(
              pendingSuccessData.current.token,
              pendingSuccessData.current.userId,
              pendingSuccessData.current.role
            );
          }
        });
      }, 200);
    });
  };

  const animateButtonError = () => {
    setButtonState('error');
    
    // Set color directly to red (no animation through green)
    buttonColorAnim.setValue(2);
    
    // Shake and scale animations
    Animated.parallel([
      // Shake animation
      Animated.sequence([
        Animated.timing(buttonShakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
        Animated.timing(buttonShakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
        Animated.timing(buttonShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(buttonShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(buttonShakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(buttonShakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(buttonShakeAnim, { toValue: 3, duration: 50, useNativeDriver: true }),
        Animated.timing(buttonShakeAnim, { toValue: -3, duration: 50, useNativeDriver: true }),
        Animated.timing(buttonShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]),
      // Scale pulse
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 0.92,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Wait then set back to blue directly
      setTimeout(() => {
        buttonColorAnim.setValue(0);
        setButtonState('idle');
      }, 1200);
    });
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 4) {
      showError(t('Please enter the complete OTP code'));
      return;
    }

    setIsLoading(true);
    setButtonState('loading');
    
    // Store the loading animation reference so we can stop it
    const loadingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 0.98,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loadingAnimation.start();
    
    let isSuccess = false;
    let successData: { token: string; userId: number; role: string } | null = null;
    
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
      
      isSuccess = true;
      successData = { token: data.token, userId: data.user.id, role: data.user.role };
      
    } catch (error: any) {
      isSuccess = false;
    }
    
    // Stop loading animation and reset scale
    loadingAnimation.stop();
    buttonScaleAnim.setValue(1);
    setIsLoading(false);
    
    // Delay to ensure clean transition before showing result
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (isSuccess && successData) {
      // Animate to green and then close
      animateButtonSuccess(successData);
    } else {
      // Animate to red then back to blue
      animateButtonError();
      
      // Clear OTP on error
      setOtp(['', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 1600);
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

  const handleClose = () => {
    // Animate out then close
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Interpolate button color with smoother transitions
  const buttonBackgroundColor = buttonColorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      isDarkMode ? colors.primary : figmaColors.buttonBlue,
      figmaColors.buttonGreen,
      figmaColors.buttonRed,
    ],
  });

  // Get button text based on state
  const getButtonText = () => {
    switch (buttonState) {
      case 'success':
        return t('Verified!');
      case 'navigating':
        return typewriterText || '|'; // Show cursor if empty
      case 'error':
        return t('Failed');
      default:
        return t('Verify');
    }
  };

  // Get button icon based on state
  const getButtonIcon = () => {
    switch (buttonState) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />;
      case 'navigating':
        return null; // No icon during typewriter animation
      case 'error':
        return <Ionicons name="close-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />;
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View 
              style={[
                styles.popupCard,
                IS_LARGE_WEB && styles.popupCardDesktop,
                {
                  backgroundColor: isDarkMode ? colors.cardBackground : figmaColors.cardBackground,
                  transform: [
                    { scale: scaleAnim },
                    { translateY: keyboardOffsetAnim },
                  ],
                }
              ]}
            >
              {/* Close Button */}
              <TouchableOpacity 
                onPress={handleClose} 
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={isDarkMode ? colors.textSecondary : figmaColors.textDark} 
                />
              </TouchableOpacity>

              {/* Mail Icon */}
              <View style={styles.iconContainer}>
                <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? colors.primary + '30' : figmaColors.iconCircle }]}>
                  <Ionicons name="mail-outline" size={IS_LARGE_WEB ? 40 : 32} color={isDarkMode ? colors.primary : figmaColors.iconColor} />
                </View>
              </View>

              {/* Title */}
              <View style={styles.titleContainer}>
                <Text style={[styles.title, IS_LARGE_WEB && styles.titleDesktop, { color: isDarkMode ? colors.primary : figmaColors.titleBlue, fontSize: scaledSize(22) }]}>
                  {t('Verify Your Identity')}
                </Text>
                <Text style={[styles.subtitle, IS_LARGE_WEB && styles.subtitleDesktop, { color: isDarkMode ? colors.textSecondary : figmaColors.textDark, fontSize: scaledSize(16) }]}>
                  {t("We've sent a 4-digit code to")} {getMaskedPhone()}
                </Text>
              </View>

              {/* OTP Label */}
              <Text style={[styles.otpLabel, IS_LARGE_WEB && styles.otpLabelDesktop, { color: isDarkMode ? colors.text : figmaColors.textDark, fontSize: scaledSize(18) }]}>
                {t('Enter your OTP code')}
              </Text>

              {/* OTP Inputs */}
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <RNTextInput
                    key={index}
                    ref={(ref) => {
                      if (ref) inputRefs.current[index] = ref;
                    }}
                    style={[
                      styles.otpInput,
                      IS_LARGE_WEB && styles.otpInputDesktop,
                      {
                        backgroundColor: isDarkMode ? colors.surface : figmaColors.otpBackground,
                        borderColor: isDarkMode ? colors.border : figmaColors.otpBorder,
                        color: isDarkMode ? colors.text : figmaColors.textDark,
                      }
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOTPChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!isLoading && buttonState === 'idle'}
                  />
                ))}
              </View>

              {/* Verify Button with Animated Background, Scale and Shake */}
              <Animated.View
                style={[
                  styles.verifyButton,
                  IS_LARGE_WEB && styles.verifyButtonDesktop,
                  {
                    backgroundColor: buttonBackgroundColor,
                    opacity: (otp.join('').length !== 4 && buttonState === 'idle') ? 0.6 : 1,
                    transform: [
                      { scale: buttonScaleAnim },
                      { translateX: buttonShakeAnim },
                    ],
                  }
                ]}
              >
                <TouchableOpacity
                  onPress={handleVerify}
                  disabled={otp.join('').length !== 4 || isLoading || buttonState !== 'idle'}
                  style={styles.verifyButtonTouchable}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={styles.buttonContent}>
                      {getButtonIcon()}
                      <Text style={[styles.verifyButtonText, IS_LARGE_WEB && styles.verifyButtonTextDesktop]}>
                        {getButtonText()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* Resend OTP */}
              <View style={styles.resendContainer}>
                <Text style={[styles.resendText, IS_LARGE_WEB && styles.resendTextDesktop, { color: isDarkMode ? colors.textSecondary : figmaColors.linkNavy }]}>
                  {t("Didn't Receive Code?")}
                </Text>
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={!canResend || isLoading}
                >
                  <Text 
                    style={[
                      styles.resendLink,
                      IS_LARGE_WEB && styles.resendLinkDesktop,
                      { 
                        color: canResend 
                          ? (isDarkMode ? colors.primary : figmaColors.resendPurple)
                          : (isDarkMode ? colors.textTertiary : '#999'),
                      }
                    ]}
                  >
                    {canResend ? t('Resend') : `${t('Resend')} (${resendTimer}s)`}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: figmaColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.25)',
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 16,
      },
    }),
  },
  popupCardDesktop: {
    maxWidth: 500,
    padding: 32,
    borderRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  title: {
    fontSize: UIFontSizes.cardTitle, // Centralized: 22px
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: FontFamily.heading,
  },
  titleDesktop: {
    fontSize: UIFontSizes.sectionTitle, // Centralized: 26px
  },
  subtitle: {
    fontSize: UIFontSizes.body, // Centralized: 16px
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  subtitleDesktop: {
    fontSize: UIFontSizes.bodyLarge, // Centralized: 18px
  },
  otpLabel: {
    fontSize: UIFontSizes.otpLabel, // Centralized: 18px
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  otpLabelDesktop: {
    fontSize: UIFontSizes.otpLabel, // Centralized: 18px
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  otpInput: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 1.5,
    fontSize: UIFontSizes.otpInput, // Centralized: 28px
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontFamily: FontFamily.primary,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        lineHeight: 60,
      } as any,
      default: {
        lineHeight: 32,
      },
    }),
  },
  otpInputDesktop: {
    width: 74,
    height: 74,
    fontSize: UIFontSizes.otpInput,
    borderRadius: 12,
    ...Platform.select({
      web: {
        lineHeight: 74,
      } as any,
      default: {
        lineHeight: 36,
      },
    }),
  },
  verifyButton: {
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  verifyButtonDesktop: {
    borderRadius: 8,
  },
  verifyButtonTouchable: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: UIFontSizes.buttonMedium, // Centralized: 18px
    fontWeight: '600',
    fontFamily: FontFamily.button,
  },
  verifyButtonTextDesktop: {
    fontSize: UIFontSizes.buttonMedium, // Centralized: 20px
  },
  resendContainer: {
    alignItems: 'center',
    gap: 4,
  },
  resendText: {
    fontSize: UIFontSizes.body, // Centralized: 16px
    fontWeight: '300',
    fontFamily: FontFamily.body,
  },
  resendTextDesktop: {
    fontSize: UIFontSizes.bodyLarge, // Centralized: 18px
  },
  resendLink: {
    fontSize: UIFontSizes.link, // Centralized: 16px
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontFamily: FontFamily.body,
  },
  resendLinkDesktop: {
    fontSize: UIFontSizes.bodyLarge, // Centralized: 18px
  },
});
