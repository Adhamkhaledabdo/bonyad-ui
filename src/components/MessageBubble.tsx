import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Linking, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio as ExpoAudio } from 'expo-av';
import { ChatMessage } from '../types/chat';
import { formatMessageTime } from '../utils/chatUtils';
import { API_BASE_URL } from '../config/api';
import ReadReceipt from './ReadReceipt';

// For web, use browser's native Audio; for native, use Expo Audio
const Audio = Platform.OS === 'web' 
  ? (typeof window !== 'undefined' ? (window as any).Audio : null)
  : ExpoAudio;

const ATTACHMENT_PLACEHOLDER = '[Attachment]';

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
}

export default function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const normalizedFileType = message.fileType?.toLowerCase?.() ?? '';
  const hasFile = Boolean(message.fileUrl);
  const fullFileUrl = message.fileUrl?.startsWith('http')
    ? message.fileUrl
    : message.fileUrl
      ? `${API_BASE_URL.replace('/api', '')}${message.fileUrl}`
      : null;
  const derivedFileName = fullFileUrl
    ? decodeURIComponent(fullFileUrl.split('/').pop() || '').split('?')[0]
    : undefined;
  const displayFileName = message.fileName || derivedFileName || 'Attachment';
  const shouldShowText =
    Boolean(message.content && message.content.trim().length > 0) &&
    message.content !== ATTACHMENT_PLACEHOLDER;
  
  const isVoiceNote = normalizedFileType.includes('audio') || 
                      normalizedFileType.includes('m4a') || 
                      normalizedFileType.includes('mp3') ||
                      normalizedFileType.includes('webm') ||
                      normalizedFileType.includes('voice');

  return (
    <View
      style={[
        styles.container,
        isMine ? styles.myMessage : styles.theirMessage,
      ]}
    >
      {/* File Attachment */}
      {hasFile && fullFileUrl && (
        <View style={styles.attachment}>
          {isVoiceNote ? (
            <VoiceNotePlayer 
              uri={fullFileUrl} 
              duration={message.duration || 0}
              isMine={isMine}
            />
          ) : normalizedFileType.startsWith('image') ? (
            <Image source={{ uri: fullFileUrl }} style={styles.imageAttachment} resizeMode="cover" />
          ) : normalizedFileType.includes('pdf') ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(fullFileUrl)}
              style={styles.pdfAttachment}
            >
              <Ionicons name="document-attach" size={24} color="#FF0000" />
              <Text style={styles.pdfText}>{displayFileName}</Text>
              <Text style={styles.tapText}>Tap to view</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => Linking.openURL(fullFileUrl)}
              style={styles.genericAttachment}
            >
              <Ionicons name="document-text-outline" size={22} color="#555" />
              <Text style={styles.genericFileName}>
                {displayFileName}
              </Text>
              <Text style={styles.tapText}>Tap to open</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Text Content */}
      {shouldShowText && (
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMine ? styles.myText : styles.theirText]}>
            {message.content}
          </Text>
        </View>
      )}

      {/* Timestamp and Read Receipt */}
      <View style={styles.footer}>
        <Text style={styles.timestamp}>{formatMessageTime(message.createdAt)}</Text>
        {isMine && <ReadReceipt isRead={message.isRead || false} />}
      </View>
    </View>
  );
}

// Voice Note Player Component
function VoiceNotePlayer({ 
  uri, 
  duration, 
  isMine 
}: { 
  uri: string; 
  duration: number; 
  isMine: boolean;
}) {
  const [sound, setSound] = useState<ExpoAudio.Sound | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  // Initialize audio on mount
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web: Create HTML5 Audio element using browser's native Audio
      if (!Audio) {
        console.error('❌ [Web] Browser Audio API not available');
        return;
      }
      const audio = new Audio(uri);
      audio.preload = 'auto';
      
      audio.onended = () => {
        setIsPlaying(false);
        setPosition(0);
      };
      
      audio.ontimeupdate = () => {
        setPosition(audio.currentTime);
      };
      
      audio.onerror = (e) => {
        console.error('❌ [Web] Audio error:', e);
        setIsPlaying(false);
      };
      
      setAudioElement(audio);
      
      return () => {
        audio.pause();
        audio.src = '';
        setAudioElement(null);
      };
    } else {
      // Native: Load audio with Expo AV
      let isMounted = true;
      let soundInstance: any = null;
      
      // Check if ExpoAudio is available
      if (!ExpoAudio || !ExpoAudio.Sound) {
        console.error('❌ [Native] ExpoAudio.Sound is not available');
        return () => {};
      }
      
      ExpoAudio.Sound.createAsync(
        { uri },
        { shouldPlay: false }
      ).then(({ sound: newSound }) => {
        if (isMounted) {
          soundInstance = newSound;
          setSound(newSound);
          
          newSound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.isLoaded) {
              setIsPlaying(status.isPlaying);
              setPosition(status.positionMillis / 1000);
              if (status.didJustFinish) {
                setPosition(0);
                setIsPlaying(false);
              }
            }
          });
        } else {
          // Component unmounted, clean up
          newSound.unloadAsync().catch(console.error);
        }
      }).catch((error) => {
        console.error('❌ [Native] Error loading audio:', error);
      });
      
      return () => {
        isMounted = false;
        if (soundInstance) {
          soundInstance.unloadAsync().catch(console.error);
        }
      };
    }
  }, [uri]);

  const playPause = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web: Use persisted HTML5 Audio element
        if (!audioElement) {
          console.error('❌ [Web] Audio element not initialized');
          return;
        }
        
        if (isPlaying) {
          audioElement.pause();
          setIsPlaying(false);
        } else {
          try {
            await audioElement.play();
            setIsPlaying(true);
          } catch (error: any) {
            console.error('❌ [Web] Error playing audio:', error);
            setIsPlaying(false);
            // Try to reload and play
            audioElement.load();
            try {
              await audioElement.play();
              setIsPlaying(true);
            } catch (retryError) {
              console.error('❌ [Web] Retry failed:', retryError);
            }
          }
        }
      } else {
        // Native: Use Expo AV
        if (!sound) {
          console.error('❌ [Native] Sound not loaded');
          return;
        }
        
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            if (status.isPlaying) {
              await sound.pauseAsync();
              setIsPlaying(false);
            } else {
              await sound.playAsync();
              setIsPlaying(true);
            }
          }
        } catch (error: any) {
          console.error('❌ [Native] Error playing/pausing:', error);
          setIsPlaying(false);
        }
      }
    } catch (error) {
      console.error('❌ Error playing voice note:', error);
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <TouchableOpacity
      onPress={playPause}
      style={[
        styles.voiceNoteContainer,
        isMine ? styles.myVoiceNote : styles.theirVoiceNote,
      ]}
    >
      <View style={styles.voiceNoteContent}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={24}
          color={isMine ? '#FFFFFF' : '#2196F3'}
        />
        <View style={styles.voiceNoteInfo}>
          <View style={styles.voiceNoteProgressBar}>
            <View
              style={[
                styles.voiceNoteProgress,
                {
                  width: `${progress}%`,
                  backgroundColor: isMine ? '#FFFFFF' : '#2196F3',
                },
              ]}
            />
          </View>
          <Text style={[styles.voiceNoteDuration, isMine && styles.myVoiceNoteText]}>
            {formatTime(position || duration)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '75%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  attachment: {
    marginBottom: 8,
  },
  imageAttachment: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  pdfAttachment: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    minWidth: 150,
  },
  genericAttachment: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
    minWidth: 150,
  },
  pdfText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  genericFileName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  tapText: {
    fontSize: 10,
    color: '#666',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#2196F3',
  },
  theirBubble: {
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: '#FFFFFF',
  },
  theirText: {
    color: '#000000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
  },
  voiceNoteContainer: {
    padding: 12,
    borderRadius: 16,
    minWidth: 200,
    maxWidth: 250,
  },
  myVoiceNote: {
    backgroundColor: '#2196F3',
  },
  theirVoiceNote: {
    backgroundColor: '#E5E5EA',
  },
  voiceNoteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voiceNoteInfo: {
    flex: 1,
    gap: 4,
  },
  voiceNoteProgressBar: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  voiceNoteProgress: {
    height: '100%',
    borderRadius: 2,
  },
  voiceNoteDuration: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  myVoiceNoteText: {
    color: '#FFFFFF',
  },
});

