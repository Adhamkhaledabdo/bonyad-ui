import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getTechnicianPortfolio,
  TechnicianPortfolio,
  PortfolioProject,
} from '../services/TechnicianService';
import {
  uploadPortfolioPhoto,
  addPortfolioProject,
  updatePortfolioProject,
  deletePortfolioProject,
  PortfolioProjectData,
  checkHasPortfolio,
  createPortfolio,
  generatePortfolioPDF,
  getMyPDFInfo,
  getQRCodeUrl,
  PortfolioPDFInfo,
  GeneratePDFOptions,
} from '../services/PortfolioService';
import ColorPicker from './ColorPicker';
import AlertPopup, { useAlertPopup } from './AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from './ConfirmationPopup';
import { getUserProfile } from '../services/ProfileService';

interface PortfolioManagementProps {
  technicianId: number;
  isOwnProfile?: boolean; // If true, user can edit their own portfolio
  onBack?: () => void; // Optional back button handler
}

export default function PortfolioManagement({
  technicianId,
  isOwnProfile = false,
  onBack,
}: PortfolioManagementProps) {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const riyalLogo = theme === 'dark'
    ? require('../../assets/saudi_riyal_logo_dark.svg')
    : require('../../assets/saudi_riyal_logo.svg');
  
  // Responsive state
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  const shouldRenderMobile = Platform.OS !== 'web' || !IS_LARGE_WEB;
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);
  
  const [portfolio, setPortfolio] = useState<TechnicianPortfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false); // Unified modal for add/edit
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [projectValue, setProjectValue] = useState('');
  const [clientName, setClientName] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<(ImagePicker.ImagePickerAsset | string)[]>([]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // Custom popup hooks
  const { alertState, showSuccess, showError, showInfo, hideAlert } = useAlertPopup();
  const { confirmState, showConfirmation, showDeleteConfirmation, hideConfirmation } = useConfirmationPopup();
  
  // PDF and QR Code state
  const [pdfInfo, setPdfInfo] = useState<PortfolioPDFInfo | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showPDFOptionsModal, setShowPDFOptionsModal] = useState(false);
  const [pdfOptions, setPdfOptions] = useState<GeneratePDFOptions>({
    regenerate: false,
    companyName: '',
    preferredStyle: '',
    headerColor: '#0080E0',
    textColor: '#2C3E50',
    backgroundColor: '#F8F9FA',
  });
  
  // Photo Slideshow state
  const [showPhotoSlideshow, setShowPhotoSlideshow] = useState(false);
  const [slideshowPhotos, setSlideshowPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const slideshowScrollRef = useRef<ScrollView>(null);
  
  // Helper function to normalize image URLs
  const normalizeImageUrl = (url: string | undefined | null): string => {
    if (!url) return '';
    // If already absolute URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If starts with /upload or /uploads, prepend base URL
    if (url.startsWith('/upload')) {
      return `https://www.bonyad-hub.com${url}`;
    }
    // If starts with /, prepend base URL
    if (url.startsWith('/')) {
      return `https://www.bonyad-hub.com${url}`;
    }
    // Return as is if it doesn't match patterns
    return url;
  };
  
  useEffect(() => {
    loadPortfolio();
    if (isOwnProfile) {
      loadPDFInfo();
      loadUserProfile();
    }
  }, [technicianId, isOwnProfile]);
  
  const loadUserProfile = async () => {
    try {
      const profile = await getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('❌ [PortfolioManagement] Error loading user profile:', error);
    }
  };
  
  const loadPDFInfo = async () => {
    try {
      const info = await getMyPDFInfo();
      setPdfInfo(info);
    } catch (error) {
      console.error('❌ [PortfolioManagement] Error loading PDF info:', error);
      setPdfInfo(null);
    }
  };
  
  const loadPortfolio = async () => {
    setIsLoading(true);
    try {
      const portfolioData = await getTechnicianPortfolio(technicianId);
      setPortfolio(portfolioData);
    } catch (err: any) {
      console.error('❌ [PortfolioManagement] Error loading portfolio:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelectImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        showError(t('Please grant permission to access your photos'), t('Permission Required'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets) {
        // Keep track of ImagePicker assets (not just URIs) for upload
        const currentCount = selectedPhotos.length;
        const newCount = currentCount + result.assets.length;
        if (newCount > 5) {
          showError(t('Maximum 5 photos allowed'), t('Error'));
          const remainingSlots = 5 - currentCount;
          if (remainingSlots > 0) {
            setSelectedPhotos([...selectedPhotos, ...result.assets.slice(0, remainingSlots)]);
          }
        } else {
          setSelectedPhotos([...selectedPhotos, ...result.assets]);
        }
      }
    } catch (error) {
      console.error('❌ [PortfolioManagement] Error selecting images:', error);
    }
  };
  
  const handleRemoveImage = (index: number) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
  };
  
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setProjectValue('');
    setClientName('');
    setStartDate(null);
    setEndDate(null);
    setIsPublic(true);
    setSelectedPhotos([]);
    setEditingProject(null);
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
  };
  
  const handleAddProject = () => {
    resetForm();
    setEditingProject(null);
    setShowProjectModal(true);
  };
  
  const handleEditProject = (project: PortfolioProject) => {
    setEditingProject(project);
    setTitle(project.title);
    setDescription(project.description || '');
    setLocation(project.location || '');
    setProjectValue(project.projectValue?.toString() || '');
    setClientName((project as any).clientName || '');
    setStartDate((project as any).startDate ? new Date((project as any).startDate) : null);
    setEndDate((project as any).endDate ? new Date((project as any).endDate) : null);
    setIsPublic((project as any).isPublic !== false);
    // Load existing photos/files as URL strings so they can be edited/removed
    // Check both 'photos' and 'files' fields (API may use either)
    // Normalize URLs to ensure they're absolute
    const existingPhotos = (project.photos && project.photos.length > 0)
      ? project.photos.map(photo => normalizeImageUrl(photo))
      : (project.files && project.files.length > 0)
      ? project.files.map(file => normalizeImageUrl(file))
      : [];
    setSelectedPhotos(existingPhotos);
    setShowProjectModal(true);
  };
  
  const handleSaveProject = async () => {
    if (!title.trim()) {
      showError(t('Please enter a title'), t('Error'));
      return;
    }
    
    if (!description.trim()) {
      showError(t('Please enter a description'), t('Error'));
      return;
    }
    
    if (endDate && startDate && endDate < startDate) {
      showError(t('End date must be after start date'), t('Error'));
      return;
    }
    
    setIsSaving(true);
    try {
      // Upload photos first if there are new photos selected
      let photoURLs: string[] = [];
      if (selectedPhotos.length > 0) {
        console.log('📤 [PortfolioManagement] Uploading photos...');
        for (const photo of selectedPhotos) {
          // Check if it's already a URL (from existing project) or needs upload
          if (typeof photo === 'string') {
            // It's already a URL string
            photoURLs.push(photo);
          } else if (photo && typeof photo === 'object' && 'uri' in photo) {
            // It's a new ImagePicker asset, upload it
            const url = await uploadPortfolioPhoto(photo as ImagePicker.ImagePickerAsset);
            photoURLs.push(url);
          }
        }
        console.log('✅ [PortfolioManagement] Photos uploaded:', photoURLs.length);
      }
      
      // Format dates
      const formatDate = (date: Date | null): string | undefined => {
        if (!date) return undefined;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // Create project data
      const projectData: PortfolioProjectData = {
        title: title.trim(),
        description: description.trim(),
        photos: photoURLs.length > 0 ? photoURLs : undefined,
        isPublic: isPublic,
      };
      
      // Add optional fields
      if (location.trim()) {
        projectData.location = location.trim();
      }
      if (projectValue && parseFloat(projectValue) > 0) {
        projectData.projectValue = parseFloat(projectValue);
      }
      if (clientName.trim()) {
        projectData.clientName = clientName.trim();
      }
      if (startDate) {
        projectData.startDate = formatDate(startDate);
      }
      if (endDate) {
        projectData.endDate = formatDate(endDate);
      }
      
      // Add or update project
      if (editingProject) {
        await updatePortfolioProject(editingProject.id, projectData);
      } else {
        // Check if portfolio exists before adding first project
        const hasPortfolio = await checkHasPortfolio();
        if (!hasPortfolio) {
          console.log('📤 [PortfolioManagement] Portfolio does not exist, creating it first...');
          await createPortfolio();
          console.log('✅ [PortfolioManagement] Portfolio created successfully');
        }
        // Now add the project
        await addPortfolioProject(projectData);
      }
      
      setShowProjectModal(false);
      resetForm();
      loadPortfolio();

      const successMessage = editingProject
        ? t('Project updated successfully')
        : t('Project added successfully');

      showSuccess(successMessage, t('Success'));
    } catch (err: any) {
      console.error('❌ [PortfolioManagement] Error saving project:', err);
      showError(err.message || t('Failed to save project'), t('Error'));
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleGeneratePDF = async (forceRegenerate: boolean = false) => {
    setIsGeneratingPDF(true);
    try {
      // If PDF already exists, set regenerate to true
      const shouldRegenerate = forceRegenerate || (pdfInfo !== null);
      
      // If regenerating and PDF info exists, use existing settings as defaults if not specified
      const companyName = pdfOptions.companyName?.trim() || (pdfInfo?.companyName || null);
      const preferredStyle = pdfOptions.preferredStyle?.trim() || null; // Empty = AI decides
      const headerColor = pdfOptions.headerColor || null;
      const textColor = pdfOptions.textColor || null;
      const backgroundColor = pdfOptions.backgroundColor || null;
      
      // Prepare options - convert empty strings to undefined for AI detection
      const options: GeneratePDFOptions = {
        regenerate: shouldRegenerate, // Set to true if PDF exists or forceRegenerate is true
        companyName: companyName || undefined,
        preferredStyle: preferredStyle || undefined, // Empty = AI decides
        headerColor: headerColor || undefined,
        textColor: textColor || undefined,
        backgroundColor: backgroundColor || undefined,
      };
      
      console.log('📄 [PortfolioManagement] Generating PDF with options:', {
        regenerate: shouldRegenerate,
        companyName: options.companyName,
        preferredStyle: options.preferredStyle || '(AI will decide)',
        headerColor: options.headerColor,
        textColor: options.textColor,
        backgroundColor: options.backgroundColor,
      });
      
      const info = await generatePortfolioPDF(options);
      setPdfInfo(info);
      setShowPDFOptionsModal(false);
      setShowPDFModal(true);
      showSuccess(
        shouldRegenerate ? t('PDF regenerated successfully!') : t('PDF generated successfully!'),
        t('Success')
      );
    } catch (error: any) {
      console.error('❌ [PortfolioManagement] Error generating PDF:', error);
      showError(error.message || t('Failed to generate PDF'), t('Error'));
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  
  const handleDownloadPDF = () => {
    if (pdfInfo?.publicUrl) {
      if (Platform.OS === 'web') {
        window.open(pdfInfo.publicUrl, '_blank');
      } else {
        // For mobile, you might want to use Linking or FileSystem
        showInfo(t('PDF download will open in browser'), t('Info'));
      }
    }
  };
  
  const handleSharePDF = () => {
    if (pdfInfo?.publicUrl) {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          navigator.share({
            title: t('My Portfolio'),
            text: t('Check out my portfolio'),
            url: pdfInfo.publicUrl,
          });
        } else {
          // Fallback: copy to clipboard
          navigator.clipboard.writeText(pdfInfo.publicUrl);
          showSuccess(t('PDF link copied to clipboard'), t('Success'));
        }
      } else {
        showInfo(t('Share functionality coming soon'), t('Info'));
      }
    }
  };
  
  // Photo Slideshow functions
  const handleNextPhoto = () => {
    if (currentPhotoIndex < slideshowPhotos.length - 1) {
      const nextIndex = currentPhotoIndex + 1;
      setCurrentPhotoIndex(nextIndex);
      // Scroll to next photo
      if (slideshowScrollRef.current) {
        slideshowScrollRef.current.scrollTo({
          x: nextIndex * Dimensions.get('window').width,
          animated: true,
        });
      }
    }
  };
  
  const handlePreviousPhoto = () => {
    if (currentPhotoIndex > 0) {
      const prevIndex = currentPhotoIndex - 1;
      setCurrentPhotoIndex(prevIndex);
      // Scroll to previous photo
      if (slideshowScrollRef.current) {
        slideshowScrollRef.current.scrollTo({
          x: prevIndex * Dimensions.get('window').width,
          animated: true,
        });
      }
    }
  };
  
  const handleCloseSlideshow = () => {
    setShowPhotoSlideshow(false);
    setCurrentPhotoIndex(0);
  };
  
  // Scroll to current photo when slideshow opens
  useEffect(() => {
    if (showPhotoSlideshow && slideshowScrollRef.current) {
      setTimeout(() => {
        slideshowScrollRef.current?.scrollTo({
          x: currentPhotoIndex * Dimensions.get('window').width,
          animated: false,
        });
      }, 100);
    }
  }, [showPhotoSlideshow, currentPhotoIndex]);
  
  const handleSlideshowScroll = (event: any) => {
    const screenWidth = Dimensions.get('window').width;
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (index !== currentPhotoIndex && index >= 0 && index < slideshowPhotos.length) {
      setCurrentPhotoIndex(index);
    }
  };
  
  const handleDeleteProject = (project: PortfolioProject) => {
    showDeleteConfirmation(
      t('Delete Project'),
      t('Are you sure you want to delete this project? This action cannot be undone.'),
      async () => {
        try {
          await deletePortfolioProject(project.id);
          loadPortfolio();
          showSuccess(t('Project deleted successfully'), t('Success'));
        } catch (err: any) {
          console.error('❌ [PortfolioManagement] Error deleting project:', err);
          showError(err.message || t('Failed to delete project'), t('Error'));
        }
      },
      t('Delete')
    );
  };
  
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('Loading portfolio...')}
        </Text>
      </View>
    );
  }
  
  const pastProjects = portfolio?.pastProjects || [];
  
  // Render mobile layout
  if (shouldRenderMobile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {/* Header with Back Button and Title */}
        <View style={styles.headerContainer}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.figmaBackButton}>
              <Ionicons name="chevron-back" size={24} color="#003867" />
            </TouchableOpacity>
          )}
          <Text style={styles.figmaHeaderTitle}>{t('My Portfolio')}</Text>
          <View style={{ width: 24 }} /> {/* Spacer for centering */}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* User Profile Card */}
          {isOwnProfile && userProfile && (
            <View style={[styles.userProfileCard, { backgroundColor: colors.cardBackground, borderColor: '#E6EFF7' }]}>
              <Image
                source={{ uri: userProfile.profileImage || userProfile.avatar || 'https://via.placeholder.com/32' }}
                style={styles.userAvatar}
              />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: '#003867' }]}>
                  {userProfile.name || 'User'}
                </Text>
                <Text style={[styles.userSubtext, { color: '#A3A3A3' }]}>
                  {t('Public Portfolio')}
                </Text>
              </View>
              <TouchableOpacity onPress={onBack} style={styles.editIconButton}>
                <Ionicons name="create-outline" size={14} color="#003867" />
              </TouchableOpacity>
            </View>
          )}

          {/* Portfolio Section with Blue Left Border */}
          {isOwnProfile && (
            <View style={styles.figmaSectionHeader}>
              <View style={[styles.figmaSectionIndicator, { backgroundColor: '#005DAC' }]} />
              <Text style={[styles.figmaSectionTitleText, { color: '#003867' }]}>
                {t('Portfolio')}
              </Text>
            </View>
          )}
            
          {/* PDF Section */}
            {isOwnProfile && (
            <View style={[styles.pdfCard, { backgroundColor: colors.cardBackground, borderColor: '#E6EFF7' }]}>
                {pdfInfo ? (
                <>
                  <View style={styles.figmaPdfInfoRow}>
                    <Ionicons name="document-text" size={24} color="#6A0DAD" />
                    <View style={styles.figmaPdfInfoTextContainer}>
                      <Text style={[styles.pdfTitle, { color: '#383838' }]}>
                        {t('PDF Generated')}
                      </Text>
                      <Text style={[styles.pdfTimestamp, { color: '#A3A3A3' }]}>
                        {t('Generated at')}: {pdfInfo.generatedAt ? new Date(pdfInfo.generatedAt).toLocaleString() : '-'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.pdfButtonsRow}>
                      <TouchableOpacity
                      style={[styles.figmaPdfButton, styles.figmaPdfButtonPrimary, { backgroundColor: '#005DAC' }]}
                      onPress={handleDownloadPDF}
                    >
                      <Ionicons name="download-outline" size={12} color="#EFE6F5" />
                      <Text style={[styles.figmaPdfButtonText, { color: '#EFE6F5' }]}>
                        {t('Download PDF')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.figmaPdfButton, styles.figmaPdfButtonSecondary, { backgroundColor: '#009C47' }]}
                      onPress={() => setShowPDFModal(true)}
                      >
                      <Ionicons name="qr-code-outline" size={12} color="#fff" />
                      <Text style={[styles.figmaPdfButtonText, { color: '#fff' }]}>
                        {t('Show QR Code')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                      <TouchableOpacity
                    style={[styles.regenerateButton, { backgroundColor: '#E6EFF7' }]}
                        onPress={() => {
                          setPdfOptions({
                            ...pdfOptions,
                            regenerate: true,
                            companyName: pdfInfo.companyName || '',
                          });
                          setShowPDFOptionsModal(true);
                        }}
                      >
                    <Ionicons name="settings-outline" size={12} color="#003867" />
                    <Text style={[styles.regenerateButtonText, { color: '#003867' }]}>
                          {t('Customize')}
                        </Text>
                      </TouchableOpacity>
                  </>
                ) : (
                <View style={styles.figmaPdfInfoRow}>
                  <Ionicons name="document-text-outline" size={24} color="#6A0DAD" />
                  <View style={styles.figmaPdfInfoTextContainer}>
                    <Text style={[styles.pdfTitle, { color: '#383838' }]}>
                      {t('No PDF Generated')}
                      </Text>
                    <Text style={[styles.pdfTimestamp, { color: '#A3A3A3' }]}>
                      {t('Generate your portfolio PDF')}
                    </Text>
                </View>
              </View>
            )}
          </View>
          )}
        
        {/* Bio Section */}
        {portfolio?.bio && (
          <View style={[styles.bioCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.bioTitle, { color: colors.text }]}>{t('About')}</Text>
            <Text style={[styles.bioText, { color: colors.textSecondary }]}>
              {portfolio.bio}
            </Text>
          </View>
        )}
        
          {/* Past Projects Section with Blue Left Border */}
          <View style={styles.figmaSectionHeader}>
            <View style={[styles.figmaSectionIndicator, { backgroundColor: '#005DAC' }]} />
            <Text style={[styles.figmaSectionTitleText, { color: '#003867' }]}>
              {t('Past Projects')}
                    </Text>
                    {isOwnProfile && (
                        <TouchableOpacity
                style={[styles.addProjectButton, { backgroundColor: '#005DAC' }]}
                onPress={handleAddProject}
                        >
                <Ionicons name="add" size={12} color="#EFE6F5" />
                <Text style={[styles.addProjectButtonText, { color: '#EFE6F5' }]}>
                  {t('Add Project')}
                </Text>
                        </TouchableOpacity>
                    )}
                </View>
                
          {/* Past Projects List */}
          {pastProjects.length > 0 ? (
            <View style={styles.projectsSection}>
              {pastProjects.map((project) => {
                const firstPhoto = (project.photos && project.photos.length > 0)
                  ? normalizeImageUrl(project.photos[0])
                  : (project.files && project.files.length > 0)
                  ? normalizeImageUrl(project.files[0])
                  : null;
                const projectDate = project.endDate || project.startDate || null;
                const formattedDate = projectDate
                  ? new Date(projectDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : null;

                      return (
                  <View key={project.id} style={[styles.figmaProjectCard, { backgroundColor: colors.cardBackground, borderColor: '#A3A3A3' }]}>
                    {/* Project Image */}
                    {firstPhoto && (
                      <View style={styles.projectImageContainer}>
                          <Image
                          source={{ uri: firstPhoto }}
                          style={styles.projectMainImage}
                          resizeMode="cover"
                        />
                          </View>
                    )}
                    
                    {/* Divider */}
                    <View style={styles.projectDivider} />
                    
                    {/* Project Title */}
                    <Text style={[styles.figmaProjectTitle, { color: '#383838' }]}>
                      {project.title}
                      </Text>
                    
                    {/* Project Description */}
                    {project.description && (
                      <Text style={[styles.figmaProjectDescription, { color: '#A3A3A3' }]}>
                        {project.description}
                      </Text>
                    )}
                    
                    {/* Project Date */}
                    {formattedDate && (
                      <Text style={[styles.figmaProjectDate, { color: '#A3A3A3' }]}>
                        {formattedDate}
                      </Text>
                    )}
                    
                    {/* Edit and Delete Buttons */}
                    {isOwnProfile && (
                      <View style={styles.figmaProjectActions}>
                        <TouchableOpacity
                          style={[styles.figmaEditButton, { backgroundColor: '#005DAC' }]}
                          onPress={() => handleEditProject(project)}
                        >
                          <Ionicons name="download-outline" size={12} color="#EFE6F5" />
                          <Text style={[styles.figmaButtonText, { color: '#EFE6F5' }]}>
                            {t('Edit')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.figmaDeleteButton, { backgroundColor: '#EFE6F5', borderColor: '#5E0BA1' }]}
                          onPress={() => handleDeleteProject(project)}
                        >
                          <Ionicons name="trash-outline" size={12} color="#5E0BA1" />
                          <Text style={[styles.figmaButtonText, { color: '#5E0BA1' }]}>
                            {t('Delete')}
                          </Text>
                        </TouchableOpacity>
                    </View>
                  )}
                </View>
                );
              })}
          </View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="briefcase-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('No portfolio projects yet')}
            </Text>
            {isOwnProfile && (
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                {t('Add your past projects to showcase your work')}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
      
      {/* Modals for mobile */}
      {renderAllModals()}
    </View>
    );
  }
  
  // Render desktop layout
  return (
    <View style={[styles.desktopContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.desktopHeader, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.desktopHeaderTitle, { color: colors.text }]}>
          {t('Portfolio')}
        </Text>
        {isOwnProfile && (
          <View style={styles.desktopHeaderActions}>
            {pdfInfo ? (
              <>
                <TouchableOpacity
                  style={[styles.unifiedButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    showConfirmation(
                      t('Regenerate PDF'),
                      t('This will regenerate your PDF with current settings. Continue?'),
                      () => handleGeneratePDF(true),
                      {
                        type: 'info',
                        confirmText: t('Regenerate'),
                        icon: 'refresh-outline',
                      }
                    );
                  }}
                >
                  <Ionicons name="refresh-outline" size={18} color="#fff" />
                  <Text style={[styles.unifiedButtonText, { color: '#fff' }]}>
                    {t('Regenerate')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unifiedButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                  onPress={() => {
                    setPdfOptions({
                      ...pdfOptions,
                      regenerate: true,
                      companyName: pdfInfo.companyName || '',
                    });
                    setShowPDFOptionsModal(true);
                  }}
                >
                  <Ionicons name="settings-outline" size={18} color={colors.primary} />
                  <Text style={[styles.unifiedButtonText, { color: colors.primary }]}>
                    {t('Customize')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unifiedButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowPDFModal(true)}
                >
                  <Ionicons name="qr-code-outline" size={18} color="#fff" />
                  <Text style={[styles.unifiedButtonText, { color: '#fff' }]}>
                    {t('View QR')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.unifiedButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                onPress={() => {
                  setPdfOptions({ ...pdfOptions, regenerate: false });
                  setShowPDFOptionsModal(true);
                }}
              >
                <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                <Text style={[styles.unifiedButtonText, { color: colors.primary }]}>
                  {t('Generate PDF')}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.unifiedButton, { backgroundColor: colors.primary }]}
              onPress={handleAddProject}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={[styles.unifiedButtonText, { color: '#fff' }]}>
                {t('Add Project')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <ScrollView
        style={styles.desktopScrollView}
        contentContainerStyle={styles.desktopScrollContent}
      >
        <View style={styles.desktopContent}>
          {/* Bio Section */}
          {portfolio?.bio && (
            <View style={[styles.desktopBioCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.desktopBioTitle, { color: colors.text }]}>{t('About')}</Text>
              <Text style={[styles.desktopBioText, { color: colors.textSecondary }]}>
                {portfolio.bio}
              </Text>
            </View>
          )}
          
          {/* Projects Grid */}
          {pastProjects.length > 0 ? (
            <View style={styles.desktopProjectsGrid}>
              {pastProjects.map((project) => (
                <View key={project.id} style={[styles.desktopProjectCard, { backgroundColor: colors.cardBackground }]}>
                  <View style={styles.desktopProjectHeader}>
                    <Text style={[styles.desktopProjectTitle, { color: colors.text }]}>
                      {project.title}
                    </Text>
                    {isOwnProfile && (
                      <View style={styles.desktopProjectActions}>
                        <TouchableOpacity
                          style={[styles.desktopActionButton, { backgroundColor: colors.primary + '20' }]}
                          onPress={() => handleEditProject(project)}
                        >
                          <Ionicons name="create-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.desktopActionButton, { backgroundColor: '#EF4444' + '20' }]}
                          onPress={() => handleDeleteProject(project)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  
                  {project.description && (
                    <Text style={[styles.desktopProjectDescription, { color: colors.textSecondary }]}>
                      {project.description}
                    </Text>
                  )}
                  
                  {((project.photos && project.photos.length > 0) || (project.files && project.files.length > 0)) && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.desktopProjectPhotos}
                    >
                      {(project.photos || project.files || []).map((photo, index) => {
                        const photoUrl = normalizeImageUrl(photo);
                        return (
                          <TouchableOpacity
                            key={index}
                            onPress={(e) => {
                              e.stopPropagation();
                              const allPhotos = (project.photos || project.files || []).map(p => normalizeImageUrl(p));
                              if (allPhotos.length > 0) {
                                setSlideshowPhotos(allPhotos);
                                setCurrentPhotoIndex(index);
                                setShowPhotoSlideshow(true);
                              }
                            }}
                            activeOpacity={0.7}
                            style={styles.desktopProjectPhotoContainer}
                          >
                            <Image
                              source={{ uri: photoUrl }}
                              style={styles.desktopProjectPhoto}
                            />
                            <View style={styles.photoOverlay}>
                              <Ionicons name="expand" size={18} color="#fff" />
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                  
                  <View style={styles.desktopProjectDetails}>
                    {project.location && (
                      <View style={styles.desktopProjectDetail}>
                        <Ionicons name="location" size={16} color={colors.textSecondary} />
                        <Text style={[styles.desktopProjectDetailText, { color: colors.textSecondary }]}>
                          {project.location}
                        </Text>
                      </View>
                    )}
                    {project.projectValue && (
                      <View style={styles.desktopProjectDetail}>
                        <Image source={riyalLogo} style={styles.riyalLogoSmall} resizeMode="contain" />
                        <Text style={[styles.desktopProjectDetailText, { color: colors.textSecondary }]}>
                          {project.projectValue.toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.desktopEmptyState, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="briefcase-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.desktopEmptyText, { color: colors.textSecondary }]}>
                {t('No portfolio projects yet')}
              </Text>
              {isOwnProfile && (
                <Text style={[styles.desktopEmptySubtext, { color: colors.textSecondary }]}>
                  {t('Add your past projects to showcase your work')}
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Modals for desktop */}
      {renderAllModals()}
    </View>
  );
  
  // Render all modals function
  function renderAllModals() {
    return (
      <>
      {/* Unified Add/Edit Project Modal */}
      <Modal
        visible={showProjectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowProjectModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingProject ? t('Edit Project') : t('Add Project')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowProjectModal(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={title}
                onChangeText={setTitle}
                placeholder={t('Project Title') + ' *'}
                placeholderTextColor={colors.textSecondary}
                maxLength={200}
              />
              <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                {title.length}/200
              </Text>
              
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('Description') + ' *'}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                {description.length}/2000
              </Text>
              
              {/* Date Pickers */}
              <View style={styles.dateRow}>
                <View style={styles.dateInputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {t('Start Date')} <Text style={styles.optional}>({t('Optional')})</Text>
                  </Text>
                  {Platform.OS === 'web' ? (
                    <View style={{ marginTop: 8 }}>
                      {/* @ts-ignore - web-specific input element */}
                      <input
                        type="date"
                        value={startDate ? startDate.toISOString().split('T')[0] : ''}
                        onChange={(e: any) => {
                          if (e.target.value) {
                            const date = new Date(e.target.value);
                            setStartDate(date);
                            // If end date is before new start date, clear it
                            if (endDate && date > endDate) {
                              setEndDate(null);
                            }
                          } else {
                            setStartDate(null);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '16px',
                          borderWidth: 1,
                          borderStyle: 'solid',
                          borderColor: colors.border,
                          borderRadius: 12,
                          backgroundColor: colors.background,
                          color: colors.text,
                        } as any}
                      />
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.dateButton, { borderColor: colors.border }]}
                        onPress={() => {
                          if (Platform.OS === 'android') {
                            setShowStartDatePicker(true);
                          } else {
                            setShowStartDatePicker(!showStartDatePicker);
                          }
                        }}
                      >
                        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                        <Text style={[styles.dateText, { color: colors.text }]}>
                          {startDate ? startDate.toLocaleDateString() : t('Select Start Date')}
                        </Text>
                      </TouchableOpacity>
                      {showStartDatePicker && (
                        <DateTimePicker
                          value={startDate || new Date()}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={(event, date) => {
                            if (Platform.OS === 'android') {
                              setShowStartDatePicker(false);
                            }
                            if (date) {
                              setStartDate(date);
                              // If end date is before new start date, clear it
                              if (endDate && date > endDate) {
                                setEndDate(null);
                              }
                            }
                          }}
                        />
                      )}
                    </>
                  )}
                </View>
                
                <View style={styles.dateInputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {t('End Date')} <Text style={styles.optional}>({t('Optional')})</Text>
                  </Text>
                  {Platform.OS === 'web' ? (
                    <View style={{ marginTop: 8 }}>
                      {/* @ts-ignore - web-specific input element */}
                      <input
                        type="date"
                        value={endDate ? endDate.toISOString().split('T')[0] : ''}
                        min={startDate ? startDate.toISOString().split('T')[0] : undefined}
                        onChange={(e: any) => {
                          if (e.target.value) {
                            const date = new Date(e.target.value);
                            setEndDate(date);
                          } else {
                            setEndDate(null);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '16px',
                          borderWidth: 1,
                          borderStyle: 'solid',
                          borderColor: colors.border,
                          borderRadius: 12,
                          backgroundColor: colors.background,
                          color: colors.text,
                        } as any}
                      />
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.dateButton, { borderColor: colors.border }]}
                        onPress={() => {
                          if (Platform.OS === 'android') {
                            setShowEndDatePicker(true);
                          } else {
                            setShowEndDatePicker(!showEndDatePicker);
                          }
                        }}
                      >
                        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                        <Text style={[styles.dateText, { color: colors.text }]}>
                          {endDate ? endDate.toLocaleDateString() : t('Select End Date')}
                        </Text>
                      </TouchableOpacity>
                      {showEndDatePicker && (
                        <DateTimePicker
                          value={endDate || startDate || new Date()}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          minimumDate={startDate || undefined}
                          onChange={(event, date) => {
                            if (Platform.OS === 'android') {
                              setShowEndDatePicker(false);
                            }
                            if (date) {
                              setEndDate(date);
                            }
                          }}
                        />
                      )}
                    </>
                  )}
                </View>
              </View>
              
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={clientName}
                onChangeText={setClientName}
                placeholder={t('Client Name') + ' (' + t('Optional') + ')'}
                placeholderTextColor={colors.textSecondary}
                maxLength={100}
              />
              
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={location}
                onChangeText={setLocation}
                placeholder={t('Location') + ' (' + t('Optional') + ')'}
                placeholderTextColor={colors.textSecondary}
                maxLength={200}
              />
              
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={projectValue}
                onChangeText={setProjectValue}
                placeholder={t('Project Value (SAR)') + ' (' + t('Optional') + ')'}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
              
              <TouchableOpacity
                style={[
                  styles.addImageButton,
                  { borderColor: colors.primary },
                  selectedPhotos.length >= 5 && { opacity: 0.5 },
                ]}
                onPress={handleSelectImages}
                disabled={selectedPhotos.length >= 5}
              >
                <Ionicons name="image-outline" size={24} color={colors.primary} />
                <Text style={[styles.addImageText, { color: colors.primary }]}>
                  {selectedPhotos.length >= 5 ? t('Maximum 5 photos') : t('Add Images')}
                </Text>
              </TouchableOpacity>
              
              {selectedPhotos.length > 0 && (
                <View style={styles.selectedImagesContainer}>
                  {selectedPhotos.map((photo, index) => {
                    const uri = typeof photo === 'string' 
                      ? normalizeImageUrl(photo) 
                      : photo.uri;
                    const isExistingPhoto = typeof photo === 'string';
                    return (
                      <View key={index} style={styles.imagePreviewContainer}>
                        <Image 
                          source={{ uri }} 
                          style={styles.imagePreview}
                          onError={(error) => {
                            console.error(`❌ [PortfolioManagement] Failed to load preview image ${index + 1}:`, uri);
                          }}
                        />
                        {isExistingPhoto && (
                          <View style={styles.existingPhotoBadge}>
                            <Text style={styles.existingPhotoBadgeText}>{t('Existing')}</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => {
                            showDeleteConfirmation(
                              t('Remove Photo'),
                              isExistingPhoto 
                                ? t('Remove this photo from the project?')
                                : t('Remove this photo?'),
                              () => handleRemoveImage(index),
                              t('Remove')
                            );
                          }}
                        >
                          <Ionicons name="close-circle" size={24} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
              
              {/* Photo count and limit */}
              {selectedPhotos.length > 0 && (
                <Text style={[styles.photoCountText, { color: colors.textSecondary }]}>
                  {selectedPhotos.length} / 5 {t('photos')}
                  {selectedPhotos.length >= 5 && (
                    <Text style={{ color: colors.error }}> ({t('Maximum reached')})</Text>
                  )}
                </Text>
              )}
              
              {/* Public Toggle */}
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleRow, { backgroundColor: colors.background }]}
                  onPress={() => setIsPublic(!isPublic)}
                >
                  <View style={styles.toggleInfo}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('Make Public')}</Text>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                      {isPublic ? t('Visible to everyone') : t('Private')}
                    </Text>
                  </View>
                  <View style={[styles.toggle, isPublic && styles.toggleActive, { backgroundColor: isPublic ? colors.primary : colors.border }]}>
                    <View style={[styles.toggleThumb, isPublic && styles.toggleThumbActive]} />
                  </View>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveProject}
                disabled={isSaving || !title.trim()}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>
                      {editingProject ? t('Update Project') : t('Add Project')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
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
      
      {/* PDF Options Modal */}
      <Modal
        visible={showPDFOptionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPDFOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('PDF Generation Options')}
              </Text>
              <TouchableOpacity onPress={() => setShowPDFOptionsModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <Text style={[styles.label, { color: colors.text }]}>
                {t('Company Name')} ({t('Optional')})
              </Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={pdfOptions.companyName}
                onChangeText={(text) => setPdfOptions({ ...pdfOptions, companyName: text })}
                placeholder={t('Enter company name')}
                placeholderTextColor={colors.textSecondary}
              />
              
              <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>
                {t('Preferred Style')} ({t('Optional')})
              </Text>
              <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 8 }]}>
                {t('Leave empty to let AI choose the best style, or enter: hero-grid, cards, grid, timeline, masonry')}
              </Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={pdfOptions.preferredStyle}
                onChangeText={(text) => setPdfOptions({ ...pdfOptions, preferredStyle: text })}
                placeholder={t('Leave empty for AI selection')}
                placeholderTextColor={colors.textSecondary}
              />
              
              <ColorPicker
                label={`${t('Header Color')} (${t('Optional')})`}
                value={pdfOptions.headerColor || '#0080E0'}
                onChange={(color) => setPdfOptions({ ...pdfOptions, headerColor: color })}
              />
              
              <ColorPicker
                label={`${t('Text Color')} (${t('Optional')})`}
                value={pdfOptions.textColor || '#2C3E50'}
                onChange={(color) => setPdfOptions({ ...pdfOptions, textColor: color })}
              />
              
              <ColorPicker
                label={`${t('Background Color')} (${t('Optional')})`}
                value={pdfOptions.backgroundColor || '#F8F9FA'}
                onChange={(color) => setPdfOptions({ ...pdfOptions, backgroundColor: color })}
              />
              
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={() => handleGeneratePDF(pdfOptions.regenerate || pdfInfo !== null)}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {pdfInfo || pdfOptions.regenerate ? t('Regenerate PDF') : t('Generate PDF')}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* PDF Info Modal */}
      <Modal
        visible={showPDFModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPDFModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('Portfolio PDF')}
              </Text>
              <TouchableOpacity onPress={() => setShowPDFModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {pdfInfo && (
                <>
                  {pdfInfo.qrCodeUrl && (
                    <View style={styles.qrCodeContainer}>
                      <Text style={[styles.label, { color: colors.text, marginBottom: 12 }]}>
                        {t('QR Code')}
                      </Text>
                      <Image
                        source={{ uri: pdfInfo.qrCodeUrl }}
                        style={styles.qrCodeImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  
                  {pdfInfo.companyName && (
                    <View style={styles.pdfInfoRow}>
                      <Text style={[styles.label, { color: colors.text }]}>
                        {t('Company')}:
                      </Text>
                      <Text style={[styles.pdfInfoText, { color: colors.textSecondary }]}>
                        {pdfInfo.companyName}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.pdfInfoRow}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {t('Generated')}:
                    </Text>
                    <Text style={[styles.pdfInfoText, { color: colors.textSecondary }]}>
                      {pdfInfo.generatedAt ? new Date(pdfInfo.generatedAt).toLocaleString() : '-'}
                    </Text>
                  </View>
                  
                  <View style={styles.pdfActions}>
                    <TouchableOpacity
                      style={[styles.pdfActionButton, { backgroundColor: colors.primary }]}
                      onPress={handleDownloadPDF}
                    >
                      <Ionicons name="download-outline" size={20} color="#fff" />
                      <Text style={[styles.pdfActionButtonText, { color: '#fff' }]}>
                        {t('Download PDF')}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.pdfActionButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                      onPress={handleSharePDF}
                    >
                      <Ionicons name="share-outline" size={20} color={colors.primary} />
                      <Text style={[styles.pdfActionButtonText, { color: colors.primary }]}>
                        {t('Share')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {pdfInfo.publicUrl && (
                    <View style={styles.pdfLinkContainer}>
                      <Text style={[styles.label, { color: colors.text, marginBottom: 8 }]}>
                        {t('Public Link')}:
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            navigator.clipboard.writeText(pdfInfo.publicUrl);
                            showSuccess(t('Link copied to clipboard'), t('Success'));
                          }
                        }}
                      >
                        <Text style={[styles.pdfLinkText, { color: colors.primary }]} numberOfLines={2}>
                          {pdfInfo.publicUrl}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Photo Slideshow Modal */}
      <Modal
        visible={showPhotoSlideshow}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseSlideshow}
        statusBarTranslucent={true}
      >
        <View style={styles.slideshowContainer} onStartShouldSetResponder={() => true}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.slideshowCloseButton}
            onPress={handleCloseSlideshow}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          {/* Photo Counter */}
          {slideshowPhotos.length > 1 && (
            <View style={styles.slideshowCounter}>
              <Text style={styles.slideshowCounterText}>
                {currentPhotoIndex + 1} / {slideshowPhotos.length}
              </Text>
            </View>
          )}
          
          {/* Main Image with Swipe Support */}
          <View style={styles.slideshowImageWrapper}>
            <ScrollView
              ref={slideshowScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={true}
              onMomentumScrollEnd={handleSlideshowScroll}
              style={styles.slideshowScrollView}
              contentContainerStyle={styles.slideshowScrollContent}
            >
              {slideshowPhotos.map((photo, index) => {
                const normalizedUrl = normalizeImageUrl(photo);
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
                      source={{ uri: normalizedUrl }}
                      style={styles.slideshowImage}
                      resizeMode="contain"
                      onError={(error) => {
                        console.error(`❌ [Slideshow] Failed to load image ${index + 1}:`, normalizedUrl);
                        console.error('Error details:', error.nativeEvent);
                      }}
                      onLoad={() => {
                        console.log(`✅ [Slideshow] Loaded image ${index + 1}:`, normalizedUrl);
                      }}
                    />
                  </View>
                );
              })}
            </ScrollView>
          </View>
          
          {/* Navigation Buttons */}
          {slideshowPhotos.length > 1 && (
            <>
              {/* Previous Button */}
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
              
              {/* Next Button */}
              <TouchableOpacity
                style={[
                  styles.slideshowNavButton,
                  styles.slideshowNavButtonRight,
                  currentPhotoIndex === slideshowPhotos.length - 1 && styles.slideshowNavButtonDisabled,
                ]}
                onPress={handleNextPhoto}
                disabled={currentPhotoIndex === slideshowPhotos.length - 1}
              >
                <Ionicons
                  name="chevron-forward"
                  size={32}
                  color={currentPhotoIndex === slideshowPhotos.length - 1 ? 'rgba(255, 255, 255, 0.3)' : '#fff'}
                />
              </TouchableOpacity>
            </>
          )}
          
          {/* Dots Indicator */}
          {slideshowPhotos.length > 1 && (
            <View style={styles.slideshowDots}>
              {slideshowPhotos.map((_, index) => (
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
          )}
        </View>
      </Modal>
      </>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  portfolioCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
      } as any,
      default: {
        elevation: 3,
      },
    }),
  },
  portfolioCardHeader: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  portfolioCardTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  portfolioCardButtons: {
    padding: 16,
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    width: '100%',
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
    justifyContent: 'flex-end',
  },
  unifiedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    minHeight: 44,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        minWidth: 120,
      } as any,
      default: {
        minWidth: 100,
      },
    }),
  },
  unifiedButtonFull: {
    flex: 1,
    width: '100%',
  },
  unifiedButtonHalf: {
    flex: 1,
  },
  unifiedButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Legacy button styles (kept for compatibility)
  pdfButtonsGroup: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    minHeight: 44,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      } as any,
    }),
  },
  pdfButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    minHeight: 44,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      } as any,
    }),
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bioCard: {
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  bioTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 22,
  },
  projectsSection: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  projectCard: {
    padding: 20,
    borderRadius: 14,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  projectHeader: {
    marginBottom: 12,
  },
  projectHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.2,
  },
  projectActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  projectDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
    opacity: 0.8,
  },
  projectPhotos: {
    marginBottom: 16,
  },
  projectPhotosContent: {
    paddingRight: 12,
  },
  projectPhotoContainer: {
    position: 'relative',
    marginRight: 12,
    zIndex: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      } as any,
    }),
  },
  projectPhoto: {
    width: 140,
    height: 140,
    borderRadius: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  photoOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
    opacity: 0.8,
    ...Platform.select({
      web: {
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      } as any,
    }),
  },
  slideshowContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideshowCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  slideshowCounter: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 40,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  slideshowCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  slideshowImageWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideshowScrollView: {
    flex: 1,
    width: '100%',
  },
  slideshowScrollContent: {
    alignItems: 'center',
  },
  slideshowImageContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  slideshowImage: {
    width: '100%',
    height: '100%',
    maxWidth: '95%',
    maxHeight: '90%',
  },
  slideshowNavButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
    padding: 12,
    zIndex: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
      } as any,
    }),
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
    bottom: Platform.OS === 'web' ? 30 : 50,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  slideshowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  slideshowDotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  // Desktop styles
  desktopContainer: {
    flex: 1,
    ...Platform.select({
      web: {
        minHeight: '100vh' as any,
      },
    }),
  },
  desktopHeader: {
    padding: 24,
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  desktopHeaderTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
  },
  desktopHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  desktopPdfButtonsGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  desktopPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    minHeight: 44,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        minWidth: 140,
      } as any,
    }),
  },
  desktopPdfButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  desktopAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    minHeight: 44,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        minWidth: 140,
      } as any,
    }),
  },
  desktopAddButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  desktopScrollView: {
    flex: 1,
  },
  desktopScrollContent: {
    padding: 24,
    paddingLeft: 40,
    paddingRight: 40,
    paddingBottom: 150,
  },
  desktopContent: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  desktopBioCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 32,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  desktopBioTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  desktopBioText: {
    fontSize: 16,
    lineHeight: 24,
  },
  desktopProjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  desktopProjectCard: {
    flex: 1,
    minWidth: 400,
    maxWidth: 500,
    padding: 24,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  desktopProjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  desktopProjectTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  desktopProjectActions: {
    flexDirection: 'row',
    gap: 8,
  },
  desktopActionButton: {
    padding: 8,
    borderRadius: 8,
  },
  desktopProjectDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
    opacity: 0.8,
  },
  desktopProjectPhotos: {
    marginBottom: 16,
  },
  desktopProjectPhotoContainer: {
    position: 'relative',
    marginRight: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  desktopProjectPhoto: {
    width: 180,
    height: 180,
    borderRadius: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  desktopProjectDetails: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  desktopProjectDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  desktopProjectDetailText: {
    fontSize: 14,
  },
  desktopEmptyState: {
    padding: 48,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  desktopEmptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  desktopEmptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  projectDetails: {
    gap: 10,
    marginTop: 8,
  },
  projectDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  riyalLogoSmall: {
    width: 18,
    height: 18,
  },
  projectDetailText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  emptyState: {
    padding: 60,
    marginHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
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
    paddingBottom: 20,
    ...Platform.select({
      web: {
        maxHeight: '80vh',
      } as any,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalScrollView: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 16,
    opacity: 0.7,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  optional: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.7,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateInputGroup: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  dateText: {
    fontSize: 16,
    flex: 1,
  },
  toggleContainer: {
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  toggleInfo: {
    flex: 1,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    // Active state handled by backgroundColor
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  // Confirmation Modal Styles
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
      } as any,
      default: {
        elevation: 8,
      },
    }),
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  confirmModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalCancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  confirmModalConfirmButton: {
    // Success/OK button - uses primary color
  },
  confirmModalDeleteButton: {
    // Delete button - uses red color
  },
  confirmModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
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
    backgroundColor: '#fff',
    borderRadius: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  existingPhotoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 128, 224, 0.9)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  existingPhotoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  photoCountText: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  qrCodeImage: {
    width: 200,
    height: 200,
  },
  pdfInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  pdfInfoText: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  pdfActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  pdfActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  pdfActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pdfLinkContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
  },
  pdfLinkText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  // Figma Design Styles
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  figmaBackButton: {
    padding: 4,
  },
  figmaHeaderTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '400',
    color: '#003867',
    textAlign: 'center',
  },
  userProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 6,
    borderWidth: 0.5,
    gap: 12,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userInfo: {
    flex: 1,
    gap: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  userSubtext: {
    fontSize: 14,
    fontWeight: '300',
  },
  editIconButton: {
    padding: 4,
  },
  figmaSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 0,
    marginBottom: 16,
    gap: 24,
  },
  figmaSectionIndicator: {
    width: 2,
    height: 20,
    borderRadius: 1,
  },
  figmaSectionTitleText: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  addProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  addProjectButtonText: {
    fontSize: 14,
    fontWeight: '400',
  },
  pdfCard: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 6,
    borderWidth: 0.5,
    gap: 16,
  },
  figmaPdfInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  figmaPdfInfoTextContainer: {
    flex: 1,
    gap: 4,
  },
  pdfTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  pdfTimestamp: {
    fontSize: 14,
    fontWeight: '300',
  },
  pdfButtonsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  figmaPdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 12,
  },
  figmaPdfButtonPrimary: {
    // Styles applied via backgroundColor
  },
  figmaPdfButtonSecondary: {
    // Styles applied via backgroundColor
  },
  figmaPdfButtonText: {
    fontSize: 14,
    fontWeight: '400',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 12,
    width: '100%',
  },
  regenerateButtonText: {
    fontSize: 16,
    fontWeight: '400',
  },
  figmaProjectCard: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
  },
  projectImageContainer: {
    width: '100%',
    height: 162,
    borderRadius: 6,
    overflow: 'hidden',
  },
  projectMainImage: {
    width: '100%',
    height: '100%',
  },
  projectDivider: {
    height: 0.5,
    backgroundColor: '#A3A3A3',
    width: '100%',
  },
  figmaProjectTitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  figmaProjectDescription: {
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 20,
  },
  figmaProjectDate: {
    fontSize: 14,
    fontWeight: '300',
    textAlign: 'right',
  },
  figmaProjectActions: {
    flexDirection: 'row',
    gap: 16,
  },
  figmaEditButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 12,
  },
  figmaDeleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  figmaButtonText: {
    fontSize: 14,
    fontWeight: '400',
  },
});

