/**
 * Animated Role Toggle Component
 * 
 * A professional animated toggle for switching between User and Technician roles
 * with smooth animations - Figma Design (node 29:123) with Amber/Yellow color scheme
 * Compact design with smaller text (12px) and reduced height
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, LayoutChangeEvent, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { FontFamily, UIFontSizes } from '../constants/Fonts';

interface AnimatedRoleToggleProps {
  selectedRole: 'user' | 'technician';
  onRoleChange: (role: 'user' | 'technician') => void;
  className?: string;
}

// Figma Design Colors (from node 29:123)
const figmaToggleColors = {
  amberActive: '#FFB703',      // Active button amber (Amber/60)
  amberBg: '#FFF2CF',          // Light amber background (Amber/10)
  textDark: '#2D2D2D',         // Dark text color
};

export default function AnimatedRoleToggle({ 
  selectedRole, 
  onRoleChange,
  className = '' 
}: AnimatedRoleToggleProps) {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const slideAnim = useRef(new Animated.Value(selectedRole === 'user' ? 0 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const containerWidth = useRef(0);
  
  // Calculate translateX - use a fixed approach that works with flexbox
  const [containerWidthState, setContainerWidthState] = useState(300); // Default width
  // Height for the toggle - increased for larger SakkalMajalla font
  const defaultHeight = 52; // Increased from 44 to accommodate larger font
  const [containerHeightState, setContainerHeightState] = useState(defaultHeight);
  
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerWidthState(width);
    setContainerHeightState(height);
    containerWidth.current = width;
  };

  useEffect(() => {
    // Animate slider position
    Animated.spring(slideAnim, {
      toValue: selectedRole === 'user' ? 0 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    // Add scale animation on change
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 80,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedRole]);

  // Calculate translateX in pixels (50% of container width minus padding)
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (containerWidthState - 12) * 0.5], // 50% of available width (container - 12px padding)
  });

  // Use Figma amber/yellow colors for both light and dark mode
  const bgColor = isDarkMode ? '#3D3520' : figmaToggleColors.amberBg; // Darker amber background for dark mode
  const activeColor = figmaToggleColors.amberActive; // Always use amber active color #FFB703
  const textColor = isDarkMode ? '#FFFFFF' : figmaToggleColors.textDark;
  const inactiveTextColor = isDarkMode ? '#CCCCCC' : figmaToggleColors.textDark;

  return (
    <View 
      style={{
        position: 'relative',
        backgroundColor: bgColor,
        borderRadius: 8, // Figma: rounded-[8px]
        padding: 6, // Figma: p-[6px]
        flexDirection: 'row',
        overflow: 'hidden',
        height: 52, // Increased for larger SakkalMajalla font
      }}
      onLayout={handleLayout}
    >
      {/* Animated Slider Background with Text Inside */}
      <Animated.View
        style={{
          position: 'absolute',
          backgroundColor: activeColor,
          borderRadius: 8, // Figma: rounded-[8px]
          width: containerWidthState > 0 ? (containerWidthState - 12) * 0.5 : '50%', // Account for padding (6px on each side)
          height: 40, // Increased from 32 for larger font
          top: 6, // Match container padding
          left: 6, // Padding from left
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          transform: [
            { translateX },
            { scale: scaleAnim }
          ],
        }}
      >
        <Text
          style={{
            fontSize: UIFontSizes.bodyLarge, // Centralized font size
            fontWeight: '400',
            color: textColor,
            textAlign: 'center',
            fontFamily: FontFamily.primary,
          }}
          numberOfLines={1}
        >
          {selectedRole === 'user' ? t('User') : t('Service Provider')}
        </Text>
      </Animated.View>

      {/* User Button - Shows text when not selected */}
      <TouchableOpacity
        onPress={() => onRoleChange('user')}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          zIndex: 1,
          height: 40, // Increased to match slider
          minHeight: 40,
          maxHeight: 40,
        }}
        activeOpacity={0.8}
      >
        {selectedRole !== 'user' && (
          <Text
            style={{
              fontSize: UIFontSizes.bodyLarge, // Centralized font size
              fontWeight: '400',
              color: inactiveTextColor,
              textAlign: 'center',
              fontFamily: FontFamily.primary,
            }}
            numberOfLines={1}
          >
            {t('User')}
          </Text>
        )}
      </TouchableOpacity>

      {/* Service Provider Button - Shows text when not selected */}
      <TouchableOpacity
        onPress={() => onRoleChange('technician')}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          zIndex: 1,
          height: 40, // Increased to match slider
          minHeight: 40,
          maxHeight: 40,
        }}
        activeOpacity={0.8}
      >
        {selectedRole !== 'technician' && (
          <Text
            style={{
              fontSize: UIFontSizes.bodyLarge, // Centralized font size
              fontWeight: '400',
              color: inactiveTextColor,
              textAlign: 'center',
              fontFamily: FontFamily.primary,
            }}
            numberOfLines={1}
          >
            {t('Service Provider')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

