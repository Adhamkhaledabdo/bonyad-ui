import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ContractViewerModal from './ContractViewerModal';

interface UserContractSigningPageProps {
  project: any;
  onBack: () => void;
  onSuccess?: () => void;
}

export default function UserContractSigningPage({
  project,
  onBack,
  onSuccess,
}: UserContractSigningPageProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [showContractModal, setShowContractModal] = useState(false);

  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [UserContractSigningPage] ==========================================');
    console.log('🔵 [UserContractSigningPage] ✅ PAGE OPENED');
    console.log('🔵 [UserContractSigningPage] ==========================================');
    console.log('🔵 [UserContractSigningPage] Project ID:', project.id);
    console.log('🔵 [UserContractSigningPage] Project Status:', project.status?.toUpperCase());
    console.log('🔵 [UserContractSigningPage] Status: CONTRACT_SIGNING');
    console.log('🔵 [UserContractSigningPage] User can view contract, waiting for technician to sign');
    console.log('═══════════════════════════════════════════════════════════');
  }, [project]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('Contract Signing')}
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
        <View style={[styles.waitingCard, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="hourglass-outline" size={64} color={colors.primary} />
          <Text style={[styles.waitingTitle, { color: colors.text }]}>
            {t('Waiting for Technician to Sign')}
          </Text>
          <Text style={[styles.waitingText, { color: colors.textSecondary }]}>
            {t('The contract is ready. Please wait for the technician to sign the contract before work can begin.')}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            console.log('🔵 [UserContractSigningPage] Opening contract viewer');
            setShowContractModal(true);
          }}
        >
          <Ionicons name="document-text-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>
            {t('View Contract')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Contract Viewer Modal */}
      {project && (
        <ContractViewerModal
          visible={showContractModal}
          projectId={project.id}
          projectDetails={{
            description: project.description,
            budget: project.budget,
            address: project.address,
            technicianName: project.technicianName,
            technicianId: project.technicianId,
            userName: project.userName,
          }}
          onClose={() => {
            console.log('🔵 [UserContractSigningPage] Contract modal closed');
            setShowContractModal(false);
          }}
          onSign={onSuccess}
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
  waitingCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    marginBottom: 16,
    gap: 16,
  },
  waitingTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  waitingText: {
    fontSize: 14,
    textAlign: 'center',
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

