import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Linking,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTechniciansByService } from '../services/TechnicianService';
import TechnicianProfileView from './TechnicianProfileView';
import { generateRoomId } from '../utils/chatUtils';
import { storage } from '../utils/storage';

const { width } = Dimensions.get('window');
const IS_LARGE_WEB = Platform.OS === 'web' && width >= 1024;

interface ServiceTechniciansScreenProps {
  serviceId: number;
  serviceName?: string;
  onBack?: () => void;
  onNavigateToTechnicianProfile?: (technicianId: number) => void;
  onNavigateToChat?: (roomId: string, receiverId: number, receiverName: string) => void;
  onNavigateToBooking?: (technicianId: number, technicianName?: string) => void; // This is for "Hire" button
}

export default function ServiceTechniciansScreen({
  serviceId,
  serviceName,
  onBack,
  onNavigateToTechnicianProfile,
  onNavigateToChat,
  onNavigateToBooking,
}: ServiceTechniciansScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  
  useEffect(() => {
    loadTechnicians();
  }, [serviceId]);
  
  const loadTechnicians = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 [ServiceTechniciansScreen] Loading technicians for service:', serviceId);
      
      const data = await getTechniciansByService(serviceId);
      
      console.log('✅ [ServiceTechniciansScreen] Loaded technicians:', data.length);
      
      setTechnicians(data);
    } catch (err: any) {
      console.error('❌ [ServiceTechniciansScreen] Error loading technicians:', err);
      setError(err.message || t('Failed to load technicians'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChatTechnician = async (technicianId: number, technicianName?: string) => {
    console.log('🔵 [ServiceTechniciansScreen] Chat button clicked for technician:', technicianId);
    if (onNavigateToChat) {
      try {
        const currentUserId = await storage.getUserId();
        if (currentUserId) {
          const roomId = generateRoomId(currentUserId, technicianId);
          const receiverName = technicianName || `Technician ${technicianId}`;
          console.log('🔵 [ServiceTechniciansScreen] Opening chat with roomId:', roomId, 'receiverId:', technicianId, 'receiverName:', receiverName);
          onNavigateToChat(roomId, technicianId, receiverName);
        } else {
          console.error('❌ [ServiceTechniciansScreen] No current user ID found');
        }
      } catch (error) {
        console.error('❌ [ServiceTechniciansScreen] Error opening chat:', error);
      }
    }
  };
  
  const handleViewProfile = (technicianId: number) => {
    console.log('🔵 [ServiceTechniciansScreen] Profile button clicked for technician:', technicianId);
    if (onNavigateToTechnicianProfile) {
      onNavigateToTechnicianProfile(technicianId);
    } else {
      setSelectedTechnicianId(technicianId);
    }
  };
  
  const handleHire = (technicianId: number, technicianName?: string) => {
    console.log('🔵 [ServiceTechniciansScreen] Hire button clicked for technician:', technicianId);
    if (onNavigateToBooking) {
      onNavigateToBooking(technicianId, technicianName);
    }
  };
  
  const renderTechnician = ({ item }: { item: any }) => (
    <View style={[styles.technicianCard, { backgroundColor: colors.cardBackground }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={styles.profileHeaderTouchable}
          onPress={() => handleViewProfile(item.id)}
        >
          <Image
            source={{
              uri: item.profileImage || item.avatar || 'https://via.placeholder.com/80'
            }}
            style={styles.avatar}
          />
        </TouchableOpacity>
        
        <View style={styles.technicianInfo}>
          <TouchableOpacity onPress={() => handleViewProfile(item.id)}>
            <Text style={[styles.technicianName, { color: colors.text }]}>{item.name}</Text>
          </TouchableOpacity>
          
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFC107" />
            <Text style={[styles.ratingText, { color: colors.text }]}>
              {item.averageRating?.toFixed(1) || 'N/A'}
            </Text>
            <Text style={[styles.reviewsText, { color: colors.textSecondary }]}>
              ({item.totalReviews || 0} {t('reviews')})
            </Text>
          </View>
          
          {item.yearsOfExperience && (
            <Text style={[styles.experience, { color: colors.textSecondary }]}>
              {item.yearsOfExperience} {t('years experience')}
            </Text>
          )}
        </View>
      </View>
      
      {/* Services */}
      {item.services && item.services.length > 0 && (
        <View style={styles.servicesContainer}>
          <Text style={[styles.servicesLabel, { color: colors.text }]}>{t('Services')}:</Text>
          <View style={styles.servicesList}>
            {item.services.slice(0, 3).map((service: any, index: number) => (
              <View key={index} style={[styles.serviceBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.serviceBadgeText, { color: colors.primary }]}>
                  {i18n.language === 'ar' && service.nameAr ? service.nameAr : service.nameEn}
                </Text>
              </View>
            ))}
            {item.services.length > 3 && (
              <Text style={[styles.moreServices, { color: colors.textSecondary }]}>
                +{item.services.length - 3} {t('more')}
              </Text>
            )}
          </View>
        </View>
      )}
      
      {/* Location */}
      {item.regionNameEn && (
        <View style={styles.locationContainer}>
          <Ionicons name="location" size={16} color={colors.textSecondary} />
          <Text style={[styles.locationText, { color: colors.textSecondary }]}>
            {i18n.language === 'ar' && item.regionNameAr ? item.regionNameAr : item.regionNameEn}
          </Text>
        </View>
      )}
      
      {/* Description */}
      {item.description && (
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.hireButton, { backgroundColor: colors.primary }]}
          onPress={() => handleHire(item.id, item.name)}
        >
          <Ionicons name="person-add-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>{t('Hire')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.chatButton, { backgroundColor: '#4CAF50' }]}
          onPress={() => handleChatTechnician(item.id, item.name)}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>{t('Chat')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // If viewing a technician profile
  if (selectedTechnicianId) {
    return (
      <TechnicianProfileView
        technicianId={selectedTechnicianId}
        onBack={() => setSelectedTechnicianId(null)}
      />
    );
  }
  
  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('Loading technicians...')}
        </Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Ionicons name="alert-circle" size={60} color="#EF4444" />
        <Text style={[styles.errorText, { color: colors.text }]}>{t('Error')}</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: colors.primary }]} 
          onPress={loadTechnicians}
        >
          <Text style={styles.retryButtonText}>{t('Retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (technicians.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Ionicons name="person-outline" size={60} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          {t('No technicians available')}
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          {t('Try searching for a different service')}
        </Text>
        {onBack && (
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.primary }]} 
            onPress={onBack}
          >
            <Text style={styles.backButtonText}>{t('Back')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButtonHeader}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {serviceName || t('Technicians')} ({technicians.length})
        </Text>
        {onBack && <View style={styles.backButtonHeader} />}
      </View>
      
      <FlatList
        data={technicians}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTechnician}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  technicianCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  profileHeaderTouchable: {
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  technicianInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  technicianName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 12,
    marginLeft: 4,
  },
  experience: {
    fontSize: 12,
  },
  servicesContainer: {
    marginBottom: 12,
  },
  servicesLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  serviceBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreServices: {
    fontSize: 12,
    alignSelf: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  chatButton: {
    // backgroundColor set inline
  },
  hireButton: {
    // backgroundColor set inline
  },
});

