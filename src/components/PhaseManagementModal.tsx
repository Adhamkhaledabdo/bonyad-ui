/**
 * PhaseManagementModal
 * 
 * Comprehensive modal for managing project phases with:
 * - List view of all phases
 * - Drag-and-drop reordering
 * - Add new phase popup
 * - Edit existing phase popup
 * - Remove phase functionality
 * - Unified UI matching app design
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import AlertPopup, { useAlertPopup } from './AlertPopup';

// ===== DESIGN TOKENS =====
const COLORS = {
  primary100: '#003867',
  primary80: '#004A8A',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary50: '#1A6DB4',
  primary20: '#B3CEE6',
  primary10: '#E6EFF7',
  green90: '#007B36',
  green80: '#008B3E',
  green60: '#00AC4F',
  green10: '#E6F5EC',
  purple100: '#3C076D',
  purple60: '#6A0DAD',
  purple10: '#EFE6F5',
  amber70: '#DA9C02',
  amber60: '#FFB703',
  amber10: '#FFF2CF',
  red60: '#DC2626',
  red10: '#FEE2E2',
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  textWhite: '#FFFFFF',
  bgWhite: '#FFFFFF',
  bgOverlay: 'rgba(0, 0, 0, 0.5)',
};

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
  isNew?: boolean; // For newly added phases not yet saved
}

interface PhaseManagementModalProps {
  visible: boolean;
  projectId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

// ===== PHASE ITEM WITH REORDER BUTTONS =====
const PhaseItem = ({
  phase,
  index,
  totalCount,
  onMoveUp,
  onMoveDown,
  onEdit,
  onRemove,
  formatBudget,
}: {
  phase: Phase;
  index: number;
  totalCount: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onRemove: () => void;
  formatBudget: (amount: number) => string;
}) => {
  const { t } = useTranslation();
  
  const canEdit = !phase.approved && !phase.completed;
  const canReorder = !phase.approved && !phase.completed;
  const canRemove = !phase.approved && !phase.completed;
  const isFirst = index === 0;
  const isLast = index === totalCount - 1;
  
  return (
    <View style={itemStyles.container}>
      {/* Reorder Buttons */}
      <View style={itemStyles.reorderButtons}>
        <TouchableOpacity 
          style={[
            itemStyles.reorderButton,
            (!canReorder || isFirst) && itemStyles.reorderButtonDisabled
          ]}
          onPress={onMoveUp}
          disabled={!canReorder || isFirst}
        >
          <Ionicons 
            name="chevron-up" 
            size={18} 
            color={(!canReorder || isFirst) ? COLORS.textDividers : COLORS.primary60} 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            itemStyles.reorderButton,
            (!canReorder || isLast) && itemStyles.reorderButtonDisabled
          ]}
          onPress={onMoveDown}
          disabled={!canReorder || isLast}
        >
          <Ionicons 
            name="chevron-down" 
            size={18} 
            color={(!canReorder || isLast) ? COLORS.textDividers : COLORS.primary60} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Phase Content */}
      <View style={itemStyles.content}>
        {/* Header */}
        <View style={itemStyles.header}>
          <View style={itemStyles.numberBadge}>
            <Text style={itemStyles.numberText}>{phase.phaseNumber}</Text>
          </View>
          <View style={[
            itemStyles.statusBadge,
            { backgroundColor: phase.approved ? COLORS.green10 : COLORS.amber10 }
          ]}>
            <Text style={[
              itemStyles.statusText,
              { color: phase.approved ? COLORS.green80 : COLORS.amber70 }
            ]}>
              {phase.approved ? t('Approved') : t('Pending')}
            </Text>
          </View>
        </View>
        
        {/* Description */}
        <Text style={itemStyles.description} numberOfLines={2}>
          {phase.description}
        </Text>
        
        {/* Meta Row */}
        <View style={itemStyles.metaRow}>
          <Text style={itemStyles.price}>{formatBudget(phase.moneySpent)}</Text>
          <View style={itemStyles.divider} />
          <View style={itemStyles.duration}>
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={itemStyles.durationText}>
              {phase.timeSpentDays} {t('day_unit')}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Actions */}
      <View style={itemStyles.actions}>
        {canEdit && (
          <TouchableOpacity style={itemStyles.editButton} onPress={onEdit}>
            <Ionicons name="create-outline" size={20} color={COLORS.primary60} />
          </TouchableOpacity>
        )}
        {canRemove && (
          <TouchableOpacity style={itemStyles.removeButton} onPress={onRemove}>
            <Ionicons name="trash-outline" size={20} color={COLORS.red60} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const itemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgWhite,
    borderWidth: 1,
    borderColor: COLORS.textDividers,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  reorderButtons: {
    flexDirection: 'column',
    gap: 4,
  },
  reorderButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderButtonDisabled: {
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary80,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: COLORS.textBody,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.green80,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: COLORS.textDividers,
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  actions: {
    flexDirection: 'column',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary10,
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.red10,
  },
});

// ===== PHASE FORM MODAL =====
const PhaseFormModal = ({
  visible,
  phase,
  isEditing,
  onClose,
  onSave,
  isSubmitting,
}: {
  visible: boolean;
  phase: Phase | null;
  isEditing: boolean;
  onClose: () => void;
  onSave: (data: { description: string; timeSpentDays: number; moneySpent: number }) => void;
  isSubmitting: boolean;
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const [description, setDescription] = useState('');
  const [timeDays, setTimeDays] = useState('');
  const [money, setMoney] = useState('');
  const [errors, setErrors] = useState<{ description?: string; time?: string; money?: string }>({});
  
  useEffect(() => {
    if (visible && phase && isEditing) {
      setDescription(phase.description || '');
      setTimeDays(phase.timeSpentDays?.toString() || '');
      setMoney(phase.moneySpent?.toString() || '');
      setErrors({});
    } else if (visible && !isEditing) {
      setDescription('');
      setTimeDays('');
      setMoney('');
      setErrors({});
    }
  }, [visible, phase, isEditing]);
  
  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!description.trim()) {
      newErrors.description = t('Description is required');
    }
    
    const days = parseInt(timeDays);
    if (!timeDays || isNaN(days) || days <= 0) {
      newErrors.time = t('Enter a valid number of days');
    }
    
    const amount = parseFloat(money);
    if (!money || isNaN(amount) || amount <= 0) {
      newErrors.money = t('Enter a valid amount');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = () => {
    if (validate()) {
      onSave({
        description: description.trim(),
        timeSpentDays: parseInt(timeDays),
        moneySpent: parseFloat(money),
      });
    }
  };
  
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={formStyles.overlay}>
        <View style={[formStyles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={formStyles.header}>
            <Text style={formStyles.headerTitle}>
              {isEditing ? t('Edit Phase') : t('Add New Phase')}
            </Text>
            <TouchableOpacity onPress={onClose} style={formStyles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textBody} />
            </TouchableOpacity>
          </View>
          
          {/* Form */}
          <ScrollView 
            style={formStyles.form} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Description */}
            <View style={formStyles.field}>
              <Text style={formStyles.label}>{t('Description')} *</Text>
              <TextInput
                style={[
                  formStyles.textArea,
                  errors.description && formStyles.inputError
                ]}
                multiline
                numberOfLines={4}
                placeholder={t('Describe what will be done in this phase...')}
                placeholderTextColor={COLORS.textSecondary}
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  setErrors(prev => ({ ...prev, description: undefined }));
                }}
              />
              {errors.description && (
                <Text style={formStyles.errorText}>{errors.description}</Text>
              )}
            </View>
            
            {/* Duration */}
            <View style={formStyles.field}>
              <Text style={formStyles.label}>{t('Duration (days)')} *</Text>
              <View style={[
                formStyles.inputContainer,
                errors.time && formStyles.inputError
              ]}>
                <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={formStyles.input}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={COLORS.textSecondary}
                  value={timeDays}
                  onChangeText={(text) => {
                    setTimeDays(text.replace(/[^0-9]/g, ''));
                    setErrors(prev => ({ ...prev, time: undefined }));
                  }}
                />
                <Text style={formStyles.inputSuffix}>{t('day_unit')}</Text>
              </View>
              {errors.time && (
                <Text style={formStyles.errorText}>{errors.time}</Text>
              )}
            </View>
            
            {/* Cost */}
            <View style={formStyles.field}>
              <Text style={formStyles.label}>{t('Cost (SAR)')} *</Text>
              <View style={[
                formStyles.inputContainer,
                errors.money && formStyles.inputError
              ]}>
                <Ionicons name="cash-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={formStyles.input}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textSecondary}
                  value={money}
                  onChangeText={(text) => {
                    setMoney(text.replace(/[^0-9.]/g, ''));
                    setErrors(prev => ({ ...prev, money: undefined }));
                  }}
                />
                <Text style={formStyles.inputSuffix}>{t('SAR')}</Text>
              </View>
              {errors.money && (
                <Text style={formStyles.errorText}>{errors.money}</Text>
              )}
            </View>
          </ScrollView>
          
          {/* Actions */}
          <View style={formStyles.actions}>
            <TouchableOpacity 
              style={formStyles.cancelButton} 
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={formStyles.cancelButtonText}>{t('Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[formStyles.saveButton, isSubmitting && formStyles.buttonDisabled]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={COLORS.textWhite} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={COLORS.textWhite} />
                  <Text style={formStyles.saveButtonText}>
                    {isEditing ? t('Save Changes') : t('Add Phase')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const formStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: COLORS.bgWhite,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
      } as any,
      default: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.textDividers,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textHeader,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primary10,
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textBody,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: COLORS.primary10,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: COLORS.textBody,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary10,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textBody,
    height: '100%',
  },
  inputSuffix: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  inputError: {
    borderColor: COLORS.red60,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.red60,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.textDividers,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  saveButton: {
    flex: 2,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

// ===== CONFIRMATION MODAL =====
const ConfirmationModal = ({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDestructive,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={confirmStyles.overlay}>
      <View style={confirmStyles.container}>
        <View style={confirmStyles.iconContainer}>
          <Ionicons 
            name={isDestructive ? "warning-outline" : "help-circle-outline"} 
            size={48} 
            color={isDestructive ? COLORS.red60 : COLORS.primary60} 
          />
        </View>
        <Text style={confirmStyles.title}>{title}</Text>
        <Text style={confirmStyles.message}>{message}</Text>
        <View style={confirmStyles.actions}>
          <TouchableOpacity style={confirmStyles.cancelButton} onPress={onCancel}>
            <Text style={confirmStyles.cancelText}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              confirmStyles.confirmButton,
              isDestructive && confirmStyles.destructiveButton
            ]} 
            onPress={onConfirm}
          >
            <Text style={confirmStyles.confirmText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const confirmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.bgWhite,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
      } as any,
      default: {
        elevation: 10,
      },
    }),
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textHeader,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destructiveButton: {
    backgroundColor: COLORS.red60,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
});

// ===== MAIN COMPONENT =====
export default function PhaseManagementModal({
  visible,
  projectId,
  onClose,
  onSuccess,
}: PhaseManagementModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Custom alert hook
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Form modal state
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [isSubmittingPhase, setIsSubmittingPhase] = useState(false);
  
  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationConfig, setConfirmationConfig] = useState<{
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  } | null>(null);
  
  // No longer using drag state - using move up/down buttons instead
  
  const isRTL = i18n.language === 'ar';
  const screenWidth = Dimensions.get('window').width;
  const IS_WEB = Platform.OS === 'web';
  
  // Temp ID counter for new phases
  const tempIdRef = useRef(-1);
  
  useEffect(() => {
    if (visible && projectId) {
      loadPhases();
    }
  }, [visible, projectId]);
  
  const loadPhases = async () => {
    setIsLoading(true);
    try {
      const token = await storage.getAuthToken();
      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, { projectId });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPhases(data.sort((a: Phase, b: Phase) => a.phaseNumber - b.phaseNumber));
      } else {
        showError(t('Failed to load phases'));
      }
    } catch (error) {
      console.error('Error loading phases:', error);
      showError(t('Failed to load phases'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatBudget = (amount: number): string => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US').format(amount) + ' ' + t('SAR');
  };
  
  const handleAddPhase = () => {
    setEditingPhase(null);
    setShowPhaseForm(true);
  };
  
  const handleEditPhase = (phase: Phase) => {
    setEditingPhase(phase);
    setShowPhaseForm(true);
  };
  
  const handleRemovePhase = (phase: Phase) => {
    setConfirmationConfig({
      title: t('Remove Phase'),
      message: t('Are you sure you want to remove this phase? This action cannot be undone.'),
      confirmText: t('Remove'),
      isDestructive: true,
      onConfirm: () => {
        setPhases(prev => {
          const updated = prev.filter(p => p.id !== phase.id);
          // Renumber phases
          return updated.map((p, idx) => ({ ...p, phaseNumber: idx + 1 }));
        });
        setHasChanges(true);
        setShowConfirmation(false);
      },
    });
    setShowConfirmation(true);
  };
  
  const handleSavePhase = async (data: { description: string; timeSpentDays: number; moneySpent: number }) => {
    setIsSubmittingPhase(true);
    
    try {
      const token = await storage.getAuthToken();
      
      if (editingPhase) {
        // Update existing phase
        if (editingPhase.id > 0) {
          // Saved phase - update via API
          const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.UPDATE, { phaseId: editingPhase.id });
          
          const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              description: data.description,
              timeSpentDays: data.timeSpentDays,
              moneySpent: data.moneySpent,
            }),
          });
          
          if (response.ok) {
            showSuccess(t('Phase updated successfully'));
            await loadPhases();
          } else {
            showError(t('Failed to update phase'));
          }
        } else {
          // Unsaved phase - update locally
          setPhases(prev => prev.map(p => 
            p.id === editingPhase.id 
              ? { ...p, ...data }
              : p
          ));
          setHasChanges(true);
        }
      } else {
        // Create new phase via API immediately
        const url = buildApiUrl(API_ENDPOINTS.PHASES.CREATE);
        const nextPhaseNumber = phases.length + 1;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId,
            phaseNumber: nextPhaseNumber,
            description: data.description,
            timeSpentDays: data.timeSpentDays,
            moneySpent: data.moneySpent,
          }),
        });
        
        if (response.ok) {
          showSuccess(t('Phase added successfully'));
          await loadPhases();
          onSuccess?.();
        } else {
          showError(t('Failed to add phase'));
        }
      }
      
      setShowPhaseForm(false);
      setEditingPhase(null);
    } catch (error) {
      console.error('Error saving phase:', error);
      showError(t('Failed to save phase'));
    } finally {
      setIsSubmittingPhase(false);
    }
  };
  
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    
    setPhases(prev => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      // Renumber phases
      return updated.map((p, idx) => ({ ...p, phaseNumber: idx + 1 }));
    });
    setHasChanges(true);
  };
  
  const handleMoveDown = (index: number) => {
    if (index >= phases.length - 1) return;
    
    setPhases(prev => {
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      // Renumber phases
      return updated.map((p, idx) => ({ ...p, phaseNumber: idx + 1 }));
    });
    setHasChanges(true);
  };
  
  const handleSaveOrder = async () => {
    setIsSaving(true);
    try {
      const token = await storage.getAuthToken();
      
      // Update each phase's number
      const updatePromises = phases.map((phase, index) => {
        if (phase.id > 0) {
          const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.UPDATE, { phaseId: phase.id });
          return fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phaseNumber: index + 1,
              description: phase.description,
              timeSpentDays: phase.timeSpentDays,
              moneySpent: phase.moneySpent,
            }),
          });
        }
        return Promise.resolve();
      });
      
      await Promise.all(updatePromises);
      showSuccess(t('Phases reordered successfully'));
      setHasChanges(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving order:', error);
      showError(t('Failed to save phase order'));
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleClose = () => {
    if (hasChanges) {
      setConfirmationConfig({
        title: t('Unsaved Changes'),
        message: t('You have unsaved changes. Are you sure you want to close?'),
        confirmText: t('Discard'),
        isDestructive: true,
        onConfirm: () => {
          setShowConfirmation(false);
          setHasChanges(false);
          onClose();
        },
      });
      setShowConfirmation(true);
    } else {
      onClose();
    }
  };
  
  // Calculate totals
  const totalCost = phases.reduce((sum, p) => sum + (p.moneySpent || 0), 0);
  const totalDays = phases.reduce((sum, p) => sum + (p.timeSpentDays || 0), 0);
  
  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={[
            styles.container,
            { paddingTop: Math.max(insets.top, 20) }
          ]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.backButton} onPress={handleClose}>
                  <Ionicons name="close" size={24} color={COLORS.textBody} />
                </TouchableOpacity>
                <View>
                  <Text style={styles.headerTitle}>{t('Manage Phases')}</Text>
                  <Text style={styles.headerSubtitle}>
                    {phases.length} {t('phases')} • {formatBudget(totalCost)}
                  </Text>
                </View>
              </View>
              {hasChanges && (
                <TouchableOpacity 
                  style={[styles.saveOrderButton, isSaving && styles.buttonDisabled]}
                  onPress={handleSaveOrder}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={COLORS.textWhite} />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color={COLORS.textWhite} />
                      <Text style={styles.saveOrderText}>{t('Save Order')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
            
            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Ionicons name="list-outline" size={24} color={COLORS.primary60} />
                <View>
                  <Text style={styles.summaryValue}>{phases.length}</Text>
                  <Text style={styles.summaryLabel}>{t('Total Phases')}</Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Ionicons name="time-outline" size={24} color={COLORS.amber70} />
                <View>
                  <Text style={styles.summaryValue}>{totalDays}</Text>
                  <Text style={styles.summaryLabel}>{t('day_unit')}</Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Ionicons name="cash-outline" size={24} color={COLORS.green80} />
                <View>
                  <Text style={styles.summaryValue}>{formatBudget(totalCost)}</Text>
                  <Text style={styles.summaryLabel}>{t('Total')}</Text>
                </View>
              </View>
            </View>
            
            {/* Content */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary60} />
                <Text style={styles.loadingText}>{t('Loading phases...')}</Text>
              </View>
            ) : phases.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="layers-outline" size={64} color={COLORS.primary20} />
                </View>
                <Text style={styles.emptyTitle}>{t('No phases yet')}</Text>
                <Text style={styles.emptyText}>
                  {t('Add your first phase to define the project timeline and costs')}
                </Text>
                <TouchableOpacity style={styles.emptyButton} onPress={handleAddPhase}>
                  <Ionicons name="add" size={20} color={COLORS.textWhite} />
                  <Text style={styles.emptyButtonText}>{t('Add First Phase')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView 
                style={styles.phasesList}
                contentContainerStyle={styles.phasesListContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Reorder hint */}
                <View style={styles.dragHint}>
                  <Ionicons name="information-circle-outline" size={16} color={COLORS.primary60} />
                  <Text style={styles.dragHintText}>
                    {t('Use arrows to reorder phases. Only pending phases can be edited.')}
                  </Text>
                </View>
                
                {phases.map((phase, index) => (
                  <PhaseItem
                    key={phase.id}
                    phase={phase}
                    index={index}
                    totalCount={phases.length}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                    onEdit={() => handleEditPhase(phase)}
                    onRemove={() => handleRemovePhase(phase)}
                    formatBudget={formatBudget}
                  />
                ))}
              </ScrollView>
            )}
            
            {/* Add Phase Button */}
            {!isLoading && phases.length > 0 && (
              <View style={styles.footer}>
                <TouchableOpacity style={styles.addButton} onPress={handleAddPhase}>
                  <Ionicons name="add-circle" size={24} color={COLORS.textWhite} />
                  <Text style={styles.addButtonText}>{t('Add New Phase')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Phase Form Modal */}
      <PhaseFormModal
        visible={showPhaseForm}
        phase={editingPhase}
        isEditing={!!editingPhase}
        onClose={() => {
          setShowPhaseForm(false);
          setEditingPhase(null);
        }}
        onSave={handleSavePhase}
        isSubmitting={isSubmittingPhase}
      />
      
      {/* Confirmation Modal */}
      {confirmationConfig && (
        <ConfirmationModal
          visible={showConfirmation}
          title={confirmationConfig.title}
          message={confirmationConfig.message}
          confirmText={confirmationConfig.confirmText}
          cancelText={t('Cancel')}
          onConfirm={confirmationConfig.onConfirm}
          onCancel={() => setShowConfirmation(false)}
          isDestructive={confirmationConfig.isDestructive}
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
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    marginTop: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)',
      } as any,
      default: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.textDividers,
    backgroundColor: COLORS.bgWhite,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textHeader,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  saveOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.green60,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveOrderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgWhite,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.textDividers,
    marginHorizontal: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textHeader,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textHeader,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary60,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  phasesList: {
    flex: 1,
  },
  phasesListContent: {
    padding: 16,
    paddingBottom: 100,
  },
  dragHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  dragHintText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primary80,
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: COLORS.bgWhite,
    borderTopWidth: 1,
    borderTopColor: COLORS.textDividers,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary60,
    paddingVertical: 16,
    borderRadius: 14,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
});

