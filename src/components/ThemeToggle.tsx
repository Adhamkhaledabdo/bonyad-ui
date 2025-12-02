/**
 * Theme Toggle Component
 * 
 * A professional theme toggle for switching between light and dark mode
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggleTheme, colors } = useTheme();
  const isDark = theme === 'dark';

  // Calculate icon container background color based on theme
  // Extract RGB values from primary color and apply opacity
  const getPrimaryRgba = (color: string, opacity: number) => {
    // Handle hex colors like #0080E0 or #33A3FF
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };
  
  const iconContainerBg = isDark 
    ? getPrimaryRgba(colors.primary, 0.15)
    : getPrimaryRgba(colors.primary, 0.1);

  // Use surface color for better theme adaptation
  const containerBg = colors.surface || colors.cardBackground || (isDark ? '#1E1E1E' : '#FFFFFF');
  const containerBorder = colors.border || (isDark ? '#3A3A3A' : '#DDDDDD');

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: containerBg,
          borderColor: containerBorder,
        }
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: iconContainerBg }]}>
          <Ionicons
            name={isDark ? 'moon' : 'sunny'}
            size={20}
            color={colors.primary}
          />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>
          {isDark ? t('Dark Mode') : t('Light Mode')}
        </Text>
      </View>
      <TouchableOpacity
        onPress={toggleTheme}
        style={[
          styles.toggleButton,
          {
            backgroundColor: isDark ? colors.primary : colors.border,
          }
        ]}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.toggleCircle,
            {
              backgroundColor: colors.white,
              transform: [{ translateX: isDark ? 20 : 0 }],
            }
          ]}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
    marginBottom: Platform.OS === 'web' ? 24 : 16,
    // No backgroundColor here - it's set dynamically via inline style
    ...Platform.select({
      web: {
        maxWidth: 400,
        alignSelf: 'center',
      } as any,
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleButton: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    ...Platform.select({
      web: {
        transition: 'transform 0.3s ease',
      } as any,
      default: {},
    }),
  },
});

