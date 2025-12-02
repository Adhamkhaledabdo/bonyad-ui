import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { storage } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';
import LocationPicker from '../components/LocationPicker';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';

interface ManualProjectFormProps {
  technician?: any;
  onBack: () => void;
  onSuccess?: () => void;
}

interface ServiceCategory {
  id: number;
  nameAr: string;
  nameEn: string;
  description: string;
  imageUrl: string;
}

export default function ManualProjectForm({
  technician,
  onBack,
  onSuccess,
}: ManualProjectFormProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Form state
  const [description, setDescription] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<number>(0);
  const [category, setCategory] = useState('');
  const [budget, setBudget] = useState('');
  const [budgetUnspecified, setBudgetUnspecified] = useState(false);
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  // Service categories
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  
  // Date picker state for bid closed at
  const [bidClosedDate, setBidClosedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [bidsCloseAt, setBidsCloseAt] = useState<string>('');

  // Fetch service categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch(buildApiUrl(API_ENDPOINTS.SERVICES.LIST));
        const data = await response.json();
        if (data && Array.isArray(data)) {
          setServiceCategories(data);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Pick images
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map((asset) => asset.uri);
      setPhotos([...photos, ...newPhotos].slice(0, 5));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Format date for API
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  // Format date for display
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Handle date picker change
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      setShowTimePicker(false);
      if (event.type === 'set' && selectedDate) {
        setBidClosedDate(selectedDate);
        setBidsCloseAt(formatDateForAPI(selectedDate));
      }
    } else if (Platform.OS === 'ios' && selectedDate) {
      setBidClosedDate(selectedDate);
      setBidsCloseAt(formatDateForAPI(selectedDate));
    }
  };

  // Handle date selection
  const handlePickDate = () => {
    if (Platform.OS === 'android') {
      setShowDatePicker(true);
    } else {
      // For iOS/web, use a combined picker or modal
      setShowDatePicker(true);
    }
  };

  // Handle time selection
  const handlePickTime = () => {
    if (Platform.OS === 'android') {
      setShowTimePicker(true);
    } else {
      setShowTimePicker(true);
    }
  };

  // Clear bid deadline
  const clearBidDeadline = () => {
    setBidClosedDate(new Date());
    setBidsCloseAt('');
  };

  // Submit project
  const submitProject = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a project description');
      return;
    }

    if (!selectedServiceId) {
      Alert.alert('Error', 'Please select a service category');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await storage.getAuthToken();
      const userId = await storage.getUserId();

      if (!token || !userId) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      // Validate budget if not unspecified
      if (!budgetUnspecified && (!budget || budget.trim() === '' || parseFloat(budget) <= 0)) {
        Alert.alert(t('Error'), t('Please enter a valid budget amount or mark it as unspecified'));
        setIsSubmitting(false);
        return;
      }

      // Create form data
      const formData = new FormData();

      formData.append('description', description);
      formData.append('serviceId', selectedServiceId.toString());
      
      // Budget handling
      if (budgetUnspecified) {
        formData.append('budgetUnspecified', 'true');
      } else {
        formData.append('budget', budget || '0');
        formData.append('budgetUnspecified', 'false');
      }
      
      formData.append('address', address);
      formData.append('latitude', latitude?.toString() || '0');
      formData.append('longitude', longitude?.toString() || '0');
      formData.append('timeRequired', '7'); // Default 1 week
      formData.append('projectType', technician ? 'DIRECT_ASSIGNMENT' : 'ALL');
      
      // Add bid deadline if set
      if (bidsCloseAt) {
        formData.append('bidsCloseAt', bidsCloseAt);
      }

      if (technician) {
        formData.append('assignedTechnicianId', technician.id.toString());
        formData.append('assignmentType', 'DIRECT_ASSIGNMENT');
      }

      // Add photos
      photos.forEach((uri, index) => {
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('images', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          name: `photo_${index}.jpg`,
          type,
        } as any);
      });

      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.PROJECTS.CREATE),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok && data.id) {
        Alert.alert(
          'Success',
          technician ? 'Deal sent successfully!' : 'Project submitted successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess?.();
                onBack();
              },
            },
          ]
        );
      } else {
        throw new Error(data.message || 'Failed to submit project');
      }
    } catch (error: any) {
      console.error('Error submitting project:', error);
      Alert.alert('Error', error.message || 'Failed to submit project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('Manual Project Form')}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('Project Description')} *
          </Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            multiline
            numberOfLines={6}
            value={description}
            onChangeText={setDescription}
            placeholder={t('Describe your project needs...')}
            placeholderTextColor={colors.textTertiary}
            textAlignVertical="top"
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('Service Category')} *
          </Text>
          <TouchableOpacity
            style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={[styles.pickerText, { color: category ? colors.text : colors.textTertiary }]}>
              {category || t('Select category')}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Budget */}
        <View style={styles.section}>
          <View style={styles.budgetHeader}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('Budget')} ({t('Optional')})
            </Text>
            <TouchableOpacity
              onPress={() => setBudgetUnspecified(!budgetUnspecified)}
              style={styles.checkboxRow}
            >
              <Ionicons
                name={budgetUnspecified ? 'checkbox' : 'checkbox-outline'}
                size={20}
                color={budgetUnspecified ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>
                {t('Unspecified')}
              </Text>
            </TouchableOpacity>
          </View>
          {!budgetUnspecified && (
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={budget}
              onChangeText={setBudget}
              placeholder={t('Enter budget amount (SAR)')}
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />
          )}
        </View>

        {/* Bid Deadline */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('Bid Deadline')} ({t('Optional')})
          </Text>
          {bidsCloseAt ? (
            <View style={styles.dateDisplayContainer}>
              <Text style={[styles.dateDisplayText, { color: colors.text }]}>
                {formatDateForDisplay(bidsCloseAt)}
              </Text>
              <TouchableOpacity onPress={clearBidDeadline} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.datePickerButtons}>
              <TouchableOpacity
                style={[styles.datePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handlePickDate}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={[styles.datePickerButtonText, { color: colors.text }]}>
                  {t('Pick Date')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handlePickTime}
              >
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={[styles.datePickerButtonText, { color: colors.text }]}>
                  {t('Pick Time')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('Project Address')} ({t('Optional')})
          </Text>
          <TouchableOpacity
            style={[styles.addressButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowMapPicker(true)}
          >
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={[styles.addressText, { color: address ? colors.text : colors.textTertiary }]}>
              {address || t('Select location')}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('Photos')} ({photos.length}/5) ({t('Optional')})
          </Text>
          <View style={styles.photosContainer}>
            {photos.map((uri, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity
                style={[styles.addPhotoButton, { borderColor: colors.primary }]}
                onPress={pickImages}
              >
                <Ionicons name="add" size={32} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={submitProject}
          loading={isSubmitting}
          disabled={isSubmitting || !description.trim() || !selectedServiceId}
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          contentStyle={styles.submitButtonContent}
        >
          {technician ? t('Send Deal') : t('Submit Project')}
        </Button>
      </ScrollView>

      {/* Category Picker Modal */}
      {showCategoryPicker && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('Select Category')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {serviceCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    { borderBottomColor: colors.border },
                    selectedServiceId === cat.id && { backgroundColor: colors.surface },
                  ]}
                  onPress={() => {
                    setSelectedServiceId(cat.id);
                    setCategory(cat.nameEn);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={[styles.categoryText, { color: colors.text }]}>
                    {cat.nameEn}
                  </Text>
                  {selectedServiceId === cat.id && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Location Picker */}
      {showMapPicker && (
        <LocationPicker
          initialLocation={
            latitude && longitude ? { latitude, longitude } : undefined
          }
          initialAddress={address}
          onLocationSelect={(location) => {
            setLatitude(location.latitude);
            setLongitude(location.longitude);
            setAddress(location.address);
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {/* Date Picker for Android */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={bidClosedDate}
          mode="date"
          display="calendar"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={bidClosedDate}
          mode="time"
          display="spinner"
          is24Hour={false}
          onChange={handleDateChange}
        />
      )}

      {/* Date Picker for iOS */}
      {Platform.OS === 'ios' && (showDatePicker || showTimePicker) && (
        <DateTimePicker
          value={bidClosedDate}
          mode="datetime"
          display="spinner"
          is24Hour={false}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Loading Overlay */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: colors.cardBackground }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              {t('Submitting project...')}
            </Text>
          </View>
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textArea: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  input: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  pickerText: {
    fontSize: 16,
    flex: 1,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkboxLabel: {
    fontSize: 14,
  },
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  addressText: {
    fontSize: 16,
    flex: 1,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhoto: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 12,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  categoryText: {
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  dateDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateDisplayText: {
    fontSize: 16,
    flex: 1,
  },
  clearButton: {
    padding: 4,
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  datePickerButtonText: {
    fontSize: 16,
  },
});
