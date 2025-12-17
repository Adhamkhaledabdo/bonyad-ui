import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
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
  const { fontFamily, scaledSize } = useFontFamily();
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
        onBack?.();
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
        onBack?.();
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

  // Group notifications by time period
  const groupNotificationsByTime = (notifs: Notification[]) => {
    const now = new Date();
    const groups: { [key: string]: Notification[] } = {
      Today: [],
      Yesterday: [],
      '1 Week Ago': [],
      '1 Month Ago': [],
    };

    notifs.forEach((notif) => {
      const createdDate = new Date(notif.createdAt);
      const diffMs = now.getTime() - createdDate.getTime();
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffDays === 0) {
        groups['Today'].push(notif);
      } else if (diffDays === 1) {
        groups['Yesterday'].push(notif);
      } else if (diffDays <= 7) {
        groups['1 Week Ago'].push(notif);
      } else {
        groups['1 Month Ago'].push(notif);
      }
    });

    // Convert to sections array
    return Object.keys(groups)
      .filter(key => groups[key].length > 0)
      .map(key => ({
        title: key,
        data: groups[key],
      }));
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
  const sections = useMemo(() => groupNotificationsByTime(filteredNotifications), [filteredNotifications]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
        <ActivityIndicator size="large" color="#005DAC" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#FFFFFF' }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#003867" />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: '#003867', marginLeft: onBack ? 0 : 16, fontSize: scaledSize(18) }]}>
          {t('Notifications')}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterTabs, { backgroundColor: '#FFFFFF' }]}>
        <TouchableOpacity
          onPress={() => setSelectedFilter('all')}
          style={[
            styles.tab,
            selectedFilter === 'all' && styles.activeTab,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              selectedFilter === 'all' ? styles.activeTabText : styles.inactiveTabText,
              { fontSize: scaledSize(14) },
            ]}
          >
            {t('All')} ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedFilter('unread')}
          style={[
            styles.tab,
            selectedFilter === 'unread' && styles.activeTab,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              selectedFilter === 'unread' ? styles.activeTabText : styles.inactiveTabText,
              { fontSize: scaledSize(14) },
            ]}
          >
            {t('Unread')} ({unreadCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedFilter('read')}
          style={[
            styles.tab,
            selectedFilter === 'read' && styles.activeTab,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              selectedFilter === 'read' ? styles.activeTabText : styles.inactiveTabText,
              { fontSize: scaledSize(14) },
            ]}
          >
            {t('Read')} ({notifications.length - unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <SectionList
        sections={sections}
        renderItem={renderNotificationCard}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderSectionFooter={() => <View style={styles.sectionDivider} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#005DAC"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={64}
              color="#A3A3A3"
            />
            <Text style={[styles.emptyText, { color: '#A3A3A3' }]}>
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
  const { t } = useTranslation();

  const getIconName = (type: string): string => {
    switch (type) {
      case 'BID_RECEIVED':
      case 'BID_ACCEPTED':
        return 'cash-outline';
      case 'VISIT_REQUEST':
        return 'home-outline';
      case 'PHASE_COMPLETED':
      case 'PHASE_CREATED':
      case 'PHASE_APPROVED':
        return 'clipboard-outline';
      case 'PAYMENT_RECEIVED':
        return 'card-outline';
      case 'CONTRACT_SIGNED':
        return 'document-text-outline';
      case 'FEEDBACK_RECEIVED':
        return 'chatbubble-outline';
      case 'APPOINTMENT_CONFIRMED':
        return 'calendar-outline';
      default:
        return 'notifications-outline';
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return date.toLocaleDateString();
  };

  // All icons are blue, unread has blue border
  const iconColor = '#005DAC';
  const titleColor = notification.read ? '#383838' : '#003867';

  return (
    <>
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
      ]}
    >
      {/* Top row: Icon + Title on left, Clock + Time on right */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardLeft}>
          <Ionicons name={getIconName(notification.notificationType) as any} size={16} color={iconColor} />
          <Text style={[styles.cardTitle, { color: titleColor }]} numberOfLines={1}>
            {notification.title}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Ionicons name="time-outline" size={16} color="#A3A3A3" />
          <Text style={styles.timestamp}>
            {formatTime(notification.createdAt)}
          </Text>
        </View>
      </View>

      {/* Message */}
      <Text style={styles.message}>
        {notification.message}
      </Text>
    </TouchableOpacity>
    <View style={{ height: 20 }} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  backButton: {
    marginRight: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '400',
    flex: 1,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
  },
  activeTab: {
    backgroundColor: '#005DAC',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  inactiveTabText: {
    color: '#A3A3A3',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '500',
    color: '#003867',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#D9D9D9',
    marginVertical: 10,
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
    paddingVertical: 16,
    gap: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  unreadCard: {
    borderWidth: 1,
    borderColor: '#005DAC',
    backgroundColor: 'rgba(0, 93, 172, 0.05)',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
    width: 154,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    color: '#383838',
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 14,
    fontWeight: '400',
    color: '#A3A3A3',
  },
});

