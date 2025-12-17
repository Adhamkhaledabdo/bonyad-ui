import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import ReviewTechnicianModal from '../components/ReviewTechnicianModal';
import { deleteReview, getProjectReviewStatus, ProjectReviewStatus } from '../services/ReviewService';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';

interface CompletedProjectViewPageProps {
  project: any;
  onBack: () => void;
  onSuccess?: () => void;
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

interface ProjectReview {
  id: number;
  rating: number;
  comment?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export default function CompletedProjectViewPage({
  project,
  onBack,
  onSuccess,
}: CompletedProjectViewPageProps) {
  const resolvedProjectId = project?.id ?? project?.project?.id ?? project?.projectId;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [technicianId, setTechnicianId] = useState<number | null>(null);
  const [technicianName, setTechnicianName] = useState<string>('');
  const [serviceName, setServiceName] = useState<string>('');
  const [reviewStatus, setReviewStatus] = useState<ProjectReviewStatus>({ hasReview: false });
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [reviewModalMode, setReviewModalMode] = useState<'create' | 'edit'>('create');
  
  // Custom popup hooks
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showDeleteConfirmation, hideConfirmation } = useConfirmationPopup();

  const loadReviewStatus = useCallback(async () => {
    if (!resolvedProjectId) return;
    try {
      setIsReviewLoading(true);
      const status = await getProjectReviewStatus(resolvedProjectId);
      setReviewStatus(status);
    } catch (error) {
      console.error('❌ [CompletedProjectViewPage] Error loading review status:', error);
      setReviewStatus({ hasReview: false });
    } finally {
      setIsReviewLoading(false);
    }
  }, [resolvedProjectId]);

  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [CompletedProjectViewPage] ==========================================');
    console.log('🔵 [CompletedProjectViewPage] ✅ PAGE OPENED');
    console.log('🔵 [CompletedProjectViewPage] ==========================================');
    console.log('🔵 [CompletedProjectViewPage] Project ID:', resolvedProjectId);
    console.log('🔵 [CompletedProjectViewPage] Project Status:', project.status?.toUpperCase());
    console.log('🔵 [CompletedProjectViewPage] Status: COMPLETED');
    console.log('🔵 [CompletedProjectViewPage] User can view project and review technician');
    console.log('═══════════════════════════════════════════════════════════');
    
    loadPhases();
    loadProjectDetails(); // Load full project details to get technician info
    extractTechnicianInfo();
    extractServiceInfo();
    loadReviewStatus();
  }, [project, loadReviewStatus]);

  const extractTechnicianInfo = () => {
    console.log('🔍 [CompletedProjectViewPage] Extracting technician info...');
    console.log('🔍 [CompletedProjectViewPage] Project data:', JSON.stringify(project, null, 2));
    
    // Try multiple ways to get technician info from project
    let foundTechnicianId: number | null = null;
    let foundTechnicianName: string = '';

    // Method 1: assignedTechnicianId (direct field)
    if (project.assignedTechnicianId) {
      foundTechnicianId = project.assignedTechnicianId;
      console.log('✅ [CompletedProjectViewPage] Found technicianId from assignedTechnicianId:', foundTechnicianId);
    }

    // Method 2: Direct technicianId
    if (!foundTechnicianId && project.technicianId) {
      foundTechnicianId = project.technicianId;
      console.log('✅ [CompletedProjectViewPage] Found technicianId:', foundTechnicianId);
    }

    // Method 3: From acceptedBid
    if (!foundTechnicianId && project.acceptedBid?.technicianId) {
      foundTechnicianId = project.acceptedBid.technicianId;
      console.log('✅ [CompletedProjectViewPage] Found technicianId from acceptedBid:', foundTechnicianId);
    }

    // Method 4: From assignedTechnician object
    if (!foundTechnicianId && project.assignedTechnician?.id) {
      foundTechnicianId = project.assignedTechnician.id;
      console.log('✅ [CompletedProjectViewPage] Found technicianId from assignedTechnician.id:', foundTechnicianId);
    }

    // Method 5: From technician object
    if (!foundTechnicianId && project.technician?.id) {
      foundTechnicianId = project.technician.id;
      console.log('✅ [CompletedProjectViewPage] Found technicianId from technician.id:', foundTechnicianId);
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

    console.log('✅ [CompletedProjectViewPage] Final technicianId:', foundTechnicianId);
    console.log('✅ [CompletedProjectViewPage] Final technicianName:', foundTechnicianName);

    if (foundTechnicianId) {
      setTechnicianId(foundTechnicianId);
    }
    if (foundTechnicianName) {
      setTechnicianName(foundTechnicianName);
    }
  };

  const extractServiceInfo = () => {
    // Try to get service/category name
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
    const totalPaid = phases
      .filter(p => p.paymentStatus === 'PAID' || p.paymentStatus === 'paid')
      .reduce((sum, p) => sum + (p.moneySpent || 0), 0);
    const totalDays = phases.reduce((sum, p) => sum + (p.timeSpentDays || 0), 0);
    
    return {
      totalPhases,
      completedPhases,
      paidPhases,
      totalAmount,
      totalPaid,
      totalDays,
      totalWeeks: Math.ceil(totalDays / 7),
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
      if (!token) {
        return;
      }

      if (!resolvedProjectId) {
        console.error('❌ [CompletedProjectViewPage] Missing project ID when loading project details');
        return;
      }

      const url = `https://bonyad-hub.com/api/projects/${resolvedProjectId}`;

      console.log('🔍 [CompletedProjectViewPage] Fetching project details from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const projectData = await response.json();
        console.log('✅ [CompletedProjectViewPage] Loaded project details:', projectData);
        
        // Update technician info from full project data
        // Priority: assignedTechnicianId > technicianId > acceptedBid > assignedTechnician > technician
        if (projectData.assignedTechnicianId) {
          setTechnicianId(projectData.assignedTechnicianId);
          console.log('✅ [CompletedProjectViewPage] Set technicianId from assignedTechnicianId:', projectData.assignedTechnicianId);
        } else if (projectData.technicianId) {
          setTechnicianId(projectData.technicianId);
          console.log('✅ [CompletedProjectViewPage] Set technicianId from technicianId:', projectData.technicianId);
        } else if (projectData.acceptedBid?.technicianId) {
          setTechnicianId(projectData.acceptedBid.technicianId);
          console.log('✅ [CompletedProjectViewPage] Set technicianId from acceptedBid:', projectData.acceptedBid.technicianId);
        } else if (projectData.assignedTechnician?.id) {
          setTechnicianId(projectData.assignedTechnician.id);
          console.log('✅ [CompletedProjectViewPage] Set technicianId from assignedTechnician.id:', projectData.assignedTechnician.id);
        } else if (projectData.technician?.id) {
          setTechnicianId(projectData.technician.id);
          console.log('✅ [CompletedProjectViewPage] Set technicianId from technician.id:', projectData.technician.id);
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
      } else {
        console.error('❌ [CompletedProjectViewPage] Failed to load project details');
      }
    } catch (error: any) {
      console.error('❌ [CompletedProjectViewPage] Error loading project details:', error);
    }
  };

  const loadPhases = async () => {
    try {
      setIsLoading(true);
      const token = await storage.getAuthToken();
      if (!token) {
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, {
        projectId: resolvedProjectId,
      });

      console.log('🔍 [CompletedProjectViewPage] Fetching phases from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [CompletedProjectViewPage] Loaded phases:', data.length);
        setPhases(data);
      } else {
        console.error('❌ [CompletedProjectViewPage] Failed to load phases');
      }
    } catch (error: any) {
      console.error('❌ [CompletedProjectViewPage] Error loading phases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  const getPaymentStatus = (phase: Phase) => {
    if (phase.paymentStatus === 'PAID' || phase.paymentStatus === 'paid') {
      return { text: t('Paid'), color: '#10B981', icon: 'checkmark-circle' };
    }
    return { text: t('Pending Payment'), color: '#F59E0B', icon: 'time-outline' };
  };

  const handleReviewTechnician = () => {
    if (!technicianId) {
      console.error('❌ [CompletedProjectViewPage] No technician ID found');
      return;
    }
    setReviewModalMode('create');
    setShowReviewModal(true);
  };

  const handleReviewSubmitted = () => {
    console.log('✅ [CompletedProjectViewPage] Review submitted successfully');
    onSuccess?.();
    loadReviewStatus();
  };

  const handleEditReview = () => {
    setReviewModalMode('edit');
    setShowReviewModal(true);
  };

  const handleDeleteReview = () => {
    const reviewId = reviewStatus.review?.id ?? reviewStatus.review?.reviewId;

    if (!reviewId) {
      return;
    }

    showDeleteConfirmation(
      t('Delete Review'),
      t('Are you sure you want to delete your review?'),
      async () => {
        try {
          setIsDeletingReview(true);
          await deleteReview(reviewId);
          showSuccess(t('Review deleted successfully'), t('Success'));
          setReviewStatus({ hasReview: false });
          loadReviewStatus();
        } catch (error: any) {
          console.error('❌ [CompletedProjectViewPage] Error deleting review:', error);
          showError(error?.message || t('Failed to delete review'), t('Error'));
        } finally {
          setIsDeletingReview(false);
        }
      }
    );
  };

  const renderRatingStars = (rating: number) => {
    return (
      <View style={styles.reviewStars}> 
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={18}
            color={star <= rating ? colors.primary : colors.textSecondary}
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    );
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('Completed Project')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content - Scrollable */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {t('Loading phases...')}
            </Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Project Info */}
            <View style={[styles.projectInfo, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.projectHeader}>
                <View style={styles.projectHeaderLeft}>
                  <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                  <View style={styles.projectTitleContainer}>
                    <Text style={[styles.projectTitle, { color: colors.text }]}>
                      {project.description || project.title}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: '#10B981' + '20' }]}>
                      <Text style={[styles.statusText, { color: '#10B981' }]}>
                        {t('Completed')}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {project.address && (
                <View style={styles.projectDetail}>
                  <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.projectDetailText, { color: colors.textSecondary }]}>
                    {project.address}
                  </Text>
                </View>
              )}

              {technicianName && (
                <View style={styles.projectDetail}>
                  <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.projectDetailText, { color: colors.textSecondary }]}>
                    {t('Technician')}: {technicianName}
                  </Text>
                </View>
              )}

              {serviceName && (
                <View style={styles.projectDetail}>
                  <Ionicons name="folder-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.projectDetailText, { color: colors.textSecondary }]}>
                    {t('Service')}: {serviceName}
                  </Text>
                </View>
              )}

              {project.budget && (
                <View style={styles.projectDetail}>
                  <Ionicons name="cash-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.projectDetailText, { color: colors.textSecondary }]}>
                    {t('Budget')}: {formatBudget(project.budget)} {t('SAR')}
                  </Text>
                </View>
              )}

              {project.createdAt && (
                <View style={styles.projectDetail}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.projectDetailText, { color: colors.textSecondary }]}>
                    {t('Started')}: {formatDate(project.createdAt)}
                  </Text>
                </View>
              )}

              {project.updatedAt && (
                <View style={styles.projectDetail}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.projectDetailText, { color: colors.textSecondary }]}>
                    {t('Completed')}: {formatDate(project.updatedAt)}
                  </Text>
                </View>
              )}
            </View>

            {/* Project Summary Statistics */}
            {phases.length > 0 && (
              <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  {t('Project Summary')}
                </Text>
                {(() => {
                  const summary = calculateProjectSummary();
                  return (
                    <View style={styles.summaryGrid}>
                      <View style={styles.summaryItem}>
                        <Ionicons name="layers-outline" size={24} color={colors.primary} />
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                          {summary.totalPhases}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                          {t('Total Phases')}
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Ionicons name="checkmark-done-circle-outline" size={24} color="#10B981" />
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                          {summary.completedPhases}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                          {t('Completed')}
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Ionicons name="wallet-outline" size={24} color="#10B981" />
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                          {summary.paidPhases}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                          {t('Paid')}
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Ionicons name="cash-outline" size={24} color={colors.primary} />
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                          {formatBudget(summary.totalAmount)}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                          {t('Total Amount')}
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Ionicons name="time-outline" size={24} color="#F59E0B" />
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                          {summary.totalWeeks}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                          {t('Weeks')}
                        </Text>
                      </View>
                    </View>
                  );
                })()}
              </View>
            )}

            {/* Phases Section */}
            {phases.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('Project Phases')}
                </Text>
                {phases.map((phase) => {
                  const paymentStatus = getPaymentStatus(phase);
                  
                  return (
                    <View
                      key={phase.id}
                      style={[styles.phaseCard, { backgroundColor: colors.cardBackground }]}
                    >
                      <View style={styles.phaseHeader}>
                        <View style={styles.phaseHeaderLeft}>
                          <View style={[styles.phaseNumber, { backgroundColor: colors.primary + '10' }]}>
                            <Text style={[styles.phaseNumberText, { color: colors.primary }]}>
                              {phase.phaseNumber}
                            </Text>
                          </View>
                          <View style={styles.phaseInfo}>
                            <Text style={[styles.phaseTitle, { color: colors.text }]}>
                              {t('Phase')} {phase.phaseNumber}
                            </Text>
                            <View style={styles.statusBadges}>
                              <View style={[styles.statusBadge, { backgroundColor: paymentStatus.color + '20' }]}>
                                <Ionicons name={paymentStatus.icon as any} size={14} color={paymentStatus.color} />
                                <Text style={[styles.statusBadgeText, { color: paymentStatus.color }]}>
                                  {paymentStatus.text}
                                </Text>
                              </View>
                              {phase.completed && (
                                <View style={[styles.statusBadge, { backgroundColor: '#10B981' + '20' }]}>
                                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                  <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>
                                    {t('Completed')}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                        <View style={styles.phaseAmount}>
                          <Text style={[styles.phaseAmountText, { color: colors.primary }]}>
                            {formatBudget(phase.moneySpent)} {t('SAR')}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.phaseDescription, { color: colors.textSecondary }]}>
                        {phase.description}
                      </Text>

                      <View style={styles.phaseDetails}>
                        <View style={styles.phaseDetailItem}>
                          <Ionicons name="time-outline" size={16} color="#F59E0B" />
                          <Text style={[styles.phaseDetailText, { color: colors.text }]}>
                            {Math.ceil(phase.timeSpentDays / 7)} {t('weeks')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Review Section - Always show */}
            <View style={styles.section}>
              <View style={[styles.reviewCard, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.reviewHeader}>
                  <Ionicons name="star" size={32} color={colors.primary} />
                  <View style={styles.reviewHeaderText}>
                    <Text style={[styles.reviewTitle, { color: colors.text }]}>
                      {t('Review Technician')}
                    </Text>
                    <Text style={[styles.reviewSubtitle, { color: colors.textSecondary }]}>
                      {technicianName 
                        ? t('Share your experience with {{name}}', { name: technicianName })
                        : t('Share your experience with the technician')
                      }
                    </Text>
                  </View>
                </View>
                
                {isReviewLoading ? (
                  <View style={styles.reviewLoading}> 
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : reviewStatus.hasReview && reviewStatus.review ? (
                  <View style={styles.existingReviewContainer}>
                    <View style={styles.existingReviewHeader}>
                      <Text style={[styles.existingReviewTitle, { color: colors.text }]}>
                        {t('Your Review')}
                      </Text>
                      {renderRatingStars(reviewStatus.review.rating || 0)}
                    </View>
                    {reviewStatus.review.comment ? (
                      <Text style={[styles.existingReviewComment, { color: colors.textSecondary }]}> 
                        {reviewStatus.review.comment}
                      </Text>
                    ) : null}
                    {(reviewStatus.review.updatedAt || reviewStatus.review.createdAt) && (
                      <Text style={[styles.existingReviewDate, { color: colors.textSecondary }]}> 
                        {formatDate(reviewStatus.review.updatedAt || reviewStatus.review.createdAt)}
                      </Text>
                    )}
                    <View style={styles.reviewActions}> 
                      <TouchableOpacity
                        style={[styles.reviewActionButton, { borderColor: colors.primary }]}
                        onPress={handleEditReview}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.primary} />
                        <Text style={[styles.reviewActionText, { color: colors.primary }]}> 
                          {t('Edit Review')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reviewActionButton, { borderColor: colors.error || '#EF4444' }]}
                        onPress={handleDeleteReview}
                        disabled={isDeletingReview}
                      >
                        {isDeletingReview ? (
                          <ActivityIndicator size="small" color={colors.error || '#EF4444'} />
                        ) : (
                          <Ionicons name="trash-outline" size={18} color={colors.error || '#EF4444'} />
                        )}
                        <Text style={[styles.reviewActionText, { color: colors.error || '#EF4444' }]}> 
                          {t('Delete Review')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.reviewButton,
                        { backgroundColor: technicianId ? colors.primary : colors.border },
                        !technicianId && styles.reviewButtonDisabled,
                      ]}
                      onPress={handleReviewTechnician}
                      disabled={!technicianId}
                    >
                      <Ionicons name="star-outline" size={20} color={technicianId ? '#fff' : colors.textSecondary} />
                      <Text
                        style={[
                          styles.reviewButtonText,
                          !technicianId && { color: colors.textSecondary },
                        ]}
                      >
                        {t('Write a Review')}
                      </Text>
                    </TouchableOpacity>

                    {!technicianId && (
                      <Text style={[styles.reviewWarning, { color: colors.textSecondary }]}> 
                        {t('Technician information not available')}
                      </Text>
                    )}
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Review Modal */}
      {technicianId && resolvedProjectId && (
        <ReviewTechnicianModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          projectId={resolvedProjectId}
          technicianId={technicianId}
          technicianName={technicianName}
          onReviewSubmitted={handleReviewSubmitted}
          mode={reviewModalMode}
          existingReview={reviewStatus.review ? {
            id: reviewStatus.review.id ?? reviewStatus.review.reviewId,
            rating: reviewStatus.review.rating,
            comment: reviewStatus.review.comment,
          } : null}
        />
      )}
      
      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      
      {/* Confirmation Popup */}
      <ConfirmationPopup
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmStyle={confirmState.confirmStyle}
        icon={confirmState.icon}
        onConfirm={confirmState.onConfirm}
        onCancel={hideConfirmation}
      />
    </>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  projectInfo: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  projectHeader: {
    marginBottom: 12,
  },
  projectHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  projectTitleContainer: {
    flex: 1,
    gap: 8,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  projectDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  projectDetailText: {
    fontSize: 14,
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  phaseCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  phaseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  phaseNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseNumberText: {
    fontSize: 16,
    fontWeight: '700',
  },
  phaseInfo: {
    flex: 1,
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  phaseAmount: {
    alignItems: 'flex-end',
  },
  phaseAmountText: {
    fontSize: 18,
    fontWeight: '700',
  },
  phaseDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  phaseDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  phaseDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phaseDetailText: {
    fontSize: 14,
  },
  reviewCard: {
    padding: 20,
    borderRadius: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  reviewHeaderText: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  reviewSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewButtonDisabled: {
    opacity: 0.5,
  },
  reviewWarning: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  reviewLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  existingReviewContainer: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 12,
  },
  existingReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  existingReviewTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  existingReviewComment: {
    fontSize: 14,
    lineHeight: 20,
  },
  existingReviewDate: {
    fontSize: 12,
    textAlign: 'right',
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  reviewActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  reviewActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    padding: 20,
    margin: 16,
    borderRadius: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});

