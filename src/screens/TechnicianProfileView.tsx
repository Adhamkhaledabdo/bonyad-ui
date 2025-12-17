import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Linking,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTechnicianProfile, TechnicianProfile } from '../services/TechnicianService';
import { getPublicPortfolio, getPublicPDFInfo, getQRCodeUrl, PortfolioPDFInfo } from '../services/PortfolioService';
import { storage } from '../utils/storage';


interface TechnicianProfileViewProps {
  technicianId: number;
  onBack: () => void;
}

interface PortfolioProject {
  id: number;
  title: string;
  description: string;
  location?: string;
  projectValue?: number;
  photos?: string[];
  files?: string[];
}

interface PublicPortfolio {
  id: number;
  userId: number;
  bio?: string;
  pastProjects?: PortfolioProject[];
}

export default function TechnicianProfileView({
  technicianId,
  onBack,
}: TechnicianProfileViewProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  
  // Responsive dimensions
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenDimensions.width >= 1024;
  const IS_MEDIUM_WEB = IS_WEB && screenDimensions.width >= 768 && screenDimensions.width < 1024;
  const IS_SMALL_WEB = IS_WEB && screenDimensions.width < 768;
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });
    return () => subscription?.remove();
  }, []);
  
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PublicPortfolio | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PortfolioPDFInfo | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPhotoSlideshow, setShowPhotoSlideshow] = useState(false);
  const [slideshowPhotos, setSlideshowPhotos] = useState<string[]>([]);
  const [slideshowProjectTitle, setSlideshowProjectTitle] = useState<string>('');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const slideshowScrollRef = useRef<ScrollView>(null);
  
  // RTL detection
  const isRTL = i18n.language === 'ar';
  
  useEffect(() => {
    loadData();
  }, [technicianId]);
  
  // Scroll to current photo when slideshow opens and preload images
  useEffect(() => {
    if (showPhotoSlideshow && slideshowScrollRef.current && slideshowPhotos.length > 0) {
      // Preload first few images when slideshow opens
      const imagesToPreload = slideshowPhotos.slice(0, Math.min(3, slideshowPhotos.length));
      imagesToPreload.forEach((photo) => {
        Image.prefetch(photo).catch(() => {
          // Silently fail - image will load when needed
        });
      });
      
      setTimeout(() => {
        slideshowScrollRef.current?.scrollTo({
          x: currentPhotoIndex * Dimensions.get('window').width,
          animated: false,
        });
      }, 50);
    }
  }, [showPhotoSlideshow]);
  
  // Update scroll position when currentPhotoIndex changes (for dots navigation only)
  // Don't update for arrow navigation to avoid conflicts
  const [isNavigatingViaDots, setIsNavigatingViaDots] = useState(false);
  
  useEffect(() => {
    if (showPhotoSlideshow && slideshowScrollRef.current && currentPhotoIndex >= 0 && isNavigatingViaDots) {
      const screenWidth = Dimensions.get('window').width;
      slideshowScrollRef.current.scrollTo({
        x: currentPhotoIndex * screenWidth,
        animated: true,
      });
      setIsNavigatingViaDots(false);
    }
  }, [currentPhotoIndex, isNavigatingViaDots]);
  
  const loadData = async () => {
    setIsLoadingProfile(true);
    setIsLoadingPortfolio(true);
    setError(null);
    
    try {
      // Load profile
      const profileData = await getTechnicianProfile(technicianId);
      setProfile(profileData);
      setIsLoadingProfile(false);
      
      // Load portfolio
      try {
        const portfolioData = await getPublicPortfolio(technicianId);
        setPortfolio(portfolioData);
      } catch (err) {
        console.log('⚠️ No portfolio found for technician:', technicianId);
        setPortfolio(null);
      } finally {
        setIsLoadingPortfolio(false);
      }
      
      // Load PDF info
      try {
        const pdfData = await getPublicPDFInfo(technicianId);
        setPdfInfo(pdfData);
      } catch (err) {
        console.log('⚠️ No PDF found for technician:', technicianId);
        setPdfInfo(null);
      }
    } catch (err: any) {
      console.error('❌ [TechnicianProfileView] Error loading data:', err);
      setError(err.message || t('Failed to load profile'));
      setIsLoadingProfile(false);
      setIsLoadingPortfolio(false);
    }
  };
  
  const normalizeImageUrl = (url: string): string => {
    if (url.startsWith('/uploads')) {
      return `https://www.bonyad-hub.com${url}`;
    }
    return url;
  };
  
  const handleOpenSlideshowFromProject = (projectPhotos: string[], projectTitle: string, index: number = 0) => {
    if (projectPhotos.length === 0) return;
    
    const normalizedPhotos = projectPhotos.map(normalizeImageUrl);
    setSlideshowPhotos(normalizedPhotos);
    setSlideshowProjectTitle(projectTitle);
    setCurrentPhotoIndex(index);
    setShowPhotoSlideshow(true);
    
    // Preload adjacent images for smoother navigation
    setTimeout(() => {
      preloadAdjacentImages(normalizedPhotos, index);
    }, 100);
  };
  
  const preloadAdjacentImages = (photos: string[], currentIndex: number) => {
    // Preload current, previous, and next images
    const indicesToPreload = [
      currentIndex - 1,
      currentIndex,
      currentIndex + 1,
      currentIndex + 2, // Preload one more ahead for smoother scrolling
    ].filter(idx => idx >= 0 && idx < photos.length);
    
    indicesToPreload.forEach((idx) => {
      if (photos[idx]) {
        Image.prefetch(photos[idx]).catch((err) => {
          // Silently fail - image will load when needed
        });
      }
    });
  };
  
  const handleNextPhoto = () => {
    if (currentPhotoIndex < slideshowPhotos.length - 1) {
      const nextIndex = currentPhotoIndex + 1;
      const screenWidth = Dimensions.get('window').width;
      
      // Preload next images before scrolling
      preloadAdjacentImages(slideshowPhotos, nextIndex);
      
      // Update index first
      setCurrentPhotoIndex(nextIndex);
      
      // Scroll to next photo
      if (slideshowScrollRef.current) {
        slideshowScrollRef.current.scrollTo({
          x: nextIndex * screenWidth,
          animated: true,
        });
      }
    }
  };
  
  const handlePreviousPhoto = () => {
    if (currentPhotoIndex > 0) {
      const prevIndex = currentPhotoIndex - 1;
      const screenWidth = Dimensions.get('window').width;
      
      // Preload previous images before scrolling
      preloadAdjacentImages(slideshowPhotos, prevIndex);
      
      // Update index first
      setCurrentPhotoIndex(prevIndex);
      
      // Scroll to previous photo
      if (slideshowScrollRef.current) {
        slideshowScrollRef.current.scrollTo({
          x: prevIndex * screenWidth,
          animated: true,
        });
      }
    }
  };
  
  const handleSlideshowScroll = (event: any) => {
    const screenWidth = Dimensions.get('window').width;
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    
    // Only update if index is valid and different
    if (index !== currentPhotoIndex && index >= 0 && index < slideshowPhotos.length) {
      setCurrentPhotoIndex(index);
    }
  };
  
  const handleDownloadPDF = () => {
    if (pdfInfo?.publicUrl) {
      if (Platform.OS === 'web') {
        window.open(pdfInfo.publicUrl, '_blank');
      } else {
        Linking.openURL(pdfInfo.publicUrl);
      }
    }
  };
  
  const handleSharePDF = () => {
    if (pdfInfo?.publicUrl) {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          navigator.share({
            title: t('Portfolio PDF'),
            text: t('Check out this portfolio'),
            url: pdfInfo.publicUrl,
          });
        } else {
          navigator.clipboard.writeText(pdfInfo.publicUrl);
          Alert.alert(t('Success'), t('PDF link copied to clipboard'));
        }
      } else {
        Alert.alert(t('Info'), t('Share functionality coming soon'));
      }
    }
  };
  
  if (isLoadingProfile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('Technician Profile')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('Loading technician profile...')}
          </Text>
        </View>
      </View>
    );
  }
  
  if (error || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('Technician Profile')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#F44336" />
          <Text style={[styles.errorText, { color: colors.text }]}>{t('Error')}</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{error || t('Failed to load profile')}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]} 
            onPress={loadData}
          >
            <Text style={styles.retryButtonText}>{t('Retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  const getProjectPhotos = (project: PortfolioProject): string[] => {
    return project.files || project.photos || [];
  };
  
  // Render mobile layout
  if (!IS_LARGE_WEB) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[
          styles.header, 
          { 
            paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 20 : 50), 
            borderBottomColor: colors.border,
            paddingHorizontal: IS_SMALL_WEB ? 12 : 16,
            paddingBottom: IS_SMALL_WEB ? 12 : 14,
          }
        ]}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="arrow-back" size={IS_SMALL_WEB ? 22 : 24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[
            styles.headerTitle, 
            { 
              color: colors.text,
              fontSize: IS_SMALL_WEB ? 18 : 18,
            }
          ]}>
            {t('Technician Profile')}
          </Text>
          <View style={{ width: IS_SMALL_WEB ? 22 : 24 }} />
        </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal: IS_SMALL_WEB ? 12 : 16,
              }
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Header Section */}
            <View style={[
              styles.profileHeader, 
              { 
                backgroundColor: colors.cardBackground,
                paddingVertical: IS_SMALL_WEB ? 24 : 32,
                paddingHorizontal: IS_SMALL_WEB ? 16 : 20,
              }
            ]}>
              {profile.profileImage ? (
                <Image
                  source={{ uri: profile.profileImage }}
                  style={[
                    styles.profileImage,
                    {
                      width: IS_SMALL_WEB ? 100 : 100,
                      height: IS_SMALL_WEB ? 100 : 100,
                      borderRadius: IS_SMALL_WEB ? 50 : 50,
                      marginBottom: IS_SMALL_WEB ? 16 : 16,
                    }
                  ]}
                />
              ) : (
                <View style={[
                  styles.profileImagePlaceholder, 
                  { 
                    backgroundColor: colors.primary,
                    width: IS_SMALL_WEB ? 100 : 100,
                    height: IS_SMALL_WEB ? 100 : 100,
                    borderRadius: IS_SMALL_WEB ? 50 : 50,
                    marginBottom: IS_SMALL_WEB ? 16 : 16,
                  }
                ]}>
                  <Text style={[
                    styles.profileInitial,
                    { fontSize: IS_SMALL_WEB ? 40 : 40 }
                  ]}>
                    {profile.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              
              <Text style={[
                styles.name, 
                { 
                  color: colors.text,
                  fontSize: IS_SMALL_WEB ? 22 : 24,
                }
              ]}>
                {profile.name}
              </Text>
              
              {profile.description && (
                <Text style={[
                  styles.description, 
                  { 
                    color: colors.textSecondary,
                    fontSize: IS_SMALL_WEB ? 14 : 14,
                    lineHeight: IS_SMALL_WEB ? 20 : 22,
                    paddingHorizontal: IS_SMALL_WEB ? 12 : 12,
                  }
                ]}>
                  {profile.description}
                </Text>
              )}
              
              {/* Rating */}
              <View style={[
                styles.ratingContainer,
                {
                  gap: IS_SMALL_WEB ? 8 : 10,
                  marginBottom: IS_SMALL_WEB ? 20 : 24,
                  paddingHorizontal: IS_SMALL_WEB ? 12 : 16,
                }
              ]}>
                <Ionicons name="star" size={IS_SMALL_WEB ? 20 : 24} color="#FFC107" />
                <Text style={[
                  styles.ratingText, 
                  { 
                    color: colors.text,
                    fontSize: IS_SMALL_WEB ? 15 : 16,
                  }
                ]}>
                  {profile.averageRating?.toFixed(1) || '0.0'} ({profile.totalReviews || 0} {t('reviews')})
                </Text>
              </View>
              
              {/* Stats */}
              <View style={[
                styles.statsContainer,
                {
                  gap: IS_SMALL_WEB ? 24 : 28,
                }
              ]}>
                <View style={styles.statItem}>
                  <Ionicons name="checkmark-circle" size={IS_SMALL_WEB ? 20 : 24} color="#4CAF50" />
                  <Text style={[
                    styles.statValue, 
                    { 
                      color: colors.text,
                      fontSize: IS_SMALL_WEB ? 20 : 22,
                    }
                  ]}>
                    {profile.completedProjects || 0}
                  </Text>
                  <Text style={[
                    styles.statLabel, 
                    { 
                      color: colors.textSecondary,
                      fontSize: IS_SMALL_WEB ? 11 : 12,
                    }
                  ]}>
                    {t('Completed')}
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <Ionicons name="briefcase" size={IS_SMALL_WEB ? 20 : 24} color={colors.primary} />
                  <Text style={[
                    styles.statValue, 
                    { 
                      color: colors.text,
                      fontSize: IS_SMALL_WEB ? 20 : 22,
                    }
                  ]}>
                    {profile.activeBids || 0}
                  </Text>
                  <Text style={[
                    styles.statLabel, 
                    { 
                      color: colors.textSecondary,
                      fontSize: IS_SMALL_WEB ? 11 : 12,
                    }
                  ]}>
                    {t('Active Bids')}
                  </Text>
                </View>
                
                {profile.yearsOfExperience && (
                  <View style={styles.statItem}>
                    <Ionicons name="time-outline" size={IS_SMALL_WEB ? 20 : 24} color="#FF9800" />
                    <Text style={[
                      styles.statValue, 
                      { 
                        color: colors.text,
                        fontSize: IS_SMALL_WEB ? 20 : 22,
                      }
                    ]}>
                      {profile.yearsOfExperience}
                    </Text>
                    <Text style={[
                      styles.statLabel, 
                      { 
                        color: colors.textSecondary,
                        fontSize: IS_SMALL_WEB ? 11 : 12,
                      }
                    ]}>
                      {t('Years Exp.')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          
          {/* PDF and QR Code Section */}
          {pdfInfo && (
            <View style={[
              styles.section, 
              { 
                backgroundColor: colors.cardBackground,
                marginHorizontal: IS_SMALL_WEB ? 12 : 16,
                padding: IS_SMALL_WEB ? 16 : 20,
              }
            ]}>
              <Text style={[
                styles.sectionTitle, 
                { 
                  color: colors.text,
                  fontSize: IS_SMALL_WEB ? 18 : 20,
                  marginBottom: IS_SMALL_WEB ? 16 : 16,
                }
              ]}>
                {t('Portfolio PDF')}
              </Text>
              <View style={[
                styles.pdfActionsRow,
                { gap: IS_SMALL_WEB ? 8 : 10 }
              ]}>
                <TouchableOpacity
                  style={[
                    styles.pdfActionButton, 
                    { 
                      backgroundColor: colors.primary,
                      paddingHorizontal: IS_SMALL_WEB ? 16 : 18,
                      paddingVertical: IS_SMALL_WEB ? 10 : 12,
                      minWidth: IS_SMALL_WEB ? 120 : 130,
                    }
                  ]}
                  onPress={handleDownloadPDF}
                >
                  <Ionicons name="download-outline" size={IS_SMALL_WEB ? 18 : 20} color="#fff" />
                  <Text style={[
                    styles.pdfActionButtonText, 
                    { 
                      color: '#fff',
                      fontSize: IS_SMALL_WEB ? 14 : 15,
                    }
                  ]}>
                    {t('Download PDF')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pdfActionButton, 
                    { 
                      backgroundColor: colors.primary + '20', 
                      borderColor: colors.primary,
                      paddingHorizontal: IS_SMALL_WEB ? 16 : 18,
                      paddingVertical: IS_SMALL_WEB ? 10 : 12,
                      minWidth: IS_SMALL_WEB ? 120 : 130,
                    }
                  ]}
                  onPress={() => setShowQRModal(true)}
                >
                  <Ionicons name="qr-code-outline" size={IS_SMALL_WEB ? 18 : 20} color={colors.primary} />
                  <Text style={[
                    styles.pdfActionButtonText, 
                    { 
                      color: colors.primary,
                      fontSize: IS_SMALL_WEB ? 14 : 15,
                    }
                  ]}>
                    {t('View QR')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Portfolio Section */}
          {portfolio && portfolio.pastProjects && portfolio.pastProjects.length > 0 && (
            <View style={[
              styles.section, 
              { 
                backgroundColor: colors.cardBackground,
                marginHorizontal: IS_SMALL_WEB ? 12 : 16,
                padding: IS_SMALL_WEB ? 16 : 20,
              }
            ]}>
              <Text style={[
                styles.sectionTitle, 
                { 
                  color: colors.text,
                  fontSize: IS_SMALL_WEB ? 18 : 20,
                  marginBottom: IS_SMALL_WEB ? 16 : 16,
                }
              ]}>
                {t('Portfolio')} ({portfolio.pastProjects.length})
              </Text>
              
              {portfolio.pastProjects.map((project) => {
                const photos = getProjectPhotos(project);
                return (
                  <View key={project.id} style={[
                    styles.projectCard, 
                    { 
                      backgroundColor: colors.background,
                      padding: IS_SMALL_WEB ? 14 : 16,
                    }
                  ]}>
                    <Text style={[
                      styles.projectTitle, 
                      { 
                        color: colors.text,
                        fontSize: IS_SMALL_WEB ? 16 : 17,
                      }
                    ]}>
                      {project.title}
                    </Text>
                    {project.description && (
                      <Text style={[
                        styles.projectDescription, 
                        { 
                          color: colors.textSecondary,
                          fontSize: IS_SMALL_WEB ? 13 : 14,
                          lineHeight: IS_SMALL_WEB ? 20 : 21,
                        }
                      ]}>
                        {project.description}
                      </Text>
                    )}
                    {project.location && (
                      <View style={styles.projectInfoRow}>
                        <Ionicons name="location-outline" size={IS_SMALL_WEB ? 14 : 16} color={colors.textSecondary} />
                        <Text style={[
                          styles.projectInfo, 
                          { 
                            color: colors.textSecondary,
                            fontSize: IS_SMALL_WEB ? 13 : 14,
                          }
                        ]}>
                          {project.location}
                        </Text>
                      </View>
                    )}
                    {project.projectValue && (
                      <View style={styles.projectInfoRow}>
                        <Ionicons name="cash-outline" size={IS_SMALL_WEB ? 14 : 16} color={colors.textSecondary} />
                        <Text style={[
                          styles.projectInfo, 
                          { 
                            color: colors.textSecondary,
                            fontSize: IS_SMALL_WEB ? 13 : 14,
                          }
                        ]}>
                          {project.projectValue.toLocaleString()} {t('SAR')}
                        </Text>
                      </View>
                    )}
                    {photos.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.projectPhotosContainer}
                        contentContainerStyle={styles.projectPhotosContent}
                      >
                        {photos.map((photo, index) => (
                          <TouchableOpacity
                            key={index}
                            onPress={() => handleOpenSlideshowFromProject(photos, project.title, index)}
                            style={[
                              styles.projectPhotoWrapper,
                              {
                                width: IS_SMALL_WEB ? 100 : 110,
                                height: IS_SMALL_WEB ? 100 : 110,
                              }
                            ]}
                          >
                            <Image
                              source={{ uri: normalizeImageUrl(photo) }}
                              style={styles.projectPhoto}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                );
              })}
            </View>
          )}
            
            {/* Services Section */}
            {profile.services && profile.services.length > 0 && (
            <View style={[
              styles.section, 
              { 
                backgroundColor: colors.cardBackground,
                marginHorizontal: IS_SMALL_WEB ? 12 : 16,
                padding: IS_SMALL_WEB ? 16 : 20,
              }
            ]}>
              <Text style={[
                styles.sectionTitle, 
                { 
                  color: colors.text,
                  fontSize: IS_SMALL_WEB ? 18 : 20,
                  marginBottom: IS_SMALL_WEB ? 16 : 16,
                }
              ]}>
                {t('Services')}
              </Text>
                
                {profile.services.map((service) => (
                <View key={service.id} style={[
                  styles.serviceCard, 
                  { 
                    backgroundColor: colors.background,
                    padding: IS_SMALL_WEB ? 14 : 16,
                  }
                ]}>
                    {service.imageUrl && (
                      <Image
                        source={{ uri: service.imageUrl }}
                      style={[
                        styles.serviceImage,
                        {
                          width: IS_SMALL_WEB ? 60 : 65,
                          height: IS_SMALL_WEB ? 60 : 65,
                          marginRight: IS_SMALL_WEB ? 14 : 16,
                        }
                      ]}
                      />
                    )}
                    <View style={styles.serviceInfo}>
                    <Text style={[
                      styles.serviceName, 
                      { 
                        color: colors.text,
                        fontSize: IS_SMALL_WEB ? 15 : 16,
                      }
                    ]}>
                      {isRTL && service.nameAr ? service.nameAr : service.nameEn}
                      </Text>
                    <Text style={[
                      styles.serviceDescription, 
                      { 
                        color: colors.textSecondary,
                        fontSize: IS_SMALL_WEB ? 13 : 13,
                        lineHeight: IS_SMALL_WEB ? 20 : 20,
                      }
                    ]}>
                        {service.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {/* Reviews Section */}
            {profile.reviews && profile.reviews.length > 0 && (
            <View style={[
              styles.section, 
              { 
                backgroundColor: colors.cardBackground,
                marginHorizontal: IS_SMALL_WEB ? 12 : 16,
                padding: IS_SMALL_WEB ? 16 : 20,
              }
            ]}>
              <Text style={[
                styles.sectionTitle, 
                { 
                  color: colors.text,
                  fontSize: IS_SMALL_WEB ? 18 : 20,
                  marginBottom: IS_SMALL_WEB ? 16 : 16,
                }
              ]}>
                {t('Reviews')} ({profile.reviews.length})
                </Text>
                
              {profile.reviews.map((review) => (
                <View key={review.id} style={[
                  styles.reviewCard, 
                  { 
                    backgroundColor: colors.background,
                    padding: IS_SMALL_WEB ? 14 : 16,
                  }
                ]}>
                    <View style={styles.reviewHeader}>
                    <View style={[
                      styles.reviewerInfo,
                      { gap: IS_SMALL_WEB ? 12 : 12 }
                    ]}>
                      <View style={[
                        styles.reviewerAvatar, 
                        { 
                          backgroundColor: colors.primary,
                          width: IS_SMALL_WEB ? 40 : 44,
                          height: IS_SMALL_WEB ? 40 : 44,
                          borderRadius: IS_SMALL_WEB ? 20 : 22,
                        }
                      ]}>
                        <Text style={[
                          styles.reviewerInitial,
                          { fontSize: IS_SMALL_WEB ? 18 : 18 }
                        ]}>
                            {review.reviewerName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                        <Text style={[
                          styles.reviewerName, 
                          { 
                            color: colors.text,
                            fontSize: IS_SMALL_WEB ? 14 : 14,
                          }
                        ]}>
                            {review.reviewerName}
                          </Text>
                          <View style={styles.reviewRating}>
                            {[...Array(5)].map((_, i) => (
                              <Ionicons
                                key={i}
                                name={i < review.rating ? 'star' : 'star-outline'}
                              size={IS_SMALL_WEB ? 12 : 14}
                                color="#FFC107"
                              />
                            ))}
                          </View>
                        </View>
                      </View>
                    <Text style={[
                      styles.reviewDate, 
                      { 
                        color: colors.textSecondary,
                        fontSize: IS_SMALL_WEB ? 11 : 11,
                      }
                    ]}>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    
                    {review.comment && (
                    <Text style={[
                      styles.reviewComment, 
                      { 
                        color: colors.textSecondary,
                        fontSize: IS_SMALL_WEB ? 13 : 13,
                        lineHeight: IS_SMALL_WEB ? 20 : 20,
                      }
                    ]}>
                        {review.comment}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            
            {/* Contact Section */}
          <View style={[
            styles.section, 
            { 
              backgroundColor: colors.cardBackground,
              marginHorizontal: IS_SMALL_WEB ? 12 : 16,
              padding: IS_SMALL_WEB ? 16 : 20,
            }
          ]}>
            <Text style={[
              styles.sectionTitle, 
              { 
                color: colors.text,
                fontSize: IS_SMALL_WEB ? 18 : 20,
                marginBottom: IS_SMALL_WEB ? 16 : 16,
              }
            ]}>
              {t('Contact')}
            </Text>
              
              <TouchableOpacity
              style={[
                styles.contactButton, 
                { 
                  backgroundColor: colors.background,
                  padding: IS_SMALL_WEB ? 14 : 16,
                  gap: IS_SMALL_WEB ? 12 : 12,
                }
              ]}
                onPress={() => Linking.openURL(`tel:${profile.phoneNumber}`)}
              >
              <Ionicons name="call" size={IS_SMALL_WEB ? 18 : 20} color="#4CAF50" />
              <Text style={[
                styles.contactButtonText, 
                { 
                  color: colors.text,
                  fontSize: IS_SMALL_WEB ? 14 : 15,
                }
              ]}>
                  {profile.phoneNumber}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
              style={[
                styles.contactButton, 
                { 
                  backgroundColor: colors.background,
                  padding: IS_SMALL_WEB ? 14 : 16,
                  gap: IS_SMALL_WEB ? 12 : 12,
                }
              ]}
                onPress={() => Linking.openURL(`mailto:${profile.email}`)}
              >
              <Ionicons name="mail" size={IS_SMALL_WEB ? 18 : 20} color={colors.primary} />
              <Text style={[
                styles.contactButtonText, 
                { 
                  color: colors.text,
                  fontSize: IS_SMALL_WEB ? 14 : 15,
                }
              ]}>
                  {profile.email}
                </Text>
              </TouchableOpacity>
            </View>
          
          <View style={{ height: 40 }} />
          </ScrollView>
        
        {/* QR Code Modal */}
        <Modal
          visible={showQRModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowQRModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t('Portfolio QR Code')}
            </Text>
                <TouchableOpacity onPress={() => setShowQRModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
              </View>
              <View style={styles.qrCodeContainer}>
                <Image
                  source={{ uri: getQRCodeUrl(technicianId) }}
                  style={styles.qrCodeImage}
                  resizeMode="contain"
                />
              </View>
          <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowQRModal(false)}
              >
                <Text style={styles.modalButtonText}>{t('Close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
        </Modal>
        
        {/* Photo Slideshow Modal */}
        <Modal
          visible={showPhotoSlideshow}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowPhotoSlideshow(false)}
          statusBarTranslucent={true}
        >
          <View style={styles.slideshowContainer} onStartShouldSetResponder={() => true}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.slideshowCloseButton}
              onPress={() => setShowPhotoSlideshow(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            
            {/* Photo Counter */}
            {slideshowPhotos.length > 1 && (
              <View style={styles.slideshowCounter}>
                <Text style={styles.slideshowCounterText}>
                  {currentPhotoIndex + 1} / {slideshowPhotos.length}
            </Text>
          </View>
            )}
            
            {/* Main Image with Swipe Support */}
            <View style={styles.slideshowImageWrapper}>
              <ScrollView
                ref={slideshowScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={true}
                onMomentumScrollEnd={handleSlideshowScroll}
                scrollEventThrottle={200}
                style={styles.slideshowScrollView}
                contentContainerStyle={styles.slideshowScrollContent}
                removeClippedSubviews={false}
                decelerationRate="fast"
                bounces={false}
              >
                {slideshowPhotos.map((photo, index) => {
                  const normalizedUrl = normalizeImageUrl(photo);
                  const screenWidth = Dimensions.get('window').width;
                  const screenHeight = Dimensions.get('window').height;
                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.slideshowImageContainer, 
                        { 
                          width: screenWidth,
                          height: screenHeight,
                        }
                      ]}
                    >
                      <Image
                        source={{ uri: normalizedUrl }}
                        style={styles.slideshowImage}
                        resizeMode="contain"
                      />
                    </View>
                  );
                })}
              </ScrollView>
            </View>
            
            {/* Navigation Arrows */}
            {slideshowPhotos.length > 1 && (
              <>
                {/* Previous Button */}
            <TouchableOpacity 
                  style={[
                    styles.slideshowNavButton,
                    styles.slideshowNavButtonLeft,
                    currentPhotoIndex === 0 && styles.slideshowNavButtonDisabled,
                  ]}
                  onPress={handlePreviousPhoto}
                  disabled={currentPhotoIndex === 0}
            >
              <Ionicons 
                    name="chevron-back"
                    size={32}
                    color={currentPhotoIndex === 0 ? 'rgba(255, 255, 255, 0.3)' : '#fff'}
                  />
            </TouchableOpacity>

                {/* Next Button */}
            <TouchableOpacity 
                  style={[
                    styles.slideshowNavButton,
                    styles.slideshowNavButtonRight,
                    currentPhotoIndex === slideshowPhotos.length - 1 && styles.slideshowNavButtonDisabled,
                  ]}
                  onPress={handleNextPhoto}
                  disabled={currentPhotoIndex === slideshowPhotos.length - 1}
            >
              <Ionicons 
                    name="chevron-forward"
                    size={32}
                    color={currentPhotoIndex === slideshowPhotos.length - 1 ? 'rgba(255, 255, 255, 0.3)' : '#fff'}
                  />
            </TouchableOpacity>
              </>
            )}
            
            {/* Dots Indicator */}
            {slideshowPhotos.length > 1 && (
              <View style={styles.slideshowDots}>
                {slideshowPhotos.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      const screenWidth = Dimensions.get('window').width;
                      setIsNavigatingViaDots(true);
                      setCurrentPhotoIndex(index);
                      if (slideshowScrollRef.current) {
                        slideshowScrollRef.current.scrollTo({
                          x: index * screenWidth,
                          animated: true,
                        });
                      }
                    }}
                    style={[
                      styles.slideshowDot,
                      index === currentPhotoIndex && styles.slideshowDotActive,
                    ]}
                  />
                ))}
          </View>
            )}
            
            {/* Project Title */}
            {slideshowProjectTitle && (
              <View style={styles.slideshowProjectInfo}>
                <Text style={styles.slideshowProjectTitle}>{slideshowProjectTitle}</Text>
        </View>
            )}
          </View>
        </Modal>
      </View>
    );
  }
  
  // Render desktop/large web layout
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
        <View style={[
        styles.desktopHeader, 
        { 
          paddingTop: Math.max(insets.top, 20), 
          borderBottomColor: colors.border, 
          backgroundColor: colors.cardBackground,
          paddingHorizontal: IS_MEDIUM_WEB ? 24 : 40,
        }
      ]}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[
          styles.desktopHeaderTitle, 
          { 
            color: colors.text,
            fontSize: IS_MEDIUM_WEB ? 20 : 24,
          }
        ]}>
          {t('Technician Profile')}
            </Text>
        <View style={{ width: 24 }} />
          </View>

            <ScrollView 
        style={styles.desktopScrollView}
        contentContainerStyle={styles.desktopScrollContent}
              showsVerticalScrollIndicator={true}
            >
        <View style={styles.desktopContent}>
              {/* Profile Header Section */}
          <View style={[
            styles.desktopProfileHeader, 
            { 
              backgroundColor: colors.cardBackground,
              padding: IS_MEDIUM_WEB ? 24 : 40,
            }
          ]}>
            <View style={styles.desktopProfileTop}>
                {profile.profileImage ? (
                  <Image
                    source={{ uri: profile.profileImage }}
                  style={[
                    styles.desktopProfileImage,
                    {
                      width: IS_MEDIUM_WEB ? 140 : 160,
                      height: IS_MEDIUM_WEB ? 140 : 160,
                      borderRadius: IS_MEDIUM_WEB ? 70 : 80,
                    }
                  ]}
                  />
                ) : (
                <View style={[
                  styles.desktopProfileImagePlaceholder, 
                  { 
                    backgroundColor: colors.primary,
                    width: IS_MEDIUM_WEB ? 140 : 160,
                    height: IS_MEDIUM_WEB ? 140 : 160,
                    borderRadius: IS_MEDIUM_WEB ? 70 : 80,
                  }
                ]}>
                  <Text style={[
                    styles.desktopProfileInitial,
                    { fontSize: IS_MEDIUM_WEB ? 56 : 64 }
                  ]}>
                      {profile.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                
              <View style={styles.desktopProfileInfo}>
                <Text style={[
                  styles.desktopName, 
                  { 
                    color: colors.text,
                    fontSize: IS_MEDIUM_WEB ? 26 : 32,
                  }
                ]}>
                  {profile.name}
                </Text>
                
                {profile.description && (
                  <Text style={[
                    styles.desktopDescription, 
                    { 
                      color: colors.textSecondary,
                      fontSize: IS_MEDIUM_WEB ? 15 : 16,
                    }
                  ]}>
                    {profile.description}
                  </Text>
                )}
                
                {/* Rating */}
                <View style={styles.desktopRatingContainer}>
                  <Ionicons name="star" size={IS_MEDIUM_WEB ? 22 : 24} color="#FFC107" />
                  <Text style={[
                    styles.desktopRatingText, 
                    { 
                      color: colors.text,
                      fontSize: IS_MEDIUM_WEB ? 16 : 18,
                    }
                  ]}>
                    {profile.averageRating?.toFixed(1) || '0.0'} ({profile.totalReviews || 0} {t('reviews')})
                  </Text>
                </View>
                
                {/* Stats */}
                <View style={[
                  styles.desktopStatsContainer,
                  { gap: IS_MEDIUM_WEB ? 24 : 32 }
                ]}>
                  <View style={styles.desktopStatItem}>
                    <Ionicons name="checkmark-circle" size={IS_MEDIUM_WEB ? 22 : 24} color="#4CAF50" />
                    <View style={styles.desktopStatContent}>
                      <Text style={[
                        styles.desktopStatValue, 
                        { 
                          color: colors.text,
                          fontSize: IS_MEDIUM_WEB ? 22 : 24,
                        }
                      ]}>
                      {profile.completedProjects || 0}
                    </Text>
                      <Text style={[
                        styles.desktopStatLabel, 
                        { 
                          color: colors.textSecondary,
                          fontSize: IS_MEDIUM_WEB ? 13 : 14,
                        }
                      ]}>
                      {t('Completed')}
                    </Text>
                    </View>
                  </View>
                  
                  <View style={styles.desktopStatItem}>
                    <Ionicons name="briefcase" size={IS_MEDIUM_WEB ? 22 : 24} color={colors.primary} />
                    <View style={styles.desktopStatContent}>
                      <Text style={[
                        styles.desktopStatValue, 
                        { 
                          color: colors.text,
                          fontSize: IS_MEDIUM_WEB ? 22 : 24,
                        }
                      ]}>
                      {profile.activeBids || 0}
                    </Text>
                      <Text style={[
                        styles.desktopStatLabel, 
                        { 
                          color: colors.textSecondary,
                          fontSize: IS_MEDIUM_WEB ? 13 : 14,
                        }
                      ]}>
                      {t('Active Bids')}
                    </Text>
                    </View>
                  </View>
                  
                  {profile.yearsOfExperience && (
                    <View style={styles.desktopStatItem}>
                      <Ionicons name="time-outline" size={IS_MEDIUM_WEB ? 22 : 24} color="#FF9800" />
                      <View style={styles.desktopStatContent}>
                        <Text style={[
                          styles.desktopStatValue, 
                          { 
                            color: colors.text,
                            fontSize: IS_MEDIUM_WEB ? 22 : 24,
                          }
                        ]}>
                        {profile.yearsOfExperience}
                      </Text>
                        <Text style={[
                          styles.desktopStatLabel, 
                          { 
                            color: colors.textSecondary,
                            fontSize: IS_MEDIUM_WEB ? 13 : 14,
                          }
                        ]}>
                        {t('Years Exp.')}
                      </Text>
                      </View>
                    </View>
                  )}
                </View>
                </View>
              </View>
            
            {/* PDF and QR Code Section */}
            {pdfInfo && (
              <View style={styles.desktopPdfSection}>
                <Text style={[
                  styles.desktopSectionTitle, 
                  { 
                    color: colors.text,
                    fontSize: IS_MEDIUM_WEB ? 22 : 28,
                  }
                ]}>
                  {t('Portfolio PDF')}
                </Text>
                <View style={styles.desktopPdfActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.desktopPdfActionButton, 
                      { 
                        backgroundColor: colors.primary,
                        paddingHorizontal: IS_MEDIUM_WEB ? 20 : 24,
                        paddingVertical: IS_MEDIUM_WEB ? 12 : 14,
                      }
                    ]}
                    onPress={handleDownloadPDF}
                  >
                    <Ionicons name="download-outline" size={IS_MEDIUM_WEB ? 18 : 20} color="#fff" />
                    <Text style={[
                      styles.desktopPdfActionButtonText, 
                      { 
                        color: '#fff',
                        fontSize: IS_MEDIUM_WEB ? 15 : 16,
                      }
                    ]}>
                      {t('Download PDF')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.desktopPdfActionButton, 
                      { 
                        backgroundColor: colors.primary + '20', 
                        borderColor: colors.primary,
                        paddingHorizontal: IS_MEDIUM_WEB ? 20 : 24,
                        paddingVertical: IS_MEDIUM_WEB ? 12 : 14,
                      }
                    ]}
                    onPress={() => setShowQRModal(true)}
                  >
                    <Ionicons name="qr-code-outline" size={IS_MEDIUM_WEB ? 18 : 20} color={colors.primary} />
                    <Text style={[
                      styles.desktopPdfActionButtonText, 
                      { 
                        color: colors.primary,
                        fontSize: IS_MEDIUM_WEB ? 15 : 16,
                      }
                    ]}>
                      {t('View QR')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          
          {/* Portfolio Section */}
          {portfolio && portfolio.pastProjects && portfolio.pastProjects.length > 0 && (
            <View style={[
              styles.desktopSection, 
              { 
                backgroundColor: colors.cardBackground,
                padding: IS_MEDIUM_WEB ? 24 : 40,
              }
            ]}>
              <Text style={[
                styles.desktopSectionTitle, 
                { 
                  color: colors.text,
                  fontSize: IS_MEDIUM_WEB ? 22 : 28,
                }
              ]}>
                {t('Portfolio')} ({portfolio.pastProjects.length})
              </Text>
              
              <View style={[
                styles.desktopProjectsGrid,
                { gap: IS_MEDIUM_WEB ? 16 : 24 }
              ]}>
                {portfolio.pastProjects.map((project) => {
                  const photos = getProjectPhotos(project);
                  return (
                    <View key={project.id} style={[
                      styles.desktopProjectCard, 
                      { 
                        backgroundColor: colors.background,
                        width: IS_MEDIUM_WEB ? '100%' : 'calc(50% - 12px)',
                      }
                    ]}>
                      {photos.length > 0 && (
                        <TouchableOpacity
                          onPress={() => handleOpenSlideshowFromProject(photos, project.title, 0)}
                          style={[
                            styles.desktopProjectImageWrapper,
                            { height: IS_MEDIUM_WEB ? 180 : 200 }
                          ]}
                        >
                          <Image
                            source={{ uri: normalizeImageUrl(photos[0]) }}
                            style={styles.desktopProjectImage}
                            resizeMode="cover"
                          />
                          {photos.length > 1 && (
                            <View style={styles.desktopProjectPhotoCount}>
                              <Ionicons name="images" size={16} color="#fff" />
                              <Text style={styles.desktopProjectPhotoCountText}>
                                {photos.length}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )}
                      <View style={[
                        styles.desktopProjectContent,
                        { padding: IS_MEDIUM_WEB ? 16 : 20 }
                      ]}>
                        <Text style={[
                          styles.desktopProjectTitle, 
                          { 
                            color: colors.text,
                            fontSize: IS_MEDIUM_WEB ? 18 : 20,
                          }
                        ]}>
                          {project.title}
                        </Text>
                        {project.description && (
                          <Text style={[
                            styles.desktopProjectDescription, 
                            { 
                              color: colors.textSecondary,
                              fontSize: IS_MEDIUM_WEB ? 13 : 14,
                            }
                          ]} numberOfLines={3}>
                            {project.description}
                          </Text>
                        )}
                        {project.location && (
                          <View style={styles.desktopProjectInfoRow}>
                            <Ionicons name="location-outline" size={IS_MEDIUM_WEB ? 12 : 14} color={colors.textSecondary} />
                            <Text style={[
                              styles.desktopProjectInfo, 
                              { 
                                color: colors.textSecondary,
                                fontSize: IS_MEDIUM_WEB ? 12 : 14,
                              }
                            ]}>
                              {project.location}
                            </Text>
                          </View>
                        )}
                        {project.projectValue && (
                          <View style={styles.desktopProjectInfoRow}>
                            <Ionicons name="cash-outline" size={IS_MEDIUM_WEB ? 12 : 14} color={colors.textSecondary} />
                            <Text style={[
                              styles.desktopProjectInfo, 
                              { 
                                color: colors.textSecondary,
                                fontSize: IS_MEDIUM_WEB ? 12 : 14,
                              }
                            ]}>
                              {project.projectValue.toLocaleString()} {t('SAR')}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
              
              {/* Services Section */}
              {profile.services && profile.services.length > 0 && (
            <View style={[
              styles.desktopSection, 
              { 
                backgroundColor: colors.cardBackground,
                padding: IS_MEDIUM_WEB ? 24 : 40,
              }
            ]}>
              <Text style={[
                styles.desktopSectionTitle, 
                { 
                  color: colors.text,
                  fontSize: IS_MEDIUM_WEB ? 22 : 28,
                }
              ]}>
                {t('Services')}
              </Text>
              
              <View style={[
                styles.desktopServicesGrid,
                { gap: IS_MEDIUM_WEB ? 16 : 20 }
              ]}>
                  {profile.services.map((service) => (
                  <View key={service.id} style={[
                    styles.desktopServiceCard, 
                    { 
                      backgroundColor: colors.background,
                      width: IS_MEDIUM_WEB ? 'calc(50% - 8px)' : 'calc(33.333% - 14px)',
                      padding: IS_MEDIUM_WEB ? 16 : 20,
                    }
                  ]}>
                      {service.imageUrl && (
                        <Image
                          source={{ uri: service.imageUrl }}
                        style={[
                          styles.desktopServiceImage,
                          {
                            width: IS_MEDIUM_WEB ? 70 : 80,
                            height: IS_MEDIUM_WEB ? 70 : 80,
                            borderRadius: IS_MEDIUM_WEB ? 35 : 40,
                          }
                        ]}
                      />
                    )}
                    <Text style={[
                      styles.desktopServiceName, 
                      { 
                        color: colors.text,
                        fontSize: IS_MEDIUM_WEB ? 15 : 16,
                      }
                    ]}>
                      {isRTL && service.nameAr ? service.nameAr : service.nameEn}
                        </Text>
                    <Text style={[
                      styles.desktopServiceDescription, 
                      { 
                        color: colors.textSecondary,
                        fontSize: IS_MEDIUM_WEB ? 12 : 14,
                      }
                    ]} numberOfLines={2}>
                          {service.description}
                        </Text>
                    </View>
                  ))}
              </View>
                </View>
              )}
              
              {/* Reviews Section */}
              {profile.reviews && profile.reviews.length > 0 && (
            <View style={[
              styles.desktopSection, 
              { 
                backgroundColor: colors.cardBackground,
                padding: IS_MEDIUM_WEB ? 24 : 40,
              }
            ]}>
              <Text style={[
                styles.desktopSectionTitle, 
                { 
                  color: colors.text,
                  fontSize: IS_MEDIUM_WEB ? 22 : 28,
                }
              ]}>
                {t('Reviews')} ({profile.reviews.length})
                  </Text>
                  
              <View style={[
                styles.desktopReviewsGrid,
                { gap: IS_MEDIUM_WEB ? 16 : 20 }
              ]}>
                {profile.reviews.map((review) => (
                  <View key={review.id} style={[
                    styles.desktopReviewCard, 
                    { 
                      backgroundColor: colors.background,
                      width: IS_MEDIUM_WEB ? '100%' : 'calc(50% - 10px)',
                      padding: IS_MEDIUM_WEB ? 20 : 24,
                    }
                  ]}>
                    <View style={styles.desktopReviewHeader}>
                      <View style={[
                        styles.desktopReviewerAvatar, 
                        { 
                          backgroundColor: colors.primary,
                          width: IS_MEDIUM_WEB ? 44 : 48,
                          height: IS_MEDIUM_WEB ? 44 : 48,
                          borderRadius: IS_MEDIUM_WEB ? 22 : 24,
                        }
                      ]}>
                        <Text style={[
                          styles.desktopReviewerInitial,
                          { fontSize: IS_MEDIUM_WEB ? 18 : 20 }
                        ]}>
                              {review.reviewerName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                      <View style={styles.desktopReviewInfo}>
                        <Text style={[
                          styles.desktopReviewerName, 
                          { 
                            color: colors.text,
                            fontSize: IS_MEDIUM_WEB ? 15 : 16,
                          }
                        ]}>
                              {review.reviewerName}
                            </Text>
                        <View style={styles.desktopReviewRating}>
                              {[...Array(5)].map((_, i) => (
                                <Ionicons
                                  key={i}
                                  name={i < review.rating ? 'star' : 'star-outline'}
                              size={IS_MEDIUM_WEB ? 12 : 14}
                                  color="#FFC107"
                                />
                              ))}
                            </View>
                          </View>
                      <Text style={[
                        styles.desktopReviewDate, 
                        { 
                          color: colors.textSecondary,
                          fontSize: IS_MEDIUM_WEB ? 11 : 12,
                        }
                      ]}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      {review.comment && (
                      <Text style={[
                        styles.desktopReviewComment, 
                        { 
                          color: colors.textSecondary,
                          fontSize: IS_MEDIUM_WEB ? 13 : 14,
                        }
                      ]}>
                          {review.comment}
                        </Text>
                      )}
                    </View>
                  ))}
              </View>
                </View>
              )}
              
              {/* Contact Section */}
          <View style={[
            styles.desktopSection, 
            { 
              backgroundColor: colors.cardBackground,
              padding: IS_MEDIUM_WEB ? 24 : 40,
            }
          ]}>
            <Text style={[
              styles.desktopSectionTitle, 
              { 
                color: colors.text,
                fontSize: IS_MEDIUM_WEB ? 22 : 28,
              }
            ]}>
              {t('Contact')}
            </Text>
            
            <View style={[
              styles.desktopContactRow,
              { gap: IS_MEDIUM_WEB ? 12 : 16 }
            ]}>
                <TouchableOpacity
                style={[
                  styles.desktopContactButton, 
                  { 
                    backgroundColor: colors.background,
                    padding: IS_MEDIUM_WEB ? 18 : 20,
                  }
                ]}
                  onPress={() => Linking.openURL(`tel:${profile.phoneNumber}`)}
                >
                <Ionicons name="call" size={IS_MEDIUM_WEB ? 18 : 20} color="#4CAF50" />
                <Text style={[
                  styles.desktopContactButtonText, 
                  { 
                    color: colors.text,
                    fontSize: IS_MEDIUM_WEB ? 15 : 16,
                  }
                ]}>
                    {profile.phoneNumber}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                style={[
                  styles.desktopContactButton, 
                  { 
                    backgroundColor: colors.background,
                    padding: IS_MEDIUM_WEB ? 18 : 20,
                  }
                ]}
                  onPress={() => Linking.openURL(`mailto:${profile.email}`)}
                >
                <Ionicons name="mail" size={IS_MEDIUM_WEB ? 18 : 20} color={colors.primary} />
                <Text style={[
                  styles.desktopContactButtonText, 
                  { 
                    color: colors.text,
                    fontSize: IS_MEDIUM_WEB ? 15 : 16,
                  }
                ]}>
                    {profile.email}
                  </Text>
                </TouchableOpacity>
            </View>
          </View>
          
          <View style={{ height: 40 }} />
              </View>
            </ScrollView>
      
      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('Portfolio QR Code')}
              </Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.qrCodeContainer}>
              <Image
                source={{ uri: getQRCodeUrl(technicianId) }}
                style={styles.qrCodeImage}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowQRModal(false)}
            >
              <Text style={styles.modalButtonText}>{t('Close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Photo Slideshow Modal */}
      <Modal
        visible={showPhotoSlideshow}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPhotoSlideshow(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.slideshowContainer} onStartShouldSetResponder={() => true}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.slideshowCloseButton}
            onPress={() => setShowPhotoSlideshow(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          {/* Photo Counter */}
          {slideshowPhotos.length > 1 && (
            <View style={styles.slideshowCounter}>
              <Text style={styles.slideshowCounterText}>
                {currentPhotoIndex + 1} / {slideshowPhotos.length}
              </Text>
            </View>
          )}
          
          {/* Main Image with Swipe Support */}
          <View style={styles.slideshowImageWrapper}>
              <ScrollView
                ref={slideshowScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={true}
                onMomentumScrollEnd={handleSlideshowScroll}
                scrollEventThrottle={200}
                style={styles.slideshowScrollView}
                contentContainerStyle={styles.slideshowScrollContent}
                removeClippedSubviews={false}
                decelerationRate="fast"
                bounces={false}
              >
                {slideshowPhotos.map((photo, index) => {
                  const normalizedUrl = normalizeImageUrl(photo);
                  const screenWidth = Dimensions.get('window').width;
                  const screenHeight = Dimensions.get('window').height;
                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.slideshowImageContainer, 
                        { 
                          width: screenWidth,
                          height: screenHeight,
                        }
                      ]}
                    >
                      <Image
                        source={{ uri: normalizedUrl }}
                        style={styles.slideshowImage}
                        resizeMode="contain"
                      />
                    </View>
                  );
                })}
              </ScrollView>
          </View>
          
          {/* Navigation Arrows */}
          {slideshowPhotos.length > 1 && (
            <>
              {/* Previous Button */}
              <TouchableOpacity
                style={[
                  styles.slideshowNavButton,
                  styles.slideshowNavButtonLeft,
                  currentPhotoIndex === 0 && styles.slideshowNavButtonDisabled,
                ]}
                onPress={handlePreviousPhoto}
                disabled={currentPhotoIndex === 0}
              >
                <Ionicons
                  name="chevron-back"
                  size={32}
                  color={currentPhotoIndex === 0 ? 'rgba(255, 255, 255, 0.3)' : '#fff'}
                />
              </TouchableOpacity>
              
              {/* Next Button */}
              <TouchableOpacity
                style={[
                  styles.slideshowNavButton,
                  styles.slideshowNavButtonRight,
                  currentPhotoIndex === slideshowPhotos.length - 1 && styles.slideshowNavButtonDisabled,
                ]}
                onPress={handleNextPhoto}
                disabled={currentPhotoIndex === slideshowPhotos.length - 1}
              >
                <Ionicons
                  name="chevron-forward"
                  size={32}
                  color={currentPhotoIndex === slideshowPhotos.length - 1 ? 'rgba(255, 255, 255, 0.3)' : '#fff'}
                />
              </TouchableOpacity>
            </>
          )}
          
          {/* Dots Indicator */}
          {slideshowPhotos.length > 1 && (
            <View style={styles.slideshowDots}>
              {slideshowPhotos.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    const screenWidth = Dimensions.get('window').width;
                    setCurrentPhotoIndex(index);
                    if (slideshowScrollRef.current) {
                      slideshowScrollRef.current.scrollTo({
                        x: index * screenWidth,
                        animated: true,
                      });
                    }
                  }}
                  style={[
                    styles.slideshowDot,
                    index === currentPhotoIndex && styles.slideshowDotActive,
                  ]}
                />
              ))}
        </View>
          )}
          
          {/* Project Title */}
          {slideshowProjectTitle && (
            <View style={styles.slideshowProjectInfo}>
              <Text style={styles.slideshowProjectTitle}>{slideshowProjectTitle}</Text>
      </View>
          )}
        </View>
      </Modal>
    </View>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  profileHeader: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      } as any,
      default: {
        elevation: 3,
      },
    }),
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileInitial: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    paddingTop: 8,
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      } as any,
      default: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  pdfActionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  pdfActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    flex: 1,
    minWidth: 130,
    minHeight: 44, // Touch target size
  },
  pdfActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  projectCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  projectTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  projectDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 10,
  },
  projectInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  projectInfo: {
    fontSize: 14,
  },
  projectPhotosContainer: {
    marginTop: 12,
  },
  projectPhotosContent: {
    gap: 12,
  },
  projectPhotoWrapper: {
    width: 110,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
  },
  projectPhoto: {
    width: '100%',
    height: '100%',
  },
  serviceCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  serviceImage: {
    width: 65,
    height: 65,
    borderRadius: 10,
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  reviewerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 20,
    paddingTop: 4,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    gap: 12,
    minHeight: 44, // Touch target size
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
      } as any,
      default: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrCodeImage: {
    width: 250,
    height: 250,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Slideshow styles
  slideshowContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideshowCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer' as any,
      } as any,
    }),
  },
  slideshowCounter: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 40,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  slideshowCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  slideshowImageWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideshowScrollView: {
    flex: 1,
    width: '100%',
  },
  slideshowScrollContent: {
    alignItems: 'center',
  },
  slideshowImageContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  slideshowImage: {
    width: '100%',
    height: '100%',
    maxWidth: '95%',
    maxHeight: '90%',
  },
  slideshowNavButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
    padding: 12,
    zIndex: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer' as any,
        transition: 'background-color 0.2s ease' as any,
      } as any,
    }),
  },
  slideshowNavButtonLeft: {
    left: 20,
  },
  slideshowNavButtonRight: {
    right: 20,
  },
  slideshowNavButtonDisabled: {
    opacity: 0.3,
  },
  slideshowDots: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 30 : 50,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  slideshowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  slideshowDotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  slideshowProjectInfo: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 80 : 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  slideshowProjectTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  // Desktop styles
  desktopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  desktopHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  desktopScrollView: {
    flex: 1,
  },
  desktopScrollContent: {
    padding: 40,
    paddingBottom: 150,
  },
  desktopContent: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  desktopProfileHeader: {
    padding: 40,
    borderRadius: 20,
    marginBottom: 32,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      } as any,
      default: {
        elevation: 3,
      },
    }),
  },
  desktopProfileTop: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 32,
  },
  desktopProfileImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: '#fff',
  },
  desktopProfileImagePlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  desktopProfileInitial: {
    fontSize: 64,
    fontWeight: '700',
    color: '#fff',
  },
  desktopProfileInfo: {
    flex: 1,
  },
  desktopName: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  desktopDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  desktopRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  desktopRatingText: {
    fontSize: 18,
    fontWeight: '700',
  },
  desktopStatsContainer: {
    flexDirection: 'row',
    gap: 32,
    flexWrap: 'wrap',
  },
  desktopStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desktopStatContent: {
    gap: 4,
  },
  desktopStatValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  desktopStatLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  desktopPdfSection: {
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  desktopPdfActionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  desktopPdfActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  desktopPdfActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  desktopSection: {
    padding: 40,
    borderRadius: 20,
    marginBottom: 32,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      } as any,
      default: {
        elevation: 3,
      },
    }),
  },
  desktopSectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  desktopProjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  desktopProjectCard: {
    width: 'calc(50% - 12px)',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  desktopProjectImageWrapper: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  desktopProjectImage: {
    width: '100%',
    height: '100%',
  },
  desktopProjectPhotoCount: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  desktopProjectPhotoCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  desktopProjectContent: {
    padding: 20,
  },
  desktopProjectTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  desktopProjectDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  desktopProjectInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  desktopProjectInfo: {
    fontSize: 14,
  },
  desktopServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  desktopServiceCard: {
    width: 'calc(33.333% - 14px)',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  desktopServiceImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  desktopServiceName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  desktopServiceDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  desktopReviewsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  desktopReviewCard: {
    width: 'calc(50% - 10px)',
    padding: 24,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  desktopReviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  desktopReviewerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopReviewerInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  desktopReviewInfo: {
    flex: 1,
  },
  desktopReviewerName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  desktopReviewRating: {
    flexDirection: 'row',
    gap: 3,
  },
  desktopReviewDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  desktopReviewComment: {
    fontSize: 14,
    lineHeight: 22,
  },
  desktopContactRow: {
    flexDirection: 'row',
    gap: 16,
  },
  desktopContactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  desktopContactButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

