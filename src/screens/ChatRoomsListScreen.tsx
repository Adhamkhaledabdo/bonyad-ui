import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  AppState,
  Platform,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl, API_BASE_URL } from '../config/api';
import { storage } from '../utils/storage';
import { ChatRoom } from '../types/chat';
import { formatRelativeTime } from '../utils/chatUtils';

interface ChatRoomsListScreenProps {
  onBack?: () => void;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => void;
}

export default function ChatRoomsListScreen({ onBack, onOpenChat }: ChatRoomsListScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const appState = useRef(AppState.currentState);
  
  // Responsive state - updates on window resize
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  // Update screen width on resize
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Calculate responsive breakpoints
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  // On large web screens, don't show back button when embedded in tabs
  const shouldShowBackButton = onBack && !IS_LARGE_WEB;

  useEffect(() => {
    // Load chat rooms with error handling
    loadChatRooms().catch((error) => {
      console.error('❌ Failed to load chat rooms:', error);
      setIsLoading(false);
    });

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('📱 App came to foreground, refreshing chats...');
        loadChatRooms().catch((error) => {
          console.error('❌ Failed to refresh chat rooms:', error);
        });
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const loadChatRooms = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        console.error('❌ No auth token found');
        Alert.alert(t('Error'), t('Please login to view chats'));
        return;
      }

      const url = buildApiUrl(API_ENDPOINTS.CHAT.MY_CHATS);
      console.log('🔍 Fetching chat rooms from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 Chat Rooms API Response Status:', response.status);

      if (response.ok) {
        // Check if response has content
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('❌ Response is not JSON. Content-Type:', contentType);
          throw new Error('Invalid response format: expected JSON');
        }

        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
          console.warn('⚠️ Empty response, using empty array');
          setChatRooms([]);
          return;
        }

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ Failed to parse JSON response:', parseError);
          console.error('❌ Response text:', responseText);
          throw new Error('Invalid JSON response from server');
        }

        console.log('✅ Raw API response:', JSON.stringify(responseData, null, 2));
        
        // Handle different response formats
        let chatRoomsData: ChatRoom[] = [];
        
        if (Array.isArray(responseData)) {
          // Direct array response
          chatRoomsData = responseData;
        } else if (responseData && Array.isArray(responseData.data)) {
          // Wrapped in { data: [...] }
          chatRoomsData = responseData.data;
        } else if (responseData && Array.isArray(responseData.rooms)) {
          // Wrapped in { rooms: [...] }
          chatRoomsData = responseData.rooms;
        } else if (responseData && Array.isArray(responseData.chatRooms)) {
          // Wrapped in { chatRooms: [...] }
          chatRoomsData = responseData.chatRooms;
        } else if (responseData === null || responseData === undefined) {
          console.warn('⚠️ Response is null/undefined, using empty array');
          chatRoomsData = [];
        } else {
          console.error('❌ Unexpected response format:', responseData);
          console.error('❌ Response type:', typeof responseData);
          throw new Error('Invalid response format: expected array or object with array property');
        }
        
        console.log('✅ Loaded chat rooms:', chatRoomsData);
        console.log('📊 Number of rooms:', chatRoomsData.length);
        setChatRooms(chatRoomsData);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load chat rooms - Status:', response.status);
        console.error('❌ Error response:', errorText);
        Alert.alert(t('Error'), t('Failed to load chats'));
      }
    } catch (error: any) {
      console.error('❌ Error loading chat rooms:', error);
      Alert.alert(t('Error'), error.message || t('Failed to load chats'));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadChatRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChatRoomPress = (room: ChatRoom) => {
    if (onOpenChat) {
      onOpenChat(room.roomId, room.otherUserId, room.otherUserName, room.projectId);
    }
  };

  const renderChatRoom = ({ item }: { item: ChatRoom }) => {
    const profileImageUrl = item.otherUserProfileImage?.startsWith('http')
      ? item.otherUserProfileImage
      : item.otherUserProfileImage
        ? `${API_BASE_URL.replace('/api', '')}${item.otherUserProfileImage}`
        : null;

    return (
      <TouchableOpacity
        style={[styles.chatRoomCard, { backgroundColor: colors.cardBackground }]}
        onPress={() => handleChatRoomPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.chatRoomContent}>
          {/* Profile Image */}
          <View style={styles.avatarContainer}>
            {profileImageUrl ? (
              <Image
                source={{ uri: profileImageUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.avatarText, { color: colors.primary, fontSize: scaledSize(18) }]}>
                  {item.otherUserName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Chat Info */}
          <View style={styles.chatInfo}>
            <View style={styles.headerRow}>
              <Text style={[styles.userName, { color: colors.text, fontSize: scaledSize(16) }]}>
                {item.otherUserName}
              </Text>
              <Text style={[styles.timestamp, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                {formatRelativeTime(item.lastMessageAt)}
              </Text>
            </View>

            <View style={styles.messageRow}>
              <Text
                style={[styles.lastMessage, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.lastMessage || t('No messages yet')}
              </Text>

              {/* Unread Badge */}
              {item.unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.error }]}>
                  <Text style={[styles.unreadText, { color: colors.white }]}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Chevron */}
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingBottom: Math.max(insets.bottom + 96, 140),
          },
        ]}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
          {shouldShowBackButton ? (
            <TouchableOpacity onPress={onBack}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
            {t('Chat')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
            {t('Loading chats...')}
          </Text>
        </View>
      </View>
    );
  }

  if (chatRooms.length === 0) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingBottom: Math.max(insets.bottom + 96, 140),
          },
        ]}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
          {shouldShowBackButton ? (
            <TouchableOpacity onPress={onBack}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
            {t('Chat')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={80} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
            {t('No chats yet')}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
            {t('Start a conversation to begin chatting')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingBottom: Math.max(insets.bottom + 96, 140),
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
        {shouldShowBackButton ? (
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
          {t('Chat')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Chat Rooms List */}
      <FlatList
        data={chatRooms}
        renderItem={renderChatRoom}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: Math.max(insets.bottom + 96, 140),
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  chatRoomCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  chatRoomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  avatarContainer: {
    width: 56,
    height: 56,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

