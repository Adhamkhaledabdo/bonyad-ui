/**
 * ContractSigningProjectScreen
 * 
 * Screen for displaying contract signing status based on Figma designs.
 * Shows different UI based on user persona:
 * - User/Homeowner: Can view contract details, download PDF, and send to email for signature
 * - Technician: Can view contract details and download PDF
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProjectCreationFlow from '../components/ProjectCreationFlow';
import ContractViewerModal from './ContractViewerModal';

// ===== DESIGN TOKENS FROM FIGMA =====
const COLORS = {
  // Primary Blues
  primary100: '#003867',
  primary80: '#004A8A',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary50: '#1A6DB4',
  primary20: '#B3CEE6',
  primary10: '#E6EFF7',
  // Greens
  green90: '#007B36',
  green80: '#008B3E',
  green70: '#009C47',
  green60: '#00AC4F',
  green10: '#E6F5EC',
  // Purple
  purple100: '#3C076D',
  purple70: '#5E0BA1',
  purple60: '#6A0DAD',
  purple10: '#EFE6F5',
  // Amber
  amber70: '#DA9C02',
  amber60: '#FFB703',
  amber10: '#FFF2CF',
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
  title?: string;
  description: string;
  moneySpent: number;
  timeSpentDays: number;
  status?: string;
  approved?: boolean;
  completed?: boolean;
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
  technicianName?: string;
  technicianId?: number;
  userName?: string;
  acceptedBid?: {
    technicianName?: string;
    technicianId?: number;
    amount?: number;
  };
  phases?: Phase[];
  startDate?: string;
  completionDate?: string;
  contractNumber?: string;
}

interface ContractSigningProjectScreenProps {
  project: Project;
  onBack: () => void;
  onSuccess?: () => void;
  onViewContract?: () => void;
  isTechnician?: boolean;
}

export default function ContractSigningProjectScreen({
  project,
  onBack,
  onSuccess,
  onViewContract,
  isTechnician: propIsTechnician,
}: ContractSigningProjectScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTechnician, setIsTechnician] = useState(propIsTechnician ?? false);
  const [showContractModal, setShowContractModal] = useState(false);
  
  const screenWidth = Dimensions.get('window').width;
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  const isRTL = i18n.language === 'ar';
  
  const serviceName = i18n.language === 'ar' ? project?.serviceNameAr : project?.serviceNameEn;

  // Get technician info from project or accepted bid
  const technicianName = project?.technicianName || 
    project?.acceptedBid?.technicianName || 
    t('Service Provider');
  
  const technicianId = project?.technicianId || 
    project?.acceptedBid?.technicianId;

  // Calculate total from phases or use budget
  const totalAmount = phases.length > 0 
    ? phases.reduce((sum, p) => sum + (p.moneySpent || 0), 0) 
    : project?.budget || project?.acceptedBid?.amount || 0;

  // Format dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return t('To be determined');
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Contract number (use project id if not available)
  const contractNumber = project?.contractNumber || `#${project?.id}`;

  useEffect(() => {
    loadData();
  }, [project]);

  const loadData = async () => {
    if (!project?.id) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Check user role if not provided
      if (propIsTechnician === undefined) {
        const role = await storage.getUserRole();
        const isTech = role?.toUpperCase() === 'TECHNICIAN';
        setIsTechnician(isTech);
      }
      
      // Load phases
      await loadPhases();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownloadContract = () => {
    if (onViewContract) {
      onViewContract();
    } else {
      setShowContractModal(true);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bgWhite, paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary60} />
          <Text style={[styles.loadingText, { fontSize: scaledSize(14) }]}>{t('Loading...')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bgWhite, paddingTop: IS_LARGE_WEB ? 0 : insets.top }]}>
      {/* Header - Hidden on large web */}
      {!IS_LARGE_WEB && (
      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons 
            name={isRTL ? "chevron-forward" : "chevron-back"} 
            size={24} 
            color={COLORS.textHeader} 
          />
        </TouchableOpacity>
        <View style={[styles.headerTitleContainer, isRTL && { alignItems: 'flex-end' }]}>
          <Text style={[styles.headerTitle, isRTL && { textAlign: 'right' }, { fontSize: scaledSize(20) }]}>
            {serviceName || project?.description?.substring(0, 30) || t('Project')}
          </Text>
          <Text style={[styles.headerSubtitle, isRTL && { textAlign: 'right' }, { fontSize: scaledSize(14) }]}>
              {t('Contract Signing')}
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
          IS_LARGE_WEB && styles.webContent,
        ]}
      >
        {/* Title Section - Large Web */}
        {IS_LARGE_WEB && (
          <View style={styles.titleSectionLargeWeb}>
            <TouchableOpacity onPress={onBack} style={styles.titleBackButton}>
              <Ionicons 
                name={isRTL ? "chevron-forward" : "chevron-back"} 
                size={24} 
                color={COLORS.textHeader} 
              />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={[styles.titleMainText, isRTL && { textAlign: 'right' }, { fontSize: scaledSize(42) }]}>
                {serviceName || project?.description?.substring(0, 30) || t('Project')}
              </Text>
              <Text style={[styles.titleSubtext, isRTL && { textAlign: 'right' }, { fontSize: scaledSize(20) }]}>
                {t('Contract Signing')}
              </Text>
            </View>
          </View>
        )}
        
        {/* Status Stepper */}
        <View style={[styles.stepperContainer, IS_LARGE_WEB && styles.stepperContainerLargeWeb]}>
          <ProjectCreationFlow currentStep="CONTRACT_SIGNING" />
        </View>
        
        {/* Divider */}
        <View style={[styles.divider, IS_LARGE_WEB && styles.dividerLargeWeb]} />
        {/* Contract Ready Badge */}
        <View style={[styles.badgeContainer, isRTL && { alignItems: 'flex-end' }]}>
          <View style={styles.contractReadyBadge}>
            <Text style={styles.contractReadyText}>{t('Contract Ready')}</Text>
          </View>
        </View>

        {/* Contract Signing Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
            {t('Contract Signing')}
          </Text>
          <Text style={[styles.sectionDescription, isRTL && { textAlign: 'right' }]}>
            {isTechnician 
              ? t('Review the contract details below.')
              : t('Review the contract details below. Contract signing links have been sent to your email.')
            }
          </Text>
        </View>

        {/* Contract Details Card */}
        <View style={styles.contractCard}>
          {/* Contract Header */}
          <TouchableOpacity 
            style={[styles.contractHeader, isRTL && { flexDirection: 'row-reverse' }]}
            onPress={handleDownloadContract}
            activeOpacity={0.7}
          >
            <View style={styles.contractIconContainer}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.purple60} />
            </View>
            <View style={[styles.contractHeaderInfo, isRTL && { alignItems: 'flex-end' }]}>
              <Text style={[styles.contractTitle, isRTL && { textAlign: 'right' }]}>
                {t('Service Agreement')}
              </Text>
              <Text style={[styles.contractSubtitle, isRTL && { textAlign: 'right' }]}>
                {t('Contract')} {contractNumber}
              </Text>
            </View>
            <Ionicons 
              name={isRTL ? "chevron-back" : "chevron-forward"} 
              size={20} 
              color={COLORS.textSecondary} 
            />
          </TouchableOpacity>

          {/* Contract Details */}
          <View style={styles.contractDetails}>
            {/* Provider */}
            <View style={[styles.detailRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={[styles.detailLabel, isRTL && { textAlign: 'right' }]}>
                {t('Provider')}
              </Text>
              <Text style={[styles.detailValue, isRTL && { textAlign: 'left' }]}>
                {technicianName}
              </Text>
            </View>
            <View style={styles.detailDivider} />

            {/* Project */}
            <View style={[styles.detailRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={[styles.detailLabel, isRTL && { textAlign: 'right' }]}>
                {t('Project')}
              </Text>
              <Text style={[styles.detailValue, isRTL && { textAlign: 'left' }]} numberOfLines={1}>
                {serviceName || project?.description?.substring(0, 30) || t('Project')}
              </Text>
            </View>
            <View style={styles.detailDivider} />

            {/* Total Amount */}
            <View style={[styles.detailRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={[styles.detailLabel, isRTL && { textAlign: 'right' }]}>
                {t('Total Amount')}
              </Text>
              <Text style={[styles.detailValueGreen, isRTL && { textAlign: 'left' }]}>
                {formatBudget(totalAmount)} {t('SAR')}
              </Text>
            </View>
            <View style={styles.detailDivider} />

            {/* Start Date */}
            <View style={[styles.detailRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={[styles.detailLabel, isRTL && { textAlign: 'right' }]}>
                {t('Start Date')}
              </Text>
              <Text style={[styles.detailValue, isRTL && { textAlign: 'left' }]}>
                {formatDate(project?.startDate)}
              </Text>
            </View>
            <View style={styles.detailDivider} />

            {/* Completion Date */}
            <View style={[styles.detailRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={[styles.detailLabel, isRTL && { textAlign: 'right' }]}>
                {t('Completion Date')}
              </Text>
              <Text style={[styles.detailValue, isRTL && { textAlign: 'left' }]}>
                {formatDate(project?.completionDate)}
              </Text>
            </View>
          </View>

          {/* Download Contract Button */}
          <View style={styles.downloadButtonContainer}>
            <TouchableOpacity 
              style={[styles.downloadButton, isRTL && { flexDirection: 'row-reverse' }]}
              onPress={handleDownloadContract}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={20} color={COLORS.primary70} />
              <Text style={styles.downloadButtonText}>
                {t('Download Contract (PDF)')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Email Signature Notice - User Only */}
        {!isTechnician && (
          <View style={[styles.emailNotice, isRTL && { flexDirection: 'row-reverse' }]}>
            <View style={styles.emailIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.green60} />
            </View>
            <View style={[styles.emailNoticeContent, isRTL && { alignItems: 'flex-end' }]}>
              <Text style={[styles.emailNoticeTitle, isRTL && { textAlign: 'right' }]}>
                {t('Contract Sent for Signature')}
              </Text>
              <Text style={[styles.emailNoticeDescription, isRTL && { textAlign: 'right' }]}>
                {t('Contract signing links have been sent to your email address. Please check your inbox to digitally sign the contract.')}
              </Text>
            </View>
          </View>
        )}
        
        {/* Bottom Padding */}
        <View style={{ height: insets.bottom + 50 }} />
      </ScrollView>

      {/* Contract Viewer Modal */}
      {project && (
        <ContractViewerModal
          visible={showContractModal}
          projectId={project.id}
          projectDetails={{
            description: project.description,
            budget: totalAmount,
            address: project.address,
            technicianName: technicianName,
            technicianId: technicianId,
            userName: project.userName,
          }}
          onClose={() => setShowContractModal(false)}
          isTechnician={isTechnician}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textHeader,
  },
  headerTitleLargeWeb: {
    fontSize: 34,
    fontWeight: '400',
  },
  headerSubtitle: {
    fontSize: 14,
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
    gap: 16,
  },
  webContent: {
    width: '100%',
    paddingHorizontal: 48,
    paddingVertical: 16,
  },
  // Loading
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
  // Contract Ready Badge
  badgeContainer: {
    alignItems: 'flex-start',
  },
  contractReadyBadge: {
    backgroundColor: COLORS.purple10,
    borderWidth: 0.5,
    borderColor: COLORS.purple70,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  contractReadyText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.purple70,
  },
  // Section
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: COLORS.textHeader,
  },
  sectionDescription: {
    fontSize: 14,
    fontWeight: '300',
    color: COLORS.textBody,
    lineHeight: 21,
  },
  // Contract Card
  contractCard: {
    borderWidth: 0.5,
    borderColor: COLORS.textDividers,
    borderRadius: 6,
    backgroundColor: COLORS.bgWhite,
    overflow: 'hidden',
  },
  contractHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 24,
  },
  contractIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.purple10,
    borderWidth: 0.5,
    borderColor: COLORS.purple60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contractHeaderInfo: {
    flex: 1,
    gap: 6,
  },
  contractTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textHeader,
  },
  contractSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: COLORS.textSecondary,
  },
  contractDetails: {
    padding: 16,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textBody,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  detailValueGreen: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.green70,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.textDividers,
  },
  downloadButtonContainer: {
    padding: 16,
    paddingTop: 0,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary10,
    borderWidth: 0.5,
    borderColor: COLORS.primary70,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.primary70,
  },
  // Email Notice
  emailNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderWidth: 0.5,
    borderColor: COLORS.amber60,
    borderRadius: 6,
    gap: 16,
    backgroundColor: COLORS.bgWhite,
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
  emailIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: COLORS.amber10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailNoticeContent: {
    flex: 1,
    gap: 16,
  },
  emailNoticeTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textBody,
  },
  emailNoticeDescription: {
    fontSize: 14,
    fontWeight: '300',
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
});

