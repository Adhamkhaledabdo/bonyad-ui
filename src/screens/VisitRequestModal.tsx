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
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

// Design tokens - now using theme colors
// Removed hardcoded COLORS constant - using theme colors from useTheme hook

interface VisitRequestModalProps {
  visible: boolean;
  project: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function VisitRequestModal({ visible, project, onClose, onSuccess }: VisitRequestModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const IS_WEB = Platform.OS === 'web';
  const IS_MOBILE = Platform.OS === 'ios' || Platform.OS === 'android';
  
  // Custom popup hooks
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  
  // Larger modal dimensions
  const modalWidth = IS_WEB ? Math.min(520, screenWidth - 32) : screenWidth - 32;
  const modalMaxHeight = IS_MOBILE ? screenHeight - 100 : screenHeight * 0.85;

  const handleSubmit = async () => {
    if (!project || !project.id) {
      showError(t('Invalid project ID'), t('Error'));
      return;
    }

    const token = await storage.getAuthToken();
    if (!token) {
      showError(t('No auth token found'), t('Error'));
      return;
    }

    const userId = await storage.getUserId();
    if (!userId) {
      showError(t('No user ID found'), t('Error'));
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
        showSuccess(t('Visit request sent successfully'), t('Success'));
        setTimeout(() => {
          setNotes('');
          onClose();
          onSuccess?.();
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to create visit request:', errorText);
        showError(t('Failed to send visit request'), t('Error'));
      }
    } catch (error) {
      console.error('❌ Error sending visit request:', error);
      showError(t('Error sending visit request'), t('Error'));
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
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              <View style={[styles.modalContainer, { width: modalWidth, maxHeight: modalMaxHeight, backgroundColor: colors.cardBackground }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                  <View style={[styles.headerIconContainer, { backgroundColor: colors.success + '20' }]}>
                    <Ionicons name="home" size={28} color={colors.success} />
                  </View>
                  <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Request Visit')}</Text>
                  <TouchableOpacity 
                    onPress={handleClose} 
                    style={[styles.closeButton, { backgroundColor: colors.primary + '20' }]}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView 
                  style={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContentContainer}
                >
                  <Text style={[styles.subtitle, { color: colors.text }]}>
                    {t('Request a site visit to better understand the project requirements')}
                  </Text>

                  {/* Project Info Card */}
                  <View style={[styles.projectCard, { backgroundColor: colors.primary + '10' }]}>
                    <View style={styles.projectCardHeader}>
                      <Ionicons name="briefcase-outline" size={16} color={colors.primary} />
                      <Text style={[styles.projectCardLabel, { color: colors.primary }]}>{t('Project')}</Text>
                    </View>
                    <Text style={[styles.projectDescription, { color: colors.text }]} numberOfLines={3}>
                      {project?.description || t('No description')}
                    </Text>
                    {project?.budget && (
                      <View style={styles.budgetRow}>
                        <Ionicons name="cash-outline" size={16} color={colors.success} />
                        <Text style={[styles.budgetText, { color: colors.success }]}>{formatBudget(project.budget)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Notes Input */}
                  <View style={styles.inputSection}>
                    <View style={styles.inputHeader}>
                      <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                      <Text style={[styles.inputLabel, { color: colors.primary }]}>{t('Additional Notes')}</Text>
                      <Text style={[styles.optionalText, { color: colors.textSecondary }]}>({t('Optional')})</Text>
                    </View>
                    <TextInput
                      style={[styles.textArea, { borderColor: colors.border, backgroundColor: (colors as any).textFieldBackground || colors.cardBackground, color: colors.text }]}
                      placeholder={t('Add any notes about the visit request...')}
                      placeholderTextColor={colors.textSecondary}
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                      numberOfLines={4}
                      maxLength={200}
                      editable={!isSubmitting}
                    />
                    <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                      {notes.length}/200
                    </Text>
                  </View>
                </ScrollView>

                {/* Action Buttons - Fixed at bottom */}
                <View style={[styles.actionButtons, { borderTopColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1.5 }]}
                    onPress={handleClose}
                    disabled={isSubmitting}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.text }]}>{t('Cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: colors.success }, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color={colors.white} />
                        <Text style={[styles.submitButtonText, { color: colors.white }]}>{t('Send Request')}</Text>
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
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    lineHeight: 22,
  },
  projectCard: {
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
  },
  projectDescription: {
    fontSize: 14,
    fontWeight: '400',
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
  },
  optionalText: {
    fontSize: 12,
    fontWeight: '400',
  },
  textArea: {
    fontSize: 15,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
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
  },
});
