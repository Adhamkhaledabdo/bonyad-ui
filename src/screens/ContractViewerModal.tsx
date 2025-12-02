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
  Linking,
  Platform,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { API_ENDPOINTS, buildApiUrlWithParams, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { formatMessageTime } from '../utils/chatUtils';
import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';

interface ContractViewerModalProps {
  visible: boolean;
  projectId: number;
  phases?: Phase[];
  projectDetails?: {
    description: string;
    budget: number;
    address?: string;
    technicianName?: string;
    technicianId?: number;
    userName?: string;
  };
  onClose: () => void;
  onSign?: () => void;
  isTechnician?: boolean;
}

interface Phase {
  id: number;
  phaseNumber: number;
  description: string;
  timeSpentDays: number;
  moneySpent: number;
  approved: boolean;
  completed: boolean;
}

export default function ContractViewerModal({
  visible,
  projectId,
  phases: providedPhases,
  projectDetails: providedProjectDetails,
  onClose,
  onSign,
  isTechnician: providedIsTechnician,
}: ContractViewerModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureStatus, setSignatureStatus] = useState<any>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [technicianEmail, setTechnicianEmail] = useState('');
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [phases, setPhases] = useState<Phase[]>(providedPhases || []);
  const [projectDetails, setProjectDetails] = useState(providedProjectDetails);
  const [isTechnician, setIsTechnician] = useState(providedIsTechnician || false);
  
  // Custom confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmOnConfirm, setConfirmOnConfirm] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (visible && projectId) {
      // If phases and project details not provided, fetch them
      if (!providedPhases || !providedProjectDetails) {
        loadProjectData();
      }

      // Determine user role if not provided
      if (providedIsTechnician === undefined) {
        checkUserRole();
      }
    }
  }, [visible, projectId]);

  useEffect(() => {
    if (signatureStatus?.signatories) {
      const clientSignatory = signatureStatus.signatories.find((sig: any) => sig.role === 'CLIENT');
      const technicianSignatory = signatureStatus.signatories.find((sig: any) => sig.role === 'TECHNICIAN');

      if (clientSignatory?.email) {
        setUserEmail(clientSignatory.email);
      }
      if (technicianSignatory?.email) {
        setTechnicianEmail(technicianSignatory.email);
      }
    }
  }, [signatureStatus]);

  const checkUserRole = async () => {
    try {
      const userRole = await storage.getUserRole();
      setIsTechnician(userRole === 'technician');
    } catch (error) {
      console.log('Error checking user role:', error);
    }
  };

  const loadProjectData = async () => {
    try {
      setIsLoading(true);
      const token = await storage.getAuthToken();
      if (!token) {
        console.error('❌ No auth token found');
        return;
      }

      // Load project details
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

      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        console.log('✅ [ContractViewerModal] Project API response:', JSON.stringify(projectData, null, 2));
        const projectPayload = projectData?.project ?? projectData;

        const derivedTechnicianId =
          projectPayload?.technicianId ||
          projectPayload?.assignedTechnicianId ||
          projectPayload?.assignedTechnician?.id ||
          projectPayload?.technician?.id ||
          projectPayload?.acceptedBid?.technicianId ||
          null;

        const derivedTechnicianName =
          projectPayload?.technicianName ||
          projectPayload?.assignedTechnician?.name ||
          projectPayload?.technician?.name ||
          projectPayload?.acceptedBid?.technicianName ||
          '';

        setProjectDetails({
          description: projectPayload?.description || '',
          budget: projectPayload?.budget || 0,
          address: projectPayload?.address,
          technicianName: derivedTechnicianName,
          technicianId: derivedTechnicianId,
          userName: projectPayload?.userName,
        });

        if (!providedPhases && Array.isArray(projectData?.phases)) {
          setPhases(projectData.phases);
        }
      }
 
      // Load phases
      if (!providedPhases) {
        const phasesUrl = buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, {
          projectId,
        });

        const phasesResponse = await fetch(phasesUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (phasesResponse.ok) {
          const phasesData = await phasesResponse.json();
          setPhases(phasesData);
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading project data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signContract = async () => {
    const hasEmails = userEmail.trim().length > 0 && technicianEmail.trim().length > 0;

    // Require emails the first time or if missing
    if (!signatureStatus || !hasEmails) {
      setShowEmailForm(true);
      return;
    }

    const sanitizedUserEmail = userEmail.trim();
    const sanitizedTechnicianEmail = technicianEmail.trim();

    setConfirmTitle(t('Sign Contract'));
    setConfirmMessage(t('By signing this contract, you agree to the terms and conditions. Are you sure?'));
    setConfirmOnConfirm(() => async () => {
      await submitSignature(sanitizedUserEmail, sanitizedTechnicianEmail);
    });
    setShowConfirmModal(true);
  };

  const submitSignature = async (userEmailInput?: string, technicianEmailInput?: string) => {
    setShowConfirmModal(false);
    setIsSigning(true);
    try {
      const token = await storage.getAuthToken();
      const userId = await storage.getUserId();

      if (!token || !userId) {
        Alert.alert(t('Error'), t('Please login again'));
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const resolvedUserEmail = (userEmailInput ?? userEmail).trim();
      const resolvedTechnicianEmail = (technicianEmailInput ?? technicianEmail).trim();

      if (!emailRegex.test(resolvedUserEmail)) {
        Alert.alert(t('Error'), t('Invalid user email'));
        setIsSigning(false);
        return;
      }
      if (!emailRegex.test(resolvedTechnicianEmail)) {
        Alert.alert(t('Error'), t('Invalid technician email'));
        setIsSigning(false);
        return;
      }

      setUserEmail(resolvedUserEmail);
      setTechnicianEmail(resolvedTechnicianEmail);
      setShowEmailForm(false);

      const url = buildApiUrl(API_ENDPOINTS.CONTRACTS.CREATE);

      console.log('═══════════════════════════════════════════════════════════');
      console.log('🟢 [ContractViewerModal] Initiate Signature Request');
      console.log('🟢 [ContractViewerModal] Endpoint: POST /signatures');
      console.log('🟢 [ContractViewerModal] Project ID:', projectId);
      console.log('🟢 [ContractViewerModal] Technician ID:', projectDetails?.technicianId);
      console.log('🟢 [ContractViewerModal] User Email:', userEmailInput);
      console.log('🟢 [ContractViewerModal] Technician Email:', technicianEmailInput);
      console.log('🟢 [ContractViewerModal] URL:', url);
      console.log('═══════════════════════════════════════════════════════════');

      // Load PDF file from assets
      let pdfData: any = null;
      try {
        if (Platform.OS === 'web') {
          // For web, fetch the PDF as blob
          const pdfPath = require('../../assets/contract.pdf');
          const response = await fetch(pdfPath);
          const blob = await response.blob();
          pdfData = blob;
        } else {
          // For mobile, load asset properly with expo-asset
          const asset = Asset.fromModule(require('../../assets/contract.pdf'));
          await asset.downloadAsync();
          
          if (asset.localUri) {
            pdfData = {
              uri: asset.localUri,
              type: 'application/pdf',
              name: 'contract.pdf',
            };
          } else {
            throw new Error('Could not get local URI for PDF');
          }
        }
        console.log('✅ PDF loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load PDF:', error);
        Alert.alert(t('Error'), t('Failed to load contract PDF'));
        setIsSigning(false);
        return;
      }

      // Create FormData
      const formData = new FormData();

      formData.append('projectId', projectId.toString());

      if (!projectDetails?.technicianId) {
        throw new Error('Missing technician ID for contract signing');
      }

      formData.append('technicianId', projectDetails.technicianId.toString());

      // Phase IDs (optional, can be empty string)
      const phaseIds = phases.length > 0 ? phases.map((p) => p.id.toString()).join(',') : '';
      formData.append('phaseIds', phaseIds);

      // Contract terms
      const contractTerms = 'Payment as agreed. 1 year warranty.';
      formData.append('contractTerms', contractTerms);

      // Project title (truncated to 200 characters)
      if (projectDetails) {
        const truncatedTitle = projectDetails.description.substring(0, 200);
        formData.append('projectTitle', truncatedTitle);
      }

      // Email addresses (required for signature request)
      formData.append('userEmail', resolvedUserEmail);
      formData.append('technicianEmail', resolvedTechnicianEmail);

      // Add PDF file
      if (pdfData) {
        formData.append('contractPdf', pdfData as any);
      }

      console.log('📤 [ContractViewerModal] Sending multipart form data with PDF');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - let browser set it with boundary
        } as any,
        body: formData as any,
      });

      console.log('📥 [ContractViewerModal] Signature Response Status:', response.status);

      if (response.ok || response.status === 201) {
        const data = await response.json();
        console.log('✅ [ContractViewerModal] Signature request created successfully!');
        console.log('✅ [ContractViewerModal] Signature ID:', data.id);
        console.log('✅ [ContractViewerModal] SignIt Reference:', data.thirdPartyReferenceId);
        
        // Show success message using custom modal
        setConfirmTitle(t('Success'));
        setConfirmMessage(t('Signature requests sent! Both parties will receive emails to sign the contract.'));
        setSignatureStatus(data);
        setConfirmOnConfirm(() => () => {
          setShowConfirmModal(false);
          onSign?.();
        });
        setShowConfirmModal(true);
      } else {
        const errorText = await response.text();
        console.error('❌ [ContractViewerModal] Failed to sign contract:', errorText);
        console.error('❌ [ContractViewerModal] Status:', response.status);
        Alert.alert(t('Error'), t('Failed to sign contract'));
      }
    } catch (error: any) {
      console.error('❌ [ContractViewerModal] Error signing contract:', error);
      Alert.alert(t('Error'), error.message || t('Failed to sign contract'));
    } finally {
      setIsSigning(false);
    }
  };

  const getPdfUrl = () => {
    if (signatureStatus?.documentUrl) {
      return String(signatureStatus.documentUrl);
    }
    
    // For local PDF, use require which works on web and mobile
    if (Platform.OS === 'web') {
      // On web, require() returns a path that works
      try {
        const pdfAsset = require('../../assets/contract.pdf');
        return pdfAsset;
      } catch (e) {
        return null;
      }
    } else {
      // On mobile, try to get the asset URI
      try {
        const pdfAsset = require('../../assets/contract.pdf');
        return pdfAsset;
      } catch (e) {
        return null;
      }
    }
  };

  const viewPdfContract = async () => {
    if (Platform.OS === 'web') {
      // On web, show inline viewer
      setShowPdfViewer(true);
    } else {
      // On mobile, open PDF with external viewer
      try {
        let pdfToOpen: string;
        
        // Check if we have a signed PDF URL or need to use template
        if (signatureStatus?.documentUrl) {
          // For signed PDFs, use the server URL with Linking
          await Linking.openURL(String(signatureStatus.documentUrl));
          return;
        } else {
          // For template PDF, load asset and share it
          const asset = Asset.fromModule(require('../../assets/contract.pdf'));
          await asset.downloadAsync();
          
          if (asset.localUri) {
            console.log('✅ PDF asset loaded:', asset.localUri);
            
            // Check if sharing is available
            if (await Sharing.isAvailableAsync()) {
              // Share the PDF (opens in PDF viewer)
              await Sharing.shareAsync(asset.localUri);
            } else {
              // Fallback: show modal with explanation
              Alert.alert(t('Info'), t('The contract will be generated on the server with your project details. Please initiate the signature to generate the filled contract.'));
            }
          } else {
            throw new Error('Could not get local URI for PDF');
          }
        }
      } catch (error) {
        console.error('❌ Error opening PDF:', error);
        Alert.alert(t('Error'), t('Could not open PDF contract'));
      }
    }
  };

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('en-US').format(budget);
  };

  const getSignatoryStatus = () => {
    if (!signatureStatus) return null;

    const myRole = isTechnician ? 'TECHNICIAN' : 'CLIENT';
    return signatureStatus.signatories?.find((s: any) => s.role === myRole);
  };

  const mySignature = getSignatoryStatus();
  const allSigned = signatureStatus?.allSigned === true;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t('Project Contract')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Contract Status */}
            {signatureStatus && (
              <View
                style={[
                  styles.statusCard,
                  {
                    backgroundColor: allSigned ? '#10B98120' : '#F59E0B20',
                    borderColor: allSigned ? '#10B981' : '#F59E0B',
                  },
                ]}
              >
                {allSigned ? (
                  <View style={styles.statusRow}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    <Text style={[styles.statusText, { color: '#10B981' }]}>
                      {t('Contract Signed by Both Parties')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.statusRow}>
                    <Ionicons name="time-outline" size={24} color="#F59E0B" />
                    <Text style={[styles.statusText, { color: '#F59E0B' }]}>
                      {t('Waiting for Signatures')}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Project Details */}
            {projectDetails && (
              <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('Project Details')}
                </Text>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    {t('Description')}:
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {projectDetails.description}
                  </Text>
                </View>

                {projectDetails.address && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      {t('Location')}:
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {projectDetails.address}
                    </Text>
                  </View>
                )}

                {projectDetails.technicianName && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      {isTechnician ? t('Client') : t('Technician')}:
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {isTechnician ? projectDetails.userName : projectDetails.technicianName}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    {t('Project Total')}:
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.primary }]}>
                    {formatBudget(projectDetails.budget)} {t('SAR')}
                  </Text>
                </View>
              </View>
            )}

            {/* Phases */}
            <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Phases')}</Text>

              {phases.length === 0 ? (
                <Text style={[styles.detailValue, { color: colors.textSecondary }]}> 
                  {t('Loading phases...')}
                </Text>
              ) : (
                phases.map((phase, index) => {
                  return (
                    <View key={phase.id} style={styles.phaseRow}>
                      <View style={styles.phaseHeader}>
                        <Text style={[styles.phaseNumber, { color: colors.text }]}>
                          {t('Phase {{number}}', { number: phase.phaseNumber })}
                        </Text>
                        <Text style={[styles.phaseAmount, { color: colors.primary }]}> 
                          {formatBudget(phase.moneySpent)} {t('SAR')}
                        </Text>
                      </View>
                      <Text style={[styles.phaseDescription, { color: colors.textSecondary }]}> 
                        {phase.description}
                      </Text>
                      <View style={styles.phaseMeta}> 
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.phaseMetaText, { color: colors.textSecondary }]}> 
                          {phase.timeSpentDays} {t('days')}
                        </Text>
                      </View>
                      {index < phases.length - 1 && (
                        <View style={[styles.phaseDivider, { borderBottomColor: colors.border }]} />
                      )}
                    </View>
                  );
                })
              )}

              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>{t('Total')}:</Text>
                <Text style={[styles.totalAmount, { color: colors.primary }]}>
                  {formatBudget(phases.reduce((sum, p) => sum + p.moneySpent, 0))} {t('SAR')}
                </Text>
              </View>
            </View>

            {/* Terms & Conditions */}
            <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('Terms & Conditions')}
              </Text>
              <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                {t(
                  'This contract outlines the agreed-upon phases, costs, and timeline for the project. Payment will be made phase-by-phase upon completion. Both parties agree to abide by the terms specified in this document.'
                )}
              </Text>
            </View>

            {/* Email Form */}
            {showEmailForm && (
              <View style={[styles.emailFormCard, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.emailFormTitle, { color: colors.text }]}>
                  {t('Enter Email Addresses')}
                </Text>
                <Text style={[styles.emailFormSubtitle, { color: colors.textSecondary }]}>
                  {t('Please provide email addresses for both parties to send the contract')}
                </Text>

                <View style={styles.emailInputContainer}>
                  <Text style={[styles.emailLabel, { color: colors.text }]}>
                    {t('User Email')}
                  </Text>
                  <TextInput
                    style={[styles.emailInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder={t('Enter user email')}
                    placeholderTextColor={colors.textSecondary}
                    value={userEmail}
                    onChangeText={setUserEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.emailInputContainer}>
                  <Text style={[styles.emailLabel, { color: colors.text }]}>
                    {t('Technician Email')}
                  </Text>
                  <TextInput
                    style={[styles.emailInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder={t('Enter technician email')}
                    placeholderTextColor={colors.textSecondary}
                    value={technicianEmail}
                    onChangeText={setTechnicianEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.emailFormButtons}>
                  <TouchableOpacity
                    style={[styles.emailFormButton, styles.cancelEmailButton, { borderColor: colors.border }]}
                    onPress={() => {
                      setShowEmailForm(false);
                      setUserEmail('');
                      setTechnicianEmail('');
                    }}
                  >
                    <Text style={[styles.emailFormButtonText, { color: colors.text }]}>
                      {t('Cancel')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.emailFormButton, styles.submitEmailButton]}
                    onPress={async () => {
                      if (!userEmail.trim() || !technicianEmail.trim()) {
                        Alert.alert(t('Error'), t('Please enter both email addresses'));
                        return;
                      }
                      // Validate email format
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (!emailRegex.test(userEmail.trim()) || !emailRegex.test(technicianEmail.trim())) {
                        Alert.alert(t('Error'), t('Please enter valid email addresses'));
                        return;
                      }
                      
                      // Show confirmation modal before sending
                      setConfirmTitle(t('Initiate Signature'));
                      setConfirmMessage(t('Send signature requests to both parties via email?'));
                      setConfirmOnConfirm(() => async () => {
                        setShowEmailForm(false);
                        await submitSignature(userEmail.trim(), technicianEmail.trim());
                      });
                      setShowConfirmModal(true);
                    }}
                    disabled={isSigning}
                  >
                    {isSigning ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.emailFormButtonText}>{t('Submit')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Signature Status */}
            {signatureStatus && mySignature && (
              <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('Signature Status')}
                </Text>

                {signatureStatus.signatories?.map((sig: any, index: number) => (
                  <View key={index} style={styles.signatoryRow}>
                    <View style={styles.signatoryInfo}>
                      <Text style={[styles.signatoryRole, { color: colors.text }]}>
                        {sig.role === 'CLIENT' ? t('Client') : t('Technician')}
                      </Text>
                      <Text style={[styles.signatoryEmail, { color: colors.textSecondary }]}>
                        {sig.email}
                      </Text>
                    </View>
                    <View style={styles.signatureStatus}>
                      {sig.status === 'SIGNED' ? (
                        <View style={styles.signedBadge}>
                          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                          <Text style={[styles.signedText, { color: '#10B981' }]}>
                            {t('Signed')}
                          </Text>
                          {sig.signedAt && (
                            <Text style={[styles.signedDate, { color: colors.textSecondary }]}>
                              {formatMessageTime(sig.signedAt)}
                            </Text>
                          )}
                        </View>
                      ) : (
                        <View style={styles.pendingBadge}>
                          <Ionicons name="time-outline" size={20} color="#F59E0B" />
                          <Text style={[styles.pendingText, { color: '#F59E0B' }]}>
                            {t('Pending')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Contract PDF Link */}
            <TouchableOpacity
              style={[styles.pdfButton, { backgroundColor: colors.primary }]}
              onPress={viewPdfContract}
            >
              <Ionicons name="document-text-outline" size={24} color="#fff" />
              <Text style={styles.pdfButtonText}>
                {allSigned && signatureStatus?.documentUrl 
                  ? t('View Signed Contract PDF') 
                  : t('View Contract Template PDF')}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Action Buttons */}
          {!allSigned && (
            <View style={[styles.actionButtons, { borderTopColor: colors.border }]}>
              {/* Show sign button if not signed yet */}
              {(!mySignature || mySignature.status !== 'SIGNED') && (
                <TouchableOpacity
                  style={[styles.signButton, { backgroundColor: colors.primary }]}
                  onPress={signContract}
                  disabled={isSigning}
                >
                  {isSigning ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="create-outline" size={20} color="#fff" />
                      <Text style={styles.signButtonText}>{t('Sign Contract')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Show waiting message if already signed */}
              {mySignature && mySignature.status === 'SIGNED' && (
                <View style={styles.waitingContainer}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  <Text style={[styles.waitingText, { color: '#10B981' }]}>
                    {t('Waiting for {{other}} to sign', {
                      other: isTechnician ? t('Client') : t('Technician'),
                    })}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* PDF Viewer Modal */}
      <Modal
        visible={showPdfViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPdfViewer(false)}
      >
        <View style={styles.pdfModalOverlay}>
          <View style={[styles.pdfModalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.pdfHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pdfHeaderTitle, { color: colors.text }]}>
                {signatureStatus?.documentUrl ? t('Signed Contract') : t('Contract Template')}
              </Text>
              <TouchableOpacity onPress={() => setShowPdfViewer(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.pdfViewer}>
              {Platform.OS === 'web' ? (
                (() => {
                  const pdfUrl = getPdfUrl();
                  if (!pdfUrl) {
                    return (
                      <View style={styles.pdfUnavailableContainer}>
                        <Ionicons name="document-text-outline" size={80} color={colors.textSecondary} />
                        <Text style={[styles.pdfUnavailableText, { color: colors.text }]}>
                          {t('PDF Preview Unavailable')}
                        </Text>
                        <Text style={[styles.pdfUnavailableSubtext, { color: colors.textSecondary }]}>
                          {t('Please use the browser to view PDF files')}
                        </Text>
                      </View>
                    );
                  }
                  return (
                    <div
                      style={{ width: '100%', height: '100%' }}
                      dangerouslySetInnerHTML={{
                        __html: `<iframe src="${String(pdfUrl)}" style="width:100%;height:100%;border:none;" />`
                      }}
                    />
                  );
                })()
              ) : (
                <View style={styles.pdfUnavailableContainer}>
                  <Ionicons name="document-text-outline" size={80} color={colors.textSecondary} />
                  <Text style={[styles.pdfUnavailableText, { color: colors.text }]}>
                    {t('PDF Preview Unavailable')}
                  </Text>
                  <Text style={[styles.pdfUnavailableSubtext, { color: colors.textSecondary }]}>
                    {signatureStatus?.documentUrl 
                      ? t('Please use the browser to view PDF files')
                      : t('The contract will be generated on the server with your project details. Please initiate the signature to generate the filled contract.')
                    }
                  </Text>
                </View>
              )}
            </View>
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
                  console.log('❌ [ContractViewerModal] User cancelled via custom modal');
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
                  {confirmTitle.includes('Success') ? t('OK') : (confirmTitle.includes('Sign') ? t('Sign') : t('Send'))}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 0.9,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  phaseRow: {
    marginBottom: 8,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  phaseNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  phaseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  phaseDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  phaseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phaseMetaText: {
    fontSize: 12,
  },
  phaseDivider: {
    borderBottomWidth: 1,
    marginTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 14,
    lineHeight: 22,
  },
  signatoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  signatoryInfo: {
    flex: 1,
  },
  signatoryRole: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  signatoryEmail: {
    fontSize: 12,
  },
  signatureStatus: {
    alignItems: 'flex-end',
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  signedDate: {
    fontSize: 12,
    marginTop: 2,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
  },
  signButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  signButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waitingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emailFormCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  emailFormTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emailFormSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  emailInputContainer: {
    marginBottom: 16,
  },
  emailLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  emailInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  emailFormButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  emailFormButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelEmailButton: {
    borderWidth: 1,
  },
  submitEmailButton: {
    backgroundColor: '#2196F3',
  },
  emailFormButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  pdfModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  pdfModalContainer: {
    flex: 1,
  },
  pdfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  pdfHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  pdfViewer: {
    flex: 1,
  },
  pdfUnavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 40,
  },
  pdfUnavailableText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pdfUnavailableSubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
  pdfOpenButton: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  pdfOpenButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  confirmModalMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
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
});

