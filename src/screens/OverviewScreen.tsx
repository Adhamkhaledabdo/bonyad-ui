import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Image, Alert, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';

const REMOTE_OVERVIEW_IMAGE_URLS: string[] = [
  'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400',
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400',
];

const LOCAL_OVERVIEW_IMAGE_SOURCES = [
  // Technician faces
  require('../../assets/saudi-arabian-faces/download.jpeg'),
  require('../../assets/saudi-arabian-faces/images.jpeg'),
  require('../../assets/saudi-arabian-faces/istockphoto-1390994395-612x612.jpg'),
  require('../../assets/saudi-arabian-faces/istockphoto-1394149742-612x612.jpg'),
  require('../../assets/saudi-arabian-faces/istockphoto-1397179727-612x612.jpg'),

  // City showcase cards
  require('../../assets/pexels-filip-marcus-adam-3638207-31157351.jpg'),
  require('../../assets/pexels-zeynep-sude-dudukcu-558340797-22866288.jpg'),

  // User screenshots
  require('../../assets/user/IMG_4784.png'),
  require('../../assets/user/IMG_4785.png'),
  require('../../assets/user/IMG_4786.png'),
  require('../../assets/user/IMG_4787.png'),
  require('../../assets/user/IMG_4788.png'),
  require('../../assets/user/IMG_4789.png'),
  require('../../assets/user/IMG_4790.png'),
  require('../../assets/user/IMG_4791.png'),

  // Provider screenshots
  require('../../assets/technician_screenshots//IMG_4776.png'),
  require('../../assets/technician_screenshots//IMG_4777.png'),
  require('../../assets/technician_screenshots//IMG_4778.png'),
  require('../../assets/technician_screenshots//IMG_4779.png'),
  require('../../assets/technician_screenshots//IMG_4780.png'),
  require('../../assets/technician_screenshots//IMG_4781.png'),
  require('../../assets/technician_screenshots//IMG_4782.png'),
  require('../../assets/technician_screenshots//IMG_4783.png'),

  // Provider available services cards
  require('../../assets/pexels-arshutter-29450383.jpg'),
  require('../../assets/pexels-hanna-alves-1907982668-28812511.jpg'),
  require('../../assets/pexels-shanu-azhikode-531962-32493302.jpg'),
  require('../../assets/pexels-thoinamcao-15124970.jpg'),

  // Hero imagery and branding
  require('../../assets/pexels-mdamirumar-30320202.jpg'),
  require('../../assets/riyadh-night.jpg'),
  require('../../assets/bonyad-logo.svg'),
] as const;

interface OverviewScreenProps {
  onNavigateToLogin: () => void;
  onNavigateToDesign?: () => void;
  onNavigateToVoiceAI?: () => void;
  onNavigateToCostExplorer?: () => void;
  onNavigateToRoomVisualizer?: () => void;
  onNavigateToAskBonyadAI?: () => void;
  onNavigateToProjectsMap?: () => void;
  onNavigateToContact?: () => void;
  onNavigateToAbout?: () => void;
  onNavigateToIntroToApp?: () => void;
}

export default function OverviewScreen({ onNavigateToLogin, onNavigateToDesign, onNavigateToVoiceAI, onNavigateToCostExplorer, onNavigateToRoomVisualizer, onNavigateToAskBonyadAI, onNavigateToProjectsMap, onNavigateToContact, onNavigateToAbout, onNavigateToIntroToApp }: OverviewScreenProps) {
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const { t, i18n } = useTranslation();
  const [userType, setUserType] = useState<'user' | 'provider'>('user');
  const [isHovering, setIsHovering] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isHoveringTech, setIsHoveringTech] = useState(false);
  const [isHoveringScreenshots, setIsHoveringScreenshots] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [hoveringUser, setHoveringUser] = useState(false);
  const [hoveringBonyader, setHoveringBonyader] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [featuresMenuOpen, setFeaturesMenuOpen] = useState(false);
  
  // Animation refs
  const toggleSlideAnim = useRef(new Animated.Value(0)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const techniciansSectionRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const techniciansScrollX = useRef(new Animated.Value(0)).current;
  const techniciansScrollViewRef = useRef<ScrollView>(null);
  const screenshotsScrollViewRef = useRef<ScrollView>(null);
  const userToggleAnim = useRef(new Animated.Value(0)).current;
  const bonyaderToggleAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Typewriter effect for localized welcome message
  useEffect(() => {
    const text = t('overview.typewriterMessage');
    let currentIndex = 0;
    
    setDisplayedText('');
    
    const typeInterval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayedText(text.substring(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 100); // Speed of typing
    
    return () => clearInterval(typeInterval);
  }, [i18n.language, t]);

  // Blinking cursor animation
  useEffect(() => {
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    
    blinkAnimation.start();
    
    return () => blinkAnimation.stop();
  }, []);

  // Screen width listener
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // Preload remote images before rendering content
  useEffect(() => {
    let isActive = true;

    const preloadImages = async () => {
      try {
        const localURIs = LOCAL_OVERVIEW_IMAGE_SOURCES.map((source) => {
          try {
            const resolved = Image.resolveAssetSource(source);
            return resolved?.uri ?? null;
          } catch (resolveError) {
            console.warn('[OverviewScreen] Unable to resolve local image source:', resolveError);
            return null;
          }
        }).filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);

        const urisToPrefetch = Array.from(
          new Set<string>([
            ...REMOTE_OVERVIEW_IMAGE_URLS,
            ...localURIs,
          ]),
        ).filter((uri) => typeof uri === 'string' && uri.length > 0);

        if (urisToPrefetch.length > 0) {
          await Promise.all(
            urisToPrefetch.map((uri) => Image.prefetch(uri)),
          );
        }
      } catch (error) {
        console.warn('[OverviewScreen] Failed to preload remote images:', error);
      } finally {
        if (isActive) {
          setImagesLoaded(true);
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
      }
    };

    preloadImages();

    return () => {
      isActive = false;
    };
  }, [contentOpacity]);

  useEffect(() => {
    // Animate toggle slide
    Animated.timing(toggleSlideAnim, {
      toValue: userType === 'user' ? 0 : 100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [userType]);

  const handleSwitchType = useCallback((type: 'user' | 'provider') => {
    if (userType !== type) {
      setUserType(type);
    }
  }, [userType]);



  // Render only on web
  if (Platform.OS !== 'web') {
    return null;
  }

  const userConfig = {
    primaryColor: '#1976D2', // Blue
    secondaryColor: '#E3F2FD', // Light blue
    features: [
      { icon: 'search-outline', title: t('overview.user.features.search.title'), desc: t('overview.user.features.search.desc') },
      { icon: 'construct-outline', title: t('overview.user.features.project.title'), desc: t('overview.user.features.project.desc') },
      { icon: 'chatbubbles-outline', title: t('overview.user.features.communicate.title'), desc: t('overview.user.features.communicate.desc') },
      { icon: 'star-outline', title: t('overview.user.features.rate.title'), desc: t('overview.user.features.rate.desc') },
    ],
    benefits: [
      t('overview.user.benefits.1'),
      t('overview.user.benefits.2'),
      t('overview.user.benefits.3'),
      t('overview.user.benefits.4'),
    ],
    technicians: [
      { name: 'Ahmed Ali', rating: 4.9, reviews: 127, service: 'Plumbing', region: 'Riyadh', image: require('../../assets/saudi-arabian-faces/download.jpeg') },
      { name: 'Mohammed Hassan', rating: 4.8, reviews: 89, service: 'Electrical', region: 'Jeddah', image: require('../../assets/saudi-arabian-faces/images.jpeg') },
      { name: 'Saeed Ibrahim', rating: 5.0, reviews: 156, service: 'Carpentry', region: 'Riyadh', image: require('../../assets/saudi-arabian-faces/istockphoto-1390994395-612x612.jpg') },
      { name: 'Khaled Mansour', rating: 4.7, reviews: 203, service: 'Painting', region: 'Dammam', image: require('../../assets/saudi-arabian-faces/istockphoto-1394149742-612x612.jpg') },
      { name: 'Fahad Al-Rashid', rating: 4.9, reviews: 98, service: 'HVAC', region: 'Mecca', image: require('../../assets/saudi-arabian-faces/istockphoto-1397179727-612x612.jpg') },
      { name: 'Omar Abdullah', rating: 4.8, reviews: 164, service: 'Tiling', region: 'Riyadh', image: require('../../assets/saudi-arabian-faces/download.jpeg') },
      { name: 'Youssef Mahdi', rating: 4.9, reviews: 112, service: 'Roofing', region: 'Jeddah', image: require('../../assets/saudi-arabian-faces/images.jpeg') },
      { name: 'Majid Al-Otaibi', rating: 4.6, reviews: 145, service: 'Landscaping', region: 'Riyadh', image: require('../../assets/saudi-arabian-faces/istockphoto-1390994395-612x612.jpg') },
      { name: 'Hassan Salem', rating: 4.8, reviews: 98, service: 'Flooring', region: 'Dammam', image: require('../../assets/saudi-arabian-faces/istockphoto-1394149742-612x612.jpg') },
      { name: 'Ibrahim Fahd', rating: 5.0, reviews: 201, service: 'Plumbing', region: 'Riyadh', image: require('../../assets/saudi-arabian-faces/istockphoto-1397179727-612x612.jpg') },
      { name: 'Mansour Al-Qahtani', rating: 4.7, reviews: 167, service: 'Electrical', region: 'Jeddah', image: require('../../assets/saudi-arabian-faces/download.jpeg') },
      { name: 'Tariq Al-Saud', rating: 4.9, reviews: 134, service: 'Carpentry', region: 'Mecca', image: require('../../assets/saudi-arabian-faces/images.jpeg') },
      { name: 'Khalid Al-Rashid', rating: 4.8, reviews: 156, service: 'Painting', region: 'Riyadh', image: require('../../assets/saudi-arabian-faces/istockphoto-1390994395-612x612.jpg') },
      { name: 'Zaid Al-Mutairi', rating: 5.0, reviews: 189, service: 'HVAC', region: 'Dammam', image: require('../../assets/saudi-arabian-faces/istockphoto-1394149742-612x612.jpg') },
      { name: 'Nasser Al-Harbi', rating: 4.7, reviews: 112, service: 'Tiling', region: 'Jeddah', image: require('../../assets/saudi-arabian-faces/istockphoto-1397179727-612x612.jpg') },
      { name: 'Sultan Al-Zahrani', rating: 4.9, reviews: 145, service: 'Roofing', region: 'Riyadh', image: require('../../assets/saudi-arabian-faces/download.jpeg') },
      { name: 'Hamad Al-Ghamdi', rating: 4.8, reviews: 123, service: 'Landscaping', region: 'Mecca', image: require('../../assets/saudi-arabian-faces/images.jpeg') },
      { name: 'Bandar Al-Shammari', rating: 4.6, reviews: 98, service: 'Flooring', region: 'Dammam', image: require('../../assets/saudi-arabian-faces/istockphoto-1390994395-612x612.jpg') },
      { name: 'Saud Al-Ajmi', rating: 5.0, reviews: 178, service: 'Plumbing', region: 'Jeddah', image: require('../../assets/saudi-arabian-faces/istockphoto-1394149742-612x612.jpg') },
      { name: 'Fahad Al-Thani', rating: 4.8, reviews: 134, service: 'Electrical', region: 'Riyadh', image: require('../../assets/saudi-arabian-faces/istockphoto-1397179727-612x612.jpg') },
    ],
    cities: [
      { name: 'Riyadh', image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400', projects: 1247 },
      { name: 'Jeddah', image: require('../../assets/pexels-filip-marcus-adam-3638207-31157351.jpg'), projects: 892 },
      { name: 'Dammam', image: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400', projects: 456 },
      { name: 'Mecca', image: require('../../assets/pexels-zeynep-sude-dudukcu-558340797-22866288.jpg'), projects: 634 },
    ],
    screenshots: [
      require('../../assets/user/IMG_4784.png'),
      require('../../assets/user/IMG_4785.png'),
      require('../../assets/user/IMG_4786.png'),
      require('../../assets/user/IMG_4787.png'),
      require('../../assets/user/IMG_4788.png'),
      require('../../assets/user/IMG_4789.png'),
      require('../../assets/user/IMG_4790.png'),
      require('../../assets/user/IMG_4791.png'),
    ],
    technicianScreenshots: [
      require('../../assets/user/IMG_4784.png'),
      require('../../assets/user/IMG_4785.png'),
      require('../../assets/user/IMG_4786.png'),
      require('../../assets/user/IMG_4787.png'),
      require('../../assets/user/IMG_4788.png'),
      require('../../assets/user/IMG_4789.png'),
      require('../../assets/user/IMG_4790.png'),
      require('../../assets/user/IMG_4791.png'),
    ],
  };

  const providerConfig = {
    primaryColor: '#1565C0', // Darker blue
    secondaryColor: '#BBDEFB', // Lighter blue
    features: [
      { icon: 'briefcase-outline', title: t('overview.provider.features.jobs.title'), desc: t('overview.provider.features.jobs.desc') },
      { icon: 'trending-up-outline', title: t('overview.provider.features.grow.title'), desc: t('overview.provider.features.grow.desc') },
      { icon: 'wallet-outline', title: t('overview.provider.features.earn.title'), desc: t('overview.provider.features.earn.desc') },
      { icon: 'people-outline', title: t('overview.provider.features.build.title'), desc: t('overview.provider.features.build.desc') },
    ],
    benefits: [
      t('overview.provider.benefits.1'),
      t('overview.provider.benefits.2'),
      t('overview.provider.benefits.3'),
      t('overview.provider.benefits.4'),
    ],
    availableServices: [
      { title: 'Electrical Work', budget: '5K - 15K SAR', image: require('../../assets/pexels-arshutter-29450383.jpg'), bids: 18 },
      { title: 'Building Construction', budget: '50K - 120K SAR', image: require('../../assets/pexels-hanna-alves-1907982668-28812511.jpg'), bids: 25 },
      { title: 'Home Renovation', budget: '15K - 45K SAR', image: require('../../assets/pexels-shanu-azhikode-531962-32493302.jpg'), bids: 32 },
      { title: 'Tiling Services', budget: '8K - 25K SAR', image: require('../../assets/pexels-thoinamcao-15124970.jpg'), bids: 20 },
    ],
    screenshots: [
      require('../../assets/technician_screenshots//IMG_4776.png'),
      require('../../assets/technician_screenshots//IMG_4777.png'),
      require('../../assets/technician_screenshots//IMG_4778.png'),
      require('../../assets/technician_screenshots//IMG_4779.png'),
      require('../../assets/technician_screenshots//IMG_4780.png'),
      require('../../assets/technician_screenshots//IMG_4781.png'),
      require('../../assets/technician_screenshots//IMG_4782.png'),
      require('../../assets/technician_screenshots//IMG_4783.png'),
    ],
  };

        const config: any = userType === 'user' ? userConfig : providerConfig;

  // Auto-scroll technicians carousel with hover pause
  useEffect(() => {
    if (isHoveringTech || userType !== 'user') return; // Pause when hovering or not in user view
    
    let scrollPosition = 0;
    const scrollInterval = setInterval(() => {
      if (techniciansScrollViewRef.current && !isHoveringTech) {
        scrollPosition += 1; // Increment scroll position
        // @ts-ignore - web ScrollView methods
        techniciansScrollViewRef.current.scrollTo({ 
          x: scrollPosition, 
          animated: false 
        });
      }
    }, 30); // Smooth 30ms interval
    
    return () => clearInterval(scrollInterval);
  }, [isHoveringTech, userType]);

  // Auto-scroll screenshots carousel with hover pause
  useEffect(() => {
    if (isHoveringScreenshots) return; // Pause when hovering
    
    let scrollPosition = 0;
    const scrollInterval = setInterval(() => {
      if (screenshotsScrollViewRef.current && !isHoveringScreenshots) {
        scrollPosition += 1.5; // Faster scroll for screenshots
        // @ts-ignore - web ScrollView methods
        screenshotsScrollViewRef.current.scrollTo({ 
          x: scrollPosition, 
          animated: false 
        });
      }
    }, 40); // Smooth 40ms interval
    
    return () => clearInterval(scrollInterval);
  }, [isHoveringScreenshots]);

  // Determine background color based on user type
  const backgroundColor = userType === 'provider' ? '#000000' : colors.background;
  const cardBackground = userType === 'provider' ? '#1A1A1A' : colors.cardBackground;
  const borderColor = userType === 'provider' ? '#333333' : colors.border;
  const textColor = userType === 'provider' ? '#FFFFFF' : colors.text;
  const textSecondaryColor = userType === 'provider' ? '#B0B0B0' : colors.textSecondary;

  // Show loading screen until images are loaded
  if (!imagesLoaded) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: backgroundColor }]}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={[styles.loadingText, { color: textColor }]}>Loading assets...</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: backgroundColor,
          opacity: contentOpacity,
        },
      ]}
    >
      {/* Top Navigation Bar */}
      <View style={[styles.navBar, { backgroundColor: cardBackground, borderBottomColor: borderColor }]}>
        <View style={styles.navContent}>
          <View style={styles.navLeft}>
            <Image 
              source={require('../../assets/bonyad-logo.svg')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          {/* Desktop Navigation */}
          {screenWidth > 768 && (
            <View style={styles.navRight}>
              {/* Toggle in Header with Animated Background */}
              <View style={styles.headerToggleContainer}>
                {/* Animated Background Slider */}
                <Animated.View 
                  style={[
                    styles.toggleBackgroundSlider,
                    {
                      backgroundColor: toggleSlideAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: [userConfig.primaryColor, providerConfig.primaryColor],
                      }),
                      transform: [{
                        translateX: toggleSlideAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      }],
                    }
                  ]}
                />
                
                {/* Buttons */}
                <View style={{ position: 'relative' }}>
                  <TouchableOpacity
                    style={styles.headerToggleButton}
                    onPress={() => handleSwitchType('user')}
                    {...(Platform.OS === 'web' && {
                      onMouseEnter: () => {
                        setHoveringUser(true);
                        Animated.sequence([
                          Animated.timing(userToggleAnim, {
                            toValue: 1,
                            duration: 100,
                            useNativeDriver: true,
                          }),
                          Animated.timing(userToggleAnim, {
                            toValue: 0,
                            duration: 100,
                            useNativeDriver: true,
                          }),
                        ]).start();
                      },
                      onMouseLeave: () => setHoveringUser(false),
                    } as any)}
                  >
                    <Animated.View 
                      style={{
                        transform: [
                          {
                            translateX: userToggleAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 4],
                            }),
                          },
                        ],
                      }}
                    >
                      <Text style={[
                        styles.headerToggleText, 
                        userType === 'user' && styles.headerToggleTextActive
                      ]}>
                        {t('overview.toggle.user')}
                      </Text>
                    </Animated.View>
                  </TouchableOpacity>
                </View>
                <View style={{ position: 'relative' }}>
                  <TouchableOpacity
                    style={styles.headerToggleButton}
                    onPress={() => handleSwitchType('provider')}
                    {...(Platform.OS === 'web' && {
                      onMouseEnter: () => {
                        setHoveringBonyader(true);
                        Animated.sequence([
                          Animated.timing(bonyaderToggleAnim, {
                            toValue: 1,
                            duration: 100,
                            useNativeDriver: true,
                          }),
                          Animated.timing(bonyaderToggleAnim, {
                            toValue: 0,
                            duration: 100,
                            useNativeDriver: true,
                          }),
                        ]).start();
                      },
                      onMouseLeave: () => setHoveringBonyader(false),
                    } as any)}
                  >
                    <Animated.View 
                      style={{
                        transform: [
                          {
                            translateX: bonyaderToggleAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, -4],
                            }),
                          },
                        ],
                      }}
                    >
                      <Text style={[
                        styles.headerToggleText, 
                        userType === 'provider' && styles.headerToggleTextActive
                      ]}>
                        {t('overview.toggle.provider')}
                      </Text>
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Features Dropdown */}
              <View style={styles.featuresDropdown}>
                <TouchableOpacity 
                  style={styles.navItemWithIcon} 
                  onPress={() => setFeaturesMenuOpen(!featuresMenuOpen)}
                >
                  <Text style={[styles.navText, { color: textColor }]}>Features</Text>
                  <Ionicons 
                    name={featuresMenuOpen ? 'chevron-up' : 'chevron-down'} 
                    size={16} 
                    color={textColor} 
                    style={styles.chevronIcon}
                  />
                </TouchableOpacity>
                {featuresMenuOpen && (
                  <View style={[styles.dropdownMenu, { backgroundColor: cardBackground, borderColor: borderColor }]}>
                    <TouchableOpacity 
                      style={styles.dropdownItem} 
                      onPress={() => { setFeaturesMenuOpen(false); onNavigateToVoiceAI?.(); }}
                    >
                      <Ionicons name="mic" size={20} color={config.primaryColor} />
                      <Text style={[styles.dropdownText, { color: textColor }]}>Voice AI</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.dropdownItem} 
                      onPress={() => { setFeaturesMenuOpen(false); onNavigateToCostExplorer?.(); }}
                    >
                      <Ionicons name="calculator" size={20} color={config.primaryColor} />
                      <Text style={[styles.dropdownText, { color: textColor }]}>Cost Explorer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.dropdownItem} 
                      onPress={() => { setFeaturesMenuOpen(false); onNavigateToRoomVisualizer?.(); }}
                    >
                      <Ionicons name="color-palette" size={20} color={config.primaryColor} />
                      <Text style={[styles.dropdownText, { color: textColor }]}>Room Visualizer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.dropdownItem} 
                      onPress={() => { setFeaturesMenuOpen(false); onNavigateToAskBonyadAI?.(); }}
                    >
                      <Ionicons name="chatbubbles" size={20} color={config.primaryColor} />
                      <Text style={[styles.dropdownText, { color: textColor }]}>Ask Bonyad AI</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => onNavigateToAbout?.()}
              >
                <Text style={[styles.navText, { color: textColor }]}>About Us</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => onNavigateToContact?.()}
              >
                <Text style={[styles.navText, { color: textColor }]}>Contact</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => onNavigateToIntroToApp?.()}
              >
                <Text style={[styles.navText, { color: textColor }]}>Intro to the App</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, { backgroundColor: config.primaryColor }]}
                onPress={onNavigateToLogin}
              >
                <Text style={styles.navButtonText}>{t('overview.cta.button')}</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Mobile Hamburger Menu */}
          {screenWidth <= 768 && (
            <TouchableOpacity 
              style={styles.hamburgerButton}
              onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Ionicons name="menu" size={28} color={textColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Mobile Menu Overlay - Outside navBar */}
      {screenWidth <= 768 && mobileMenuOpen && (
        <View style={[styles.mobileMenuOverlay, { backgroundColor: cardBackground }]}>
          {/* Toggle in Mobile Menu */}
          <View style={styles.mobileToggleContainer}>
            <Animated.View 
              style={[
                styles.toggleBackgroundSlider,
                {
                  backgroundColor: toggleSlideAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: [userConfig.primaryColor, providerConfig.primaryColor],
                  }),
                  transform: [{
                    translateX: toggleSlideAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  }],
                }
              ]}
            />
            <TouchableOpacity
              style={styles.mobileToggleButton}
              onPress={() => handleSwitchType('user')}
            >
              <Text style={[
                styles.headerToggleText, 
                userType === 'user' && styles.headerToggleTextActive
              ]}>
                {t('overview.toggle.user')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mobileToggleButton}
              onPress={() => handleSwitchType('provider')}
            >
              <Text style={[
                styles.headerToggleText, 
                userType === 'provider' && styles.headerToggleTextActive
              ]}>
                {t('overview.toggle.provider')}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Mobile Features Menu */}
          <View style={styles.mobileMenuItem}>
            <TouchableOpacity onPress={() => setFeaturesMenuOpen(!featuresMenuOpen)}>
              <Text style={[styles.mobileMenuText, { color: textColor }]}>Features</Text>
            </TouchableOpacity>
            {featuresMenuOpen && (
              <View style={styles.mobileFeaturesList}>
                <TouchableOpacity 
                  style={styles.mobileFeatureItem} 
                  onPress={() => { setMobileMenuOpen(false); setFeaturesMenuOpen(false); onNavigateToVoiceAI?.(); }}
                >
                  <Ionicons name="mic" size={20} color={config.primaryColor} />
                  <Text style={[styles.mobileFeatureText, { color: textColor }]}>Voice AI</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.mobileFeatureItem} 
                  onPress={() => { setMobileMenuOpen(false); setFeaturesMenuOpen(false); onNavigateToCostExplorer?.(); }}
                >
                  <Ionicons name="calculator" size={20} color={config.primaryColor} />
                  <Text style={[styles.mobileFeatureText, { color: textColor }]}>Cost Explorer</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.mobileFeatureItem} 
                  onPress={() => { setMobileMenuOpen(false); setFeaturesMenuOpen(false); onNavigateToRoomVisualizer?.(); }}
                >
                  <Ionicons name="color-palette" size={20} color={config.primaryColor} />
                  <Text style={[styles.mobileFeatureText, { color: textColor }]}>Room Visualizer</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.mobileFeatureItem} 
                  onPress={() => { setMobileMenuOpen(false); setFeaturesMenuOpen(false); onNavigateToAskBonyadAI?.(); }}
                >
                  <Ionicons name="chatbubbles" size={20} color={config.primaryColor} />
                  <Text style={[styles.mobileFeatureText, { color: textColor }]}>Ask Bonyad AI</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.mobileMenuItem}
            onPress={() => {
              setMobileMenuOpen(false);
              onNavigateToAbout?.();
            }}
          >
            <Text style={[styles.mobileMenuText, { color: textColor }]}>About Us</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mobileMenuItem}
            onPress={() => {
              setMobileMenuOpen(false);
              onNavigateToContact?.();
            }}
          >
            <Text style={[styles.mobileMenuText, { color: textColor }]}>Contact</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mobileMenuItem}
            onPress={() => {
              setMobileMenuOpen(false);
              onNavigateToIntroToApp?.();
            }}
          >
            <Text style={[styles.mobileMenuText, { color: textColor }]}>Intro to the App</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mobileMenuButton, { backgroundColor: config.primaryColor }]}
            onPress={onNavigateToLogin}
          >
            <Text style={styles.navButtonText}>{t('overview.cta.button')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView ref={scrollViewRef} contentContainerStyle={[styles.scrollContent, { backgroundColor: backgroundColor }]}>
        {/* Full Screen Image Section */}
        <View style={styles.fullScreenImageSection}>
          <Text style={styles.fullScreenImageTitle}>
            {displayedText}
            {displayedText.length < 17 && (
              <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>|</Animated.Text>
            )}
          </Text>
          <Image 
            source={userType === 'user' 
              ? require('../../assets/pexels-mdamirumar-30320202.jpg')
              : require('../../assets/riyadh-night.jpg')
            }
            style={styles.fullScreenImage}
            resizeMode="cover"
          />
        </View>

        {/* Carousels Section */}
        {userType === 'user' ? (
          <>
            {/* Top Technicians Carousel */}
            <View ref={techniciansSectionRef} style={[styles.carouselSection, { backgroundColor: backgroundColor }]}>
              <View style={styles.carouselHeader}>
                <Text style={[styles.carouselTitle, { color: textColor }]}>Top Rated Technicians</Text>
                <TouchableOpacity>
                  <Text style={[styles.seeAllText, { color: config.primaryColor }]}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                ref={techniciansScrollViewRef}
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: techniciansScrollX } } }],
                  { useNativeDriver: false }
                )}
                {...(Platform.OS === 'web' && {
                  onMouseEnter: () => setIsHoveringTech(true),
                  onMouseLeave: () => setIsHoveringTech(false),
                } as any)}
              >
                {config.technicians?.map((technician: any, index: number) => (
                  <View key={index} style={[styles.technicianCardLarge, { backgroundColor: cardBackground }]}>
                    <Image 
                      source={typeof technician.image === 'string' ? { uri: technician.image } : technician.image} 
                      style={styles.technicianImageLarge} 
                    />
                    <View style={styles.technicianInfo}>
                      <Text style={[styles.technicianNameLarge, { color: textColor }]}>{technician.name}</Text>
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={18} color="#FFD700" />
                        <Text style={[styles.ratingTextLarge, { color: textSecondaryColor }]}>{technician.rating}</Text>
                        <Text style={[styles.reviewsTextLarge, { color: textSecondaryColor }]}>({technician.reviews})</Text>
                      </View>
                      <View style={styles.technicianDetails}>
                        <View style={styles.detailItem}>
                          <Ionicons name="construct-outline" size={16} color={config.primaryColor} />
                          <Text style={[styles.detailText, { color: textColor }]}>{technician.service}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Ionicons name="location-outline" size={16} color={config.primaryColor} />
                          <Text style={[styles.detailText, { color: textColor }]}>{technician.region}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Covered Cities Carousel */}
            <View style={[styles.carouselSection, { backgroundColor: backgroundColor }]}>
              <View style={styles.carouselHeader}>
                <Text style={[styles.carouselTitle, { color: textColor }]}>Our Coverage Areas</Text>
                <TouchableOpacity>
                  <Text style={[styles.seeAllText, { color: config.primaryColor }]}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
              >
                {config.cities?.map((city: any, index: number) => (
                  <View key={index} style={[styles.cityCard, { backgroundColor: cardBackground }]}>
                    <Image 
                      source={typeof city.image === 'string' ? { uri: city.image } : city.image} 
                      style={styles.cityImage} 
                    />
                    <View style={styles.cityOverlay}>
                      <Text style={styles.cityName}>{city.name}</Text>
                      <Text style={styles.cityProjects}>{city.projects} Projects</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </>
        ) : (
          /* Available Services for Technicians */
          <View style={[styles.carouselSection, { backgroundColor: backgroundColor }]}>
            <View style={styles.carouselHeader}>
              <Text style={[styles.carouselTitle, { color: textColor }]}>Available Projects</Text>
              <TouchableOpacity>
                <Text style={[styles.seeAllText, { color: config.primaryColor }]}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
            >
              {config.availableServices?.map((service: any, index: number) => (
                <View key={index} style={[styles.serviceCard, { backgroundColor: cardBackground }]}>
                  <Image 
                    source={typeof service.image === 'string' ? { uri: service.image } : service.image} 
                    style={styles.serviceImage} 
                  />
                  <View style={styles.serviceInfo}>
                    <Text style={[styles.serviceTitle, { color: textColor }]}>{service.title}</Text>
                    <Text style={[styles.serviceBudget, { color: config.primaryColor }]}>{service.budget}</Text>
                    <View style={styles.bidsContainer}>
                      <Ionicons name="people-outline" size={16} color={textSecondaryColor} />
                      <Text style={[styles.bidsText, { color: textSecondaryColor }]}>{service.bids} Bids</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* App Screenshots Carousel - For Both User and Technician */}
        <View style={[styles.carouselSection, { backgroundColor: backgroundColor }]}>
          <View style={styles.carouselHeader}>
            <Text style={[styles.carouselTitle, { color: textColor }]}>App Screenshots</Text>
          </View>
          <ScrollView 
            ref={screenshotsScrollViewRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            {...(Platform.OS === 'web' && {
              onMouseEnter: () => setIsHoveringScreenshots(true),
              onMouseLeave: () => setIsHoveringScreenshots(false),
            } as any)}
          >
            {config.screenshots?.map((screenshot: any, index: number) => (
              <View key={index} style={[styles.screenshotCard, { backgroundColor: '#1a1a1a' }]}>
                <Image source={screenshot} style={styles.screenshotImage} resizeMode="cover" />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresGrid}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {t(`overview.${userType}.features.title`)}
          </Text>
          <View style={styles.featuresRow}>
            {config.features.map((feature: any, index: number) => (
              <View
                key={index}
                style={[styles.featureCard, { backgroundColor: cardBackground, borderColor: config.primaryColor }]}
              >
                <View style={[styles.iconContainer, { backgroundColor: config.primaryColor + '20' }]}>
                  <Ionicons name={feature.icon as any} size={40} color={config.primaryColor} />
                </View>
                <Text style={[styles.featureTitle, { color: textColor }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: textSecondaryColor }]}>
                  {feature.desc}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Benefits Section */}
        <View style={[styles.benefitsSection, { backgroundColor: cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {t(`overview.${userType}.benefits.title`)}
          </Text>
          <View style={styles.benefitsGrid}>
            {config.benefits.map((benefit: any, index: number) => (
              <View key={index} style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: config.primaryColor + '20' }]}>
                  <Ionicons name="checkmark-circle" size={32} color={config.primaryColor} />
                </View>
                <Text style={[styles.benefitText, { color: textColor }]}>{benefit}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Final CTA */}
        <View style={[styles.finalCta, { backgroundColor: config.primaryColor }]}>
          <Text style={styles.finalCtaTitle}>{t(`overview.${userType}.cta.title`)}</Text>
          <Text style={styles.finalCtaDescription}>{t(`overview.${userType}.cta.description`)}</Text>
          <TouchableOpacity
            style={styles.finalCtaButton}
            onPress={onNavigateToLogin}
          >
            <Text style={styles.finalCtaButtonText}>{t('overview.cta.button')}</Text>
          </TouchableOpacity>
        </View>

        {/* How to Get Started Section */}
        <View style={[styles.howToSection, { backgroundColor: backgroundColor }]}>
          <Text style={[styles.howToTitle, { color: textColor }]}>
            {t(`overview.${userType}.howToGetStarted.title`)}
          </Text>
          <View style={styles.stepsContainer}>
            {[1, 2, 3, 4].map((stepNum) => (
              <React.Fragment key={stepNum}>
                <View style={[styles.stepCard, { backgroundColor: cardBackground }]}>
                  <View style={[styles.stepNumber, { backgroundColor: config.primaryColor }]}>
                    <Text style={styles.stepNumberText}>{stepNum}</Text>
                  </View>
                  <Text style={[styles.stepTitle, { color: textColor }]}>
                    {t(`overview.${userType}.howToGetStarted.steps.${stepNum}.title`)}
                  </Text>
                  <Text style={[styles.stepDescription, { color: textSecondaryColor }]}>
                    {t(`overview.${userType}.howToGetStarted.steps.${stepNum}.description`)}
                  </Text>
                </View>
                {stepNum < 4 && (
                  <View style={styles.arrowContainer}>
                    <Ionicons name="arrow-forward" size={40} color={config.primaryColor} />
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Download App Section */}
        <View style={[styles.downloadSection, { backgroundColor: cardBackground }]}>
          <Text style={[styles.downloadTitle, { color: textColor, fontSize: scaledSize(screenWidth <= 768 ? 28 : 36) }]}>
            Download the Bonyad App
          </Text>
          <Text style={[styles.downloadSubtitle, { color: config.primaryColor, fontSize: scaledSize(screenWidth <= 768 ? 20 : 24) }]}>
            One App for Both Users and Technicians
          </Text>
          <Text style={[styles.downloadDescription, { color: textSecondaryColor, fontSize: scaledSize(screenWidth <= 768 ? 16 : 18) }]}>
            Whether you're a homeowner looking for skilled professionals or a technician seeking new opportunities, our app has everything you need.
          </Text>
          <View style={styles.downloadButtons}>
                         <TouchableOpacity 
              style={[styles.downloadButton, { backgroundColor: '#000' }]}
              onPress={() => Alert.alert('iOS Download', 'App will be available on the App Store soon!')}
            >
              <Ionicons name="logo-apple" size={screenWidth <= 768 ? 24 : 28} color="#fff" />
              <View style={styles.downloadButtonText}>
                <Text style={[styles.downloadButtonLabel, { fontSize: scaledSize(screenWidth <= 768 ? 10 : 12) }]}>Available on</Text>
                <Text style={[styles.downloadButtonPlatform, { fontSize: scaledSize(screenWidth <= 768 ? 16 : 20) }]}>iOS</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.downloadButton, { backgroundColor: '#000' }]}
              onPress={() => Alert.alert('Android Download', 'App will be available on Google Play soon!')}
            >
              <Ionicons name="logo-google-playstore" size={screenWidth <= 768 ? 24 : 28} color="#fff" />
              <View style={styles.downloadButtonText}>
                <Text style={[styles.downloadButtonLabel, { fontSize: scaledSize(screenWidth <= 768 ? 10 : 12) }]}>Available on</Text>
                <Text style={[styles.downloadButtonPlatform, { fontSize: scaledSize(screenWidth <= 768 ? 16 : 20) }]}>Android</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: backgroundColor }]}>
          <View style={styles.footerContent}>
            {/* Company Info */}
            <View style={styles.footerSection}>
              <Image 
                source={require('../../assets/bonyad-logo.svg')} 
                style={styles.footerLogo}
                resizeMode="contain"
              />
              <Text style={[styles.footerDescription, { color: textSecondaryColor }]}>
                Connecting skilled technicians with homeowners for quality home improvements.
              </Text>
            </View>

            {/* Quick Links */}
            <View style={styles.footerSection}>
              <Text style={[styles.footerSectionTitle, { color: textColor }]}>Quick Links</Text>
              <TouchableOpacity style={styles.footerLink}>
                <Text style={[styles.footerLinkText, { color: textSecondaryColor }]}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerLink}>
                <Text style={[styles.footerLinkText, { color: textSecondaryColor }]}>Services</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerLink}>
                <Text style={[styles.footerLinkText, { color: textSecondaryColor }]}>About Us</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerLink}>
                <Text style={[styles.footerLinkText, { color: textSecondaryColor }]}>Contact</Text>
              </TouchableOpacity>
            </View>

            {/* Contact Info */}
            <View style={styles.footerSection}>
              <Text style={[styles.footerSectionTitle, { color: textColor }]}>Contact Us</Text>
              <View style={styles.contactItem}>
                <Ionicons name="location-outline" size={18} color={textSecondaryColor} />
                <Text style={[styles.contactText, { color: textSecondaryColor }]}>
                  King Fahd Road, Olaya{'\n'}Riyadh, Saudi Arabia
                </Text>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="mail-outline" size={18} color={textSecondaryColor} />
                <Text style={[styles.contactText, { color: textSecondaryColor }]}>
                  info@bonyad.com
                </Text>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="call-outline" size={18} color={textSecondaryColor} />
                <Text style={[styles.contactText, { color: textSecondaryColor }]}>
                  +966 11 123 4567
                </Text>
              </View>
            </View>

            {/* Support Button */}
            <View style={styles.footerSection}>
              <Text style={[styles.footerSectionTitle, { color: textColor }]}>Need Help?</Text>
              <TouchableOpacity
                style={[styles.supportButton, { backgroundColor: config.primaryColor }]}
                onPress={() => Alert.alert('Support', 'Contact support at support@bonyad.com')}
              >
                <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
                <Text style={styles.supportButtonText}>Get Support</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Bottom */}
          <View style={[styles.footerBottom, { borderTopColor: borderColor }]}>
            <Text style={[styles.footerCopyright, { color: textSecondaryColor }]}>
              © 2024 Bonyad. All rights reserved.
            </Text>
            <View style={styles.socialLinks}>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-facebook" size={20} color={textSecondaryColor} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-twitter" size={20} color={textSecondaryColor} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-instagram" size={20} color={textSecondaryColor} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-linkedin" size={20} color={textSecondaryColor} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Chat Support Button */}
      {Platform.OS === 'web' && (
        <View style={styles.floatingChatButton}>
          <TouchableOpacity 
            style={[styles.chatButton, { backgroundColor: config.primaryColor }]}
            onPress={() => Alert.alert('Chat Support', 'Chat support feature coming soon!')}
            {...(Platform.OS === 'web' && {
              onMouseEnter: () => setIsHovering(true),
              onMouseLeave: () => setIsHovering(false),
            } as any)}
          >
            <Ionicons name="chatbubbles" size={24} color="#fff" />
            {isHovering && (
              <Animated.View style={styles.chatButtonText}>
                <Text style={styles.chatButtonLabel}>Chat Support</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    height: 70,
    borderBottomWidth: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    zIndex: 10000,
  },
  navContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    position: 'relative',
    zIndex: 10001,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoImage: {
    width: 100,
    height: 30,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  headerToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: 30,
    padding: 2,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    position: 'relative',
  },
  toggleBackgroundSlider: {
    position: 'absolute',
    width: '48%',
    height: '85%',
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    top: '7.5%',
    left: '1%',
  },
  headerToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 28,
    minWidth: 90,
    alignItems: 'center',
    flex: 1,
    zIndex: 1,
  },
  headerToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  headerToggleTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  navItem: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    position: 'relative',
  },
  navItemWithIcon: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  navText: {
    fontSize: 15,
    fontWeight: '500',
  },
  chevronIcon: {
    marginLeft: 4,
  },
  featuresDropdown: {
    position: 'relative',
    zIndex: 10000,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10001,
    minWidth: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '500',
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 60,
    paddingTop: 80,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    maxWidth: 800,
  },
  headerTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 20,
    color: '#fff',
    opacity: 0.95,
    textAlign: 'center',
  },
  fullScreenImageSection: {
    width: '100%',
    height: Dimensions.get('window').height,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' && { minHeight: '100vh' } as any),
  },
  fullScreenImageTitle: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
    position: 'absolute',
    top: '20%',
    zIndex: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  cursor: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  heroSection: {
    padding: 60,
    margin: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === 'web' && {
      '@media (max-width: 768px)': {
        padding: 30,
        margin: 10,
      },
    } as any),
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    ...(Platform.OS === 'web' && {
      '@media (max-width: 768px)': {
        flexDirection: 'column',
        gap: 20,
      },
    } as any),
  },
  heroLeft: {
    flex: 1,
  },
  heroRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTitle: {
    fontSize: 44,
    fontWeight: 'bold',
    marginBottom: 20,
    lineHeight: 56,
  },
  heroDescription: {
    fontSize: 20,
    lineHeight: 32,
    marginBottom: 32,
    ...(Platform.OS === 'web' && {
      '@media (max-width: 768px)': {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 24,
      },
    } as any),
  },
  heroStats: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  featuresGrid: {
    padding: 40,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  featureCard: {
    width: '45%',
    minWidth: 280,
    padding: 32,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  featureDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  benefitsSection: {
    padding: 60,
    margin: 20,
    borderRadius: 20,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    minWidth: 300,
    marginBottom: 16,
  },
  benefitIcon: {
    marginRight: 16,
  },
  benefitText: {
    fontSize: 18,
    flex: 1,
  },
  finalCta: {
    padding: 80,
    margin: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  finalCtaTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  finalCtaDescription: {
    fontSize: 20,
    color: '#fff',
    opacity: 0.95,
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: 700,
  },
  finalCtaButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 50,
  },
  finalCtaButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 50,
    alignSelf: 'flex-start',
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  topRatedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 50,
    alignSelf: 'flex-start',
    gap: 12,
  },
  topRatedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Character Styles
  characterContainer: {
    position: 'absolute',
    width: 35,
    height: 40,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 3,
  },
  character: {
    width: 35,
    height: 40,
    alignItems: 'center',
    position: 'relative',
  },
  // Simple Person Parts
  head: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 2,
  },
  headWithHat: {
    marginTop: 8,
  },
  body: {
    width: 16,
    height: 14,
    borderRadius: 2,
    marginBottom: 2,
  },
  arm: {
    position: 'absolute',
    width: 4,
    height: 10,
  },
  armLeft: {
    left: 0,
    top: 14,
  },
  armRight: {
    right: 0,
    top: 14,
  },
  leg: {
    position: 'absolute',
    width: 4,
    height: 12,
    borderRadius: 2,
    bottom: 0,
  },
  legLeft: {
    left: 6,
  },
  legRight: {
    right: 6,
  },
  // Worker Hat
  // Carousel Styles
  carouselSection: {
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  carouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  carouselTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 16,
    fontWeight: '600',
  },
  carouselContent: {
    paddingLeft: 20,
  },
  // Technician Card
  technicianCard: {
    width: 200,
    marginRight: 16,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  technicianImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  technicianName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewsText: {
    fontSize: 12,
  },
  // Large Technician Card
  technicianCardLarge: {
    width: 280,
    marginRight: 40,
    borderRadius: 20,
    padding: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  technicianImageLarge: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  technicianInfo: {
    padding: 16,
  },
  technicianNameLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  ratingTextLarge: {
    fontSize: 16,
    fontWeight: '600',
  },
  reviewsTextLarge: {
    fontSize: 14,
  },
  technicianDetails: {
    marginTop: 12,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // City Card
  cityCard: {
    width: 280,
    height: 180,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cityImage: {
    width: '100%',
    height: '100%',
  },
  cityOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
  },
  cityName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  cityProjects: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  // Screenshot Card
  screenshotCard: {
    width: 350,
    height: 757,
    marginRight: 30,
    borderRadius: 35,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    backgroundColor: '#000',
    padding: 8,
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
  },
  // Service Card
  serviceCard: {
    width: 280,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceImage: {
    width: '100%',
    height: 160,
  },
  serviceInfo: {
    padding: 16,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  serviceBudget: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  bidsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bidsText: {
    fontSize: 14,
  },
  hat: {
    position: 'absolute',
    width: 14,
    height: 6,
    top: 2,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  // How to Get Started Styles
  howToSection: {
    padding: 60,
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  howToTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 50,
  },
  stepsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 30,
  },
  stepCard: {
    flex: 1,
    minWidth: 240,
    maxWidth: 280,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  stepNumber: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  // Download App Styles
  downloadSection: {
    padding: 80,
    paddingHorizontal: 40,
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      '@media (max-width: 768px)': {
        padding: 40,
        paddingHorizontal: 20,
      },
    } as any),
  },
  downloadTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      '@media (max-width: 768px)': {
        fontSize: 28,
      },
    } as any),
  },
  downloadSubtitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      '@media (max-width: 768px)': {
        fontSize: 20,
      },
    } as any),
  },
  downloadDescription: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: 700,
    ...(Platform.OS === 'web' && {
      '@media (max-width: 768px)': {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 30,
      },
    } as any),
  },
  downloadButtons: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    gap: 12,
  },
  downloadButtonText: {
    flexDirection: 'column',
  },
  downloadButtonLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  downloadButtonPlatform: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  // Footer Styles
  footer: {
    padding: 60,
    paddingHorizontal: 40,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 40,
    marginBottom: 40,
  },
  footerSection: {
    flex: 1,
    maxWidth: 250,
  },
  footerLogo: {
    width: 120,
    height: 35,
    marginBottom: 16,
  },
  footerDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  footerSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  footerLink: {
    marginBottom: 12,
  },
  footerLinkText: {
    fontSize: 14,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    flex: 1,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 30,
    borderTopWidth: 1,
  },
  footerCopyright: {
    fontSize: 14,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    padding: 4,
  },
  // Floating Chat Button
  floatingChatButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    zIndex: 1000,
    ...(Platform.OS === 'web' && { position: 'fixed' as any }),
  },
  chatButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
  },
  chatButtonText: {
    marginLeft: 4,
  },
  chatButtonLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Mobile Menu Styles
  hamburgerButton: {
    padding: 8,
  },
  mobileMenuOverlay: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  mobileToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: 30,
    padding: 2,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    position: 'relative',
  },
  mobileToggleButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    alignItems: 'center',
    flex: 1,
    zIndex: 1,
  },
  mobileMenuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  mobileMenuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  mobileFeaturesList: {
    marginTop: 10,
    marginLeft: 20,
    gap: 5,
  },
  mobileFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  mobileFeatureText: {
    fontSize: 15,
    fontWeight: '500',
  },
  mobileMenuButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 12,
  },
  // Loading screen styles
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
