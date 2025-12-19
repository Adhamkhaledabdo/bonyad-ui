import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_ENDPOINTS, buildApiUrlWithParams, buildApiUrl, API_BASE_URL } from '../config/api';
import { storage } from '../utils/storage';
import { ChatMessage } from '../types/chat';
import { formatMessageTime } from '../utils/chatUtils';
import MqttChatService from '../services/MqttChatService';
import MessageBubble from '../components/MessageBubble';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VoiceNoteService from '../services/VoiceNoteService';

const ATTACHMENT_PLACEHOLDER = '[Attachment]';
const getDraftStorageKey = (roomId: string, receiverId: number) =>
  `@bonyad_chat_draft_${roomId}_${receiverId}`;

interface ChatDetailScreenProps {
  roomId: string;
  receiverId: number;
  receiverName: string;
  onBack?: () => void;
  projectId?: number | null;
}

export default function ChatDetailScreen({
  roomId,
  receiverId,
  receiverName,
  projectId,
  onBack,
}: ChatDetailScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);
  const draftLoadedRef = useRef(false);

  const loadDraft = useCallback(async () => {
    const key = getDraftStorageKey(roomId, receiverId);
    try {
      const draft = await AsyncStorage.getItem(key);
      draftLoadedRef.current = true;
      if (draft && draft.length > 0) {
        setMessage(draft);
      }
    } catch (error) {
      draftLoadedRef.current = true;
      console.error('❌ Error loading chat draft:', error);
    }
  }, [roomId, receiverId]);

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
  const shouldShowBackButton = !!onBack && !IS_LARGE_WEB;

  useEffect(() => {
    return () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined' && webFileInputRef.current) {
        if (webFileInputRef.current.parentNode) {
          webFileInputRef.current.parentNode.removeChild(webFileInputRef.current);
        }
        webFileInputRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    draftLoadedRef.current = false;
    setMessage('');
    loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    if (!draftLoadedRef.current) {
      return;
    }

    const key = getDraftStorageKey(roomId, receiverId);

    const saveDraft = async () => {
      try {
        if (message && message.length > 0) {
          await AsyncStorage.setItem(key, message);
        } else {
          await AsyncStorage.removeItem(key);
        }
      } catch (error) {
        console.error('❌ Error saving chat draft:', error);
      }
    };

    saveDraft();
  }, [message, roomId, receiverId]);

  useEffect(() => {
    // Load messages first (this should always work)
    loadMessages().catch((error) => {
      console.error('❌ Failed to load messages:', error);
      setIsLoading(false);
    });
    
    // Setup MQTT (non-blocking - chat should work even if MQTT fails)
    setupMqtt().catch((error) => {
      console.error('❌ Failed to setup MQTT (non-critical):', error);
      // Don't block the UI - chat can work without live updates
    });
    
    return () => {
      try {
        MqttChatService.disconnect();
      } catch (error) {
        console.error('❌ Error disconnecting MQTT:', error);
      }
    };
  }, []);

  const setupMqtt = async () => {
    try {
      console.log('🔌 [MQTT] Attempting to connect to room:', roomId);
      
      // Connect to MQTT and subscribe to room with callbacks
      const connected = await MqttChatService.subscribeToRoomWithCallbacks(roomId, {
        onMessage: async (newMessage: ChatMessage) => {
          try {
            console.log('📨 [MQTT] New message received:', newMessage);
            console.log('📨 Message ID:', newMessage.id);

            // Get current user ID to determine if message is mine
            const currentUserId = await storage.getUserId();
            const isMine = newMessage.senderId === currentUserId;
            console.log('📨 Is mine?', isMine, 'senderId:', newMessage.senderId, 'myId:', currentUserId);

            // Add to messages if not already present
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMessage.id)) {
                console.log('📨 Message already exists, skipping');
                return prev; // Already exists
              }
              console.log('📨 [setMessages] Adding message');
              return [...prev, { ...newMessage, isMine }];
            });

            // Auto-scroll to bottom
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);

            // Mark as read if from other user
            if (!isMine) {
              markMessageAsRead(newMessage.id).catch((err) => {
                console.error('❌ Failed to mark message as read:', err);
              });
            }
          } catch (error: any) {
            console.error('❌ Error handling MQTT message:', error);
          }
        },
        onReadReceipt: (messageId: number, isRead: boolean) => {
          try {
            console.log(`✓✓ [MQTT] Read receipt: Message ${messageId} read: ${isRead}`);
            setMessages((prev) =>
              prev.map((msg) => (msg.id === messageId ? { ...msg, isRead } : msg))
            );
          } catch (error: any) {
            console.error('❌ Error handling read receipt:', error);
          }
        },
      });

      if (!connected) {
        console.warn('⚠️ [MQTT] Failed to connect - chat will work but without live updates');
        return;
      }

      console.log('✅ [MQTT] Connected and callbacks set up');
    } catch (error: any) {
      console.error('❌ [MQTT] Failed to setup (non-critical):', error);
      console.error('❌ [MQTT] Error details:', error?.message || error);
      // Don't throw - allow chat to work without MQTT
    }
  };

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const token = await storage.getAuthToken();
      if (!token) {
        console.error('❌ No auth token found');
        Alert.alert(t('Error'), t('Please login to view messages'));
        setIsLoading(false);
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.CHAT.MESSAGES, {
        roomId,
      }) + '?limit=100';

      console.log('🔍 Fetching messages from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 Messages API Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const currentUserId = await storage.getUserId();

        // Add isMine property to each message
        const messagesWithOwnership = data.map((msg: ChatMessage) => ({
          ...msg,
          isMine: msg.senderId === currentUserId,
        }));

        setMessages(messagesWithOwnership);
        console.log('✅ Loaded messages:', messagesWithOwnership.length);

        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 300);

        // Mark unread messages as read (non-blocking)
        markAllMessagesAsRead().catch((err) => {
          console.error('❌ Failed to mark messages as read:', err);
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load messages - Status:', response.status);
        console.error('❌ Error response:', errorText);
        Alert.alert(t('Error'), t('Failed to load messages'));
      }
    } catch (error: any) {
      console.error('❌ Error loading messages:', error);
      Alert.alert(t('Error'), error?.message || t('Failed to load messages'));
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const messageText = message;
    setMessage('');
    setIsSending(true);

    try {
      const token = await storage.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = buildApiUrl(API_ENDPOINTS.CHAT.SEND);
      console.log('📤 Sending message to:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: receiverId,
          content: messageText,
          projectId: projectId ?? undefined,
        }),
      });

      console.log('📥 Send Message Response Status:', response.status);

      if (response.ok) {
        const newMessage = await response.json();
        console.log('✅ Message sent, ID:', newMessage.id);
        // MQTT will deliver the message to UI automatically
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      Alert.alert(t('Error'), error.message || t('Failed to send message'));
      setMessage(messageText); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const markMessageAsRead = async (messageId: number) => {
    try {
      const token = await storage.getAuthToken();
      if (!token) return;

      const url = buildApiUrlWithParams(API_ENDPOINTS.CHAT.MARK_READ, {
        messageId,
      });

      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Message marked as read:', messageId);
    } catch (error) {
      console.error('❌ Failed to mark as read:', error);
    }
  };

  const markAllMessagesAsRead = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) return;

      const url = buildApiUrlWithParams(API_ENDPOINTS.CHAT.MARK_ALL_READ, {
        roomId,
      });

      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ All messages marked as read');
    } catch (error) {
      console.error('❌ Failed to mark all as read:', error);
    }
  };

  const uploadAttachment = async (payload: { file?: File; uri?: string; name: string; type: string; duration?: number }) => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        throw new Error(i18n.language === 'en' ? 'You must be logged in to send attachments' : 'يجب تسجيل الدخول لإرسال المرفقات');
      }

      setIsUploadingAttachment(true);
      const formData = new FormData();

      const trimmedMessage = message.trim();
      const contentToSend = trimmedMessage.length > 0 ? trimmedMessage : ATTACHMENT_PLACEHOLDER;
      formData.append('receiverId', String(receiverId));
      formData.append('content', contentToSend);
      if (projectId) {
        formData.append('projectId', String(projectId));
      }
      // Add duration for voice notes if available
      if (payload.duration !== undefined && payload.duration !== null) {
        formData.append('duration', String(payload.duration));
      }

      console.log('📤 [ChatDetailScreen] Uploading attachment', {
        roomId,
        receiverId,
        hasCaption: Boolean(trimmedMessage),
        projectId: projectId ?? null,
        name: payload.name,
        type: payload.type,
        isVoiceNote: payload.type === 'audio/m4a',
        duration: payload.duration,
      });

      if (payload.file) {
        formData.append('file', payload.file, payload.name);
      } else if (payload.uri) {
        formData.append('file', {
          uri: payload.uri,
          type: payload.type || 'application/octet-stream',
          name: payload.name || `attachment-${Date.now()}`,
        } as any);
      } else {
        throw new Error('Invalid attachment payload');
      }

      const response = await fetch(buildApiUrl(API_ENDPOINTS.CHAT.SEND_WITH_FILE), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('📥 [ChatDetailScreen] Attachment upload status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [ChatDetailScreen] Attachment upload failed response:', errorText);
        throw new Error(errorText || 'Failed to send attachment');
      }

      // For voice notes, reload messages to get the correct duration from server
      // MQTT will deliver the message, but we reload to ensure duration is correct
      if (payload.type === 'audio/m4a' && payload.duration) {
        console.log('🔄 [ChatDetailScreen] Reloading messages after voice note upload to get correct duration');
        setTimeout(() => {
          loadMessages().catch(console.error);
        }, 500); // Small delay to allow server to process
      }
      
      // MQTT will deliver the new message; no local state update needed
      if (trimmedMessage) {
        setMessage('');
      }
    } catch (error: any) {
      console.error('❌ Attachment upload failed:', error);
      Alert.alert(
        t('Error'),
        error?.message || (i18n.language === 'en' ? 'Failed to upload attachment' : 'فشل رفع المرفق')
      );
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleAttachmentPress = async () => {
    if (isUploadingAttachment || isRecording) {
      return;
    }

    try {
      if (Platform.OS === 'web') {
        if (typeof document === 'undefined') {
          return;
        }
        if (!webFileInputRef.current) {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '*/*';
          input.style.display = 'none';
          input.onchange = async (event: Event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) {
              await uploadAttachment({
                file,
                name: file.name || `attachment-${Date.now()}`,
                type: file.type || 'application/octet-stream',
              });
            }
            target.value = '';
          };
          document.body.appendChild(input);
          webFileInputRef.current = input;
        }

        webFileInputRef.current.click();
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      // Expo DocumentPicker v11 returns {assets, canceled}
      const asset = (result as any)?.assets?.[0];

      if ((result as any)?.canceled || (result as any)?.type === 'cancel') {
        return;
      }

      const uri = asset?.uri ?? (result as any)?.uri;
      const name = asset?.name ?? (result as any)?.name ?? `attachment-${Date.now()}`;
      const mimeType = asset?.mimeType ?? (result as any)?.mimeType ?? 'application/octet-stream';

      if (!uri) {
        throw new Error(i18n.language === 'en' ? 'Unable to access selected file' : 'تعذر الوصول إلى الملف المحدد');
      }

      await uploadAttachment({
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name,
        type: mimeType,
      });
    } catch (error) {
      if ((error as any)?.code === 'DOCUMENT_PICKER_CANCELED') {
        return;
      }
      console.error('❌ Attachment picker error:', error);
      Alert.alert(
        t('Error'),
        i18n.language === 'en' ? 'Failed to choose attachment' : 'فشل اختيار المرفق'
      );
    }
  };

  const handleStartRecording = async () => {
    if (isRecording || isUploadingAttachment) {
      return;
    }

    try {
      setRecordingDuration(0);
      const started = await VoiceNoteService.startRecording((duration) => {
        setRecordingDuration(duration);
      });

      if (started) {
        setIsRecording(true);
      }
    } catch (error: any) {
      console.error('❌ Failed to start recording:', error);
      Alert.alert(
        t('Error'),
        i18n.language === 'en' ? 'Failed to start recording' : 'فشل بدء التسجيل'
      );
    }
  };

  const handleStopRecording = async () => {
    if (!isRecording) {
      return;
    }

    try {
      const result = await VoiceNoteService.stopRecording();
      setIsRecording(false);
      setRecordingDuration(0);

      if (!result) {
        Alert.alert(
          t('Error'),
          i18n.language === 'en' ? 'Failed to stop recording' : 'فشل إيقاف التسجيل'
        );
        return;
      }

      // Send the voice note - ALWAYS as m4a format
      const fileName = `voice_${Date.now()}.m4a`;
      const mimeType = 'audio/m4a'; // Always use m4a mimeType

      if (Platform.OS === 'web') {
        // Web: Convert blob URL to File with m4a format
        try {
          const response = await fetch(result.uri);
          if (!response.ok) {
            throw new Error(`Failed to fetch blob: ${response.status}`);
          }
          
          const blob = await response.blob();
          
          if (blob.size === 0) {
            throw new Error('Blob is empty');
          }

          const file = new File([blob], fileName, {
            type: mimeType, // Always audio/m4a
          });

          console.log('📤 [ChatDetailScreen] Sending voice note as m4a:', {
            fileName,
            mimeType,
            blobSize: blob.size,
            fileSize: file.size,
            duration: result.duration
          });

          await uploadAttachment({
            file,
            name: fileName,
            type: mimeType,
            duration: result.duration,
          });
        } catch (error: any) {
          console.error('❌ [ChatDetailScreen] Error preparing voice note file:', error);
          throw error;
        }
      } else {
        // Native: Use URI directly with m4a format
        console.log('📤 [ChatDetailScreen] Sending voice note as m4a:', {
          fileName,
          mimeType,
          uri: result.uri,
          duration: result.duration
        });

        await uploadAttachment({
          uri: result.uri,
          name: fileName,
          type: mimeType,
          duration: result.duration,
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to stop recording:', error);
      setIsRecording(false);
      setRecordingDuration(0);
      Alert.alert(
        t('Error'),
        i18n.language === 'en' ? 'Failed to send voice note' : 'فشل إرسال الرسالة الصوتية'
      );
    }
  };

  const handleCancelRecording = async () => {
    if (!isRecording) {
      return;
    }

    try {
      await VoiceNoteService.cancelRecording();
      setIsRecording(false);
      setRecordingDuration(0);
    } catch (error: any) {
      console.error('❌ Failed to cancel recording:', error);
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <MessageBubble message={item} isMine={item.isMine || false} />
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingBottom: IS_LARGE_WEB ? 0 : Math.max(insets.bottom + 96, 140),
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
            {receiverName}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
            {t('Loading messages...')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingBottom: IS_LARGE_WEB ? 0 : Math.max(insets.bottom + 80, 120),
        },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
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
          {receiverName}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.messagesList,
          {
            paddingBottom: IS_LARGE_WEB ? 0 : Math.max(insets.bottom + 120, 160),
          },
        ]}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        showsVerticalScrollIndicator={false}
      />

      {/* Recording Indicator */}
      {isRecording && (
        <View
          style={[
            styles.recordingContainer,
            {
              backgroundColor: colors.cardBackground,
              borderTopColor: colors.border,
            },
          ]}
        >
          <View style={styles.recordingInfo}>
            <View style={[styles.recordingDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.recordingText, { color: colors.text }]}>
              {t('Recording')}... {formatDuration(recordingDuration)}
            </Text>
          </View>
          <View style={styles.recordingActions}>
            <TouchableOpacity
              onPress={handleCancelRecording}
              style={[styles.cancelButton, { backgroundColor: colors.error }]}
            >
              <Text style={[styles.cancelButtonText, { color: colors.white }]}>{t('Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleStopRecording}
              style={[styles.stopButton, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="stop" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Input Field */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.cardBackground,
            borderTopColor: colors.border,
            paddingBottom: IS_LARGE_WEB ? 0 : Math.max(insets.bottom - 8, 10),
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleAttachmentPress}
          style={styles.attachmentButton}
          disabled={isUploadingAttachment || isRecording}
        >
          {isUploadingAttachment ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="attach" size={24} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

        {!isRecording ? (
          <>
            <TouchableOpacity
              onPress={handleStartRecording}
              style={styles.voiceButton}
              disabled={isUploadingAttachment}
            >
              <Ionicons name="mic" size={24} color={colors.primary} />
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder={t('Type message...')}
              placeholderTextColor={colors.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
              onKeyPress={(event) => {
                if (Platform.OS === 'web') {
                  const nativeEvent = event.nativeEvent as any;
                  if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }
              }}
            />

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!message.trim() || isSending}
              style={styles.sendButton}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons
                  name="send"
                  size={24}
                  color={message.trim() ? colors.primary : colors.textSecondary}
                />
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.recordingInputPlaceholder}>
            <Text style={[styles.recordingPlaceholderText, { color: colors.textSecondary }]}>
              {t('Recording voice note...')}
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
    fontSize: 18,
    fontWeight: '600',
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
  messagesList: {
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  attachmentButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    padding: 8,
  },
  voiceButton: {
    padding: 8,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingInputPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  recordingPlaceholderText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

// Helper function to format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

