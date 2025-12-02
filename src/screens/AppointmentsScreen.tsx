import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import { showAlert, showError, showSuccess, showConfirm } from '../utils/alert';

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
}

type AppointmentFilter = 'pending' | 'confirmed' | 'completed';

interface AppointmentsScreenProps {
  onBack?: () => void;
}

export default function AppointmentsScreen({ onBack }: AppointmentsScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<AppointmentFilter>('pending');
  const [isTechnician, setIsTechnician] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      console.log('🔍 Checking user role:', role, '→ isTechnician:', isTech);
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

      // Determine API endpoint based on role and filter
      let apiURL: string;
      if (isTechnician) {
        // Technician side
        if (selectedFilter === 'pending') {
          apiURL = buildApiUrl(API_ENDPOINTS.APPOINTMENTS.FOR_ME);
        } else {
          apiURL = buildApiUrl(API_ENDPOINTS.APPOINTMENTS.MY_BOOKINGS);
        }
      } else {
        // User side
        if (selectedFilter === 'pending') {
          apiURL = buildApiUrl(API_ENDPOINTS.APPOINTMENTS.MY_REQUESTS);
        } else {
          apiURL = buildApiUrl(API_ENDPOINTS.APPOINTMENTS.MY_BOOKINGS);
        }
      }
      
      console.log(`📤 Fetching ${selectedFilter} appointments for ${isTechnician ? 'technician' : 'user'}`);
      console.log(`   URL: ${apiURL}`);
      
      const response = await fetch(apiURL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Apply status filter
        let filtered = data;
        if (selectedFilter === 'pending') {
          filtered = data.filter((a: Appointment) => a.status.toUpperCase() === 'PENDING');
        } else if (selectedFilter === 'confirmed') {
          filtered = data.filter((a: Appointment) => 
            a.status.toUpperCase() === 'ACCEPTED' || 
            a.status.toUpperCase() === 'CONFIRMED'
          );
        } else if (selectedFilter === 'completed') {
          filtered = data.filter((a: Appointment) => a.status.toUpperCase() === 'COMPLETED');
        }
        
        setAppointments(filtered);
        console.log(`✅ Loaded ${filtered.length} appointments`);
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
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
          
          console.log('📤 Accepting appointment:', requestId);
          console.log('   URL:', apiURL);
          
          const response = await fetch(apiURL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('📥 Accept response status:', response.status);
          
          if (response.ok) {
            showSuccess(t('Appointment accepted'));
            setTimeout(() => {
              fetchAppointments();
            }, 1000);
          } else {
            const errorText = await response.text();
            console.error('❌ Failed to accept appointment:', errorText);
            throw new Error(t('Failed to accept appointment'));
          }
        } catch (error: any) {
          console.error('❌ Error accepting appointment:', error);
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
          
          console.log('📤 Rejecting appointment:', requestId);
          console.log('   URL:', apiURL);
          
          const response = await fetch(apiURL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('📥 Reject response status:', response.status);
          
          if (response.ok) {
            showSuccess(t('Request rejected'));
            setTimeout(() => {
              fetchAppointments();
            }, 1000);
          } else {
            const errorText = await response.text();
            console.error('❌ Failed to reject appointment:', errorText);
            throw new Error(t('Failed to reject appointment'));
          }
        } catch (error: any) {
          console.error('❌ Error rejecting appointment:', error);
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
          
          console.log('📤 Completing appointment:', requestId);
          console.log('   URL:', apiURL);
          
          const response = await fetch(apiURL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('📥 Complete response status:', response.status);
          
          if (response.ok) {
            showSuccess(t('Appointment completed'));
            setTimeout(() => {
              fetchAppointments();
            }, 1000);
          } else {
            const errorText = await response.text();
            console.error('❌ Failed to complete appointment:', errorText);
            throw new Error(t('Failed to complete appointment'));
          }
        } catch (error: any) {
          console.error('❌ Error completing appointment:', error);
          showError(error.message || t('Failed to complete appointment'));
        }
      }
    );
  };

  const cancelRequest = async (requestId: number) => {
    showConfirm(
      t('Cancel Request'),
      t('Are you sure you want to cancel this request?'),
      async () => {
        try {
          const token = await storage.getAuthToken();
          if (!token) {
            showError(t('Please login again'));
            return;
          }
          
          const apiURL = buildApiUrlWithParams(API_ENDPOINTS.APPOINTMENTS.DELETE, { id: requestId });
          
          console.log('📤 Cancelling appointment:', requestId);
          console.log('   URL:', apiURL);
          
          const response = await fetch(apiURL, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('📥 Cancel response status:', response.status);
          
          if (response.ok) {
            showSuccess(t('Request cancelled'));
            setTimeout(() => {
              fetchAppointments();
            }, 1000);
          } else {
            const errorText = await response.text();
            console.error('❌ Failed to cancel appointment:', errorText);
            throw new Error(t('Failed to cancel appointment'));
          }
        } catch (error: any) {
          console.error('❌ Error cancelling appointment:', error);
          showError(error.message || t('Failed to cancel appointment'));
        }
      }
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (timeString: string): string => {
    const parts = timeString.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'PENDING': return '#FFA500';
      case 'ACCEPTED':
      case 'CONFIRMED': return '#00AA00';
      case 'REJECTED': return '#FF0000';
      case 'COMPLETED': return '#0080FF';
      default: return '#999999';
    }
  };

  const renderFilterTab = (filter: AppointmentFilter, icon: string, label: string) => (
    <TouchableOpacity
      key={filter}
      onPress={() => setSelectedFilter(filter)}
      style={[
        styles.filterTab,
        {
          backgroundColor: selectedFilter === filter ? colors.primary + '15' : 'transparent',
        }
      ]}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={selectedFilter === filter ? colors.primary : colors.textSecondary} 
      />
      <Text style={[
        styles.filterTabText,
        {
          color: selectedFilter === filter ? colors.primary : colors.textSecondary,
          fontWeight: selectedFilter === filter ? '600' : '400'
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderAppointmentCard = ({ item }: { item: Appointment }) => (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="briefcase" size={20} color="#0080FF" />
          <Text style={[styles.projectTitle, { color: colors.text }]} numberOfLines={2}>
            {item.projectDescription || t('General Appointment')}
          </Text>
        </View>
        
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(item.status) + '20' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: getStatusColor(item.status) }
          ]}>
            {item.status}
          </Text>
        </View>
      </View>
      
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      
      {/* Person Info */}
      <View style={styles.personInfo}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="person" size={24} color={colors.primary} />
        </View>
        
        <View style={styles.personDetails}>
          <Text style={[styles.personName, { color: colors.text }]}>
            {isTechnician ? item.userName : item.technicianName}
          </Text>
          <Text style={[styles.personRole, { color: colors.textSecondary }]}>
            {isTechnician ? t('User') : t('Technician')}
          </Text>
        </View>
      </View>
      
      {/* Date & Time */}
      <View style={styles.dateTime}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar" size={16} color="#FFA500" />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {formatDate(item.requestedDate)}
          </Text>
        </View>
        
        <View style={styles.timeRow}>
          <Ionicons name="time" size={16} color="#00AA00" />
          <Text style={[styles.timeText, { color: colors.text }]}>
            {formatTime(item.requestedStartTime)} - {formatTime(item.requestedEndTime)}
          </Text>
        </View>
      </View>
      
      {/* Location */}
      {item.address && (
        <View style={styles.location}>
          <Ionicons name="location" size={16} color="#FF0000" />
          <Text style={[styles.locationText, { color: colors.textSecondary }]}>
            {item.address}
          </Text>
        </View>
      )}
      
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      
      {/* Action Buttons */}
      {selectedFilter === 'pending' && (
        <View style={styles.actions}>
          {isTechnician ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => acceptRequest(item.id)}
                style={[styles.button, styles.acceptButton]}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>{t('Accept')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => rejectRequest(item.id)}
                style={[styles.button, styles.rejectButton]}
              >
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>{t('Reject')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => cancelRequest(item.id)}
              style={[styles.button, styles.cancelButton]}
            >
              <Ionicons name="close-circle" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>{t('Cancel Request')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {selectedFilter === 'confirmed' && (
        <View style={styles.actions}>
          {isTechnician ? (
            <TouchableOpacity
              onPress={() => completeAppointment(item.id)}
              style={[styles.button, styles.completeButton]}
            >
              <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>{t('Mark as Complete')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.waitingContainer}>
              <Ionicons name="time" size={16} color={colors.textSecondary} />
              <Text style={[styles.waitingText, { color: colors.textSecondary }]}>
                {t('Waiting for appointment...')}
              </Text>
            </View>
          )}
        </View>
      )}
      
      {selectedFilter === 'completed' && (
        <View style={styles.completedContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#00AA00" />
          <Text style={styles.completedText}>{t('Appointment Completed')}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, paddingTop: insets.top }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: colors.text }]}>
          {t('Appointments')}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterTabs, { backgroundColor: colors.cardBackground }]}>
        {renderFilterTab('pending', 'time-outline', t('Pending'))}
        {renderFilterTab('confirmed', 'checkmark-circle-outline', t('Confirmed'))}
        {renderFilterTab('completed', 'checkmark-done-circle-outline', t('Completed'))}
      </View>

      {/* Appointments List */}
      {isLoading && appointments.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t('Loading...')}
          </Text>
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('No appointments found')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointmentCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
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
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  filterTabText: {
    fontSize: 14,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  personDetails: {
    flex: 1,
  },
  personName: {
    fontSize: 14,
    fontWeight: '600',
  },
  personRole: {
    fontSize: 12,
  },
  dateTime: {
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 14,
    marginLeft: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    marginLeft: 6,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  actions: {
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
  },
  acceptButton: {
    backgroundColor: '#00AA00',
  },
  rejectButton: {
    backgroundColor: '#FF0000',
  },
  cancelButton: {
    backgroundColor: '#FF0000',
  },
  completeButton: {
    backgroundColor: '#0080FF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  waitingText: {
    fontSize: 12,
    marginLeft: 6,
  },
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  completedText: {
    fontSize: 12,
    color: '#00AA00',
    marginLeft: 6,
  },
});

