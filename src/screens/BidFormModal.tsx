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
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';

interface BidFormModalProps {
  visible: boolean;
  project: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BidFormModal({ visible, project, onClose, onSuccess }: BidFormModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [bidPrice, setBidPrice] = useState('');
  const [bidDescription, setBidDescription] = useState('');
  const [bidComments, setBidComments] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showSuccessFeedback = (message: string, onDismiss: () => void) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
      onDismiss();
    } else {
      Alert.alert(t('Success'), message, [
        {
          text: t('OK'),
          onPress: onDismiss,
        },
      ]);
    }
  };

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
      Alert.alert(t('Error'), t('Please enter a valid price'));
      return;
    }

    if (!bidDescription.trim()) {
      Alert.alert(t('Error'), t('Please enter bid description'));
      return;
    }

    if (!estimatedDays || parseInt(estimatedDays) <= 0) {
      Alert.alert(t('Error'), t('Please enter valid duration'));
      return;
    }

    if (!project || !project.id) {
      Alert.alert(t('Error'), 'Invalid project ID');
      return;
    }

    const token = await storage.getAuthToken();
    if (!token) {
      Alert.alert(t('Error'), 'No auth token found');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = buildApiUrl(API_ENDPOINTS.BIDS.CREATE);
      console.log('🔍 Creating bid on:', url);

      // Combine description and comments
      const fullComment = bidComments.trim() 
        ? `${bidDescription.trim()}\n\n${bidComments.trim()}`
        : bidDescription.trim();

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
          comment: fullComment,
        }),
      });

      console.log('📥 Create Bid Response:', response.status);

      if (response.ok) {
        const handleDismiss = () => {
          setBidPrice('');
          setBidDescription('');
          setBidComments('');
          setEstimatedDays('');
          onClose();
          onSuccess?.();
        };

        showSuccessFeedback(t('Bid submitted successfully'), handleDismiss);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to create bid:', errorText);
        Alert.alert(t('Error'), 'Failed to submit bid');
      }
    } catch (error) {
      console.error('❌ Error submitting bid:', error);
      Alert.alert(t('Error'), 'Error submitting bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting || !bidPrice || !bidDescription || !estimatedDays;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Math.max(insets.top, 10) }]}>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <View style={styles.cancelButton}>
                <Ionicons name="close" size={24} color="#FF4444" />
                <Text style={styles.cancelText}>{t('Cancel')}</Text>
              </View>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t('Place Bid')}
            </Text>
            <TouchableOpacity
              onPress={submitBid}
              disabled={isSubmitDisabled}
              style={[
                styles.submitButton,
                isSubmitDisabled && { opacity: 0.6 }
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                  <Text style={styles.submitText}>{t('Submit Bid')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Project Info */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle" size={28} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('Project Info')}
                </Text>
              </View>
              <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.projectDescription, { color: colors.textSecondary }]} numberOfLines={3}>
                  {project?.description}
                </Text>
                <View style={styles.projectDetails}>
                  <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.categoryText, { color: colors.primary }]}>
                      {getServiceName()}
                    </Text>
                  </View>
                  <View style={styles.budgetRow}>
                    <Text style={[styles.budgetAmount, { color: colors.primary }]}>
                      {formatBudget(project?.budget || 0)}
                    </Text>
                    <Text style={[styles.budgetCurrency, { color: colors.textSecondary }]}>SAR</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bid Price */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="cash" size={28} color="#10B981" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('Bid Price')}
                </Text>
              </View>
              <View style={[styles.inputCard, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.priceInputRow}>
                  <TextInput
                    style={[
                      styles.priceInput,
                      { color: colors.text, borderColor: bidPrice ? colors.primary : colors.border }
                    ]}
                    placeholder={t('Enter price')}
                    placeholderTextColor={colors.textSecondary}
                    value={bidPrice}
                    onChangeText={setBidPrice}
                    keyboardType="decimal-pad"
                  />
                  <View style={[styles.currencyBadge, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.currencyText, { color: colors.primary }]}>SAR</Text>
                  </View>
                </View>
                {bidPrice && parseFloat(bidPrice) > 0 && (
                  <View style={styles.priceInfo}>
                    <Text style={[styles.priceInfoText, { color: '#10B981' }]}>
                      {formatBudget(parseFloat(bidPrice))} {t('SAR')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Bid Description */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={28} color="#F59E0B" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('Bid Description')}
                </Text>
              </View>
              <View style={[styles.inputCard, { backgroundColor: colors.cardBackground }]}>
                <TextInput
                  style={[
                    styles.textArea,
                    { color: colors.text, borderColor: bidDescription ? '#F59E0B' : colors.border }
                  ]}
                  placeholder={t('Describe your bid')}
                  placeholderTextColor={colors.textSecondary}
                  value={bidDescription}
                  onChangeText={setBidDescription}
                  multiline
                  numberOfLines={6}
                  maxLength={500}
                />
                <View style={styles.charCount}>
                  <Text style={[styles.charCountText, { color: colors.textSecondary }]}>
                    {bidDescription.length}/500
                  </Text>
                  {bidDescription.length > 450 && (
                    <Text style={styles.warningText}>
                      {t('Approaching limit')}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Additional Comments */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="chatbubbles" size={28} color="#8B5CF6" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('Additional Comments')}
                </Text>
                <View style={[styles.optionalBadge, { backgroundColor: colors.border }]}>
                  <Text style={[styles.optionalText, { color: colors.textSecondary }]}>
                    {t('Optional')}
                  </Text>
                </View>
              </View>
              <View style={[styles.inputCard, { backgroundColor: colors.cardBackground }]}>
                <TextInput
                  style={[
                    styles.textArea,
                    { color: colors.text, borderColor: bidComments ? '#8B5CF6' : colors.border }
                  ]}
                  placeholder={t('Any special requests')}
                  placeholderTextColor={colors.textSecondary}
                  value={bidComments}
                  onChangeText={setBidComments}
                  multiline
                  numberOfLines={4}
                  maxLength={200}
                />
                <View style={styles.charCount}>
                  <Text style={[styles.charCountText, { color: colors.textSecondary }]}>
                    {bidComments.length}/200
                  </Text>
                  {bidComments.length > 180 && (
                    <Text style={styles.warningText}>
                      {t('Approaching limit')}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Estimated Duration */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time" size={28} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('Estimated Duration')}
                </Text>
              </View>
              <View style={[styles.inputCard, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.durationInputRow}>
                  <TextInput
                    style={[
                      styles.durationInput,
                      { color: colors.text, borderColor: estimatedDays ? colors.primary : colors.border }
                    ]}
                    placeholder={t('Enter days')}
                    placeholderTextColor={colors.textSecondary}
                    value={estimatedDays}
                    onChangeText={setEstimatedDays}
                    keyboardType="number-pad"
                  />
                  <View style={[styles.durationBadge, { backgroundColor: colors.primary + '10' }]}>
                    <Ionicons name="calendar" size={20} color={colors.primary} />
                    <Text style={[styles.durationText, { color: colors.primary }]}>
                      {t('Days')}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF4444',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  projectDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  projectDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  budgetAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  budgetCurrency: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputCard: {
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  currencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  currencyText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  priceInfo: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  priceInfoText: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#10B98120',
  },
  textArea: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  charCount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  charCountText: {
    fontSize: 12,
  },
  warningText: {
    fontSize: 12,
    color: '#F59E0B',
  },
  optionalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  optionalText: {
    fontSize: 12,
    fontWeight: '500',
  },
  durationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  durationInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

