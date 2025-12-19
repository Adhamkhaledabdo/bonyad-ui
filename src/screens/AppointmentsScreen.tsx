import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';
import AppointmentCard from '../components/AppointmentCard';

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
  requestedDate?: string; // For time requests
  appointmentDate?: string; // For booked appointments
  requestedStartTime?: string; // For time requests
  startTime?: string; // For booked appointments
  requestedEndTime?: string; // For time requests
  endTime?: string; // For booked appointments
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

export default function AppointmentsScreen({ onBack }: AppointmentsScreenProps) {
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDarkMode = theme === 'dark';
  
  // Custom popup hooks
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showConfirmation, hideConfirmation } = useConfirmationPopup();
  
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

  // Refetch appointments when selected date changes (for "today" filter)
  useEffect(() => {
    if (isTechnician !== null && selectedFilter === 'today') {
      fetchAppointments();
    }
  }, [selectedDate]);

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
          // Get pending time requests for technician - use status query parameter
          apiURL = buildApiUrlWithParams(API_ENDPOINTS.APPOINTMENTS.FOR_ME, { status: 'PENDING' });
        } else if (selectedFilter === 'upcoming') {
          // Get upcoming appointments (next 3) - technician only
          apiURL = buildApiUrl(API_ENDPOINTS.APPOINTMENTS.UPCOMING);
        } else if (selectedFilter === 'completed') {
          // Get completed appointments (last 3) - technician only
          apiURL = buildApiUrl(API_ENDPOINTS.APPOINTMENTS.COMPLETED);
        } else {
          // Today - use my-bookings and filter client-side
          apiURL = buildApiUrl(API_ENDPOINTS.APPOINTMENTS.MY_BOOKINGS);
        }
      } else {
        // User perspective
        if (selectedFilter === 'pending') {
          // Get pending time requests for user
          apiURL = buildApiUrl(API_ENDPOINTS.APPOINTMENTS.MY_REQUESTS);
        } else {
          // All other filters (today, upcoming, completed) use my-bookings
          // Note: Users don't have separate upcoming/completed endpoints, so we filter client-side
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
        let filtered = Array.isArray(data) ? data : [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Filter data based on selected filter and user role
        if (selectedFilter === 'today') {
          // Filter for appointments on the selected date - must match selectedDate and CONFIRMED/ACCEPTED status
          const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
          filtered = filtered.filter((a: Appointment) => {
            const dateStr = a.appointmentDate || a.requestedDate;
            if (!dateStr) return false;
            const status = a.status.toUpperCase();
            // Match the selected date and show CONFIRMED/ACCEPTED appointments
            return dateStr === selectedDateStr && 
              (status === 'ACCEPTED' || status === 'CONFIRMED');
          });
        } else if (selectedFilter === 'pending') {
          // For technician: API already returns PENDING requests (via query param)
          // For user: API returns all requests, filter to PENDING only
          filtered = filtered.filter((a: Appointment) => a.status.toUpperCase() === 'PENDING');
        } else if (selectedFilter === 'upcoming') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (isTechnician) {
            // API already returns next 3 upcoming appointments (CONFIRMED status)
            filtered = filtered.filter((a: Appointment) => 
              a.status.toUpperCase() === 'CONFIRMED'
            );
          } else {
            // For users: filter from my-bookings to show future CONFIRMED appointments
            filtered = filtered.filter((a: Appointment) => {
              const dateStr = a.appointmentDate || a.requestedDate;
              if (!dateStr) return false;
              const appointmentDate = new Date(dateStr);
              appointmentDate.setHours(0, 0, 0, 0);
              const status = a.status.toUpperCase();
              const timeStr = a.startTime || a.requestedStartTime || '';
              const hour = timeStr ? parseInt(timeStr.split(':')[0]) : 0;
              return (appointmentDate.getTime() > today.getTime() || 
                (appointmentDate.getTime() === today.getTime() && hour > today.getHours())) &&
                (status === 'CONFIRMED' || status === 'ACCEPTED');
            });
          }
        } else if (selectedFilter === 'completed') {
          // Both technician and user: filter to COMPLETED status
          filtered = filtered.filter((a: Appointment) => 
            a.status.toUpperCase() === 'COMPLETED'
          );
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
    showConfirmation(
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
    showConfirmation(
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
    showConfirmation(
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
    showConfirmation(
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
    return appointments.some(apt => {
      const aptDate = apt.appointmentDate || apt.requestedDate;
      return aptDate === dateStr;
    });
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

  const getFilterColor = (filter?: AppointmentFilter): string => {
    const f = filter || selectedFilter;
    switch (f) {
      case 'today': return colors.primary;
      case 'pending': return colors.warning;
      case 'upcoming': return colors.info;
      case 'completed': return colors.success;
      default: return colors.primary;
    }
  };

  const getFilterLightColor = (): string => {
    switch (selectedFilter) {
      case 'today': return COLORS.todayBlueLight;
      case 'pending': return COLORS.pendingAmberLight;
      case 'upcoming': return COLORS.upcomingPurpleLight;
      case 'completed': return COLORS.completedGreenLight;
      default: return COLORS.lightBlue;
    }
  };

  const getStatusBadgeText = (): string => {
    if (selectedFilter === 'upcoming') {
      return t('Upcoming Consultation');
    }
    return t('Design Consultation');
  };

  const getSectionTitle = (): string => {
    switch (selectedFilter) {
      case 'today': {
        // Show selected date in the title
        const isToday = selectedDate.toDateString() === new Date().toDateString();
        if (isToday) {
          return t("Today's Appointments");
        }
        const dateStr = selectedDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        return t('Appointments for {{date}}', { date: dateStr });
      }
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
    const filterColor = getFilterColor();
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelectedDate = isSelected(day);
      const hasApt = hasAppointment(day);

      days.push(
        <TouchableOpacity
          key={day}
          style={[styles.calendarCell, { borderColor: colors.border }]}
          onPress={() => {
            const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            setSelectedDate(newDate);
            // If "today" filter is active, it will automatically refetch via useEffect
            // If another filter is active, switch to "today" filter to show selected date
            if (selectedFilter !== 'today') {
              setSelectedFilter('today');
            }
          }}
        >
          <View style={[
            styles.calendarCellContent,
            isSelectedDate && [styles.selectedCellContent, { backgroundColor: filterColor }],
          ]}>
            <Text style={[
              styles.calendarDay,
              { color: colors.text },
              isSelectedDate && [styles.selectedDayText, { color: colors.white }],
            ]}>
              {day}
            </Text>
            {hasApt && (
              <View style={styles.appointmentDotsContainer}>
                <View style={[styles.appointmentDot, { backgroundColor: filterColor }]} />
                <View style={[styles.appointmentDot, { backgroundColor: filterColor }]} />
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
          isActive ? { backgroundColor: getFilterColor(filter) } : { backgroundColor: colors.cardBackground || colors.gray200 },
        ]}
      >
        <Text style={[
          styles.filterTabText,
          { fontSize: scaledSize(14) },
          isActive ? [styles.filterTabTextActive, { color: colors.white }] : { color: colors.textSecondary },
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };


  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Calendar Section */}
        <View style={[styles.calendarSection, { backgroundColor: colors.cardBackground }]}>
          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navArrow}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.monthTitleContainer}>
              <Text style={[styles.monthTitle, { color: colors.text }]}>
                {MONTHS[currentMonth.getMonth()]}
              </Text>
              <Text style={[styles.yearTitle, { color: colors.text }]}>
                {currentMonth.getFullYear()}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navArrow}>
              <Ionicons name="chevron-forward" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Calendar Container */}
          <View style={[styles.calendarContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
            {/* Week Days Header */}
            <View style={[styles.weekDaysRow, { backgroundColor: colors.primary + '20' }]}>
              {DAYS_OF_WEEK.map((day) => (
                <View key={day} style={styles.weekDayCell}>
                  <Text style={[styles.weekDayText, { color: colors.primary }]}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={[styles.calendarGrid, { backgroundColor: colors.cardBackground }]}>
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
          <View style={[styles.sectionIndicator, { backgroundColor: getFilterColor() }]} />
          <Text style={[styles.sectionTitle, { fontSize: scaledSize(18), color: colors.text }]}>
            {getSectionTitle()}
          </Text>
        </View>

        {/* Appointments List */}
        {isLoading && appointments.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { fontSize: scaledSize(14), color: colors.textSecondary }]}>{t('Loading...')}</Text>
          </View>
        ) : appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { fontSize: scaledSize(14), color: colors.textSecondary }]}>{t('No appointments found')}</Text>
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {appointments.map((item) => (
              <AppointmentCard
                key={item.id}
                appointment={item}
                filter={selectedFilter}
                isTechnician={isTechnician || false}
                onAccept={acceptRequest}
                onReject={rejectRequest}
                onComplete={completeAppointment}
                onCancel={cancelRequest}
                onChangeDate={() => {
                  // TODO: Implement change date functionality
                  console.log('Change date for appointment:', item.id);
                }}
              />
            ))}
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 120 }} />
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
  scrollView: {
    flex: 1,
  },
  calendarSection: {
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
  },
  yearTitle: {
    fontSize: 18,
    fontWeight: '400',
  },
  calendarContainer: {
    borderRadius: 14,
    borderWidth: 0.7,
    overflow: 'hidden',
  },
  weekDaysRow: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '400',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    borderTopWidth: 0.7,
    borderLeftWidth: 0.7,
  },
  calendarCellContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  selectedCellContent: {
    borderRadius: 100,
    margin: 4,
  },
  calendarDay: {
    fontSize: 14,
  },
  selectedDayText: {
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
    // Color is set dynamically in renderFilterTab
  },
  filterTabInactive: {
    // Background color set dynamically in renderFilterTab
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    // Color is set dynamically in renderFilterTab
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
    borderRadius: 100,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  appointmentsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
});
