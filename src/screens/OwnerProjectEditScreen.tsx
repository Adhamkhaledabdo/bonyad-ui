import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

interface OwnerProjectEditScreenProps {
  projectId: number;
  onBack: () => void;
  onSuccess: () => void;
}

interface EditablePhase {
  id: number | null;
  phaseNumber: string;
  description: string;
  timeSpentDays: string;
  moneySpent: string;
}

export default function OwnerProjectEditScreen({ projectId, onBack, onSuccess }: OwnerProjectEditScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();

  // Custom popup hooks
  const { alertState, showError, showSuccess, showAlert, hideAlert } = useAlertPopup();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [address, setAddress] = useState('');
  const [needsVisit, setNeedsVisit] = useState(false);
  const [needsBooking, setNeedsBooking] = useState(false);
  const [phases, setPhases] = useState<EditablePhase[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Photo state
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]); // URLs from server
  const [newPhotos, setNewPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]); // New photos to upload
  const [showPhotoSlideshow, setShowPhotoSlideshow] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const slideshowScrollRef = useRef<ScrollView>(null);

  const ownerEditEndpoint = useMemo(
    () => buildApiUrl(API_ENDPOINTS.PROJECTS.OWNER_EDIT.replace(':id', String(projectId))),
    [projectId]
  );

  const loadProject = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await storage.getAuthToken();
      if (!token) {
        throw new Error(t('Please login again'));
      }

      const response = await fetch(ownerEditEndpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || t('Failed to load project'));
      }

      const data = await response.json();
      const project = data.project || {};

      setDescription(project.description ?? '');
      setBudget(project.budget != null ? String(project.budget) : '');
      setAddress(project.address ?? '');
      setNeedsVisit(!!project.needsVisit);
      setNeedsBooking(!!project.needsBooking);
      
      // Load existing photos (check both files and photos fields)
      const projectPhotos = project.files || project.photos || [];
      setExistingPhotos(projectPhotos);

      const normalizedPhases: EditablePhase[] = Array.isArray(data.phases)
        ? data.phases.map((phase: any, index: number) => ({
            id: phase.id ?? null,
            phaseNumber:
              phase.phaseNumber != null && phase.phaseNumber !== ''
                ? String(phase.phaseNumber)
                : String(index + 1),
            description: phase.description ?? '',
            timeSpentDays:
              phase.timeSpentDays != null && phase.timeSpentDays !== ''
                ? String(phase.timeSpentDays)
                : '',
            moneySpent:
              phase.moneySpent != null && phase.moneySpent !== ''
                ? String(phase.moneySpent)
                : '',
          }))
        : [];

      setPhases(normalizedPhases);
    } catch (err: any) {
      console.error('❌ [OwnerProjectEditScreen] Failed to load project:', err);
      setError(err.message || t('Failed to load project'));
    } finally {
      setIsLoading(false);
    }
  }, [ownerEditEndpoint, t]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleAddPhase = () => {
    setPhases((prev) => [
      ...prev,
      {
        id: null,
        phaseNumber: String(prev.length + 1),
        description: '',
        timeSpentDays: '',
        moneySpent: '',
      },
    ]);
  };

  const handleRemovePhase = (index: number) => {
    setPhases((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((phase, idx) => ({
          ...phase,
          phaseNumber: String(idx + 1),
        }))
    );
  };

  const handlePhaseChange = (index: number, key: keyof EditablePhase, value: string) => {
    setPhases((prev) =>
      prev.map((phase, idx) => (idx === index ? { ...phase, [key]: value } : phase))
    );
  };
  
  // Photo handling
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showError(t('Please grant camera roll permissions'), t('Permission Required'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const totalPhotos = existingPhotos.length + newPhotos.length + result.assets.length;
      if (totalPhotos > 5) {
        showError(t('Maximum 5 photos allowed'), t('Error'));
        return;
      }
      setNewPhotos([...newPhotos, ...result.assets]);
    }
  };
  
  const removeExistingPhoto = (index: number) => {
    setExistingPhotos(existingPhotos.filter((_, i) => i !== index));
  };
  
  const removeNewPhoto = (index: number) => {
    setNewPhotos(newPhotos.filter((_, i) => i !== index));
  };
  
  const handleViewPhoto = (index: number) => {
    setCurrentPhotoIndex(index);
    setShowPhotoSlideshow(true);
    // Scroll to the correct photo after modal opens
    setTimeout(() => {
      if (slideshowScrollRef.current) {
        const screenWidth = Dimensions.get('window').width;
        slideshowScrollRef.current.scrollTo({
          x: index * screenWidth,
          animated: false,
        });
      }
    }, 100);
  };
  
  const getAllPhotos = () => {
    return [...existingPhotos, ...newPhotos.map(p => p.uri)];
  };
  
  const handleNextPhoto = () => {
    const allPhotos = getAllPhotos();
    if (currentPhotoIndex < allPhotos.length - 1) {
      const nextIndex = currentPhotoIndex + 1;
      const screenWidth = Dimensions.get('window').width;
      setCurrentPhotoIndex(nextIndex);
      if (slideshowScrollRef.current) {
        slideshowScrollRef.current.scrollTo({
          x: nextIndex * screenWidth,
          animated: true,
        });
      }
    }
  };
  
  const handlePreviousPhoto = () => {
    if (currentPhotoIndex > 0) {
      const prevIndex = currentPhotoIndex - 1;
      const screenWidth = Dimensions.get('window').width;
      setCurrentPhotoIndex(prevIndex);
      if (slideshowScrollRef.current) {
        slideshowScrollRef.current.scrollTo({
          x: prevIndex * screenWidth,
          animated: true,
        });
      }
    }
  };
  
  const handleSlideshowScroll = (event: any) => {
    const screenWidth = Dimensions.get('window').width;
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    const allPhotos = getAllPhotos();
    if (index !== currentPhotoIndex && index >= 0 && index < allPhotos.length) {
      setCurrentPhotoIndex(index);
    }
  };

  const validateForm = () => {
    if (!description.trim()) {
      showError(t('Please enter a project description'), t('Error'));
      return false;
    }
    if (!budget.trim()) {
      showError(t('Please enter budget'), t('Error'));
      return false;
    }
    const parsedBudget = Number(budget.replace(/,/g, ''));
    if (Number.isNaN(parsedBudget) || parsedBudget <= 0) {
      showError(t('Please enter a valid budget amount'), t('Error'));
      return false;
    }
    for (let i = 0; i < phases.length; i += 1) {
      const phase = phases[i];
      if (!phase.description.trim()) {
        showError(t('Phase Description') + ` #${i + 1}`, t('Error'));
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const token = await storage.getAuthToken();
      if (!token) {
        throw new Error(t('Please login again'));
      }

      const parsedBudget = Number(budget.replace(/,/g, ''));
      
      // If there are new photos, use FormData; otherwise use JSON
      const hasNewPhotos = newPhotos.length > 0;
      
      if (hasNewPhotos) {
        // Use FormData for photo upload
        const formData = new FormData();
        
        formData.append('description', description.trim());
        formData.append('budget', parsedBudget.toString());
        formData.append('address', address.trim());
        formData.append('needsVisit', needsVisit.toString());
        formData.append('needsBooking', needsBooking.toString());
        
        // Add phases as JSON string
        const phasesPayload = phases.map((phase, index) => {
          const phaseNumber = parseInt(phase.phaseNumber || String(index + 1), 10);
          const timeSpent = phase.timeSpentDays.trim() === '' ? null : parseInt(phase.timeSpentDays, 10);
          const moneySpent = phase.moneySpent.trim() === '' ? null : parseFloat(phase.moneySpent);

          const phasePayload: any = {
            id: phase.id ?? null,
            description: phase.description.trim(),
            phaseNumber: Number.isNaN(phaseNumber) ? index + 1 : phaseNumber,
          };

          if (timeSpent !== null && !Number.isNaN(timeSpent)) {
            phasePayload.timeSpentDays = timeSpent;
          }

          if (moneySpent !== null && !Number.isNaN(moneySpent)) {
            phasePayload.moneySpent = moneySpent;
          }

          return phasePayload;
        });
        formData.append('phases', JSON.stringify(phasesPayload));
        
        // Add existing photos (to keep them)
        existingPhotos.forEach((url, index) => {
          formData.append('existingPhotos', url);
        });
        
        // Add new photos
        newPhotos.forEach((asset, index) => {
          const filename = asset.uri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename || '');
          const type = match ? `image/${match[1]}` : 'image/jpeg';

          formData.append('images', {
            uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
            name: `photo_${index}.jpg`,
            type,
          } as any);
        });

        const response = await fetch(ownerEditEndpoint, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || t('Failed to save project'));
        }

        await response.json();
      } else {
        // Use JSON for text-only updates
        const payload: any = {
          description: description.trim(),
          budget: parsedBudget,
          address: address.trim(),
          needsVisit,
          needsBooking,
          phases: phases.map((phase, index) => {
            const phaseNumber = parseInt(phase.phaseNumber || String(index + 1), 10);
            const timeSpent = phase.timeSpentDays.trim() === '' ? null : parseInt(phase.timeSpentDays, 10);
            const moneySpent = phase.moneySpent.trim() === '' ? null : parseFloat(phase.moneySpent);

            const phasePayload: any = {
              id: phase.id ?? null,
              description: phase.description.trim(),
              phaseNumber: Number.isNaN(phaseNumber) ? index + 1 : phaseNumber,
            };

            if (timeSpent !== null && !Number.isNaN(timeSpent)) {
              phasePayload.timeSpentDays = timeSpent;
            }

            if (moneySpent !== null && !Number.isNaN(moneySpent)) {
              phasePayload.moneySpent = moneySpent;
            }

            return phasePayload;
          }),
        };
        
        // Include existing photos to keep them
        if (existingPhotos.length > 0) {
          payload.existingPhotos = existingPhotos;
        }

        const response = await fetch(ownerEditEndpoint, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || t('Failed to save project'));
        }

        await response.json();
      }

      showAlert(
        t('Success'),
        t('Project updated successfully'),
        'success',
        [
          {
            text: t('OK'),
            onPress: () => {
              onSuccess();
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('❌ [OwnerProjectEditScreen] Failed to save project:', err);
      showError(err.message || t('Failed to save project'), t('Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Loading project...')}</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.loadingContainer}>
          <Ionicons name="warning-outline" size={40} color={colors.error} />
          <Text style={[styles.loadingText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { borderColor: colors.primary }]} onPress={loadProject}>
            <Text style={[styles.retryButtonText, { color: colors.primary }]}>{t('Retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
      <ScrollView
        contentContainerStyle={[styles.formContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('Edit Project')}</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(16) }]}>{t('Project Description')}</Text>
          <TextInput
            style={[styles.input, styles.multilineInput, { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border }]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('Describe your project needs')}
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(16) }]}>{t('Budget (SAR)')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border }]}
            value={budget}
            onChangeText={setBudget}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(16) }]}>{t('Project Address')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border }]}
            value={address}
            onChangeText={setAddress}
            placeholder={t('Enter address')}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>{t('Needs House Visit')}</Text>
          <Switch
            value={needsVisit}
            onValueChange={setNeedsVisit}
            trackColor={{ false: colors.border, true: colors.primary + '40' }}
            thumbColor={needsVisit ? colors.primary : colors.cardBackground}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>{t('Needs Booking')}</Text>
          <Switch
            value={needsBooking}
            onValueChange={setNeedsBooking}
            trackColor={{ false: colors.border, true: colors.primary + '40' }}
            thumbColor={needsBooking ? colors.primary : colors.cardBackground}
          />
        </View>

        {/* Photos Section */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('Project Photos')} ({existingPhotos.length + newPhotos.length}/5)
          </Text>
          
          <View style={styles.photosContainer}>
            {/* Existing photos */}
            {existingPhotos.map((uri, index) => (
              <View key={`existing-${index}`} style={styles.photoWrapper}>
                <TouchableOpacity
                  onPress={() => handleViewPhoto(index)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => removeExistingPhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.photoBadge}>
                  <Text style={styles.photoBadgeText}>{t('Existing')}</Text>
                </View>
              </View>
            ))}
            
            {/* New photos */}
            {newPhotos.map((asset, index) => (
              <View key={`new-${index}`} style={styles.photoWrapper}>
                <TouchableOpacity
                  onPress={() => handleViewPhoto(existingPhotos.length + index)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: asset.uri }} style={styles.photo} resizeMode="cover" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => removeNewPhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={[styles.photoBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.photoBadgeText}>{t('New')}</Text>
                </View>
              </View>
            ))}
            
            {/* Add photo button */}
            {existingPhotos.length + newPhotos.length < 5 && (
              <TouchableOpacity
                style={[styles.addPhotoButton, { borderColor: colors.primary }]}
                onPress={pickImages}
              >
                <Ionicons name="add" size={40} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.sectionDivider} />

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(18) }]}>{t('Project Phases')}</Text>
          <TouchableOpacity style={[styles.addPhaseButton, { backgroundColor: colors.primary }]} onPress={handleAddPhase}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addPhaseButtonText}>{t('Add Phase')}</Text>
          </TouchableOpacity>
        </View>

        {phases.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('No phases planned yet. Click "Add Phase" to get started.')}
          </Text>
        )}

        {phases.map((phase, index) => (
          <View
            key={`${phase.id ?? 'new'}-${index}`}
            style={[styles.phaseCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          >
            <View style={styles.phaseHeader}>
              <Text style={[styles.phaseTitle, { color: colors.text, fontSize: scaledSize(16) }]}>
                {t('Phase')} {index + 1}
              </Text>
              <TouchableOpacity onPress={() => handleRemovePhase(index)}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>{t('Phase Number')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={phase.phaseNumber}
                onChangeText={(value) => handlePhaseChange(index, 'phaseNumber', value)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>{t('Phase Description')}</Text>
              <TextInput
                style={[styles.input, styles.multilineInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={phase.description}
                onChangeText={(value) => handlePhaseChange(index, 'description', value)}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.phaseRow}>
              <View style={[styles.formGroup, styles.phaseColumn]}>
                <Text style={[styles.label, { color: colors.text }]}>{t('Duration (days)')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={phase.timeSpentDays}
                  onChangeText={(value) => handlePhaseChange(index, 'timeSpentDays', value)}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, styles.phaseColumn]}>
                <Text style={[styles.label, { color: colors.text }]}>{t('Cost (SAR)')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={phase.moneySpent}
                  onChangeText={(value) => handlePhaseChange(index, 'moneySpent', value)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        ))}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.primary }]}
            onPress={onBack}
            disabled={isSaving}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>{t('Cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{t('Save Changes')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Photo Slideshow Modal */}
      <Modal
        visible={showPhotoSlideshow}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPhotoSlideshow(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.slideshowContainer}>
          <TouchableOpacity
            style={styles.slideshowCloseButton}
            onPress={() => setShowPhotoSlideshow(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          {getAllPhotos().length > 1 && (
            <View style={styles.slideshowCounter}>
              <Text style={styles.slideshowCounterText}>
                {currentPhotoIndex + 1} / {getAllPhotos().length}
              </Text>
            </View>
          )}
          
          <View style={styles.slideshowImageWrapper}>
            <ScrollView
              ref={slideshowScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleSlideshowScroll}
              scrollEventThrottle={200}
              style={styles.slideshowScrollView}
              contentContainerStyle={styles.slideshowScrollContent}
              removeClippedSubviews={false}
              decelerationRate="fast"
              bounces={false}
            >
              {getAllPhotos().map((photo, index) => {
                const screenWidth = Dimensions.get('window').width;
                const screenHeight = Dimensions.get('window').height;
                return (
                  <View
                    key={index}
                    style={[
                      styles.slideshowImageContainer,
                      {
                        width: screenWidth,
                        height: screenHeight,
                      }
                    ]}
                  >
                    <Image
                      source={{ uri: photo }}
                      style={styles.slideshowImage}
                      resizeMode="contain"
                    />
                  </View>
                );
              })}
            </ScrollView>
          </View>
          
          {getAllPhotos().length > 1 && (
            <>
              <TouchableOpacity
                style={[
                  styles.slideshowNavButton,
                  styles.slideshowNavButtonLeft,
                  currentPhotoIndex === 0 && styles.slideshowNavButtonDisabled,
                ]}
                onPress={handlePreviousPhoto}
                disabled={currentPhotoIndex === 0}
              >
                <Ionicons
                  name="chevron-back"
                  size={32}
                  color={currentPhotoIndex === 0 ? 'rgba(255, 255, 255, 0.3)' : '#fff'}
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.slideshowNavButton,
                  styles.slideshowNavButtonRight,
                  currentPhotoIndex === getAllPhotos().length - 1 && styles.slideshowNavButtonDisabled,
                ]}
                onPress={handleNextPhoto}
                disabled={currentPhotoIndex === getAllPhotos().length - 1}
              >
                <Ionicons
                  name="chevron-forward"
                  size={32}
                  color={currentPhotoIndex === getAllPhotos().length - 1 ? 'rgba(255, 255, 255, 0.3)' : '#fff'}
                />
              </TouchableOpacity>
              
              <View style={styles.slideshowDots}>
                {getAllPhotos().map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      const screenWidth = Dimensions.get('window').width;
                      setCurrentPhotoIndex(index);
                      if (slideshowScrollRef.current) {
                        slideshowScrollRef.current.scrollTo({
                          x: index * screenWidth,
                          animated: true,
                        });
                      }
                    }}
                    style={[
                      styles.slideshowDot,
                      index === currentPhotoIndex && styles.slideshowDotActive,
                    ]}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </Modal>
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        {renderContent()}
      </KeyboardAvoidingView>
      
      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 120,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionDivider: {
    height: 1,
    marginVertical: 24,
    opacity: 0.3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  addPhaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  addPhaseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    marginBottom: 16,
  },
  phaseCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  phaseRow: {
    flexDirection: 'row',
    gap: 12,
  },
  phaseColumn: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  photoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF0000',
    borderRadius: 12,
    padding: 2,
  },
  photoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  photoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Slideshow styles
  slideshowContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideshowCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  slideshowCounter: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  slideshowCounterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  slideshowImageWrapper: {
    flex: 1,
    width: '100%',
  },
  slideshowScrollView: {
    flex: 1,
  },
  slideshowScrollContent: {
    alignItems: 'center',
  },
  slideshowImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideshowImage: {
    width: '100%',
    height: '100%',
  },
  slideshowNavButton: {
    position: 'absolute',
    top: '50%',
    zIndex: 10,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
  },
  slideshowNavButtonLeft: {
    left: 20,
  },
  slideshowNavButtonRight: {
    right: 20,
  },
  slideshowNavButtonDisabled: {
    opacity: 0.3,
  },
  slideshowDots: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 40 : 80,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  slideshowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  slideshowDotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
});
