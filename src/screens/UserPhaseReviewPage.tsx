import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrlWithParams, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import PhaseApprovalModal from './PhaseApprovalModal';

interface UserPhaseReviewPageProps {
  project: any;
  onBack: () => void;
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

export default function UserPhaseReviewPage({
  project,
  onBack,
  onSuccess,
}: UserPhaseReviewPageProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [showPhaseModal, setShowPhaseModal] = useState(false);

  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [UserPhaseReviewPage] ==========================================');
    console.log('🔵 [UserPhaseReviewPage] ✅ PAGE OPENED');
    console.log('🔵 [UserPhaseReviewPage] ==========================================');
    console.log('🔵 [UserPhaseReviewPage] Project ID:', project.id);
    console.log('🔵 [UserPhaseReviewPage] Project Status:', project.status?.toUpperCase());
    console.log('🔵 [UserPhaseReviewPage] Status: PHASE_PLANNING');
    console.log('🔵 [UserPhaseReviewPage] User can review phases, send feedback, and approve');
    console.log('═══════════════════════════════════════════════════════════');
  }, [project]);

  const handlePhaseModalSuccess = () => {
    console.log('🔵 [UserPhaseReviewPage] Phase modal success - reloading...');
    onSuccess?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('Review Phases')}
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

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            {t('Review the updated phases, send feedback, and approve to proceed to contract signing.')}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            console.log('🔵 [UserPhaseReviewPage] Opening phase review modal');
            setShowPhaseModal(true);
          }}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>
            {t('Review & Approve Phases')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary, marginTop: 12 }]}
          onPress={() => {
            console.log('🔵 [UserPhaseReviewPage] Opening feedback modal');
            setShowPhaseModal(true);
          }}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>
            {t('Send Feedback')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Phase Approval Modal */}
      {project && (
        <PhaseApprovalModal
          visible={showPhaseModal}
          projectId={project.id}
          onClose={() => {
            console.log('🔵 [UserPhaseReviewPage] Phase modal closed');
            setShowPhaseModal(false);
          }}
          onSuccess={handlePhaseModalSuccess}
          isTechnician={false}
        />
      )}
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
  content: {
    flex: 1,
    padding: 16,
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

