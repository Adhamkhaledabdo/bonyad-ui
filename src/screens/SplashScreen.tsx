import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ImageBackground, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import * as SplashScreenNative from 'expo-splash-screen';
import BonyadLogo from '../components/BonyadLogo';

interface SplashScreenProps {
  onComplete: () => void;
  onNavigateToOverview?: () => void;
}

export default function SplashScreen({ onComplete, onNavigateToOverview }: SplashScreenProps) {
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Hide native splash immediately when custom splash mounts
    SplashScreenNative.hideAsync();
    
    // Start animation sequence
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
      // Fade in simultaneously with scale
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (Platform.OS === 'web' && onNavigateToOverview) {
        onNavigateToOverview();
      } else {
        onComplete();
      }
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Image with Overlay */}
      <ImageBackground
        source={require('../../assets/background.imageset/background.png')}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.15 }}
      >
        {/* Animated Logo Container */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <BonyadLogo width={166} height={73} />
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
