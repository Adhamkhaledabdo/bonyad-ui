import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';

export type AlertType = 'error' | 'success' | 'warning' | 'info';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertPopupProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButton[];
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
  // Countdown redirect feature
  countdown?: {
    seconds: number;
    text: string; // e.g., "Navigating to login in"
    onComplete: () => void;
  };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AlertPopup({
  visible,
  title,
  message,
  type = 'error',
  buttons,
  onClose,
  autoClose = false,
  autoCloseDelay = 5000,
  countdown,
}: AlertPopupProps) {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const isDarkMode = theme === 'dark';
  
  // Countdown state - use -1 as "not initialized" sentinel value
  const [countdownValue, setCountdownValue] = React.useState(-1);
  const [countdownActive, setCountdownActive] = React.useState(false);
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Get type-specific styling
  const getTypeConfig = useCallback(() => {
    switch (type) {
      case 'error':
        return {
          icon: 'alert-circle' as const,
          color: colors.error || '#F44336',
          bgColor: isDarkMode ? 'rgba(244, 67, 54, 0.15)' : 'rgba(244, 67, 54, 0.1)',
          borderColor: isDarkMode ? 'rgba(244, 67, 54, 0.4)' : 'rgba(244, 67, 54, 0.2)',
        };
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          color: colors.success || '#4CAF50',
          bgColor: isDarkMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)',
          borderColor: isDarkMode ? 'rgba(76, 175, 80, 0.4)' : 'rgba(76, 175, 80, 0.2)',
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          color: colors.warning || '#FF9800',
          bgColor: isDarkMode ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)',
          borderColor: isDarkMode ? 'rgba(255, 152, 0, 0.4)' : 'rgba(255, 152, 0, 0.2)',
        };
      case 'info':
      default:
        return {
          icon: 'information-circle' as const,
          color: colors.info || '#2196F3',
          bgColor: isDarkMode ? 'rgba(33, 150, 243, 0.15)' : 'rgba(33, 150, 243, 0.1)',
          borderColor: isDarkMode ? 'rgba(33, 150, 243, 0.4)' : 'rgba(33, 150, 243, 0.2)',
        };
    }
  }, [type, colors, isDarkMode]);

  const typeConfig = getTypeConfig();

  // Animate in when visible
  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      backdropAnim.setValue(0);
      shakeAnim.setValue(0);

      // Reset countdown state
      setCountdownActive(false);
      setCountdownValue(-1);

      // Start animations
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // After animation completes, initialize countdown if needed
        if (countdown && countdown.seconds > 0) {
          setCountdownValue(countdown.seconds);
          setCountdownActive(true);
        }
      });

      // Shake animation for error type
      if (type === 'error') {
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
          ]).start();
        }, 150);
      }

      // Auto close (only for non-countdown alerts)
      if (autoClose && !countdown) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    } else {
      // Reset when hidden
      setCountdownActive(false);
      setCountdownValue(-1);
    }
  }, [visible, type, autoClose, autoCloseDelay, countdown]);
  
  // Countdown timer effect - only runs when countdownActive is true
  useEffect(() => {
    // Only run when countdown is active and properly initialized
    if (!countdownActive || !countdown) {
      return;
    }

    if (countdownValue > 0) {
      const timer = setTimeout(() => {
        setCountdownValue(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdownValue === 0) {
      // Countdown finished - trigger callback
      setCountdownActive(false);
      countdown.onComplete();
      handleClose();
    }
  }, [countdownActive, countdown, countdownValue]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    handleClose();
  };

  const defaultButtons: AlertButton[] = [{ text: t('OK') || 'OK', style: 'default' }];
  const actionButtons = buttons && buttons.length > 0 ? buttons : defaultButtons;

  if (!visible) {
    return null;
  }

  const renderBackdrop = () => {
    return (
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, isDarkMode ? 0.7 : 0.5],
            }),
            backgroundColor: '#000',
          },
        ]}
      />
    );
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          {renderBackdrop()}
        </Pressable>

        <Animated.View
          style={[
            styles.alertContainer,
            {
              backgroundColor: colors.cardBackground,
              borderColor: typeConfig.borderColor,
              opacity: opacityAnim,
              transform: [
                { scale: scaleAnim },
                { translateX: shakeAnim },
              ],
              ...(Platform.OS === 'web' && {
                boxShadow: isDarkMode
                  ? '0 25px 50px rgba(0, 0, 0, 0.5), 0 10px 20px rgba(0, 0, 0, 0.3)'
                  : '0 25px 50px rgba(0, 0, 0, 0.15), 0 10px 20px rgba(0, 0, 0, 0.1)',
              }),
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: typeConfig.bgColor,
                borderColor: typeConfig.borderColor,
              },
            ]}
          >
            <Ionicons name={typeConfig.icon} size={40} color={typeConfig.color} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {/* Message */}
          {message && (
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          )}

          {/* Countdown or Buttons */}
          {countdown ? (
            <View style={styles.countdownContainer}>
              <Text style={[styles.countdownText, { color: colors.textSecondary }]}>
                {countdown.text}{' '}
                <Text style={[styles.countdownNumber, { color: typeConfig.color }]}>
                  {countdownValue >= 0 ? countdownValue : countdown.seconds}
                </Text>
              </Text>
            </View>
          ) : (
            <View style={[
              styles.buttonContainer,
              actionButtons.length === 1 && styles.buttonContainerSingle,
            ]}>
              {actionButtons.map((button, index) => {
                const isDestructive = button.style === 'destructive';
                const isCancel = button.style === 'cancel';
                const isPrimary = !isCancel && !isDestructive;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      isPrimary && { backgroundColor: typeConfig.color },
                      isCancel && {
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        borderColor: colors.border,
                      },
                      isDestructive && { backgroundColor: colors.error },
                      actionButtons.length > 1 && { flex: 1 },
                      actionButtons.length === 1 && styles.buttonSingle,
                    ]}
                    onPress={() => handleButtonPress(button)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isPrimary && { color: '#FFFFFF' },
                        isCancel && { color: colors.textSecondary },
                        isDestructive && { color: '#FFFFFF' },
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// Hook for easy usage
export interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  type: AlertType;
  buttons?: AlertButton[];
  countdown?: {
    seconds: number;
    text: string;
    onComplete: () => void;
  };
}

export const useAlertPopup = () => {
  const [alertState, setAlertState] = React.useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: undefined,
    countdown: undefined,
  });

  const showAlert = useCallback((
    title: string,
    message?: string,
    type: AlertType = 'info',
    buttons?: AlertButton[]
  ) => {
    setAlertState({
      visible: true,
      title,
      message,
      type,
      buttons,
      countdown: undefined,
    });
  }, []);
  
  const showAlertWithCountdown = useCallback((
    title: string,
    message: string,
    type: AlertType,
    countdownSeconds: number,
    countdownText: string,
    onComplete: () => void
  ) => {
    setAlertState({
      visible: true,
      title,
      message,
      type,
      buttons: undefined,
      countdown: {
        seconds: countdownSeconds,
        text: countdownText,
        onComplete,
      },
    });
  }, []);

  const showError = useCallback((message: string, title: string = 'Error') => {
    showAlert(title, message, 'error');
  }, [showAlert]);

  const showSuccess = useCallback((message: string, title: string = 'Success') => {
    showAlert(title, message, 'success');
  }, [showAlert]);

  const showWarning = useCallback((message: string, title: string = 'Warning') => {
    showAlert(title, message, 'warning');
  }, [showAlert]);

  const showInfo = useCallback((message: string, title: string = 'Info') => {
    showAlert(title, message, 'info');
  }, [showAlert]);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false, countdown: undefined }));
  }, []);

  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    setAlertState({
      visible: true,
      title,
      message,
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
        { text: 'Confirm', style: 'default', onPress: onConfirm },
      ],
    });
  }, []);

  return {
    alertState,
    showAlert,
    showAlertWithCountdown,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    showConfirm,
    hideAlert,
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 28,
    paddingTop: 36,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    borderRadius: 20,
    zIndex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  buttonContainerSingle: {
    justifyContent: 'center',
  },
  buttonSingle: {
    minWidth: 140,
    paddingHorizontal: 40,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  countdownContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  countdownText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  countdownNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
});

