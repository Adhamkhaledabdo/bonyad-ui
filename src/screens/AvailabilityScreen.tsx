import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';

interface AvailabilityScreenProps {
  onBack: () => void;
}

interface AvailabilitySlot {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  active?: boolean;
  isActive?: boolean; // Support both for backward compatibility
}

interface AvailabilityData {
  status: string;
  slots: AvailabilitySlot[];
}

const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

const TIME_SLOTS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00',
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

export default function AvailabilityScreen({ onBack }: AvailabilityScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [selectedDay, setSelectedDay] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [editStartTime, setEditStartTime] = useState('09:00');
  const [editEndTime, setEditEndTime] = useState('17:00');
  const [availabilityMode, setAvailabilityMode] = useState<'FIXED_TIMES' | 'AVAILABLE_ANYTIME'>('FIXED_TIMES');
  
  // Custom popup hooks
  const { alertState, showSuccess, showError, hideAlert } = useAlertPopup();
  const { confirmState, showDeleteConfirmation, hideConfirmation } = useConfirmationPopup();
  
  // Time picker states
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showEditStartTimePicker, setShowEditStartTimePicker] = useState(false);
  const [showEditEndTimePicker, setShowEditEndTimePicker] = useState(false);
  
  // Convert time string to Date object
  const timeStringToDate = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };
  
  // Convert Date object to time string (HH:mm)
  const dateToTimeString = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  const [startTimeDate, setStartTimeDate] = useState(timeStringToDate('09:00'));
  const [endTimeDate, setEndTimeDate] = useState(timeStringToDate('17:00'));
  const [editStartTimeDate, setEditStartTimeDate] = useState(timeStringToDate('09:00'));
  const [editEndTimeDate, setEditEndTimeDate] = useState(timeStringToDate('17:00'));

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    setIsLoading(true);
    try {
      const token = await storage.getAuthToken();

      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.TECHNICIANS.AVAILABILITY),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Fetched availability:', data);
        setAvailability(data);
        if (data.status) {
          console.log('✅ Setting availability mode:', data.status);
          setAvailabilityMode(data.status);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetMode = async (mode: 'FIXED_TIMES' | 'AVAILABLE_ANYTIME') => {
    setIsSaving(true);
    try {
      const token = await storage.getAuthToken();

      // For AVAILABLE_ANYTIME, just send status
      // For FIXED_TIMES, send status (slots are optional)
      const requestBody: any = { status: mode };
      
      // If FIXED_TIMES and we have slots, include them
      if (mode === 'FIXED_TIMES' && availability?.slots && availability.slots.length > 0) {
        requestBody.slots = availability.slots
          .filter(slot => {
            // Include slot if active is true or undefined, or if isActive is true (for backward compatibility)
            const isActive = slot.active !== false && (slot.isActive === undefined || slot.isActive !== false);
            return isActive;
          })
          .map(slot => ({
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
          }));
      }

      console.log('📤 Setting availability mode:', mode);
      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
      console.log('📤 Endpoint:', buildApiUrl(API_ENDPOINTS.TECHNICIANS.SET_AVAILABILITY));

      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.TECHNICIANS.SET_AVAILABILITY),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log('📥 Response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Set availability mode response:', responseData);
        setAvailabilityMode(mode);
        // Refresh availability data
        await fetchAvailability();
        // Show success alert after refresh
        setTimeout(() => {
          showSuccess(`Availability mode set to ${mode}`, t('Success'));
        }, 100);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to set availability mode:', errorText);
        
        // Try to parse error as JSON
        let errorMessage = errorText || 'Failed to set availability mode';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch (e) {
          // Not JSON, use as is
        }
        
        // Even if there's an error, try to refresh to see if the status was actually updated
        // This handles cases where the backend updates the status but returns an error
        console.log('🔄 Refreshing availability data despite error...');
        
        // Fetch fresh data to check if status was actually updated
        const refreshResponse = await fetch(
          buildApiUrl(API_ENDPOINTS.TECHNICIANS.AVAILABILITY),
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        
        if (refreshResponse.ok) {
          const refreshedData = await refreshResponse.json();
          console.log('✅ Refreshed availability data:', refreshedData);
          
          // Update state with refreshed data
          setAvailability(refreshedData);
          if (refreshedData.status) {
            setAvailabilityMode(refreshedData.status);
          }
          
          // Check if the mode was actually updated
          if (refreshedData.status === mode) {
            // Status was updated successfully, just show success
            console.log('✅ Status was updated successfully despite error response');
            setTimeout(() => {
              showSuccess(`Availability mode set to ${mode}`, t('Success'));
            }, 100);
            return; // Exit early, don't throw error
          }
        }
        
        // Status wasn't updated, show error
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('❌ Error setting availability mode:', error);
      showError(error.message || t('Failed to update availability mode'), t('Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSlot = async () => {
    if (!selectedDay) {
      showError(t('Please select a day'), t('Error'));
      return;
    }

    if (startTime >= endTime) {
      showError(t('End time must be after start time'), t('Error'));
      return;
    }

    setIsSaving(true);
    try {
      const token = await storage.getAuthToken();

      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.TECHNICIANS.ADD_AVAILABILITY),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dayOfWeek: selectedDay,
            startTime,
            endTime,
          }),
        }
      );

      if (response.ok) {
        // Refresh availability data first
        await fetchAvailability();
        // Then show success and close modal
        setShowAddModal(false);
        setSelectedDay('');
        setStartTime('09:00');
        setEndTime('17:00');
        setTimeout(() => {
          showSuccess(t('Time slot added successfully'), t('Success'));
        }, 100);
      } else {
        throw new Error('Failed to add time slot');
      }
    } catch (error) {
      console.error('Error adding time slot:', error);
      showError(t('Failed to add time slot'), t('Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAllSlots = async () => {
    if (!availability?.slots || availability.slots.length === 0) {
      // If no slots, just save the status
      await handleSetMode('FIXED_TIMES');
      return;
    }

    setIsSaving(true);
    try {
      const token = await storage.getAuthToken();

      const requestBody = {
        status: 'FIXED_TIMES',
        slots: availability.slots
          .filter(slot => {
            // Include slot if active is true or undefined, or if isActive is true (for backward compatibility)
            const isActive = slot.active !== false && (slot.isActive === undefined || slot.isActive !== false);
            return isActive;
          })
          .map(slot => ({
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
      };

      console.log('📤 Saving all slots:', JSON.stringify(requestBody, null, 2));
      console.log('📤 Endpoint:', buildApiUrl(API_ENDPOINTS.TECHNICIANS.SET_AVAILABILITY));

      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.TECHNICIANS.SET_AVAILABILITY),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log('📥 Response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Save all slots response:', responseData);
        // Refresh availability data first
        await fetchAvailability();
        // Show success alert after refresh
        setTimeout(() => {
          showSuccess(t('All time slots saved successfully'), t('Success'));
        }, 100);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to save all slots:', errorText);
        throw new Error(errorText || 'Failed to save all slots');
      }
    } catch (error: any) {
      console.error('❌ Error saving all slots:', error);
      showError(error.message || t('Failed to save all slots'), t('Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSlot = async () => {
    if (!editingSlot) return;

    if (editStartTime >= editEndTime) {
      showError(t('End time must be after start time'), t('Error'));
      return;
    }

    setIsSaving(true);
    try {
      const token = await storage.getAuthToken();

      // Delete old slot and add new one with updated times
      // First delete
      const deleteResponse = await fetch(
        buildApiUrlWithParams(API_ENDPOINTS.TECHNICIANS.DELETE_AVAILABILITY, { slotId: editingSlot.id }),
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!deleteResponse.ok) {
        throw new Error('Failed to update time slot');
      }

      // Then add new slot with updated times
      const addResponse = await fetch(
        buildApiUrl(API_ENDPOINTS.TECHNICIANS.ADD_AVAILABILITY),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dayOfWeek: editingSlot.dayOfWeek,
            startTime: editStartTime,
            endTime: editEndTime,
          }),
        }
      );

      if (addResponse.ok) {
        // Refresh availability data first
        await fetchAvailability();
        // Then close modal and show success
        setShowEditModal(false);
        setEditingSlot(null);
        setTimeout(() => {
          showSuccess(t('Time slot updated successfully'), t('Success'));
        }, 100);
      } else {
        throw new Error('Failed to update time slot');
      }
    } catch (error) {
      console.error('Error updating time slot:', error);
      showError(t('Failed to update time slot'), t('Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    console.log('[Availability] Delete icon tapped for slot', slotId);

    const confirmDelete = async () => {
      try {
        console.log('[Availability] Confirm delete for slot', slotId);
        const token = await storage.getAuthToken();

        const response = await fetch(
          buildApiUrlWithParams(API_ENDPOINTS.TECHNICIANS.DELETE_AVAILABILITY, { slotId }),
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          showSuccess(t('Time slot deleted successfully'), t('Success'));
          fetchAvailability();
        } else {
          const errorText = await response.text();
          console.error('Error response deleting slot:', response.status, errorText);
          throw new Error(errorText || 'Failed to delete time slot');
        }
      } catch (error) {
        console.error('Error deleting time slot:', error);
        showError((error as Error)?.message || t('Failed to delete time slot'), t('Error'));
      }
    };

    showDeleteConfirmation(
      t('Delete Time Slot'),
      t('Are you sure you want to delete this time slot?'),
      confirmDelete,
      t('Delete')
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(18) }]}>{t('Availability')}</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.content}>
          {/* Availability Mode Selection */}
          <Card style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(18) }]}>{t('Availability Mode')}</Text>
              
              <View style={styles.modeButtons}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    { backgroundColor: availabilityMode === 'AVAILABLE_ANYTIME' ? colors.primary : colors.gray100 },
                  ]}
                  onPress={() => handleSetMode('AVAILABLE_ANYTIME')}
                  disabled={isSaving}
                >
                  <Ionicons
                    name="time"
                    size={20}
                    color={availabilityMode === 'AVAILABLE_ANYTIME' ? '#fff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.modeButtonText,
                      { color: availabilityMode === 'AVAILABLE_ANYTIME' ? '#fff' : colors.textSecondary, fontSize: scaledSize(16) },
                    ]}
                  >
                    {t('Anytime')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    { backgroundColor: availabilityMode === 'FIXED_TIMES' ? colors.primary : colors.gray100 },
                  ]}
                  onPress={() => handleSetMode('FIXED_TIMES')}
                  disabled={isSaving}
                >
                  <Ionicons
                    name="calendar"
                    size={20}
                    color={availabilityMode === 'FIXED_TIMES' ? '#fff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.modeButtonText,
                      { color: availabilityMode === 'FIXED_TIMES' ? '#fff' : colors.textSecondary, fontSize: scaledSize(16) },
                    ]}
                  >
                    {t('Fixed Times')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>

          {/* Time Slots */}
          {availabilityMode === 'FIXED_TIMES' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
                  {t('Time Slots')} ({availability?.slots?.length || 0})
                </Text>
                {availability?.slots && availability.slots.length > 0 && (
                  <TouchableOpacity
                    style={[styles.saveAllButton, { backgroundColor: colors.primary }]}
                    onPress={handleSaveAllSlots}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="save" size={16} color="#fff" />
                        <Text style={[styles.saveAllButtonText, { fontSize: scaledSize(14) }]}>{t('Save All')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {!availability?.slots || availability.slots.length === 0 ? (
                <Card style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                  <Card.Content style={styles.emptyState}>
                    <Ionicons name="time-outline" size={60} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
                      {t('No time slots added')}
                    </Text>
                    <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
                      {t('Add your working hours or save without slots')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.saveButton, { backgroundColor: colors.primary, marginTop: 16 }]}
                      onPress={() => handleSetMode('FIXED_TIMES')}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={[styles.saveButtonText, { fontSize: scaledSize(16) }]}>{t('Save FIXED_TIMES Status')}</Text>
                      )}
                    </TouchableOpacity>
                  </Card.Content>
                </Card>
              ) : (
                availability.slots.map((slot) => (
                  <Card key={slot.id} style={[styles.card, { backgroundColor: colors.cardBackground }]}>
                    <Card.Content style={styles.slotContent}>
                      <View>
                        <Text style={[styles.slotDay, { color: colors.text, fontSize: scaledSize(16) }]}>
                          {DAYS_OF_WEEK.find(d => d.value === slot.dayOfWeek)?.label || slot.dayOfWeek}
                        </Text>
                        <Text style={[styles.slotTime, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
                          {slot.startTime} - {slot.endTime}
                        </Text>
                      </View>
                      <View style={styles.slotActions}>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingSlot(slot);
                            setEditStartTime(slot.startTime);
                            setEditEndTime(slot.endTime);
                            setEditStartTimeDate(timeStringToDate(slot.startTime));
                            setEditEndTimeDate(timeStringToDate(slot.endTime));
                            setShowEditModal(true);
                          }}
                          style={styles.editButton}
                        >
                          <Ionicons name="create-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteSlot(slot.id)}
                          style={styles.deleteButton}
                        >
                          <Ionicons name="trash" size={18} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </Card.Content>
                  </Card>
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Add Time Slot Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: scaledSize(18) }]}>{t('Add Time Slot')}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Day Selection */}
              <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Day of Week')}</Text>
              <View style={styles.dayGrid}>
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day.value}
                    style={[
                      styles.dayButton,
                      { backgroundColor: selectedDay === day.value ? colors.primary : colors.gray100 },
                    ]}
                    onPress={() => setSelectedDay(day.value)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        { color: selectedDay === day.value ? '#fff' : colors.text, fontSize: scaledSize(14) },
                      ]}
                    >
                      {day.label.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Time Selection */}
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Start Time')}</Text>
                  <TouchableOpacity
                    style={[styles.timePickerButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Text style={[styles.timePickerText, { color: colors.text, fontSize: scaledSize(16) }]}>
                      {startTime}
                    </Text>
                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  {Platform.OS === 'android' && showStartTimePicker && (
                    <DateTimePicker
                      value={startTimeDate}
                      mode="time"
                      is24Hour={false}
                      display="default"
                      onChange={(event, date) => {
                        setShowStartTimePicker(Platform.OS === 'ios');
                        if (date) {
                          setStartTimeDate(date);
                          setStartTime(dateToTimeString(date));
                        }
                      }}
                    />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(14) }]}>{t('End Time')}</Text>
                  <TouchableOpacity
                    style={[styles.timePickerButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Text style={[styles.timePickerText, { color: colors.text, fontSize: scaledSize(16) }]}>
                      {endTime}
                    </Text>
                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  {Platform.OS === 'android' && showEndTimePicker && (
                    <DateTimePicker
                      value={endTimeDate}
                      mode="time"
                      is24Hour={false}
                      display="default"
                      onChange={(event, date) => {
                        setShowEndTimePicker(Platform.OS === 'ios');
                        if (date) {
                          setEndTimeDate(date);
                          setEndTime(dateToTimeString(date));
                        }
                      }}
                    />
                  )}
                </View>
              </View>

              {Platform.OS === 'ios' && (
                <View style={styles.iosTimePickers}>
                  {showStartTimePicker && (
                    <DateTimePicker
                      value={startTimeDate}
                      mode="time"
                      display="spinner"
                      onChange={(event, date) => {
                        if (date) {
                          setStartTimeDate(date);
                          setStartTime(dateToTimeString(date));
                        }
                        setShowStartTimePicker(false);
                      }}
                    />
                  )}
                  {showEndTimePicker && (
                    <DateTimePicker
                      value={endTimeDate}
                      mode="time"
                      display="spinner"
                      onChange={(event, date) => {
                        if (date) {
                          setEndTimeDate(date);
                          setEndTime(dateToTimeString(date));
                        }
                        setShowEndTimePicker(false);
                      }}
                    />
                  )}
                </View>
              )}

              {Platform.OS === 'web' && (
                <View style={styles.webTimePickers}>
                  {showStartTimePicker && (
                    <View style={styles.webTimePickerContainer}>
                      <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Select Start Time')}</Text>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => {
                          setStartTime(e.target.value);
                          setStartTimeDate(timeStringToDate(e.target.value));
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '16px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.cardBackground,
                          color: colors.text,
                        }}
                      />
                      <TouchableOpacity
                        style={[styles.timePickerDoneButton, { backgroundColor: colors.primary }]}
                        onPress={() => setShowStartTimePicker(false)}
                      >
                        <Text style={[styles.timePickerDoneText, { fontSize: scaledSize(16) }]}>{t('Done')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {showEndTimePicker && (
                    <View style={styles.webTimePickerContainer}>
                      <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Select End Time')}</Text>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => {
                          setEndTime(e.target.value);
                          setEndTimeDate(timeStringToDate(e.target.value));
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '16px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.cardBackground,
                          color: colors.text,
                        }}
                      />
                      <TouchableOpacity
                        style={[styles.timePickerDoneButton, { backgroundColor: colors.primary }]}
                        onPress={() => setShowEndTimePicker(false)}
                      >
                        <Text style={[styles.timePickerDoneText, { fontSize: scaledSize(16) }]}>{t('Done')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleAddSlot}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.saveButtonText, { fontSize: scaledSize(16) }]}>{t('Add Slot')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* Edit Time Slot Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: scaledSize(18) }]}>{t('Edit Time Slot')}</Text>
              <TouchableOpacity onPress={() => {
                setShowEditModal(false);
                setEditingSlot(null);
              }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Day Display (read-only) */}
              <View style={styles.editDayDisplay}>
                <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Day of Week')}</Text>
                <Text style={[styles.editDayText, { color: colors.text, fontSize: scaledSize(16) }]}>
                  {DAYS_OF_WEEK.find(d => d.value === editingSlot?.dayOfWeek)?.label || editingSlot?.dayOfWeek}
                </Text>
              </View>

              {/* Time Selection */}
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Start Time')}</Text>
                  <TouchableOpacity
                    style={[styles.timePickerButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                    onPress={() => {
                      setEditStartTimeDate(timeStringToDate(editStartTime));
                      setShowEditStartTimePicker(true);
                    }}
                  >
                    <Text style={[styles.timePickerText, { color: colors.text, fontSize: scaledSize(16) }]}>
                      {editStartTime}
                    </Text>
                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  {Platform.OS === 'android' && showEditStartTimePicker && (
                    <DateTimePicker
                      value={editStartTimeDate}
                      mode="time"
                      is24Hour={false}
                      display="default"
                      onChange={(event, date) => {
                        setShowEditStartTimePicker(Platform.OS === 'ios');
                        if (date) {
                          setEditStartTimeDate(date);
                          setEditStartTime(dateToTimeString(date));
                        }
                      }}
                    />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(14) }]}>{t('End Time')}</Text>
                  <TouchableOpacity
                    style={[styles.timePickerButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                    onPress={() => {
                      setEditEndTimeDate(timeStringToDate(editEndTime));
                      setShowEditEndTimePicker(true);
                    }}
                  >
                    <Text style={[styles.timePickerText, { color: colors.text, fontSize: scaledSize(16) }]}>
                      {editEndTime}
                    </Text>
                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  {Platform.OS === 'android' && showEditEndTimePicker && (
                    <DateTimePicker
                      value={editEndTimeDate}
                      mode="time"
                      is24Hour={false}
                      display="default"
                      onChange={(event, date) => {
                        setShowEditEndTimePicker(Platform.OS === 'ios');
                        if (date) {
                          setEditEndTimeDate(date);
                          setEditEndTime(dateToTimeString(date));
                        }
                      }}
                    />
                  )}
                </View>
              </View>

              {Platform.OS === 'ios' && (
                <View style={styles.iosTimePickers}>
                  {showEditStartTimePicker && (
                    <DateTimePicker
                      value={editStartTimeDate}
                      mode="time"
                      display="spinner"
                      onChange={(event, date) => {
                        if (date) {
                          setEditStartTimeDate(date);
                          setEditStartTime(dateToTimeString(date));
                        }
                        setShowEditStartTimePicker(false);
                      }}
                    />
                  )}
                  {showEditEndTimePicker && (
                    <DateTimePicker
                      value={editEndTimeDate}
                      mode="time"
                      display="spinner"
                      onChange={(event, date) => {
                        if (date) {
                          setEditEndTimeDate(date);
                          setEditEndTime(dateToTimeString(date));
                        }
                        setShowEditEndTimePicker(false);
                      }}
                    />
                  )}
                </View>
              )}

              {Platform.OS === 'web' && (
                <View style={styles.webTimePickers}>
                  {showEditStartTimePicker && (
                    <View style={styles.webTimePickerContainer}>
                      <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Select Start Time')}</Text>
                      <input
                        type="time"
                        value={editStartTime}
                        onChange={(e) => {
                          setEditStartTime(e.target.value);
                          setEditStartTimeDate(timeStringToDate(e.target.value));
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '16px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.cardBackground,
                          color: colors.text,
                        }}
                      />
                      <TouchableOpacity
                        style={[styles.timePickerDoneButton, { backgroundColor: colors.primary }]}
                        onPress={() => setShowEditStartTimePicker(false)}
                      >
                        <Text style={[styles.timePickerDoneText, { fontSize: scaledSize(16) }]}>{t('Done')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {showEditEndTimePicker && (
                    <View style={styles.webTimePickerContainer}>
                      <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Select End Time')}</Text>
                      <input
                        type="time"
                        value={editEndTime}
                        onChange={(e) => {
                          setEditEndTime(e.target.value);
                          setEditEndTimeDate(timeStringToDate(e.target.value));
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '16px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.cardBackground,
                          color: colors.text,
                        }}
                      />
                      <TouchableOpacity
                        style={[styles.timePickerDoneButton, { backgroundColor: colors.primary }]}
                        onPress={() => setShowEditEndTimePicker(false)}
                      >
                        <Text style={[styles.timePickerDoneText, { fontSize: scaledSize(16) }]}>{t('Done')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleUpdateSlot}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.saveButtonText, { fontSize: scaledSize(16) }]}>{t('Update Slot')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Card>
        </View>
      </Modal>
      
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  saveAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  saveAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  slotContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotDay: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  slotTime: {
    fontSize: 14,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  editDayDisplay: {
    marginBottom: 16,
  },
  editDayText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalScrollView: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  dayButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  timePickerText: {
    fontSize: 16,
    fontWeight: '500',
  },
  iosTimePickers: {
    marginTop: 16,
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
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

