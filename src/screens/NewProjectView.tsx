import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';

interface NewProjectViewProps {
  onNavigateToAI: () => void;
  onNavigateToManual: () => void;
  onBack?: () => void;
  technician?: { id: number; name?: string } | null;
}

// Example prompts for typing animation
const examplePrompts = [
  "I need to renovate my kitchen with modern cabinets and new appliances",
  "أريد تجديد مطبخي بخزائن حديثة وأجهزة جديدة",
  "Looking for someone to fix my bathroom plumbing and install new tiles",
  "أبحث عن شخص لإصلاح سباكة الحمام وتركيب بلاط جديد",
  "Need help designing and building a garden shed in my backyard",
  "أحتاج مساعدة في تصميم وبناء كوخ حديقة في الفناء الخلفي",
];

export default function NewProjectView({
  onNavigateToAI,
  onNavigateToManual,
  onBack,
  technician,
}: NewProjectViewProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [animatedText, setAnimatedText] = useState('');
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const iterationCount = useRef(0);
  const MAX_ITERATIONS = 3; // Limit to 3 loops

  // Responsive state
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  const shouldRenderMobile = Platform.OS !== 'web' || !IS_LARGE_WEB;

  // Typing animation effect
  useEffect(() => {
    // Stop after MAX_ITERATIONS
    if (iterationCount.current >= MAX_ITERATIONS * 2) {
      // Each iteration has typing + erasing (2 state changes)
      return;
    }

    const currentLanguage = i18n.language;
    const prompts = currentLanguage === 'ar'
      ? examplePrompts.filter((text) =>
          /[أبتثجحخدذرزسشصضطظعغفقكلمنهوي]/.test(text)
        )
      : examplePrompts.filter(
          (text) => !/[أبتثجحخدذرزسشصضطظعغفقكلمنهوي]/.test(text)
        );

    if (prompts.length === 0) return;

    const targetText = prompts[currentTextIndex % prompts.length];
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      // Typing forward
      if (animatedText.length < targetText.length) {
        timeout = setTimeout(() => {
          setAnimatedText(targetText.substring(0, animatedText.length + 1));
        }, 100);
      } else {
        // Finished typing, wait then start erasing
        timeout = setTimeout(() => {
          iterationCount.current += 1;
          setIsTyping(false);
        }, 2000);
      }
    } else {
      // Erasing backward
      if (animatedText.length > 0) {
        timeout = setTimeout(() => {
          setAnimatedText(animatedText.substring(0, animatedText.length - 1));
        }, 50);
      } else {
        // Finished erasing, move to next text
        iterationCount.current += 1;
        timeout = setTimeout(() => {
          setCurrentTextIndex((prev) => prev + 1);
          setIsTyping(true);
        }, 500);
      }
    }

    return () => clearTimeout(timeout);
  }, [animatedText, isTyping, currentTextIndex, i18n.language]);

  // Figma Design Colors
  const FIGMA = {
    primary100: '#003867',
    primary70: '#00549B',
    primary50: '#1A6DB4',
    primary20: '#B3CEE6',
    textHeaders: '#003867',
    textBody: '#383838',
    textWhite: '#FFFFFF',
    textBackground: '#F0F0F0',
    purple70: '#5E0BA1',
    purple60: '#6A0DAD',
    purple10: '#EFE6F5',
    white: '#FFFFFF',
  };

  // Render mobile layout - Figma Design
  if (shouldRenderMobile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: FIGMA.white }]}>
        {/* Back Button - Figma style */}
        <View style={styles.figmaBackContainer}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.figmaBackButton}>
              <Ionicons name="arrow-back" size={24} color={FIGMA.textBody} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.figmaScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title - Figma style */}
          <View style={styles.figmaHeader}>
            <Text style={styles.figmaTitle}>
              {technician ? t('Send Deal to') + ' ' + (technician.name || t('Technician')) : t('Create Project')}
            </Text>
          </View>

          {/* Description - Figma style */}
          <Text style={styles.figmaDescription}>
            {t('Describe your need and we will help you define the scope of work, cost estimate and the expected duration.')}
          </Text>

          {/* Choice Cards - Figma style */}
          <View style={styles.figmaChoiceCards}>
            {/* AI Assistance Card */}
            <TouchableOpacity
              style={styles.figmaAiCard}
              onPress={onNavigateToAI}
              activeOpacity={0.8}
            >
              <View style={styles.figmaAiIcon}>
                <Ionicons name="chatbubbles" size={28} color={FIGMA.textWhite} />
              </View>
              <View style={styles.figmaCardTextContainer}>
                <Text style={styles.figmaAiCardTitle}>{t('Use AI Assistance')}</Text>
                <Text style={styles.figmaAiCardSubtitle}>{t('Define your scope of work')}</Text>
              </View>
            </TouchableOpacity>

            {/* Manual Card */}
            <TouchableOpacity
              style={styles.figmaManualCard}
              onPress={onNavigateToManual}
              activeOpacity={0.8}
            >
              <View style={styles.figmaManualIcon}>
                <Ionicons name="create-outline" size={28} color={FIGMA.purple60} />
              </View>
              <View style={styles.figmaCardTextContainer}>
                <Text style={styles.figmaManualCardTitle}>{t('Fill Manually')}</Text>
                <Text style={styles.figmaManualCardSubtitle}>{t('Fill in all project details yourself')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Render desktop layout
  return (
    <View style={[styles.desktopContainer, { backgroundColor: colors.background }]}>
      {/* Desktop Header */}
      <View style={[styles.desktopHeader, { backgroundColor: colors.cardBackground }]}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.desktopBackButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={[styles.desktopHeaderTitle, { color: colors.text }]}>{t('Create New Project')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.desktopScrollView}
        contentContainerStyle={styles.desktopScrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Desktop Content */}
        <View style={styles.desktopContent}>
          {/* Left side - Info */}
          <View style={styles.desktopLeftSection}>
            <View style={styles.desktopIconContainer}>
              <Ionicons name="hammer" size={80} color={colors.primary} />
            </View>
            <Text style={[styles.desktopTitle, { color: colors.text }]}>{t('Create New Project')}</Text>
            <Text style={[styles.desktopSubtitle, { color: colors.textSecondary }]}>
              {t('Choose how you want to create your project. Use AI for an interactive experience or fill manually for complete control.')}
            </Text>
          </View>

          {/* Right side - Choice Buttons */}
          <View style={styles.desktopRightSection}>
            {/* AI Option */}
            <TouchableOpacity
              style={styles.desktopAiButton}
              onPress={onNavigateToAI}
              activeOpacity={0.9}
            >
              <View style={[styles.desktopAiButtonContent, { backgroundColor: colors.primary }]}>
                <Ionicons name="sparkles" size={48} color="#fff" />
                <Text style={styles.desktopAiButtonTitle}>
                  {t('Use AI Assistant')}
                </Text>
                <Text style={styles.desktopAiButtonDescription}>
                  {animatedText || t('AI will help you create your project step by step')}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Manual Option */}
            <TouchableOpacity
              style={[styles.desktopManualButton, { borderColor: colors.primary }]}
              onPress={onNavigateToManual}
              activeOpacity={0.9}
            >
              <View style={[styles.desktopManualButtonContent, { backgroundColor: colors.cardBackground }]}>
                <Ionicons name="create-outline" size={48} color={colors.primary} />
                <Text style={[styles.desktopManualButtonTitle, { color: colors.primary }]}>
                  {t('Fill Manually')}
                </Text>
                <Text style={[styles.desktopManualButtonDescription, { color: colors.textSecondary }]}>
                  {t('Fill all project details manually with complete control')}
                </Text>
              </View>
            </TouchableOpacity>
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
  backButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  choiceButtonsContainer: {
    gap: 20,
  },
  aiButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  aiButtonContent: {
    padding: 30,
    alignItems: 'center',
    gap: 12,
  },
  aiButtonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  aiButtonDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    minHeight: 40,
  },
  manualButton: {
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
  },
  manualButtonContent: {
    padding: 30,
    alignItems: 'center',
    gap: 12,
  },
  manualButtonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  manualButtonDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Desktop styles
  desktopContainer: {
    flex: 1,
    ...Platform.select({
      web: {
        minHeight: '100vh' as any,
      },
    }),
  },
  desktopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' as any,
      },
    }),
  },
  desktopBackButton: {
    padding: 8,
  },
  desktopHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  desktopScrollView: {
    flex: 1,
  },
  desktopScrollContent: {
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  desktopContent: {
    flexDirection: 'row',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    gap: 60,
  },
  desktopLeftSection: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 40,
  },
  desktopIconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  desktopTitle: {
    fontSize: 42,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'left',
  },
  desktopSubtitle: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'left',
  },
  desktopRightSection: {
    flex: 1,
    gap: 24,
  },
  desktopAiButton: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 128, 224, 0.3)' as any,
        cursor: 'pointer' as any,
      },
    }),
  },
  desktopAiButtonContent: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 20,
  },
  desktopAiButtonTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    marginBottom: 12,
  },
  desktopAiButtonDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.95,
    minHeight: 48,
  },
  desktopManualButton: {
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)' as any,
        cursor: 'pointer' as any,
      },
    }),
  },
  desktopManualButtonContent: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 18,
  },
  desktopManualButtonTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  desktopManualButtonDescription: {
    fontSize: 16,
    textAlign: 'center',
    minHeight: 48,
  },
  // ==================== FIGMA DESIGN STYLES ====================
  figmaBackContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    height: 20,
  },
  figmaBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  figmaScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  figmaHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  figmaTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#003867', // primary100
    textAlign: 'center',
  },
  figmaDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: '#383838', // textBody
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  figmaChoiceCards: {
    gap: 24,
  },
  figmaAiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A6DB4', // primary50
    borderWidth: 0.5,
    borderColor: '#B3CEE6', // primary20
    borderRadius: 8,
    padding: 16,
    height: 100,
    gap: 24,
  },
  figmaAiIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  figmaCardTextContainer: {
    flex: 1,
    gap: 6,
  },
  figmaAiCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  figmaAiCardSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: '#F0F0F0',
  },
  figmaManualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFE6F5', // purple10
    borderWidth: 0.5,
    borderColor: '#5E0BA1', // purple70
    borderRadius: 8,
    padding: 16,
    height: 100,
    gap: 24,
  },
  figmaManualIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  figmaManualCardTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6A0DAD', // purple60
  },
  figmaManualCardSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: '#6A0DAD', // purple60
  },
});
