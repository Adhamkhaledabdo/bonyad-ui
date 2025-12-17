/**
 * BidFormModal
 * 
 * Popup modal for technicians to submit a bid for a project.
 * Styled to match the app's Figma design system.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { showSuccess, showError } from '../utils/alert';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

// ===== DESIGN TOKENS FROM FIGMA =====
const COLORS = {
  // Primary Blues
  primary100: '#003867',
  primary80: '#004A8A',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary50: '#1A6DB4',
  primary10: '#E6EFF7',
  // Greens
  green90: '#007B36',
  green80: '#008B3E',
  green60: '#00AC4F',
  green10: '#E6F5EC',
  // Purple
  purple100: '#3C076D',
  purple10: '#EFE6F5',
  // Amber
  amber60: '#FFB703',
  amber10: '#FFF8E6',
  // Text
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  textWhite: '#FFFFFF',
  // Backgrounds
  bgWhite: '#FFFFFF',
  bgOverlay: 'rgba(0, 56, 103, 0.5)',
};

interface BidFormModalProps {
  visible: boolean;
  project: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BidFormModal({ visible, project, onClose, onSuccess }: BidFormModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [bidPrice, setBidPrice] = useState('');
  const [bidDescription, setBidDescription] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const IS_WEB = Platform.OS === 'web';
  const IS_MOBILE = Platform.OS === 'ios' || Platform.OS === 'android';
  
  // Custom popup hooks
  const { alertState, showError: showErrorAlert, hideAlert } = useAlertPopup();
  
  // Larger modal dimensions - matching VisitRequestModal
  const modalWidth = IS_WEB ? Math.min(520, screenWidth - 32) : screenWidth - 32;
  const modalMaxHeight = IS_MOBILE ? screenHeight - 100 : screenHeight * 0.85;

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(budget);
  };

  const getServiceName = () => {
    if (!project) return '';
    if (i18n.language === 'ar') {
      return project.serviceNameAr || '';
    }
    return project.serviceNameEn || '';
  };

  const submitBid = async () => {
    // Validation
    if (!bidPrice || parseFloat(bidPrice) <= 0) {
      showErrorAlert(t('Please enter a valid price'), t('Error'));
      return;
    }

    if (!bidDescription.trim()) {
      showErrorAlert(t('Please enter bid description'), t('Error'));
      return;
    }

    if (!estimatedDays || parseInt(estimatedDays) <= 0) {
      showErrorAlert(t('Please enter valid duration'), t('Error'));
      return;
    }

    if (!project || !project.id) {
      showErrorAlert('Invalid project ID', t('Error'));
      return;
    }

    const token = await storage.getAuthToken();
    if (!token) {
      showErrorAlert('No auth token found', t('Error'));
      return;
    }

    setIsSubmitting(true);

    try {
      const url = buildApiUrl(API_ENDPOINTS.BIDS.CREATE);
      console.log('🔍 Creating bid on:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          proposedBudget: parseFloat(bidPrice),
          estimatedDurationDays: parseInt(estimatedDays),
          comment: bidDescription.trim(),
        }),
      });

      console.log('📥 Create Bid Response:', response.status);

      if (response.ok) {
        showSuccess(t('Bid submitted successfully'));
        setTimeout(() => {
          setBidPrice('');
          setBidDescription('');
          setEstimatedDays('');
          onClose();
          onSuccess?.();
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to create bid:', errorText);
        showError(t('Failed to submit bid'));
      }
    } catch (error) {
      console.error('❌ Error submitting bid:', error);
      showError(t('Error submitting bid'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setBidPrice('');
      setBidDescription('');
      setEstimatedDays('');
      onClose();
    }
  };

  const isSubmitDisabled = isSubmitting || !bidPrice || !bidDescription || !estimatedDays;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              <View style={[styles.modalContainer, { width: modalWidth, maxHeight: modalMaxHeight }]}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerIconContainer}>
                    <Ionicons name="cash" size={28} color={COLORS.green80} />
                  </View>
                  <Text style={[styles.headerTitle, { fontSize: scaledSize(20) }]}>{t('Place Bid')}</Text>
                  <TouchableOpacity 
                    onPress={handleClose} 
                    style={styles.closeButton}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView 
                  style={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContentContainer}
                >
                  {/* Project Info Card */}
                  <View style={styles.projectCard}>
                    <View style={styles.projectCardHeader}>
                      <Ionicons name="briefcase-outline" size={16} color={COLORS.primary80} />
                      <Text style={styles.projectCardLabel}>{t('Project')}</Text>
                    </View>
                    <Text style={styles.projectDescription} numberOfLines={3}>
                      {project?.description || t('No description')}
                    </Text>
                    <View style={styles.projectMeta}>
                      {getServiceName() && (
                        <View style={styles.serviceBadge}>
                          <Text style={styles.serviceText}>{getServiceName()}</Text>
                        </View>
                      )}
                      {project?.budget && (
                        <View style={styles.budgetRow}>
                          <Text style={styles.budgetLabel}>{t('Budget')}:</Text>
                          <Text style={styles.budgetText}>{formatBudget(project.budget)}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Bid Price Input */}
                  <View style={styles.inputSection}>
                    <View style={styles.inputHeader}>
                      <Ionicons name="cash-outline" size={16} color={COLORS.green80} />
                      <Text style={[styles.inputLabel, { color: COLORS.green80 }]}>{t('Your Bid Price')}</Text>
                      <Text style={styles.requiredText}>*</Text>
                    </View>
                    <View style={styles.priceInputContainer}>
                      <TextInput
                        style={styles.priceInput}
                        placeholder="0"
                        placeholderTextColor={COLORS.textSecondary}
                        value={bidPrice}
                        onChangeText={setBidPrice}
                        keyboardType="decimal-pad"
                        editable={!isSubmitting}
                      />
                      <View style={styles.currencyBadge}>
                        <Text style={styles.currencyText}>SAR</Text>
                      </View>
                    </View>
                  </View>

                  {/* Duration Input */}
                  <View style={styles.inputSection}>
                    <View style={styles.inputHeader}>
                      <Ionicons name="time-outline" size={16} color={COLORS.primary80} />
                      <Text style={styles.inputLabel}>{t('Estimated Duration')}</Text>
                      <Text style={styles.requiredText}>*</Text>
                    </View>
                    <View style={styles.durationInputContainer}>
                      <TextInput
                        style={styles.durationInput}
                        placeholder="0"
                        placeholderTextColor={COLORS.textSecondary}
                        value={estimatedDays}
                        onChangeText={setEstimatedDays}
                        keyboardType="number-pad"
                        editable={!isSubmitting}
                      />
                      <View style={styles.daysBadge}>
                        <Ionicons name="calendar-outline" size={16} color={COLORS.primary80} />
                        <Text style={styles.daysText}>{t('Days')}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Description Input */}
                  <View style={styles.inputSection}>
                    <View style={styles.inputHeader}>
                      <Ionicons name="document-text-outline" size={16} color={COLORS.amber60} />
                      <Text style={[styles.inputLabel, { color: COLORS.amber60 }]}>{t('Proposal Description')}</Text>
                      <Text style={styles.requiredText}>*</Text>
                    </View>
                    <TextInput
                      style={styles.textArea}
                      placeholder={t('Describe your approach, experience, and why you are the best fit for this project...')}
                      placeholderTextColor={COLORS.textSecondary}
                      value={bidDescription}
                      onChangeText={setBidDescription}
                      multiline
                      numberOfLines={4}
                      maxLength={500}
                      editable={!isSubmitting}
                    />
                    <Text style={styles.charCount}>
                      {bidDescription.length}/500
                    </Text>
                  </View>
                </ScrollView>

                {/* Action Buttons - Fixed at bottom */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleClose}
                    disabled={isSubmitting}
                  >
                    <Text style={[styles.cancelButtonText, { fontSize: scaledSize(16) }]}>{t('Cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.submitButton, 
                      isSubmitDisabled && styles.submitButtonDisabled
                    ]}
                    onPress={submitBid}
                    disabled={isSubmitDisabled}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={COLORS.textWhite} />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color={COLORS.textWhite} />
                        <Text style={[styles.submitButtonText, { fontSize: scaledSize(16) }]}>{t('Submit Bid')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
      
      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardView: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContainer: {
    backgroundColor: COLORS.bgWhite,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 4px 24px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.textDividers,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.green10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textHeader,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 0,
    maxHeight: 400,
  },
  scrollContentContainer: {
    padding: 20,
    gap: 20,
  },
  projectCard: {
    backgroundColor: COLORS.primary10,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  projectCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary80,
  },
  projectDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textBody,
    lineHeight: 20,
  },
  projectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  serviceBadge: {
    backgroundColor: COLORS.bgWhite,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  serviceText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary80,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  budgetLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  budgetText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.green80,
  },
  inputSection: {
    gap: 10,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary80,
  },
  requiredText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Keep right-side unit pills consistent width (SAR / Days)
  unitBadge: {
    width: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.green80,
    backgroundColor: COLORS.green10,
    color: COLORS.green80,
    textAlign: 'center',
  },
  currencyBadge: {
    // Keep same width as Days badge
    width: 96,
    backgroundColor: COLORS.green10,
    borderWidth: 1,
    borderColor: COLORS.green80,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.green80,
  },
  durationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  durationInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '500',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    // Match money input style but in blue
    borderColor: COLORS.primary80,
    backgroundColor: COLORS.primary10,
    color: COLORS.primary80,
    textAlign: 'center',
  },
  daysBadge: {
    // Keep same width as SAR badge
    width: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary10,
    borderWidth: 1,
    borderColor: COLORS.primary80,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  daysText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary80,
  },
  textArea: {
    fontSize: 15,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.textDividers,
    backgroundColor: COLORS.bgWhite,
    textAlignVertical: 'top',
    minHeight: 120,
    color: COLORS.textBody,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.textDividers,
    backgroundColor: COLORS.bgWhite,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.purple10,
    borderWidth: 1.5,
    borderColor: COLORS.purple100,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.purple100,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.primary60,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
});
