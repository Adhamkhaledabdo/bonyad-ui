import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Appointment } from '../screens/AppointmentsScreen';

// Color constants from Figma
const COLORS = {
  primaryBlue: '#005DAC',
  darkBlue: '#00549B',
  headerBlue: '#003867',
  lightBlue: '#E6EFF7',
  white: '#FFFFFF',
  gray: '#F0F0F0',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  green: '#00AC4F',
  border: '#E6EFF7',
  amber: '#FFB703',
  purple: '#6A0DAD',
  // Filter-specific colors
  todayBlue: '#005DAC',
  pendingAmber: '#FFB703',
  upcomingPurple: '#6A0DAD',
  completedGreen: '#00AC4F',
  // Light backgrounds for badges
  todayBlueLight: '#E6EFF7',
  pendingAmberLight: '#FFF2CF',
  upcomingPurpleLight: '#EFE6F5',
  completedGreenLight: '#E6F5EC',
};

type AppointmentFilter = 'today' | 'pending' | 'upcoming' | 'completed';

interface AppointmentCardProps {
  appointment: Appointment;
  filter: AppointmentFilter;
  isTechnician: boolean;
  onAccept?: (id: number) => void;
  onReject?: (id: number) => void;
  onComplete?: (id: number) => void;
  onCancel?: (id: number) => void;
  onChangeDate?: (id: number) => void;
}

const getFilterColor = (filter: AppointmentFilter): string => {
  switch (filter) {
    case 'today': return COLORS.todayBlue;
    case 'pending': return COLORS.pendingAmber;
    case 'upcoming': return COLORS.upcomingPurple;
    case 'completed': return COLORS.completedGreen;
    default: return COLORS.primaryBlue;
  }
};

const getFilterLightColor = (filter: AppointmentFilter): string => {
  switch (filter) {
    case 'today': return COLORS.todayBlueLight;
    case 'pending': return COLORS.pendingAmberLight;
    case 'upcoming': return COLORS.upcomingPurpleLight;
    case 'completed': return COLORS.completedGreenLight;
    default: return COLORS.lightBlue;
  }
};

const getStatusBadgeText = (filter: AppointmentFilter): string => {
  if (filter === 'upcoming') {
    return 'Upcoming Consultation';
  }
  return 'Design Consultation';
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;
  } catch {
    return dateString;
  }
};

const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  const parts = timeString.split(':');
  return `${parts[0]}:${parts[1]}`;
};

export default function AppointmentCard({
  appointment,
  filter,
  isTechnician,
  onAccept,
  onReject,
  onComplete,
  onCancel,
  onChangeDate,
}: AppointmentCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const filterColor = getFilterColor(filter);
  const filterLightColor = getFilterLightColor(filter);

  const renderActionButtons = () => {
    // Completed appointments have no action buttons
    if (filter === 'completed') {
      return null;
    }
    
    // Pending filter - technician can accept/reject
    if (filter === 'pending' && isTechnician) {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: filterColor }]}
            onPress={() => onAccept?.(appointment.id)}
          >
            <Ionicons name="checkmark-circle" size={12} color={colors.white} />
            <Text style={[styles.actionButtonText, { color: colors.white }]}>{t('Accept')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: filterLightColor, borderWidth: 0.5, borderColor: filterColor }]}
            onPress={() => onReject?.(appointment.id)}
          >
            <Ionicons name="close-circle" size={12} color={filterColor} />
            <Text style={[styles.actionButtonText, { color: filterColor }]}>{t('Reject')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Today or Upcoming - user can change date or cancel
    if ((filter === 'today' || filter === 'upcoming') && !isTechnician) {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: filterColor }]}
            onPress={() => onChangeDate?.(appointment.id)}
          >
            <Text style={[styles.actionButtonText, { color: colors.white }]}>{t('Change Date')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: filterLightColor, borderWidth: 0.5, borderColor: filterColor }]}
            onPress={() => onCancel?.(appointment.id)}
          >
            <Text style={[styles.actionButtonText, { color: filterColor }]}>{t('Cancel Appointment')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Technician - Today/Upcoming view can change date or mark complete
    if ((filter === 'today' || filter === 'upcoming') && isTechnician) {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: filterColor }]}
            onPress={() => onChangeDate?.(appointment.id)}
          >
            <Text style={[styles.actionButtonText, { color: colors.white }]}>{t('Change Date')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: filterLightColor, borderWidth: 0.5, borderColor: colors.success }]}
            onPress={() => onComplete?.(appointment.id)}
          >
            <Text style={[styles.actionButtonText, { color: colors.success }]}>{t('Mark Complete')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return null;
  };

  const dateStr = appointment.appointmentDate || appointment.requestedDate || '';
  const timeStr = appointment.startTime || appointment.requestedStartTime || '';

  return (
    <View style={[styles.appointmentCard, { borderTopColor: filterColor, backgroundColor: colors.cardBackground, borderLeftColor: colors.border, borderRightColor: colors.border, borderBottomColor: colors.border }]}>
      {/* Project Title */}
      <Text style={[styles.projectTitle, { color: colors.text }]}>
        {appointment.projectDescription || appointment.phaseName || t('Initial Consultation')}
      </Text>
      
      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: filterLightColor }]}>
        <Text style={[styles.statusBadgeText, { color: filterColor }]}>
          {t(getStatusBadgeText(filter))}
        </Text>
      </View>
      
      {/* Date & Time */}
      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.text }]}>
          {formatDate(dateStr)}  • {formatTime(timeStr)}
        </Text>
      </View>
      
      {/* Location */}
      {appointment.address && (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.text }]}>{appointment.address}</Text>
        </View>
      )}
      
      {/* Divider */}
      <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
      
      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, { color: colors.text }]}>{t('Total')}</Text>
        <Text style={[styles.totalAmount, { color: filterColor }]}>
          ${appointment.phaseTotal?.toLocaleString() || '60,000'}
        </Text>
      </View>
      
      {/* Action Buttons */}
      {renderActionButtons()}
    </View>
  );
}

const styles = StyleSheet.create({
  appointmentCard: {
    borderRadius: 8,
    padding: 16,
    borderTopWidth: 2,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    marginBottom: 12,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '400',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
    opacity: 0.3,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '400',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 0,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '400',
  },
});

