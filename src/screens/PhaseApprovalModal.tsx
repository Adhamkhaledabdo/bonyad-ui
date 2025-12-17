import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_ENDPOINTS, buildApiUrlWithParams, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { showAlert, showError, showSuccess } from '../utils/alert';

// ===== DESIGN TOKENS (match Approved/Phase Planning screens) =====
const COLORS = {
  // Primary Blues
  primary100: '#003867',
  primary80: '#004A8A',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary20: '#B3CEE6',
  primary10: '#E6EFF7',
  // Greens
  green80: '#008B3E',
  green60: '#00AC4F',
  green10: '#E6F5EC',
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

interface PhaseApprovalModalProps {
  visible: boolean;
  projectId: number;
  onClose: () => void;
  onSuccess?: () => void;
  isTechnician?: boolean;
  onOpenContract?: () => void;
}

interface Phase {
  id: number;
  projectId: number;
  phaseNumber: number;
  description: string;
  timeSpentDays: number;
  moneySpent: number;
  paymentStatus: string;
  paidAt?: string;
  approved: boolean;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PhaseApprovalModal({
  visible,
  projectId,
  onClose,
  onSuccess,
  isTechnician = false,
  onOpenContract,
}: PhaseApprovalModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editTimeDays, setEditTimeDays] = useState('');
  const [editMoney, setEditMoney] = useState('');
  const [isSubmittingPhase, setIsSubmittingPhase] = useState(false);
  const [showCreatePhaseForm, setShowCreatePhaseForm] = useState(false);
  const [newPhaseDescription, setNewPhaseDescription] = useState('');
  const [newPhaseTimeDays, setNewPhaseTimeDays] = useState('');
  const [newPhaseMoney, setNewPhaseMoney] = useState('');
  const [isCreatingPhase, setIsCreatingPhase] = useState(false);
  // Feedback viewing for technicians
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const [showFeedbacks, setShowFeedbacks] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  
  // Custom confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmOnConfirm, setConfirmOnConfirm] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (visible && projectId) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🟢 [PhaseApprovalModal] ==========================================');
      console.log('🟢 [PhaseApprovalModal] ✅ MODAL IS NOW OPEN');
      console.log('🟢 [PhaseApprovalModal] ==========================================');
      console.log('🟢 [PhaseApprovalModal] Project ID:', projectId);
      console.log('🟢 [PhaseApprovalModal] Is Technician:', isTechnician);
      console.log('🟢 [PhaseApprovalModal] User Role:', isTechnician ? 'TECHNICIAN' : 'USER/HOMEOWNER');
      console.log('🟢 [PhaseApprovalModal] Mode:', isTechnician ? 'EDITING (Technician can edit/update phases and view feedback)' : 'APPROVAL/FEEDBACK (User can approve phases and send feedback)');
      console.log('🟢 [PhaseApprovalModal] Loading phases for this project...');
      console.log('═══════════════════════════════════════════════════════════');
      loadPhases();
      // Load feedbacks for technicians
      if (isTechnician) {
        console.log('🟢 [PhaseApprovalModal] Technician detected - Loading all feedbacks...');
        loadFeedbacks('all');
      }
    } else if (!visible) {
      console.log('🔴 [PhaseApprovalModal] Modal closed');
    }
  }, [visible, projectId, isTechnician]);

  const loadPhases = async () => {
    try {
      console.log('📋 [PhaseApprovalModal] loadPhases - Starting...');
      console.log('📋 [PhaseApprovalModal] loadPhases - Project ID:', projectId);
      setIsLoading(true);
      const token = await storage.getAuthToken();
      if (!token) {
        console.error('❌ [PhaseApprovalModal] loadPhases - No auth token');
        showError(t('Please login again'));
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, {
        projectId,
      });

      console.log('📋 [PhaseApprovalModal] loadPhases - Fetching from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📋 [PhaseApprovalModal] loadPhases - Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [PhaseApprovalModal] loadPhases - Loaded phases successfully!');
        console.log('✅ [PhaseApprovalModal] loadPhases - Number of phases:', data.length);
        console.log('✅ [PhaseApprovalModal] loadPhases - Phases data:', data);
        setPhases(data);
        console.log('✅ [PhaseApprovalModal] loadPhases - Phases will appear in PhaseApprovalModal');
        console.log('✅ [PhaseApprovalModal] loadPhases - User can now:', isTechnician ? 'Edit/update phases' : 'Approve phases and send feedback');
      } else {
        const errorText = await response.text();
        console.error('❌ [PhaseApprovalModal] loadPhases - Failed to load phases');
        console.error('❌ [PhaseApprovalModal] loadPhases - Status:', response.status);
        console.error('❌ [PhaseApprovalModal] loadPhases - Error:', errorText);
        showError(t('Failed to load phases'));
      }
    } catch (error: any) {
      console.error('❌ [PhaseApprovalModal] loadPhases - Error:', error);
      showError(error.message || t('Failed to load phases'));
    } finally {
      setIsLoading(false);
      console.log('📋 [PhaseApprovalModal] loadPhases - Loading complete');
    }
  };

  const loadFeedbacks = async (filter: 'all' | 'pending' | 'resolved' = 'all') => {
    try {
      setIsLoadingFeedbacks(true);
      const token = await storage.getAuthToken();
      if (!token) {
        console.error('❌ [PhaseApprovalModal] loadFeedbacks - No auth token');
        return;
      }

      // Load all feedbacks or filtered by pending
      const endpoint = filter === 'pending' 
        ? API_ENDPOINTS.FEEDBACKS.PENDING 
        : API_ENDPOINTS.FEEDBACKS.LIST;
      
      const url = buildApiUrlWithParams(endpoint, {
        projectId,
      });

      console.log('📋 [PhaseApprovalModal] loadFeedbacks - Fetching from:', url);
      console.log('📋 [PhaseApprovalModal] loadFeedbacks - Filter:', filter);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📋 [PhaseApprovalModal] loadFeedbacks - Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [PhaseApprovalModal] loadFeedbacks - Loaded feedbacks successfully!');
        console.log('✅ [PhaseApprovalModal] loadFeedbacks - Number of feedbacks:', data.length || 0);
        
        // Filter by resolved if needed (when loading all)
        let filteredData = data || [];
        if (filter === 'resolved') {
          filteredData = filteredData.filter((fb: any) => fb.status === 'RESOLVED' || fb.status === 'resolved');
        } else if (filter === 'pending') {
          filteredData = filteredData.filter((fb: any) => fb.status === 'PENDING' || fb.status === 'pending');
        }
        
        console.log('✅ [PhaseApprovalModal] loadFeedbacks - Filtered feedbacks:', filteredData.length);
        setFeedbacks(filteredData);
      } else {
        const errorText = await response.text();
        console.error('❌ [PhaseApprovalModal] loadFeedbacks - Failed to load feedbacks');
        console.error('❌ [PhaseApprovalModal] loadFeedbacks - Status:', response.status);
        console.error('❌ [PhaseApprovalModal] loadFeedbacks - Error:', errorText);
        setFeedbacks([]);
      }
    } catch (error: any) {
      console.error('❌ [PhaseApprovalModal] loadFeedbacks - Error:', error);
      setFeedbacks([]);
    } finally {
      setIsLoadingFeedbacks(false);
    }
  };

  const resolveFeedback = async (feedbackId: number) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔘 [PhaseApprovalModal] resolveFeedback - BUTTON CLICKED');
    console.log('🔘 [PhaseApprovalModal] Feedback ID:', feedbackId);
    console.log('🔘 [PhaseApprovalModal] Function called successfully');
    console.log('🔘 [PhaseApprovalModal] Platform:', Platform.OS);
    console.log('═══════════════════════════════════════════════════════════');
    
    const executeResolve = async () => {
      console.log('✅ [PhaseApprovalModal] User confirmed - Starting API call...');
      setShowConfirmModal(false);
      try {
        const token = await storage.getAuthToken();
        if (!token) {
          console.error('❌ [PhaseApprovalModal] No auth token');
          showError(t('Please login again'));
          return;
        }

        const url = buildApiUrlWithParams(API_ENDPOINTS.FEEDBACKS.RESOLVE, {
          feedbackId,
        });

        console.log('═══════════════════════════════════════════════════════════');
        console.log('🟢 [PhaseApprovalModal] Resolve Feedback');
        console.log('🟢 [PhaseApprovalModal] Endpoint: POST /feedbacks/{feedbackId}/resolve');
        console.log('🟢 [PhaseApprovalModal] Feedback ID:', feedbackId);
        console.log('🟢 [PhaseApprovalModal] URL:', url);
        console.log('🟢 [PhaseApprovalModal] Body: None (as per API spec)');
        console.log('═══════════════════════════════════════════════════════════');

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('📥 [PhaseApprovalModal] Resolve Response Status:', response.status);

        if (response.ok) {
          console.log('✅ [PhaseApprovalModal] Feedback resolved successfully');
          showSuccess(t('Feedback marked as resolved'));
          // Reload feedbacks
          loadFeedbacks(feedbackFilter);
        } else {
          const errorText = await response.text();
          console.error('❌ [PhaseApprovalModal] Failed to resolve feedback:', errorText);
          console.error('❌ [PhaseApprovalModal] Status:', response.status);
          showError(t('Failed to resolve feedback'));
        }
      } catch (error: any) {
        console.error('❌ [PhaseApprovalModal] Error resolving feedback:', error);
        showError(error.message || t('Failed to resolve feedback'));
      }
    };

    // Show custom confirmation modal for both web and mobile
    setConfirmTitle(t('Resolve Feedback'));
    setConfirmMessage(t('Are you sure you want to mark this feedback as resolved?'));
    setConfirmOnConfirm(() => executeResolve);
    setShowConfirmModal(true);
  };

  const approveAllPhases = async () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔘 [PhaseApprovalModal] approveAllPhases - BUTTON CLICKED');
    console.log('🔘 [PhaseApprovalModal] Function called successfully');
    console.log('🔘 [PhaseApprovalModal] Platform:', Platform.OS);
    console.log('═══════════════════════════════════════════════════════════');
    
    const executeApproval = async () => {
      console.log('✅ [PhaseApprovalModal] User confirmed - Starting approval and signature flow...');
      setShowConfirmModal(false);
      setIsApproving(true);
      try {
        const token = await storage.getAuthToken();
        if (!token) {
          console.error('❌ [PhaseApprovalModal] No auth token');
          showError(t('Please login again'));
          return;
        }

        // ===== STEP 1: Fetch User Email =====
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🟢 [PhaseApprovalModal] STEP 1: Fetching user email');
        console.log('🟢 [PhaseApprovalModal] Endpoint: GET /users/profile');
        console.log('═══════════════════════════════════════════════════════════');

        const userProfileUrl = buildApiUrl(API_ENDPOINTS.USER.PROFILE);
        const userProfileResponse = await fetch(userProfileUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        let userEmail = '';
        if (userProfileResponse.ok) {
          const userProfile = await userProfileResponse.json();
          userEmail = userProfile?.email || '';
          console.log('✅ [PhaseApprovalModal] User email fetched:', userEmail);
        } else {
          console.warn('⚠️ [PhaseApprovalModal] Failed to fetch user profile');
        }

        // ===== STEP 2: Fetch Project Details to Get Technician ID =====
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🟢 [PhaseApprovalModal] STEP 2: Fetching project details for technician ID');
        console.log('═══════════════════════════════════════════════════════════');

        const projectUrl = buildApiUrlWithParams(API_ENDPOINTS.PROJECTS.DETAILS, {
          id: projectId,
        });

        const projectResponse = await fetch(projectUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        let technicianId: number | null = null;
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          const project = projectData?.project ?? projectData;
          console.log('✅ [PhaseApprovalModal] Project details fetched');

          // Extract technician ID from project
          technicianId = 
            project?.technicianId || 
            project?.assignedTechnicianId || 
            project?.assignedTechnician?.id || 
            project?.technician?.id || 
            project?.acceptedBid?.technicianId || 
            null;

          console.log('🔧 [PhaseApprovalModal] Technician ID:', technicianId);
        } else {
          console.warn('⚠️ [PhaseApprovalModal] Failed to fetch project details');
        }

        // ===== STEP 3: Fetch Technician Email from Profile =====
        let technicianEmail = '';
        if (technicianId) {
          console.log('═══════════════════════════════════════════════════════════');
          console.log('🟢 [PhaseApprovalModal] STEP 3: Fetching technician email');
          console.log('🟢 [PhaseApprovalModal] Endpoint: GET /users/{userId}/profile');
          console.log('🟢 [PhaseApprovalModal] Technician ID:', technicianId);
          console.log('═══════════════════════════════════════════════════════════');

          const technicianProfileUrl = buildApiUrlWithParams(API_ENDPOINTS.USER.PROFILE_BY_ID, {
            id: technicianId,
          });

          const technicianProfileResponse = await fetch(technicianProfileUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          });

          if (technicianProfileResponse.ok) {
            const technicianProfile = await technicianProfileResponse.json();
            technicianEmail = technicianProfile?.email || '';
            console.log('✅ [PhaseApprovalModal] Technician email fetched:', technicianEmail);
          } else {
            console.warn('⚠️ [PhaseApprovalModal] Failed to fetch technician profile');
          }
        }

        // ===== STEP 4: Approve All Phases =====
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🟢 [PhaseApprovalModal] STEP 4: Approve All Phases');
        console.log('🟢 [PhaseApprovalModal] Endpoint: POST /phases/project/{projectId}/approve-all');
        console.log('🟢 [PhaseApprovalModal] Project ID:', projectId);
        console.log('═══════════════════════════════════════════════════════════');

        const approveUrl = buildApiUrlWithParams(API_ENDPOINTS.PHASES.APPROVE_ALL, {
          projectId,
        });

        const approveResponse = await fetch(approveUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('📥 [PhaseApprovalModal] Approve All Response Status:', approveResponse.status);

        if (!approveResponse.ok) {
          const errorText = await approveResponse.text();
          console.error('❌ [PhaseApprovalModal] Failed to approve phases:', errorText);
          console.error('❌ [PhaseApprovalModal] Status:', approveResponse.status);
          showError(t('Failed to approve phases'));
          return;
        }

        const approveData = await approveResponse.json().catch(() => null);
        console.log('✅ [PhaseApprovalModal] Phases approved successfully:', approveData);
        console.log('✅ [PhaseApprovalModal] Project status changed to CONTRACT_SIGNING');

        // Log email status
        console.log('📧 [PhaseApprovalModal] User Email:', userEmail);
        console.log('📧 [PhaseApprovalModal] Technician Email:', technicianEmail);
        console.log('🔧 [PhaseApprovalModal] Technician ID:', technicianId);

        // Check if we have the required data for signature
        if (!technicianId || !userEmail || !technicianEmail) {
          console.warn('⚠️ [PhaseApprovalModal] Missing email or technician info for signature');
          console.warn('⚠️ [PhaseApprovalModal] technicianId:', technicianId);
          console.warn('⚠️ [PhaseApprovalModal] userEmail:', userEmail);
          console.warn('⚠️ [PhaseApprovalModal] technicianEmail:', technicianEmail);
          showSuccess(t('All phases approved successfully'));
          loadPhases();
          onSuccess?.();
          return;
        }

        // ===== STEP 5: Create Signature Request =====
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🟢 [PhaseApprovalModal] STEP 5: Creating signature request');
        console.log('🟢 [PhaseApprovalModal] Endpoint: POST /signatures');
        console.log('═══════════════════════════════════════════════════════════');

        const signatureUrl = buildApiUrl(API_ENDPOINTS.CONTRACTS.CREATE);

        // Get phase IDs
        const phaseIds = phases.length > 0 ? phases.map(p => p.id).join(',') : '';

        // Build form-encoded body (as per API documentation)
        const formBody = new URLSearchParams({
          projectId: projectId.toString(),
          technicianId: technicianId.toString(),
          userEmail: userEmail.trim(),
          technicianEmail: technicianEmail.trim(),
          phaseIds: phaseIds,
          language: i18n.language === 'ar' ? 'AR' : 'EN',
        }).toString();

        console.log('📤 [PhaseApprovalModal] Sending signature request...');
        console.log('📤 [PhaseApprovalModal] Form body:', formBody);

        const signatureResponse = await fetch(signatureUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept-Language': i18n.language,
          },
          body: formBody,
        });

        console.log('📥 [PhaseApprovalModal] Signature Response Status:', signatureResponse.status);

        if (signatureResponse.ok || signatureResponse.status === 201) {
          const signatureData = await signatureResponse.json();
          console.log('✅ [PhaseApprovalModal] Signature request created successfully!');
          console.log('✅ [PhaseApprovalModal] Signature ID:', signatureData.id);
          console.log('✅ [PhaseApprovalModal] SignIt Reference:', signatureData.thirdPartyReferenceId);
          
          showSuccess(t('All phases approved! Signature requests sent to both parties via email.'));
          loadPhases();
          onSuccess?.();
        } else {
          const errorText = await signatureResponse.text();
          console.error('❌ [PhaseApprovalModal] Failed to create signature:', errorText);
          // Still show success for phase approval even if signature fails
          showSuccess(t('All phases approved successfully'));
          loadPhases();
          onSuccess?.();
        }
      } catch (error: any) {
        console.error('❌ [PhaseApprovalModal] Error:', error);
        showError(error.message || t('Failed to approve phases'));
      } finally {
        setIsApproving(false);
      }
    };

    // Show custom confirmation modal for both web and mobile
    setConfirmTitle(t('Approve All Phases'));
    setConfirmMessage(t('Are you sure you want to approve all phases? This will start the contract signing process.'));
    setConfirmOnConfirm(() => executeApproval);
    setShowConfirmModal(true);
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      showError(t('Please enter feedback text'));
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'));
        return;
      }

      const url = buildApiUrl(API_ENDPOINTS.FEEDBACKS.CREATE);

      console.log('🔍 Submitting feedback:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          comment: feedbackText.trim(),
        }),
      });

      console.log('📥 Feedback Response Status:', response.status);

      if (response.ok) {
        showSuccess(t('Feedback sent to technician'));
        setFeedbackText('');
        setShowFeedbackForm(false);
        onSuccess?.();
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to submit feedback:', errorText);
        showError(t('Failed to submit feedback'));
      }
    } catch (error: any) {
      console.error('❌ Error submitting feedback:', error);
      showError(error.message || t('Failed to submit feedback'));
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const payForPhase = async (phaseId: number, amount: number) => {
    Alert.alert(
      t('Payment Confirmation'),
      t('Pay {{amount}} SAR for this phase?', { amount: amount }),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Pay'),
          onPress: async () => {
            try {
              const token = await storage.getAuthToken();
              if (!token) {
                showError(t('Please login again'));
                return;
              }

              const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.PAY, {
                phaseId,
              });

              console.log('🔍 Paying for phase:', url);

              const response = await fetch(url, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              console.log('📥 Payment Response Status:', response.status);

              if (response.ok) {
                showSuccess(t('Payment successful'));
                loadPhases(); // Reload to show updated status
                onSuccess?.();
              } else {
                const errorText = await response.text();
                console.error('❌ Failed to pay phase:', errorText);
                Alert.alert(t('Error'), t('Failed to process payment'));
              }
            } catch (error: any) {
              console.error('❌ Error paying for phase:', error);
              Alert.alert(t('Error'), error.message || t('Failed to process payment'));
            }
          },
        },
      ]
    );
  };

  const markPhaseComplete = async (phaseId: number) => {
    Alert.alert(
      t('Mark Phase Complete'),
      t('Are you sure this phase is completed?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Complete'),
          onPress: async () => {
            try {
              const token = await storage.getAuthToken();
              if (!token) {
                showError(t('Please login again'));
                return;
              }

              const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.COMPLETE, {
                phaseId,
              });

              console.log('🔍 Marking phase complete:', url);

              const response = await fetch(url, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              console.log('📥 Mark Complete Response Status:', response.status);

              if (response.ok) {
                Alert.alert(t('Success'), t('Phase marked as complete. Waiting for payment.'));
                loadPhases(); // Reload to show updated status
                onSuccess?.();
              } else {
                const errorText = await response.text();
                console.error('❌ Failed to mark phase complete:', errorText);
                Alert.alert(t('Error'), t('Failed to mark phase as complete'));
              }
            } catch (error: any) {
              console.error('❌ Error marking phase complete:', error);
              Alert.alert(t('Error'), error.message || t('Failed to mark phase as complete'));
            }
          },
        },
      ]
    );
  };

  const startEditingPhase = (phase: Phase) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🟡 [PhaseApprovalModal] ==========================================');
    console.log('🟡 [PhaseApprovalModal] ✅ PHASE EDIT MODE OPENED');
    console.log('🟡 [PhaseApprovalModal] ==========================================');
    console.log('🟡 [PhaseApprovalModal] Phase ID:', phase.id);
    console.log('🟡 [PhaseApprovalModal] Phase Number:', phase.phaseNumber);
    console.log('🟡 [PhaseApprovalModal] Phase Description:', phase.description?.substring(0, 50) + '...');
    console.log('🟡 [PhaseApprovalModal] Phase Time (days):', phase.timeSpentDays);
    console.log('🟡 [PhaseApprovalModal] Phase Money (SAR):', phase.moneySpent);
    console.log('🟡 [PhaseApprovalModal] Is Technician:', isTechnician);
    console.log('🟡 [PhaseApprovalModal] Technician can now edit this phase');
    console.log('═══════════════════════════════════════════════════════════');
    setEditingPhase(phase);
    setEditDescription(phase.description);
    setEditTimeDays(phase.timeSpentDays.toString());
    setEditMoney(phase.moneySpent.toString());
  };

  const cancelEditingPhase = () => {
    console.log('🟡 [PhaseApprovalModal] Phase edit cancelled');
    setEditingPhase(null);
    setEditDescription('');
    setEditTimeDays('');
    setEditMoney('');
  };

  const createPhase = async () => {
    if (!newPhaseDescription.trim()) {
      Alert.alert(t('Error'), t('Please enter a description'));
      return;
    }

    const timeDays = parseInt(newPhaseTimeDays) || 0;
    const money = parseFloat(newPhaseMoney) || 0;

    if (timeDays <= 0) {
      Alert.alert(t('Error'), t('Please enter a valid number of days'));
      return;
    }

    if (money <= 0) {
      Alert.alert(t('Error'), t('Please enter a valid amount'));
      return;
    }

    setIsCreatingPhase(true);
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'));
        return;
      }

      const url = buildApiUrl(API_ENDPOINTS.PHASES.CREATE);

      console.log('🔍 Creating phase:', url);

      const nextPhaseNumber = phases.length > 0 ? Math.max(...phases.map(p => p.phaseNumber)) + 1 : 1;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          phaseNumber: nextPhaseNumber,
          description: newPhaseDescription.trim(),
          timeSpentDays: timeDays,
          moneySpent: money,
        }),
      });

      console.log('📥 Create Phase Response Status:', response.status);

      if (response.ok) {
        Alert.alert(t('Success'), t('Phase created successfully'));
        setNewPhaseDescription('');
        setNewPhaseTimeDays('');
        setNewPhaseMoney('');
        setShowCreatePhaseForm(false);
        loadPhases(); // Reload to show updated status (and trigger status change to PHASE_PLANNING)
        onSuccess?.(); // Reload project to get updated status
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to create phase:', errorText);
        Alert.alert(t('Error'), t('Failed to create phase'));
      }
    } catch (error: any) {
      console.error('❌ Error creating phase:', error);
      Alert.alert(t('Error'), error.message || t('Failed to create phase'));
    } finally {
      setIsCreatingPhase(false);
    }
  };

  const updatePhase = async () => {
    if (!editingPhase) return;

    if (!editDescription.trim()) {
      Alert.alert(t('Error'), t('Please enter a description'));
      return;
    }

    const timeDays = parseInt(editTimeDays) || 0;
    const money = parseFloat(editMoney) || 0;

    if (timeDays <= 0) {
      Alert.alert(t('Error'), t('Please enter a valid number of days'));
      return;
    }

    if (money <= 0) {
      Alert.alert(t('Error'), t('Please enter a valid amount'));
      return;
    }

    setIsSubmittingPhase(true);
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'));
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.UPDATE, {
        phaseId: editingPhase.id,
      });

      console.log('🔍 Updating phase:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: editDescription.trim(),
          timeSpentDays: timeDays,
          moneySpent: money,
        }),
      });

      console.log('📥 Update Phase Response Status:', response.status);

      if (response.ok) {
        Alert.alert(t('Success'), t('Phase updated successfully'));
        cancelEditingPhase();
        loadPhases(); // Reload to show updated status
        onSuccess?.();
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to update phase:', errorText);
        Alert.alert(t('Error'), t('Failed to update phase'));
      }
    } catch (error: any) {
      console.error('❌ Error updating phase:', error);
      Alert.alert(t('Error'), error.message || t('Failed to update phase'));
    } finally {
      setIsSubmittingPhase(false);
    }
  };

  const getPaymentStatusColor = (status: string, completed: boolean) => {
    if (status === 'PAID') return COLORS.green60;
    if (completed && status === 'UNPAID') return COLORS.amber60;
    return COLORS.textSecondary;
  };

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('en-US').format(budget);
  };

  const renderPhase = (phase: Phase) => {
    const isApproved = !!phase.approved;
    const borderColor = isApproved ? COLORS.green60 : COLORS.primary10;
    const borderWidth = isApproved ? 0.5 : 1;

    return (
    <View
      key={phase.id}
      style={[styles.phaseCard, { borderColor, borderWidth }]}
    >
      {/* Phase Header */}
      <View style={styles.phaseHeader}>
        <Text style={styles.phaseNumber}>
          {t('Phase {{number}}', { number: phase.phaseNumber })}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getPaymentStatusColor(phase.paymentStatus, phase.completed) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getPaymentStatusColor(phase.paymentStatus, phase.completed) },
            ]}
          >
            {phase.paymentStatus}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description}>{phase.description}</Text>

      {/* Phase Details */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>
            {phase.timeSpentDays} {t('day_unit')}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="cash-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>
            {formatBudget(phase.moneySpent)} {t('SAR')}
          </Text>
        </View>
      </View>

      {/* Status Indicators */}
      <View style={styles.statusIndicators}>
        {phase.approved && (
          <View style={styles.statusIndicator}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.green60} />
            <Text style={[styles.statusIndicatorText, { color: COLORS.green80 }]}>
              {t('Approved')}
            </Text>
          </View>
        )}
        {phase.completed && (
          <View style={styles.statusIndicator}>
            <Ionicons name="checkmark-done-circle" size={18} color={COLORS.green60} />
            <Text style={[styles.statusIndicatorText, { color: COLORS.green80 }]}>
              {t('Completed')}
            </Text>
          </View>
        )}
      </View>

      {/* Payment Button (User) */}
      {!isTechnician && phase.completed && phase.paymentStatus === 'UNPAID' && (
        <TouchableOpacity
          style={styles.payButton}
          onPress={() => payForPhase(phase.id, phase.moneySpent)}
        >
          <Ionicons name="wallet-outline" size={20} color="#fff" />
          <Text style={styles.payButtonText}>
            {t('Pay {{amount}} SAR', { amount: formatBudget(phase.moneySpent) })}
          </Text>
        </TouchableOpacity>
      )}

      {/* Technician Actions */}
      {isTechnician && (
        <View style={styles.technicianActionsRow}>
          {/* Edit Button - Only if not approved yet */}
          {!phase.approved && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => startEditingPhase(phase)}
            >
              <Ionicons name="create-outline" size={18} color={COLORS.primary60} />
              <Text style={styles.editButtonText}>
                {t('Edit')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Mark Complete Button - Only if approved but not completed */}
          {phase.approved && !phase.completed && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => markPhaseComplete(phase.id)}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.completeButtonText}>
                {t('Mark as Complete')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
    );
  };

  const canApproveAll = phases.length > 0 && phases.every(p => !p.approved);

  return (
    <>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
        />
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { fontSize: scaledSize(16) }]}>
              {t('Review Phases')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={18} color={COLORS.textBody} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary60} />
              <Text style={[styles.loadingText, { fontSize: scaledSize(14) }]}>
                {t('Loading phases...')}
              </Text>
            </View>
          ) : phases.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-outline" size={64} color={COLORS.textDividers} />
              <Text style={styles.emptyText}>
                {isTechnician ? t('No phases found. Create your first phase to start.') : t('No phases found')}
              </Text>
              {isTechnician && (
                <TouchableOpacity
                  style={styles.createPhaseButton}
                  onPress={() => {
                    console.log('🟡 [PhaseApprovalModal] "Create First Phase" button clicked');
                    console.log('🟡 [PhaseApprovalModal] Opening create phase form for technician');
                    setShowCreatePhaseForm(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.createPhaseButtonText}>
                    {t('Create First Phase')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {phases.map(renderPhase)}

              {/* Total Summary */}
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryTitle, { fontSize: scaledSize(16) }]}>
                  {t('Project Total')}
                </Text>
                <Text style={styles.summaryAmount}>
                  {formatBudget(phases.reduce((sum, p) => sum + p.moneySpent, 0))} {t('SAR')}
                </Text>
              </View>

              {/* View Contract Button */}
              {!canApproveAll && phases.some(p => p.approved) && (
                <TouchableOpacity
                  style={styles.contractButton}
                  onPress={() => {
                    onOpenContract?.();
                  }}
                >
                  <Ionicons name="document-text-outline" size={22} color="#fff" />
                  <Text style={styles.contractButtonText}>
                    {t('View Contract')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Create Phase Form (Technician) */}
              {showCreatePhaseForm && (() => {
                console.log('🟡 [PhaseApprovalModal] ✅ CREATE PHASE FORM IS NOW VISIBLE');
                console.log('🟡 [PhaseApprovalModal] Technician can create a new phase');
                return null;
              })()}
              {showCreatePhaseForm && (
                <View style={[styles.feedbackCard, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.feedbackTitle, { color: colors.text }]}>
                    {t('Create New Phase')}
                  </Text>

                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    {t('Description')}
                  </Text>
                  <TextInput
                    style={[
                      styles.feedbackInput,
                      { backgroundColor: colors.background, color: colors.text },
                    ]}
                    multiline
                    numberOfLines={3}
                    placeholder={t('Enter phase description...')}
                    placeholderTextColor={colors.textSecondary}
                    value={newPhaseDescription}
                    onChangeText={setNewPhaseDescription}
                  />

                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    {t('Duration (days)')}
                  </Text>
                  <TextInput
                    style={[
                      styles.feedbackInput,
                      { backgroundColor: colors.background, color: colors.text },
                    ]}
                    keyboardType="numeric"
                    placeholder={t('Enter number of days...')}
                    placeholderTextColor={colors.textSecondary}
                    value={newPhaseTimeDays}
                    onChangeText={setNewPhaseTimeDays}
                  />

                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    {t('Cost (SAR)')}
                  </Text>
                  <TextInput
                    style={[
                      styles.feedbackInput,
                      { backgroundColor: colors.background, color: colors.text },
                    ]}
                    keyboardType="numeric"
                    placeholder={t('Enter cost amount...')}
                    placeholderTextColor={colors.textSecondary}
                    value={newPhaseMoney}
                    onChangeText={setNewPhaseMoney}
                  />

                  <View style={styles.feedbackButtons}>
                    <TouchableOpacity
                      style={[styles.feedbackButton, styles.cancelButton]}
                      onPress={() => {
                        console.log('🟡 [PhaseApprovalModal] Create phase form cancelled');
                        setShowCreatePhaseForm(false);
                        setNewPhaseDescription('');
                        setNewPhaseTimeDays('');
                        setNewPhaseMoney('');
                      }}
                    >
                      <Text style={[styles.feedbackButtonText, { color: colors.text }]}>
                        {t('Cancel')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.feedbackButton, styles.submitButton]}
                      onPress={createPhase}
                      disabled={isCreatingPhase}
                    >
                      {isCreatingPhase ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.feedbackButtonText}>{t('Create')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Edit Phase Form (Technician) */}
              {editingPhase && (() => {
                console.log('🟡 [PhaseApprovalModal] ✅ EDIT PHASE FORM IS NOW VISIBLE');
                console.log('🟡 [PhaseApprovalModal] Editing Phase ID:', editingPhase.id);
                console.log('🟡 [PhaseApprovalModal] Editing Phase Number:', editingPhase.phaseNumber);
                console.log('🟡 [PhaseApprovalModal] Technician can edit phase details');
                return null;
              })()}
              {editingPhase && (
                <View style={[styles.feedbackCard, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.feedbackTitle, { color: colors.text }]}>
                    {t('Edit Phase')}
                  </Text>

                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    {t('Description')}
                  </Text>
                  <TextInput
                    style={[
                      styles.feedbackInput,
                      { backgroundColor: colors.background, color: colors.text },
                    ]}
                    multiline
                    numberOfLines={3}
                    placeholder={t('Enter phase description...')}
                    placeholderTextColor={colors.textSecondary}
                    value={editDescription}
                    onChangeText={setEditDescription}
                  />

                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    {t('Duration (days)')}
                  </Text>
                  <TextInput
                    style={[
                      styles.feedbackInput,
                      { backgroundColor: colors.background, color: colors.text },
                    ]}
                    keyboardType="numeric"
                    placeholder={t('Enter number of days...')}
                    placeholderTextColor={colors.textSecondary}
                    value={editTimeDays}
                    onChangeText={setEditTimeDays}
                  />

                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    {t('Cost (SAR)')}
                  </Text>
                  <TextInput
                    style={[
                      styles.feedbackInput,
                      { backgroundColor: colors.background, color: colors.text },
                    ]}
                    keyboardType="numeric"
                    placeholder={t('Enter cost amount...')}
                    placeholderTextColor={colors.textSecondary}
                    value={editMoney}
                    onChangeText={setEditMoney}
                  />

                  <View style={styles.feedbackButtons}>
                    <TouchableOpacity
                      style={[styles.feedbackButton, styles.cancelButton]}
                      onPress={cancelEditingPhase}
                    >
                      <Text style={[styles.feedbackButtonText, { color: colors.text }]}>
                        {t('Cancel')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.feedbackButton, styles.submitButton]}
                      onPress={updatePhase}
                      disabled={isSubmittingPhase}
                    >
                      {isSubmittingPhase ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.feedbackButtonText}>{t('Save')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Feedback Form */}
              {showFeedbackForm && (
                <View style={[styles.feedbackCard, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.feedbackTitle, { color: colors.text }]}>
                    {t('Provide Feedback')}
                  </Text>
                  <TextInput
                    style={[
                      styles.feedbackInput,
                      { backgroundColor: colors.background, color: colors.text },
                    ]}
                    multiline
                    numberOfLines={4}
                    placeholder={t('Enter your feedback here...')}
                    placeholderTextColor={colors.textSecondary}
                    value={feedbackText}
                    onChangeText={setFeedbackText}
                  />
                  <View style={styles.feedbackButtons}>
                    <TouchableOpacity
                      style={[styles.feedbackButton, styles.cancelButton]}
                      onPress={() => {
                        setShowFeedbackForm(false);
                        setFeedbackText('');
                      }}
                    >
                      <Text style={[styles.feedbackButtonText, { color: colors.text }]}>
                        {t('Cancel')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.feedbackButton, styles.submitButton]}
                      onPress={submitFeedback}
                      disabled={isSubmittingFeedback}
                    >
                      {isSubmittingFeedback ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.feedbackButtonText}>{t('Submit')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* Action Buttons */}
          {!isLoading && (
            <View style={[styles.actionButtons, { borderTopColor: colors.border }]}>
              {/* Technician: Add Phase Button */}
              {isTechnician && phases.length > 0 && !showCreatePhaseForm && (
                <TouchableOpacity
                  style={[styles.addPhaseButton, { borderColor: colors.primary }]}
                  onPress={() => {
                    console.log('🟡 [PhaseApprovalModal] "Add Phase" button clicked');
                    console.log('🟡 [PhaseApprovalModal] Opening create phase form for technician');
                    setShowCreatePhaseForm(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={[styles.addPhaseButtonText, { color: colors.primary }]}>
                    {t('Add Phase')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* User: Approve All Button */}
              {!isTechnician && phases.length > 0 && canApproveAll && (
                <TouchableOpacity
                  style={[styles.approveAllButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    console.log('🔘 [PhaseApprovalModal] Approve All Button - onPress triggered');
                    console.log('🔘 [PhaseApprovalModal] isTechnician:', isTechnician);
                    console.log('🔘 [PhaseApprovalModal] phases.length:', phases.length);
                    console.log('🔘 [PhaseApprovalModal] canApproveAll:', canApproveAll);
                    approveAllPhases();
                  }}
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.approveAllButtonText}>
                        {t('Approve All Phases')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* User: Feedback Button */}
              {!isTechnician && phases.length > 0 && !showFeedbackForm && (
                <TouchableOpacity
                  style={[styles.feedbackToggleButton, { borderColor: colors.border }]}
                  onPress={() => setShowFeedbackForm(true)}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                  <Text style={[styles.feedbackToggleText, { color: colors.primary }]}>
                    {t('Provide Feedback')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Technician: View Feedback Button */}
              {isTechnician && phases.length > 0 && (
                <TouchableOpacity
                  style={[styles.feedbackToggleButton, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowFeedbacks(!showFeedbacks);
                    if (!showFeedbacks && feedbacks.length === 0) {
                      loadFeedbacks('all');
                    }
                  }}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                  <Text style={[styles.feedbackToggleText, { color: colors.primary }]}>
                    {showFeedbacks ? t('Hide Feedback') : t('View Feedback')}
                  </Text>
                  {feedbacks.length > 0 && (
                    <View style={[styles.feedbackBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.feedbackBadgeText}>{feedbacks.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Technician: Display Feedbacks */}
              {isTechnician && showFeedbacks && (
                <View style={styles.feedbacksContainer}>
                  {/* Filter Buttons */}
                  <View style={styles.feedbackFilters}>
                    <TouchableOpacity
                      style={[
                        styles.feedbackFilterButton,
                        { borderColor: colors.border },
                        feedbackFilter === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => {
                        setFeedbackFilter('all');
                        loadFeedbacks('all');
                      }}
                    >
                      <Text style={[
                        styles.feedbackFilterText,
                        { color: feedbackFilter === 'all' ? '#fff' : colors.text }
                      ]}>
                        {t('All')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.feedbackFilterButton,
                        { borderColor: colors.border },
                        feedbackFilter === 'pending' && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => {
                        setFeedbackFilter('pending');
                        loadFeedbacks('pending');
                      }}
                    >
                      <Text style={[
                        styles.feedbackFilterText,
                        { color: feedbackFilter === 'pending' ? '#fff' : colors.text }
                      ]}>
                        {t('Pending')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.feedbackFilterButton,
                        { borderColor: colors.border },
                        feedbackFilter === 'resolved' && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => {
                        setFeedbackFilter('resolved');
                        loadFeedbacks('resolved');
                      }}
                    >
                      <Text style={[
                        styles.feedbackFilterText,
                        { color: feedbackFilter === 'resolved' ? '#fff' : colors.text }
                      ]}>
                        {t('Resolved')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {isLoadingFeedbacks ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
                  ) : feedbacks.length > 0 ? (
                    feedbacks.map((feedback: any, index: number) => {
                      const isResolved = feedback.status === 'RESOLVED' || feedback.status === 'resolved';
                      return (
                        <View key={feedback.id || index} style={[styles.feedbackCard, { backgroundColor: colors.cardBackground }]}>
                          <View style={styles.feedbackHeader}>
                            <Text style={[styles.feedbackTitle, { color: colors.text }]}>
                              {t('Feedback')} {index + 1}
                            </Text>
                            <View style={styles.feedbackHeaderRight}>
                              <Text style={[styles.feedbackDate, { color: colors.textSecondary }]}>
                                {feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString() : ''}
                              </Text>
                              {!isResolved && (
                                <TouchableOpacity
                                  style={[styles.resolveButton, { backgroundColor: '#10B981' }]}
                                  onPress={() => {
                                    console.log('🔘 [PhaseApprovalModal] Resolve Button - onPress triggered');
                                    console.log('🔘 [PhaseApprovalModal] Feedback ID:', feedback.id);
                                    resolveFeedback(feedback.id);
                                  }}
                                >
                                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                                  <Text style={styles.resolveButtonText}>
                                    {t('Resolve')}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                          <Text style={[styles.feedbackText, { color: colors.text }]}>
                            {feedback.comment || feedback.feedbackText || ''}
                          </Text>
                          <View style={[
                            styles.feedbackStatus,
                            { backgroundColor: isResolved ? '#10B981' + '20' : '#F59E0B' + '20' }
                          ]}>
                            <Ionicons 
                              name={isResolved ? "checkmark-circle" : "time-outline"} 
                              size={16} 
                              color={isResolved ? '#10B981' : '#F59E0B'} 
                            />
                            <Text style={[
                              styles.feedbackStatusText,
                              { color: isResolved ? '#10B981' : '#F59E0B' }
                            ]}>
                              {isResolved ? t('Resolved') : t('Pending')}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={[styles.feedbackCard, { backgroundColor: colors.cardBackground }]}>
                      <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
                        {t('No feedback available yet')}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Action Buttons (User Only) - Legacy */}
          {false && !isLoading && phases.length > 0 && !isTechnician && (
            <View style={[styles.actionButtons, { borderTopColor: colors.border }]}>
              {canApproveAll && (
                <TouchableOpacity
                  style={[styles.approveAllButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    console.log('🔘 [PhaseApprovalModal] Approve All Button (Legacy) - onPress triggered');
                    console.log('🔘 [PhaseApprovalModal] canApproveAll:', canApproveAll);
                    approveAllPhases();
                  }}
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.approveAllButtonText}>
                        {t('Approve All Phases')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {!showFeedbackForm && (
                <TouchableOpacity
                  style={[styles.feedbackToggleButton, { borderColor: colors.border }]}
                  onPress={() => setShowFeedbackForm(true)}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                  <Text style={[styles.feedbackToggleText, { color: colors.primary }]}>
                    {t('Provide Feedback')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>

    {/* Custom Confirmation Modal - Works on both web and mobile */}
    <Modal
      visible={showConfirmModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowConfirmModal(false)}
    >
      <View style={styles.confirmModalOverlay}>
        <View style={[styles.confirmModalContent, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.confirmModalTitle, { color: colors.text }]}>
            {confirmTitle}
          </Text>
          <Text style={[styles.confirmModalMessage, { color: colors.textSecondary }]}>
            {confirmMessage}
          </Text>
          <View style={styles.confirmModalButtons}>
            <TouchableOpacity
              style={[styles.confirmModalButton, styles.confirmModalCancelButton, { borderColor: colors.border }]}
              onPress={() => {
                console.log('❌ [PhaseApprovalModal] User cancelled via custom modal');
                setShowConfirmModal(false);
              }}
            >
              <Text style={[styles.confirmModalButtonText, { color: colors.text }]}>
                {t('Cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmModalButton, styles.confirmModalConfirmButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (confirmOnConfirm) {
                  confirmOnConfirm();
                }
              }}
            >
              <Text style={[styles.confirmModalButtonText, { color: '#fff' }]}>
                {confirmTitle.includes('Approve') ? t('Approve') : t('Resolve')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: COLORS.bgWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary10,
    width: '100%',
    maxWidth: 820,
    maxHeight: '90%',
    alignSelf: 'center',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
      } as any,
      default: {
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.textDividers,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textHeader,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.primary10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textBody,
    textAlign: 'center',
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  phaseCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: COLORS.bgWhite,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 18,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
    color: COLORS.textBody,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusIndicators: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green60,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green60,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  contractButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    backgroundColor: COLORS.primary60,
  },
  contractButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary10,
    borderWidth: 0.5,
    borderColor: COLORS.primary80,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textBody,
  },
  summaryAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.green60,
  },
  feedbackCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: COLORS.bgWhite,
    borderWidth: 1,
    borderColor: COLORS.primary10,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: COLORS.textHeader,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: COLORS.textDividers,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
    backgroundColor: COLORS.bgWhite,
    color: COLORS.textBody,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.primary10,
  },
  submitButton: {
    backgroundColor: COLORS.primary60,
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    position: 'relative',
  },
  feedbackToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  feedbackBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  feedbacksContainer: {
    marginTop: 16,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackDate: {
    fontSize: 12,
    fontWeight: '400',
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  feedbackStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  feedbackStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  feedbackFilterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackFilterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resolveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.bgWhite,
    borderWidth: 1,
    borderColor: COLORS.primary10,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
      } as any,
      default: {
        elevation: 5,
      },
    }),
  },
  confirmModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: COLORS.textHeader,
  },
  confirmModalMessage: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
    color: COLORS.textBody,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalCancelButton: {
    borderWidth: 1,
  },
  confirmModalConfirmButton: {
    // backgroundColor set inline
  },
  confirmModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.textDividers,
  },
  approveAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  approveAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  technicianActionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary60,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary60,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 6,
  },
  createPhaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
    backgroundColor: COLORS.primary60,
  },
  createPhaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addPhaseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addPhaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

