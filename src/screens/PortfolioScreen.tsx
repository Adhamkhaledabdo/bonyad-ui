import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { storage } from '../utils/storage';
import { API_BASE_URL, API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import * as ImagePicker from 'expo-image-picker';
import { showAlert, showError, showSuccess } from '../utils/alert';
import { uploadPortfolioPhoto, addPortfolioProject } from '../services/PortfolioService';

interface PortfolioScreenProps {
  userId: string | number;
  onBack: () => void;
}

interface PortfolioItem {
  id: number;
  title: string;
  description: string;
  images: string[];
  date: string;
}

export default function PortfolioScreen({ userId, onBack }: PortfolioScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchPortfolio();
  }, [userId]);

  const fetchPortfolio = async () => {
    setIsLoading(true);
    try {
      const token = await storage.getAuthToken();

      const response = await fetch(
        buildApiUrlWithParams(API_ENDPOINTS.PORTFOLIO.BY_USER, { userId }),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📥 [PortfolioScreen] API Response:', data);
        
        // Handle different response structures
        if (Array.isArray(data)) {
          // Direct array response
          setPortfolioItems(data);
        } else if (data && data.pastProjects && Array.isArray(data.pastProjects)) {
          // Object with pastProjects array
          setPortfolioItems(data.pastProjects);
        } else if (data && Array.isArray(data.projects)) {
          // Object with projects array
          setPortfolioItems(data.projects);
        } else {
          // Empty array if structure is unexpected
          console.warn('⚠️ [PortfolioScreen] Unexpected portfolio data structure:', data);
          setPortfolioItems([]);
        }
      } else {
        console.error('Failed to fetch portfolio');
        setPortfolioItems([]);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        showError('Please grant permission to access your photos', 'Permission Required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        setSelectedImages([...selectedImages, ...result.assets]);
      }
    } catch (error) {
      console.error('Error selecting images:', error);
    }
  };

  const handleAddPortfolioItem = async () => {
    if (!title.trim() || selectedImages.length === 0) {
      showError('Please add a title and at least one image');
      return;
    }

    setIsAdding(true);
    try {
      // Step 1: Upload all photos first and get their URLs
      console.log('📤 [PortfolioScreen] Uploading photos...');
      const photoUrls: string[] = [];
      
      for (const imageAsset of selectedImages) {
        try {
          const photoUrl = await uploadPortfolioPhoto(imageAsset);
          photoUrls.push(photoUrl);
          console.log('✅ [PortfolioScreen] Photo uploaded:', photoUrl);
        } catch (uploadError) {
          console.error('❌ [PortfolioScreen] Failed to upload photo:', uploadError);
          throw new Error('Failed to upload one or more photos');
        }
      }
      
      // Step 2: Create the project with the photo URLs
      console.log('📤 [PortfolioScreen] Creating project with photos:', photoUrls.length);
      
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      await addPortfolioProject({
        title: title.trim(),
        description: description.trim() || title.trim(), // Use title as description if empty
        startDate: today,
        endDate: today,
        photos: photoUrls,
        isPublic: true,
      });

      showSuccess('Portfolio item added successfully');
      setTimeout(() => {
        setShowAddModal(false);
        setTitle('');
        setDescription('');
        setSelectedImages([]);
        fetchPortfolio();
      }, 1000);
    } catch (error: any) {
      console.error('Error adding portfolio item:', error);
      showError(error.message || 'Failed to add portfolio item');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
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
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(18) }]}>{t('My Portfolio')}</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {portfolioItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase" size={80} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: scaledSize(18) }]}>
              {t('No portfolio items yet')}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
              {t('Add your work to showcase your skills')}
            </Text>
          </View>
        ) : (
          <View style={styles.content}>
            {Array.isArray(portfolioItems) ? portfolioItems.map((item) => (
              <Card key={item.id} style={[styles.portfolioCard, { backgroundColor: colors.cardBackground }]}>
                <Card.Content>
                  <Text style={[styles.portfolioTitle, { color: colors.text, fontSize: scaledSize(16) }]}>{item.title}</Text>
                  {item.description && (
                    <Text style={[styles.portfolioDescription, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
                      {item.description}
                    </Text>
                  )}
                  {item.images && item.images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
                      {item.images.map((image, index) => (
                        <Image
                          key={index}
                          source={{ uri: image.startsWith('http') ? image : `${API_BASE_URL.replace('/api', '')}${image}` }}
                          style={styles.portfolioImage}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  )}
                  {item.date && (
                    <Text style={[styles.portfolioDate, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                      {new Date(item.date).toLocaleDateString()}
                    </Text>
                  )}
                </Card.Content>
              </Card>
            )) : null}
          </View>
        )}
      </ScrollView>

      {/* Add Portfolio Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: scaledSize(18) }]}>{t('Add Portfolio Item')}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={title}
                onChangeText={setTitle}
                placeholder={t('Title')}
                placeholderTextColor={colors.textSecondary}
              />

              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('Description')}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.addImageButton, { borderColor: colors.primary }]}
                onPress={handleSelectImages}
              >
                <Ionicons name="image" size={24} color={colors.primary} />
                <Text style={[styles.addImageText, { color: colors.primary }]}>
                  {t('Add Images')}
                </Text>
              </TouchableOpacity>

              {selectedImages.length > 0 && (
                <View style={styles.selectedImagesContainer}>
                  {selectedImages.map((imageAsset, index) => (
                    <View key={index} style={styles.imagePreviewContainer}>
                      <Image source={{ uri: imageAsset.uri }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleDeleteImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleAddPortfolioItem}
                disabled={isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>{t('Save')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Card>
        </View>
      </Modal>
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  portfolioCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  portfolioTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  portfolioDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  imagesContainer: {
    marginVertical: 12,
  },
  portfolioImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginRight: 12,
  },
  portfolioDate: {
    fontSize: 12,
    marginTop: 8,
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 16,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderStyle: 'dashed',
    gap: 8,
  },
  addImageText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
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

