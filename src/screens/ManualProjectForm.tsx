import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { storage } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import LocationPicker from '../components/LocationPicker';
import ProjectCreationFlow from '../components/ProjectCreationFlow';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import { globalAlertManager } from '../utils/globalAlertManager';

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

// Design system colors from Figma
const FIGMA_COLORS = {
  bluePrimary100: '#003867',
  bluePrimary80: '#004A8A',
  bluePrimary70: '#00549B',
  bluePrimary60: '#005DAC',
  bluePrimary10: '#E6EFF7',
  bluePrimary20: '#B3CEE6',
  greenPrimary: '#008B3E',
  greenLight: '#E6F5EC',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  white: '#FFFFFF',
  purple100: '#3C076D',
  purple10: '#EFE6F5',
};

export default function ManualProjectForm({
  technician,
  onBack,
  onSuccess,
}: ManualProjectFormProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isRTL = i18n.language === 'ar';
  const { alertState, showError, showAlert, hideAlert } = useAlertPopup();
  
  // Responsive breakpoints
  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width >= 1024;
  const isMediumWeb = isWeb && width >= 768 && width < 1024;
  const isSmallScreen = width < 768;

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
      showAlert('Permission Required', 'Please grant camera roll permissions', 'warning');
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
      showError('Please enter a project description');
      return;
    }

    if (!selectedServiceId) {
      showError('Please select a service category');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await storage.getAuthToken();
      const userId = await storage.getUserId();

      if (!token || !userId) {
        showError('Please login again');
        return;
      }

      // Validate budget if not unspecified
      if (!budgetUnspecified && (!budget || budget.trim() === '' || parseFloat(budget) <= 0)) {
        showError(t('Please enter a valid budget amount or mark it as unspecified'));
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
        const successMessage = technician ? 'Deal sent successfully!' : 'Project submitted successfully!';
        
        // Use custom popup for all platforms
        showAlert(
          t('Success'),
          successMessage,
          'success',
          [
            {
              text: t('OK'),
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
      showError(error.message || 'Failed to submit project', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDark = theme === 'dark';
  const primaryBlue = isDark ? colors.primary : FIGMA_COLORS.bluePrimary60;
  const cardBg = isDark ? colors.cardBackground : FIGMA_COLORS.white;
  const textPrimary = isDark ? colors.text : FIGMA_COLORS.bluePrimary100;
  const textBody = isDark ? colors.text : FIGMA_COLORS.textBody;
  const textSecondary = isDark ? colors.textSecondary : FIGMA_COLORS.textSecondary;
  const lightBlueBg = isDark ? colors.surface : FIGMA_COLORS.bluePrimary10;
  const borderColor = isDark ? colors.border : FIGMA_COLORS.textDividers;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : FIGMA_COLORS.white, paddingTop: isLargeWeb ? 0 : insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent, 
          { 
            paddingBottom: insets.bottom + 32,
            width: '100%',
          },
          isLargeWeb && styles.scrollContentLargeWeb,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Breadcrumb Navigation - Hidden on large web */}
        {!isLargeWeb && (
        <View style={[styles.breadcrumbContainer, { borderBottomColor: borderColor }]}>
          <TouchableOpacity 
            onPress={onBack} 
            style={[styles.breadcrumbBack, isRTL && { transform: [{ scaleX: -1 }] }, isLargeWeb && styles.breadcrumbBackLargeWeb]}
          >
            <Ionicons name="chevron-back" size={isLargeWeb ? 40 : 20} color={textPrimary} />
          </TouchableOpacity>
          <View style={[styles.breadcrumbTextContainer, isLargeWeb && styles.breadcrumbTextContainerLargeWeb]}>
            <Text style={[styles.breadcrumbTitle, { color: textPrimary }, isLargeWeb && styles.breadcrumbTitleLargeWeb]}>
              {t('Project Creation')}
            </Text>
            <Text style={[styles.breadcrumbSubtitle, { color: textSecondary }, isLargeWeb && styles.breadcrumbSubtitleLargeWeb]}>
              {t('Manual Project Form')}
            </Text>
          </View>
        </View>
        )}

        {/* Title Section - Large Web */}
        {isLargeWeb && (
          <View style={styles.titleSectionLargeWeb}>
            <TouchableOpacity onPress={onBack} style={styles.titleBackButton}>
              <Ionicons 
                name={isRTL ? "chevron-forward" : "chevron-back"} 
                size={24} 
                color={textPrimary} 
              />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={[styles.titleMainText, isRTL && { textAlign: 'right' }]}>
                {t('Project Creation')}
              </Text>
              <Text style={[styles.titleSubtext, isRTL && { textAlign: 'right' }]}>
                {t('Manual Project Form')}
              </Text>
            </View>
          </View>
        )}

        {/* Project Creation Flow */}
        <View style={[styles.flowContainer, isLargeWeb && styles.flowContainerLargeWeb]}>
          <ProjectCreationFlow currentStep="CREATING" />
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: borderColor }, isLargeWeb && styles.dividerLargeWeb]} />

        {/* Form Header */}
        <View style={styles.formHeader}>
          <Text style={[styles.formTitle, { color: textPrimary }]}>
            {t('Project Details')}
          </Text>
          <Text style={[styles.formSubtitle, { color: textBody }]}>
            {t('Fill in the details below to create your project. Service providers will send bids once submitted.')}
          </Text>
        </View>

        {/* Service Category Selection - Dropdown */}
        <View style={[styles.section, { zIndex: 100 }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="grid-outline" size={14} color={FIGMA_COLORS.bluePrimary80} />
            <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.bluePrimary80 }]}>
              {t('Service Category')} *
            </Text>
          </View>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={[
                styles.selectButton,
                styles.editableInput,
                { 
                  backgroundColor: cardBg, 
                  borderColor: showCategoryPicker ? primaryBlue : borderColor,
                  borderWidth: showCategoryPicker ? 1.5 : 1,
                }
              ]}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text 
                style={[
                  styles.selectButtonText, 
                  { color: category ? textBody : textSecondary }
                ]}
              >
                {category || t('Select category')}
              </Text>
              <Ionicons 
                name={showCategoryPicker ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={showCategoryPicker ? primaryBlue : textSecondary} 
              />
            </TouchableOpacity>
            
            {/* Dropdown Options */}
            {showCategoryPicker && (
              <View style={[styles.dropdownList, { backgroundColor: cardBg, borderColor: borderColor }]}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {serviceCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.dropdownOption,
                        { borderBottomColor: borderColor },
                        selectedServiceId === cat.id && { backgroundColor: lightBlueBg },
                      ]}
                      onPress={() => {
                        setSelectedServiceId(cat.id);
                        setCategory(isRTL ? cat.nameAr : cat.nameEn);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Text style={[styles.dropdownOptionText, { color: textBody }]}>
                        {isRTL ? cat.nameAr : cat.nameEn}
                      </Text>
                      {selectedServiceId === cat.id && (
                        <Ionicons name="checkmark" size={18} color={primaryBlue} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={14} color={FIGMA_COLORS.bluePrimary80} />
            <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.bluePrimary80 }]}>
              {t('Project Description')} *
            </Text>
          </View>
          <View style={[styles.inputContainer, styles.editableInput, { backgroundColor: cardBg, borderColor: borderColor }]}>
            <TextInput
              style={[styles.textArea, { color: textBody, backgroundColor: cardBg }]}
              multiline
              numberOfLines={6}
              value={description}
              onChangeText={setDescription}
              placeholder={t('Describe your project needs in detail...')}
              placeholderTextColor={textSecondary}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Budget & Duration Row */}
        <View style={[styles.cardsRow, !isSmallScreen && styles.cardsRowWeb]}>
          {/* Budget Card */}
          <View style={[
            styles.statCard, 
            { 
              backgroundColor: cardBg, 
              borderColor: borderColor,
              flex: isSmallScreen ? 1 : undefined,
              width: isSmallScreen ? undefined : '48%',
            }
          ]}>
            <View style={styles.statCardHeader}>
              <Ionicons name="cash-outline" size={14} color={FIGMA_COLORS.bluePrimary80} />
              <Text style={[styles.statCardLabel, { color: FIGMA_COLORS.bluePrimary80 }]}>
                {t('Budget')} (SAR)
              </Text>
            </View>
            {budgetUnspecified ? (
              <Text style={[styles.statCardValue, { color: textSecondary }]}>
                {t('Unspecified')}
              </Text>
            ) : (
              <View style={[styles.budgetInputWrapper, { backgroundColor: lightBlueBg, borderColor: borderColor }]}>
                <TextInput
                  style={[styles.budgetInput, { color: textBody }]}
                  value={budget}
                  onChangeText={setBudget}
                  placeholder="0"
                  placeholderTextColor={textSecondary}
                  keyboardType="numeric"
                />
              </View>
            )}
            <TouchableOpacity
              onPress={() => setBudgetUnspecified(!budgetUnspecified)}
              style={styles.checkboxContainer}
            >
              <Ionicons
                name={budgetUnspecified ? 'checkbox' : 'checkbox-outline'}
                size={16}
                color={budgetUnspecified ? primaryBlue : textSecondary}
              />
              <Text style={[styles.checkboxText, { color: textSecondary }]}>
                {t('Unspecified')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bid Deadline Card */}
          <View style={[
            styles.statCard, 
            { 
              backgroundColor: cardBg, 
              borderColor: borderColor,
              flex: isSmallScreen ? 1 : undefined,
              width: isSmallScreen ? undefined : '48%',
            }
          ]}>
            <View style={styles.statCardHeader}>
              <Ionicons name="time-outline" size={14} color={FIGMA_COLORS.greenPrimary} />
              <Text style={[styles.statCardLabel, { color: FIGMA_COLORS.greenPrimary }]}>
                {t('Bid Deadline')}
              </Text>
            </View>
            {bidsCloseAt ? (
              <View style={styles.dateValueContainer}>
                <Text style={[styles.statCardValue, { color: textBody, flex: 1 }]} numberOfLines={1}>
                  {formatDateForDisplay(bidsCloseAt)}
                </Text>
                <TouchableOpacity onPress={clearBidDeadline}>
                  <Ionicons name="close-circle" size={18} color={colors.error || '#F44336'} />
                </TouchableOpacity>
              </View>
            ) : isWeb ? (
              // Web-specific date/time inputs
              <View style={styles.webDatePickerContainer}>
                <input
                  type="datetime-local"
                  style={{
                    flex: 1,
                    padding: 10,
                    fontSize: 14,
                    borderRadius: 6,
                    border: `1px solid ${borderColor}`,
                    backgroundColor: lightBlueBg,
                    color: textBody,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => {
                    if (e.target.value) {
                      const date = new Date(e.target.value);
                      setBidClosedDate(date);
                      setBidsCloseAt(formatDateForAPI(date));
                    }
                  }}
                />
              </View>
            ) : (
              <View style={styles.datePickerRow}>
                <TouchableOpacity style={[styles.miniDateButton, { backgroundColor: FIGMA_COLORS.greenLight }]} onPress={handlePickDate}>
                  <Ionicons name="calendar-outline" size={14} color={FIGMA_COLORS.greenPrimary} />
                  <Text style={[styles.miniDateText, { color: FIGMA_COLORS.greenPrimary }]}>
                    {t('Date')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.miniDateButton, { backgroundColor: FIGMA_COLORS.greenLight }]} onPress={handlePickTime}>
                  <Ionicons name="time-outline" size={14} color={FIGMA_COLORS.greenPrimary} />
                  <Text style={[styles.miniDateText, { color: FIGMA_COLORS.greenPrimary }]}>
                    {t('Time')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={14} color={FIGMA_COLORS.bluePrimary80} />
            <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.bluePrimary80 }]}>
              {t('Project Address')} ({t('Optional')})
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addressButton, styles.editableInput, { backgroundColor: cardBg, borderColor: borderColor }]}
            onPress={() => setShowMapPicker(true)}
          >
            <Ionicons name="location" size={18} color={primaryBlue} />
            <Text 
              style={[styles.addressText, { color: address ? textBody : textSecondary }]} 
              numberOfLines={1}
            >
              {address || t('Select location on map')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="images-outline" size={14} color={FIGMA_COLORS.bluePrimary80} />
            <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.bluePrimary80 }]}>
              {t('Photos')} ({photos.length}/5) ({t('Optional')})
            </Text>
          </View>
          <View style={styles.photosContainer}>
            {photos.map((uri, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={22} color={FIGMA_COLORS.white} />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity
                style={[styles.addPhotoButton, { borderColor: primaryBlue, backgroundColor: lightBlueBg }]}
                onPress={pickImages}
              >
                <Ionicons name="add" size={28} color={primaryBlue} />
                <Text style={[styles.addPhotoText, { color: primaryBlue }]}>{t('Add')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: primaryBlue },
            (isSubmitting || !description.trim() || !selectedServiceId) && styles.submitButtonDisabled
          ]}
          onPress={submitProject}
          disabled={isSubmitting || !description.trim() || !selectedServiceId}
        >
          {isSubmitting ? (
            <ActivityIndicator color={FIGMA_COLORS.white} size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              {technician ? t('Send Deal') : t('Submit Project')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: FIGMA_COLORS.purple10, borderColor: FIGMA_COLORS.purple100 }]}
          onPress={onBack}
        >
          <Text style={[styles.cancelButtonText, { color: FIGMA_COLORS.purple100 }]}>
            {t('Cancel')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
          <View style={[styles.loadingCard, { backgroundColor: cardBg }]}>
            <ActivityIndicator size="large" color={primaryBlue} />
            <Text style={[styles.loadingText, { color: textBody }]}>
              {t('Submitting project...')}
            </Text>
          </View>
        </View>
      )}
      <View style={{ height: 40 }} />
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
  scrollContent: {
    padding: 16,
  },
  scrollContentLargeWeb: {
    padding: 48,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  breadcrumbContainerLargeWeb: {
    paddingVertical: 32,
    gap: 56,
  },
  breadcrumbBack: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breadcrumbBackLargeWeb: {
    width: 40,
    height: 40,
  },
  breadcrumbTextContainer: {
    flex: 1,
  },
  breadcrumbTextContainerLargeWeb: {
    gap: 8,
  },
  breadcrumbTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  breadcrumbTitleLargeWeb: {
    fontSize: 34,
    fontWeight: '400',
  },
  breadcrumbSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },
  breadcrumbSubtitleLargeWeb: {
    fontSize: 16,
    marginTop: 0,
  },
  flowContainer: {
    paddingVertical: 12,
  },
  flowContainerLargeWeb: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  divider: {
    height: 0.5,
    marginVertical: 8,
  },
  dividerLargeWeb: {
    marginVertical: 0,
    marginTop: 0,
    marginBottom: 24,
  },
  formHeader: {
    paddingVertical: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  formSubtitle: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  editableInput: {
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
      },
      default: {},
    }),
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 100,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
  },
  selectButtonText: {
    fontSize: 14,
    flex: 1,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 200,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 0.5,
  },
  dropdownOptionText: {
    fontSize: 14,
    flex: 1,
  },
  inputContainer: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  textArea: {
    padding: 16,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  cardsRowWeb: {
    flexDirection: 'row',
  },
  statCard: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 0.5,
    minHeight: 100,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statCardLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statCardValue: {
    fontSize: 14,
  },
  statCardInput: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
  budgetInputWrapper: {
    borderRadius: 6,
    borderWidth: 1,
    marginVertical: 4,
  },
  budgetInput: {
    fontSize: 16,
    fontWeight: '600',
    padding: 10,
  },
  webDatePickerContainer: {
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  checkboxText: {
    fontSize: 11,
  },
  dateValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  miniDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 139, 62, 0.1)',
  },
  miniDateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    padding: 14,
    borderWidth: 0.5,
  },
  addressText: {
    fontSize: 14,
    flex: 1,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoWrapper: {
    width: 72,
    height: 72,
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
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 11,
  },
  addPhotoButton: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 10,
    marginTop: 2,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: FIGMA_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
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
    padding: 28,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
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
    color: FIGMA_COLORS.bluePrimary100,
    lineHeight: 42,
  },
  titleSubtext: {
    fontSize: 20,
    fontWeight: '300',
    color: FIGMA_COLORS.textSecondary,
    lineHeight: 20,
  },
});
