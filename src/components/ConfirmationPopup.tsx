import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';

export type ConfirmationType = 'warning' | 'danger' | 'info';

export interface ConfirmationPopupProps {
  visible: boolean;
  title: string;
  message: string;
  type?: ConfirmationType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmStyle?: 'default' | 'destructive';
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function ConfirmationPopup({
  visible,
  title,
  message,
  type = 'warning',
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  confirmStyle = 'default',
  icon,
}: ConfirmationPopupProps) {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const isDarkMode = theme === 'dark';
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Get type-specific styling
  const getTypeConfig = useCallback(() => {
    switch (type) {
      case 'danger':
        return {
          icon: icon || ('alert-circle' as const),
          color: colors.error || '#EF4444',
          bgColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.2)',
        };
      case 'info':
        return {
          icon: icon || ('information-circle' as const),
          color: colors.info || '#3B82F6',
          bgColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
          borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.2)',
        };
      case 'warning':
      default:
        return {
          icon: icon || ('warning' as const),
          color: colors.warning || '#F59E0B',
          bgColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
          borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.2)',
        };
    }
  }, [type, colors, isDarkMode, icon]);

  const typeConfig = getTypeConfig();

  // Animate in when visible
  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      backdropAnim.setValue(0);

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
      ]).start();
    }
  }, [visible]);

  const handleClose = (callback?: () => void) => {
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
      if (callback) {
        callback();
      }
    });
  };

  const handleConfirm = () => {
    handleClose(() => {
      // First dismiss the popup (update parent state)
      onCancel();
      // Then execute the confirm action after a brief delay
      // to allow the state to update before showing any new alerts
      setTimeout(() => onConfirm(), 50);
    });
  };

  const handleCancel = () => {
    handleClose(onCancel);
  };

  if (!visible) {
    return null;
  }

  const confirmButtonColor = confirmStyle === 'destructive' 
    ? (colors.error || '#EF4444') 
    : (colors.primary || '#3B82F6');

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
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleCancel}>
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel}>
          {renderBackdrop()}
        </Pressable>

        <Animated.View
          style={[
            styles.popupContainer,
            {
              backgroundColor: colors.cardBackground,
              borderColor: typeConfig.borderColor,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
              ...(Platform.OS === 'web' && {
                boxShadow: isDarkMode
                  ? '0 25px 50px rgba(0, 0, 0, 0.5), 0 10px 20px rgba(0, 0, 0, 0.3)'
                  : '0 25px 50px rgba(0, 0, 0, 0.15), 0 10px 20px rgba(0, 0, 0, 0.1)',
              }),
            },
          ]}
        >
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
            <Ionicons name={typeConfig.icon} size={36} color={typeConfig.color} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                {
                  backgroundColor: 'transparent',
                  borderWidth: 1.5,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                {cancelText || t('Cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: confirmButtonColor },
              ]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                {confirmText || t('Confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Hook for easy usage
export interface ConfirmationState {
  visible: boolean;
  title: string;
  message: string;
  type: ConfirmationType;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'default' | 'destructive';
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
}

export const useConfirmationPopup = () => {
  const [confirmState, setConfirmState] = React.useState<ConfirmationState>({
    visible: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: undefined,
    cancelText: undefined,
    confirmStyle: 'default',
    icon: undefined,
    onConfirm: () => {},
  });

  const showConfirmation = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      type?: ConfirmationType;
      confirmText?: string;
      cancelText?: string;
      confirmStyle?: 'default' | 'destructive';
      icon?: keyof typeof Ionicons.glyphMap;
    }
  ) => {
    setConfirmState({
      visible: true,
      title,
      message,
      type: options?.type || 'warning',
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      confirmStyle: options?.confirmStyle || 'default',
      icon: options?.icon,
      onConfirm,
    });
  }, []);

  const showDeleteConfirmation = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string
  ) => {
    setConfirmState({
      visible: true,
      title,
      message,
      type: 'danger',
      confirmText: confirmText || 'Delete',
      cancelText: undefined,
      confirmStyle: 'destructive',
      icon: 'trash-outline',
      onConfirm,
    });
  }, []);

  const showLogoutConfirmation = useCallback((
    title: string,
    message: string,
    onConfirm: () => void
  ) => {
    setConfirmState({
      visible: true,
      title,
      message,
      type: 'warning',
      confirmText: 'Logout',
      cancelText: undefined,
      confirmStyle: 'destructive',
      icon: 'log-out-outline',
      onConfirm,
    });
  }, []);

  const hideConfirmation = useCallback(() => {
    setConfirmState(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    confirmState,
    showConfirmation,
    showDeleteConfirmation,
    showLogoutConfirmation,
    hideConfirmation,
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
  popupContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 28,
    paddingTop: 32,
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
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {},
  confirmButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

