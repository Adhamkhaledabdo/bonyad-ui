/**
 * BidReceivedProjectScreen
 * 
 * Screen for displaying project details when status is BID_RECEIVED.
 * Shows different UI based on user persona:
 * - User/Homeowner: Can view and compare bids from service providers, accept or decline bids
 *                   Also shows visit requests from technicians
 * - Technician: Can view project details and their submitted bid status
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
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
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';
import ProjectCreationFlow from '../components/ProjectCreationFlow';
import BookAppointmentModal from '../components/BookAppointmentModal';

// ===== DESIGN TOKENS FROM FIGMA =====
const COLORS = {
  // Primary Blues
  primary100: '#003867',
  primary80: '#004A8A',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary50: '#1A6DB4',
  primary10: '#E6EFF7',
  primary20: '#B3CEE6',
  // Greens
  green90: '#007B36',
  green80: '#008B3E',
  green60: '#00AC4F',
  green10: '#E6F5EC',
  // Purple
  purple100: '#3C076D',
  purple70: '#5E0BA1',
  purple60: '#6A0DAD',
  purple10: '#EFE6F5',
  // Amber
  amber60: '#FFB703',
  amber70: '#DA9C02',
  // Text
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  textWhite: '#FFFFFF',
  // Backgrounds
  bgWhite: '#FFFFFF',
};

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

interface VisitRequest {
  id: number;
  technicianId: number;
  technicianName: string;
  projectId: number;
  status: string;
  requestedDate?: string;
  notes?: string;
  createdAt: string;
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

interface Phase {
  id: number;
  phaseNumber: number;
  description: string;
  moneySpent: number;
  timeSpentDays: number;
  status?: string;
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
  requirements?: string[];
  timeRequiredDays?: number;
  phases?: Phase[];
}

interface BidReceivedProjectScreenProps {
  project: Project;
  onBack: () => void;
  onAcceptBid?: (bidId: number) => void;
  onDeclineBid?: (bidId: number) => void;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => void;
  onViewTechnician?: (technicianId: number) => void;
  onSuccess?: () => void;
  isTechnician?: boolean;
}

type UserTab = 'bids' | 'visits';

// ===== BID CARD COMPONENT (USER VIEW) =====
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
      <TouchableOpacity 
        style={bidStyles.header}
        onPress={onViewTechnician}
        activeOpacity={onViewTechnician ? 0.7 : 1}
      >
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
      </TouchableOpacity>
      
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
      
      {/* Status badge for non-pending bids */}
      {bid.status !== 'PENDING' && (
        <View style={[
          bidStyles.statusBadge,
          { backgroundColor: bid.status === 'ACCEPTED' ? COLORS.green10 : '#FEE2E2' }
        ]}>
          <Text style={[
            bidStyles.statusText,
            { color: bid.status === 'ACCEPTED' ? COLORS.green80 : '#EF4444' }
          ]}>
            {bid.status}
          </Text>
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
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

// ===== VISIT REQUEST CARD COMPONENT (USER VIEW) =====
const VisitRequestCard = ({
  visitRequest,
  index,
  onAccept,
  onDecline,
  onViewTechnician,
  onBook,
}: {
  visitRequest: VisitRequest;
  index: number;
  onAccept: () => void;
  onDecline: () => void;
  onViewTechnician?: () => void;
  onBook?: () => void;
}) => {
  const { t } = useTranslation();
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return t('Flexible');
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return t('Flexible');
    }
  };
  
  return (
    <View style={visitStyles.card}>
      {/* Header */}
      <TouchableOpacity 
        style={visitStyles.header}
        onPress={onViewTechnician}
        activeOpacity={onViewTechnician ? 0.7 : 1}
      >
        <View style={visitStyles.numberBadge}>
          <Text style={visitStyles.numberText}>{index + 1}</Text>
        </View>
        <View style={visitStyles.headerInfo}>
          <Text style={visitStyles.providerName}>{visitRequest.technicianName}</Text>
          <View style={visitStyles.ratingRow}>
            <Text style={visitStyles.starIcon}>★</Text>
            <Text style={visitStyles.ratingText}>
              {visitRequest.technician?.rating || 4.9} ({visitRequest.technician?.reviewCount || 234})
            </Text>
            <View style={visitStyles.locationRow}>
              <Ionicons name="location" size={12} color={COLORS.textSecondary} />
              <Text style={visitStyles.distanceText}>{visitRequest.technician?.distance || '0.8 mi'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      
      {/* Divider */}
      <View style={visitStyles.divider} />
      
      {/* Stats Row */}
      <View style={visitStyles.statsRow}>
        <View style={visitStyles.statBox}>
          <Text style={visitStyles.statValue}>{visitRequest.technician?.projectsCount || 156}</Text>
          <Text style={visitStyles.statLabel}>{t('Projects')}</Text>
        </View>
        <View style={visitStyles.statBox}>
          <Text style={visitStyles.statValue}>{formatDate(visitRequest.requestedDate)}</Text>
          <Text style={visitStyles.statLabel}>{t('Requested Date')}</Text>
        </View>
        <View style={visitStyles.statBox}>
          <Text style={visitStyles.statValue}>{visitRequest.technician?.responseTime || '2 hours'}</Text>
          <Text style={visitStyles.statLabel}>{t('Responses')}</Text>
        </View>
      </View>
      
      {/* Visit Request Badge */}
      <View style={visitStyles.visitBadge}>
        <Ionicons name="calendar-outline" size={14} color={COLORS.primary80} />
        <Text style={visitStyles.visitBadgeText}>{t('Visit Request')}</Text>
      </View>
      
      {/* Notes */}
      {visitRequest.notes && (
        <View style={visitStyles.notesSection}>
          <Text style={visitStyles.notesTitle}>{t('Notes')}</Text>
          <Text style={visitStyles.notesText}>{visitRequest.notes}</Text>
        </View>
      )}
      
      {/* Action Buttons */}
      {visitRequest.status === 'PENDING' && (
        <View style={visitStyles.actionRow}>
          <TouchableOpacity 
            style={[visitStyles.actionButton, visitStyles.bookButton]} 
            onPress={onBook}
          >
            <Ionicons name="calendar-outline" size={14} color={COLORS.textWhite} />
            <Text style={visitStyles.bookText}>{t('Book')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[visitStyles.actionButton, visitStyles.acceptButton]} onPress={onAccept}>
            <Ionicons name="checkmark-circle" size={12} color={COLORS.textWhite} />
            <Text style={visitStyles.acceptText}>{t('Accept')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[visitStyles.actionButton, visitStyles.declineButton]} onPress={onDecline}>
            <Ionicons name="close-circle" size={12} color={COLORS.purple70} />
            <Text style={visitStyles.declineText}>{t('Decline')}</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Status badge for non-pending visits */}
      {visitRequest.status !== 'PENDING' && (
        <View style={[
          visitStyles.statusBadge,
          { backgroundColor: visitRequest.status === 'ACCEPTED' ? COLORS.green10 : '#FEE2E2' }
        ]}>
          <Text style={[
            visitStyles.statusText,
            { color: visitRequest.status === 'ACCEPTED' ? COLORS.green80 : '#EF4444' }
          ]}>
            {visitRequest.status}
          </Text>
        </View>
      )}
    </View>
  );
};

const visitStyles = StyleSheet.create({
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
  visitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary10,
    borderWidth: 0.5,
    borderColor: COLORS.primary80,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  visitBadgeText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.primary80,
  },
  notesSection: {
    paddingVertical: 16,
    gap: 16,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textBody,
  },
  notesText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 16,
    gap: 6,
  },
  bookButton: {
    backgroundColor: COLORS.primary60,
  },
  bookText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textWhite,
  },
  acceptButton: {
    backgroundColor: COLORS.green60,
  },
  acceptText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textWhite,
  },
  declineButton: {
    backgroundColor: COLORS.purple10,
    borderWidth: 0.5,
    borderColor: COLORS.purple70,
  },
  declineText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.purple70,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

// ===== PHASE CARD COMPONENT (TECHNICIAN VIEW) =====
const PhaseCard = ({
  phase,
  formatBudget,
}: {
  phase: Phase;
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
          {phase.timeSpentDays >= 7 
            ? `${Math.ceil(phase.timeSpentDays / 7)} ${t('Week')}`
            : `${phase.timeSpentDays} ${t('day_unit')}`
          }
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

// ===== MY BID CARD COMPONENT (TECHNICIAN VIEW) =====
const MyBidCard = ({
  bid,
  formatBudget,
  onViewBid,
  onWithdrawBid,
}: {
  bid: Bid;
  formatBudget: (amount: number) => string;
  onViewBid: () => void;
  onWithdrawBid: () => void;
}) => {
  const { t } = useTranslation();
  
  return (
    <View style={myBidStyles.card}>
      {/* Header */}
      <View style={myBidStyles.header}>
        <View style={myBidStyles.headerLeft}>
          <View style={myBidStyles.iconBadge}>
            <Ionicons name="checkmark-circle" size={12} color={COLORS.textWhite} />
          </View>
          <Text style={myBidStyles.title}>{t('My Bid')}</Text>
        </View>
      </View>
      
      {/* Bid Details Row */}
      <View style={myBidStyles.detailsRow}>
        <View style={myBidStyles.detailColumn}>
          <Text style={myBidStyles.detailLabel}>{t('Bid')} #</Text>
          <Text style={myBidStyles.detailValue}>{bid.id}</Text>
        </View>
        <View style={[myBidStyles.detailColumn, { alignItems: 'flex-end' }]}>
          <Text style={myBidStyles.detailLabel}>{t('Price')}</Text>
          <Text style={[myBidStyles.detailValue, { color: COLORS.green60 }]}>
            {formatBudget(bid.proposedBudget)}
          </Text>
        </View>
      </View>
      
      {/* Description */}
      {bid.comment && (
        <View style={myBidStyles.descriptionSection}>
          <Text style={myBidStyles.descriptionLabel}>{t('Description')}</Text>
          <Text style={myBidStyles.descriptionText}>{bid.comment}</Text>
        </View>
      )}
      
      {/* Divider */}
      <View style={myBidStyles.divider} />
      
      {/* Status */}
      <View style={myBidStyles.statusRow}>
        <Ionicons name="time-outline" size={12} color={COLORS.amber70} />
        <Text style={myBidStyles.statusText}>{t('Pending approval')}</Text>
      </View>
      
      {/* Divider */}
      <View style={myBidStyles.divider} />
      
      {/* Action Buttons */}
      <TouchableOpacity style={myBidStyles.viewButton} onPress={onViewBid}>
        <Text style={myBidStyles.viewButtonText}>{t('View My Bid')}</Text>
      </TouchableOpacity>
      
      {bid.status === 'PENDING' && (
        <TouchableOpacity style={myBidStyles.withdrawButton} onPress={onWithdrawBid}>
          <Text style={myBidStyles.withdrawButtonText}>{t('Withdraw Bid')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const myBidStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.green10,
    borderWidth: 0.5,
    borderColor: COLORS.green60,
    borderRadius: 8,
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: COLORS.green60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailColumn: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.green60,
  },
  descriptionSection: {
    gap: 4,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  descriptionText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textBody,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.green80,
    opacity: 0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.amber70,
  },
  viewButton: {
    backgroundColor: COLORS.green80,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textWhite,
    textAlign: 'center',
  },
  withdrawButton: {
    backgroundColor: COLORS.purple10,
    borderWidth: 1,
    borderColor: COLORS.purple60,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.purple70,
    textAlign: 'center',
  },
});

// ===== MAIN COMPONENT =====
export default function BidReceivedProjectScreen({
  project,
  onBack,
  onAcceptBid,
  onDeclineBid,
  onOpenChat,
  onViewTechnician,
  onSuccess,
  isTechnician: propIsTechnician,
}: BidReceivedProjectScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [bids, setBids] = useState<Bid[]>([]);
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [myBid, setMyBid] = useState<Bid | null>(null);
  const [isMyBidModalVisible, setIsMyBidModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTechnician, setIsTechnician] = useState(propIsTechnician ?? false);
  const [selectedTab, setSelectedTab] = useState<UserTab>('bids');
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedVisitRequest, setSelectedVisitRequest] = useState<VisitRequest | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  
  // Custom popup hooks
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showConfirmation, hideConfirmation } = useConfirmationPopup();
  
  const serviceName = i18n.language === 'ar' ? project?.serviceNameAr : project?.serviceNameEn;

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
      // Check user role
      const role = await storage.getUserRole();
      const isTech = role?.toUpperCase() === 'TECHNICIAN';
      setIsTechnician(propIsTechnician ?? isTech);
      
      // Load bids
      await loadBids(isTech);
      
      // Load visit requests for user view
      if (!isTech) {
        await loadVisitRequests();
      }
      
      // Load phases (shown in project details for both personas)
      await loadPhases();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBids = async (isTech?: boolean) => {
    if (!project?.id) return;
    
    try {
      const token = await storage.getAuthToken();
      const userId = await storage.getUserId();
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
        
        // If technician, find their bid
        if (isTech && userId) {
          const techBid = data.find((bid: Bid) => bid.technicianId === userId);
          setMyBid(techBid || null);
        }
      }
    } catch (error) {
      console.error('Error loading bids:', error);
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

  const loadVisitRequests = async () => {
    if (!project?.id) return;
    
    try {
      const token = await storage.getAuthToken();
      const url = buildApiUrl(API_ENDPOINTS.VISIT_REQUESTS.LIST.replace(':projectId', project.id.toString()));
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setVisitRequests(data);
      }
    } catch (error) {
      console.error('Error loading visit requests:', error);
    }
  };

  const handleAcceptVisitRequest = async (visitRequestId: number) => {
    showConfirmation(
      t('Accept Visit Request'),
      t('Are you sure you want to accept this visit request?'),
      async () => {
        try {
          const token = await storage.getAuthToken();
          const url = buildApiUrl(API_ENDPOINTS.VISIT_REQUESTS.UPDATE.replace(':id', visitRequestId.toString()));
          
          const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'ACCEPTED' }),
          });
          
          if (response.ok) {
            showSuccess(t('Visit request accepted'), t('Success'));
            loadVisitRequests();
            onSuccess?.();
          } else {
            showError(t('Failed to accept visit request'), t('Error'));
          }
        } catch (error) {
          console.error('Error accepting visit request:', error);
          showError(t('Failed to accept visit request'), t('Error'));
        }
      }
    );
  };

  const handleDeclineVisitRequest = async (visitRequestId: number) => {
    showConfirmation(
      t('Decline Visit Request'),
      t('Are you sure you want to decline this visit request?'),
      async () => {
        try {
          const token = await storage.getAuthToken();
          const url = buildApiUrl(API_ENDPOINTS.VISIT_REQUESTS.DELETE.replace(':id', visitRequestId.toString()));
          
          const response = await fetch(url, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            showSuccess(t('Visit request declined'), t('Success'));
            loadVisitRequests();
          }
        } catch (error) {
          console.error('Error declining visit request:', error);
        }
      },
      {
        confirmText: t('Decline'),
        confirmStyle: 'destructive',
      }
    );
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
          loadBids(isTechnician);
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
              loadBids(isTechnician);
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

  const handleWithdrawBid = async () => {
    if (!myBid) return;

    showConfirmation(
      t('Withdraw Bid'),
      t('Are you sure you want to withdraw your bid? This action cannot be undone.'),
      async () => {
        try {
          const token = await storage.getAuthToken();
          const url = buildApiUrl(API_ENDPOINTS.BIDS.DELETE.replace(':id', myBid.id.toString()));
          
          const response = await fetch(url, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            showSuccess(t('Bid withdrawn successfully'), t('Success'));
            setMyBid(null);
            loadBids(true);
            onSuccess?.();
          } else {
            showError(t('Failed to withdraw bid'), t('Error'));
          }
        } catch (error) {
          console.error('Error withdrawing bid:', error);
          showError(t('Failed to withdraw bid'), t('Error'));
        }
      },
      {
        confirmText: t('Withdraw'),
        confirmStyle: 'destructive',
      }
    );
  };

  const handleViewMyBid = () => {
    if (!myBid) return;
    setIsMyBidModalVisible(true);
  };

  const closeMyBidModal = () => setIsMyBidModalVisible(false);

  // ===== USER VIEW =====
  const renderUserView = () => (
    <>
      {/* Project Overview + Details (User POV) */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeaderTitle, { fontSize: scaledSize(16) }]}>{t('Project Overview')}</Text>
        <Text style={[styles.sectionDescription, { fontSize: scaledSize(14) }]}>
          {t('Review your project details below. Once submitted, service providers will start sending bids.')}
        </Text>
        
        {/* Budget and Duration Cards */}
        <View style={[styles.statsRow, IS_LARGE_WEB && styles.statsRowLargeWeb]}>
          <View style={[styles.statCard, styles.budgetCard, IS_LARGE_WEB && styles.statCardLargeWeb]}>
            <View style={[styles.statHeader, IS_LARGE_WEB && styles.statHeaderLargeWeb]}>
              <Ionicons name="cash-outline" size={IS_LARGE_WEB ? 20 : 12} color={COLORS.primary80} />
              <Text style={[styles.statTitle, IS_LARGE_WEB && styles.statTitleLargeWeb]}>
                {t('Total Budget')}
              </Text>
            </View>
            <Text style={[styles.statValueText, IS_LARGE_WEB && styles.statValueTextLargeWeb]}>
              {formatBudget(project.budget)}
            </Text>
          </View>
          <View style={[styles.statCard, styles.durationCard, IS_LARGE_WEB && styles.statCardLargeWeb]}>
            <View style={[styles.statHeader, IS_LARGE_WEB && styles.statHeaderLargeWeb]}>
              <Ionicons name="time-outline" size={IS_LARGE_WEB ? 20 : 12} color={COLORS.green90} />
              <Text style={[styles.statTitle, { color: COLORS.green90 }, IS_LARGE_WEB && styles.statTitleLargeWeb]}>
                {t('Duration')}
              </Text>
            </View>
            <Text style={[styles.statValueText, IS_LARGE_WEB && styles.statValueTextLargeWeb]}>
              {formatDuration()}
            </Text>
          </View>
        </View>
      </View>

      {/* Description Section */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, IS_LARGE_WEB && styles.sectionHeaderLargeWeb]}>
          <Ionicons name="document-text-outline" size={IS_LARGE_WEB ? 24 : 12} color={COLORS.primary80} />
          <Text style={[styles.sectionLabel, IS_LARGE_WEB && styles.sectionLabelLargeWeb]}>
            {t('Description')}
          </Text>
        </View>
        <View style={[styles.descriptionBox, IS_LARGE_WEB && styles.descriptionBoxLargeWeb]}>
          <Text style={[styles.descriptionText, IS_LARGE_WEB && styles.descriptionTextLargeWeb]}>
            {project.description}
          </Text>
        </View>
      </View>

      {/* Address Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="location-outline" size={12} color={COLORS.primary80} />
          <Text style={styles.sectionLabel}>{t('Project Address')}</Text>
        </View>
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>
            {project.address || t('No address specified')}
          </Text>
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
              formatBudget={formatBudget}
            />
          ))}
        </View>
      )}

      <View style={styles.sectionDivider} />

      {/* Summary Badges Row */}
      <View style={styles.badgesRow}>
        <View style={styles.bidsCountBadge}>
          <Text style={styles.bidsCountText}>
            {bids.length} {t('Bids Received')}
          </Text>
        </View>
        {visitRequests.length > 0 && (
          <View style={styles.visitsCountBadge}>
            <Text style={styles.visitsCountText}>
              {visitRequests.length} {t('Visit Requests')}
            </Text>
          </View>
        )}
      </View>
      
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'bids' && styles.tabActive,
          ]}
          onPress={() => setSelectedTab('bids')}
        >
          <Ionicons 
            name="cash-outline" 
            size={16} 
            color={selectedTab === 'bids' ? COLORS.primary60 : COLORS.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            selectedTab === 'bids' && styles.tabTextActive,
          ]}>
            {t('Bids')} ({bids.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'visits' && styles.tabActive,
          ]}
          onPress={() => setSelectedTab('visits')}
        >
          <Ionicons 
            name="calendar-outline" 
            size={16} 
            color={selectedTab === 'visits' ? COLORS.primary60 : COLORS.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            selectedTab === 'visits' && styles.tabTextActive,
          ]}>
            {t('Visit Requests')} ({visitRequests.length})
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Section Header */}
      <View style={styles.section}>
        <Text style={styles.sectionHeaderTitle}>
          {selectedTab === 'bids' ? t('Review Bids') : t('Review Visit Requests')}
        </Text>
        <Text style={styles.sectionDescription}>
          {selectedTab === 'bids' 
            ? t('Compare proposals from qualified service providers and select the best fit for your project.')
            : t('Review visit requests from technicians who want to assess your project before submitting a bid.')
          }
        </Text>
      </View>
      
      {/* Content based on selected tab */}
      {selectedTab === 'bids' ? (
        <>
          {/* Bids List */}
          {bids.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={48} color={COLORS.textDividers} />
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
      ) : (
        <>
          {/* Visit Requests List */}
          {visitRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.textDividers} />
              <Text style={styles.emptyText}>{t('No visit requests yet')}</Text>
              <Text style={styles.emptySubtext}>
                {t('Technicians can request to visit your property before submitting a bid')}
              </Text>
            </View>
          ) : (
            visitRequests.map((visitRequest, index) => (
              <VisitRequestCard
                key={visitRequest.id}
                visitRequest={visitRequest}
                index={index}
                onAccept={() => handleAcceptVisitRequest(visitRequest.id)}
                onDecline={() => handleDeclineVisitRequest(visitRequest.id)}
                onViewTechnician={() => onViewTechnician?.(visitRequest.technicianId)}
                onBook={() => {
                  setSelectedVisitRequest(visitRequest);
                  setBookingModalVisible(true);
                }}
              />
            ))
          )}
        </>
      )}
    </>
  );

  // ===== TECHNICIAN VIEW =====
  const renderTechnicianView = () => (
    <>
      {/* Project Overview Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeaderTitle, { fontSize: scaledSize(16) }]}>{t('Project Overview')}</Text>
        <Text style={[styles.sectionDescription, { fontSize: scaledSize(14) }]}>
          {t('Review your project details below. Once submitted, service providers will start sending bids.')}
        </Text>
        
        {/* Budget and Duration Cards */}
        <View style={[styles.statsRow, IS_LARGE_WEB && styles.statsRowLargeWeb]}>
          <View style={[styles.statCard, styles.budgetCard, IS_LARGE_WEB && styles.statCardLargeWeb]}>
            <View style={[styles.statHeader, IS_LARGE_WEB && styles.statHeaderLargeWeb]}>
              <Ionicons name="cash-outline" size={IS_LARGE_WEB ? 20 : 12} color={COLORS.primary80} />
              <Text style={[styles.statTitle, IS_LARGE_WEB && styles.statTitleLargeWeb]}>
                {t('Total Budget')}
              </Text>
            </View>
            <Text style={[styles.statValueText, IS_LARGE_WEB && styles.statValueTextLargeWeb]}>
              {formatBudget(project.budget)}
            </Text>
          </View>
          <View style={[styles.statCard, styles.durationCard, IS_LARGE_WEB && styles.statCardLargeWeb]}>
            <View style={[styles.statHeader, IS_LARGE_WEB && styles.statHeaderLargeWeb]}>
              <Ionicons name="time-outline" size={IS_LARGE_WEB ? 20 : 12} color={COLORS.green90} />
              <Text style={[styles.statTitle, { color: COLORS.green90 }, IS_LARGE_WEB && styles.statTitleLargeWeb]}>
                {t('Duration')}
              </Text>
            </View>
            <Text style={[styles.statValueText, IS_LARGE_WEB && styles.statValueTextLargeWeb]}>
              {formatDuration()}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Description Section */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, IS_LARGE_WEB && styles.sectionHeaderLargeWeb]}>
          <Ionicons name="document-text-outline" size={IS_LARGE_WEB ? 24 : 12} color={COLORS.primary80} />
          <Text style={[styles.sectionLabel, IS_LARGE_WEB && styles.sectionLabelLargeWeb]}>
            {t('Description')}
          </Text>
        </View>
        <View style={[styles.descriptionBox, IS_LARGE_WEB && styles.descriptionBoxLargeWeb]}>
          <Text style={[styles.descriptionText, IS_LARGE_WEB && styles.descriptionTextLargeWeb]}>
            {project.description}
          </Text>
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
              formatBudget={formatBudget}
            />
          ))}
        </View>
      )}
      
      {/* Divider */}
      <View style={styles.sectionDivider} />
      
      {/* My Bid Section */}
      {myBid ? (
        <MyBidCard
          bid={myBid}
          formatBudget={formatBudget}
          onViewBid={handleViewMyBid}
          onWithdrawBid={handleWithdrawBid}
        />
      ) : (
        <View style={styles.noBidContainer}>
          <Ionicons name="hand-left-outline" size={48} color={COLORS.textDividers} />
          <Text style={styles.noBidText}>{t('You have not placed a bid yet')}</Text>
          <Text style={styles.noBidSubtext}>
            {t('Submit a bid to start working on this project')}
          </Text>
        </View>
      )}
    </>
  );

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
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textHeader} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { fontSize: scaledSize(16) }]}>
              {serviceName || t('Project')}
            </Text>
            <Text style={[styles.headerSubtitle, { fontSize: scaledSize(10) }]}>
              {t('Bid Received')}
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
              <Text style={[styles.titleMainText, { fontSize: scaledSize(42) }]}>
                {serviceName || t('Project')}
              </Text>
              <Text style={[styles.titleSubtext, { fontSize: scaledSize(20) }]}>
                {t('Bid Received')}
              </Text>
            </View>
          </View>
        )}
        
        {/* Status Stepper */}
        <View style={[styles.stepperContainer, IS_LARGE_WEB && styles.stepperContainerLargeWeb]}>
          <ProjectCreationFlow currentStep="BID_RECEIVED" />
        </View>
        
        {/* Divider */}
        <View style={[styles.divider, IS_LARGE_WEB && styles.dividerLargeWeb]} />
        {isTechnician ? renderTechnicianView() : renderUserView()}
        
        {/* Bottom Padding */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      {/* View My Bid Modal (Technician) */}
      <Modal
        visible={isMyBidModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMyBidModal}
      >
        <View style={modalStyles.backdrop}>
          <Pressable style={modalStyles.backdropPressable} onPress={closeMyBidModal} />
          <View style={[modalStyles.card, IS_LARGE_WEB && modalStyles.cardWeb]}>
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>{t('My Bid')}</Text>
              <TouchableOpacity onPress={closeMyBidModal} style={modalStyles.closeButton} hitSlop={10}>
                <Ionicons name="close" size={18} color={COLORS.textBody} />
              </TouchableOpacity>
        </View>
        
            <View style={modalStyles.divider} />

            <View style={modalStyles.row}>
              <Text style={modalStyles.label}>{t('Bid')} #</Text>
              <Text style={modalStyles.value}>{myBid?.id ?? '-'}</Text>
            </View>

            <View style={modalStyles.row}>
              <Text style={modalStyles.label}>{t('Bid Amount')}</Text>
              <Text style={modalStyles.value}>{myBid ? formatBudget(myBid.proposedBudget) : '-'}</Text>
            </View>

            <View style={modalStyles.row}>
              <Text style={modalStyles.label}>{t('Status')}</Text>
              <View
                style={[
                  modalStyles.statusPill,
                  {
                    backgroundColor:
                      myBid?.status === 'PENDING'
                        ? 'rgba(218, 156, 2, 0.12)'
                        : myBid?.status === 'ACCEPTED'
                          ? 'rgba(0, 172, 79, 0.12)'
                          : 'rgba(239, 68, 68, 0.12)',
                  },
                ]}
              >
                <Text
                  style={[
                    modalStyles.statusText,
                    {
                      color:
                        myBid?.status === 'PENDING'
                          ? COLORS.amber70
                          : myBid?.status === 'ACCEPTED'
                            ? COLORS.green80
                            : '#EF4444',
                    },
                  ]}
                >
                  {myBid?.status === 'PENDING' ? t('Pending approval') : (myBid?.status || '-')}
          </Text>
              </View>
        </View>
        
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionTitle}>{t('Description')}</Text>
              <Text style={modalStyles.sectionBody}>
                {myBid?.comment || t('No description provided')}
            </Text>
          </View>

            <TouchableOpacity style={modalStyles.primaryButton} onPress={closeMyBidModal}>
              <Text style={modalStyles.primaryButtonText}>{t('OK')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Book Appointment Modal */}
      {selectedVisitRequest && (
        <BookAppointmentModal
          visible={bookingModalVisible}
          technicianId={selectedVisitRequest.technicianId}
          technicianName={selectedVisitRequest.technicianName}
          projectId={project.id}
          onClose={() => {
            setBookingModalVisible(false);
            setSelectedVisitRequest(null);
          }}
          onSuccess={() => {
            loadVisitRequests();
            onSuccess?.();
          }}
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

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: COLORS.bgWhite,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary10,
  },
  cardWeb: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
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
  divider: {
    height: 1,
    backgroundColor: COLORS.textDividers,
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: 6,
    marginBottom: 16,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  sectionBody: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textBody,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: COLORS.primary60,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
});

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
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.textDividers,
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statsRowLargeWeb: {
    gap: 32,
  },
  statCard: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 16,
    gap: 6,
  },
  statCardLargeWeb: {
    padding: 32,
    gap: 8,
    minHeight: 79,
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
  statHeaderLargeWeb: {
    gap: 6,
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.primary80,
  },
  statTitleLargeWeb: {
    fontSize: 16,
  },
  statValueText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  statValueTextLargeWeb: {
    fontSize: 14,
  },
  descriptionBox: {
    borderWidth: 0.5,
    borderColor: COLORS.textDividers,
    borderRadius: 6,
    padding: 16,
  },
  descriptionBoxLargeWeb: {
    padding: 32,
    minHeight: 98,
  },
  sectionHeaderLargeWeb: {
    gap: 16,
    marginBottom: 32,
  },
  sectionLabelLargeWeb: {
    fontSize: 16,
  },
  descriptionTextLargeWeb: {
    fontSize: 14,
    lineHeight: 21,
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
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  bidsCountBadge: {
    backgroundColor: COLORS.green10,
    borderWidth: 0.5,
    borderColor: COLORS.green80,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  bidsCountText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.green90,
  },
  visitsCountBadge: {
    backgroundColor: COLORS.primary10,
    borderWidth: 0.5,
    borderColor: COLORS.primary60,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  visitsCountText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.primary80,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary10,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: COLORS.bgWhite,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary60,
    fontWeight: '600',
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
  noBidContainer: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
    backgroundColor: COLORS.primary10,
    borderRadius: 8,
  },
  noBidText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  noBidSubtext: {
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
