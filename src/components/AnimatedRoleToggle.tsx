/**
 * Animated Role Toggle Component
 * 
 * A professional animated toggle for switching between User and Technician roles
 * with smooth animations and NativeWind styling
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, LayoutChangeEvent, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

interface AnimatedRoleToggleProps {
  selectedRole: 'user' | 'technician';
  onRoleChange: (role: 'user' | 'technician') => void;
  className?: string;
}

export default function AnimatedRoleToggle({ 
  selectedRole, 
  onRoleChange,
  className = '' 
}: AnimatedRoleToggleProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(selectedRole === 'user' ? 0 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const containerWidth = useRef(0);
  
  // Calculate translateX - use a fixed approach that works with flexbox
  // Since each button is flex-1 (50% width), we need to move by approximately 50% of container
  // We'll use a ref to track container width and calculate pixel values
  const [containerWidthState, setContainerWidthState] = useState(300); // Default width
  // Smaller height for Android, larger for web
  const defaultHeight = Platform.OS === 'android' ? 64 : 80;
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
        toValue: 0.95,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedRole]);

  // Calculate translateX in pixels (50% of container width minus padding)
  // We need to account for the padding (8px on each side) and the button width
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (containerWidthState - 16) * 0.5], // 50% of available width (container - 16px padding)
  });

  return (
    <View 
      style={{
        position: 'relative',
        backgroundColor: colors.cardBackground || colors.surface || '#FFFFFF', // Theme-aware background
        borderRadius: 16,
        paddingVertical: Platform.OS === 'android' ? 8 : 10, // Smaller padding for Android
        paddingHorizontal: 8, // Equal padding left and right
        flexDirection: 'row',
        overflow: 'hidden',
        borderWidth: 1, // Small border width
        borderColor: colors.primary || '#0080E0', // Theme-aware border color
        minHeight: Platform.OS === 'android' ? 64 : 80, // Smaller height for Android
      }}
      onLayout={handleLayout}
    >
      {/* Animated Slider Background with Text Inside */}
      <Animated.View
        style={{
          position: 'absolute',
          backgroundColor: colors.primary || '#0080E0', // Theme-aware primary color
          borderRadius: 12, // Rounded corners for the blue slider
          width: containerWidthState > 0 ? (containerWidthState - 16) * 0.5 : '50%', // Account for padding (8px on each side)
          height: containerHeightState > 0 
            ? containerHeightState - (Platform.OS === 'android' ? 16 : 20) 
            : (Platform.OS === 'android' ? 48 : 60), // Account for padding
          top: Platform.OS === 'android' ? 8 : 10, // Smaller padding for Android
          bottom: Platform.OS === 'android' ? 8 : 10, // Smaller padding for Android
          left: 8, // Padding from left
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 3,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          transform: [
            { translateX },
            { scale: scaleAnim }
          ],
        }}
      >
        {selectedRole === 'user' ? (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons
              name="person-outline"
              size={24}
              color={colors.white || '#FFFFFF'}
              style={{ marginBottom: 4 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '400',
                color: colors.white || '#FFFFFF',
              }}
            >
              {t('Customer')}
            </Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons
              name="briefcase-outline"
              size={24}
              color={colors.white || '#FFFFFF'}
              style={{ marginBottom: 4 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '400',
                color: colors.white || '#FFFFFF',
              }}
            >
              {t('Specialized')}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* User Button - Shows gray text when not selected */}
      <TouchableOpacity
        onPress={() => onRoleChange('user')}
        style={{
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: Platform.OS === 'android' ? 8 : 10, // Match container padding
          paddingHorizontal: 8,
          borderRadius: 12,
          zIndex: 1,
          minHeight: Platform.OS === 'android' ? 48 : 60, // Smaller height for Android
        }}
        activeOpacity={0.8}
      >
        {selectedRole !== 'user' && (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons
              name="person-outline"
              size={24}
              color={colors.textSecondary || '#6B7280'}
              style={{ marginBottom: 4 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '400',
                color: colors.textSecondary || '#6B7280',
              }}
            >
              {t('Customer')}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Technician Button - Shows gray text when not selected */}
      <TouchableOpacity
        onPress={() => onRoleChange('technician')}
        style={{
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: Platform.OS === 'android' ? 8 : 10, // Match container padding
          paddingHorizontal: 8,
          borderRadius: 12,
          zIndex: 1,
          minHeight: Platform.OS === 'android' ? 48 : 60, // Smaller height for Android
        }}
        activeOpacity={0.8}
      >
        {selectedRole !== 'technician' && (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons
              name="briefcase-outline"
              size={24}
              color={colors.textSecondary || '#6B7280'}
              style={{ marginBottom: 4 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '400',
                color: colors.textSecondary || '#6B7280',
              }}
            >
              {t('Specialized')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

