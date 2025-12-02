import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { storage } from '../utils/storage';
import { getApiUrl, buildApiUrlWithParams, API_ENDPOINTS } from '../config/api';

export interface Notification {
  id: number;
  fromUserId?: number;
  fromUserName?: string;
  fromUserRole?: string;
  notificationType: string;
  title: string;
  message: string;
  relatedProjectId?: number;
  relatedPhaseId?: number;
  relatedBidId?: number;
  relatedAppointmentId?: number;
  relatedTimeRequestId?: number;
  relatedReviewId?: number;
  read: boolean; // Changed from isRead to read to match API
  readAt?: string;
  createdAt: string;
  actionUrl?: string;
}

type NotificationFilter = 'all' | 'unread' | 'read';

interface NotificationsScreenProps {
  onBack?: () => void;
  onNavigateToProject?: (projectId: number) => void;
  onNavigateToPhase?: (projectId: number, phaseId?: number) => void;
  onNavigateToBid?: (projectId: number, bidId: number) => void;
  onUnreadCountChange?: (count: number) => void;
}

export default function NotificationsScreen({
  onBack,
  onNavigateToProject,
  onNavigateToPhase,
  onNavigateToBid,
  onUnreadCountChange,
}: NotificationsScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<NotificationFilter>('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        console.error('❌ No auth token found');
        Alert.alert('Error', 'Not authenticated');
        onBack();
        return;
      }

      console.log('🔔 Fetching notifications...');
      console.log('   URL:', `${getApiUrl()}/notifications/my-notifications`);
      console.log('   Token:', token.substring(0, 20) + '...');
      
      const response = await fetch(
        `${getApiUrl()}/notifications/my-notifications`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📥 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Successfully fetched notifications:', data);
        console.log('   Total count:', data.length);
        
        // Normalize the notification data - handle undefined read and ensure proper types
        const normalizedData = data.map((notif: any) => ({
          ...notif,
          read: notif.read !== undefined ? Boolean(notif.read) : (notif.isRead !== undefined ? Boolean(notif.isRead) : false), // Support both 'read' and 'isRead'
          readAt: notif.readAt || null,
          createdAt: notif.createdAt || notif.created_at || new Date().toISOString(),
        }));
        
        normalizedData.forEach((notif: Notification, index: number) => {
          console.log(`   [${index + 1}] ${notif.notificationType}: ${notif.title}`);
          console.log(`       Message: ${notif.message}`);
          console.log(`       read: ${notif.read}`);
          console.log(`       readAt: ${notif.readAt || 'null'}`);
          console.log(`       createdAt: ${notif.createdAt}`);
        });
        
        setNotifications(normalizedData);
        
        // Update unread count - count notifications where read is false
        const unreadCount = normalizedData.filter((n: Notification) => !n.read).length;
        console.log(`📊 Unread count calculated: ${unreadCount}`);
        onUnreadCountChange?.(unreadCount);
      } else if (response.status === 401) {
        Alert.alert('Error', 'Session expired');
        onBack();
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch notifications. Status:', response.status);
        console.error('   Error body:', errorText);
        throw new Error('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        console.error('❌ No token found for mark as read');
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.NOTIFICATIONS.MARK_READ, { id: notificationId });
      console.log(`📝 Marking notification ${notificationId} as read...`);
      console.log(`   URL: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`📥 Mark as read response status: ${response.status}`);

      if (response.ok) {
        const responseData = await response.json().catch(() => ({}));
        console.log(`✅ Notification ${notificationId} marked as read successfully`);
        
        // Refresh notifications to get the updated state from server
        await fetchNotifications();
        
        // Also update local state immediately for better UX
        setNotifications((prev) => {
          const updated = prev.map((n) => 
            n.id === notificationId ? { ...n, read: true, readAt: responseData.readAt || new Date().toISOString() } : n
          );
          const unreadCount = updated.filter((n) => !n.read).length;
          console.log(`📊 Marked notification ${notificationId} as read. New unread count: ${unreadCount}`);
          onUnreadCountChange?.(unreadCount);
          return updated;
        });
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to mark as read. Status: ${response.status}`);
        console.error(`   Error: ${errorText}`);
        Alert.alert('Error', 'Failed to mark notification as read');
      }
    } catch (error) {
      console.error('❌ Failed to mark as read:', error);
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        console.error('❌ No token found for mark all as read');
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      const url = `${getApiUrl()}${API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ}`;
      console.log(`📝 Marking all notifications as read...`);
      console.log(`   URL: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`📥 Mark all as read response status: ${response.status}`);

      if (response.ok) {
        console.log(`✅ All notifications marked as read successfully`);
        
        // Refresh notifications to get the updated state from server
        await fetchNotifications();
        
        // Also update local state immediately
        setNotifications((prev) => {
          const updated = prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }));
          onUnreadCountChange?.(0);
          return updated;
        });
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to mark all as read. Status: ${response.status}`);
        console.error(`   Error: ${errorText}`);
        Alert.alert('Error', 'Failed to mark all notifications as read');
      }
    } catch (error) {
      console.error('❌ Failed to mark all as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      const token = await storage.getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${getApiUrl()}/notifications/${notificationId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        setNotifications((prev) => {
          const updated = prev.filter((n) => n.id !== notificationId);
          const unreadCount = updated.filter((n) => !n.read).length;
          onUnreadCountChange?.(unreadCount);
          return updated;
        });
      }
    } catch (error) {
      console.error('❌ Failed to delete notification:', error);
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const handleNotificationTap = (notification: Notification) => {
    // Mark as read
    markAsRead(notification.id);

    // Navigate based on notification type
    switch (notification.notificationType) {
      case 'BID_RECEIVED':
        if (notification.relatedProjectId) {
          onNavigateToProject?.(notification.relatedProjectId);
        }
        break;

      case 'VISIT_REQUEST':
        if (notification.relatedProjectId) {
          onNavigateToProject?.(notification.relatedProjectId);
        }
        break;

      case 'PHASE_COMPLETED':
      case 'PHASE_CREATED':
      case 'PHASE_APPROVED':
        if (notification.relatedProjectId) {
          onNavigateToPhase?.(notification.relatedProjectId, notification.relatedPhaseId);
        }
        break;

      case 'BID_ACCEPTED':
        if (notification.relatedProjectId && notification.relatedBidId) {
          onNavigateToBid?.(notification.relatedProjectId, notification.relatedBidId);
        }
        break;

      default:
        console.log('No action defined for:', notification.notificationType);
    }
  };

  const getFilteredNotifications = () => {
    switch (selectedFilter) {
      case 'unread':
        return notifications.filter((n) => !n.read);
      case 'read':
        return notifications.filter((n) => n.read);
      default:
        return notifications;
    }
  };

  const renderNotificationCard = ({ item }: { item: Notification }) => (
    <NotificationCard
      notification={item}
      onTap={() => handleNotificationTap(item)}
      onDelete={() => deleteNotification(item.id)}
    />
  );

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = getFilteredNotifications();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: colors.text, marginLeft: onBack ? 0 : 16 }]}>
          {t('Notifications')}
        </Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={[styles.markAllRead, { color: colors.primary }]}>
              {t('Mark All Read')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterTabs, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setSelectedFilter('all')}
          style={[
            styles.tab,
            selectedFilter === 'all' && [styles.activeTab, { backgroundColor: colors.primary }],
          ]}
        >
          <Text
            style={[
              styles.tabText,
              selectedFilter === 'all' && { color: '#FFFFFF' },
              { color: colors.textSecondary },
            ]}
          >
            {t('All')} ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedFilter('unread')}
          style={[
            styles.tab,
            selectedFilter === 'unread' && [styles.activeTab, { backgroundColor: colors.primary }],
          ]}
        >
          <Text
            style={[
              styles.tabText,
              selectedFilter === 'unread' && { color: '#FFFFFF' },
              { color: colors.textSecondary },
            ]}
          >
            {t('Unread')} ({unreadCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedFilter('read')}
          style={[
            styles.tab,
            selectedFilter === 'read' && [styles.activeTab, { backgroundColor: colors.primary }],
          ]}
        >
          <Text
            style={[
              styles.tabText,
              selectedFilter === 'read' && { color: '#FFFFFF' },
              { color: colors.textSecondary },
            ]}
          >
            {t('Read')} ({notifications.length - unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {selectedFilter === 'unread' ? t('No unread notifications') : t('No notifications')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

// Notification Card Component
interface NotificationCardProps {
  notification: Notification;
  onTap: () => void;
  onDelete: () => void;
}

function NotificationCard({ notification, onTap, onDelete }: NotificationCardProps) {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();

  const getIconName = (type: string): string => {
    switch (type) {
      case 'BID_RECEIVED':
        return 'hand-left';
      case 'BID_ACCEPTED':
        return 'checkmark-circle';
      case 'VISIT_REQUEST':
        return 'home';
      case 'PHASE_COMPLETED':
        return 'checkmark-done-circle';
      case 'PAYMENT_RECEIVED':
        return 'cash';
      case 'CONTRACT_SIGNED':
        return 'document-text';
      case 'FEEDBACK_RECEIVED':
        return 'chatbubble';
      case 'APPOINTMENT_CONFIRMED':
        return 'calendar';
      default:
        return 'notifications';
    }
  };

  const getIconColor = (type: string): string => {
    switch (type) {
      case 'BID_RECEIVED':
        return '#0080FF';
      case 'BID_ACCEPTED':
        return '#00AA00';
      case 'VISIT_REQUEST':
        return '#FFA500';
      case 'PHASE_COMPLETED':
        return '#00AA00';
      case 'PAYMENT_RECEIVED':
        return '#00AA00';
      case 'CONTRACT_SIGNED':
        return '#9933FF';
      case 'FEEDBACK_RECEIVED':
        return '#0080FF';
      default:
        return '#999999';
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      onPress={onTap}
      onLongPress={() => {
        Alert.alert(t('Delete Notification'), t('Are you sure?'), [
          { text: t('Cancel'), style: 'cancel' },
          { text: t('Delete'), style: 'destructive', onPress: onDelete },
        ]);
      }}
      style={[
        styles.card,
        !notification.read && styles.unreadCard,
        { 
          backgroundColor: notification.read 
            ? colors.cardBackground 
            : theme === 'dark' 
              ? colors.surface 
              : 'rgba(51, 163, 255, 0.08)', // Light blue tint for light mode unread notifications
        },
        !notification.read && { borderColor: colors.primary + '30' }, // 30 = 20% opacity in hex
      ]}
    >
      <View style={styles.cardContent}>
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getIconColor(notification.notificationType) },
          ]}
        >
          <Ionicons name={getIconName(notification.notificationType) as any} size={20} color="#FFFFFF" />
        </View>

        {/* Content */}
        <View style={styles.textContainer}>
          {/* Title with unread dot */}
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {notification.title}
            </Text>
            {!notification.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
          </View>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
            {notification.message}
          </Text>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
              {formatTime(notification.createdAt)}
            </Text>
            {notification.fromUserName && (
              <Text style={[styles.sender, { color: colors.primary }]}>
                {notification.fromUserName}
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  markAllRead: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterTabs: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadCard: {
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  message: {
    fontSize: 12,
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 10,
  },
  sender: {
    fontSize: 10,
    fontWeight: '500',
  },
});

