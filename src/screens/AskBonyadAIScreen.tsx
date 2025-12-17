import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildApiUrl, API_ENDPOINTS, getServerBaseUrl } from '../config/api';
import { storage } from '../utils/storage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  recommendedTechnicians?: any[];
}

interface AskBonyadAIScreenProps {
  onBack: () => void;
}

export default function AskBonyadAIScreen({ onBack }: AskBonyadAIScreenProps) {
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: i18n.language === 'en' 
        ? 'Hello! I\'m Bonyad AI, your renovation assistant. How can I help you today?' 
        : 'مرحباً! أنا بونياد الذكي، مساعدك في التجديدات. كيف يمكنني مساعدتك اليوم؟'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch quick suggestions on mount
  useEffect(() => {
    fetchQuickSuggestions();
  }, []);

  const fetchQuickSuggestions = async () => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.AI.CHAT_SUGGESTIONS));
      const data = await response.json();
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setQuickSuggestions(data.suggestions);
      } else {
        // Fallback to defaults if API fails
        setQuickSuggestions(i18n.language === 'en' ? [
          'Estimate Cost',
          'Find Designer',
          'Ideas for Kitchen',
          'Best Materials'
        ] : [
          'تقدير التكلفة',
          'ابحث عن مصمم',
          'أفكار للمطبخ',
          'أفضل المواد'
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      // Fallback to defaults
      setQuickSuggestions(i18n.language === 'en' ? [
        'Estimate Cost',
        'Find Designer',
        'Ideas for Kitchen',
        'Best Materials'
      ] : [
        'تقدير التكلفة',
        'ابحث عن مصمم',
        'أفكار للمطبخ',
        'أفضل المواد'
      ]);
    }
  };

  // Helper function to send a message to the AI chat API
  const sendMessageToAI = async (messageText: string) => {
    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const token = await storage.getAuthToken();
      const userId = await storage.getUserId();
      
      const response = await fetch(buildApiUrl(API_ENDPOINTS.AI.CHAT), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: messageText,
          conversationId: conversationId,
          userId: userId || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          recommendedTechnicians: data.recommendedTechnicians || [],
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Update conversation ID if returned
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
      } else {
        const errorData = await response.json();
        Alert.alert(
          t('Error'),
          errorData.error || (i18n.language === 'en' ? 'Failed to get AI response' : 'فشل الحصول على رد الذكي')
        );
      }
    } catch (error: any) {
      console.error('Chat API Error:', error);
      Alert.alert(
        t('Error'),
        i18n.language === 'en' ? 'Network error. Please try again.' : 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.'
      );
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const messageText = inputText;
    setInputText('');
    await sendMessageToAI(messageText);
  };

  const handleQuickSuggestion = async (suggestion: string) => {
    // Set the text in input for visual feedback (optional - user can see what was sent)
    setInputText(suggestion);
    
    // Automatically send the suggestion as a message
    await sendMessageToAI(suggestion);
    
    // Clear input after sending
    setInputText('');
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name={i18n.language === 'ar' ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.aiAvatar, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="sparkles" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
            {i18n.language === 'en' ? 'Ask Bonyad AI' : 'اسأل بونياد الذكي'}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              message.role === 'user' 
                ? { backgroundColor: colors.primary } 
                : { backgroundColor: colors.cardBackground }
            ]}
          >
            <Text style={[
              styles.messageText,
              { color: message.role === 'user' ? '#fff' : colors.text, fontSize: scaledSize(16) }
            ]}>
              {message.content}
            </Text>
            
            {/* Show recommended technicians */}
            {message.recommendedTechnicians && message.recommendedTechnicians.length > 0 && (
              <View style={styles.techniciansContainer}>
                <Text style={[styles.techniciansTitle, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
                  {i18n.language === 'en' ? 'Recommended Technicians:' : 'الفنيون الموصى بهم:'}
                </Text>
                {message.recommendedTechnicians.map((tech, techIndex) => (
                  <View key={techIndex} style={[styles.technicianCard, { backgroundColor: colors.background }]}>
                    {tech.profileImage && (
                      <Image 
                        source={{ uri: `${getServerBaseUrl()}${tech.profileImage}` }}
                        style={styles.technicianImage}
                      />
                    )}
                    <View style={styles.technicianInfo}>
                      <Text style={[styles.technicianName, { color: colors.text, fontSize: scaledSize(14) }]}>{tech.name}</Text>
                      <Text style={[styles.technicianRating, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                        ⭐ {tech.averageRating} ({tech.totalReviews} {i18n.language === 'en' ? 'reviews' : 'تقييمات'})
                      </Text>
                      {tech.yearsOfExperience && (
                        <Text style={[styles.technicianExp, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                          {tech.yearsOfExperience} {i18n.language === 'en' ? 'years experience' : 'سنة خبرة'}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
        
        {isTyping && (
          <View style={[styles.typingIndicator, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.typingDot, { backgroundColor: colors.textSecondary }]} />
            <View style={[styles.typingDot, { backgroundColor: colors.textSecondary }]} />
            <View style={[styles.typingDot, { backgroundColor: colors.textSecondary }]} />
          </View>
        )}
      </ScrollView>

      {/* Quick Suggestions */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.suggestionsContainer, { backgroundColor: colors.background }]}>
        {quickSuggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleQuickSuggestion(suggestion)}
            style={[styles.suggestionChip, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          >
            <Text style={[styles.suggestionText, { color: colors.primary, fontSize: scaledSize(14) }]}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder={i18n.language === 'en' ? 'Type your message...' : 'اكتب رسالتك...'}
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'center',
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    gap: 12,
  },
  messageBubble: {
    padding: 15,
    borderRadius: 16,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  suggestionsContainer: {
    maxHeight: 60,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techniciansContainer: {
    marginTop: 15,
    gap: 10,
  },
  techniciansTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  technicianCard: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    gap: 10,
  },
  technicianImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  technicianInfo: {
    flex: 1,
  },
  technicianName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  technicianRating: {
    fontSize: 12,
    marginBottom: 2,
  },
  technicianExp: {
    fontSize: 12,
  },
});

