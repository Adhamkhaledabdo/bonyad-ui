import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProjectCreationFlow from '../components/ProjectCreationFlow';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';

// ===== DESIGN TOKENS FROM FIGMA =====
const COLORS = {
  // Primary Blues
  primary100: '#003867',
  primary80: '#004A8A',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary50: '#1A6DB4',
  primary40: '#4D8EC5',
  primary30: '#80AED6',
  primary20: '#B3CEE6',
  primary10: '#E6EFF7',
  // Greens
  green90: '#007B36',
  green80: '#008B3E',
  green60: '#00AC4F',
  green10: '#E6F5EC',
  // Purple
  purple100: '#3C076D',
  purple70: '#5E0BA1',
  purple10: '#EFE6F5',
  // Amber
  amber60: '#FFB703',
  // Text
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  textWhite: '#FFFFFF',
  // Backgrounds
  bgWhite: '#FFFFFF',
};

interface Phase {
  id: number;
  phaseNumber: number;
  description: string;
  moneySpent: number;
  timeSpentDays: number;
  status?: string;
}

interface Bid {
  id: number;
  technicianId: number;
  technicianName: string;
  proposedBudget: number;
  comment: string;
  createdAt: string;
  status: string;
  technician?: {
    id: number;
    name: string;
    profileImage?: string;
    rating?: number;
    reviewCount?: number;
    projectsCount?: number;
    responseTime?: string;
    distance?: string;
  };
}

interface Project {
  id: number;
  description: string;
  status: string;
  budget: number;
  address?: string;
  createdAt: string;
  serviceNameEn?: string;
  serviceNameAr?: string;
  phases?: Phase[];
  assignedTechnician?: {
    id: number;
    name: string;
  } | null;
  requirements?: string[];
  timeRequiredDays?: number;
}

interface ProjectDetailScreenProps {
  project: Project;
  onBack: () => void;
  onEditProject?: () => void;
  onDeleteProject?: () => void;
  onAcceptBid?: (bidId: number) => void;
  onDeclineBid?: (bidId: number) => void;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => void;
  onViewTechnician?: (technicianId: number) => void;
  onSuccess?: () => void;
  isTechnician?: boolean;
}


// ===== BID CARD COMPONENT =====
const BidCard = ({
  bid,
  index,
  onAccept,
  onDecline,
  onViewTechnician,
  formatBudget,
}: {
  bid: Bid;
  index: number;
  onAccept: () => void;
  onDecline: () => void;
  onViewTechnician?: () => void;
  formatBudget: (amount: number) => string;
}) => {
  const { t } = useTranslation();
  
  return (
    <View style={bidStyles.card}>
      {/* Header */}
      <View style={bidStyles.header}>
        <View style={bidStyles.numberBadge}>
          <Text style={bidStyles.numberText}>{index + 1}</Text>
        </View>
        <View style={bidStyles.headerInfo}>
          <Text style={bidStyles.providerName}>{bid.technicianName}</Text>
          <View style={bidStyles.ratingRow}>
            <Text style={bidStyles.starIcon}>★</Text>
            <Text style={bidStyles.ratingText}>
              {bid.technician?.rating || 4.9} ({bid.technician?.reviewCount || 234})
            </Text>
            <View style={bidStyles.locationRow}>
              <Ionicons name="location" size={12} color={COLORS.textSecondary} />
              <Text style={bidStyles.distanceText}>{bid.technician?.distance || '0.8 mi'}</Text>
            </View>
          </View>
        </View>
      </View>
      
      {/* Divider */}
      <View style={bidStyles.divider} />
      
      {/* Stats Row */}
      <View style={bidStyles.statsRow}>
        <View style={bidStyles.statBox}>
          <Text style={bidStyles.statValue}>{bid.technician?.projectsCount || 156}</Text>
          <Text style={bidStyles.statLabel}>{t('Projects')}</Text>
        </View>
        <View style={bidStyles.statBox}>
          <Text style={bidStyles.statValue}>3 {t('weeks')}</Text>
          <Text style={bidStyles.statLabel}>{t('Duration')}</Text>
        </View>
        <View style={bidStyles.statBox}>
          <Text style={bidStyles.statValue}>{bid.technician?.responseTime || '2 hours'}</Text>
          <Text style={bidStyles.statLabel}>{t('Responses')}</Text>
        </View>
      </View>
      
      {/* Bid Amount */}
      <View style={bidStyles.amountRow}>
        <Text style={bidStyles.amountLabel}>{t('Bid Amount')}</Text>
        <Text style={bidStyles.amountValue}>{formatBudget(bid.proposedBudget)}</Text>
      </View>
      
      {/* Proposal */}
      <View style={bidStyles.proposalSection}>
        <Text style={bidStyles.proposalTitle}>{t('Proposal')}</Text>
        <Text style={bidStyles.proposalText}>
          {bid.comment || t('We specialize in kitchen renovations with 10+ years experience. Our team will deliver high-quality work with attention to detail.')}
        </Text>
      </View>
      
      {/* Action Buttons */}
      {bid.status === 'PENDING' && (
        <View style={bidStyles.actionRow}>
          <TouchableOpacity style={bidStyles.acceptButton} onPress={onAccept}>
            <Ionicons name="checkmark-circle" size={12} color={COLORS.textWhite} />
            <Text style={bidStyles.acceptText}>{t('Accept')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={bidStyles.declineButton} onPress={onDecline}>
            <Ionicons name="close-circle" size={12} color={COLORS.purple70} />
            <Text style={bidStyles.declineText}>{t('Decline')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const bidStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.primary10,
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
    backgroundColor: COLORS.bgWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  numberBadge: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: COLORS.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.primary80,
  },
  headerInfo: {
    flex: 1,
    gap: 6,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textHeader,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starIcon: {
    color: COLORS.amber60,
    fontSize: 10,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '300',
    color: COLORS.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 6,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '300',
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.textDividers,
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.primary10,
    borderWidth: 0.5,
    borderColor: COLORS.primary50,
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '200',
    color: COLORS.textBody,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textBody,
  },
  amountRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.green10,
    borderWidth: 0.5,
    borderColor: COLORS.green80,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  amountLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.green90,
  },
  amountValue: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.green90,
    textAlign: 'right',
  },
  proposalSection: {
    paddingVertical: 16,
    gap: 16,
  },
  proposalTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textBody,
  },
  proposalText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green60,
    borderRadius: 8,
    padding: 16,
    gap: 6,
  },
  acceptText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textWhite,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple10,
    borderWidth: 0.5,
    borderColor: COLORS.purple70,
    borderRadius: 8,
    padding: 16,
    gap: 6,
  },
  declineText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.purple70,
  },
});

// ===== PHASE CARD COMPONENT =====
const PhaseCard = ({
  phase,
  totalBudget,
  formatBudget,
}: {
  phase: Phase;
  totalBudget: number;
  formatBudget: (amount: number) => string;
}) => {
  const { t } = useTranslation();
  
  return (
    <View style={phaseStyles.card}>
      <View style={phaseStyles.header}>
        <View style={phaseStyles.headerLeft}>
          <View style={phaseStyles.numberBadge}>
            <Text style={phaseStyles.numberText}>{phase.phaseNumber}</Text>
          </View>
          <Text style={phaseStyles.title}>{phase.description}</Text>
        </View>
        <Text style={phaseStyles.price}>{formatBudget(phase.moneySpent)}</Text>
      </View>
      
      <Text style={phaseStyles.description}>
        {phase.description}
      </Text>
      
      <View style={phaseStyles.durationRow}>
        <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
        <Text style={phaseStyles.durationText}>
          {Math.ceil(phase.timeSpentDays / 7)} {t('Week')}
        </Text>
      </View>
    </View>
  );
};

const phaseStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.primary10,
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    gap: 16,
    backgroundColor: COLORS.bgWhite,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.primary80,
  },
  title: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textBody,
    flex: 1,
  },
  price: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.green80,
  },
  description: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textBody,
    lineHeight: 18,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
});

// ===== MAIN COMPONENT =====
export default function ProjectDetailScreen({
  project,
  onBack,
  onEditProject,
  onDeleteProject,
  onAcceptBid,
  onDeclineBid,
  onOpenChat,
  onViewTechnician,
  onSuccess,
  isTechnician = false,
}: ProjectDetailScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [bids, setBids] = useState<Bid[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBids, setIsLoadingBids] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  
  // Custom popup hooks
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showDeleteConfirmation, showConfirmation, hideConfirmation } = useConfirmationPopup();
  
  const status = project?.status?.toUpperCase() || 'PENDING';
  const serviceName = i18n.language === 'ar' ? project?.serviceNameAr : project?.serviceNameEn;

  // Get status text for title
  const getStatusText = () => {
    switch (status) {
      case 'CREATING':
        return t('Project Creation');
      case 'PENDING':
        return t('Pending Project');
      case 'BID_RECEIVED':
        return t('Bid Received');
      case 'APPROVED':
      case 'PHASE_PLANNING_APPROVED':
        return t('Approved Project');
      case 'CONTRACT_SIGNING':
        return t('Contract Signing');
      case 'IN_PROGRESS':
        return t('In Progress');
      case 'COMPLETED':
        return t('Completed Project');
      default:
        return t('Project');
    }
  };

  // Load data based on status
  useEffect(() => {
    loadData();
  }, [project]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadBids(),
        loadPhases(),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBids = async () => {
    if (!project?.id) return;
    
    setIsLoadingBids(true);
    try {
      const token = await storage.getAuthToken();
      const url = buildApiUrlWithParams(API_ENDPOINTS.BIDS.LIST, { projectId: project.id });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBids(data);
      }
    } catch (error) {
      console.error('Error loading bids:', error);
    } finally {
      setIsLoadingBids(false);
    }
  };

  const loadPhases = async () => {
    if (!project?.id) return;
    
    try {
      const token = await storage.getAuthToken();
      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, { projectId: project.id });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPhases(data);
      }
    } catch (error) {
      console.error('Error loading phases:', error);
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDuration = () => {
    const weeks = Math.ceil((project?.timeRequiredDays || 21) / 7);
    return `${weeks}-${weeks + 1} ${t('weeks')}`;
  };

  const handleAcceptBid = async (bidId: number) => {
    if (onAcceptBid) {
      onAcceptBid(bidId);
    } else {
      try {
        const token = await storage.getAuthToken();
        const url = buildApiUrl(API_ENDPOINTS.BIDS.ACCEPT.replace(':id', bidId.toString()));
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          showSuccess(t('Bid accepted successfully'), t('Success'));
          loadBids();
          onSuccess?.();
        } else {
          showError(t('Failed to accept bid'), t('Error'));
        }
      } catch (error) {
        console.error('Error accepting bid:', error);
        showError(t('Failed to accept bid'), t('Error'));
      }
    }
  };

  const handleDeclineBid = async (bidId: number) => {
    if (onDeclineBid) {
      onDeclineBid(bidId);
    } else {
      showConfirmation(
        t('Decline Bid'),
        t('Are you sure you want to decline this bid?'),
        async () => {
          try {
            const token = await storage.getAuthToken();
            const url = buildApiUrl(API_ENDPOINTS.BIDS.DELETE.replace(':id', bidId.toString()));
            
            const response = await fetch(url, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              showSuccess(t('Bid declined'), t('Success'));
              loadBids();
            }
          } catch (error) {
            console.error('Error declining bid:', error);
          }
        },
        {
          confirmText: t('Decline'),
          confirmStyle: 'destructive',
        }
      );
    }
  };

  const handleDeleteProject = () => {
    showDeleteConfirmation(
      t('Delete Project'),
      t('Are you sure you want to delete this project? This action cannot be undone.'),
      async () => {
        if (onDeleteProject) {
          onDeleteProject();
        } else {
          try {
            const token = await storage.getAuthToken();
            const url = buildApiUrl(API_ENDPOINTS.PROJECTS.DELETE.replace(':id', project.id.toString()));
            
            const response = await fetch(url, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              showSuccess(t('Project deleted successfully'), t('Success'));
              onSuccess?.();
              onBack();
            } else {
              showError(t('Failed to delete project'), t('Error'));
            }
          } catch (error) {
            console.error('Error deleting project:', error);
            showError(t('Failed to delete project'), t('Error'));
          }
        }
      }
    );
  };

  // Render Pending Status Content
  const renderPendingContent = () => (
    <>
      {/* Project Overview Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeaderTitle}>{t('Project Overview')}</Text>
        <Text style={styles.sectionDescription}>
          {t('Review your project details below. Once submitted, service providers will start sending bids.')}
        </Text>
        
        {/* Budget and Duration Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.budgetCard]}>
            <View style={styles.statHeader}>
              <Ionicons name="cash-outline" size={12} color={COLORS.primary80} />
              <Text style={styles.statTitle}>{t('Total Budget')}</Text>
            </View>
            <Text style={styles.statValue}>{formatBudget(project.budget)}</Text>
          </View>
          <View style={[styles.statCard, styles.durationCard]}>
            <View style={styles.statHeader}>
              <Ionicons name="time-outline" size={12} color={COLORS.green90} />
              <Text style={[styles.statTitle, { color: COLORS.green90 }]}>{t('Duration')}</Text>
            </View>
            <Text style={styles.statValue}>{formatDuration()}</Text>
          </View>
        </View>
      </View>
      
      {/* Description Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={12} color={COLORS.primary80} />
          <Text style={styles.sectionLabel}>{t('Description')}</Text>
        </View>
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>{project.description}</Text>
        </View>
      </View>
      
      {/* Requirements Section */}
      {project.requirements && project.requirements.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={12} color={COLORS.primary80} />
            <Text style={styles.sectionLabel}>{t('Requirements')}</Text>
          </View>
          <View style={styles.descriptionBox}>
            {project.requirements.map((req, index) => (
              <View key={index} style={styles.requirementItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.requirementText}>{req}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      {/* Work Phases Section */}
      {phases.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={12} color={COLORS.primary80} />
            <Text style={styles.sectionLabel}>{t('Work Phases')}</Text>
          </View>
          {phases.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              totalBudget={project.budget}
              formatBudget={formatBudget}
            />
          ))}
        </View>
      )}
      
      {/* Action Buttons */}
      {!isTechnician && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={onEditProject}
          >
            <Text style={styles.editButtonText}>{t('Edit Project')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteProject}
          >
            <Text style={styles.deleteButtonText}>{t('Delete Project')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  // Render Bid Received Status Content
  const renderBidReceivedContent = () => (
    <>
      {/* Bids Count Badge */}
      <View style={styles.bidsCountBadge}>
        <Text style={styles.bidsCountText}>
          {bids.length} {t('Bids Received')}
        </Text>
      </View>
      
      {/* Review Bids Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeaderTitle}>{t('Review Bids')}</Text>
        <Text style={styles.sectionDescription}>
          {t('Compare proposals from qualified service providers and select the best fit for your project.')}
        </Text>
      </View>
      
      {/* Bids List */}
      {isLoadingBids ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary60} />
          <Text style={styles.loadingText}>{t('Loading bids...')}</Text>
        </View>
      ) : bids.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="hand-left-outline" size={48} color={COLORS.textDividers} />
          <Text style={styles.emptyText}>{t('No bids yet')}</Text>
          <Text style={styles.emptySubtext}>
            {t('Service providers will start sending bids soon')}
          </Text>
        </View>
      ) : (
        bids.map((bid, index) => (
          <BidCard
            key={bid.id}
            bid={bid}
            index={index}
            onAccept={() => handleAcceptBid(bid.id)}
            onDecline={() => handleDeclineBid(bid.id)}
            onViewTechnician={() => onViewTechnician?.(bid.technicianId)}
            formatBudget={formatBudget}
          />
        ))
      )}
    </>
  );

  // Main render based on status
  const renderContent = () => {
    switch (status) {
      case 'PENDING':
        return renderPendingContent();
      case 'BID_RECEIVED':
        return renderBidReceivedContent();
      default:
        return renderPendingContent(); // Default to pending view
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bgWhite }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary60} />
          <Text style={styles.loadingText}>{t('Loading project...')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bgWhite, paddingTop: IS_LARGE_WEB ? 0 : insets.top }]}>
      {/* Header - Hidden on large web */}
      {!IS_LARGE_WEB && (
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textBody} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {serviceName || t('Project')}
            </Text>
            <Text style={styles.headerSubtitle}>
              {getStatusText()}
            </Text>
        </View>
      </View>
      )}
      
      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          IS_LARGE_WEB && styles.webContentFullWidth,
        ]}
      >
        {/* Title Section - Large Web */}
        {IS_LARGE_WEB && (
          <View style={styles.titleSectionLargeWeb}>
            <TouchableOpacity onPress={onBack} style={styles.titleBackButton}>
              <Ionicons name="chevron-back" size={24} color={COLORS.textHeader} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.titleMainText}>
                {serviceName || t('Project')}
              </Text>
              <Text style={styles.titleSubtext}>
                {getStatusText()}
              </Text>
            </View>
          </View>
        )}
        
        {/* Status Stepper - Using ProjectCreationFlow component */}
        <View style={[styles.stepperContainer, IS_LARGE_WEB && styles.stepperContainerLargeWeb]}>
          <ProjectCreationFlow currentStep={status as any} />
        </View>
        
        {/* Divider */}
        <View style={[styles.divider, IS_LARGE_WEB && styles.dividerLargeWeb]} />
        {renderContent()}
        
        {/* Bottom Padding */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
      
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 24,
  },
  headerLargeWeb: {
    paddingHorizontal: 48,
    paddingVertical: 32,
    gap: 56,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonLargeWeb: {
    width: 40,
    height: 40,
  },
  headerTitleContainer: {
    flex: 1,
    gap: 6,
  },
  headerTitleContainerLargeWeb: {
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textHeader,
  },
  headerTitleLargeWeb: {
    fontSize: 34,
    fontWeight: '400',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '300',
    color: COLORS.textSecondary,
  },
  headerSubtitleLargeWeb: {
    fontSize: 16,
  },
  stepperContainer: {
    paddingHorizontal: 16,
  },
  stepperContainerLargeWeb: {
    paddingHorizontal: 48,
    paddingTop: 8,
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.textDividers,
    marginHorizontal: 16,
    marginTop: 8,
  },
  dividerLargeWeb: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  webContent: {
    maxWidth: 1344,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 48,
    paddingVertical: 16,
  },
  webContentFullWidth: {
    width: '100%',
    paddingHorizontal: 48,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textHeader,
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    fontWeight: '300',
    color: COLORS.textBody,
    lineHeight: 21,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 16,
    gap: 6,
  },
  budgetCard: {
    backgroundColor: COLORS.primary10,
    borderColor: COLORS.textHeader,
  },
  durationCard: {
    backgroundColor: COLORS.green10,
    borderColor: COLORS.green80,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.primary80,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.primary80,
  },
  descriptionBox: {
    borderWidth: 0.5,
    borderColor: COLORS.textDividers,
    borderRadius: 6,
    padding: 16,
  },
  descriptionText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textBody,
    lineHeight: 18,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  bulletPoint: {
    fontSize: 12,
    color: COLORS.textBody,
  },
  requirementText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textBody,
    lineHeight: 18,
  },
  actionButtons: {
    gap: 12,
    marginTop: 16,
  },
  editButton: {
    backgroundColor: COLORS.primary60,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textWhite,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: COLORS.purple10,
    borderWidth: 1,
    borderColor: COLORS.purple100,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.purple100,
    textAlign: 'center',
  },
  bidsCountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.green10,
    borderWidth: 0.5,
    borderColor: COLORS.green80,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  bidsCountText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.green90,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // Title Section - Large Web (Figma Design)
  titleSectionLargeWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 48,
    paddingTop: 24,
    paddingBottom: 0,
  },
  titleBackButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    gap: 8,
  },
  titleMainText: {
    fontSize: 42,
    fontWeight: '700',
    color: COLORS.textHeader,
    lineHeight: 42,
  },
  titleSubtext: {
    fontSize: 20,
    fontWeight: '300',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

