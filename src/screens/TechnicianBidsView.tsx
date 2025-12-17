import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import BidFormModal from './BidFormModal';
import VisitRequestModal from './VisitRequestModal';

interface TechnicianBidsViewProps {
  visible: boolean;
  project: any;
  onClose: () => void;
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
  technicianId: number;
  technicianName: string;
  projectId: number;
  projectDescription: string;
  status: string;
  requestedDate?: string;
  notes?: string;
  createdAt: string;
}

export default function TechnicianBidsView({ visible, project, onClose, onSuccess }: TechnicianBidsViewProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [myBid, setMyBid] = useState<Bid | null>(null);
  const [myVisitRequest, setMyVisitRequest] = useState<VisitRequest | null>(null);
  const [isLoadingBid, setIsLoadingBid] = useState(false);
  const [isLoadingVisit, setIsLoadingVisit] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [visitError, setVisitError] = useState<string | null>(null);
  const [showBidForm, setShowBidForm] = useState(false);
  const [showVisitRequest, setShowVisitRequest] = useState(false);
  const [hasBid, setHasBid] = useState(false);
  const [hasAskedForVisit, setHasAskedForVisit] = useState(false);

  useEffect(() => {
    if (visible && project) {
      console.log('🔵 [TechnicianBidsView] Modal opened with project:', {
        projectId: project.id,
        projectStatus: project.status,
      });
      setSelectedProject(project);
      loadMyBid();
      loadMyVisitRequest();
    } else if (!visible) {
      // When modal closes, reset all states
      console.log('🔵 [TechnicianBidsView] Modal closed, resetting states');
      setShowBidForm(false);
      setShowVisitRequest(false);
    }
  }, [visible, project]);

  const loadMyBid = async () => {
    if (!project || !project.id) return;

    setIsLoadingBid(true);
    setBidError(null);

    try {
      const userId = await storage.getUserId();
      const url = buildApiUrlWithParams(API_ENDPOINTS.BIDS.LIST, { projectId: project.id });
      console.log('🔍 [TechnicianBidsView] Fetching bids for project:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 [TechnicianBidsView] Bids API Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [TechnicianBidsView] Loaded all bids:', data.length);
        
        // Filter to only show my bid
        const myBids = data.filter((bid: Bid) => bid.technicianId === userId);
        console.log('🔵 [TechnicianBidsView] Filtered my bids:', {
          technicianId: userId,
          totalBids: data.length,
          myBidsCount: myBids.length,
          myBids: myBids.map(b => ({ id: b.id, status: b.status })),
        });
        
        if (myBids.length > 0) {
          setMyBid(myBids[0]); // Take the first one (should only be one)
          setHasBid(true);
        } else {
          setMyBid(null);
          setHasBid(false);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ [TechnicianBidsView] Failed to load bids - Status:', response.status);
        console.error('❌ Error response:', errorText);
        setBidError('Failed to load bids');
      }
    } catch (error) {
      console.error('❌ [TechnicianBidsView] Error loading bids:', error);
      setBidError('Error loading bids');
    } finally {
      setIsLoadingBid(false);
    }
  };

  const loadMyVisitRequest = async () => {
    if (!project || !project.id) return;

    setIsLoadingVisit(true);
    setVisitError(null);

    try {
      const userId = await storage.getUserId();
      const url = buildApiUrlWithParams(API_ENDPOINTS.VISIT_REQUESTS.LIST, { projectId: project.id });
      console.log('🔍 [TechnicianBidsView] Fetching visit requests for project:', url);

      const token = await storage.getAuthToken();
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 [TechnicianBidsView] Visit Requests API Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [TechnicianBidsView] Loaded all visit requests:', data.length);
        
        // Filter to only show my visit request
        const myVisits = data.filter((visit: VisitRequest) => visit.technicianId === userId);
        console.log('🔵 [TechnicianBidsView] Filtered my visit requests:', {
          technicianId: userId,
          totalVisits: data.length,
          myVisitsCount: myVisits.length,
          myVisits: myVisits.map(v => ({ id: v.id, status: v.status })),
        });
        
        if (myVisits.length > 0) {
          setMyVisitRequest(myVisits[0]); // Take the first one (should only be one)
          setHasAskedForVisit(true);
        } else {
          setMyVisitRequest(null);
          setHasAskedForVisit(false);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ [TechnicianBidsView] Failed to load visit requests - Status:', response.status);
        console.error('❌ Error response:', errorText);
        setVisitError('Failed to load visit requests');
      }
    } catch (error) {
      console.error('❌ [TechnicianBidsView] Error loading visit requests:', error);
      setVisitError('Error loading visit requests');
    } finally {
      setIsLoadingVisit(false);
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
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  };

  const handleRequestVisit = async () => {
    setShowVisitRequest(true);
  };

  const handleWithdrawBid = async () => {
    if (!myBid) return;

    Alert.alert(
      t('Withdraw Bid'),
      t('Are you sure you want to withdraw your bid? This action cannot be undone.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Withdraw'),
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await storage.getAuthToken();
              if (!token) {
                Alert.alert(t('Error'), t('Please login again'));
                return;
              }

              const url = buildApiUrlWithParams(API_ENDPOINTS.BIDS.DELETE, {
                id: myBid.id,
              });

              console.log('🗑️ [TechnicianBidsView] Withdrawing bid:', url);
              console.log('   Bid ID:', myBid.id);

              const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              console.log('📥 [TechnicianBidsView] Withdraw Bid Response Status:', response.status);

              if (response.ok) {
                console.log('✅ [TechnicianBidsView] Bid withdrawn successfully');
                Alert.alert(t('Success'), t('Bid withdrawn successfully'));
                // Reload bid data to reflect the change
                await loadMyBid();
                // Reset bid state
                setMyBid(null);
                setHasBid(false);
                onSuccess?.();
              } else {
                const errorText = await response.text();
                console.error('❌ [TechnicianBidsView] Failed to withdraw bid:', errorText);
                Alert.alert(t('Error'), t('Failed to withdraw bid'));
              }
            } catch (error: any) {
              console.error('❌ [TechnicianBidsView] Error withdrawing bid:', error);
              Alert.alert(t('Error'), error.message || t('Failed to withdraw bid'));
            }
          },
        },
      ]
    );
  };

  if (!selectedProject) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('My Bids & Visits')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
          {/* Project Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('Project')}
            </Text>
            <Text style={[styles.projectDescription, { color: colors.textSecondary }]}>
              {selectedProject.description}
            </Text>
            <View style={styles.projectInfoRow}>
              <Ionicons name="cash-outline" size={16} color={colors.primary} />
              <Text style={[styles.projectInfoText, { color: colors.text }]}>
                {formatBudget(selectedProject.budget)} SAR
              </Text>
            </View>
          </View>

          {/* My Bid Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="hand-left-outline" size={24} color="#10B981" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('My Bid')}
              </Text>
            </View>

            {isLoadingBid ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  {t('Loading bid...')}
                </Text>
              </View>
            ) : bidError ? (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {bidError}
              </Text>
            ) : myBid ? (
              <View style={[styles.bidCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={styles.bidHeader}>
                  <View style={styles.bidInfo}>
                    <Text style={[styles.bidPrice, { color: colors.primary }]}>
                      {formatBudget(myBid.proposedBudget)} SAR
                    </Text>
                    <Text style={[styles.bidDate, { color: colors.textSecondary }]}>
                      {formatDate(myBid.createdAt)}
                    </Text>
                  </View>
                  <View style={[styles.bidStatusBadge, { backgroundColor: myBid.status === 'PENDING' ? '#F59E0B20' : myBid.status === 'ACCEPTED' ? '#10B98120' : '#EF444420' }]}>
                    <Text style={[styles.bidStatusText, { color: myBid.status === 'PENDING' ? '#F59E0B' : myBid.status === 'ACCEPTED' ? '#10B981' : '#EF4444' }]}>
                      {myBid.status}
                    </Text>
                  </View>
                </View>
                {myBid.comment && (
                  <Text style={[styles.bidComment, { color: colors.textSecondary }]}>
                    {myBid.comment}
                  </Text>
                )}
                {/* Withdraw Bid Button - Only show for pending bids */}
                {myBid.status === 'PENDING' && (
                  <TouchableOpacity
                    style={[styles.withdrawButton, { backgroundColor: '#EF4444' }]}
                    onPress={handleWithdrawBid}
                  >
                    <Ionicons name="close-circle" size={18} color="#fff" />
                    <Text style={styles.withdrawButtonText}>
                      {t('Withdraw Bid')}
                    </Text>
                  </TouchableOpacity>
                )}
                {/* Show message for accepted/rejected bids */}
                {myBid.status !== 'PENDING' && (
                  <View style={styles.bidStatusMessage}>
                    <Text style={[styles.bidStatusMessageText, { color: colors.textSecondary }]}>
                      {myBid.status === 'ACCEPTED' 
                        ? t('This bid has been accepted. You cannot withdraw it.')
                        : t('This bid cannot be withdrawn.')}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="hand-left-outline" size={48} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('You have not placed a bid yet')}
                </Text>
                {selectedProject?.status !== 'ACCEPTED' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowBidForm(true)}
                  >
                    <Ionicons name="hand-left" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>
                      {t('Bid Now')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* My Visit Request Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="home-outline" size={24} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('My Visit Request')}
              </Text>
            </View>

            {isLoadingVisit ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  {t('Loading visit request...')}
                </Text>
              </View>
            ) : visitError ? (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {visitError}
              </Text>
            ) : myVisitRequest ? (
              <View style={[styles.visitCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={styles.visitHeader}>
                  <View style={styles.visitInfo}>
                    <Text style={[styles.visitDate, { color: colors.textSecondary }]}>
                      {formatDate(myVisitRequest.createdAt)}
                    </Text>
                    {myVisitRequest.requestedDate && (
                      <Text style={[styles.visitRequestedDate, { color: colors.text }]}>
                        {t('Requested Date')}: {formatDate(myVisitRequest.requestedDate)}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.visitStatusBadge, { backgroundColor: myVisitRequest.status === 'PENDING' ? '#F59E0B20' : myVisitRequest.status === 'APPROVED' ? '#10B98120' : '#EF444420' }]}>
                    <Text style={[styles.visitStatusText, { color: myVisitRequest.status === 'PENDING' ? '#F59E0B' : myVisitRequest.status === 'APPROVED' ? '#10B981' : '#EF4444' }]}>
                      {myVisitRequest.status}
                    </Text>
                  </View>
                </View>
                {myVisitRequest.notes && (
                  <Text style={[styles.visitNotes, { color: colors.textSecondary }]}>
                    {myVisitRequest.notes}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="home-outline" size={48} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('You have not requested a visit yet')}
                </Text>
                {selectedProject?.status !== 'ACCEPTED' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                    onPress={handleRequestVisit}
                    disabled={hasAskedForVisit}
                  >
                    <Ionicons name="home" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>
                      {t('Ask for Visit')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Bid Form Modal */}
      <BidFormModal
        visible={showBidForm}
        project={selectedProject}
        onClose={() => setShowBidForm(false)}
        onSuccess={() => {
          console.log('✅ [TechnicianBidsView] Bid submitted successfully');
          loadMyBid();
          setShowBidForm(false);
          onSuccess?.();
        }}
      />

      {/* Visit Request Modal */}
      <VisitRequestModal
        visible={showVisitRequest}
        project={selectedProject}
        onClose={() => setShowVisitRequest(false)}
        onSuccess={() => {
          console.log('✅ [TechnicianBidsView] Visit request submitted successfully');
          loadMyVisitRequest();
          setShowVisitRequest(false);
          onSuccess?.();
        }}
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
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  projectDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  projectInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectInfoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bidCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bidInfo: {
    flex: 1,
  },
  bidPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bidDate: {
    fontSize: 12,
  },
  bidStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  bidStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bidComment: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  visitCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  visitInfo: {
    flex: 1,
  },
  visitDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  visitRequestedDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  visitStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  visitStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  visitNotes: {
    fontSize: 14,
    lineHeight: 20,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bidStatusMessage: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  bidStatusMessageText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  errorText: {
    padding: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
});

