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
import { API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import { showError } from '../utils/alert';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

interface UserPhaseViewPageProps {
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

export default function UserPhaseViewPage({
  project,
  onBack,
  onSuccess,
}: UserPhaseViewPageProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { alertState, hideAlert } = useAlertPopup();

  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [UserPhaseViewPage] ==========================================');
    console.log('🔵 [UserPhaseViewPage] ✅ PAGE OPENED');
    console.log('🔵 [UserPhaseViewPage] ==========================================');
    console.log('🔵 [UserPhaseViewPage] Project ID:', project.id);
    console.log('🔵 [UserPhaseViewPage] Project Status:', project.status?.toUpperCase());
    console.log('🔵 [UserPhaseViewPage] Status: APPROVED');
    console.log('🔵 [UserPhaseViewPage] User can view phases while technician is planning');
    console.log('═══════════════════════════════════════════════════════════');
    loadPhases();
  }, [project]);

  const loadPhases = async () => {
    try {
      setIsLoading(true);
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'), t('Error'));
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, {
        projectId: project.id,
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔵 [UserPhaseViewPage] Loaded phases:', data.length);
        setPhases(data);
      } else {
        showError(t('Failed to load phases'), t('Error'));
      }
    } catch (error: any) {
      console.error('❌ [UserPhaseViewPage] Error loading phases:', error);
      showError(error.message || t('Failed to load phases'), t('Error'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('View Phases')}
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
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('Loading phases...')}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {t('The technician is currently planning phases for this project. You can view the phases here.')}
            </Text>
          </View>

          {phases.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-outline" size={80} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('No phases planned yet')}
              </Text>
            </View>
          ) : (
            phases.map((phase) => (
              <View
                key={phase.id}
                style={[styles.phaseCard, { backgroundColor: colors.cardBackground }]}
              >
                <View style={styles.phaseHeader}>
                  <View style={styles.phaseHeaderLeft}>
                    <View style={[styles.phaseNumber, { backgroundColor: colors.primary + '10' }]}>
                      <Text style={[styles.phaseNumberText, { color: colors.primary }]}>
                        {phase.phaseNumber}
                      </Text>
                    </View>
                    <Text style={[styles.phaseTitle, { color: colors.text }]}>
                      {t('Phase')} {phase.phaseNumber}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.phaseDescription, { color: colors.textSecondary }]}>
                  {phase.description}
                </Text>

                <View style={styles.phaseDetails}>
                  <View style={styles.phaseDetailItem}>
                    <Ionicons name="cash-outline" size={16} color="#10B981" />
                    <Text style={[styles.phaseDetailText, { color: colors.text }]}>
                      {formatBudget(phase.moneySpent)} {t('SAR')}
                    </Text>
                  </View>
                  <View style={styles.phaseDetailItem}>
                    <Ionicons name="time-outline" size={16} color="#F59E0B" />
                    <Text style={[styles.phaseDetailText, { color: colors.text }]}>
                      {Math.ceil(phase.timeSpentDays / 7)} {t('weeks')}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
      
      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  phaseCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  phaseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phaseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  phaseDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  phaseDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  phaseDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phaseDetailText: {
    fontSize: 14,
  },
});

