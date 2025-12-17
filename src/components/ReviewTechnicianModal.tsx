import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { submitTechnicianReview, updateReview } from '../services/ReviewService';
import AlertPopup, { useAlertPopup } from './AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from './ConfirmationPopup';

interface ReviewTechnicianModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: number;
  technicianId: number;
  technicianName: string;
  onReviewSubmitted?: () => void;
  mode?: 'create' | 'edit';
  existingReview?: {
    id: number;
    rating: number;
    comment?: string | null;
  } | null;
}

export default function ReviewTechnicianModal({
  visible,
  onClose,
  projectId,
  technicianId,
  technicianName,
  onReviewSubmitted,
  mode = 'create',
  existingReview,
}: ReviewTechnicianModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Custom popup hooks
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showConfirmation, hideConfirmation } = useConfirmationPopup();

  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && existingReview) {
        setRating(existingReview.rating || 0);
        setComment(existingReview.comment || '');
      } else {
        setRating(0);
        setComment('');
      }
    }
  }, [visible, mode, existingReview]);

  const handleSubmit = () => {
    if (rating === 0) {
      showError(t('Please select a rating'), t('Error'));
      return;
    }
    
    // Show confirmation modal
    const isEdit = mode === 'edit' && existingReview?.id;
    showConfirmation(
      isEdit ? t('Update Review') : t('Submit Review'),
      t('Rate {{name}} {{rating}} stars?', {
        name: technicianName || t('this technician'),
        rating: rating,
      }),
      async () => {
        await executeSubmit();
      }
    );
  };

  const executeSubmit = async () => {
    setIsSubmitting(true);
    console.log('📋 [ReviewTechnicianModal] projectId prop:', projectId);
    console.log('📋 [ReviewTechnicianModal] technicianId prop:', technicianId);

    try {
      const isEdit = mode === 'edit' && existingReview?.id;
      console.log('🔵 [ReviewTechnicianModal] Submitting review...');
      const result = isEdit
        ? await updateReview(existingReview!.id, rating, comment, projectId)
        : await submitTechnicianReview(technicianId, rating, comment, projectId);
      
      console.log('✅ [ReviewTechnicianModal] Review submitted successfully');
      console.log('✅ [ReviewTechnicianModal] Result:', result);
      
      // Show success message
      showSuccess(
        isEdit ? t('Review updated successfully') : t('Thank you for your review!'),
        t('Success'),
        () => {
          // Reset form
          setRating(0);
          setComment('');
          
          // Notify parent
          if (onReviewSubmitted) {
            onReviewSubmitted();
          }
          
          // Close modal
          onClose();
        }
      );
    } catch (error: any) {
      console.error('❌ [ReviewTechnicianModal] Error submitting review:', error);
      showError(error.message || t('Failed to submit review'), t('Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1:
        return t('⭐ Poor');
      case 2:
        return t('⭐⭐ Fair');
      case 3:
        return t('⭐⭐⭐ Good');
      case 4:
        return t('⭐⭐⭐⭐ Very Good');
      case 5:
        return t('⭐⭐⭐⭐⭐ Excellent');
      default:
        return '';
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                
                <View style={[styles.headerIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="person-check" size={60} color={colors.primary} />
                </View>
                
                <Text style={[styles.title, { color: colors.text }]}>
                  {t('Review Technician')}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {t('How was your experience with {{name}}?', {
                    name: technicianName || t('this technician'),
                  })}
                </Text>
              </View>
              
              {/* Rating Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('Select Rating')}
                </Text>
                
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRating(star)}
                      style={styles.starButton}
                    >
                      <Ionicons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={40}
                        color={star <= rating ? colors.primary : colors.border}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                
                {rating > 0 && (
                  <Text style={[styles.ratingText, { color: colors.primary }]}>
                    {getRatingText(rating)}
                  </Text>
                )}
              </View>
              
              {/* Comment Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('Add Comment')} ({t('Optional')})
                </Text>
                
                <TextInput
                  style={[
                    styles.commentInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder={t('Share more about your experience...')}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={5}
                  value={comment}
                  onChangeText={setComment}
                  textAlignVertical="top"
                  maxLength={500}
                />
                
                <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
                  {comment.length} / 500 {t('characters')}
                </Text>
              </View>
              
              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: rating === 0 ? colors.border : colors.primary },
                  rating === 0 && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={rating === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>
                      {mode === 'edit' ? t('Update Review') : t('Submit Review')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      
      {/* Confirmation Popup */}
      <ConfirmationPopup
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmStyle={confirmState.confirmStyle}
        icon={confirmState.icon}
        onConfirm={confirmState.onConfirm}
        onCancel={hideConfirmation}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        justifyContent: 'center',
        alignItems: 'center',
      },
    }),
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 600,
        borderRadius: 20,
        maxHeight: '90vh',
      },
    }),
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  headerIcon: {
    marginBottom: 12,
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

