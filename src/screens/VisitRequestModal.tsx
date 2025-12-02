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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { showAlert, showError, showSuccess } from '../utils/alert';

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
          requestedDate: new Date().toISOString(), // Use current date as default
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
        showError('Failed to send visit request');
      }
    } catch (error) {
      console.error('❌ Error sending visit request:', error);
      showError('Error sending visit request');
    } finally {
      setIsSubmitting(false);
    }
  };


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
              <Text style={styles.cancelText}>{t('Cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t('Request Visit')}
            </Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[
                styles.submitButton,
                isSubmitting && { opacity: 0.6 }
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.submitText}>{t('Send')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="home" size={50} color="#10B981" />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              {t('Request Visit')}
            </Text>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('Request a site visit to better understand the project requirements')}
            </Text>

            {/* Project Info */}
            <View style={styles.projectInfoCard}>
              <Text style={[styles.projectInfoLabel, { color: colors.text }]}>
                {t('Project Information')}
              </Text>
              <Text style={[styles.projectTitle, { color: colors.textSecondary }]} numberOfLines={2}>
                {project?.description}
              </Text>
            </View>

            {/* Notes */}
            <View style={styles.notesSection}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                {t('Additional Notes')}
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  { color: colors.text, borderColor: colors.border }
                ]}
                placeholder={t('Any additional information...')}
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                maxLength={200}
              />
              <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                {notes.length}/200
              </Text>
            </View>
          </View>
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
  cancelText: {
    fontSize: 16,
    color: '#FF4444',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  projectInfoCard: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  projectInfoLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  notesSection: {
    marginBottom: 24,
  },
  textArea: {
    fontSize: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
});

