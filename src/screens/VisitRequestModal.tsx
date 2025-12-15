/**
 * VisitRequestModal
 * 
 * Popup modal for technicians to request a site visit for a project.
 * Styled to match the app's Figma design system.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { showError, showSuccess } from '../utils/alert';

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

interface VisitRequestModalProps {
  visible: boolean;
  project: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function VisitRequestModal({ visible, project, onClose, onSuccess }: VisitRequestModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const IS_WEB = Platform.OS === 'web';
  const IS_MOBILE = Platform.OS === 'ios' || Platform.OS === 'android';
  
  // Larger modal dimensions
  const modalWidth = IS_WEB ? Math.min(520, screenWidth - 32) : screenWidth - 32;
  const modalMaxHeight = IS_MOBILE ? screenHeight - 100 : screenHeight * 0.85;

  const handleSubmit = async () => {
    if (!project || !project.id) {
      Alert.alert(t('Error'), 'Invalid project ID');
      return;
    }

    const token = await storage.getAuthToken();
    if (!token) {
      Alert.alert(t('Error'), 'No auth token found');
      return;
    }

    const userId = await storage.getUserId();
    if (!userId) {
      Alert.alert(t('Error'), 'No user ID found');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = buildApiUrl(API_ENDPOINTS.VISIT_REQUESTS.CREATE);
      console.log('🔍 Creating visit request on:', url);

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
          notes: notes.trim() || undefined,
        }),
      });

      console.log('📥 Create Visit Request Response:', response.status);

      if (response.ok) {
        showSuccess(t('Visit request sent successfully'));
        setTimeout(() => {
          setNotes('');
          onClose();
          onSuccess?.();
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to create visit request:', errorText);
        showError(t('Failed to send visit request'));
      }
    } catch (error) {
      console.error('❌ Error sending visit request:', error);
      showError(t('Error sending visit request'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setNotes('');
      onClose();
    }
  };

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(budget);
  };

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
                    <Ionicons name="home" size={28} color={COLORS.green80} />
                  </View>
                  <Text style={styles.headerTitle}>{t('Request Visit')}</Text>
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
                  <Text style={styles.subtitle}>
                    {t('Request a site visit to better understand the project requirements')}
                  </Text>

                  {/* Project Info Card */}
                  <View style={styles.projectCard}>
                    <View style={styles.projectCardHeader}>
                      <Ionicons name="briefcase-outline" size={16} color={COLORS.primary80} />
                      <Text style={styles.projectCardLabel}>{t('Project')}</Text>
                    </View>
                    <Text style={styles.projectDescription} numberOfLines={3}>
                      {project?.description || t('No description')}
                    </Text>
                    {project?.budget && (
                      <View style={styles.budgetRow}>
                        <Ionicons name="cash-outline" size={16} color={COLORS.green80} />
                        <Text style={styles.budgetText}>{formatBudget(project.budget)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Notes Input */}
                  <View style={styles.inputSection}>
                    <View style={styles.inputHeader}>
                      <Ionicons name="document-text-outline" size={16} color={COLORS.primary80} />
                      <Text style={styles.inputLabel}>{t('Additional Notes')}</Text>
                      <Text style={styles.optionalText}>({t('Optional')})</Text>
                    </View>
                    <TextInput
                      style={styles.textArea}
                      placeholder={t('Add any notes about the visit request...')}
                      placeholderTextColor={COLORS.textSecondary}
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                      numberOfLines={4}
                      maxLength={200}
                      editable={!isSubmitting}
                    />
                    <Text style={styles.charCount}>
                      {notes.length}/200
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
                    <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={COLORS.textWhite} />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color={COLORS.textWhite} />
                        <Text style={styles.submitButtonText}>{t('Send Request')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
  },
  scrollContentContainer: {
    padding: 20,
    gap: 20,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.textBody,
    lineHeight: 22,
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
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  budgetText: {
    fontSize: 16,
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
  optionalText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.green80,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
});
