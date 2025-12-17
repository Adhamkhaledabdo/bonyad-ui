import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ContractViewerModal from './ContractViewerModal';

interface ContractSigningPageProps {
  project: any;
  onBack: () => void;
  onSuccess?: () => void;
}

export default function ContractSigningPage({
  project,
  onBack,
  onSuccess,
}: ContractSigningPageProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [showContractModal, setShowContractModal] = useState(false);

  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🟠 [ContractSigningPage] ==========================================');
    console.log('🟠 [ContractSigningPage] ✅ PAGE OPENED');
    console.log('🟠 [ContractSigningPage] ==========================================');
    console.log('🟠 [ContractSigningPage] Project ID:', project.id);
    console.log('🟠 [ContractSigningPage] Project Status:', project.status?.toUpperCase());
    console.log('🟠 [ContractSigningPage] Status: CONTRACT_SIGNING');
    console.log('🟠 [ContractSigningPage] Technician can view and sign contract');
    console.log('═══════════════════════════════════════════════════════════');
  }, [project]);

  const handleContractSign = () => {
    console.log('🟠 [ContractSigningPage] Contract signed - reloading...');
    onSuccess?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
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
        <View style={styles.infoCard}>
          <Ionicons name="document-text-outline" size={48} color={colors.primary} />
          <Text style={[styles.infoTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
            {t('Contract Ready for Signing')}
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
            {t('The phases have been approved. Please review and sign the contract to proceed.')}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            console.log('🟠 [ContractSigningPage] Opening contract viewer');
            setShowContractModal(true);
          }}
        >
          <Ionicons name="document-text-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>
            {t('View & Sign Contract')}
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
            console.log('🟠 [ContractSigningPage] Contract modal closed');
            setShowContractModal(false);
          }}
          onSign={handleContractSign}
          isTechnician={true}
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
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoText: {
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

