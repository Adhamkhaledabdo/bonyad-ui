import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import AcceptBidModal from './AcceptBidModal';
import PhaseApprovalModal from './PhaseApprovalModal';
import ContractViewerModal from './ContractViewerModal';
import LocationPicker from '../components/LocationPicker';
import { generateRoomId } from '../utils/chatUtils';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

interface ProjectDetailModalProps {
  visible: boolean;
  project: any;
  onClose: () => void;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => void;
  onViewTechnician?: (technicianId: number) => void;
  onBookAppointment?: (technicianId: number, technicianName: string, projectId?: number) => void;
  onSuccess?: () => void;
}

interface Bid {
  id: number;
  technicianId: number;
  technicianName: string;
  proposedBudget: number;
  comment: string;
  createdAt: string;
  status: string;
}

interface VisitRequest {
  id: number;
  userId: number;
  userName: string;
  userPhone: string;
  technicianId: number;
  technicianName: string;
  technicianPhone: string;
  projectId: number;
  projectDescription: string;
  status: string;
  requestedDate?: string;
  notes?: string;
  createdAt: string;
}

interface Phase {
  id: number;
  phaseNumber: number;
  description: string;
  moneySpent: number;
  timeSpentDays: number;
}

export default function ProjectDetailModal({ visible, project, onClose, onOpenChat, onViewTechnician, onBookAppointment, onSuccess }: ProjectDetailModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoadingBids, setIsLoadingBids] = useState(false);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [bidsError, setBidsError] = useState<string | null>(null);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [showAcceptBid, setShowAcceptBid] = useState(false);
  const [selectedBid, setSelectedBid] = useState<any>(null);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [isLoadingPhases, setIsLoadingPhases] = useState(false);
  const [isTechnician, setIsTechnician] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  
  // Custom popup hooks
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();

  useEffect(() => {
    if (visible && project) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔵 [ProjectDetailModal] ==========================================');
      console.log('🔵 [ProjectDetailModal] ✅ MODAL IS NOW OPEN');
      console.log('🔵 [ProjectDetailModal] ==========================================');
      console.log('🔵 [ProjectDetailModal] Project ID:', project.id);
      console.log('🔵 [ProjectDetailModal] Project Status:', project.status?.toUpperCase());
      console.log('🔵 [ProjectDetailModal] Project Description:', project.description?.substring(0, 50) + '...');
      setSelectedProject(project);
      // Check user role and load data
      const loadData = async () => {
        const isTech = await checkUserRole();
        const userRole = await storage.getUserRole();
        console.log('🔵 [ProjectDetailModal] ─────────────────────────────────────');
        console.log('🔵 [ProjectDetailModal] User Role:', userRole);
        console.log('🔵 [ProjectDetailModal] Is Technician (from checkUserRole):', isTech);
        console.log('🔵 [ProjectDetailModal] Is Technician (from state):', isTechnician);
        console.log('🔵 [ProjectDetailModal] User Type:', isTech ? 'TECHNICIAN' : 'USER/HOMEOWNER');
        console.log('🔵 [ProjectDetailModal] ✅ ProjectDetailModal works for BOTH User and Technician');
        console.log('🔵 [ProjectDetailModal] ─────────────────────────────────────');
        // Load data for this project (only for users, not technicians)
        // Technicians don't need bids/visit requests in running projects
        if (!isTech) {
          console.log('🔵 [ProjectDetailModal] Loading bids and visit requests (User)');
          loadBids();
          loadVisitRequests();
        } else {
          console.log('🔵 [ProjectDetailModal] Skipping bids/visits (Technician in running projects)');
        }
      };
      loadData();
      
      // Load phases if project status supports phases (APPROVED or later)
      const status = project.status?.toUpperCase();
      console.log('🔵 [ProjectDetailModal] Checking if phases should be loaded...');
      console.log('🔵 [ProjectDetailModal] Project Status:', status);
      const supportsPhases = status === 'APPROVED' || status === 'PHASE_PLANNING' || status === 'PHASE_PLANNING_APPROVED' || 
          status === 'CONTRACT_SIGNING' || status === 'IN_PROGRESS';
      console.log('🔵 [ProjectDetailModal] Supports Phases:', supportsPhases);
      if (supportsPhases) {
        console.log('🔵 [ProjectDetailModal] ✅ Loading phases from API...');
        loadPhases();
      } else if (project.phases) {
        console.log('🔵 [ProjectDetailModal] ⚠️ Using project.phases from prop (not loaded from API)');
        setPhases(project.phases);
      } else {
        console.log('🔵 [ProjectDetailModal] ❌ Phases not supported for this status or not available');
      }
    } else if (!visible) {
      // When modal closes, reset all states
      console.log('🔵 [ProjectDetailModal] Modal closed, resetting states');
      setShowAcceptBid(false);
    }
  }, [visible, project]);

  const checkUserRole = async () => {
    try {
      const userRole = await storage.getUserRole();
      const isTech = userRole === 'technician';
      console.log('🔵 [ProjectDetailModal] checkUserRole - Role:', userRole, 'Is Technician:', isTech);
      setIsTechnician(isTech);
      return isTech; // Return the value for immediate use
    } catch (error) {
      console.error('❌ [ProjectDetailModal] Error checking user role:', error);
      setIsTechnician(false);
      return false;
    }
  };

  const loadBids = async () => {
    if (!project || !project.id) return;

    setIsLoadingBids(true);
    setBidsError(null);

    try {
      // USER ONLY: Load all bids for this project
      const url = buildApiUrlWithParams(API_ENDPOINTS.BIDS.LIST, { projectId: project.id });
      console.log('🔍 [ProjectDetailModal] Fetching bids for project:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 [ProjectDetailModal] Bids API Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [ProjectDetailModal] Loaded bids:', data.length);
        setBids(data);
      } else {
        const errorText = await response.text();
        console.error('❌ [ProjectDetailModal] Failed to load bids - Status:', response.status);
        console.error('❌ Error response:', errorText);
        setBidsError('Failed to load bids');
      }
    } catch (error) {
      console.error('❌ [ProjectDetailModal] Error loading bids:', error);
      setBidsError('Error loading bids');
    } finally {
      setIsLoadingBids(false);
    }
  };

  const loadVisitRequests = async () => {
    if (!project || !project.id) return;

    setIsLoadingVisits(true);
    setVisitsError(null);

    try {
      // USER ONLY: Load all visit requests for this project
      const url = buildApiUrlWithParams(API_ENDPOINTS.VISIT_REQUESTS.LIST, { projectId: project.id });
      console.log('🔍 [ProjectDetailModal] Fetching visit requests for project:', url);

      const token = await storage.getAuthToken();
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 [ProjectDetailModal] Visit Requests API Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [ProjectDetailModal] Loaded visit requests:', data.length);
        setVisitRequests(data);
      } else {
        const errorText = await response.text();
        console.error('❌ [ProjectDetailModal] Failed to load visit requests - Status:', response.status);
        console.error('❌ Error response:', errorText);
        setVisitsError('Failed to load visit requests');
      }
    } catch (error) {
      console.error('❌ [ProjectDetailModal] Error loading visit requests:', error);
      setVisitsError('Error loading visit requests');
    } finally {
      setIsLoadingVisits(false);
    }
  };

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(budget);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getServiceName = () => {
    if (i18n.language === 'ar') {
      return project?.serviceNameAr || 'غير محدد';
    }
    return project?.serviceNameEn || 'Not specified';
  };


  const loadPhases = async () => {
    if (!project || !project.id) {
      console.log('❌ [ProjectDetailModal] loadPhases - No project or project.id');
      return;
    }

    console.log('📋 [ProjectDetailModal] loadPhases - Starting to load phases...');
    console.log('📋 [ProjectDetailModal] loadPhases - Project ID:', project.id);
    setIsLoadingPhases(true);
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        console.error('❌ [ProjectDetailModal] loadPhases - No auth token found');
        setIsLoadingPhases(false);
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, {
        projectId: project.id,
      });

      console.log('📋 [ProjectDetailModal] loadPhases - Fetching from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📋 [ProjectDetailModal] loadPhases - Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [ProjectDetailModal] loadPhases - Loaded phases successfully!');
        console.log('✅ [ProjectDetailModal] loadPhases - Number of phases:', data.length);
        console.log('✅ [ProjectDetailModal] loadPhases - Phases data:', data);
        setPhases(data);
        console.log('✅ [ProjectDetailModal] loadPhases - Phases state updated');
        console.log('✅ [ProjectDetailModal] loadPhases - Phases will appear in ProjectDetailModal');
        console.log('✅ [ProjectDetailModal] loadPhases - Location: In "Work Phases" section below project details');
        console.log('✅ [ProjectDetailModal] loadPhases - Each phase will show: Phase number, description, cost, time, and action button');
      } else {
        const errorText = await response.text();
        console.error('❌ [ProjectDetailModal] loadPhases - Failed to load phases');
        console.error('❌ [ProjectDetailModal] loadPhases - Status:', response.status);
        console.error('❌ [ProjectDetailModal] loadPhases - Error response:', errorText);
        // If no phases exist yet, set empty array
        setPhases([]);
        console.log('⚠️ [ProjectDetailModal] loadPhases - Set phases to empty array');
      }
    } catch (error) {
      console.error('❌ [ProjectDetailModal] loadPhases - Error:', error);
      setPhases([]);
    } finally {
      setIsLoadingPhases(false);
      console.log('📋 [ProjectDetailModal] loadPhases - Loading complete');
    }
  };

  const handlePhaseModalSuccess = () => {
    console.log('✅ [ProjectDetailModal] handlePhaseModalSuccess - Phase modal operation completed');
    console.log('✅ [ProjectDetailModal] handlePhaseModalSuccess - Reloading phases...');
    loadPhases();
    // Reload project to get updated status
    onSuccess?.();
  };

  const handleContractModalSuccess = () => {
    // Reload project to get updated status
    onSuccess?.();
  };
  
  const handleUpdateAddress = async (location: { address: string; latitude: number; longitude: number }) => {
    if (!selectedProject || !selectedProject.id) return;
    
    setIsUpdatingAddress(true);
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'), t('Error'));
        setIsUpdatingAddress(false);
        return;
      }
      
      // First, fetch current project data to preserve all fields
      const ownerEditUrl = buildApiUrl(API_ENDPOINTS.PROJECTS.OWNER_EDIT.replace(':id', String(selectedProject.id)));
      const getResponse = await fetch(ownerEditUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!getResponse.ok) {
        throw new Error(t('Failed to load project data'));
      }
      
      const projectData = await getResponse.json();
      const currentProject = projectData.project || {};
      const currentPhases = projectData.phases || [];
      
      // Use owner-edit endpoint to update address while preserving all other fields
      const url = buildApiUrl(API_ENDPOINTS.PROJECTS.OWNER_EDIT.replace(':id', String(selectedProject.id)));
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: currentProject.description || selectedProject.description || '',
          budget: currentProject.budget != null ? currentProject.budget : (selectedProject.budget || 0),
          address: location.address,
          needsVisit: currentProject.needsVisit != null ? currentProject.needsVisit : (selectedProject.needsVisit || false),
          needsBooking: currentProject.needsBooking != null ? currentProject.needsBooking : (selectedProject.needsBooking || false),
          phases: currentPhases.map((phase: any) => ({
            id: phase.id ?? null,
            description: phase.description || '',
            phaseNumber: phase.phaseNumber != null ? phase.phaseNumber : (phase.phaseNumber || 1),
            timeSpentDays: phase.timeSpentDays != null ? phase.timeSpentDays : null,
            moneySpent: phase.moneySpent != null ? phase.moneySpent : null,
          })),
        }),
      });
      
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || t('Failed to update address'));
      }
      
      // Update local state
      setSelectedProject({
        ...selectedProject,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      
      showSuccess(t('Address updated successfully'), t('Success'));
      setShowMapPicker(false);
      onSuccess?.(); // Refresh project list
    } catch (error: any) {
      console.error('❌ Failed to update address:', error);
      showError(error.message || t('Failed to update address'), t('Error'));
    } finally {
      setIsUpdatingAddress(false);
    }
  };

  if (!selectedProject) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('Project Details')}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Category Badge */}
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '10' }]}>
            <Text style={[styles.categoryText, { color: colors.primary }]}>
              {getServiceName()}
            </Text>
          </View>

          {/* Budget */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('Budget')}
            </Text>
            <View style={styles.budgetRow}>
              <Text style={[styles.budgetAmount, { color: colors.primary }]}>
                {formatBudget(selectedProject.budget)}
              </Text>
              <Text style={[styles.budgetCurrency, { color: colors.textSecondary }]}>SAR</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('Description')}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {selectedProject.description}
            </Text>
          </View>

          {/* Duration */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('Duration')}
            </Text>
            <View style={styles.durationRow}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={[styles.durationText, { color: colors.text }]}>
                {Math.ceil((selectedProject.timeRequiredDays || 14) / 7)} {t('weeks')}
              </Text>
            </View>
          </View>

          {/* Address - Always show, even if empty */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('Address')}
            </Text>
            <TouchableOpacity
              style={[
                styles.addressRow, 
                styles.addressClickable, 
                { 
                  backgroundColor: colors.surface, 
                  borderRadius: 12, 
                  padding: selectedProject.address ? 12 : 16,
                  borderWidth: selectedProject.address ? 0 : 2,
                  borderColor: colors.primary,
                  borderStyle: selectedProject.address ? 'solid' : 'dashed'
                }
              ]}
              onPress={() => setShowMapPicker(true)}
              activeOpacity={0.7}
              disabled={isUpdatingAddress}
            >
              <Ionicons 
                name={selectedProject.address ? "location" : "map-outline"} 
                size={selectedProject.address ? 20 : 24} 
                color={colors.primary} 
              />
              <Text style={[
                styles.addressText, 
                { 
                  color: selectedProject.address ? colors.text : colors.primary, 
                  flex: 1, 
                  marginLeft: 8,
                  fontWeight: selectedProject.address ? 'normal' : '600'
                }
              ]}>
                {selectedProject.address || t('Tap to add project address')}
              </Text>
              <Ionicons 
                name={selectedProject.address ? "create-outline" : "chevron-forward"} 
                size={selectedProject.address ? 18 : 20} 
                color={colors.primary} 
              />
            </TouchableOpacity>
            {isUpdatingAddress && (
              <View style={styles.updatingAddressContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.updatingAddressText, { color: colors.textSecondary }]}>
                  {t('Updating address...')}
                </Text>
              </View>
            )}
          </View>

          {/* Phases Section - Show for statuses that support phases */}
          {(() => {
            const status = selectedProject?.status?.toUpperCase();
            const hasPhases = phases.length > 0;
            const supportsPhases = status === 'APPROVED' || status === 'PHASE_PLANNING' || 
              status === 'PHASE_PLANNING_APPROVED' || status === 'CONTRACT_SIGNING' || 
              status === 'IN_PROGRESS';
            const shouldShow = hasPhases || isLoadingPhases || supportsPhases;
            
            console.log('═══════════════════════════════════════════════════════════');
            console.log('📊 [ProjectDetailModal] CHECKING PHASES SECTION CONDITION');
            console.log('📊 [ProjectDetailModal] ─────────────────────────────────────');
            console.log('📊 [ProjectDetailModal] Project Status:', status);
            console.log('📊 [ProjectDetailModal] Phases Count:', phases.length);
            console.log('📊 [ProjectDetailModal] Has Phases:', hasPhases);
            console.log('📊 [ProjectDetailModal] Is Loading Phases:', isLoadingPhases);
            console.log('📊 [ProjectDetailModal] Supports Phases:', supportsPhases);
            console.log('📊 [ProjectDetailModal] Should Show Phases Section:', shouldShow);
            console.log('📊 [ProjectDetailModal] ─────────────────────────────────────');
            if (shouldShow) {
              console.log('📊 [ProjectDetailModal] ✅ PHASES SECTION WILL BE RENDERED');
              console.log('📊 [ProjectDetailModal] Location: In ProjectDetailModal');
              console.log('📊 [ProjectDetailModal] Section Title: "Work Phases"');
              console.log('📊 [ProjectDetailModal] This is WHERE phases will appear');
            } else {
              console.log('📊 [ProjectDetailModal] ❌ PHASES SECTION WILL NOT BE RENDERED');
              console.log('📊 [ProjectDetailModal] Reason: Condition not met');
            }
            console.log('═══════════════════════════════════════════════════════════');
            
            return shouldShow;
          })() && (
            <View style={styles.section}>
              {(() => {
                const status = selectedProject?.status?.toUpperCase();
                const shouldShow = phases.length > 0 || isLoadingPhases || 
                  status === 'APPROVED' || status === 'PHASE_PLANNING' || 
                  status === 'PHASE_PLANNING_APPROVED' || status === 'CONTRACT_SIGNING' || 
                  status === 'IN_PROGRESS';
                console.log('═══════════════════════════════════════════════════════════');
                console.log('📊 [ProjectDetailModal] RENDERING PHASES SECTION');
                console.log('📊 [ProjectDetailModal] ─────────────────────────────────────');
                console.log('📊 [ProjectDetailModal] Project Status:', status);
                console.log('📊 [ProjectDetailModal] Is Technician:', isTechnician);
                console.log('📊 [ProjectDetailModal] Phases Count:', phases.length);
                console.log('📊 [ProjectDetailModal] Is Loading Phases:', isLoadingPhases);
                console.log('📊 [ProjectDetailModal] Should Show Phases Section:', shouldShow);
                console.log('📊 [ProjectDetailModal] ─────────────────────────────────────');
                console.log('📊 [ProjectDetailModal] ✅ PHASES SECTION WILL APPEAR HERE');
                console.log('📊 [ProjectDetailModal] Location: In ProjectDetailModal below project details');
                console.log('📊 [ProjectDetailModal] Section Title: "Work Phases"');
                console.log('📊 [ProjectDetailModal] This is the page where phases will be displayed');
                console.log('═══════════════════════════════════════════════════════════');
                return null;
              })()}
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(16) }]}>
                  {t('Work Phases')}
                </Text>
                {/* Phase Planning Button - Technician only (when status is APPROVED or PHASE_PLANNING) */}
                {(selectedProject?.status?.toUpperCase() === 'APPROVED' || 
                  selectedProject?.status?.toUpperCase() === 'PHASE_PLANNING') && isTechnician && (
                  <TouchableOpacity
                    style={[styles.phaseActionButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      console.log('🔘 [ProjectDetailModal] "Plan Phases" button clicked - Opening PhaseApprovalModal');
                      console.log('🔘 [ProjectDetailModal] Opening PhaseApprovalModal for technician to edit phases and view feedback');
                      setShowPhaseModal(true);
                    }}
                  >
                    <Ionicons name="create-outline" size={18} color="#fff" />
                    <Text style={styles.phaseActionButtonText}>
                      {phases.length > 0 ? t('Edit Phases') : t('Plan Phases')}
                    </Text>
                  </TouchableOpacity>
                )}
                {/* View Feedback Button - Technician only (when status is APPROVED or PHASE_PLANNING and phases exist) */}
                {(selectedProject?.status?.toUpperCase() === 'APPROVED' || 
                  selectedProject?.status?.toUpperCase() === 'PHASE_PLANNING') && 
                  isTechnician && phases.length > 0 && (
                  <TouchableOpacity
                    style={[styles.phaseActionButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      console.log('🔘 [ProjectDetailModal] "View Feedback" button clicked - Opening PhaseApprovalModal');
                      console.log('🔘 [ProjectDetailModal] Opening PhaseApprovalModal for technician to view user feedback');
                      setShowPhaseModal(true);
                    }}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                    <Text style={styles.phaseActionButtonText}>
                      {t('View Feedback')}
                    </Text>
                  </TouchableOpacity>
                )}
                {/* Phase Approval Button - User only (when status is PHASE_PLANNING) */}
                {selectedProject?.status?.toUpperCase() === 'PHASE_PLANNING' && !isTechnician && (
                  <>
                    <TouchableOpacity
                      style={[styles.phaseActionButton, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        console.log('🔘 [ProjectDetailModal] "Review & Approve Phases" button clicked - Opening PhaseApprovalModal');
                        console.log('🔘 [ProjectDetailModal] Opening PhaseApprovalModal for user to approve phases');
                        setShowPhaseModal(true);
                      }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={styles.phaseActionButtonText}>
                        {t('Review & Approve Phases')}
                      </Text>
                    </TouchableOpacity>
                    {/* Send Feedback Button - User only (also appears during PHASE_PLANNING) */}
                    {phases.length > 0 && (
                      <TouchableOpacity
                        style={[styles.phaseActionButton, { backgroundColor: colors.primary }]}
                        onPress={() => {
                          console.log('🔘 [ProjectDetailModal] "Send Feedback" button clicked - Opening PhaseApprovalModal');
                          console.log('🔘 [ProjectDetailModal] Opening PhaseApprovalModal for user to send feedback on all phases');
                          setShowPhaseModal(true);
                        }}
                      >
                        <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                        <Text style={styles.phaseActionButtonText}>
                          {t('Send Feedback')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
                {/* Send Feedback Button - User only (when phases are in progress or completed) */}
                {(selectedProject?.status?.toUpperCase() === 'PHASE_PLANNING_APPROVED' || 
                  selectedProject?.status?.toUpperCase() === 'CONTRACT_SIGNING' || 
                  selectedProject?.status?.toUpperCase() === 'IN_PROGRESS') && 
                  !isTechnician && phases.length > 0 && (
                  <TouchableOpacity
                    style={[styles.phaseActionButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      console.log('🔘 [ProjectDetailModal] "Send Feedback" button clicked - Opening PhaseApprovalModal');
                      console.log('🔘 [ProjectDetailModal] Opening PhaseApprovalModal for user to send feedback on all phases');
                      setShowPhaseModal(true);
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                    <Text style={styles.phaseActionButtonText}>
                      {t('Send Feedback')}
                    </Text>
                  </TouchableOpacity>
                )}
                {(selectedProject?.status?.toUpperCase() === 'PHASE_PLANNING_APPROVED' || 
                  selectedProject?.status?.toUpperCase() === 'CONTRACT_SIGNING' || 
                  selectedProject?.status?.toUpperCase() === 'IN_PROGRESS') && (
                  <TouchableOpacity
                    style={[styles.phaseActionButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowContractModal(true)}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#fff" />
                    <Text style={styles.phaseActionButtonText}>
                      {selectedProject?.status?.toUpperCase() === 'PHASE_PLANNING_APPROVED' 
                        ? t('View Contract') 
                        : (selectedProject?.status?.toUpperCase() === 'CONTRACT_SIGNING' 
                          ? t('Sign Contract') 
                          : t('View Contract'))}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {isLoadingPhases ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
                    {t('Loading phases...')}
                  </Text>
                </View>
              ) : phases.length > 0 ? (
                phases.map((phase, index) => {
                  if (index === 0) {
                    console.log('📊 [ProjectDetailModal] RENDERING PHASE CARDS');
                    console.log('📊 [ProjectDetailModal] - Rendering', phases.length, 'phase cards');
                    console.log('📊 [ProjectDetailModal] - Each phase card will appear in ProjectDetailModal');
                    console.log('📊 [ProjectDetailModal] - Phase cards location: In "Work Phases" section');
                  }
                  return (
                    <View 
                      key={phase.id} 
                      style={[styles.phaseCard, { backgroundColor: colors.cardBackground, borderColor: colors.primary + '20' }]}
                    >
                      <View style={styles.phaseHeader}>
                        <View style={styles.phaseHeaderLeft}>
                          <View style={[styles.phaseNumber, { backgroundColor: colors.primary + '10' }]}>
                            <Text style={[styles.phaseNumberText, { color: colors.primary }]}>
                              {phase.phaseNumber}
                            </Text>
                          </View>
                          <Text style={[styles.phaseTitle, { color: colors.text }]}>
                            Phase {phase.phaseNumber}
                          </Text>
                        </View>
                        <Text style={[styles.phasePercentage, { backgroundColor: colors.primary + '10', color: colors.primary }]}>
                          {Math.round((phase.moneySpent / selectedProject.budget) * 100)}%
                        </Text>
                      </View>
                      <Text style={[styles.phaseDescription, { color: colors.textSecondary }]}>
                        {phase.description}
                      </Text>
                      <View style={styles.phaseDetails}>
                        <View style={styles.phaseDetailItem}>
                          <Ionicons name="cash-outline" size={16} color="#10B981" />
                          <Text style={[styles.phaseDetailText, { color: colors.text }]}>
                            {formatBudget(phase.moneySpent)} SAR
                          </Text>
                        </View>
                        <View style={styles.phaseDetailItem}>
                          <Ionicons name="time-outline" size={16} color="#F59E0B" />
                          <Text style={[styles.phaseDetailText, { color: colors.text }]}>
                            {Math.ceil(phase.timeSpentDays / 7)} {t('weeks')}
                          </Text>
                        </View>
                      </View>
                      {/* Action Buttons for Phase - Only for Technician */}
                      {isTechnician && (
                        <View style={styles.phaseActions}>
                          {/* Technician: Edit Phase button */}
                          <TouchableOpacity
                            style={[styles.phaseActionButton, { backgroundColor: colors.primary }]}
                            onPress={() => {
                              console.log('🔘 [ProjectDetailModal] "Edit Phase" button clicked for Phase', phase.phaseNumber);
                              console.log('🔘 [ProjectDetailModal] Opening PhaseApprovalModal for technician to edit phase');
                              console.log('🔘 [ProjectDetailModal] Phase ID:', phase.id);
                              setShowPhaseModal(true);
                            }}
                          >
                            <Ionicons name="create-outline" size={16} color="#fff" />
                            <Text style={styles.phaseActionButtonText}>
                              {t('Edit Phase')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (selectedProject?.status?.toUpperCase() === 'APPROVED' || 
                    selectedProject?.status?.toUpperCase() === 'PHASE_PLANNING') && isTechnician ? (
                <View style={styles.emptyPhasesContainer}>
                  <Ionicons name="clipboard-outline" size={48} color={colors.border} />
                  <Text style={[styles.emptyPhasesText, { color: colors.textSecondary }]}>
                    {t('No phases planned yet. Click "Plan Phases" to get started.')}
                  </Text>
                </View>
              ) : phases.length === 0 && !isLoadingPhases ? (
                <View style={styles.emptyPhasesContainer}>
                  <Ionicons name="clipboard-outline" size={48} color={colors.border} />
                  <Text style={[styles.emptyPhasesText, { color: colors.textSecondary }]}>
                    {t('No phases available yet.')}
                  </Text>
                </View>
              ) : null}
            </View>
          )}


          {/* Visit Requests Section - User only (not for technicians in running projects) */}
          {!isTechnician && visitRequests.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="home-outline" size={24} color="#F59E0B" />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t('Visit Requests')}
                  </Text>
                </View>
                <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                  ({visitRequests.length})
                </Text>
              </View>

              {isLoadingVisits ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    {t('Loading visits...')}
                  </Text>
                </View>
              ) : visitsError ? (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {visitsError}
                </Text>
              ) : (
                visitRequests.map((visit, index) => (
                  <View 
                    key={visit.id} 
                    style={[styles.visitRequestCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                  >
                    <View style={styles.visitRequestHeader}>
                      <View style={styles.visitRequestHeaderLeft}>
                        <TouchableOpacity
                          onPress={() => onViewTechnician?.(visit.technicianId)}
                          style={[styles.visitAvatar, { backgroundColor: colors.primary + '10' }]}
                        >
                          <Text style={[styles.visitAvatarText, { color: colors.primary }]}>
                            {visit.technicianName.charAt(0).toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onViewTechnician?.(visit.technicianId)} style={{ flex: 1 }}>
                          <Text style={[styles.visitTechnicianName, { color: colors.text }]}>
                            {visit.technicianName}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => onViewTechnician?.(visit.technicianId)}
                          style={styles.profileIconButton}
                        >
                          <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                      <View style={[styles.visitStatusBadge, { backgroundColor: visit.status === 'PENDING' ? '#F59E0B20' : visit.status === 'APPROVED' ? '#10B98120' : '#EF444420' }]}>
                        <Text style={[styles.visitStatusText, { color: visit.status === 'PENDING' ? '#F59E0B' : visit.status === 'APPROVED' ? '#10B981' : '#EF4444' }]}>
                          {visit.status}
                        </Text>
                      </View>
                    </View>
                    {visit.notes && (
                      <Text style={[styles.visitNotes, { color: colors.textSecondary }]}>
                        {visit.notes}
                      </Text>
                    )}

                    {/* Action Buttons - User only */}
                    {visit.status === 'PENDING' && (
                      <View style={styles.visitActionButtons}>
                        <TouchableOpacity
                          style={[styles.visitActionButton, { backgroundColor: '#10B98110' }]}
                          onPress={async () => {
                            if (onOpenChat) {
                              const currentUserId = await storage.getUserId();
                              if (currentUserId) {
                                const roomId = generateRoomId(currentUserId, visit.technicianId);
                                console.log('🔵 [ProjectDetailModal] Opening chat from visit request:', visit.technicianId, 'roomId:', roomId, 'receiverName:', visit.technicianName);
                              onOpenChat(roomId, visit.technicianId, visit.technicianName, project?.id);
                                // Don't close modal - chat opens in tab system
                              }
                            }
                          }}
                        >
                          <Ionicons name="chatbubble-ellipses" size={18} color="#10B981" />
                          <Text style={[styles.visitActionButtonText, { color: '#10B981' }]}>
                            {t('Chat')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.visitActionButton, { backgroundColor: '#2196F3' }]}
                          onPress={() => {
                            console.log('🔵 [ProjectDetailModal] Book Appointment clicked:', {
                              technicianId: visit.technicianId,
                              technicianName: visit.technicianName,
                              projectId: project.id,
                              onBookAppointment: !!onBookAppointment
                            });
                            if (onBookAppointment) {
                              // Close modal before navigating
                              onClose();
                              onBookAppointment(visit.technicianId, visit.technicianName, project.id);
                            } else {
                              console.error('❌ [ProjectDetailModal] onBookAppointment handler not provided');
                            }
                          }}
                        >
                          <Ionicons name="calendar" size={18} color="#fff" />
                          <Text style={[styles.visitActionButtonText, { color: '#fff' }]}>
                            {t('Book Appointment')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* Bids Section - User only (not for technicians in running projects) */}
          {!isTechnician && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="list-outline" size={24} color="#10B981" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('Existing Bids')}
                </Text>
              </View>
              <View style={[styles.sectionCountBadge, { backgroundColor: colors.border }]}>
                <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                  {bids.length}
                </Text>
              </View>
            </View>

            {isLoadingBids ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  {t('Loading bids...')}
                </Text>
              </View>
            ) : bidsError ? (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {bidsError}
              </Text>
            ) : bids.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="hand-left-outline" size={48} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('No bids yet')}
                </Text>
              </View>
              ) : (
              bids.map((bid) => (
                <View
                  key={bid.id} 
                  style={[styles.bidCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                >
                  <View style={styles.bidHeader}>
                    <View style={styles.bidHeaderLeft}>
                      <TouchableOpacity
                        onPress={() => onViewTechnician?.(bid.technicianId)}
                        style={[styles.bidAvatar, { backgroundColor: colors.primary + '10' }]}
                      >
                        <Text style={[styles.bidAvatarText, { color: colors.primary }]}>
                          {bid.technicianName.charAt(0).toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => onViewTechnician?.(bid.technicianId)} style={{ flex: 1 }}>
                        <Text style={[styles.bidTechnicianName, { color: colors.text }]}>
                          {bid.technicianName}
                        </Text>
                        <Text style={[styles.bidDate, { color: colors.textSecondary }]}>
                          {formatDate(bid.createdAt)}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => onViewTechnician?.(bid.technicianId)}
                        style={styles.profileIconButton}
                      >
                        <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.bidPriceBadge, { backgroundColor: colors.primary + '10' }]}>
                      <Text style={[styles.bidPrice, { color: colors.primary }]}>
                        {formatBudget(bid.proposedBudget)} SAR
                      </Text>
                    </View>
                  </View>
                  {bid.comment && (
                    <Text style={[styles.bidComment, { color: colors.textSecondary }]}>
                      {bid.comment}
                    </Text>
                  )}
                  <View style={[styles.bidStatusBadge, { backgroundColor: bid.status === 'PENDING' ? '#F59E0B20' : bid.status === 'ACCEPTED' ? '#10B98120' : '#EF444420' }]}>
                    <Text style={[styles.bidStatusText, { color: bid.status === 'PENDING' ? '#F59E0B' : bid.status === 'ACCEPTED' ? '#10B981' : '#EF4444' }]}>
                      {bid.status}
                    </Text>
                  </View>

                  {/* Accept Bid Button - User only */}
                  {bid.status === 'PENDING' && (
                    <View style={styles.bidActionButtons}>
                      <TouchableOpacity
                        style={[styles.bidActionButton, { backgroundColor: '#10B981' }]}
                        onPress={async () => {
                          setSelectedBid(bid);
                          setShowAcceptBid(true);
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.bidActionButtonText}>
                          {t('Accept Bid')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.bidActionButton, { backgroundColor: '#10B98110' }]}
                        onPress={async () => {
                          if (onOpenChat) {
                            const currentUserId = await storage.getUserId();
                            if (currentUserId) {
                              const roomId = generateRoomId(currentUserId, bid.technicianId);
                              console.log('🔵 [ProjectDetailModal] Opening chat from bid:', bid.technicianId, 'roomId:', roomId, 'receiverName:', bid.technicianName);
                              onOpenChat(roomId, bid.technicianId, bid.technicianName, project?.id);
                              // Don't close modal - chat opens in tab system
                            }
                          }
                        }}
                      >
                        <Ionicons name="chatbubble-ellipses" size={18} color="#10B981" />
                        <Text style={[styles.bidActionButtonText, { color: '#10B981' }]}>
                          {t('Chat')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
          )}
        </ScrollView>
      </View>


      {/* Accept Bid Modal */}
      {selectedBid && (
        <AcceptBidModal
          visible={showAcceptBid}
          bid={{
            id: selectedBid.id,
            price: selectedBid.proposedBudget,
            description: selectedBid.comment,
            technicianName: selectedBid.technicianName,
          }}
          onClose={() => {
            setShowAcceptBid(false);
            setSelectedBid(null);
          }}
          onSuccess={() => {
            loadBids(); // Refresh bids after accepting
          }}
        />
      )}

      {/* Phase Approval Modal */}
      {selectedProject && (
        <PhaseApprovalModal
          visible={showPhaseModal}
          projectId={selectedProject.id}
          onClose={() => {
            console.log('🔴 [ProjectDetailModal] PhaseApprovalModal closed');
            setShowPhaseModal(false);
          }}
          onSuccess={handlePhaseModalSuccess}
          isTechnician={isTechnician}
          onOpenContract={() => {
            console.log('🔴 [ProjectDetailModal] Opening contract from PhaseApprovalModal');
            setShowPhaseModal(false);
            setShowContractModal(true);
          }}
        />
      )}
      {showPhaseModal && selectedProject && (() => {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🟢 [ProjectDetailModal] PhaseApprovalModal is now VISIBLE');
        console.log('🟢 [ProjectDetailModal] PhaseApprovalModal - Project ID:', selectedProject.id);
        console.log('🟢 [ProjectDetailModal] PhaseApprovalModal - Is Technician:', isTechnician);
        console.log('🟢 [ProjectDetailModal] PhaseApprovalModal - User Type:', isTechnician ? 'TECHNICIAN' : 'USER/HOMEOWNER');
        console.log('🟢 [ProjectDetailModal] PhaseApprovalModal - User will see:', isTechnician ? 'Phase editing interface + View Feedback' : 'Phase approval/feedback interface');
        console.log('═══════════════════════════════════════════════════════════');
        return null;
      })()}

      {/* Contract Viewer Modal */}
      {selectedProject && (
        <ContractViewerModal
          visible={showContractModal}
          projectId={selectedProject.id}
          projectDetails={{
            description: selectedProject.description,
            budget: selectedProject.budget,
            address: selectedProject.address,
            technicianName: selectedProject.technicianName,
            technicianId: selectedProject.technicianId,
            userName: selectedProject.userName,
          }}
          onClose={() => setShowContractModal(false)}
          onSign={handleContractModalSuccess}
          isTechnician={isTechnician}
        />
      )}
      
      {/* Location Picker Modal */}
      {selectedProject && showMapPicker && (
        <LocationPicker
          initialLocation={
            selectedProject.latitude && selectedProject.longitude
              ? { latitude: selectedProject.latitude, longitude: selectedProject.longitude }
              : undefined
          }
          initialAddress={selectedProject.address || ''}
          onLocationSelect={(location) => {
            handleUpdateAddress(location);
          }}
          onClose={() => setShowMapPicker(false)}
        />
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
    </Modal>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetAmount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  budgetCurrency: {
    fontSize: 20,
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressClickable: {
    marginTop: 8,
  },
  addressText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  updatingAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  updatingAddressText: {
    fontSize: 12,
  },
  phaseCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  phaseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  phaseNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  phaseTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  phasePercentage: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 'bold',
  },
  phaseDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  phaseDetails: {
    flexDirection: 'row',
    gap: 20,
  },
  phaseDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseDetailText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  phaseActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
  visitRequestCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  visitRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  visitRequestHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  visitAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  visitTechnicianName: {
    fontSize: 14,
    fontWeight: '600',
  },
  profileIconButton: {
    padding: 4,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  visitStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  visitNotes: {
    fontSize: 12,
    lineHeight: 18,
  },
  bidCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  bidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bidHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bidAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bidAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bidTechnicianName: {
    fontSize: 14,
    fontWeight: '600',
  },
  bidDate: {
    fontSize: 12,
    marginTop: 2,
  },
  bidPriceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bidPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bidComment: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  bidStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bidStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bidActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  bidActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  bidActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  visitActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  visitActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  visitActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  phaseActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  phaseActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyPhasesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyPhasesText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});

