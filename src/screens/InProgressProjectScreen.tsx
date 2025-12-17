import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import { showError, showSuccess } from '../utils/alert';
import ProjectCreationFlow from '../components/ProjectCreationFlow';

// ===== DESIGN TOKENS (matching Figma design) =====
const COLORS = {
  // Primary Blues
  primary100: '#003867',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary10: '#E6EFF7',
  // Greens
  green80: '#008B3E',
  green70: '#009C47',
  green60: '#00AC4F',
  green10: '#E6F5EC',
  // Amber
  amber60: '#FFB703',
  amber50: '#FFD683',
  amber10: '#FFF2CF',
  // Text
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  textWhite: '#FFFFFF',
  // Backgrounds
  bgWhite: '#FFFFFF',
  bgGray: '#F0F0F0',
};

interface InProgressProjectScreenProps {
  project: any;
  onBack: () => void;
  onSuccess?: () => void;
  isTechnician?: boolean;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => void;
  onViewTechnician?: (technicianId: number) => void;
  onBookAppointment?: (technicianId: number, technicianName: string, projectId?: number) => void;
}

interface Phase {
  id: number;
  projectId: number;
  phaseNumber: number;
  description: string;
  timeSpentDays: number;
  moneySpent: number;
  paymentStatus: string;
  paidAt?: string;
  approved: boolean;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

type PhaseStatus = 'paid' | 'ready_for_payment' | 'awaiting_approval' | 'locked';

export default function InProgressProjectScreen({
  project,
  onBack,
  onSuccess,
  isTechnician = false,
  onOpenChat,
  onViewTechnician,
  onBookAppointment,
}: InProgressProjectScreenProps) {
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
  const [payingPhaseId, setPayingPhaseId] = useState<number | null>(null);
  const [completingPhaseId, setCompletingPhaseId] = useState<number | null>(null);
  const [completingProject, setCompletingProject] = useState(false);

  // Custom confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmOnConfirm, setConfirmOnConfirm] = useState<(() => void) | null>(null);
  const [confirmButtonText, setConfirmButtonText] = useState('');

  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [InProgressProjectScreen] ==========================================');
    console.log('🔵 [InProgressProjectScreen] ✅ SCREEN OPENED');
    console.log('🔵 [InProgressProjectScreen] ==========================================');
    console.log('🔵 [InProgressProjectScreen] Project ID:', project?.id);
    console.log('🔵 [InProgressProjectScreen] Project Status:', project?.status?.toUpperCase());
    console.log('🔵 [InProgressProjectScreen] Is Technician:', isTechnician);
    console.log('🔵 [InProgressProjectScreen] Mode:', isTechnician ? 'TECHNICIAN VIEW' : 'USER VIEW');
    console.log('═══════════════════════════════════════════════════════════');
    loadPhases();
  }, [project]);

  const loadPhases = async () => {
    if (!project?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'));
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, {
        projectId: project.id,
      });

      console.log('🔵 [InProgressProjectScreen] Fetching phases from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔵 [InProgressProjectScreen] Loaded phases:', data.length);
        setPhases(data);
      } else {
        showError(t('Failed to load phases'));
      }
    } catch (error: any) {
      console.error('❌ [InProgressProjectScreen] Error loading phases:', error);
      showError(error.message || t('Failed to load phases'));
    } finally {
      setIsLoading(false);
    }
  };

  // ===== PAYMENT FUNCTIONS =====
  const handlePayPhase = (phase: Phase) => {
    console.log('🔘 [InProgressProjectScreen] Pay button clicked for phase:', phase.id);

    setConfirmTitle(t('Pay for Phase'));
    setConfirmMessage(
      t('Pay {{amount}} SAR for "{{description}}"?', {
        amount: formatBudget(phase.moneySpent),
        description: phase.description,
      })
    );
    setConfirmButtonText(t('Pay Now'));
    setConfirmOnConfirm(() => () => {
      payForPhase(phase.id);
    });
    setShowConfirmModal(true);
  };

  const payForPhase = async (phaseId: number) => {
    setShowConfirmModal(false);
    setPayingPhaseId(phaseId);

    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'));
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.PAY, {
        phaseId,
      });

      console.log('═══════════════════════════════════════════════════════════');
      console.log('🟢 [InProgressProjectScreen] Pay for Phase');
      console.log('🟢 [InProgressProjectScreen] Endpoint: POST /phases/{phaseId}/pay');
      console.log('🟢 [InProgressProjectScreen] Phase ID:', phaseId);
      console.log('🟢 [InProgressProjectScreen] URL:', url);
      console.log('═══════════════════════════════════════════════════════════');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 [InProgressProjectScreen] Pay Response Status:', response.status);

      if (response.ok || response.status === 201) {
        console.log('✅ [InProgressProjectScreen] Payment successful!');
        showSuccess(t('Payment processed successfully'));
        setTimeout(() => {
          loadPhases();
          onSuccess?.();
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('❌ [InProgressProjectScreen] Failed to pay:', errorText);
        showError(t('Failed to process payment'));
      }
    } catch (error: any) {
      console.error('❌ [InProgressProjectScreen] Error paying for phase:', error);
      showError(error.message || t('Failed to process payment'));
    } finally {
      setPayingPhaseId(null);
    }
  };

  // ===== COMPLETE PHASE FUNCTIONS (TECHNICIAN) =====
  const handleCompletePhase = (phase: Phase) => {
    console.log('🔘 [InProgressProjectScreen] Complete phase button clicked:', phase.id);

    setConfirmTitle(t('Complete Phase'));
    setConfirmMessage(
      t('Are you sure you want to mark "{{description}}" as completed?', {
        description: phase.description,
      })
    );
    setConfirmButtonText(t('Complete'));
    setConfirmOnConfirm(() => () => {
      completePhase(phase.id);
    });
    setShowConfirmModal(true);
  };

  const completePhase = async (phaseId: number) => {
    setShowConfirmModal(false);
    setCompletingPhaseId(phaseId);

    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'));
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.COMPLETE, {
        phaseId,
      });

      console.log('═══════════════════════════════════════════════════════════');
      console.log('🟢 [InProgressProjectScreen] Complete Phase');
      console.log('🟢 [InProgressProjectScreen] Endpoint: POST /phases/{phaseId}/complete');
      console.log('🟢 [InProgressProjectScreen] Phase ID:', phaseId);
      console.log('🟢 [InProgressProjectScreen] URL:', url);
      console.log('═══════════════════════════════════════════════════════════');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 [InProgressProjectScreen] Complete Response Status:', response.status);

      if (response.ok || response.status === 201) {
        console.log('✅ [InProgressProjectScreen] Phase completed successfully!');
        showSuccess(t('Phase marked as complete'));
        setTimeout(() => {
          loadPhases();
          onSuccess?.();
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('❌ [InProgressProjectScreen] Failed to complete phase:', errorText);
        showError(t('Failed to complete phase'));
      }
    } catch (error: any) {
      console.error('❌ [InProgressProjectScreen] Error completing phase:', error);
      showError(error.message || t('Failed to complete phase'));
    } finally {
      setCompletingPhaseId(null);
    }
  };

  // ===== COMPLETE PROJECT FUNCTIONS (TECHNICIAN) =====
  const handleCompleteProject = () => {
    console.log('🔘 [InProgressProjectScreen] Complete project button clicked');

    setConfirmTitle(t('Complete Project'));
    setConfirmMessage(
      t('Are you sure you want to mark this project as completed? This action cannot be undone.')
    );
    setConfirmButtonText(t('Complete Project'));
    setConfirmOnConfirm(() => () => {
      completeProject();
    });
    setShowConfirmModal(true);
  };

  const completeProject = async () => {
    setShowConfirmModal(false);
    setCompletingProject(true);

    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'));
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.PROJECTS.COMPLETE, {
        id: project.id,
      });

      console.log('═══════════════════════════════════════════════════════════');
      console.log('🟢 [InProgressProjectScreen] Complete Project');
      console.log('🟢 [InProgressProjectScreen] Endpoint: POST /projects/{projectId}/complete');
      console.log('🟢 [InProgressProjectScreen] Project ID:', project.id);
      console.log('🟢 [InProgressProjectScreen] URL:', url);
      console.log('═══════════════════════════════════════════════════════════');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 [InProgressProjectScreen] Complete Project Response Status:', response.status);

      if (response.ok || response.status === 201) {
        console.log('✅ [InProgressProjectScreen] Project completed successfully!');
        showSuccess(t('Project completed successfully'));
        setTimeout(() => {
          onSuccess?.();
          onBack();
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || t('Failed to complete project');
        console.error('❌ [InProgressProjectScreen] Failed to complete project:', errorMessage);
        showError(errorMessage);
      }
    } catch (error: any) {
      console.error('❌ [InProgressProjectScreen] Error completing project:', error);
      showError(error.message || t('Failed to complete project'));
    } finally {
      setCompletingProject(false);
    }
  };

  // ===== HELPER FUNCTIONS =====
  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPhaseStatus = (phase: Phase, index: number): PhaseStatus => {
    const isPaid = phase.paymentStatus === 'PAID' || phase.paymentStatus === 'paid';
    
    if (isPaid) {
      return 'paid';
    }

    // Find the previous phase
    const previousPhase = index > 0 ? phases[index - 1] : null;
    const isPreviousPaid = previousPhase
      ? previousPhase.paymentStatus === 'PAID' || previousPhase.paymentStatus === 'paid'
      : true; // First phase is always unlocked

    if (!isPreviousPaid) {
      return 'locked';
    }

    // According to API: Phase must be approved before payment can be made
    // If phase is approved, it's ready for payment
    if (phase.approved) {
      return 'ready_for_payment';
    }

    // Otherwise, awaiting approval (phase not yet approved)
    return 'awaiting_approval';
  };

  const getPhaseStatusConfig = (status: PhaseStatus) => {
    switch (status) {
      case 'paid':
        return {
          bgColor: COLORS.green10,
          borderColor: COLORS.green60,
          iconBgColor: COLORS.green60,
          icon: 'checkmark-circle' as const,
          iconColor: COLORS.textWhite,
          textColor: COLORS.green60,
          amountColor: COLORS.green80,
        };
      case 'ready_for_payment':
        return {
          bgColor: COLORS.amber10,
          borderColor: COLORS.amber60,
          iconBgColor: COLORS.amber60,
          icon: 'card-outline' as const,
          iconColor: COLORS.textWhite,
          textColor: COLORS.amber60,
          amountColor: COLORS.textBody,
        };
      case 'awaiting_approval':
        return {
          bgColor: COLORS.primary10,
          borderColor: COLORS.primary60,
          iconBgColor: COLORS.primary60,
          icon: 'time-outline' as const,
          iconColor: COLORS.textWhite,
          textColor: COLORS.primary60,
          amountColor: COLORS.textBody,
        };
      case 'locked':
      default:
        return {
          bgColor: COLORS.bgWhite,
          borderColor: COLORS.textDividers,
          iconBgColor: COLORS.bgGray,
          icon: 'lock-closed' as const,
          iconColor: '#4A4A4A',
          textColor: COLORS.textSecondary,
          amountColor: COLORS.textBody,
        };
    }
  };

  const getServiceName = () => {
    if (i18n.language === 'ar') {
      return project?.serviceNameAr || project?.serviceName || t('Contracting Services');
    }
    return project?.serviceNameEn || project?.serviceName || t('Contracting Services');
  };

  // ===== CALCULATIONS =====
  const totalAmount = phases.reduce((sum, p) => sum + p.moneySpent, 0);
  const paidAmount = phases
    .filter(p => p.paymentStatus === 'PAID' || p.paymentStatus === 'paid')
    .reduce((sum, p) => sum + p.moneySpent, 0);
  const remainingAmount = totalAmount - paidAmount;
  const progressPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  // Check if all phases are completed and paid (for technician to complete project)
  const allPhasesPaid = phases.length > 0 && phases.every(
    p => p.paymentStatus === 'PAID' || p.paymentStatus === 'paid'
  );
  const allPhasesCompleted = phases.length > 0 && phases.every(p => p.completed);
  const canCompleteProject = allPhasesPaid && allPhasesCompleted;
  const completedPhasesCount = phases.filter(p => p.completed).length;
  const paidPhasesCount = phases.filter(
    p => p.paymentStatus === 'PAID' || p.paymentStatus === 'paid'
  ).length;

  // ===== RENDER FUNCTIONS =====
  const renderPhaseCard = (phase: Phase, index: number) => {
    const status = getPhaseStatus(phase, index);
    const config = getPhaseStatusConfig(status);
    const isPaying = payingPhaseId === phase.id;
    const isCompleting = completingPhaseId === phase.id;

    return (
      <View
        key={phase.id}
        style={[
          styles.phaseCard,
          {
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
          },
        ]}
      >
        {/* Phase Header */}
        <View style={styles.phaseHeader}>
          <View style={styles.phaseHeaderLeft}>
            <View style={[styles.phaseIconContainer, { backgroundColor: config.iconBgColor }]}>
              <Ionicons name={config.icon} size={12} color={config.iconColor} />
            </View>
            <Text style={[styles.phaseName, { color: COLORS.textBody }]}>
              {phase.description}
            </Text>
          </View>
          <Text style={[styles.phaseAmount, { color: config.amountColor }]}>
            {formatBudget(phase.moneySpent)} {t('SAR')}
          </Text>
        </View>

        {/* Status Text */}
        {status === 'paid' && phase.paidAt && (
          <Text style={[styles.phaseStatusText, { color: config.textColor }]}>
            {t('Paid on {{date}}', { date: formatDate(phase.paidAt) })}
          </Text>
        )}
        {status === 'ready_for_payment' && !isTechnician && (
          <Text style={[styles.phaseStatusText, { color: config.textColor }]}>
            {t('Ready for payment')}
          </Text>
        )}
        {status === 'ready_for_payment' && isTechnician && (
          <Text style={[styles.phaseStatusText, { color: config.textColor }]}>
            {t('Awaiting payment from User')}
          </Text>
        )}
        {status === 'awaiting_approval' && !isTechnician && (
          <Text style={[styles.phaseStatusText, { color: config.textColor }]}>
            {t('Awaiting phase approval')}
          </Text>
        )}
        {status === 'awaiting_approval' && isTechnician && (
          <Text style={[styles.phaseStatusText, { color: config.textColor }]}>
            {t('Phase pending approval')}
          </Text>
        )}

        {/* Divider */}
        <View style={styles.phaseDivider} />

        {/* Status Row / Action */}
        {status === 'paid' && (
          <View style={styles.phaseStatusRow}>
            <View style={styles.phaseStatusIndicator}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.green70} />
              <Text style={[styles.phaseStatusLabel, { color: COLORS.green70 }]}>
                {t('Payment Completed')}
              </Text>
            </View>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={20}
              color={COLORS.textSecondary}
            />
          </View>
        )}

        {/* USER: Pay Button */}
        {!isTechnician && status === 'ready_for_payment' && (
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => handlePayPhase(phase)}
            disabled={isPaying}
          >
            {isPaying ? (
              <ActivityIndicator size="small" color={COLORS.textWhite} />
            ) : (
              <>
                <Ionicons name="card-outline" size={20} color={COLORS.textWhite} />
                <Text style={styles.payButtonText}>
                  {t('Pay now')} - {formatBudget(phase.moneySpent)} {t('SAR')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* USER: Awaiting Approval State */}
        {!isTechnician && status === 'awaiting_approval' && (
          <View style={styles.awaitingButton}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary60} />
            <Text style={styles.awaitingButtonText}>
              {t('Awaiting Approval')}
            </Text>
          </View>
        )}

        {/* Locked State */}
        {status === 'locked' && (
          <View style={styles.lockedButton}>
            <Text style={styles.lockedButtonText}>
              {t('Awaiting Previous Phase')}
            </Text>
          </View>
        )}

        {/* TECHNICIAN: Complete Phase Button */}
        {isTechnician && status === 'paid' && !phase.completed && (
          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: COLORS.green70 }]}
            onPress={() => handleCompletePhase(phase)}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <ActivityIndicator size="small" color={COLORS.textWhite} />
            ) : (
              <Text style={styles.completeButtonText}>
                {t('Complete Phase')}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* TECHNICIAN: Awaiting Payment - Disabled Complete */}
        {isTechnician && status === 'ready_for_payment' && (
          <View style={[styles.completeButton, { backgroundColor: COLORS.amber50 }]}>
            <Text style={styles.completeButtonText}>
              {t('Awaiting Payment')}
            </Text>
          </View>
        )}

        {/* TECHNICIAN: Awaiting Approval - Show status */}
        {isTechnician && status === 'awaiting_approval' && (
          <View style={[styles.completeButton, { backgroundColor: COLORS.primary60 }]}>
            <Text style={styles.completeButtonText}>
              {t('Phase Pending Approval')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bgWhite, paddingTop: IS_LARGE_WEB ? 0 : insets.top }]}>
      {/* Title Section - Hidden on large web */}
      {!IS_LARGE_WEB && (
        <View style={styles.titleSection}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons
              name={isRTL ? 'chevron-forward' : 'chevron-back'}
              size={24}
              color={COLORS.textBody}
            />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={[styles.titleText, { fontSize: scaledSize(20) }]}>
              {getServiceName()}
            </Text>
            <Text style={[styles.subtitleText, { fontSize: scaledSize(14) }]}>
              {t('In Progress')}
            </Text>
        </View>
      </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          IS_LARGE_WEB && styles.contentContainerLargeWeb,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section - Large Web */}
        {IS_LARGE_WEB && (
          <View style={styles.titleSectionLargeWeb}>
            <TouchableOpacity onPress={onBack} style={styles.titleBackButton}>
            <Ionicons
              name={isRTL ? 'chevron-forward' : 'chevron-back'}
              size={24}
                color={COLORS.textHeader}
            />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
              <Text style={[styles.titleMainText, isRTL && { textAlign: 'right' }, { fontSize: scaledSize(42) }]}>
                {getServiceName()}
              </Text>
              <Text style={[styles.titleSubtext, isRTL && { textAlign: 'right' }, { fontSize: scaledSize(20) }]}>
                {t('In Progress')}
              </Text>
          </View>
        </View>
        )}

        {/* Status Flow */}
        <View style={[styles.flowContainer, IS_LARGE_WEB && styles.flowContainerLargeWeb]}>
          <ProjectCreationFlow currentStep="IN_PROGRESS" />
        </View>

        <View style={[styles.divider, IS_LARGE_WEB && styles.dividerLargeWeb]} />
        
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { fontSize: scaledSize(20) }]}>{t('Payment & Progress')}</Text>
          <Text style={[styles.sectionSubtitle, { fontSize: scaledSize(14) }]}>
            {t('Track phase completion and make payments for each milestone.')}
          </Text>
        </View>

        {/* Payment Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t('Payment Summary')}</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('Total Paid')}</Text>
              <Text style={styles.summaryValue}>
                {formatBudget(paidAmount)} {t('SAR')}
              </Text>
            </View>
            <View style={[styles.summaryItem, { alignItems: 'flex-end' }]}>
              <Text style={styles.summaryLabel}>{t('Remaining')}</Text>
              <Text style={styles.summaryValue}>
                {formatBudget(remainingAmount)} {t('SAR')}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(progressPercentage, 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary60} />
            <Text style={[styles.loadingText, { fontSize: scaledSize(14) }]}>{t('Loading phases...')}</Text>
          </View>
        ) : phases.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-outline" size={64} color={COLORS.textDividers} />
            <Text style={styles.emptyText}>{t('No phases available yet')}</Text>
          </View>
        ) : (
          /* Phase Cards */
          <View style={styles.phasesContainer}>
            {phases.map((phase, index) => renderPhaseCard(phase, index))}
          </View>
        )}

        {/* User: Waiting for Technician Section */}
        {!isTechnician && allPhasesPaid && phases.length > 0 && (
          <View style={styles.waitingSection}>
            <View style={styles.waitingHeader}>
              <Ionicons 
                name={allPhasesCompleted ? 'checkmark-circle' : 'time-outline'} 
                size={24} 
                color={allPhasesCompleted ? COLORS.green60 : COLORS.amber60} 
              />
              <Text style={styles.waitingSectionTitle}>
                {allPhasesCompleted 
                  ? t('Project Completed!') 
                  : t('All Payments Complete')}
              </Text>
            </View>
            <Text style={styles.waitingSectionSubtitle}>
              {allPhasesCompleted
                ? t('The technician has completed all phases. The project is now finished.')
                : t('Waiting for the technician to complete the project work.')}
            </Text>
            <View style={styles.waitingProgressInfo}>
              <View style={styles.waitingProgressItem}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.green60} />
                <Text style={styles.waitingProgressText}>
                  {t('All phases paid')}
                </Text>
              </View>
              {allPhasesCompleted && (
                <View style={styles.waitingProgressItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.green60} />
                  <Text style={styles.waitingProgressText}>
                    {t('All phases completed')}
                  </Text>
                </View>
              )}
              {!allPhasesCompleted && (
                <View style={styles.waitingProgressItem}>
                  <Ionicons name="time-outline" size={18} color={COLORS.amber60} />
                  <Text style={styles.waitingProgressText}>
                    {t('{{completed}}/{{total}} phases completed by technician', {
                      completed: completedPhasesCount,
                      total: phases.length,
                    })}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Technician: Complete Project Section */}
        {isTechnician && phases.length > 0 && (
          <View style={styles.completeProjectSection}>
            <View style={styles.completeProjectInfo}>
              <View style={styles.completeProjectHeader}>
                <Ionicons 
                  name={canCompleteProject ? 'checkmark-circle' : 'information-circle-outline'} 
                  size={24} 
                  color={canCompleteProject ? COLORS.green60 : COLORS.primary60} 
                />
                <Text style={styles.completeProjectTitle}>
                  {canCompleteProject ? t('Ready to Complete') : t('Project Completion')}
                </Text>
              </View>
              <Text style={styles.completeProjectSubtitle}>
                {canCompleteProject
                  ? t('All phases are paid and completed. You can now finalize the project.')
                  : t('{{completed}}/{{total}} phases completed, {{paid}}/{{total}} paid', {
                      completed: completedPhasesCount,
                      paid: paidPhasesCount,
                      total: phases.length,
                    })}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.completeProjectButton,
                !canCompleteProject && styles.completeProjectButtonDisabled,
              ]}
              onPress={handleCompleteProject}
              disabled={!canCompleteProject || completingProject}
            >
              {completingProject ? (
                <ActivityIndicator size="small" color={COLORS.textWhite} />
              ) : (
                <>
                  <Ionicons 
                    name="flag" 
                    size={20} 
                    color={canCompleteProject ? COLORS.textWhite : COLORS.textSecondary} 
                  />
                  <Text 
                    style={[
                      styles.completeProjectButtonText,
                      !canCompleteProject && styles.completeProjectButtonTextDisabled,
                    ]}
                  >
                    {t('Complete Project')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{confirmTitle}</Text>
            <Text style={styles.modalMessage}>{confirmMessage}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={() => {
                  if (confirmOnConfirm) {
                    confirmOnConfirm();
                  }
                }}
              >
                <Text style={styles.modalConfirmButtonText}>{confirmButtonText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    backgroundColor: COLORS.primary70,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  headerLargeWeb: {
    paddingHorizontal: 48,
    paddingBottom: 32,
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTextContainer: {
    alignItems: 'center',
  },
  logoTextEn: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary10,
  },
  logoTextAr: {
    fontSize: 16,
    color: COLORS.primary10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconButton: {
    padding: 4,
  },
  // Title Section
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  titleSectionLargeWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 48,
    paddingTop: 24,
    paddingBottom: 0,
  },
  backButton: {
    padding: 4,
  },
  backButtonLargeWeb: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    gap: 8,
  },
  titleContainerLargeWeb: {
    gap: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textHeader,
  },
  titleTextLargeWeb: {
    fontSize: 34,
    fontWeight: '400',
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '300',
    color: COLORS.textSecondary,
  },
  subtitleTextLargeWeb: {
    fontSize: 16,
  },
  // Flow
  flowContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  flowContainerLargeWeb: {
    paddingHorizontal: 48,
    paddingTop: 8,
    paddingBottom: 16,
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.textDividers,
    marginHorizontal: 0,
  },
  dividerLargeWeb: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 24,
  },
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  contentContainerLargeWeb: {
    paddingHorizontal: 48,
    paddingTop: 16,
    width: '100%',
  },
  // Section Header
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: COLORS.textHeader,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: COLORS.textBody,
    lineHeight: 20,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.primary60,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.primary10,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '300',
    color: COLORS.primary10,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(230, 239, 247, 0.5)',
    borderRadius: 64,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.textWhite,
    borderRadius: 64,
  },
  // Loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  // Phases Container
  phasesContainer: {
    gap: 16,
  },
  // Phase Card
  phaseCard: {
    borderRadius: 8,
    borderWidth: 0.5,
    padding: 16,
    gap: 16,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  phaseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  phaseIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseName: {
    fontSize: 16,
    fontWeight: '400',
    flex: 1,
  },
  phaseAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  phaseStatusText: {
    fontSize: 14,
    fontWeight: '400',
  },
  phaseDivider: {
    height: 1,
    backgroundColor: COLORS.textDividers,
    opacity: 0.3,
  },
  phaseStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phaseStatusLabel: {
    fontSize: 14,
    fontWeight: '400',
  },
  // Pay Button
  payButton: {
    backgroundColor: COLORS.amber60,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textWhite,
  },
  // Locked Button
  lockedButton: {
    backgroundColor: COLORS.bgWhite,
    borderColor: COLORS.textSecondary,
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  // Awaiting Button
  awaitingButton: {
    backgroundColor: COLORS.primary10,
    borderColor: COLORS.primary60,
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  awaitingButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary60,
  },
  // Complete Button (Technician)
  completeButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textWhite,
  },
  // Waiting Section (User)
  waitingSection: {
    marginTop: 24,
    backgroundColor: COLORS.amber10,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.amber60,
    gap: 16,
  },
  waitingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waitingSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textHeader,
  },
  waitingSectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textBody,
    lineHeight: 20,
  },
  waitingProgressInfo: {
    gap: 10,
    marginTop: 8,
  },
  waitingProgressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waitingProgressText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textBody,
  },
  // Complete Project Section (Technician)
  completeProjectSection: {
    marginTop: 24,
    backgroundColor: COLORS.primary10,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.primary60,
    gap: 16,
  },
  completeProjectInfo: {
    gap: 8,
  },
  completeProjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completeProjectTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textHeader,
  },
  completeProjectSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textBody,
    lineHeight: 20,
  },
  completeProjectButton: {
    backgroundColor: COLORS.green60,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  completeProjectButtonDisabled: {
    backgroundColor: COLORS.bgGray,
  },
  completeProjectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  completeProjectButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.bgWhite,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
      } as any,
      default: {
        elevation: 5,
      },
    }),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textHeader,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textBody,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: COLORS.primary10,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  modalConfirmButton: {
    backgroundColor: COLORS.primary60,
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  // Title Section - Large Web (Figma Design) - Updated styles
  titleMainText: {
    fontSize: 42,
    fontWeight: '700',
    color: COLORS.textHeader,
    lineHeight: 42,
  },
  titleSubtext: {
    fontSize: 20,
    fontWeight: '300',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  titleBackButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

