/**
 * PhaseEditingPage
 * 
 * Wrapper screen that displays the PhaseManagementModal for technicians.
 * Used when project status is APPROVED or PHASE_PLANNING.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PhaseManagementModal from '../components/PhaseManagementModal';

interface PhaseEditingPageProps {
  project: any;
  onBack: () => void;
  onSuccess?: () => void;
}

export default function PhaseEditingPage({
  project,
  onBack,
  onSuccess,
}: PhaseEditingPageProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [showPhaseModal, setShowPhaseModal] = useState(true);

  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🟡 [PhaseEditingPage] ==========================================');
    console.log('🟡 [PhaseEditingPage] ✅ PAGE OPENED');
    console.log('🟡 [PhaseEditingPage] ==========================================');
    console.log('🟡 [PhaseEditingPage] Project ID:', project.id);
    console.log('🟡 [PhaseEditingPage] Project Status:', project.status?.toUpperCase());
    console.log('🟡 [PhaseEditingPage] Status: APPROVED or PHASE_PLANNING');
    console.log('🟡 [PhaseEditingPage] Technician can edit phases and view feedback');
    console.log('═══════════════════════════════════════════════════════════');
  }, [project]);

  const handlePhaseModalClose = () => {
    console.log('🟡 [PhaseEditingPage] Phase modal closed');
    setShowPhaseModal(false);
    onBack();
  };

  const handlePhaseModalSuccess = () => {
    console.log('🟡 [PhaseEditingPage] Phase modal success - reloading...');
    onSuccess?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Phase Management Modal */}
      <PhaseManagementModal
          visible={showPhaseModal}
          projectId={project.id}
        onClose={handlePhaseModalClose}
          onSuccess={handlePhaseModalSuccess}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
