import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { buildApiUrl, buildApiUrlWithParams, API_ENDPOINTS } from '../config/api';
import { storage } from '../utils/storage';

interface TechnicianProfileViewScreenProps {
  technicianId: number;
  onBack: () => void;
  onBooking?: (technicianId: number, technicianName: string) => void;
}

interface TechnicianProfile {
  id: number;
  userId: string;
  name: string;
  phoneNumber: string;
  email: string;
  profileImage?: string;
  certificates: string[];
  yearsOfExperience?: number;
  description?: string;
  services: Service[];
  regionId?: number;
  regionNameEn?: string;
  regionNameAr?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  completedProjects: number;
  activeBids: number;
}

interface Service {
  id: number;
  nameAr: string;
  nameEn: string;
  description: string;
  imageUrl: string;
}

interface Review {
  id: number;
  reviewerId: number;
  reviewerName: string;
  reviewedUserId: number;
  reviewedUserName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export default function TechnicianProfileViewScreen({
  technicianId,
  onBack,
  onBooking,
}: TechnicianProfileViewScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [technicianId]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const token = await storage.getAuthToken();

      const response = await fetch(
        buildApiUrlWithParams(API_ENDPOINTS.USER.PROFILE_BY_ID, { id: technicianId }),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data: TechnicianProfile = await response.json();
        setProfile(data);
        console.log('✅ Loaded technician profile:', data.name);
      } else {
        throw new Error('Failed to load profile');
      }
    } catch (error: any) {
      console.error('❌ Error loading profile:', error);
      Alert.alert(t('Error'), error.message || t('Failed to load profile'));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={16} color="#FFD700" />);
    }

    if (hasHalfStar && fullStars < 5) {
      stars.push(<Ionicons key="half" name="star-half" size={16} color="#FFD700" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#FFD700" />);
    }

    return stars;
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('Loading profile')}...
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t('Failed to load profile')}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={loadProfile}
        >
          <Text style={styles.retryButtonText}>{t('Retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isRTL = i18n.language === 'ar';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('Technician Profile')}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.avatarContainer}>
            {profile.profileImage ? (
              <Image source={{ uri: profile.profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {profile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{profile.name}</Text>
          
          {/* Rating */}
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderStars(profile.averageRating)}
            </View>
            <Text style={[styles.ratingText, { color: colors.text }]}>
              {profile.averageRating.toFixed(1)}
            </Text>
            <Text style={[styles.reviewsCount, { color: colors.textSecondary }]}>
              ({profile.totalReviews} {t('reviews')})
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {profile.completedProjects}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('Completed')}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="briefcase" size={24} color={colors.primary} />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {profile.activeBids}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('Active Bids')}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {profile.description && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('About')}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {profile.description}
            </Text>
          </View>
        )}

        {/* Experience */}
        {profile.yearsOfExperience && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {profile.yearsOfExperience} {t('Years of Experience')}
              </Text>
            </View>
          </View>
        )}

        {/* Location */}
        {profile.regionNameEn && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {isRTL ? profile.regionNameAr : profile.regionNameEn}
              </Text>
            </View>
          </View>
        )}

        {/* Subscription */}
        {profile.subscriptionPlan && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.infoRow}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {profile.subscriptionPlan}
              </Text>
              {profile.subscriptionStatus === 'ACTIVE' && (
                <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
                  <Text style={[styles.badgeText, { color: '#10B981' }]}>
                    {t('Active')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Services */}
        {profile.services && profile.services.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Services')}</Text>
            <View style={styles.servicesContainer}>
              {profile.services.map((service) => (
                <View
                  key={service.id}
                  style={[styles.serviceCard, { backgroundColor: colors.background }]}
                >
                  {service.imageUrl ? (
                    <Image source={{ uri: service.imageUrl }} style={styles.serviceImage} />
                  ) : (
                    <View style={[styles.serviceImagePlaceholder, { backgroundColor: colors.border }]}>
                      <Ionicons name="construct" size={32} color={colors.primary} />
                    </View>
                  )}
                  <Text style={[styles.serviceName, { color: colors.text }]}>
                    {isRTL ? service.nameAr : service.nameEn}
                  </Text>
                  {service.description && (
                    <Text
                      style={[styles.serviceDescription, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {service.description}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews */}
        {profile.reviews && profile.reviews.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('Reviews')} ({profile.reviews.length})
            </Text>
            {profile.reviews.map((review) => (
              <View
                key={review.id}
                style={[styles.reviewCard, { backgroundColor: colors.background }]}
              >
                <View style={styles.reviewHeader}>
                  <View style={[styles.reviewAvatar, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.reviewAvatarText, { color: colors.primary }]}>
                      {review.reviewerName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.reviewInfo}>
                    <Text style={[styles.reviewerName, { color: colors.text }]}>
                      {review.reviewerName}
                    </Text>
                    <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                      {formatDate(review.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.reviewRating}>
                    {renderStars(review.rating)}
                  </View>
                </View>
                {review.comment && (
                  <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>
                    {review.comment}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Booking Button */}
        {onBooking && (
          <View style={styles.bookingButtonContainer}>
            <TouchableOpacity
              style={[styles.bookingButton, { backgroundColor: colors.primary }]}
              onPress={() => onBooking(profile.id, profile.name)}
            >
              <Ionicons name="calendar" size={20} color="#FFFFFF" />
              <Text style={styles.bookingButtonText}>{t('Book Appointment')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 4,
  },
  reviewsCount: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  serviceImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  serviceDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 12,
    marginTop: 2,
  },
  reviewRating: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
  },
  bookingButtonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  bookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  bookingButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

