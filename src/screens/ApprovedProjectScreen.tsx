/**
 * ApprovedProjectScreen
 * 
 * Screen for displaying project details when status is APPROVED or PHASE_PLANNING.
 * Shows different UI based on user persona:
 * - User/Homeowner: Can view project summary, phases, and request modifications to pending phases
 * - Technician: Can view project summary, phases, and edit pending phases
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProjectCreationFlow from '../components/ProjectCreationFlow';
import PhaseManagementModal from '../components/PhaseManagementModal';
import PhaseApprovalModal from './PhaseApprovalModal';

// ===== DESIGN TOKENS FROM FIGMA =====
const COLORS = {
  // Primary Blues
  primary100: '#003867',
  primary80: '#004A8A',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary50: '#1A6DB4',
  primary20: '#B3CEE6',
  primary10: '#E6EFF7',
  // Greens
  green90: '#007B36',
  green80: '#008B3E',
  green60: '#00AC4F',
  green10: '#E6F5EC',
  // Purple
  purple100: '#3C076D',
  purple70: '#5E0BA1',
  purple60: '#6A0DAD',
  purple10: '#EFE6F5',
  // Amber
  amber70: '#DA9C02',
  amber60: '#FFB703',
  amber10: '#FFF2CF',
  // Text
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  textWhite: '#FFFFFF',
  // Backgrounds
  bgWhite: '#FFFFFF',
};

interface Phase {
  id: number;
  phaseNumber: number;
  title?: string;
  description: string;
  moneySpent: number;
  timeSpentDays: number;
  status?: string;
  approved?: boolean;
  completed?: boolean;
}

interface Project {
  id: number;
  description: string;
  status: string;
  budget: number;
  address?: string;
  createdAt: string;
  serviceNameEn?: string;
  serviceNameAr?: string;
  requirements?: string[];
  timeRequiredDays?: number;
  phases?: Phase[];
}

interface ApprovedProjectScreenProps {
  project: Project;
  onBack: () => void;
  onRequestModification?: (phaseId: number, message: string) => void;
  onEditPhase?: (phase: Phase) => void;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => void;
  onProceedToContract?: () => void;
  onSuccess?: () => void;
  isTechnician?: boolean;
}

type Feedback = {
  id?: number;
  comment?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

const PHASE_TAG_REGEX = /^\s*\[Phase\s+(\d+)\]\s*/i;

function getFeedbackPhaseNumber(feedback: Feedback): number | null {
  const comment = feedback.comment || '';
  const match = comment.match(PHASE_TAG_REGEX);
  if (!match?.[1]) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function stripFeedbackPhaseTag(comment: string): string {
  return (comment || '').replace(PHASE_TAG_REGEX, '').trim();
}

// ===== PHASE CARD COMPONENT - FIGMA DESIGN =====
const PhaseCard = ({
  phase,
  index,
  formatBudget,
  formatDuration,
  isTechnician,
  onRequestModification,
  onEditPhase,
  isRTL,
  feedbackCount,
  onOpenFeedbacks,
}: {
  phase: Phase;
  index: number;
  formatBudget: (amount: number) => string;
  formatDuration: (days: number) => string;
  isTechnician: boolean;
  onRequestModification?: () => void;
  onEditPhase?: () => void;
  isRTL: boolean;
  feedbackCount: number;
  onOpenFeedbacks?: () => void;
}) => {
  const { t } = useTranslation();
  
  // Determine phase status
  const isApproved = phase.approved || phase.status?.toUpperCase() === 'APPROVED' || phase.status?.toUpperCase() === 'COMPLETED';
  const isPending = !isApproved;
  
  // Figma design: green border for approved, light blue border for pending
  const borderColor = isApproved ? COLORS.green60 : COLORS.primary10;
  const borderWidth = isApproved ? 0.5 : 1;
  
  // Status badge colors from Figma
  const statusBgColor = isApproved ? COLORS.green10 : COLORS.amber10;
  const statusTextColor = isApproved ? COLORS.green80 : COLORS.amber60;
  const statusText = isApproved ? t('Approved') : t('Pending');
  
  return (
    <View style={[
      phaseStyles.card, 
      { borderColor, borderWidth }
    ]}>
      {/* Header Row - Phase number, title, and status badge */}
      <View style={[phaseStyles.headerRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[phaseStyles.headerLeft, isRTL && { flexDirection: 'row-reverse' }]}>
          <View style={phaseStyles.numberBadge}>
            <Text style={phaseStyles.numberText}>{phase.phaseNumber || index + 1}</Text>
          </View>
          <Text style={[phaseStyles.title, isRTL && { textAlign: 'right' }]} numberOfLines={1}>
            {phase.title || phase.description.substring(0, 30)}
          </Text>
        </View>
        <View style={[phaseStyles.statusBadge, { backgroundColor: statusBgColor }]}>
          <Text style={[phaseStyles.statusText, { color: statusTextColor }]}>
            {statusText}
          </Text>
        </View>
      </View>
      
      {/* Description */}
      <Text style={[phaseStyles.description, isRTL && { textAlign: 'right' }]} numberOfLines={3}>
        {phase.description}
      </Text>
      
      {/* Price and Duration Row */}
      <View style={[phaseStyles.metaRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <Text style={phaseStyles.priceText}>{formatBudget(phase.moneySpent)}</Text>
        <View style={[phaseStyles.durationContainer, isRTL && { flexDirection: 'row-reverse' }]}>
          <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
          <Text style={phaseStyles.durationText}>{formatDuration(phase.timeSpentDays)}</Text>
        </View>
      </View>
      
      {/* Action Button for Pending Phases (User only) */}
      {isPending && !isTechnician && (
        <TouchableOpacity
          style={phaseStyles.actionButton}
          onPress={onRequestModification}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={"chatbubble-outline"} 
            size={14} 
            color={COLORS.textWhite} 
          />
          <Text style={phaseStyles.actionButtonText}>
            {t('Request Modification')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Modification Requests link (always visible if there are any) */}
      {feedbackCount > 0 && (
        <TouchableOpacity
          onPress={onOpenFeedbacks}
          activeOpacity={0.8}
          style={[phaseStyles.feedbackLinkRow, isRTL && { flexDirection: 'row-reverse' }]}
        >
          <Ionicons name="chatbubbles-outline" size={14} color={COLORS.primary60} />
          <Text style={[phaseStyles.feedbackLinkText, isRTL && { textAlign: 'right' }]}>
            {t('Feedback')} ({feedbackCount})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const phaseStyles = StyleSheet.create({
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    gap: 16,
    backgroundColor: COLORS.bgWhite,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.primary80,
  },
  title: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textBody,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 18,
    minWidth: 65,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textBody,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.green80,
    minWidth: 49,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  actionButton: {
    backgroundColor: COLORS.amber60,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textWhite,
  },
  feedbackLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  feedbackLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary60,
  },
});

// ===== REQUEST MODIFICATION MODAL =====
const RequestModificationModal = ({
  visible,
  phase,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  visible: boolean;
  phase: Phase | null;
  onClose: () => void;
  onSubmit: (message: string) => void;
  isSubmitting: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const [message, setMessage] = useState('');
  const isRTL = i18n.language === 'ar';
  
  const screenWidth = Dimensions.get('window').width;
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  
  const handleSubmit = () => {
    if (message.trim()) {
      onSubmit(message);
    }
  };
  
  // Reset message when modal opens
  useEffect(() => {
    if (visible) {
      setMessage('');
    }
  }, [visible]);
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modificationModalStyles.backdrop}>
        <Pressable 
          style={modificationModalStyles.backdropPressable} 
          onPress={onClose} 
        />
        <View style={[
          modificationModalStyles.card, 
          IS_LARGE_WEB && modificationModalStyles.cardWeb
        ]}>
          {/* Header */}
          <View style={[modificationModalStyles.headerRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={modificationModalStyles.title}>{t('Request Modification')}</Text>
            <TouchableOpacity 
              onPress={onClose} 
              style={modificationModalStyles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={COLORS.textBody} />
            </TouchableOpacity>
          </View>
          
          <View style={modificationModalStyles.divider} />
          
          {/* Phase Info */}
          {phase && (
            <View style={[modificationModalStyles.phaseInfo, isRTL && { flexDirection: 'row-reverse' }]}>
              <View style={modificationModalStyles.phaseNumberBadge}>
                <Text style={modificationModalStyles.phaseNumberText}>
                  {phase.phaseNumber}
                </Text>
              </View>
              <Text style={[modificationModalStyles.phaseTitle, isRTL && { textAlign: 'right' }]} numberOfLines={1}>
                {phase.title || phase.description.substring(0, 40)}
              </Text>
            </View>
          )}
          
          {/* Message Input */}
          <View style={modificationModalStyles.inputContainer}>
            <Text style={[modificationModalStyles.inputLabel, isRTL && { textAlign: 'right' }]}>
              {t('Modification Details')}
            </Text>
            <TextInput
              style={[
                modificationModalStyles.textInput,
                isRTL && { textAlign: 'right' }
              ]}
              placeholder={t('Describe the changes you would like...')}
              placeholderTextColor={COLORS.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          
          {/* Submit Button */}
          <TouchableOpacity 
            style={[
              modificationModalStyles.submitButton,
              (!message.trim() || isSubmitting) && modificationModalStyles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!message.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.textWhite} />
            ) : (
              <>
                <Ionicons name="send-outline" size={16} color={COLORS.textWhite} />
                <Text style={modificationModalStyles.submitButtonText}>{t('Send Request')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const modificationModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: COLORS.bgWhite,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary10,
  },
  cardWeb: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textHeader,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.primary10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.textDividers,
    marginVertical: 12,
  },
  phaseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: COLORS.primary10,
    borderRadius: 8,
    marginBottom: 16,
  },
  phaseNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.bgWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary80,
  },
  phaseTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textBody,
  },
  inputContainer: {
    gap: 8,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.textDividers,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.textBody,
    minHeight: 100,
    backgroundColor: COLORS.bgWhite,
  },
  submitButton: {
    backgroundColor: COLORS.primary60,
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
});

// ===== PHASE FEEDBACK LIST MODAL =====
const PhaseFeedbacksModal = ({
  visible,
  phaseNumber,
  feedbacks,
  onClose,
  isTechnician,
  onResolve,
  isResolvingId,
}: {
  visible: boolean;
  phaseNumber: number | null;
  feedbacks: Feedback[];
  onClose: () => void;
  isTechnician: boolean;
  onResolve?: (feedbackId: number) => void;
  isResolvingId?: number | null;
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const screenWidth = Dimensions.get('window').width;
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={feedbackModalStyles.backdrop}>
        <Pressable style={feedbackModalStyles.backdropPressable} onPress={onClose} />
        <View style={[feedbackModalStyles.card, IS_LARGE_WEB && feedbackModalStyles.cardWeb]}>
          <View style={[feedbackModalStyles.headerRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={feedbackModalStyles.title}>
              {phaseNumber ? `${t('Feedback')} - ${t('Phase')} ${phaseNumber}` : t('Feedback')}
            </Text>
            <TouchableOpacity onPress={onClose} style={feedbackModalStyles.closeButton}>
              <Ionicons name="close" size={18} color={COLORS.textBody} />
            </TouchableOpacity>
          </View>

          <View style={feedbackModalStyles.divider} />

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {feedbacks.length === 0 ? (
              <Text style={[feedbackModalStyles.emptyText, isRTL && { textAlign: 'right' }]}>
                {t('No feedback available yet')}
              </Text>
            ) : (
              feedbacks.map((fb, idx) => {
                const isResolved = (fb.status || '').toLowerCase() === 'resolved';
                const body = stripFeedbackPhaseTag(fb.comment || '');
                return (
                  <View key={(fb.id ?? idx).toString()} style={feedbackModalStyles.feedbackCard}>
                    <View style={[feedbackModalStyles.feedbackTopRow, isRTL && { flexDirection: 'row-reverse' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[feedbackModalStyles.feedbackDate, isRTL && { textAlign: 'right' }]}>
                          {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : ''}
                        </Text>
                      </View>
                      <View style={[
                        feedbackModalStyles.statusPill,
                        { backgroundColor: isResolved ? COLORS.green10 : COLORS.amber10 },
                      ]}>
                        <Ionicons
                          name={isResolved ? 'checkmark-circle' : 'time-outline'}
                          size={14}
                          color={isResolved ? COLORS.green80 : COLORS.amber70}
                        />
                        <Text style={[
                          feedbackModalStyles.statusText,
                          { color: isResolved ? COLORS.green80 : COLORS.amber70 },
                        ]}>
                          {isResolved ? t('Resolved') : t('Pending')}
                        </Text>
                      </View>
                    </View>

                    <Text style={[feedbackModalStyles.feedbackBody, isRTL && { textAlign: 'right' }]}>
                      {body}
                    </Text>

                    {isTechnician && !isResolved && typeof fb.id === 'number' && onResolve && (
                      <TouchableOpacity
                        style={feedbackModalStyles.resolveButton}
                        onPress={() => onResolve(fb.id as number)}
                        disabled={isResolvingId === fb.id}
                      >
                        {isResolvingId === fb.id ? (
                          <ActivityIndicator size="small" color={COLORS.textWhite} />
                        ) : (
                          <>
                            <Ionicons name="checkmark-done-outline" size={16} color={COLORS.textWhite} />
                            <Text style={feedbackModalStyles.resolveButtonText}>{t('Resolve Feedback')}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const feedbackModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  backdropPressable: { ...StyleSheet.absoluteFillObject },
  card: {
    backgroundColor: COLORS.bgWhite,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary10,
  },
  cardWeb: {
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textHeader,
    flex: 1,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.primary10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.textDividers,
    marginVertical: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingVertical: 12,
  },
  feedbackCard: {
    borderWidth: 1,
    borderColor: COLORS.primary10,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: COLORS.bgWhite,
    gap: 10,
  },
  feedbackTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feedbackDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackBody: {
    fontSize: 14,
    color: COLORS.textBody,
    lineHeight: 20,
  },
  resolveButton: {
    backgroundColor: COLORS.green60,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resolveButtonText: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: '700',
  },
});


// ===== MAIN COMPONENT =====
export default function ApprovedProjectScreen({
  project,
  onBack,
  onRequestModification,
  onEditPhase,
  onOpenChat,
  onProceedToContract,
  onSuccess,
  isTechnician: propIsTechnician,
}: ApprovedProjectScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTechnician, setIsTechnician] = useState(propIsTechnician ?? false);
  const [isModificationModalVisible, setIsModificationModalVisible] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPhaseManagement, setShowPhaseManagement] = useState(false);
  const [showPhaseApproval, setShowPhaseApproval] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const [showFeedbacksModal, setShowFeedbacksModal] = useState(false);
  const [selectedFeedbackPhaseNumber, setSelectedFeedbackPhaseNumber] = useState<number | null>(null);
  const [isResolvingFeedbackId, setIsResolvingFeedbackId] = useState<number | null>(null);
  
  
  const screenWidth = Dimensions.get('window').width;
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  const isRTL = i18n.language === 'ar';
  
  const serviceName = i18n.language === 'ar' ? project?.serviceNameAr : project?.serviceNameEn;
  
  const projectStatus = project?.status?.toUpperCase?.() || '';
  
  // Status helpers
  const isPhasePlanning = projectStatus === 'PHASE_PLANNING';
  const isApprovedStatus = projectStatus === 'APPROVED';

  // Calculate summary stats
  const totalPhases = phases.length;
  const approvedPhases = phases.filter(p => 
    p.approved || p.status?.toUpperCase() === 'APPROVED' || p.status?.toUpperCase() === 'COMPLETED'
  ).length;
  const totalCost = phases.reduce((sum, p) => sum + (p.moneySpent || 0), 0);
  const totalDays = phases.reduce((sum, p) => sum + (p.timeSpentDays || 0), 0);
  
  // All phases approved check
  const allPhasesApproved = totalPhases > 0 && approvedPhases === totalPhases;

  const feedbacksByPhaseNumber = React.useMemo(() => {
    const map: Record<number, Feedback[]> = {};
    for (const fb of feedbacks) {
      const n = getFeedbackPhaseNumber(fb);
      if (n == null) continue;
      if (!map[n]) map[n] = [];
      map[n].push(fb);
    }
    // Sort newest first per phase
    Object.values(map).forEach((arr) => {
      arr.sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bd - ad;
      });
    });
    return map;
  }, [feedbacks]);

  useEffect(() => {
    loadData();
  }, [project]);

  const loadData = async () => {
    if (!project?.id) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Check user role
      const role = await storage.getUserRole();
      const isTech = role?.toUpperCase() === 'TECHNICIAN';
      setIsTechnician(propIsTechnician ?? isTech);
      
      // Load phases
      await loadPhases();
      // Load feedbacks (modification requests)
      await loadFeedbacks();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPhases = async () => {
    if (!project?.id) return;
    
    try {
      const token = await storage.getAuthToken();
      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, { projectId: project.id });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPhases(data);
      }
    } catch (error) {
      console.error('Error loading phases:', error);
    }
  };

  const loadFeedbacks = async () => {
    if (!project?.id) return;
    try {
      setIsLoadingFeedbacks(true);
      const token = await storage.getAuthToken();
      if (!token) return;
      const url = buildApiUrlWithParams(API_ENDPOINTS.FEEDBACKS.LIST, { projectId: project.id });
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setFeedbacks(Array.isArray(data) ? data : []);
      } else {
        const errorText = await response.text();
        console.error('Error loading feedbacks:', response.status, errorText);
        setFeedbacks([]);
      }
    } catch (e) {
      console.error('Error loading feedbacks:', e);
      setFeedbacks([]);
    } finally {
      setIsLoadingFeedbacks(false);
    }
  };

  const resolveFeedback = async (feedbackId: number) => {
    try {
      setIsResolvingFeedbackId(feedbackId);
      const token = await storage.getAuthToken();
      if (!token) {
        Alert.alert(t('Error'), t('Please login again'));
        return;
      }
      const url = buildApiUrlWithParams(API_ENDPOINTS.FEEDBACKS.RESOLVE, { feedbackId });
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        Alert.alert(t('Success'), t('Resolve Feedback'));
        await loadFeedbacks();
      } else {
        const errorText = await response.text();
        console.error('Error resolving feedback:', response.status, errorText);
        Alert.alert(t('Error'), t('Failed to resolve feedback'));
      }
    } catch (e) {
      console.error('Error resolving feedback:', e);
      Alert.alert(t('Error'), t('Failed to resolve feedback'));
    } finally {
      setIsResolvingFeedbackId(null);
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDuration = (days: number) => {
    if (days >= 7) {
      const weeks = Math.ceil(days / 7);
      return `${weeks} ${weeks === 1 ? t('Week') : t('Weeks')}`;
    }
    return `${days} ${days === 1 ? t('Day') : t('Days')}`;
  };

  const formatTotalDuration = () => {
    const weeks = Math.ceil(totalDays / 7);
    return `${weeks} ${weeks === 1 ? t('Week') : t('Weeks')}`;
  };

  const handleRequestModification = (phase: Phase) => {
    setSelectedPhase(phase);
    setIsModificationModalVisible(true);
  };

  const handleSubmitModification = async (message: string) => {
    if (!selectedPhase) return;

    if (onRequestModification) {
      setIsSubmitting(true);
      try {
        await onRequestModification(selectedPhase.id, message);
        setIsModificationModalVisible(false);
        Alert.alert(t('Success'), t('Modification request sent successfully'));
        onSuccess?.();
      } catch (error) {
        Alert.alert(t('Error'), t('Failed to send modification request'));
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Default behavior - create feedback
      setIsSubmitting(true);
      try {
        const token = await storage.getAuthToken();
        if (!token) {
          Alert.alert(t('Error'), t('Please login again'));
          return;
        }
        const url = buildApiUrl(API_ENDPOINTS.FEEDBACKS.CREATE);

        // Backend expects { projectId, comment }. Include phase context in the comment body.
        const comment = `[Phase ${selectedPhase.phaseNumber || selectedPhase.id}] ${message.trim()}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId: project.id,
            comment,
          }),
        });
        
        if (response.ok) {
          setIsModificationModalVisible(false);
          Alert.alert(t('Success'), t('Modification request sent successfully'));
          await loadFeedbacks();
          onSuccess?.();
        } else {
          const errorText = await response.text();
          console.error('Error sending modification request:', response.status, errorText);
          Alert.alert(t('Error'), t('Failed to send modification request'));
        }
      } catch (error) {
        console.error('Error sending modification request:', error);
        Alert.alert(t('Error'), t('Failed to send modification request'));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleEditPhase = (phase: Phase) => {
    if (onEditPhase) {
      onEditPhase(phase);
    } else {
      // Open the phase management modal
      setShowPhaseManagement(true);
    }
  };
  
  const handlePhaseManagementSuccess = () => {
    // Reload phases after changes
    loadPhases();
    onSuccess?.();
  };
  
  const handlePhaseApprovalSuccess = () => {
    // Reload phases after approval
    loadPhases();
    onSuccess?.();
  };

  const handleProceedToContract = () => {
    if (onProceedToContract) {
      onProceedToContract();
    } else {
      Alert.alert(
        t('Proceed to Contract'),
        t('All phases must be approved before proceeding to contract signing'),
        [{ text: t('OK') }]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bgWhite, paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary60} />
          <Text style={[styles.loadingText, { fontSize: scaledSize(14) }]}>{t('Loading...')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bgWhite, paddingTop: IS_LARGE_WEB ? 0 : insets.top }]}>
      {/* Header - Hidden on large web */}
      {!IS_LARGE_WEB && (
      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons 
            name={isRTL ? "chevron-forward" : "chevron-back"} 
            size={24} 
            color={COLORS.textHeader} 
          />
        </TouchableOpacity>
        <View style={[styles.headerTitleContainer, isRTL && { alignItems: 'flex-end' }]}>
          <Text style={[styles.headerTitle, isRTL && { textAlign: 'right' }, { fontSize: scaledSize(16) }]}>
            {serviceName || t('Project')}
          </Text>
          <Text style={[styles.headerSubtitle, isRTL && { textAlign: 'right' }, { fontSize: scaledSize(10) }]}>
              {t('Approved Project')}
          </Text>
        </View>
      </View>
      )}
      
      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          IS_LARGE_WEB && styles.webContentFullWidth,
        ]}
      >
        {/* Title Section - Large Web */}
        {IS_LARGE_WEB && (
          <View style={styles.titleSectionLargeWeb}>
            <TouchableOpacity onPress={onBack} style={styles.titleBackButton}>
              <Ionicons 
                name={isRTL ? "chevron-forward" : "chevron-back"} 
                size={24} 
                color={COLORS.textHeader} 
              />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={[styles.titleMainText, isRTL && { textAlign: 'right' }, { fontSize: scaledSize(42) }]}>
                {serviceName || t('Project')}
              </Text>
              <Text style={[styles.titleSubtext, isRTL && { textAlign: 'right' }, { fontSize: scaledSize(20) }]}>
                {t('Approved Project')}
              </Text>
            </View>
          </View>
        )}
        
        {/* Status Stepper */}
        <View style={[styles.stepperContainer, IS_LARGE_WEB && styles.stepperContainerLargeWeb]}>
          <ProjectCreationFlow currentStep="APPROVED" />
        </View>
        
        {/* Divider */}
        <View style={[styles.divider, IS_LARGE_WEB && styles.dividerLargeWeb]} />
        
        {/* Project Summary Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeaderTitle, isRTL && { textAlign: 'right' }, { fontSize: scaledSize(16) }]}>
            {t('Project Summary')}
          </Text>
          <Text style={[styles.sectionDescription, isRTL && { textAlign: 'right' }, { fontSize: scaledSize(14) }]}>
            {t('Review and modify project phases before proceeding to contract signing.')}
          </Text>
          
          {/* Summary Stats Card - Figma Design */}
          <View style={[styles.summaryCard, IS_LARGE_WEB && styles.summaryCardLargeWeb]}>
            {/* Top Row */}
            <View style={[styles.summaryRow, isRTL && { flexDirection: 'row-reverse' }, IS_LARGE_WEB && styles.summaryRowLargeWeb]}>
              <View style={[styles.summaryItem, isRTL && { alignItems: 'flex-end' }, IS_LARGE_WEB && styles.summaryItemLargeWeb]}>
                <Text style={[styles.summaryLabel, IS_LARGE_WEB && styles.summaryLabelLargeWeb]}>
                  {t('Total Phases')}
                </Text>
                <Text style={[styles.summaryValuePrimary, IS_LARGE_WEB && styles.summaryValueLargeWeb]}>
                  {totalPhases}
                </Text>
              </View>
              <View style={[styles.summaryItem, { alignItems: isRTL ? 'flex-start' : 'flex-end' }, IS_LARGE_WEB && styles.summaryItemLargeWeb]}>
                <Text style={[styles.summaryLabel, IS_LARGE_WEB && styles.summaryLabelLargeWeb]}>
                  {t('Total Cost')}
                </Text>
                <Text style={[styles.summaryValueGreen, { textAlign: isRTL ? 'left' : 'right' }, IS_LARGE_WEB && styles.summaryValueLargeWeb]}>
                  {formatBudget(totalCost || project.budget)}
                </Text>
              </View>
            </View>
            
            {/* Bottom Row */}
            <View style={[styles.summaryRow, isRTL && { flexDirection: 'row-reverse' }, IS_LARGE_WEB && styles.summaryRowLargeWeb]}>
              <View style={[styles.summaryItem, isRTL && { alignItems: 'flex-end' }, IS_LARGE_WEB && styles.summaryItemLargeWeb]}>
                <Text style={[styles.summaryLabel, IS_LARGE_WEB && styles.summaryLabelLargeWeb]}>
                  {t('Total Duration')}
                </Text>
                <Text style={[styles.summaryValueAmber, IS_LARGE_WEB && styles.summaryValueLargeWeb]}>
                  {formatTotalDuration()}
                </Text>
              </View>
              <View style={[styles.summaryItem, { alignItems: isRTL ? 'flex-start' : 'flex-end' }, IS_LARGE_WEB && styles.summaryItemLargeWeb]}>
                <Text style={[styles.summaryLabel, IS_LARGE_WEB && styles.summaryLabelLargeWeb]}>
                  {t('Approved Phases')}
                </Text>
                <Text style={[styles.summaryValuePurple, { textAlign: isRTL ? 'left' : 'right' }, IS_LARGE_WEB && styles.summaryValueLargeWeb]}>
                  {approvedPhases}/{totalPhases}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Manage Phases Button (Technician View) */}
        {isTechnician && (
          <TouchableOpacity 
            style={[styles.managePhasesButton, IS_LARGE_WEB && styles.managePhasesButtonLargeWeb]}
            onPress={() => setShowPhaseManagement(true)}
          >
            <Ionicons name="settings-outline" size={IS_LARGE_WEB ? 20 : 18} color={COLORS.textWhite} />
            <Text style={[styles.managePhasesButtonText, IS_LARGE_WEB && styles.managePhasesButtonTextLargeWeb]}>
              {t('Manage Phases')}
            </Text>
          </TouchableOpacity>
        )}
        
        {/* Review & Approve Button (User View in PHASE_PLANNING / APPROVED) */}
        {!isTechnician && (isPhasePlanning || isApprovedStatus) && (
          <TouchableOpacity 
            style={[styles.reviewApproveButton, IS_LARGE_WEB && styles.reviewApproveButtonLargeWeb]}
            onPress={() => setShowPhaseApproval(true)}
          >
            <Ionicons name="checkmark-circle-outline" size={IS_LARGE_WEB ? 20 : 18} color={COLORS.textWhite} />
            <Text style={[styles.reviewApproveButtonText, IS_LARGE_WEB && styles.reviewApproveButtonTextLargeWeb]}>
              {t('Review & Approve Phases')}
            </Text>
          </TouchableOpacity>
        )}
        
        {/* Work Phases Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, isRTL && { flexDirection: 'row-reverse' }, IS_LARGE_WEB && styles.sectionHeaderLargeWeb]}>
            <Ionicons name="document-text-outline" size={IS_LARGE_WEB ? 28 : 12} color={COLORS.primary80} />
            <Text style={[styles.sectionLabel, IS_LARGE_WEB && styles.sectionLabelLargeWeb]}>
              {t('Work Phases')}
            </Text>
          </View>
          
          {phases.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="layers-outline" size={48} color={COLORS.textDividers} />
              <Text style={styles.emptyText}>{t('No phases yet')}</Text>
              <Text style={styles.emptySubtext}>
                {t('Phases will appear here once created')}
              </Text>
            </View>
          ) : (
            phases.map((phase, index) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                index={index}
                formatBudget={formatBudget}
                formatDuration={formatDuration}
                isTechnician={isTechnician}
                onRequestModification={() => handleRequestModification(phase)}
                onEditPhase={() => handleEditPhase(phase)}
                isRTL={isRTL}
                feedbackCount={(feedbacksByPhaseNumber[phase.phaseNumber || index + 1] || []).length}
                onOpenFeedbacks={() => {
                  setSelectedFeedbackPhaseNumber(phase.phaseNumber || index + 1);
                  setShowFeedbacksModal(true);
                }}
              />
            ))
          )}
        </View>

        {/* Proceed to Contract Button (User View only - when all phases approved) */}
        {!isTechnician && allPhasesApproved && (
          <TouchableOpacity 
            style={styles.proceedButton}
            onPress={handleProceedToContract}
          >
            <Ionicons name="document-text-outline" size={16} color={COLORS.textWhite} />
            <Text style={styles.proceedButtonText}>{t('Proceed to Contract Signing')}</Text>
          </TouchableOpacity>
        )}
        
        {/* Bottom Padding */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      {/* Request Modification Modal (User View) */}
      <RequestModificationModal
        visible={isModificationModalVisible}
        phase={selectedPhase}
        onClose={() => setIsModificationModalVisible(false)}
        onSubmit={handleSubmitModification}
        isSubmitting={isSubmitting}
      />

      {/* Phase Feedbacks Modal (per-phase modification requests) */}
      <PhaseFeedbacksModal
        visible={showFeedbacksModal}
        phaseNumber={selectedFeedbackPhaseNumber}
        feedbacks={selectedFeedbackPhaseNumber ? (feedbacksByPhaseNumber[selectedFeedbackPhaseNumber] || []) : []}
        onClose={() => setShowFeedbacksModal(false)}
        isTechnician={isTechnician}
        onResolve={isTechnician ? resolveFeedback : undefined}
        isResolvingId={isResolvingFeedbackId}
      />
      
      {/* Phase Management Modal (Technician View) */}
      <PhaseManagementModal
        visible={showPhaseManagement}
        projectId={project.id}
        onClose={() => setShowPhaseManagement(false)}
        onSuccess={handlePhaseManagementSuccess}
      />
      
      {/* Phase Approval Modal (User View in PHASE_PLANNING / APPROVED) */}
      <PhaseApprovalModal
        visible={showPhaseApproval}
        projectId={project.id}
        onClose={() => setShowPhaseApproval(false)}
        onSuccess={() => {
          // Phases approved and signature emails sent by the modal
          handlePhaseApprovalSuccess();
          setShowPhaseApproval(false);
        }}
        isTechnician={false}
        onOpenContract={() => {
          setShowPhaseApproval(false);
          handleProceedToContract();
        }}
      />
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 24,
  },
  headerLargeWeb: {
    paddingHorizontal: 48,
    paddingVertical: 32,
    gap: 56,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonLargeWeb: {
    width: 40,
    height: 40,
  },
  headerTitleContainer: {
    flex: 1,
    gap: 6,
  },
  headerTitleContainerLargeWeb: {
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textHeader,
  },
  headerTitleLargeWeb: {
    fontSize: 34,
    fontWeight: '400',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '300',
    color: COLORS.textSecondary,
  },
  headerSubtitleLargeWeb: {
    fontSize: 16,
  },
  stepperContainer: {
    paddingHorizontal: 16,
  },
  stepperContainerLargeWeb: {
    paddingHorizontal: 48,
    paddingTop: 8,
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.textDividers,
    marginHorizontal: 16,
    marginTop: 8,
  },
  dividerLargeWeb: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  webContent: {
    maxWidth: 1344,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 48,
    paddingVertical: 16,
  },
  webContentFullWidth: {
    width: '100%',
    paddingHorizontal: 48,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textHeader,
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    fontWeight: '300',
    color: COLORS.textBody,
    lineHeight: 21,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionHeaderLargeWeb: {
    gap: 16,
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.primary80,
  },
  sectionLabelLargeWeb: {
    fontSize: 16,
  },
  // Summary Card - Figma Design
  summaryCard: {
    backgroundColor: COLORS.primary10,
    borderWidth: 0.5,
    borderColor: COLORS.primary80,
    borderRadius: 6,
    paddingVertical: 16,
  },
  summaryCardLargeWeb: {
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRowLargeWeb: {
    gap: 32,
  },
  summaryItem: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  summaryItemLargeWeb: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textBody,
  },
  summaryLabelLargeWeb: {
    fontSize: 12,
  },
  summaryValuePrimary: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textHeader,
  },
  summaryValueGreen: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.green60,
  },
  summaryValueAmber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.amber70,
  },
  summaryValuePurple: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.purple70,
  },
  summaryValueLargeWeb: {
    fontSize: 14,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // Technician Manage Phases Button
  managePhasesButton: {
    backgroundColor: COLORS.primary60,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 88, 172, 0.15)',
      } as any,
      default: {
        elevation: 3,
      },
    }),
  },
  managePhasesButtonLargeWeb: {
    borderRadius: 0,
    paddingVertical: 32,
    minHeight: 88,
    marginBottom: 32,
  },
  managePhasesButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  managePhasesButtonTextLargeWeb: {
    fontSize: 16,
    fontWeight: '400',
  },
  // User Review & Approve Button
  reviewApproveButton: {
    backgroundColor: COLORS.green60,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 172, 79, 0.15)',
      } as any,
      default: {
        elevation: 3,
      },
    }),
  },
  reviewApproveButtonLargeWeb: {
    borderRadius: 0,
    paddingVertical: 32,
    minHeight: 88,
    marginBottom: 32,
  },
  reviewApproveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  reviewApproveButtonTextLargeWeb: {
    fontSize: 16,
    fontWeight: '400',
  },
  // Proceed to Contract Button
  proceedButton: {
    backgroundColor: COLORS.green60,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  proceedButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
    color: COLORS.textHeader,
    lineHeight: 42,
  },
  titleSubtext: {
    fontSize: 20,
    fontWeight: '300',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
