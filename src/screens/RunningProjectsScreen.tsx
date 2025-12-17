import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl, API_BASE_URL } from '../config/api';
import { storage } from '../utils/storage';
import PhaseApprovalModal from './PhaseApprovalModal';
import ContractViewerModal from './ContractViewerModal';

interface RunningProjectsScreenProps {
  onBack: () => void;
  isTechnician?: boolean;
  onShowProjectDetails?: (project: RunningProject) => void;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => void;
}

interface Phase {
  id: number;
  phaseNumber: number;
  description: string;
  moneySpent: number;
  timeSpentDays: number;
  paymentStatus: string;
  approved: boolean;
  completed: boolean;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface RunningProject {
  id: number;
  description: string;
  budget: number;
  status: string;
  category: string;
  address: string;
  latitude?: number;
  longitude?: number;
  assignedTechnicianId?: number;
  assignedTechnicianName?: string;
  assignedTechnicianProfileImage?: string;
  phases?: Phase[];
  createdAt: string;
  updatedAt: string;
}

export default function RunningProjectsScreen({ 
  onBack, 
  isTechnician = false,
  onShowProjectDetails,
  onOpenChat 
}: RunningProjectsScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<RunningProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<RunningProject | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        console.error('❌ No auth token found');
        Alert.alert(t('Error'), t('Please login to view projects'));
        return;
      }

      // Use different endpoint based on role
      const endpoint = isTechnician 
        ? API_ENDPOINTS.PROJECTS.MY_ASSIGNED 
        : API_ENDPOINTS.PROJECTS.MY_PROJECTS;

      const url = buildApiUrl(endpoint);
      console.log('🔍 Fetching running projects from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 Running Projects API Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded projects:', data);
        
        // For technicians, show ALL assigned projects (no filtering)
        // For users, only show running projects (with phases)
        if (!isTechnician) {
          const runningProjects = data.filter((project: RunningProject) => {
            const acceptableStatuses = [
              'ACCEPTED',
              'BID_ACCEPTED',
              'PHASE_PLANNING',
              'PHASE_PLANNING_APPROVED',
              'CONTRACT_SIGNED',
              'IN_PROGRESS'
            ];
            return acceptableStatuses.includes(project.status.toUpperCase());
          });
          console.log('📊 Filtered running projects (user):', runningProjects.length);
          setProjects(runningProjects);
        } else {
          // Technician: show all assigned projects
          console.log('📊 All assigned projects (technician):', data.length);
          setProjects(data);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load running projects - Status:', response.status);
        console.error('❌ Error response:', errorText);
        Alert.alert(t('Error'), t('Failed to load projects'));
      }
    } catch (error: any) {
      console.error('❌ Error loading running projects:', error);
      Alert.alert(t('Error'), error.message || t('Failed to load projects'));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('en-US').format(budget);
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACCEPTED':
      case 'BID_ACCEPTED':
        return '#10B981';
      case 'PHASE_PLANNING':
        return '#F59E0B';
      case 'PHASE_PLANNING_APPROVED':
        return '#3B82F6';
      case 'CONTRACT_SIGNED':
        return '#8B5CF6';
      case 'IN_PROGRESS':
        return '#EF4444';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACCEPTED':
      case 'BID_ACCEPTED':
        return t('Bid Accepted');
      case 'PHASE_PLANNING':
        return t('Phase Planning');
      case 'PHASE_PLANNING_APPROVED':
        return t('Phases Approved');
      case 'CONTRACT_SIGNED':
        return t('Contract Signed');
      case 'IN_PROGRESS':
        return t('In Progress');
      default:
        return status;
    }
  };

  const riyalLogo = theme === 'dark'
    ? require('../../assets/saudi_riyal_logo_dark.svg')
    : require('../../assets/saudi_riyal_logo.svg');

  const renderProjectCard = ({ item }: { item: RunningProject }) => {
    const profileImageUrl = item.assignedTechnicianProfileImage?.startsWith('http')
      ? item.assignedTechnicianProfileImage
      : item.assignedTechnicianProfileImage
        ? `${API_BASE_URL.replace('/api', '')}${item.assignedTechnicianProfileImage}`
        : null;
    const phasesCount = Array.isArray(item.phases) ? item.phases.length : 0;

    return (
      <TouchableOpacity
        style={[styles.projectCard, { backgroundColor: colors.cardBackground }]}
        onPress={() => onShowProjectDetails?.(item)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={[styles.category, { color: colors.text }]}>
              {item.category || t('Project')}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Image source={riyalLogo} style={styles.riyalLogo} resizeMode="contain" />
            <Text style={[styles.budget, { color: colors.primary }]}>
              {formatBudget(item.budget)}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Meta */}
        {phasesCount > 0 && (
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="layers-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {t('Phases')}: {phasesCount}
              </Text>
            </View>
          </View>
        )}

        {/* Location */}
        {item.address && (
          <View style={styles.locationRow}>
            <Ionicons name="pin-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
        )}

        {/* Technician Info (for users) */}
        {!isTechnician && item.assignedTechnicianName && (
          <View style={styles.technicianRow}>
            <View style={styles.technicianInfo}>
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.technicianAvatar}
                />
              ) : (
                <View style={[styles.technicianAvatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.technicianAvatarText, { color: colors.primary }]}>
                    {item.assignedTechnicianName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={[styles.technicianName, { color: colors.text }]}>
                {item.assignedTechnicianName}
              </Text>
            </View>
          </View>
        )}

        {/* Phases Summary */}
        {phasesCount > 0 && (
          <View style={styles.phasesSummary}>
            <Text style={[styles.phasesTitle, { color: colors.text }]}>
              {t('Phases')}: {phasesCount}
            </Text>
            <View style={styles.phasesIndicators}>
              {item.phases!.map((phase) => (
                <View
                  key={phase.id}
                  style={[
                    styles.phaseDot,
                    {
                      backgroundColor: phase.completed
                        ? '#10B981'
                        : phase.approved
                          ? '#3B82F6'
                          : '#F59E0B',
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setSelectedProjectId(item.id);
              setSelectedProject(item);
              setShowPhaseModal(true);
            }}
          >
            <Ionicons name="eye-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>
              {t('View Details')}
            </Text>
          </TouchableOpacity>
          {onOpenChat && item.assignedTechnicianId && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
              onPress={async () => {
                const currentUserId = await storage.getUserId();
                if (currentUserId && item.assignedTechnicianId) {
                  const { generateRoomId } = require('../utils/chatUtils');
                  const roomId = generateRoomId(currentUserId, item.assignedTechnicianId);
                  onOpenChat(
                    roomId,
                    item.assignedTechnicianId,
                    item.assignedTechnicianName || t('Technician'),
                    item.id,
                  );
                }
              }}
            >
              <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                {t('Chat')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isTechnician ? t('My Assigned Projects') : t('Running Projects')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('Loading projects...')}
          </Text>
        </View>
      </View>
    );
  }

  if (projects.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isTechnician ? t('My Assigned Projects') : t('Running Projects')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-outline" size={80} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t('No running projects')}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('You have no active projects yet')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isTechnician ? t('My Assigned Projects') : t('Running Projects')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Projects List */}
      <FlatList
        data={projects}
        renderItem={renderProjectCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />

      {/* Phase Approval Modal */}
      {selectedProjectId && (
        <PhaseApprovalModal
          visible={showPhaseModal}
          projectId={selectedProjectId}
          isTechnician={isTechnician}
          onClose={() => {
            setShowPhaseModal(false);
            setSelectedProjectId(null);
            setSelectedProject(null);
          }}
          onSuccess={() => {
            loadProjects(); // Reload projects after phase approval/payment
          }}
          onOpenContract={() => {
            setShowPhaseModal(false);
            setShowContractModal(true);
          }}
        />
      )}

      {/* Contract Viewer Modal */}
      {selectedProject && (
        <ContractViewerModal
          visible={showContractModal}
          projectId={selectedProject.id}
          phases={selectedProject.phases || []}
          projectDetails={{
            description: selectedProject.description,
            budget: selectedProject.budget,
            address: selectedProject.address,
            technicianName: selectedProject.assignedTechnicianName,
            technicianId: selectedProject.assignedTechnicianId,
            userName: '', // TODO: Add user name if available
          }}
          isTechnician={isTechnician}
          onClose={() => {
            setShowContractModal(false);
            setSelectedProject(null);
          }}
          onSign={() => {
            loadProjects(); // Reload after signing
          }}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  projectCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    gap: 8,
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  budget: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riyalLogo: {
    width: 16,
    height: 16,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  address: {
    fontSize: 14,
  },
  technicianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  technicianInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  technicianAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  technicianAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  technicianAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  technicianName: {
    fontSize: 14,
    fontWeight: '500',
  },
  phasesSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  phasesTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  phasesIndicators: {
    flexDirection: 'row',
    gap: 4,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

