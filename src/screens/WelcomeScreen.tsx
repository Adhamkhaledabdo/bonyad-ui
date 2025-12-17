import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Image, ScrollView, Dimensions, TouchableOpacity, Animated, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';

interface WelcomeScreenProps {
  onComplete: () => void;
}

export default function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const { colors } = useTheme();
  const { i18n, t } = useTranslation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [countdown, setCountdown] = useState(2);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };
  
  // Animation values
  const mailTranslateY = useRef(new Animated.Value(0)).current;
  const topFoldRotation = useRef(new Animated.Value(0)).current;
  const letterHeight = useRef(new Animated.Value(60)).current;
  const mailScale = useRef(new Animated.Value(1)).current;
  const pageOpacity = useRef(new Animated.Value(1)).current;
  
  // Button animation values
  const buttonWidth = useRef(new Animated.Value(200)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;
  const fingerprintOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const buttonShake = useRef(new Animated.Value(0)).current;
  
  // Floating icons animation
  const icon1Y = useRef(new Animated.Value(0)).current;
  const icon2Y = useRef(new Animated.Value(0)).current;
  const icon3Y = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  
  // Services carousel
  const scrollX = useRef(new Animated.Value(0)).current;
  const services = [
    { id: 1, name: 'Plumbing', icon: 'water-outline' },
    { id: 2, name: 'Electrical', icon: 'flash-outline' },
    { id: 3, name: 'Carpentry', icon: 'hammer-outline' },
    { id: 4, name: 'Painting', icon: 'color-palette-outline' },
    { id: 5, name: 'Cleaning', icon: 'sparkles-outline' },
    { id: 6, name: 'HVAC', icon: 'thermometer-outline' },
    { id: 7, name: 'Roofing', icon: 'business-outline' },
    { id: 8, name: 'Tiling', icon: 'square-outline' },
    { id: 9, name: 'Gardening', icon: 'leaf-outline' },
    { id: 10, name: 'Locksmith', icon: 'lock-closed-outline' },
    { id: 11, name: 'Appliances', icon: 'hardware-chip-outline' },
    { id: 12, name: 'Moving', icon: 'car-outline' },
  ];

  const handleGetStarted = useCallback(() => {
    if (isAnimating) return; // Prevent multiple clicks
    
    setIsAnimating(true);
    setIsPressed(true);
    
    // Animate envelope opening
    Animated.sequence([
      Animated.parallel([
        Animated.timing(mailTranslateY, {
          toValue: 50,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(topFoldRotation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(letterHeight, {
          toValue: 180,
          duration: 600,
          useNativeDriver: false,
        }),
      ]),
      Animated.delay(800), // Wait 800ms after envelope opens
      Animated.parallel([
        Animated.timing(mailScale, {
          toValue: 15, // Zoom in significantly
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pageOpacity, {
          toValue: 0, // Fade out
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Navigate after zoom completes
      onComplete();
    });
  }, [isAnimating, onComplete]);

  const topFoldRotate = topFoldRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Auto-start countdown and animation
  useEffect(() => {
    // Countdown timer
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-trigger animation after 5 seconds
    const timeout = setTimeout(() => {
      if (!isAnimating) {
        handleGetStarted();
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [handleGetStarted, isAnimating]);

  // Auto-scroll services carousel - infinite seamless scrolling
  useEffect(() => {
    let animation: Animated.CompositeAnimation;
    
    const startScroll = () => {
      // Reset to 0
      scrollX.setValue(0);
      
      // Calculate the width of one full set of services (12 services * 140px each)
      const singleSetWidth = services.length * 140;
      
      // Create continuous scroll animation
      animation = Animated.loop(
        Animated.timing(scrollX, {
          toValue: -singleSetWidth, // Scroll exactly one full set
          duration: 15000, // 15 seconds for one cycle
          useNativeDriver: true,
        })
      );
      
      animation.start();
    };
    
    startScroll();
    
    // Cleanup
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [services.length]);

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: pageOpacity }]}>
      {/* Language Toggle - Top Right */}
      <View style={styles.languageToggleContainer}>
        <TouchableOpacity style={styles.languageButton} onPress={toggleLanguage}>
          <Ionicons 
            name="language" 
            size={24} 
            color={colors.text} 
          />
          <Text style={[styles.languageText, { color: colors.text }]}>
            {i18n.language === 'en' ? 'EN' : 'AR'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/bonyad-logo.svg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >


        {/* Letter Envelope */}
        <View style={styles.letterImage}>
          <Animated.View style={[styles.animatedMail, { 
            transform: [
              { translateY: mailTranslateY },
              { scale: mailScale }
            ] 
          }]}>
            {/* Back Fold */}
            <View style={styles.backFold} />
            
            {/* Letter */}
            <Animated.View style={[styles.letter, { height: letterHeight }]}>
              <View style={styles.letterBorder} />
              <View style={styles.letterTitle} />
              <View style={styles.letterContext} />
              <View style={styles.letterStamp}>
                <View style={styles.letterStampInner} />
              </View>
            </Animated.View>
            
            {/* Top Fold */}
            <Animated.View style={[styles.topFold, { transform: [{ rotateX: topFoldRotate }] }]} />
            
            {/* Body */}
            <View style={styles.body} />
            
            {/* Left Fold */}
            <View style={styles.leftFold} />
          </Animated.View>
        </View>

        {/* Loading with Countdown */}
        <View style={styles.countdownContainer}>
          <Animated.View style={styles.countdownCircle}>
            <Ionicons name="hourglass-outline" size={40} color="#1976D2" />
          </Animated.View>
          <Text style={styles.countdownText}>
            {t('welcome.countdown', { count: countdown })}
          </Text>
        </View>

        {/* Services Carousel */}
        <View style={styles.carouselContainer}>
          <Animated.View 
            style={[
              styles.servicesRow,
              {
                transform: [{ translateX: scrollX }]
              }
            ]}
          >
            {/* Render services 6 times for seamless infinite loop */}
            {Array(6).fill(services).flat().map((item, index) => (
              <View key={`${item.id}-${index}`} style={styles.serviceCard}>
                <Ionicons name={item.icon as any} size={40} color="#1976D2" />
                <Text style={styles.serviceText}>{item.name}</Text>
              </View>
            ))}
          </Animated.View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    fontFamily: Platform.select({
      web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      default: 'System',
    }),
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 0,
    height: 80,
    zIndex: 100,
    justifyContent: 'center',
  },
  logo: {
    width: 100,
    height: 30,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    minHeight: Dimensions.get('window').height,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 120,
  },
  letterImage: {
    width: 200,
    height: 200,
    marginTop: 80,
  },
  animatedMail: {
    position: 'absolute',
    height: 150,
    width: 200,
  },
  backFold: {
    position: 'absolute',
    bottom: 0,
    width: 200,
    height: 100,
    backgroundColor: '#1565C0',
    zIndex: 0,
  },
  letter: {
    left: 20,
    bottom: 0,
    position: 'absolute',
    width: 160,
    height: 60,
    backgroundColor: 'white',
    zIndex: 1,
    overflow: 'hidden',
  },
  letterBorder: {
    height: 10,
    width: '100%',
    backgroundColor: '#1976D2',
    borderBottomWidth: 2,
    borderBottomColor: '#0D47A1',
  },
  letterTitle: {
    marginTop: 10,
    marginLeft: 5,
    height: 10,
    width: '40%',
    backgroundColor: '#1976D2',
  },
  letterContext: {
    marginTop: 10,
    marginLeft: 5,
    height: 10,
    width: '20%',
    backgroundColor: '#1976D2',
  },
  letterStamp: {
    marginTop: 30,
    marginLeft: 120,
    borderRadius: 15,
    height: 30,
    width: 30,
    backgroundColor: '#1976D2',
    opacity: 0.3,
  },
  letterStampInner: {
    flex: 1,
  },
  topFold: {
    position: 'absolute',
    top: 50,
    width: 0,
    height: 0,
    borderTopWidth: 50,
    borderRightWidth: 100,
    borderBottomWidth: 0,
    borderLeftWidth: 100,
    borderTopColor: '#0D47A1',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    zIndex: 2,
  },
  body: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 100,
    borderLeftWidth: 200,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1E88E5',
    borderLeftColor: 'transparent',
    zIndex: 2,
  },
  leftFold: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    borderTopWidth: 50,
    borderRightWidth: 0,
    borderBottomWidth: 50,
    borderLeftWidth: 100,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#1976D2',
    zIndex: 2,
  },

  fingerprintButton: {
    marginTop: 100,
    marginBottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fingerprintButtonInner: {
    height: 80,
    backgroundColor: '#1976D2',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 14,
  },
  fingerprintButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    position: 'absolute',
  },
  fingerprintIcon: {
    position: 'absolute',
  },
  countdownContainer: {
    marginTop: 100,
    marginBottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  countdownText: {
    color: '#1976D2',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  floatingIcon: {
    position: 'absolute',
  },
  carouselContainer: {
    width: '100%',
    height: 160,
    marginTop: 60,
    overflow: 'hidden',
  },
  servicesRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  serviceCard: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f0f7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    borderWidth: 1,
    borderColor: '#e3f2fd',
    paddingVertical: 10,
  },
  serviceText: {
    marginTop: 8,
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '600',
    textAlign: 'center',
  },
  languageToggleContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    zIndex: 1000,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
