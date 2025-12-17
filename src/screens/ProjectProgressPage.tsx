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
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrlWithParams, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { completeProjectByTechnician } from '../services/ProjectService';
import { showAlert, showError } from '../utils/alert';

interface ProjectProgressPageProps {
  project: any;
  onBack: () => void;
  onRequestVisit?: (userId: number, userName: string, projectId?: number) => void;
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

export default function ProjectProgressPage({
  project,
  onBack,
  onRequestVisit,
  onSuccess,
}: ProjectProgressPageProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completingPhaseId, setCompletingPhaseId] = useState<number | null>(null);
  const [isCompletingProject, setIsCompletingProject] = useState(false);
  
  // Custom confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmOnConfirm, setConfirmOnConfirm] = useState<(() => void) | null>(null);

  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🟣 [ProjectProgressPage] ==========================================');
    console.log('🟣 [ProjectProgressPage] ✅ PAGE OPENED');
    console.log('🟣 [ProjectProgressPage] ==========================================');
    console.log('🟣 [ProjectProgressPage] Project ID:', project.id);
    console.log('🟣 [ProjectProgressPage] Project Status:', project.status?.toUpperCase());
    console.log('🟣 [ProjectProgressPage] Status: IN_PROGRESS');
    console.log('🟣 [ProjectProgressPage] Technician can mark phases as complete');
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

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🟣 [ProjectProgressPage] Loaded phases:', data.length);
        setPhases(data);
      } else {
        showError(t('Failed to load phases'));
      }
    } catch (error: any) {
      console.error('❌ [ProjectProgressPage] Error loading phases:', error);
      showError(error.message || t('Failed to load phases'));
    } finally {
      setIsLoading(false);
    }
  };

  const markPhaseComplete = async (phaseId: number) => {
    // Show custom confirmation modal
    setConfirmTitle(t('Mark Phase as Complete'));
    setConfirmMessage(t('Are you sure you want to mark this phase as complete?'));
    setConfirmOnConfirm(() => async () => {
      setShowConfirmModal(false);
      await executeMarkPhaseComplete(phaseId);
    });
    setShowConfirmModal(true);
  };

  const executeMarkPhaseComplete = async (phaseId: number) => {
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
      console.log('🟣 [ProjectProgressPage] Mark Phase as Complete');
      console.log('🟣 [ProjectProgressPage] Endpoint: POST /phases/{phaseId}/complete');
      console.log('🟣 [ProjectProgressPage] Phase ID:', phaseId);
      console.log('🟣 [ProjectProgressPage] URL:', url);
      console.log('═══════════════════════════════════════════════════════════');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 [ProjectProgressPage] Complete Phase Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [ProjectProgressPage] Phase marked as complete');
        console.log('✅ [ProjectProgressPage] Response Data:', data);
        
        // Show success message
        showSuccess(t('Phase marked as complete'));
        setTimeout(() => {
          loadPhases();
          onSuccess?.();
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('❌ [ProjectProgressPage] Failed to complete phase:', errorText);
        console.error('❌ [ProjectProgressPage] Status:', response.status);
        showError(t('Failed to mark phase as complete'));
      }
    } catch (error: any) {
      console.error('❌ [ProjectProgressPage] Error completing phase:', error);
      showError(error.message || t('Failed to mark phase as complete'));
    } finally {
      setCompletingPhaseId(null);
    }
  };


  const getPaymentStatus = (phase: Phase) => {
    if (phase.paymentStatus === 'PAID' || phase.paymentStatus === 'paid') {
      return { text: t('Paid'), color: '#10B981', icon: 'checkmark-circle' };
    }
    return { text: t('Pending Payment'), color: '#F59E0B', icon: 'time-outline' };
  };

  const canCompleteProject = () => {
    if (phases.length === 0) return false;
    return phases.every(phase => 
      (phase.paymentStatus === 'PAID' || phase.paymentStatus === 'paid') && 
      phase.completed === true
    );
  };

  const completeProject = async () => {
    // Show custom confirmation modal
    setConfirmTitle(t('Complete Project'));
    setConfirmMessage(t('Are you sure you want to mark this project as completed? This action cannot be undone.'));
    setConfirmOnConfirm(() => async () => {
      setShowConfirmModal(false);
      await executeCompleteProject();
    });
    setShowConfirmModal(true);
  };

  const executeCompleteProject = async () => {
    setIsCompletingProject(true);
    try {
      console.log('🟣 [ProjectProgressPage] Calling completeProjectByTechnician service...');
      const result = await completeProjectByTechnician(project.id);
      
      console.log('✅ [ProjectProgressPage] Project marked as completed');
      console.log('✅ [ProjectProgressPage] Result:', result);
      
      // Show success message
      showSuccess(t('Project marked as completed successfully'));
      setTimeout(() => {
        onSuccess?.();
      }, 1000);
    } catch (error: any) {
      console.error('❌ [ProjectProgressPage] Error completing project:', error);
      showError(error.message || t('Failed to complete project'));
    } finally {
      setIsCompletingProject(false);
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
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

      {/* Ask for Visit Button */}
      {project.userId && (
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[styles.askVisitButton, { backgroundColor: colors.primary }]}
            onPress={async () => {
              try {
                const token = await storage.getAuthToken();
                const userId = await storage.getUserId();
                
                if (!token || !userId) {
                  showError(t('Please login again'));
                  return;
                }

                const url = buildApiUrl(API_ENDPOINTS.VISIT_REQUESTS.CREATE);
                console.log('🔍 [ProjectProgressPage] Creating visit request:', url);

                const response = await fetch(url, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    projectId: project.id,
                    technicianId: userId,
                    requestedDate: new Date().toISOString(),
                    notes: t('Visit request from technician'),
                  }),
                });

                if (response.ok) {
                  showAlert(t('Success'), t('Visit request sent successfully'));
                  onSuccess?.();
                } else {
                  const errorText = await response.text();
                  console.error('❌ [ProjectProgressPage] Failed to create visit request:', errorText);
                  showError(t('Failed to send visit request'));
                }
              } catch (error: any) {
                console.error('❌ [ProjectProgressPage] Error creating visit request:', error);
                showError(error.message || t('Failed to send visit request'));
              }
            }}
          >
            <Ionicons name="home" size={20} color="#fff" />
            <Text style={styles.askVisitButtonText}>
              {t('Ask for Visit')}
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
              {t('Mark phases as complete when work is finished. Complete the project when all phases are paid and completed.')}
            </Text>
          </View>

          {phases.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-outline" size={80} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('No phases found')}
              </Text>
            </View>
          ) : (
            phases.map((phase) => {
              const paymentStatus = getPaymentStatus(phase);
              const isPaid = phase.paymentStatus === 'PAID' || phase.paymentStatus === 'paid';
              
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
                        <View style={styles.statusBadges}>
                          {/* Payment Status Badge */}
                          <View style={[styles.statusBadge, { backgroundColor: paymentStatus.color + '20' }]}>
                            <Ionicons name={paymentStatus.icon as any} size={14} color={paymentStatus.color} />
                            <Text style={[styles.statusBadgeText, { color: paymentStatus.color }]}>
                              {paymentStatus.text}
                            </Text>
                          </View>
                          {/* Completion Status Badge */}
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

                  {/* Complete Button - Only show if phase is approved but not completed */}
                  {phase.approved && !phase.completed && (
                    <TouchableOpacity
                      style={[styles.completeButton, { backgroundColor: colors.primary }]}
                      onPress={() => markPhaseComplete(phase.id)}
                      disabled={completingPhaseId === phase.id}
                    >
                      {completingPhaseId === phase.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                          <Text style={styles.completeButtonText}>
                            {t('Mark as Complete')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}

          {/* Complete Project Button - Only show if all phases are paid and completed */}
          {phases.length > 0 && canCompleteProject() && (
            <View style={styles.completeProjectContainer}>
              <TouchableOpacity
                style={[styles.completeProjectButton, { backgroundColor: '#10B981' }]}
                onPress={completeProject}
                disabled={isCompletingProject}
              >
                {isCompletingProject ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-circle" size={24} color="#fff" />
                    <Text style={styles.completeProjectButtonText}>
                      {t('Complete Project')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
                  console.log('❌ [ProjectProgressPage] User cancelled via custom modal');
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
                  {confirmTitle.includes('Success') ? t('OK') : (confirmTitle.includes('Complete Project') ? t('Complete') : t('Complete'))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  phaseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
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
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  statusBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
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
  completeProjectContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  completeProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  completeProjectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  actionButtonContainer: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  askVisitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  askVisitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

