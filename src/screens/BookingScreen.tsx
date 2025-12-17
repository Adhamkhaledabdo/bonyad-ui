import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { storage } from '../utils/storage';
import { buildApiUrl, API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';
import { getTechnicianAvailability, createAppointment } from '../services/BookingService';
import LocationPicker from '../components/LocationPicker';
import { showAlert, showError, showSuccess } from '../utils/alert';

interface BookingScreenProps {
  technicianId: number;
  technicianName: string;
  projectId?: number;
  onBack: () => void;
  onSuccess?: () => void;
}

interface AvailabilitySlot {
  id: number;
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  startTime: string;
  endTime: string;
  active: boolean;
}

interface AvailabilityResponse {
  id: number;
  userId: string;
  technicianName: string;
  status: 'FIXED_TIMES' | 'AVAILABLE_ANYTIME';
  availability: AvailabilitySlot[];
}

const BookingScreen: React.FC<BookingScreenProps> = ({
  technicianId,
  technicianName,
  projectId,
  onBack,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [address, setAddress] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [availabilityStatus, setAvailabilityStatus] = useState<'FIXED_TIMES' | 'AVAILABLE_ANYTIME'>('FIXED_TIMES');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom time picker state (for AVAILABLE_ANYTIME)
  const [showCustomStartTime, setShowCustomStartTime] = useState(false);
  const [showCustomEndTime, setShowCustomEndTime] = useState(false);
  const [customStartTime, setCustomStartTime] = useState(new Date());
  const [customEndTime, setCustomEndTime] = useState(new Date());

  useEffect(() => {
    fetchAvailability();
  }, []);

  // Fetch technician availability
  const fetchAvailability = async () => {
    try {
      setIsLoading(true);
      const data = await getTechnicianAvailability(technicianId);

      setAvailabilityStatus(data.status || 'FIXED_TIMES');
      setAvailability(data.availability || []);

      console.log(`✅ Loaded ${data.availability?.length || 0} availability slots`);
      console.log(`   Status: ${data.status}`);
      } catch (error: any) {
        console.error('❌ Error fetching availability:', error);
        showError(error.message || t('Failed to load availability'));
      } finally {
      setIsLoading(false);
    }
  };

  // Get available slots for selected date
  const getSlotsForDate = (date: Date) => {
    const weekday = date.getDay();
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayName = dayNames[weekday];

    return availability.filter(
      (slot) => slot.dayOfWeek.toUpperCase() === dayName && slot.active
    );
  };

  // Check if a date has availability
  const isDateAvailable = (date: Date): boolean => {
    if (availabilityStatus === 'AVAILABLE_ANYTIME') {
      return true; // All dates are available
    }
    const weekday = date.getDay();
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayName = dayNames[weekday];
    
    return availability.some(
      (slot) => slot.dayOfWeek.toUpperCase() === dayName && slot.active
    );
  };

  const availableSlots = getSlotsForDate(selectedDate);

  // Format date to YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format time to HH:mm:ss
  const formatTimeToHHMMSS = (time: Date | string): string => {
    if (typeof time === 'string') {
      // Already formatted
      return time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    }

    // Date object
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}:00`;
  };

  // Submit booking
  const submitBooking = async () => {
    if (!address || address.trim() === '') {
      showError(t('Please select a location'));
      return;
    }

    if (availabilityStatus === 'FIXED_TIMES' && !selectedSlot) {
      showError(t('Please select a time slot'));
      return;
    }

    if (availabilityStatus === 'AVAILABLE_ANYTIME') {
      // Validate that end time is after start time
      if (customEndTime <= customStartTime) {
        showError(t('End time must be after start time'));
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const token = await storage.getAuthToken();
      const userId = await storage.getUserId();

      if (!token || !userId) {
        showError(t('Please login again'));
        setIsSubmitting(false);
        return;
      }

      const formattedDate = formatDate(selectedDate);
      let startTime: string;
      let endTime: string;

      if (availabilityStatus === 'FIXED_TIMES') {
        startTime = formatTimeToHHMMSS(selectedSlot!.startTime);
        endTime = formatTimeToHHMMSS(selectedSlot!.endTime);
      } else {
        // Custom time
        startTime = formatTimeToHHMMSS(customStartTime);
        endTime = formatTimeToHHMMSS(customEndTime);
      }

      const requestBody: any = {
        technicianId: technicianId,
        requestedDate: formattedDate,
        requestedStartTime: startTime,
        requestedEndTime: endTime,
        address: address,
      };

      const bookingData = {
        technicianId: technicianId,
        requestedDate: formattedDate,
        requestedStartTime: startTime,
        requestedEndTime: endTime,
        address: address,
        ...(projectId && { projectId: projectId }),
      };

      console.log('📤 Creating appointment...');
      console.log('   Data:', bookingData);

      const result = await createAppointment(bookingData);

      if (result && result.success) {
        showSuccess(t('Appointment request sent! Waiting for technician confirmation.'));
        setTimeout(() => {
          onSuccess?.();
          onBack();
        }, 1000);
      } else {
        throw new Error(t('Failed to create appointment'));
      }
    } catch (error: any) {
      console.error('❌ Error creating booking:', error);
      showError(error.message || t('Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Location picker - same as project forms
  const handleSelectLocation = () => {
    setShowLocationPicker(true);
  };

  const handleLocationSelect = (selectedLocation: { latitude: number; longitude: number; address: string }) => {
    setLocation({ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude });
    setAddress(selectedLocation.address);
    setShowLocationPicker(false);
  };

  // Render calendar grid
  const renderCalendarGrid = () => {
    const today = new Date();
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    
    // Get first day of month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Day names
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Generate calendar days
    const calendarDays: (number | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(day);
    }
    
    // Group into weeks
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(16) }]}>{t('Select Date')}</Text>
        
        {/* Month/Year Header */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={() => {
              const prevMonth = new Date(currentYear, currentMonth - 1, 1);
              setSelectedDate(prevMonth);
              setSelectedSlot(null);
            }}
            style={styles.monthNavButton}
          >
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
          </TouchableOpacity>
          
          <Text style={[styles.monthYearText, { color: colors.text, fontSize: scaledSize(18) }]}>
            {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          
          <TouchableOpacity
            onPress={() => {
              const nextMonth = new Date(currentYear, currentMonth + 1, 1);
              setSelectedDate(nextMonth);
              setSelectedSlot(null);
            }}
            style={styles.monthNavButton}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Day names header */}
        <View style={styles.dayNamesRow}>
          {dayNames.map((dayName, index) => (
            <View key={index} style={styles.dayNameCell}>
              <Text style={[styles.dayNameText, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                {dayName}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.calendarRow}>
              {week.map((day, dayIndex) => {
                if (day === null) {
                  return <View key={dayIndex} style={styles.calendarDay} />;
                }
                
                const date = new Date(currentYear, currentMonth, day);
                const dateString = formatDate(date);
                const isPast = date < today && dateString !== formatDate(today);
                const isSelected = formatDate(date) === formatDate(selectedDate);
                const isAvailable = !isPast && isDateAvailable(date);
                
                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.calendarDay,
                      isSelected && { backgroundColor: colors.primary },
                      isPast && { opacity: 0.3 },
                    ]}
                    onPress={() => {
                      if (!isPast && isAvailable) {
                        setSelectedDate(date);
                        setSelectedSlot(null);
                      }
                    }}
                    disabled={isPast || !isAvailable}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        { color: isSelected ? '#fff' : colors.text },
                        isPast && { color: colors.textSecondary },
                      ]}
                    >
                      {day}
                    </Text>
                    {isAvailable && !isSelected && (
                      <View style={[styles.availabilityDot, { backgroundColor: '#2196F3' }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
        
        {/* Selected date info */}
        <View style={[styles.selectedDateInfo, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <Text style={[styles.selectedDateText, { color: colors.text, fontSize: scaledSize(14) }]}>
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
          {t('Loading availability')}...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text, fontSize: scaledSize(18) }]}>{t('Booking')}</Text>
        <View style={styles.backButton} />
      </View>

      {/* Technician Info */}
      <View style={[styles.technicianHeader, { backgroundColor: colors.cardBackground }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="person" size={24} color={colors.primary} />
        </View>
        <Text style={[styles.technicianName, { color: colors.text, fontSize: scaledSize(16) }]}>{technicianName}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {renderCalendarGrid()}

        {/* Time Slots or Custom Time Picker */}
        {availabilityStatus === 'FIXED_TIMES' ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(16) }]}>{t('Available Times')}</Text>
            {availableSlots.length > 0 ? (
              <View style={styles.slotsContainer}>
                {availableSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot.id}
                    onPress={() => setSelectedSlot(slot)}
                    style={[
                      styles.slotButton,
                      { borderColor: selectedSlot?.id === slot.id ? colors.primary : colors.border },
                      selectedSlot?.id === slot.id && { backgroundColor: colors.primary + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        { color: selectedSlot?.id === slot.id ? colors.primary : colors.text },
                        selectedSlot?.id === slot.id && styles.slotTextSelected,
                      ]}
                    >
                      {slot.startTime} - {slot.endTime}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={[styles.noSlotsText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
                {t('No slots available for this date')}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(16) }]}>{t('Select Time')}</Text>

            <View style={styles.timePickerRow}>
              <View style={styles.timePicker}>
                <Text style={[styles.timeLabel, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Start Time')}</Text>
                <TouchableOpacity
                  style={[styles.timeButton, { backgroundColor: colors.cardBackground }]}
                  onPress={() => setShowCustomStartTime(true)}
                >
                  <Text style={[styles.timeText, { color: colors.text, fontSize: scaledSize(16) }]}>
                    {customStartTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
                {Platform.OS === 'android' && showCustomStartTime && (
                  <DateTimePicker
                    value={customStartTime}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={(event, date) => {
                      setShowCustomStartTime(Platform.OS === 'ios');
                      if (date) setCustomStartTime(date);
                    }}
                  />
                )}
              </View>

              <View style={styles.timePicker}>
                <Text style={[styles.timeLabel, { color: colors.text }]}>{t('End Time')}</Text>
                <TouchableOpacity
                  style={[styles.timeButton, { backgroundColor: colors.cardBackground }]}
                  onPress={() => setShowCustomEndTime(true)}
                >
                  <Text style={[styles.timeText, { color: colors.text }]}>
                    {customEndTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
                {Platform.OS === 'android' && showCustomEndTime && (
                  <DateTimePicker
                    value={customEndTime}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={(event, date) => {
                      setShowCustomEndTime(Platform.OS === 'ios');
                      if (date) setCustomEndTime(date);
                    }}
                  />
                )}
              </View>
            </View>

            {Platform.OS === 'ios' && (
              <View style={styles.iosTimePickers}>
                {showCustomStartTime && (
                  <DateTimePicker
                    value={customStartTime}
                    mode="time"
                    display="spinner"
                    onChange={(event, date) => {
                      if (date) setCustomStartTime(date);
                      setShowCustomStartTime(false);
                    }}
                  />
                )}
                {showCustomEndTime && (
                  <DateTimePicker
                    value={customEndTime}
                    mode="time"
                    display="spinner"
                    onChange={(event, date) => {
                      if (date) setCustomEndTime(date);
                      setShowCustomEndTime(false);
                    }}
                  />
                )}
              </View>
            )}

            {Platform.OS === 'web' && (
              <View style={styles.webTimePickers}>
                {showCustomStartTime && (
                  <View style={styles.webTimePickerContainer}>
                    <Text style={[styles.timeLabel, { color: colors.text }]}>{t('Select Start Time')}</Text>
                    <input
                      type="time"
                      value={customStartTime.toTimeString().slice(0, 5)}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const newDate = new Date(customStartTime);
                        newDate.setHours(hours, minutes, 0, 0);
                        setCustomStartTime(newDate);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '16px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.cardBackground,
                        color: colors.text,
                        marginTop: 8,
                      }}
                    />
                    <TouchableOpacity
                      style={[styles.timePickerDoneButton, { backgroundColor: colors.primary }]}
                      onPress={() => setShowCustomStartTime(false)}
                    >
                      <Text style={styles.timePickerDoneText}>{t('Done')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {showCustomEndTime && (
                  <View style={styles.webTimePickerContainer}>
                    <Text style={[styles.timeLabel, { color: colors.text }]}>{t('Select End Time')}</Text>
                    <input
                      type="time"
                      value={customEndTime.toTimeString().slice(0, 5)}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const newDate = new Date(customEndTime);
                        newDate.setHours(hours, minutes, 0, 0);
                        setCustomEndTime(newDate);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '16px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.cardBackground,
                        color: colors.text,
                        marginTop: 8,
                      }}
                    />
                    <TouchableOpacity
                      style={[styles.timePickerDoneButton, { backgroundColor: colors.primary }]}
                      onPress={() => setShowCustomEndTime(false)}
                    >
                      <Text style={styles.timePickerDoneText}>{t('Done')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Address */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Location')}</Text>
          <TouchableOpacity onPress={handleSelectLocation} style={[styles.addressButton, { backgroundColor: colors.cardBackground }]}>
            <Text style={address ? [styles.addressText, { color: colors.text }] : [styles.addressPlaceholder, { color: colors.textSecondary }]}>
              {address || t('Choose Location')}
            </Text>
            <Ionicons name="location" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <TouchableOpacity
        onPress={submitBooking}
        style={[styles.submitButton, { backgroundColor: colors.primary }]}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>{t('Confirm Booking')}</Text>
        )}
      </TouchableOpacity>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPicker
          initialLocation={location || undefined}
          initialAddress={address || undefined}
          onLocationSelect={handleLocationSelect}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  technicianHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  technicianName: {
    fontSize: 18,
    fontWeight: '600',
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
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  datePicker: {
    width: '100%',
  },
  dateButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  monthNavButton: {
    padding: 4,
  },
  monthYearText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayNameText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    marginBottom: 8,
  },
  calendarRow: {
    flexDirection: 'row',
    marginBottom: 1,
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    margin: 0.5,
    position: 'relative',
    minHeight: 32,
    maxHeight: 40,
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '500',
  },
  availabilityDot: {
    position: 'absolute',
    bottom: 1,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  selectedDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  slotButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  slotText: {
    fontSize: 14,
  },
  slotTextSelected: {
    fontWeight: '600',
  },
  noSlotsText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  timePicker: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 16,
  },
  iosTimePickers: {
    marginTop: 12,
  },
  webTimePickers: {
    marginTop: 16,
  },
  webTimePickerContainer: {
    marginTop: 8,
  },
  timePickerDoneButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  timePickerDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addressButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  addressText: {
    fontSize: 14,
    flex: 1,
  },
  addressPlaceholder: {
    fontSize: 14,
    flex: 1,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    margin: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BookingScreen;

