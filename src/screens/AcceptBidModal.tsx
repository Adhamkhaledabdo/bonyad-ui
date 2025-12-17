import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import { showError, showSuccess } from '../utils/alert';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

interface AcceptBidModalProps {
  visible: boolean;
  bid: {
    id: number;
    price: number;
    description?: string;
    comments?: string;
    technicianName?: string;
    technicianPhone?: string;
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const MAX_COMMENT_LENGTH = 500;

export default function AcceptBidModal({ visible, bid, onClose, onSuccess }: AcceptBidModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [acceptanceComment, setAcceptanceComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { alertState, hideAlert } = useAlertPopup();

  if (!bid) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US').format(price);
  };

  const handleAccept = async () => {
    // Validation
    if (acceptanceComment.length > MAX_COMMENT_LENGTH) {
      showError(t('Comment exceeds maximum length'), t('Error'));
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await storage.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.BIDS.ACCEPT, { id: bid.id });
      console.log('🚀 Accepting bid:', url);
      console.log('💰 Bid ID:', bid.id);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Server error: ${response.status}`);
      }

      console.log('✅ Bid accepted successfully!');
      
      showSuccess(t('Bid accepted successfully'), t('Success'), () => {
        setAcceptanceComment('');
        onSuccess?.();
        onClose();
      });
    } catch (error: any) {
      console.error('❌ Failed to accept bid:', error);
      showError(error.message || t('Failed to accept bid'), t('Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(20) }]}>
            {t('Accept Bid')}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Bid Summary Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
                {t('Bid Summary')}
              </Text>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground }]}>
              {/* Bid Price */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryRowLeft}>
                  <Ionicons name="cash" size={20} color={colors.primary} />
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
                    {t('Bid Price')}
                  </Text>
                </View>
                <Text style={[styles.summaryValue, { color: colors.primary, fontSize: scaledSize(18) }]}>
                  {formatPrice(bid.price)} {t('SAR')}
                </Text>
              </View>

              {/* Description */}
              {bid.description && (
                <View style={styles.summaryRow}>
                  <View style={styles.summaryRowLeft}>
                    <Ionicons name="document-text" size={20} color={colors.textSecondary} />
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
                      {t('Bid Description')}
                    </Text>
                  </View>
                </View>
              )}
              {bid.description && (
                <Text style={[styles.summaryText, { color: colors.text, fontSize: scaledSize(14) }]}>
                  {bid.description}
                </Text>
              )}

              {/* Comments */}
              {bid.comments && (
                <View style={styles.summaryRow}>
                  <View style={styles.summaryRowLeft}>
                    <Ionicons name="chatbubble" size={20} color={colors.textSecondary} />
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
                      {t('Additional Comments')}
                    </Text>
                  </View>
                </View>
              )}
              {bid.comments && (
                <Text style={[styles.summaryText, { color: colors.text, fontSize: scaledSize(14) }]}>
                  {bid.comments}
                </Text>
              )}
            </View>
          </View>

          {/* Acceptance Comment Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubbles" size={24} color="#FFA500" />
              <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
                {t('Acceptance Comment')}
              </Text>
              <Text style={[styles.optionalLabel, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                ({t('optional')})
              </Text>
            </View>

            <View style={[styles.commentContainer, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.commentHint, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                {t('Add a comment when accepting this bid...')}
              </Text>
              <TextInput
                style={[styles.commentInput, { color: colors.text }]}
                placeholder={t('Your comment here...')}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                maxLength={MAX_COMMENT_LENGTH}
                value={acceptanceComment}
                onChangeText={setAcceptanceComment}
                editable={!isSubmitting}
              />
              <View style={styles.charCounter}>
                <Text
                  style={[
                    styles.charCounterText,
                    {
                      color:
                        acceptanceComment.length > MAX_COMMENT_LENGTH
                          ? '#FF0000'
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {acceptanceComment.length}/{MAX_COMMENT_LENGTH}
                </Text>
              </View>
              {acceptanceComment.length > MAX_COMMENT_LENGTH && (
                <Text style={styles.charWarning}>{t('Character limit exceeded')}</Text>
              )}
            </View>
          </View>

          {/* Warning Section */}
          <View style={styles.section}>
            <View style={[styles.warningCard, { backgroundColor: '#FFF3CD' }]}>
              <Ionicons name="warning" size={24} color="#856404" />
              <Text style={styles.warningText}>
                {t('By accepting this bid, you agree to proceed with the project under these terms.')}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actionBar, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.cardBackground }]}
            onPress={onClose}
            disabled={isSubmitting}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text, fontSize: scaledSize(16) }]}>
              {t('Cancel')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: colors.primary }]}
            onPress={handleAccept}
            disabled={isSubmitting || acceptanceComment.length > MAX_COMMENT_LENGTH}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            )}
            <Text style={[styles.acceptButtonText, { fontSize: scaledSize(16) }]}>
              {isSubmitting ? t('Accepting...') : t('Accept Bid')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  optionalLabel: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryText: {
    fontSize: 14,
    marginTop: -8,
    lineHeight: 20,
  },
  commentContainer: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  commentHint: {
    fontSize: 14,
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  charCounter: {
    alignItems: 'flex-end',
  },
  charCounterText: {
    fontSize: 12,
  },
  charWarning: {
    color: '#FF0000',
    fontSize: 12,
    marginTop: -8,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

