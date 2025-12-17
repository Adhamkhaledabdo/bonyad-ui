import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  fromUser?: {
    id: number;
    name: string;
    phoneNumber: string;
  };
  relatedProjectId?: number;
  relatedBidId?: number;
  relatedPhaseId?: number;
  relatedAppointmentId?: number;
}

interface NotificationPopupProps {
  notification: Notification | null;
  onClose: () => void;
  onPress?: () => void;
  visible: boolean;
}

export default function NotificationPopup({
  notification,
  onClose,
  onPress,
  visible,
}: NotificationPopupProps) {
  const { colors, theme } = useTheme();
  const { t, i18n } = useTranslation();
  const slideAnim = useRef(new Animated.Value(-Dimensions.get('window').width)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && notification) {
      // Slide in from right
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      handleClose();
    }
  }, [visible, notification]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -Dimensions.get('window').width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible || !notification) {
    return null;
  }

  // Get icon based on notification type
  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'PROJECT_CREATED':
        return 'folder-open-outline';
      case 'BID_RECEIVED':
      case 'BID_ACCEPTED':
        return 'cash-outline';
      case 'PHASE_COMPLETED':
      case 'PHASE_APPROVED':
        return 'checkmark-circle-outline';
      case 'APPOINTMENT_CONFIRMED':
      case 'TIME_REQUEST_RECEIVED':
        return 'calendar-outline';
      case 'PROJECT_COMPLETED':
        return 'trophy-outline';
      default:
        return 'notifications-outline';
    }
  };

  // Get color based on notification type
  const getNotificationColor = () => {
    switch (notification.type) {
      case 'PROJECT_CREATED':
        return '#0080E0';
      case 'BID_RECEIVED':
      case 'BID_ACCEPTED':
        return '#4CAF50';
      case 'PHASE_COMPLETED':
      case 'PHASE_APPROVED':
        return '#FFA500';
      case 'APPOINTMENT_CONFIRMED':
        return '#9C27B0';
      case 'PROJECT_COMPLETED':
        return '#F44336';
      default:
        return colors.primary;
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t('Just now');
    if (diffMins < 60) return `${diffMins} ${t('minutes ago')}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${t('hours ago')}`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${t('days ago')}`;
  };

  const iconName = getNotificationIcon();
  const iconColor = getNotificationColor();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
        },
        Platform.OS === 'web' && styles.webContainer,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBackground,
            borderLeftColor: iconColor,
            shadowColor: colors.shadow || '#000',
          },
          Platform.OS === 'web' && {
            boxShadow: theme === 'dark'
              ? '0 8px 24px rgba(0, 0, 0, 0.4)' 
              : '0 8px 24px rgba(0, 0, 0, 0.15)',
          },
        ]}
        activeOpacity={0.9}
        onPress={() => {
          if (onPress) {
            onPress();
          }
          handleClose();
        }}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={iconName as any} size={24} color={iconColor} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text
            style={[styles.message, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {notification.message}
          </Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {formatTime(notification.createdAt)}
          </Text>
        </View>

        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Unread indicator */}
        {!notification.read && (
          <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 80 : 60,
    right: 16,
    zIndex: 9999,
    maxWidth: 400,
    width: '90%',
  },
  webContainer: {
    maxWidth: 380,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
    marginTop: -4,
    marginRight: -4,
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
