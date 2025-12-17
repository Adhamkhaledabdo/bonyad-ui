import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import ProjectCreationFlow from '../components/ProjectCreationFlow';
import { deleteReview, getProjectReviewStatus, ProjectReviewStatus, submitTechnicianReview, updateReview } from '../services/ReviewService';

// ===== DESIGN TOKENS (matching Figma design) =====
const COLORS = {
  // Primary Blues
  primary100: '#003867',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary10: '#E6EFF7',
  // Greens
  green90: '#007B36',
  green80: '#008B3E',
  green70: '#009C47',
  green60: '#00AC4F',
  green10: '#E6F5EC',
  // Amber
  amber60: '#FFB703',
  // Text
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  textWhite: '#FFFFFF',
  // Backgrounds
  bgWhite: '#FFFFFF',
};

interface CompletedProjectScreenProps {
  project: any;
  onBack: () => void;
  onSuccess?: () => void;
  isTechnician?: boolean;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => void;
  onViewTechnician?: (technicianId: number) => void;
  onStartNewProject?: () => void;
  onViewAllProjects?: () => void;
}

interface Phase {
  id: number;
  projectId: number;
  phaseNumber: number;
  description: string;
  timeSpentDays: number;
  moneySpent: number;
  paymentStatus: string;
  approved: boolean;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CompletedProjectScreen({
  project,
  onBack,
  onSuccess,
  isTechnician: propIsTechnician,
  onOpenChat,
  onViewTechnician,
  onStartNewProject,
  onViewAllProjects,
}: CompletedProjectScreenProps) {
  const resolvedProjectId = project?.id ?? project?.project?.id ?? project?.projectId;
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar';
  
  const screenWidth = Dimensions.get('window').width;
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [technicianId, setTechnicianId] = useState<number | null>(null);
  const [technicianName, setTechnicianName] = useState<string>('');
  const [serviceName, setServiceName] = useState<string>('');
  const [reviewStatus, setReviewStatus] = useState<ProjectReviewStatus>({ hasReview: false });
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [isTechnician, setIsTechnician] = useState(propIsTechnician ?? false);
  
  // Inline review state
  const [inlineRating, setInlineRating] = useState(0);
  const [inlineComment, setInlineComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  
  // User info for chat
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');

  // Check user role on mount
  useEffect(() => {
    const checkRole = async () => {
      if (propIsTechnician !== undefined) {
        setIsTechnician(propIsTechnician);
        return;
      }
      try {
        const role = await storage.getUserRole();
        const isTech = role?.toUpperCase() === 'TECHNICIAN';
        setIsTechnician(isTech);
      } catch (error) {
        console.error('Error checking role:', error);
        setIsTechnician(false);
      }
    };
    checkRole();
  }, [propIsTechnician]);

  const loadReviewStatus = useCallback(async () => {
    if (!resolvedProjectId) return;
    try {
      setIsReviewLoading(true);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔍 [CompletedProjectScreen] Loading review status...');
      console.log('🔍 [CompletedProjectScreen] Project ID:', resolvedProjectId);
      console.log('🔍 [CompletedProjectScreen] Is Technician:', isTechnician);
      console.log('═══════════════════════════════════════════════════════════');
      
      const status = await getProjectReviewStatus(resolvedProjectId);
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📥 [CompletedProjectScreen] Review status response:');
      console.log('📥 [CompletedProjectScreen] Has Review:', status.hasReview);
      console.log('📥 [CompletedProjectScreen] Review Data:', JSON.stringify(status.review, null, 2));
      console.log('═══════════════════════════════════════════════════════════');
      
      setReviewStatus(status);
      // Pre-fill inline review if exists
      if (status.hasReview && status.review) {
        console.log('✅ [CompletedProjectScreen] Pre-filling review data');
        console.log('✅ [CompletedProjectScreen] Rating:', status.review.rating);
        console.log('✅ [CompletedProjectScreen] Comment:', status.review.comment);
        setInlineRating(status.review.rating || 0);
        setInlineComment(status.review.comment || '');
      } else {
        console.log('⚠️ [CompletedProjectScreen] No review found - resetting form');
        setInlineRating(0);
        setInlineComment('');
      }
    } catch (error) {
      console.error('❌ [CompletedProjectScreen] Error loading review status:', error);
      setReviewStatus({ hasReview: false });
    } finally {
      setIsReviewLoading(false);
    }
  }, [resolvedProjectId, isTechnician]);

  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🟢 [CompletedProjectScreen] ==========================================');
    console.log('🟢 [CompletedProjectScreen] ✅ SCREEN OPENED');
    console.log('🟢 [CompletedProjectScreen] ==========================================');
    console.log('🟢 [CompletedProjectScreen] Project ID:', resolvedProjectId);
    console.log('🟢 [CompletedProjectScreen] Project Status:', project.status?.toUpperCase());
    console.log('🟢 [CompletedProjectScreen] Is Technician:', isTechnician);
    console.log('🟢 [CompletedProjectScreen] Mode:', isTechnician ? 'TECHNICIAN VIEW' : 'USER VIEW');
    console.log('═══════════════════════════════════════════════════════════');
    
    loadPhases();
    loadProjectDetails();
    extractTechnicianInfo();
    extractServiceInfo();
    extractUserInfo();
    // Load review status for both users and technicians
    loadReviewStatus();
  }, [project, loadReviewStatus, isTechnician]);

  const extractTechnicianInfo = () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 [CompletedProjectScreen] Extracting technician info...');
    console.log('🔍 [CompletedProjectScreen] Project keys:', Object.keys(project || {}));
    console.log('🔍 [CompletedProjectScreen] Project.assignedTechnicianId:', project?.assignedTechnicianId);
    console.log('🔍 [CompletedProjectScreen] Project.technicianId:', project?.technicianId);
    console.log('🔍 [CompletedProjectScreen] Project.acceptedBid:', project?.acceptedBid);
    console.log('🔍 [CompletedProjectScreen] Project.assignedTechnician:', project?.assignedTechnician);
    console.log('🔍 [CompletedProjectScreen] Project.technician:', project?.technician);
    
    let foundTechnicianId: number | null = null;
    let foundTechnicianName: string = '';

    // Try multiple ways to get technician info
    if (project.assignedTechnicianId) {
      foundTechnicianId = project.assignedTechnicianId;
      console.log('✅ [CompletedProjectScreen] Found via assignedTechnicianId');
    } else if (project.technicianId) {
      foundTechnicianId = project.technicianId;
      console.log('✅ [CompletedProjectScreen] Found via technicianId');
    } else if (project.acceptedBid?.technicianId) {
      foundTechnicianId = project.acceptedBid.technicianId;
      console.log('✅ [CompletedProjectScreen] Found via acceptedBid.technicianId');
    } else if (project.assignedTechnician?.id) {
      foundTechnicianId = project.assignedTechnician.id;
      console.log('✅ [CompletedProjectScreen] Found via assignedTechnician.id');
    } else if (project.technician?.id) {
      foundTechnicianId = project.technician.id;
      console.log('✅ [CompletedProjectScreen] Found via technician.id');
    } else {
      console.warn('⚠️ [CompletedProjectScreen] No technician ID found in project data!');
    }

    // Get technician name
    if (project.technicianName) {
      foundTechnicianName = project.technicianName;
    } else if (project.acceptedBid?.technicianName) {
      foundTechnicianName = project.acceptedBid.technicianName;
    } else if (project.technician?.name) {
      foundTechnicianName = project.technician.name;
    } else if (project.assignedTechnician?.name) {
      foundTechnicianName = project.assignedTechnician.name;
    }

    console.log('✅ [CompletedProjectScreen] Final Technician ID:', foundTechnicianId);
    console.log('✅ [CompletedProjectScreen] Final Technician Name:', foundTechnicianName);
    console.log('═══════════════════════════════════════════════════════════');

    if (foundTechnicianId) setTechnicianId(foundTechnicianId);
    if (foundTechnicianName) setTechnicianName(foundTechnicianName);
  };

  const extractUserInfo = () => {
    // Extract user info for technician view
    if (project.userId) {
      setUserId(project.userId);
    } else if (project.user?.id) {
      setUserId(project.user.id);
    }
    
    if (project.userName) {
      setUserName(project.userName);
    } else if (project.user?.name) {
      setUserName(project.user.name);
    }
  };

  const extractServiceInfo = () => {
    if (project.serviceNameEn) {
      setServiceName(project.serviceNameEn);
    } else if (project.serviceNameAr) {
      setServiceName(project.serviceNameAr);
    } else if (project.service?.nameEn) {
      setServiceName(project.service.nameEn);
    } else if (project.service?.nameAr) {
      setServiceName(project.service.nameAr);
    } else if (project.category) {
      setServiceName(project.category);
    }
  };

  const calculateProjectSummary = () => {
    const totalPhases = phases.length;
    const completedPhases = phases.filter(p => p.completed).length;
    const paidPhases = phases.filter(p => p.paymentStatus === 'PAID' || p.paymentStatus === 'paid').length;
    const totalAmount = phases.reduce((sum, p) => sum + (p.moneySpent || 0), 0);
    const totalDays = phases.reduce((sum, p) => sum + (p.timeSpentDays || 0), 0);
    
    return {
      totalPhases,
      completedPhases,
      paidPhases,
      totalAmount,
      totalDays,
      totalWeeks: Math.ceil(totalDays / 7),
      totalMonths: Math.ceil(totalDays / 30),
    };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const loadProjectDetails = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token || !resolvedProjectId) return;

      const url = `https://bonyad-hub.com/api/projects/${resolvedProjectId}`;
      console.log('🔍 [CompletedProjectScreen] Fetching project details from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const projectData = await response.json();
        console.log('✅ [CompletedProjectScreen] Loaded project details');
        
        // Update technician info
        if (projectData.assignedTechnicianId) {
          setTechnicianId(projectData.assignedTechnicianId);
        } else if (projectData.technicianId) {
          setTechnicianId(projectData.technicianId);
        } else if (projectData.acceptedBid?.technicianId) {
          setTechnicianId(projectData.acceptedBid.technicianId);
        } else if (projectData.assignedTechnician?.id) {
          setTechnicianId(projectData.assignedTechnician.id);
        } else if (projectData.technician?.id) {
          setTechnicianId(projectData.technician.id);
        }

        if (projectData.technicianName) {
          setTechnicianName(projectData.technicianName);
        } else if (projectData.acceptedBid?.technicianName) {
          setTechnicianName(projectData.acceptedBid.technicianName);
        } else if (projectData.technician?.name) {
          setTechnicianName(projectData.technician.name);
        } else if (projectData.assignedTechnician?.name) {
          setTechnicianName(projectData.assignedTechnician.name);
        }
        
        // Update user info for technician view
        if (projectData.userId) setUserId(projectData.userId);
        if (projectData.userName) setUserName(projectData.userName);
        if (projectData.user?.id) setUserId(projectData.user.id);
        if (projectData.user?.name) setUserName(projectData.user.name);
      }
    } catch (error: any) {
      console.error('❌ [CompletedProjectScreen] Error loading project details:', error);
    }
  };

  const loadPhases = async () => {
    try {
      setIsLoading(true);
      const token = await storage.getAuthToken();
      if (!token) return;

      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, {
        projectId: resolvedProjectId,
      });

      console.log('🔍 [CompletedProjectScreen] Fetching phases from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [CompletedProjectScreen] Loaded phases:', data.length);
        setPhases(data);
      }
    } catch (error: any) {
      console.error('❌ [CompletedProjectScreen] Error loading phases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  const handleSubmitReview = async () => {
    // For users: review the technician (technicianId)
    // For technicians: review the user/client (userId)
    const reviewedUserId = isTechnician ? userId : technicianId;
    const reviewedUserName = isTechnician ? (userName || t('the client')) : (technicianName || t('this technician'));

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [CompletedProjectScreen] handleSubmitReview called');
    console.log('🔵 [CompletedProjectScreen] Is Technician:', isTechnician);
    console.log('🔵 [CompletedProjectScreen] Reviewed User ID:', reviewedUserId);
    console.log('🔵 [CompletedProjectScreen] Reviewed User Name:', reviewedUserName);
    console.log('🔵 [CompletedProjectScreen] Inline Rating:', inlineRating);
    console.log('🔵 [CompletedProjectScreen] Inline Comment:', inlineComment);
    console.log('═══════════════════════════════════════════════════════════');

    console.log('🔍 [CompletedProjectScreen] Validation 1: Checking reviewedUserId...');
    if (!reviewedUserId) {
      console.error('❌ [CompletedProjectScreen] VALIDATION FAILED: No user ID found to review');
      Alert.alert(t('Error'), isTechnician ? t('Client information not available') : t('Technician information not available'));
      return;
    }
    console.log('✅ [CompletedProjectScreen] Validation 1 passed');

    console.log('🔍 [CompletedProjectScreen] Validation 2: Checking inlineRating...');
    if (inlineRating === 0) {
      console.error('❌ [CompletedProjectScreen] VALIDATION FAILED: Rating is 0');
      Alert.alert(t('Error'), t('Please select a rating'));
      return;
    }
    console.log('✅ [CompletedProjectScreen] Validation 2 passed');

    console.log('🔍 [CompletedProjectScreen] Validation 3: Checking comment for low rating...');
    // API requires comment for ratings below 3.0
    if (inlineRating < 3 && (!inlineComment || inlineComment.trim().length === 0)) {
      console.error('❌ [CompletedProjectScreen] VALIDATION FAILED: Rating < 3 requires comment');
      Alert.alert(t('Error'), t('Comment is required for ratings below 3 stars'));
      return;
    }
    console.log('✅ [CompletedProjectScreen] Validation 3 passed');

    console.log('🔵 [CompletedProjectScreen] All validations passed! Submitting review directly...');
    
    // Submit directly - no confirmation dialog needed since user already clicked "Submit Review" button
    try {
      setIsSubmittingReview(true);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔵 [CompletedProjectScreen] Submitting review...');
      console.log('🔵 [CompletedProjectScreen] Project ID:', resolvedProjectId);
      console.log('🔵 [CompletedProjectScreen] Reviewed User ID:', reviewedUserId);
      console.log('🔵 [CompletedProjectScreen] Is Technician Reviewing:', isTechnician);
      console.log('🔵 [CompletedProjectScreen] Rating:', inlineRating);
      console.log('🔵 [CompletedProjectScreen] Comment:', inlineComment || '(empty)');
      console.log('🔵 [CompletedProjectScreen] Comment length:', inlineComment?.length || 0);
      console.log('═══════════════════════════════════════════════════════════');

      // Use the same API endpoint - it works for both user reviewing technician
      // and technician reviewing user (reviewedUserId is the person being reviewed)
      const result = await submitTechnicianReview(
        reviewedUserId,
        inlineRating,
        inlineComment || '',  // Ensure empty string instead of undefined
        resolvedProjectId
      );

      console.log('✅ [CompletedProjectScreen] Review submitted successfully');
      console.log('✅ [CompletedProjectScreen] Result:', JSON.stringify(result, null, 2));
      
      Alert.alert(t('Success'), t('Thank you for your review!'));
      
      // Reload review status to show the new review
      await loadReviewStatus();
      
      // Notify parent
      onSuccess?.();
    } catch (error: any) {
      console.error('═══════════════════════════════════════════════════════════');
      console.error('❌ [CompletedProjectScreen] Error submitting review:', error);
      console.error('❌ [CompletedProjectScreen] Error name:', error.name);
      console.error('❌ [CompletedProjectScreen] Error message:', error.message);
      console.error('❌ [CompletedProjectScreen] Error stack:', error.stack);
      console.error('═══════════════════════════════════════════════════════════');
      
      // Show user-friendly error message
      const errorMessage = error.message || t('Failed to submit review');
      Alert.alert(t('Error'), errorMessage);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleEditReview = () => {
    // Switch to edit mode and pre-fill the form with existing review data
    if (reviewStatus.review) {
      setInlineRating(reviewStatus.review.rating || 0);
      setInlineComment(reviewStatus.review.comment || '');
      setIsEditingReview(true);
    }
  };

  const handleCancelEdit = () => {
    // Reset to view mode
    setIsEditingReview(false);
    // Restore original values
    if (reviewStatus.review) {
      setInlineRating(reviewStatus.review.rating || 0);
      setInlineComment(reviewStatus.review.comment || '');
    }
  };

  const handleUpdateReview = async () => {
    const reviewId = reviewStatus.review?.id ?? reviewStatus.review?.reviewId;
    if (!reviewId) {
      Alert.alert(t('Error'), t('Review ID not found'));
      return;
    }

    if (inlineRating === 0) {
      Alert.alert(t('Error'), t('Please select a rating'));
      return;
    }

    // API requires comment for ratings below 3.0
    if (inlineRating < 3 && (!inlineComment || inlineComment.trim().length === 0)) {
      console.log('⚠️ [CompletedProjectScreen] Rating < 3 requires comment');
      Alert.alert(t('Error'), t('Comment is required for ratings below 3 stars'));
      return;
    }

    // Submit directly - no confirmation dialog needed
    try {
      setIsSubmittingReview(true);
      console.log('🔵 [CompletedProjectScreen] Updating review...');
      console.log('🔵 [CompletedProjectScreen] Review ID:', reviewId);
      console.log('🔵 [CompletedProjectScreen] New Rating:', inlineRating);
      console.log('🔵 [CompletedProjectScreen] New Comment:', inlineComment);

      await updateReview(
        reviewId,
        inlineRating,
        inlineComment || '',
        resolvedProjectId
      );

      console.log('✅ [CompletedProjectScreen] Review updated successfully');
      
      Alert.alert(t('Success'), t('Review updated successfully'));
      setIsEditingReview(false);
      
      // Reload review status
      await loadReviewStatus();
      
      onSuccess?.();
    } catch (error: any) {
      console.error('❌ [CompletedProjectScreen] Error updating review:', error);
      Alert.alert(t('Error'), error.message || t('Failed to update review'));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    const reviewId = reviewStatus.review?.id ?? reviewStatus.review?.reviewId;
    if (!reviewId) return;

    // Use window.confirm for web compatibility (works on both web and native)
    const confirmed = window.confirm(t('Are you sure you want to delete your review?'));
    
    if (!confirmed) {
      console.log('🔵 [CompletedProjectScreen] Delete cancelled by user');
      return;
    }

    try {
      setIsDeletingReview(true);
      console.log('🔵 [CompletedProjectScreen] Deleting review...');
      console.log('🔵 [CompletedProjectScreen] Review ID:', reviewId);
      
      await deleteReview(reviewId);
      
      console.log('✅ [CompletedProjectScreen] Review deleted successfully');
      Alert.alert(t('Success'), t('Review deleted successfully'));
      setReviewStatus({ hasReview: false });
      setInlineRating(0);
      setInlineComment('');
      loadReviewStatus();
    } catch (error: any) {
      console.error('❌ [CompletedProjectScreen] Error deleting review:', error);
      Alert.alert(t('Error'), error?.message || t('Failed to delete review'));
    } finally {
      setIsDeletingReview(false);
    }
  };

  const handleContactPress = () => {
    if (isTechnician) {
      // Contact User
      if (userId && onOpenChat) {
        const roomId = `project_${resolvedProjectId}_${userId}_${technicianId}`;
        onOpenChat(roomId, userId, userName || t('User'), resolvedProjectId);
      }
    } else {
      // Contact Provider/Technician
      if (technicianId && onOpenChat) {
        const roomId = `project_${resolvedProjectId}_${userId}_${technicianId}`;
        onOpenChat(roomId, technicianId, technicianName || t('Technician'), resolvedProjectId);
      }
    }
  };

  const handleDownloadInvoice = () => {
    // TODO: Implement invoice download - API endpoint not yet available
    console.log('📥 [CompletedProjectScreen] Download invoice clicked - feature coming soon');
    // No API endpoint available yet for invoice download
  };

  const handlePrimaryAction = () => {
    if (isTechnician) {
      onViewAllProjects?.();
    } else {
      onStartNewProject?.();
    }
  };

  const renderStarRating = (currentRating: number, onPress?: (rating: number) => void, size: number = 32) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress?.(star)}
            disabled={!onPress}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= currentRating ? 'star' : 'star-outline'}
              size={size}
              color={star <= currentRating ? COLORS.amber60 : COLORS.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const summary = calculateProjectSummary();
  const providerName = technicianName || project.technicianName || t('Provider');

  return (
    <>
      <View style={[styles.container, { backgroundColor: COLORS.bgWhite, paddingTop: IS_LARGE_WEB ? 0 : Math.max(insets.top, 16) }]}>
        {/* Header - Hidden on large web */}
        {!IS_LARGE_WEB && (
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <View style={[styles.headerContent, isRTL && styles.headerContentRTL]}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons 
                name={isRTL ? "chevron-forward" : "chevron-back"} 
                size={28} 
                color={COLORS.primary100} 
              />
            </TouchableOpacity>
            <View style={[styles.headerTextContainer, isRTL && styles.headerTextContainerRTL]}>
              <Text style={[styles.headerTitle, isRTL && styles.textRTL, { fontSize: scaledSize(20) }]}>
                {serviceName || project.description || t('Contracting Services')}
              </Text>
              <Text style={[styles.headerSubtitle, isRTL && styles.textRTL, { fontSize: scaledSize(14) }]}>
                  {t('Completed Project')}
              </Text>
            </View>
          </View>
        </View>
        )}

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary60} />
            <Text style={[styles.loadingText, { fontSize: scaledSize(14) }]}>{t('Loading...')}</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={[
              styles.scrollContent,
              IS_LARGE_WEB && styles.scrollContentLargeWeb,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Title Section - Large Web */}
            {IS_LARGE_WEB && (
              <View style={styles.titleSectionLargeWeb}>
                <TouchableOpacity onPress={onBack} style={styles.titleBackButton}>
                  <Ionicons 
                    name={isRTL ? "chevron-forward" : "chevron-back"} 
                    size={24} 
                    color={COLORS.primary100} 
                  />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                  <Text style={[styles.titleMainText, isRTL && { textAlign: 'right' }, { fontSize: scaledSize(42) }]}>
                    {serviceName || project.description || t('Contracting Services')}
                  </Text>
                  <Text style={[styles.titleSubtext, isRTL && { textAlign: 'right' }, { fontSize: scaledSize(20) }]}>
                    {t('Completed Project')}
                  </Text>
                </View>
              </View>
            )}

            <View style={[styles.flowContainer, IS_LARGE_WEB && styles.flowContainerLargeWeb]}>
              <ProjectCreationFlow currentStep="COMPLETED" />
            </View>

            {/* Divider */}
            <View style={[styles.divider, IS_LARGE_WEB && styles.dividerLargeWeb]} />
            {/* Completion Success Section */}
            <View style={styles.successSection}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={32} color={COLORS.green60} />
              </View>
              <Text style={[styles.successTitle, { fontSize: scaledSize(20) }]}>{t('Project Completed!')}</Text>
              <Text style={[styles.successSubtitle, { fontSize: scaledSize(16) }]}>
                {t('Your {{service}} has been successfully completed.', {
                  service: serviceName || t('Contracting Services')
                })}
              </Text>
            </View>

            {/* Project Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{t('Project Summary')}</Text>
              <View style={styles.summaryContent}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('Total Amount')}</Text>
                  <Text style={styles.summaryValue}>
                    {formatBudget(summary.totalAmount || project.budget || 0)} {t('SAR')}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('Duration')}</Text>
                  <Text style={styles.summaryValue}>
                    {summary.totalMonths} {summary.totalMonths === 1 ? t('Month') : t('Months')}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('Completion Date')}</Text>
                  <Text style={styles.summaryValue}>
                    {formatDate(project.updatedAt || project.completedAt || new Date().toISOString())}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    {isTechnician ? t('Client') : t('Provider')}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {isTechnician ? (userName || t('Client')) : providerName}
                  </Text>
                </View>
              </View>
            </View>

            {/* Completed Phases Section */}
            {phases.length > 0 && (
              <View style={styles.phasesSection}>
                <Text style={styles.sectionTitle}>{t('Completed Phases')}</Text>
                {phases.map((phase) => (
                  <View key={phase.id} style={styles.phaseItem}>
                    <Ionicons 
                      name="checkmark-circle-outline" 
                      size={16} 
                      color={COLORS.green60} 
                    />
                    <Text style={styles.phaseDescription}>{phase.description}</Text>
                    <View style={styles.phaseDateContainer}>
                      <Text style={styles.phaseDate}>
                        {formatDate(phase.updatedAt || phase.createdAt)}
                      </Text>
                      <Ionicons 
                        name="calendar-outline" 
                        size={14} 
                        color={COLORS.textSecondary} 
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Review Section - For both Users and Technicians */}
            <View style={styles.reviewSection}>
              <View style={styles.reviewCard}>
                <Text style={styles.reviewTitle}>{t('Rate Your Experience')}</Text>
                <Text style={styles.reviewSubtitle}>
                  {isTechnician 
                    ? t('How was your experience with {{name}}?', { name: userName || t('the client') })
                    : t('How was your experience with {{name}}?', { name: providerName })
                  }
                </Text>
                
                {isReviewLoading ? (
                  <View style={styles.reviewLoading}>
                    <ActivityIndicator color={COLORS.primary60} />
                  </View>
                ) : reviewStatus.hasReview && reviewStatus.review && !isEditingReview ? (
                  <View style={styles.existingReviewContainer}>
                    {renderStarRating(reviewStatus.review.rating || 0, undefined, 28)}
                    {reviewStatus.review.comment && (
                      <Text style={styles.existingReviewComment}>
                        {reviewStatus.review.comment}
                      </Text>
                    )}
                    <View style={styles.reviewActions}>
                      <TouchableOpacity
                        style={styles.reviewActionButton}
                        onPress={handleEditReview}
                      >
                        <Ionicons name="create-outline" size={18} color={COLORS.primary70} />
                        <Text style={styles.reviewActionText}>{t('Edit Review')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reviewActionButton, styles.deleteButton]}
                        onPress={handleDeleteReview}
                        disabled={isDeletingReview}
                      >
                        {isDeletingReview ? (
                          <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                          <Ionicons name="trash-outline" size={18} color="#DC2626" />
                        )}
                        <Text style={[styles.reviewActionText, styles.deleteText]}>
                          {t('Delete Review')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : isEditingReview ? (
                  <View style={styles.inlineReviewForm}>
                    {renderStarRating(inlineRating, setInlineRating)}
                    <TextInput
                      style={styles.reviewInput}
                      placeholder={t('Share your feedback (Optional)')}
                      placeholderTextColor={COLORS.primary100}
                      value={inlineComment}
                      onChangeText={setInlineComment}
                      multiline
                      numberOfLines={3}
                    />
                    <View style={styles.editReviewButtons}>
                      <TouchableOpacity
                        style={styles.cancelEditButton}
                        onPress={handleCancelEdit}
                        disabled={isSubmittingReview}
                      >
                        <Text style={styles.cancelEditText}>{t('Cancel')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.updateReviewButton,
                          (inlineRating === 0 || isSubmittingReview) && styles.submitButtonDisabled
                        ]}
                        onPress={handleUpdateReview}
                        disabled={inlineRating === 0 || isSubmittingReview}
                      >
                        {isSubmittingReview ? (
                          <ActivityIndicator size="small" color={COLORS.textWhite} />
                        ) : (
                          <Text style={styles.submitReviewText}>{t('Update Review')}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.inlineReviewForm}>
                    {renderStarRating(inlineRating, setInlineRating)}
                    <TextInput
                      style={styles.reviewInput}
                      placeholder={t('Share your feedback (Optional)')}
                      placeholderTextColor={COLORS.primary100}
                      value={inlineComment}
                      onChangeText={setInlineComment}
                      multiline
                      numberOfLines={3}
                    />
                    <TouchableOpacity
                      style={[
                        styles.submitReviewButton,
                        (inlineRating === 0 || isSubmittingReview) && styles.submitButtonDisabled
                      ]}
                      onPress={handleSubmitReview}
                      disabled={inlineRating === 0 || (!technicianId && !userId) || isSubmittingReview}
                    >
                      {isSubmittingReview ? (
                        <ActivityIndicator size="small" color={COLORS.textWhite} />
                      ) : (
                        <Text style={styles.submitReviewText}>{t('Submit Review')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsSection}>
              {/* Download Invoice */}
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={handleDownloadInvoice}
              >
                <Ionicons name="download-outline" size={24} color={COLORS.primary70} />
                <Text style={styles.outlineButtonText}>{t('Download Invoice')}</Text>
              </TouchableOpacity>

              {/* Contact Button */}
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={handleContactPress}
              >
                <Ionicons name="chatbubble-outline" size={24} color={COLORS.primary70} />
                <Text style={styles.outlineButtonText}>
                  {isTechnician ? t('Contact User') : t('Contact Provider')}
                </Text>
              </TouchableOpacity>

              {/* Primary Action Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handlePrimaryAction}
              >
                <Text style={styles.primaryButtonText}>
                  {isTechnician ? t('View All Projects') : t('Start a New Project')}
                </Text>
              </TouchableOpacity>

             <View style={{ height: 30 }} />
            </View>
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.bgWhite,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerLargeWeb: {
    paddingHorizontal: 48,
    paddingBottom: 32,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerContentLargeWeb: {
    gap: 56,
  },
  headerContentRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonLargeWeb: {
    width: 40,
    height: 40,
  },
  headerTextContainer: {
    flex: 1,
    gap: 4,
  },
  headerTextContainerLargeWeb: {
    gap: 8,
  },
  headerTextContainerRTL: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary100,
  },
  headerTitleLargeWeb: {
    fontSize: 34,
    fontWeight: '400',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: COLORS.textSecondary,
  },
  headerSubtitleLargeWeb: {
    fontSize: 16,
  },
  textRTL: {
    textAlign: 'right',
  },
  flowContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  flowContainerLargeWeb: {
    paddingHorizontal: 48,
    paddingTop: 8,
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.textDividers,
    marginHorizontal: 16,
  },
  dividerLargeWeb: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  scrollContentLargeWeb: {
    padding: 48,
    paddingBottom: 32,
    width: '100%',
  },
  // Success Section
  successSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 6,
    backgroundColor: COLORS.green10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: COLORS.primary100,
  },
  successSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.green60,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: COLORS.textDividers,
    padding: 16,
    gap: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  summaryContent: {
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green10,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textWhite,
    textAlign: 'right',
  },
  // Phases Section
  phasesSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textBody,
  },
  phaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green10,
    borderWidth: 0.5,
    borderColor: COLORS.green80,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    minHeight: 52,
  },
  phaseDescription: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.green90,
  },
  phaseDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phaseDate: {
    fontSize: 14,
    fontWeight: '300',
    color: COLORS.textSecondary,
  },
  // Review Section
  reviewSection: {
    gap: 8,
  },
  reviewCard: {
    borderWidth: 0.5,
    borderColor: COLORS.textDividers,
    borderRadius: 8,
    padding: 16,
    gap: 16,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textBody,
  },
  reviewSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  reviewLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  starButton: {
    padding: 4,
  },
  inlineReviewForm: {
    gap: 16,
  },
  reviewInput: {
    backgroundColor: COLORS.primary10,
    borderWidth: 0.5,
    borderColor: COLORS.primary100,
    borderRadius: 8,
    padding: 8,
    height: 84,
    fontSize: 14,
    fontWeight: '100',
    color: COLORS.primary100,
    textAlignVertical: 'top',
  },
  submitReviewButton: {
    backgroundColor: COLORS.primary70,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textDividers,
  },
  submitReviewText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textWhite,
  },
  editReviewButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelEditButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.textDividers,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelEditText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textBody,
  },
  updateReviewButton: {
    flex: 2,
    backgroundColor: COLORS.primary70,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  existingReviewContainer: {
    gap: 12,
    paddingTop: 8,
  },
  existingReviewComment: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  reviewActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary70,
  },
  reviewActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary70,
  },
  deleteButton: {
    borderColor: '#DC2626',
  },
  deleteText: {
    color: '#DC2626',
  },
  // Actions Section
  actionsSection: {
    gap: 16,
    marginTop: 8,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 0.5,
    borderColor: COLORS.primary70,
    borderRadius: 8,
    padding: 16,
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.primary70,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.green70,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textWhite,
  },
  // Title Section - Large Web (Figma Design)
  titleSectionLargeWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 48,
    paddingTop: 24,
    paddingBottom: 0,
  },
  titleBackButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    gap: 8,
  },
  titleMainText: {
    fontSize: 42,
    fontWeight: '700',
    color: COLORS.primary100,
    lineHeight: 42,
  },
  titleSubtext: {
    fontSize: 20,
    fontWeight: '300',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

