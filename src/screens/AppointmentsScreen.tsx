import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import { showError, showSuccess, showConfirm } from '../utils/alert';

export interface Appointment {
  id: number;
  userId: number;
  userName: string;
  userPhone?: string;
  technicianId: number;
  technicianName: string;
  technicianPhone?: string;
  projectId?: number;
  projectDescription?: string;
  requestedDate: string;
  requestedStartTime: string;
  requestedEndTime: string;
  address?: string;
  status: 'PENDING' | 'ACCEPTED' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED';
  createdAt?: string;
  updatedAt?: string;
  phaseTotal?: number;
  phaseName?: string;
}

type AppointmentFilter = 'today' | 'pending' | 'upcoming' | 'completed';

interface AppointmentsScreenProps {
  onBack?: () => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
};

export default function AppointmentsScreen({ onBack }: AppointmentsScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<AppointmentFilter>('today');
  const [isTechnician, setIsTechnician] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const loadData = async () => {
      await checkUserRole();
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isTechnician !== null) {
      fetchAppointments();
    }
  }, [selectedFilter, isTechnician]);

  const checkUserRole = async () => {
    try {
      const role = await storage.getUserRole();
      const isTech = role?.toUpperCase() === 'TECHNICIAN';
      setIsTechnician(isTech);
    } catch (error) {
      console.error('Error checking role:', error);
      setIsTechnician(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const token = await storage.getAuthToken();
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      let apiURL: string;
      if (isTechnician) {
        if (selectedFilter === 'pending') {
          apiURL = buildApiUrl(API_ENDPOINTS.APPOINTMENTS.FOR_ME);
        } else {
          apiURL = buildApiUrl(API_ENDPOINTS.APPOINTMENTS.MY_BOOKINGS);
        }
      } else {
        if (selectedFilter === 'pending') {
          apiURL = buildApiUrl(API_ENDPOINTS.APPOINTMENTS.MY_REQUESTS);
        } else {
          apiURL = buildApiUrl(API_ENDPOINTS.APPOINTMENTS.MY_BOOKINGS);
        }
      }
      
      const response = await fetch(apiURL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        let filtered = data;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedFilter === 'today') {
          filtered = data.filter((a: Appointment) => {
            const appointmentDate = new Date(a.requestedDate);
            appointmentDate.setHours(0, 0, 0, 0);
            return appointmentDate.getTime() === today.getTime() && 
              (a.status.toUpperCase() === 'ACCEPTED' || a.status.toUpperCase() === 'CONFIRMED');
          });
        } else if (selectedFilter === 'pending') {
          filtered = data.filter((a: Appointment) => a.status.toUpperCase() === 'PENDING');
        } else if (selectedFilter === 'upcoming') {
          filtered = data.filter((a: Appointment) => {
            const appointmentDate = new Date(a.requestedDate);
            appointmentDate.setHours(0, 0, 0, 0);
            return appointmentDate.getTime() > today.getTime() && 
              (a.status.toUpperCase() === 'ACCEPTED' || a.status.toUpperCase() === 'CONFIRMED');
          });
        } else if (selectedFilter === 'completed') {
          filtered = data.filter((a: Appointment) => a.status.toUpperCase() === 'COMPLETED');
        }
        
        setAppointments(filtered);
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error:', error);
      showError(error.message || t('network_error'));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const acceptRequest = async (requestId: number) => {
    showConfirm(
      t('Accept Request'),
      t('Confirm this appointment?'),
      async () => {
        try {
          const token = await storage.getAuthToken();
          if (!token) {
            showError(t('Please login again'));
            return;
          }
          
          const apiURL = buildApiUrlWithParams(API_ENDPOINTS.APPOINTMENTS.ACCEPT, { id: requestId });
          const response = await fetch(apiURL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            showSuccess(t('Appointment accepted'));
            setTimeout(() => fetchAppointments(), 1000);
          } else {
            throw new Error(t('Failed to accept appointment'));
          }
        } catch (error: any) {
          showError(error.message || t('Failed to accept appointment'));
        }
      }
    );
  };

  const rejectRequest = async (requestId: number) => {
    showConfirm(
      t('Reject Request'),
      t('Are you sure you want to reject this request?'),
      async () => {
        try {
          const token = await storage.getAuthToken();
          if (!token) {
            showError(t('Please login again'));
            return;
          }
          
          const apiURL = buildApiUrlWithParams(API_ENDPOINTS.APPOINTMENTS.REJECT, { id: requestId });
          const response = await fetch(apiURL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            showSuccess(t('Request rejected'));
            setTimeout(() => fetchAppointments(), 1000);
          } else {
            throw new Error(t('Failed to reject appointment'));
          }
        } catch (error: any) {
          showError(error.message || t('Failed to reject appointment'));
        }
      }
    );
  };

  const completeAppointment = async (requestId: number) => {
    showConfirm(
      t('Complete Appointment'),
      t('Mark this appointment as completed?'),
      async () => {
        try {
          const token = await storage.getAuthToken();
          if (!token) {
            showError(t('Please login again'));
            return;
          }
          
          const apiURL = buildApiUrlWithParams(API_ENDPOINTS.APPOINTMENTS.COMPLETE, { id: requestId });
          const response = await fetch(apiURL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            showSuccess(t('Appointment completed'));
            setTimeout(() => fetchAppointments(), 1000);
          } else {
            throw new Error(t('Failed to complete appointment'));
          }
        } catch (error: any) {
          showError(error.message || t('Failed to complete appointment'));
        }
      }
    );
  };

  const cancelRequest = async (requestId: number) => {
    showConfirm(
      t('Cancel Appointment'),
      t('Are you sure you want to cancel this appointment?'),
      async () => {
        try {
          const token = await storage.getAuthToken();
          if (!token) {
            showError(t('Please login again'));
            return;
          }
          
          const apiURL = buildApiUrlWithParams(API_ENDPOINTS.APPOINTMENTS.DELETE, { id: requestId });
          const response = await fetch(apiURL, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            showSuccess(t('Appointment cancelled'));
            setTimeout(() => fetchAppointments(), 1000);
          } else {
            throw new Error(t('Failed to cancel appointment'));
          }
        } catch (error: any) {
          showError(error.message || t('Failed to cancel appointment'));
        }
      }
    );
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const hasAppointment = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.some(apt => apt.requestedDate === dateStr);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;
  };

  const formatTime = (timeString: string): string => {
    const parts = timeString.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  const getSectionTitle = (): string => {
    switch (selectedFilter) {
      case 'today': return t("Today's Appointments");
      case 'pending': return t('Pending Appointments');
      case 'upcoming': return t('Upcoming Appointments');
      case 'completed': return t('Completed Appointments');
      default: return t('Appointments');
    }
  };

  // Render Calendar
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.calendarCell}>
          <View style={styles.calendarCellContent} />
        </View>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelectedDate = isSelected(day);
      const hasApt = hasAppointment(day);

      days.push(
        <TouchableOpacity
          key={day}
          style={styles.calendarCell}
          onPress={() => {
            const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            setSelectedDate(newDate);
          }}
        >
          <View style={[
            styles.calendarCellContent,
            isSelectedDate && styles.selectedCellContent,
          ]}>
            <Text style={[
              styles.calendarDay,
              isSelectedDate && styles.selectedDayText,
            ]}>
              {day}
            </Text>
            {hasApt && (
              <View style={styles.appointmentDotsContainer}>
                <View style={[styles.appointmentDot, { backgroundColor: COLORS.purple }]} />
                <View style={[styles.appointmentDot, { backgroundColor: COLORS.primaryBlue }]} />
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    // Fill remaining cells
    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < remainingCells; i++) {
      days.push(
        <View key={`empty-end-${i}`} style={styles.calendarCell}>
          <View style={styles.calendarCellContent} />
        </View>
      );
    }

    return days;
  };

  const renderFilterTab = (filter: AppointmentFilter, label: string) => {
    const isActive = selectedFilter === filter;
    
    return (
      <TouchableOpacity
        key={filter}
        onPress={() => setSelectedFilter(filter)}
        style={[
          styles.filterTab,
          isActive ? styles.filterTabActive : styles.filterTabInactive,
        ]}
      >
        <Text style={[
          styles.filterTabText,
          isActive ? styles.filterTabTextActive : styles.filterTabTextInactive
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderAppointmentCard = (item: Appointment) => {
    return (
      <View key={item.id} style={styles.appointmentCard}>
        {/* Project Title */}
        <Text style={styles.projectTitle}>
          {item.projectDescription || item.phaseName || t('Initial Consultation')}
        </Text>
        
        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>
            {t('Design Consultation')}
          </Text>
        </View>
        
        {/* Date & Time */}
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={12} color={COLORS.headerBlue} />
          <Text style={styles.infoText}>
            {formatDate(item.requestedDate)}  • {formatTime(item.requestedStartTime)}
          </Text>
        </View>
        
        {/* Location */}
        {item.address && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.headerBlue} />
            <Text style={styles.infoText}>{item.address}</Text>
          </View>
        )}
        
        {/* Divider */}
        <View style={styles.cardDivider} />
        
        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('Total')}</Text>
          <Text style={styles.totalAmount}>
            ${item.phaseTotal?.toLocaleString() || '60,000'}
          </Text>
        </View>
        
        {/* Action Buttons */}
        {renderActionButtons(item)}
      </View>
    );
  };

  const renderActionButtons = (item: Appointment) => {
    // Pending filter - technician can accept/reject
    if (selectedFilter === 'pending' && isTechnician) {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => acceptRequest(item.id)}
          >
            <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.green} />
            <Text style={[styles.actionButtonText, { color: COLORS.green }]}>{t('Accept')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => rejectRequest(item.id)}
          >
            <Ionicons name="close-circle-outline" size={14} color={COLORS.amber} />
            <Text style={[styles.actionButtonText, { color: COLORS.amber }]}>{t('Reject')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Today or Upcoming - user can change date or cancel
    if ((selectedFilter === 'today' || selectedFilter === 'upcoming') && !isTechnician) {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, styles.changeDateButton]}>
            <Text style={styles.changeDateButtonText}>{t('Change Date')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => cancelRequest(item.id)}
          >
            <Text style={styles.cancelButtonText}>{t('Cancel Appointment')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Technician - Today view can mark as complete
    if ((selectedFilter === 'today' || selectedFilter === 'upcoming') && isTechnician) {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.changeDateButton]}
          >
            <Text style={styles.changeDateButtonText}>{t('Change Date')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => completeAppointment(item.id)}
          >
            <Text style={styles.cancelButtonText}>{t('Mark Complete')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return null;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primaryBlue}
          />
        }
      >
        {/* Calendar Section */}
        <View style={styles.calendarSection}>
          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navArrow}>
              <Ionicons name="chevron-back" size={24} color={COLORS.headerBlue} />
            </TouchableOpacity>
            <View style={styles.monthTitleContainer}>
              <Text style={styles.monthTitle}>
                {MONTHS[currentMonth.getMonth()]}
              </Text>
              <Text style={styles.yearTitle}>
                {currentMonth.getFullYear()}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navArrow}>
              <Ionicons name="chevron-forward" size={24} color={COLORS.headerBlue} />
            </TouchableOpacity>
          </View>

          {/* Calendar Container */}
          <View style={styles.calendarContainer}>
            {/* Week Days Header */}
            <View style={styles.weekDaysRow}>
              {DAYS_OF_WEEK.map((day) => (
                <View key={day} style={styles.weekDayCell}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {renderCalendar()}
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabsContainer}>
          {renderFilterTab('today', t('Today'))}
          {renderFilterTab('pending', t('Pending'))}
          {renderFilterTab('upcoming', t('Upcoming'))}
          {renderFilterTab('completed', t('Completed'))}
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIndicator} />
          <Text style={styles.sectionTitle}>
            {getSectionTitle()}
          </Text>
        </View>

        {/* Appointments List */}
        {isLoading && appointments.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primaryBlue} />
            <Text style={styles.loadingText}>{t('Loading...')}</Text>
          </View>
        ) : appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>{t('No appointments found')}</Text>
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {appointments.map((item) => renderAppointmentCard(item))}
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  calendarSection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  navArrow: {
    padding: 8,
  },
  monthTitleContainer: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: COLORS.headerBlue,
  },
  yearTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: COLORS.headerBlue,
  },
  calendarContainer: {
    borderRadius: 14,
    borderWidth: 0.7,
    borderColor: COLORS.lightBlue,
    overflow: 'hidden',
  },
  weekDaysRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightBlue,
    paddingVertical: 12,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 14,
    color: '#004A8A',
    fontWeight: '400',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: COLORS.white,
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    borderTopWidth: 0.7,
    borderLeftWidth: 0.7,
    borderColor: COLORS.lightBlue,
  },
  calendarCellContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  selectedCellContent: {
    backgroundColor: COLORS.primaryBlue,
    borderRadius: 100,
    margin: 4,
  },
  calendarDay: {
    fontSize: 14,
    color: COLORS.headerBlue,
  },
  selectedDayText: {
    color: COLORS.white,
    fontWeight: '500',
  },
  appointmentDotsContainer: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 3,
  },
  appointmentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: COLORS.primaryBlue,
  },
  filterTabInactive: {
    backgroundColor: COLORS.gray,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  filterTabTextInactive: {
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionIndicator: {
    width: 4,
    height: 20,
    backgroundColor: COLORS.primaryBlue,
    borderRadius: 100,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: COLORS.headerBlue,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  appointmentsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  appointmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    borderTopWidth: 2,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: COLORS.darkBlue,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textBody,
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.lightBlue,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.headerBlue,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.headerBlue,
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#D9D9D9',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
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
  acceptButton: {
    backgroundColor: '#E8F5E9',
    borderWidth: 0.5,
    borderColor: COLORS.green,
  },
  rejectButton: {
    backgroundColor: '#FFF8E1',
    borderWidth: 0.5,
    borderColor: COLORS.amber,
  },
  changeDateButton: {
    backgroundColor: COLORS.darkBlue,
  },
  changeDateButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '400',
  },
  cancelButton: {
    backgroundColor: COLORS.lightBlue,
    borderWidth: 0.5,
    borderColor: COLORS.darkBlue,
  },
  completeButton: {
    backgroundColor: COLORS.lightBlue,
    borderWidth: 0.5,
    borderColor: COLORS.green,
  },
  cancelButtonText: {
    color: COLORS.darkBlue,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
