import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { buildApiUrl, API_ENDPOINTS, getServerBaseUrl } from '../config/api';
import { storage } from '../utils/storage';

interface VoiceAIScreenProps {
  onBack: () => void;
}

interface RecommendedTechnician {
  id: number;
  userId: string;
  name: string;
  profileImage?: string;
  averageRating: number;
  totalReviews: number;
  yearsOfExperience?: number;
  serviceNameEn?: string;
  serviceNameAr?: string;
}

interface VoiceResponse {
  response: string;
  recommendedTechnicians?: RecommendedTechnician[];
  services?: any[];
}

export default function VoiceAIScreen({ onBack }: VoiceAIScreenProps) {
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [aiResponse, setAiResponse] = useState<VoiceResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recording, setRecording] = useState<any>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ar'>(
    i18n.language?.startsWith('ar') ? 'ar' : 'en'
  );
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (sound) {
        sound.unloadAsync().catch(() => {
          // Ignore errors if already unloaded
        });
      }
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {
          // Ignore errors if already unloaded
        });
      }
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
    };
  }, [sound, recording]);

  const startRecording = async () => {
    try {
      // Request permissions
      const permissionResponse = await Audio.requestPermissionsAsync();
      
      if (permissionResponse.status !== 'granted') {
        Alert.alert(
          i18n.language === 'en' ? 'Permission Required' : 'إذن مطلوب',
          i18n.language === 'en' ? 'Microphone permission is needed to record audio' : 'إذن الميكروفون مطلوب للتسجيل'
        );
        return;
      }

      // Clear previous response
      setTranscribedText('');
      setAiResponse(null);

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);

      // Auto-stop after 10 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 10000);
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      Alert.alert(
        t('Error'),
        i18n.language === 'en' ? 'Failed to start recording' : 'فشل بدء التسجيل'
      );
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      setIsRecording(false);
      return;
    }

    try {
      // Clear timeout if manually stopped
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }

      setIsRecording(false);
      setIsProcessing(true);

      // Store reference to current recording
      const currentRecording = recording;
      
      // Try to get URI before stopping (works on some platforms)
      let uri: string | undefined;
      try {
        uri = currentRecording.getURI();
        console.log('🎤 Recording URI (before stop):', uri);
      } catch (error) {
        console.warn('Could not get URI before stopping, will try after:', error);
      }
      
      // Stop and unload recording
      try {
        await currentRecording.stopAndUnloadAsync();
        
        // If we don't have URI yet, try to get it after stopping
        if (!uri) {
          try {
            uri = currentRecording.getURI();
            console.log('🎤 Recording URI (after stop):', uri);
          } catch (uriError: any) {
            console.warn('Could not get URI after stopping:', uriError);
            // Try getting from status as fallback
            try {
              const status = await currentRecording.getStatusAsync();
              if (status.isLoaded && (status as any).uri) {
                uri = (status as any).uri;
                console.log('🎤 Recording URI (from status):', uri);
              }
            } catch (statusError) {
              console.error('Could not get URI from status:', statusError);
            }
          }
        }
      } catch (error: any) {
        // If already unloaded, try to get URI one more time
        if (error.message?.includes('already been unloaded')) {
          console.warn('Recording already unloaded, trying to get URI...');
          if (!uri) {
            try {
              uri = currentRecording.getURI();
            } catch (uriError) {
              console.warn('Could not get URI from unloaded recording:', uriError);
            }
          }
        } else {
          throw error;
        }
      }

      // Clean up recording reference
      setRecording(null);

      // Transcribe audio if we have a URI
      if (uri) {
        console.log('✅ Using recording URI:', uri);
        await transcribeAudio(uri);
      } else {
        console.error('❌ No recording URI available, skipping transcription');
        setIsProcessing(false);
        Alert.alert(
          t('Error'),
          i18n.language === 'en' ? 'Could not access recording. Please try again.' : 'تعذر الوصول إلى التسجيل. يرجى المحاولة مرة أخرى.'
        );
      }
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      setIsProcessing(false);
      setIsRecording(false);
      setRecording(null);
      Alert.alert(
        t('Error'),
        i18n.language === 'en' ? 'Failed to process recording' : 'فشل معالجة التسجيل'
      );
    }
  };

  const transcribeAudio = async (audioUri: string) => {
    try {
      const token = await storage.getAuthToken();
      const userId = await storage.getUserId();

      // Create FormData
      const formData = new FormData();
      
      // Platform-specific handling for audio file
      if (Platform.OS === 'web') {
        const blobResponse = await fetch(audioUri);
        const blob = await blobResponse.blob();
        formData.append('audioFile', blob, 'recording.m4a');
      } else {
        const fileUri = Platform.OS === 'ios' ? audioUri.replace('file://', '') : audioUri;
        formData.append('audioFile', {
          uri: fileUri,
          type: 'audio/m4a',
          name: 'recording.m4a',
        } as any);
      }

      formData.append('language', preferredLanguage);
      formData.append('languageSource', 'client');
      
      if (userId) {
        formData.append('userId', userId.toString());
      }

      console.log('📤 Sending transcription+chat request to:', buildApiUrl(API_ENDPOINTS.AI.VOICE_TRANSCRIBE_AND_CHAT));

      // Send to API
      const response = await fetch(buildApiUrl(API_ENDPOINTS.AI.VOICE_TRANSCRIBE_AND_CHAT), {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
      });
      
      console.log('📥 Transcription+Chat response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Full response data:', data);
        
        // Extract the response text - handle nested response structure
        let responseText = '';
        let recommendedTechnicians: RecommendedTechnician[] = [];
        
        // Check for nested response.response (from transcribe-and-chat endpoint)
        if (data.response && typeof data.response === 'object' && data.response.response && typeof data.response.response === 'string') {
          responseText = data.response.response;
          recommendedTechnicians = data.response.recommendedTechnicians || [];
        } 
        // Check for direct response string
        else if (data.response && typeof data.response === 'string') {
          responseText = data.response;
          recommendedTechnicians = data.recommendedTechnicians || [];
        } 
        // Check for transcribedText (fallback)
        else if (data.transcribedText && typeof data.transcribedText === 'string') {
          responseText = data.transcribedText;
          recommendedTechnicians = data.recommendedTechnicians || [];
        } 
        // Check for text field
        else if (data.text && typeof data.text === 'string') {
          responseText = data.text;
          recommendedTechnicians = data.recommendedTechnicians || [];
        } 
        // Last resort: show error message
        else {
          responseText = i18n.language === 'en' 
            ? 'Unable to parse AI response. Please try again.' 
            : 'تعذر تحليل رد الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.';
          console.error('❌ Unexpected response format:', data);
        }
        
        // Set transcribed text and AI response
        if (data.transcribedText && typeof data.transcribedText === 'string') {
          setTranscribedText(data.transcribedText);
        }
        
        setAiResponse({
          response: responseText,
          recommendedTechnicians: recommendedTechnicians,
        });

        // Play text-to-speech
        await playTextToSpeech(responseText);
      } else {
        const errorText = await response.text();
        console.log('📥 Error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          Alert.alert(
            t('Error'),
            errorData.error || (i18n.language === 'en' ? 'Failed to transcribe audio' : 'فشل نسخ الصوت')
          );
        } catch {
          Alert.alert(
            t('Error'),
            errorText || (i18n.language === 'en' ? 'Failed to transcribe audio' : 'فشل نسخ الصوت')
          );
        }
      }
    } catch (error: any) {
      console.error('Transcription API Error:', error);
      Alert.alert(
        t('Error'),
        i18n.language === 'en' ? 'Network error. Please try again.' : 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const playTextToSpeech = async (text: string) => {
    try {
      // Stop any currently playing audio
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }

      setIsSpeaking(true);
      const token = await storage.getAuthToken();

      // Call text-to-speech API
      const response = await fetch(buildApiUrl(API_ENDPOINTS.AI.VOICE_SPEECH), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          text: text,
          language: preferredLanguage,
        }),
      });

      // Check if response is OK
      if (!response.ok) {
        // Error responses are JSON
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      // ✅ CORRECT: Get binary audio data as blob (NOT JSON!)
      const audioBlob = await response.blob();
      console.log('🔊 Received audio blob, size:', audioBlob.size, 'bytes');

      // Load and play audio
      if (Platform.OS === 'web') {
        // For web, create object URL from blob
        if (typeof window !== 'undefined' && window.Audio && window.URL) {
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new window.Audio(audioUrl);
          webAudioRef.current = audio;
          
          audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl); // Clean up object URL
            webAudioRef.current = null;
          };
          
          audio.onerror = () => {
            console.error('Audio playback error');
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            webAudioRef.current = null;
          };
          
          await audio.play();
        } else {
          console.warn('HTML5 Audio not available');
          setIsSpeaking(false);
        }
      } else {
        // For React Native, convert blob to base64 data URI and play directly
        try {
          // Convert blob to array buffer, then to base64
          const arrayBuffer = await audioBlob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Convert to base64
          let binary = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64Audio = btoa(binary);
          
          // Create data URI
          const dataUri = `data:audio/mpeg;base64,${base64Audio}`;
          console.log('🔊 Created audio data URI, size:', base64Audio.length, 'chars');

          // Load and play audio from data URI
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: dataUri },
            { shouldPlay: true }
          );
          
          setSound(newSound);
          
          newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsSpeaking(false);
              newSound.unloadAsync();
            }
          });
        } catch (error: any) {
          console.error('Error processing audio blob:', error);
          setIsSpeaking(false);
          Alert.alert(
            t('Error'),
            i18n.language === 'en' ? 'Failed to process audio' : 'فشل معالجة الصوت'
          );
        }
      }
    } catch (error: any) {
      console.error('Text-to-speech Error:', error);
      setIsSpeaking(false);
      Alert.alert(
        t('Error'),
        error.message || (i18n.language === 'en' ? 'Failed to generate speech' : 'فشل توليد الصوت')
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name={i18n.language === 'ar' ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {i18n.language === 'en' ? 'Voice AI' : 'الصوت الذكي'}
        </Text>
        <View style={styles.backButton} />
      </View>

      <View style={[styles.languageToggleContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.languageToggleLabel, { color: colors.textSecondary }]}>
          {i18n.language === 'en' ? 'Preferred language' : 'اللغة المفضلة'}
        </Text>
        <TouchableOpacity
          style={[
            styles.languageToggleOption,
            {
              backgroundColor: colors.background,
              borderColor: colors.primary,
            },
          ]}
          onPress={() => setPreferredLanguage(preferredLanguage === 'en' ? 'ar' : 'en')}
          activeOpacity={0.85}
        >
          <Ionicons
            name="globe-outline"
            size={16}
            color={colors.primary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.languageToggleText, { color: colors.primary }]}>
            {preferredLanguage === 'en' ? 'English' : 'العربية'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        <View style={styles.iconContainer}>
          <View style={[styles.circle, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="mic" size={80} color={colors.primary} />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {i18n.language === 'en' ? 'Talk to Bonyad' : 'تحدث مع بونياد'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {i18n.language === 'en' 
            ? 'Press and hold to record. Recording stops automatically after 10 seconds.' 
            : 'اضغط للتسجيل. يتوقف التسجيل تلقائياً بعد 10 ثوانٍ.'}
        </Text>

        {/* Transcription Display */}
        {transcribedText ? (
          <View style={[styles.transcriptionBox, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {i18n.language === 'en' ? 'You said:' : 'قلت:'}
            </Text>
            <Text style={[styles.transcriptionText, { color: colors.text }]}>{transcribedText}</Text>
          </View>
        ) : null}

        {/* AI Response Display */}
        {aiResponse && (
          <View style={[styles.responseBox, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.responseHeader}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {i18n.language === 'en' ? 'Bonyad AI:' : 'بونياد الذكي:'}
              </Text>
              <TouchableOpacity
                onPress={() => playTextToSpeech(aiResponse.response)}
                style={[styles.replayButton, { backgroundColor: colors.primary }]}
                disabled={isSpeaking}
              >
                {isSpeaking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="play" size={16} color="#fff" />
                    <Text style={styles.replayButtonText}>
                      {i18n.language === 'en' ? 'Replay' : 'إعادة التشغيل'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <Text style={[styles.responseText, { color: colors.text }]}>{aiResponse.response}</Text>

            {/* Show recommended technicians */}
            {aiResponse.recommendedTechnicians && aiResponse.recommendedTechnicians.length > 0 && (
              <View style={styles.techniciansContainer}>
                <Text style={[styles.techniciansTitle, { color: colors.textSecondary }]}>
                  {i18n.language === 'en' ? 'Recommended Technicians:' : 'الفنيون الموصى بهم:'}
                </Text>
                {aiResponse.recommendedTechnicians.map((tech, techIndex) => (
                  <View key={techIndex} style={[styles.technicianCard, { backgroundColor: colors.background }]}>
                    {tech.profileImage && (
                      <Image
                        source={{ uri: `${getServerBaseUrl()}${tech.profileImage}` }}
                        style={styles.technicianImage}
                      />
                    )}
                    <View style={styles.technicianInfo}>
                      <Text style={[styles.technicianName, { color: colors.text }]}>{tech.name}</Text>
                      <Text style={[styles.technicianRating, { color: colors.textSecondary }]}>
                        ⭐ {tech.averageRating} ({tech.totalReviews} {i18n.language === 'en' ? 'reviews' : 'تقييمات'})
                      </Text>
                      {tech.yearsOfExperience && (
                        <Text style={[styles.technicianExp, { color: colors.textSecondary }]}>
                          {tech.yearsOfExperience} {i18n.language === 'en' ? 'years experience' : 'سنة خبرة'}
                        </Text>
                      )}
                      {tech.serviceNameEn && (
                        <Text style={[styles.technicianService, { color: colors.primary }]}>
                          {i18n.language === 'ar' ? tech.serviceNameAr : tech.serviceNameEn}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Recording Button */}
        <TouchableOpacity
          onPress={isRecording ? stopRecording : startRecording}
          style={[
            styles.recordButton,
            {
              backgroundColor: isRecording ? colors.error : colors.primary,
            }
          ]}
          disabled={isProcessing || isSpeaking}
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : isSpeaking ? (
            <Ionicons name="volume-high" size={60} color="#fff" />
          ) : (
            <Ionicons name={isRecording ? 'stop' : 'mic'} size={60} color="#fff" />
          )}
        </TouchableOpacity>

        <Text style={[styles.instruction, { color: colors.textSecondary }]}>
          {isRecording
            ? (i18n.language === 'en' ? 'Recording... (Auto-stops in 10s)' : 'جاري التسجيل... (يتوقف تلقائياً بعد 10 ثوانٍ)')
            : isProcessing
            ? (i18n.language === 'en' ? 'Processing...' : 'جاري المعالجة...')
            : isSpeaking
            ? (i18n.language === 'en' ? 'Speaking...' : 'جاري التحدث...')
            : (i18n.language === 'en' ? 'Tap the microphone to start' : 'اضغط على الميكروفون للبدء')
          }
        </Text>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="language" size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              {i18n.language === 'en' ? 'Arabic & English Support' : 'يدعم العربية والإنجليزية'}
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="flash" size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              {i18n.language === 'en' ? 'Auto-stop Recording' : 'إيقاف تلقائي للتسجيل'}
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="volume-high" size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              {i18n.language === 'en' ? 'Voice Response' : 'رد صوتي'}
            </Text>
          </View>
        </View>
      </ScrollView>
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
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  languageToggleContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  languageToggleLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    alignSelf: 'center',
  },
  languageToggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'center',
  },
  languageToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    marginBottom: 30,
    marginTop: 20,
  },
  circle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  transcriptionBox: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    minHeight: 80,
  },
  responseBox: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  replayButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  transcriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 15,
  },
  techniciansContainer: {
    marginTop: 15,
    gap: 10,
  },
  techniciansTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  technicianCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    gap: 12,
    marginBottom: 10,
  },
  technicianImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  technicianInfo: {
    flex: 1,
  },
  technicianName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  technicianRating: {
    fontSize: 14,
    marginBottom: 2,
  },
  technicianExp: {
    fontSize: 12,
    marginBottom: 4,
  },
  technicianService: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  instruction: {
    fontSize: 14,
    marginBottom: 40,
    textAlign: 'center',
  },
  featuresContainer: {
    width: '100%',
    gap: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
  },
});

