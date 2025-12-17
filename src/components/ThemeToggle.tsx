/**
 * Theme Toggle Component - Apple Style
 * 
 * A beautiful sun/moon toggle for switching between light and dark mode
 * with smooth transition animations like Apple's design
 */

import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { FontFamily, UIFontSizes } from '../constants/Fonts';

export default function ThemeToggle() {
  const { theme, toggleTheme, colors } = useTheme();
  const isDark = theme === 'dark';
  
  // Animation values
  const rotateAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Rotate and scale animation when theme changes
    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue: isDark ? 1 : 0,
        duration: 400,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.elastic(1.2),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [isDark]);

  // Interpolate rotation
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Colors based on theme
  const bgColor = isDark ? '#1C1C1E' : '#F2F2F7';
  const iconColor = isDark ? '#FFD60A' : '#FF9500';
  const borderColor = isDark ? '#38383A' : '#E5E5EA';

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      activeOpacity={0.8}
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.iconWrapper,
          {
            transform: [
              { rotate: rotation },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {isDark ? (
          <Ionicons
            name="moon"
            size={UIFontSizes.langToggle}
            color={iconColor}
            style={{ fontSize: UIFontSizes.langToggle }}
            fontFamily={FontFamily.primary}
          />
        ) : (
          <Ionicons
            name="sunny"
            size={UIFontSizes.langToggle}
            color={iconColor}
            style={{ fontSize: UIFontSizes.langToggle }}
            fontFamily={FontFamily.primary}
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    alignSelf: 'center',
    marginTop: 16,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.3s ease, border-color 0.3s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
    }),
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
