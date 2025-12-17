import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';

interface RoomDesignScreenProps {
  onBack: () => void;
}

export default function RoomDesignScreen({ onBack }: RoomDesignScreenProps) {
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const { t, i18n } = useTranslation();

  // Render only on web
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons 
              name={i18n.language === 'ar' ? 'arrow-forward' : 'arrow-back'} 
              size={24} 
              color={colors.text} 
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(20) }]}>
            {i18n.language === 'en' ? 'Room Design' : 'تصميم الغرفة'}
          </Text>
          <View style={styles.backButton} /> {/* Placeholder for alignment */}
        </View>
      </View>

      {/* Content Area - Placeholder */}
      <View style={styles.content}>
        <View style={[styles.placeholderContainer, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="color-palette-outline" size={80} color={colors.textSecondary} />
          <Text style={[styles.placeholderTitle, { color: colors.text, fontSize: scaledSize(28) }]}>
            {i18n.language === 'en' ? 'Room Design Studio' : 'استوديو تصميم الغرف'}
          </Text>
          <Text style={[styles.placeholderDescription, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
            {i18n.language === 'en' 
              ? 'Design your dream room coming soon...' 
              : 'صمم غرفتك المثالية قريباً...'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 70,
    borderBottomWidth: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    maxWidth: 600,
    width: '100%',
  },
  placeholderTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  placeholderDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

