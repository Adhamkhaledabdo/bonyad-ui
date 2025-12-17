import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrlWithParams, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { Platform } from 'react-native';
import { showAlert, showError, showSuccess } from '../utils/alert';

interface UserProjectProgressPageProps {
  project: any;
  onBack: () => void;
  onBookAppointment?: (technicianId: number, technicianName: string, projectId?: number) => void;
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

export default function UserProjectProgressPage({
  project,
  onBack,
  onBookAppointment,
  onSuccess,
}: UserProjectProgressPageProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payingPhaseId, setPayingPhaseId] = useState<number | null>(null);
  
  // Custom confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmOnConfirm, setConfirmOnConfirm] = useState<(() => void) | null>(null);
  const [selectedPhaseForPayment, setSelectedPhaseForPayment] = useState<Phase | null>(null);

  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [UserProjectProgressPage] ==========================================');
    console.log('🔵 [UserProjectProgressPage] ✅ PAGE OPENED');
    console.log('🔵 [UserProjectProgressPage] ==========================================');
    console.log('🔵 [UserProjectProgressPage] Project ID:', project.id);
    console.log('🔵 [UserProjectProgressPage] Project Status:', project.status?.toUpperCase());
    console.log('🔵 [UserProjectProgressPage] Status: IN_PROGRESS');
    console.log('🔵 [UserProjectProgressPage] User can pay for each phase');
    console.log('═══════════════════════════════════════════════════════════');
    loadPhases();
  }, [project]);

  const loadPhases = async () => {
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

      console.log('🔵 [UserProjectProgressPage] Fetching phases from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔵 [UserProjectProgressPage] Loaded phases:', data.length);
        setPhases(data);
      } else {
        showError(t('Failed to load phases'));
      }
    } catch (error: any) {
      console.error('❌ [UserProjectProgressPage] Error loading phases:', error);
      showError(error.message || t('Failed to load phases'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayPhase = (phase: Phase) => {
    console.log('🔘 [UserProjectProgressPage] Pay button clicked for phase:', phase.id);
    setSelectedPhaseForPayment(phase);
    
    // Show confirmation modal
    setConfirmTitle(t('Pay for Phase'));
    setConfirmMessage(
      t('Pay {{amount}} SAR for Phase {{number}}?', {
        amount: formatBudget(phase.moneySpent),
        number: phase.phaseNumber,
      })
    );
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
      console.log('🟢 [UserProjectProgressPage] Pay for Phase');
      console.log('🟢 [UserProjectProgressPage] Endpoint: POST /phases/{phaseId}/pay');
      console.log('🟢 [UserProjectProgressPage] Phase ID:', phaseId);
      console.log('🟢 [UserProjectProgressPage] URL:', url);
      console.log('═══════════════════════════════════════════════════════════');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 [UserProjectProgressPage] Pay Response Status:', response.status);

      if (response.ok || response.status === 201) {
        const data = await response.json();
        console.log('✅ [UserProjectProgressPage] Payment successful!');
        console.log('✅ [UserProjectProgressPage] Response Data:', data);
        
        // Show success message
        showSuccess(t('Payment processed successfully for Phase {{number}}', {
          number: selectedPhaseForPayment?.phaseNumber || '',
        }));
        setTimeout(() => {
          loadPhases(); // Reload phases to update payment status
          onSuccess?.();
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('❌ [UserProjectProgressPage] Failed to pay:', errorText);
        console.error('❌ [UserProjectProgressPage] Status:', response.status);
        showError(t('Failed to process payment'));
      }
    } catch (error: any) {
      console.error('❌ [UserProjectProgressPage] Error paying for phase:', error);
      showError(error.message || t('Failed to process payment'));
    } finally {
      setPayingPhaseId(null);
      setSelectedPhaseForPayment(null);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('Project Progress')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Project Info */}
      <View style={[styles.projectInfo, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.projectTitle, { color: colors.text }]}>
          {project.description || project.title}
        </Text>
        <Text style={[styles.projectStatus, { color: colors.primary }]}>
          {project.status}
        </Text>
      </View>

      {/* Book Appointment Button */}
      {project.assignedTechnicianId && onBookAppointment && (
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[styles.bookAppointmentButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              onBookAppointment(
                project.assignedTechnicianId,
                project.assignedTechnicianName || t('Technician'),
                project.id
              );
            }}
          >
            <Ionicons name="calendar" size={20} color="#fff" />
            <Text style={styles.bookAppointmentButtonText}>
              {t('Book Appointment')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('Loading phases...')}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {t('You can pay for each phase individually as work progresses.')}
            </Text>
          </View>

          {phases.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-outline" size={80} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('No phases available yet')}
              </Text>
            </View>
          ) : (
            phases.map((phase) => {
              const paymentStatus = getPaymentStatus(phase);
              const isPaid = phase.paymentStatus === 'PAID' || phase.paymentStatus === 'paid';
              const isPaying = payingPhaseId === phase.id;

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
                      <View>
                        <Text style={[styles.phaseTitle, { color: colors.text }]}>
                          {t('Phase')} {phase.phaseNumber}
                        </Text>
                        <View style={[styles.paymentStatusBadge, { backgroundColor: paymentStatus.color + '20' }]}>
                          <Ionicons name={paymentStatus.icon as any} size={14} color={paymentStatus.color} />
                          <Text style={[styles.paymentStatusText, { color: paymentStatus.color }]}>
                            {paymentStatus.text}
                          </Text>
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
                    {phase.completed && (
                      <View style={styles.phaseDetailItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={[styles.phaseDetailText, { color: '#10B981' }]}>
                          {t('Completed')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Pay Button */}
                  {!isPaid && (
                    <TouchableOpacity
                      style={[styles.payButton, { backgroundColor: colors.primary }]}
                      onPress={() => handlePayPhase(phase)}
                      disabled={isPaying}
                    >
                      {isPaying ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="card-outline" size={18} color="#fff" />
                          <Text style={styles.payButtonText}>
                            {t('Pay')} {formatBudget(phase.moneySpent)} {t('SAR')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Custom Confirmation Modal - Works on both web and mobile */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={[styles.confirmModalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.confirmModalTitle, { color: colors.text }]}>
              {confirmTitle}
            </Text>
            <Text style={[styles.confirmModalMessage, { color: colors.textSecondary }]}>
              {confirmMessage}
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalCancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  console.log('❌ [UserProjectProgressPage] User cancelled via custom modal');
                  setShowConfirmModal(false);
                }}
              >
                <Text style={[styles.confirmModalButtonText, { color: colors.text }]}>
                  {t('Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalConfirmButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (confirmOnConfirm) {
                    confirmOnConfirm();
                  }
                }}
              >
                <Text style={[styles.confirmModalButtonText, { color: '#fff' }]}>
                  {confirmTitle.includes('Success') ? t('OK') : (confirmTitle.includes('Complete Project') ? t('Complete') : t('Pay'))}
                </Text>
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
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  projectStatus: {
    fontSize: 14,
    fontWeight: '500',
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
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  phaseCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  phaseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  phaseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  paymentStatusText: {
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
    marginBottom: 12,
  },
  phaseDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phaseDetailText: {
    fontSize: 14,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    borderRadius: 16,
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
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  confirmModalMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalCancelButton: {
    borderWidth: 1,
  },
  confirmModalConfirmButton: {
    // backgroundColor set inline
  },
  confirmModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonContainer: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  bookAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  bookAppointmentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

