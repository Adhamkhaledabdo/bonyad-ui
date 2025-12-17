import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Button, Card, Switch } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AIService, { ProjectRequest, analyzeDescription, ServiceCategory } from '../services/AIService';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { storage } from '../utils/storage';
import LocationPicker from '../components/LocationPicker';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { useRouter } from '../utils/useRouter';
import ProjectCreationFlow from '../components/ProjectCreationFlow';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';
import { globalAlertManager } from '../utils/globalAlertManager';

// Design tokens from Figma
const FIGMA_COLORS = {
  primary100: '#003867',
  primary80: '#004A8A',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary10: '#E6EFF7',
  green90: '#007B36',
  green80: '#008B3E',
  green10: '#E6F5EC',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  white: '#FFFFFF',
  purple100: '#3C076D',
  purple10: '#EFE6F5',
};

interface ConversationalAIFormProps {
  technician?: any;
  onBack: () => void;
  onSuccess?: () => void;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  examples?: string[];
}

interface ProjectPhase {
  title: string;
  description: string;
  durationWeeks: number;
  amount: number;
  percentage: number;
}

interface ProjectRequestExtended extends ProjectRequest {
  phases?: ProjectPhase[];
}

type ConversationState = 'initial' | 'askingDetails' | 'generating' | 'completed';

export default function ConversationalAIForm({
  technician,
  onBack,
  onSuccess,
}: ConversationalAIFormProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const router = useRouter('aiForm', () => {});
  const { alertState, showError, showWarning, showAlert, hideAlert } = useAlertPopup();
  const { confirmState, showConfirmation, hideConfirmation } = useConfirmationPopup();

  // Form state - Step 1: Description
  const [description, setDescription] = useState('');
  
  // Form state - Step 2: AI Questions (all at once)
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [answersText, setAnswersText] = useState(''); // Combined answer for all questions
  
  // Form state - Step 3: Review and edit
  const [finalProject, setFinalProject] = useState<ProjectRequest | null>(null);
  const [editedProject, setEditedProject] = useState<ProjectRequest | null>(null);
  
  // Form state - Photos
  const [photos, setPhotos] = useState<string[]>([]);
  
  // Photo slideshow state
  const [showPhotoSlideshow, setShowPhotoSlideshow] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const slideshowScrollRef = useRef<ScrollView>(null);

  // Service categories from backend
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);

  // Editing phases state
  const [editedPhases, setEditedPhases] = useState<ProjectPhase[]>([]);
  const [editingPhaseIndex, setEditingPhaseIndex] = useState<number | null>(null);
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [showPhaseEditModal, setShowPhaseEditModal] = useState(false);

  // UI state
  const [currentStep, setCurrentStep] = useState<'description' | 'questions' | 'review'>('description');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Date picker state for bid closed at
  const [bidClosedDate, setBidClosedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Submission progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState(0);
  const [submissionMessage, setSubmissionMessage] = useState('');

  // Location picker state
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Responsive state
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  const shouldRenderMobile = Platform.OS !== 'web' || !IS_LARGE_WEB;

  // Fetch service categories on mount
  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      try {
        const categories = await AIService.getServiceCategories();
        if (isMounted) {
          setServiceCategories(categories);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Examples for initial prompt
  const initialExamples = [
    'I need to renovate my kitchen with modern cabinets and new appliances',
    'Looking for someone to fix my bathroom plumbing and install new tiles',
    'Need help designing and building a garden shed in my backyard',
  ];

  const arabicExamples = [
    'أريد تجديد مطبخي بخزائن حديثة وأجهزة جديدة',
    'أبحث عن شخص لإصلاح سباكة الحمام وتركيب بلاط جديد',
    'أحتاج مساعدة في تصميم وبناء كوخ حديقة في الفناء الخلفي',
  ];

  const currentExamples = i18n.language === 'ar' ? arabicExamples : initialExamples;

  // Animation for AI icon
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const loadingRotateAnim = useRef(new Animated.Value(0)).current;
  const loadingAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Rotate animation
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );
    rotateLoop.start();

    // Cleanup animations on unmount
    return () => {
      pulseLoop.stop();
      rotateLoop.stop();
    };
  }, []);

  // Loading spinner animation - starts/stops based on isLoading
  useEffect(() => {
    if (isLoading) {
      loadingRotateAnim.setValue(0);
      loadingAnimRef.current = Animated.loop(
        Animated.timing(loadingRotateAnim, {
          toValue: 1,
          duration: 800, // Fast spin
          useNativeDriver: true,
        })
      );
      loadingAnimRef.current.start();
    } else {
      if (loadingAnimRef.current) {
        loadingAnimRef.current.stop();
        loadingAnimRef.current = null;
      }
      loadingRotateAnim.setValue(0);
    }

    return () => {
      if (loadingAnimRef.current) {
        loadingAnimRef.current.stop();
      }
    };
  }, [isLoading]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const loadingSpin = loadingRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Photo handling
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showWarning(t('Please grant camera roll permissions'), t('Permission Required'));
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
  
  const handleViewPhoto = (index: number) => {
    setCurrentPhotoIndex(index);
    setShowPhotoSlideshow(true);
  };
  
  const handleNextPhoto = () => {
    if (currentPhotoIndex < photos.length - 1) {
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
    if (index !== currentPhotoIndex && index >= 0 && index < photos.length) {
      setCurrentPhotoIndex(index);
    }
  };

  // Location handling
  const pickLocation = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showWarning(t('Location permission is required to use this feature'), t('Permission Required'));
        return;
      }

      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;

      // Open Google Maps with current location
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

      if (Platform.OS === 'web') {
        window.open(googleMapsUrl, '_blank');
      } else {
        showConfirmation(
          t('Select Location'),
          t('Please select your location from the map'),
          () => {
            // Store coordinates
            if (editedProject) {
              setEditedProject({
                ...editedProject,
                latitude,
                longitude,
                address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              });
            }
          },
          undefined,
        );
      }
    } catch (error) {
      console.error('Error picking location:', error);
      showError(t('Could not get your location. Please manually enter your address.'), t('Location Error'));
    }
  };

  // Step 1: Process description and get AI questions
  const handleDescriptionSubmit = async () => {
    if (!description.trim()) {
      setError(t('Please enter a project description'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Generating AI questions...');
      const analysis = await analyzeDescription(description, i18n.language as 'en' | 'ar');
      
      if (analysis.questions && analysis.questions.length > 0) {
        setAiQuestions(analysis.questions);
        setCurrentStep('questions');
      } else {
        // No questions needed, generate directly
        await generateProject();
      }
    } catch (error: any) {
      console.error('❌ Error getting AI questions:', error);
      setError(error.message || t('Failed to generate questions'));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit answers to all questions at once
  const handleQuestionsSubmit = async () => {
    if (!answersText.trim()) {
      setError(t('Please answer the questions'));
      return;
    }
    await generateProject();
  };

  // Generate project with all collected data
  const generateProject = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🤖 Generating project with AI...');
      
      // Combine description and answers
      const fullDescription = description + '\n\nAdditional Details:\n' + answersText;
      
      const project = await AIService.generateProject(fullDescription, i18n.language as 'en' | 'ar', serviceCategories);
      
      // Match category to serviceId from backend
      const serviceId = AIService.matchServiceId(project.category, serviceCategories, i18n.language as 'en' | 'ar');
      project.serviceId = serviceId;
      
      console.log('✅ Project generated:', project);
      console.log('   Category:', project.category);
      console.log('   Matched serviceId:', serviceId);
      
      // Initialize editedPhases with generated phases
      if (project.phases && project.phases.length > 0) {
        setEditedPhases(project.phases);
      }
      
      setFinalProject(project);
      setEditedProject(project);
      setCurrentStep('review');
    } catch (error: any) {
      console.error('❌ Error generating project:', error);
      setError(error.message || t('Failed to generate project'));
    } finally {
      setIsLoading(false);
    }
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
        const formattedDate = formatDateForAPI(selectedDate);
        handleEditField('bidsCloseAt', formattedDate);
      }
    } else if (Platform.OS === 'ios' && selectedDate) {
      setBidClosedDate(selectedDate);
      const formattedDate = formatDateForAPI(selectedDate);
      handleEditField('bidsCloseAt', formattedDate);
    }
  };

  // Initialize bidClosedDate when editedProject changes
  useEffect(() => {
    if (editedProject?.bidsCloseAt) {
      try {
        const date = new Date(editedProject.bidsCloseAt);
        if (!isNaN(date.getTime())) {
          setBidClosedDate(date);
        }
      } catch (e) {
        console.error('Error parsing bid deadline date:', e);
      }
    }
  }, [editedProject?.bidsCloseAt]);

  // Handle date selection
  const handlePickDate = () => {
    if (editedProject?.bidsCloseAt) {
      try {
        const date = new Date(editedProject.bidsCloseAt);
        if (!isNaN(date.getTime())) {
          setBidClosedDate(date);
        }
      } catch (e) {
        // Use current date if parsing fails
      }
    }
    if (Platform.OS === 'android') {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(true);
    }
  };

  // Handle time selection
  const handlePickTime = () => {
    if (editedProject?.bidsCloseAt) {
      try {
        const date = new Date(editedProject.bidsCloseAt);
        if (!isNaN(date.getTime())) {
          setBidClosedDate(date);
        }
      } catch (e) {
        // Use current date if parsing fails
      }
    }
    if (Platform.OS === 'android') {
      setShowTimePicker(true);
    } else {
      setShowTimePicker(true);
    }
  };

  // Handle editing project fields
  const handleEditField = (field: keyof ProjectRequest, value: any) => {
    if (editedProject) {
      setEditedProject({ ...editedProject, [field]: value });
    }
  };

  // Save edits
  const handleSaveEdits = () => {
    // Update finalProject with edited project and editedPhases
    const updatedProject = {
      ...editedProject!,
      phases: editedPhases,
    };
    setFinalProject(updatedProject);
    setEditedProject(updatedProject);
    setIsEditing(false);
  };

  // Phase editing functions
  const handleEditPhase = (index: number) => {
    // Ensure editedPhases is initialized from finalProject if needed
    let phasesToUse = editedPhases;
    if (phasesToUse.length === 0 && finalProject?.phases) {
      phasesToUse = [...finalProject.phases];
      setEditedPhases(phasesToUse);
    }
    
    if (phasesToUse[index]) {
      const phase = phasesToUse[index];
      setEditingPhase({ ...phase });
      setEditingPhaseIndex(index);
      setShowPhaseEditModal(true);
    }
  };

  const handleSavePhaseEdit = (index: number) => {
    if (editingPhase) {
      // Ensure editedPhases is initialized
      let phasesToUse = editedPhases;
      if (phasesToUse.length === 0 && finalProject?.phases) {
        phasesToUse = [...finalProject.phases];
      }
      
      const newPhases = [...phasesToUse];
      newPhases[index] = editingPhase;
      setEditedPhases(newPhases);
      
      // Update finalProject and editedProject to keep them in sync
      if (finalProject) {
        setFinalProject({ ...finalProject, phases: newPhases });
      }
      if (editedProject) {
        setEditedProject({ ...editedProject, phases: newPhases });
      }
      
      setEditingPhaseIndex(null);
      setEditingPhase(null);
      setShowPhaseEditModal(false);
    }
  };

  const handleCancelPhaseEdit = () => {
    setEditingPhaseIndex(null);
    setEditingPhase(null);
    setShowPhaseEditModal(false);
  };

  const handleUpdatePhaseField = (field: keyof ProjectPhase, value: any) => {
    if (editingPhase) {
      setEditingPhase({ ...editingPhase, [field]: value });
    }
  };

  const handleDeletePhase = (index: number) => {
    showConfirmation(
      t('Delete Phase'),
      t('Are you sure you want to delete this phase?'),
      () => {
            // Ensure editedPhases is initialized
            let phasesToUse = editedPhases;
            if (phasesToUse.length === 0 && finalProject?.phases) {
              phasesToUse = [...finalProject.phases];
            }
            
            const newPhases = phasesToUse.filter((_, i) => i !== index);
            setEditedPhases(newPhases);
            
            // Update finalProject and editedProject to keep them in sync
            if (finalProject) {
              setFinalProject({ ...finalProject, phases: newPhases });
            }
            if (editedProject) {
              setEditedProject({ ...editedProject, phases: newPhases });
            }
          },
      {
        type: 'danger',
        confirmStyle: 'destructive',
        confirmText: t('Delete'),
        cancelText: t('Cancel'),
      }
    );
  };


  // Date picker handlers removed - no longer needed

  // Helper function to update progress smoothly
  const updateProgress = (progress: number, message: string) => {
    setSubmissionProgress(progress);
    setSubmissionMessage(message);
  };

  // Submit final project to API with progress tracking
  const submitProject = async (project: ProjectRequest) => {
    // Validate address before submitting
    if (!project.address || project.address.trim() === '') {
      showAlert(
        t('Address Required'),
        t('Please add a project address. Address is important for technicians to locate your project.'),
        'warning',
        [
          { text: t('OK'), onPress: () => {
            // If not in edit mode, enable edit mode to add address
            if (!isEditing) {
              setIsEditing(true);
            }
            // Show map picker
            setShowMapPicker(true);
          }},
        ]
      );
      return;
    }

    setIsSubmitting(true);
    setSubmissionProgress(0);

    try {
      const token = await storage.getAuthToken();
      const userId = await storage.getUserId();

      if (!token || !userId) {
        showError(t('Please login again'));
        setIsSubmitting(false);
        return;
      }

      console.log('📋 ============ AI PROJECT SUBMISSION ============');
      console.log('📋 AI-Generated Project Details:');
      console.log('   Description:', project.description);
      console.log('   ServiceId:', project.serviceId);
      console.log('   Budget:', project.budget);
      console.log('   Duration:', project.durationWeeks, 'weeks →', project.durationWeeks * 7, 'days');
      console.log('   Photos:', photos.length);
      console.log('   Phases:', project.phases?.length || 0);

      // STEP 1: Create project (20-50%)
      updateProgress(0.1, t('Preparing project...'));
      await new Promise(resolve => setTimeout(resolve, 300));

      updateProgress(0.2, t('Creating project...'));
      
      const formData = new FormData();
      formData.append('description', project.description);
      formData.append('serviceId', (project.serviceId || 1).toString());
      
      // Budget handling: if unspecified, don't send budget (backend will treat as null); otherwise send the budget value
      if (project.budgetUnspecified) {
        formData.append('budgetUnspecified', 'true');
        // Don't append budget field - backend will treat missing budget as null
      } else {
        formData.append('budget', (project.budget || 0).toString());
        formData.append('budgetUnspecified', 'false');
      }
      
      // Add bid deadline if set
      if (project.bidsCloseAt) {
        formData.append('bidsCloseAt', project.bidsCloseAt);
      }
      
      formData.append('address', project.address || '');
      formData.append('latitude', (project.latitude || 0).toString());
      formData.append('longitude', (project.longitude || 0).toString());
      formData.append('timeRequired', ((project.durationWeeks || 2) * 7).toString());
      formData.append('projectType', technician ? 'DIRECT_ASSIGNMENT' : 'ALL');

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

      if (!response.ok || !data.id) {
        throw new Error(data.message || 'Failed to create project');
      }

      const projectId = data.id;
      console.log('✅ Project created with ID:', projectId);

      updateProgress(0.5, t('Project created!'));
      await new Promise(resolve => setTimeout(resolve, 300));

      // STEP 2: Create phases (60-90%)
      if (project.phases && project.phases.length > 0) {
        updateProgress(0.6, t('Creating phases...'));
        console.log('📝 STEP 2: Creating', project.phases.length, 'phases...');

        for (let i = 0; i < project.phases.length; i++) {
          const phase = project.phases[i];
          const phaseProgress = 0.6 + (0.3 * (i + 1) / project.phases.length);
          updateProgress(phaseProgress, `${t('Creating phase')} ${i + 1}/${project.phases.length}`);

          try {
            await createPhase(projectId, i + 1, phase, token);
            console.log(`✅ Phase ${i + 1} created`);
          } catch (error) {
            console.error(`❌ Failed to create phase ${i + 1}:`, error);
            // Continue with other phases
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // STEP 3: Finalize (95-100%)
      updateProgress(0.95, t('Finalizing...'));
      await new Promise(resolve => setTimeout(resolve, 300));

      updateProgress(1.0, t('Complete!'));
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('✅ AI Project submitted successfully!');
      console.log('📸 ============ AI PROJECT SUBMISSION END ============');

      setIsSubmitting(false);
      
      // Show success message
      const successMessage = technician ? t('Deal sent successfully!') : t('Project submitted successfully!');
      
      if (Platform.OS === 'web') {
        // On web, use alert popup
        globalAlertManager.showSuccess(successMessage, t('Success'), () => {
          onSuccess?.();
          // Navigate to app/home using router
          if (router) {
            router.navigate('home');
          } else {
            onBack();
          }
        });
      } else {
        // On native, show success modal
        setShowSuccessModal(true);
        // Auto-navigate to home after 2 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
          onSuccess?.();
          onBack();
        }, 2000);
      }
    } catch (error: any) {
      console.error('❌ Error submitting project:', error);
      setIsSubmitting(false);
      showError(error.message || t('Failed to submit project'));
    }
  };

  // Create individual phase via API
  const createPhase = async (
    projectId: number,
    phaseNumber: number,
    phase: ProjectPhase,
    token: string
  ) => {
    const requestBody = {
      projectId,
      phaseNumber,
      description: phase.description,
      timeSpentDays: phase.durationWeeks * 7,
      moneySpent: phase.amount,
    };

    console.log('📤 Creating phase', phaseNumber, ':', requestBody);

    const response = await fetch(
      buildApiUrl(API_ENDPOINTS.PROJECTS.PHASES),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Failed to create phase ${phaseNumber}`);
    }

    console.log('📥 Phase', phaseNumber, 'response:', data);
    return data.id;
  };

  // Render UI based on current step

  // Render mobile layout
  if (shouldRenderMobile) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: '#FFFFFF' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Figma Header - Simple Back Button */}
        <View style={[styles.figmaHeader, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity onPress={onBack} style={styles.figmaBackButton}>
            <Ionicons name="arrow-back" size={24} color="#383838" />
          </TouchableOpacity>
        </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Description Input - Figma Design */}
        {currentStep === 'description' && (
          <View style={styles.figmaFormContainer}>
            {/* Figma AI Icon with amber background */}
            <View style={styles.figmaLogoSection}>
              <View style={styles.figmaAiIconBox}>
                <Ionicons name="chatbubbles" size={32} color="#FFB703" />
              </View>
              <Text style={styles.figmaAiTitle}>{t('AI project generator')}</Text>
            </View>

            {/* Figma Description Text */}
            <Text style={styles.figmaDescriptionText}>
              {t('Describe your need and we will help you define the scope of work, cost estimate and the expected duration.')}
            </Text>

            {/* Figma Example Prompt Chip */}
            <TouchableOpacity
              style={styles.figmaExampleChip}
              onPress={() => setDescription(currentExamples[0] || '')}
            >
              <View style={styles.figmaExampleIcon}>
                <Ionicons name="sparkles-outline" size={18} color="#00549B" />
              </View>
              <Text style={styles.figmaExampleText}>
                {currentExamples[0] || t('Renovate bedroom with new flooring and paint including red walls.')}
              </Text>
            </TouchableOpacity>

            {/* Figma Input Area */}
            <View style={styles.figmaInputContainer}>
              <TextInput
                style={styles.figmaTextInput}
                multiline
                value={description}
                onChangeText={setDescription}
                placeholder={t('Write your prompt here...')}
                placeholderTextColor="#003867"
                textAlignVertical="top"
                blurOnSubmit={false}
                onKeyPress={(e: any) => {
                  // Handle Enter key press (for web and some mobile keyboards)
                  if (e.nativeEvent?.key === 'Enter' && !e.nativeEvent?.shiftKey) {
                    if (description.trim() && !isLoading) {
                      e.preventDefault?.();
                      handleDescriptionSubmit();
                    }
                  }
                }}
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (description.trim() && !isLoading) {
                    handleDescriptionSubmit();
                  }
                }}
              />
              <TouchableOpacity
                style={[
                  styles.figmaSendButton,
                  (!description.trim() || isLoading) && styles.figmaSendButtonDisabled,
                ]}
                onPress={handleDescriptionSubmit}
                disabled={isLoading || !description.trim()}
              >
                <Animated.View style={isLoading ? { transform: [{ rotate: loadingSpin }] } : undefined}>
                  <Ionicons name="sparkles" size={12} color="#E6EFF7" />
                </Animated.View>
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}
          </View>
        )}

        {/* Step 2: AI Questions - Show all at once */}
        {currentStep === 'questions' && aiQuestions.length > 0 && (
          <View style={styles.formContainer}>
            <View style={styles.questionsHeader}>
              <Ionicons name="help-circle" size={60} color={colors.warning} />
              <Text style={[styles.questionsTitle, { color: colors.text }]}>
                {t('AI has a few questions')}
              </Text>
              <Text style={[styles.questionsSubtitle, { color: colors.textSecondary }]}>
                {t('Please answer these questions to help us create an accurate project')}
              </Text>
            </View>

            {/* Display all questions */}
            <View style={styles.questionsList}>
              {aiQuestions.map((question, index) => (
                <View key={index} style={[styles.questionItem, { backgroundColor: colors.surface }]}>
                  <View style={styles.questionNumberBadge}>
                    <Text style={[styles.questionNumber, { color: colors.primary }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text style={[styles.questionItemText, { color: colors.text }]}>
                    {question}
                  </Text>
                </View>
              ))}
            </View>

            {/* Combined answer textarea */}
            <View style={styles.answersSection}>
              <View style={[styles.labelWithIcon, { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }]}>
                <Ionicons name="chatbox-ellipses" size={20} color={colors.primary} />
                <Text style={[styles.label, { color: colors.text, marginLeft: 8, marginBottom: 0 }]}>
                  {t('Your Answers')} *
                </Text>
              </View>
              <View style={[styles.answersTextAreaWrapper, { borderColor: colors.primary, backgroundColor: colors.cardBackground }]}>
                <Animated.View style={[styles.aiIconAnswer, { transform: [{ scale: pulseAnim }] }]}>
                  <Ionicons name="create" size={24} color={colors.primary} />
                </Animated.View>
                <TextInput
                  style={[styles.answersTextArea, { color: colors.text, flex: 1 }]}
                  value={answersText}
                  onChangeText={setAnswersText}
                  placeholder={t('Provide details to answer the questions above...')}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}

            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={() => {
                  setAiQuestions([]);
                  setAnswersText('');
                  setCurrentStep('description');
                }}
                style={styles.cancelButton}
              >
                {t('Back')}
              </Button>
              <Button
                mode="contained"
                onPress={handleQuestionsSubmit}
                loading={isLoading}
                disabled={!answersText.trim() || isLoading}
                style={[styles.continueButton, { backgroundColor: colors.primary }]}
              >
                {t('Generate Project')}
              </Button>
            </View>
          </View>
        )}

        {/* Step 3: Review & Edit Project */}
        {currentStep === 'review' && (
          <View style={styles.reviewContainer}>
            {finalProject && (
              <>
                {/* AI Generated Success Badge */}
                <View style={styles.aiGeneratedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={FIGMA_COLORS.green80} />
                  <Text style={styles.aiGeneratedBadgeText}>
                    {t('Generated Successfully')}
                  </Text>
                </View>

                {/* Project Creation Flow */}
                <View style={styles.flowContainer}>
                  <ProjectCreationFlow currentStep="CREATING" />
                </View>

                {/* Divider */}
                <View style={[styles.divider, { backgroundColor: FIGMA_COLORS.textDividers }]} />

                {/* Form Header */}
                <View style={styles.formHeader}>
                  <Text style={[styles.formTitle, { color: FIGMA_COLORS.primary100 }]}>
                    {t('Project Generated Successfully')}
                  </Text>
                  <Text style={[styles.formSubtitle, { color: FIGMA_COLORS.textBody }]}>
                    {t('Review and edit your project details before submitting. Service providers will send bids once submitted.')}
                  </Text>
                </View>

                {isEditing && editedProject ? (
                  // Edit Mode
                  <View>
                    {/* Title Section */}
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="document-text-outline" size={14} color={FIGMA_COLORS.primary80} />
                        <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.primary80 }]}>
                          {t('Title')}
                        </Text>
                      </View>
                      <View style={[styles.inputContainer, styles.editableInput, { backgroundColor: FIGMA_COLORS.white, borderColor: FIGMA_COLORS.textDividers }]}>
                        <TextInput
                          style={[styles.textArea, { color: FIGMA_COLORS.textBody, backgroundColor: FIGMA_COLORS.white }]}
                          value={editedProject.title}
                          onChangeText={(text) => handleEditField('title', text)}
                          placeholder={t('Enter project title')}
                          placeholderTextColor={FIGMA_COLORS.textSecondary}
                        />
                      </View>
                    </View>

                    {/* Description Section */}
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="document-text-outline" size={14} color={FIGMA_COLORS.primary80} />
                        <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.primary80 }]}>
                          {t('Description')} *
                        </Text>
                      </View>
                      <View style={[styles.inputContainer, styles.editableInput, { backgroundColor: FIGMA_COLORS.white, borderColor: FIGMA_COLORS.textDividers }]}>
                        <TextInput
                          style={[styles.textArea, { color: FIGMA_COLORS.textBody, backgroundColor: FIGMA_COLORS.white, minHeight: 120 }]}
                          value={editedProject.description}
                          onChangeText={(text) => handleEditField('description', text)}
                          multiline
                          numberOfLines={6}
                          textAlignVertical="top"
                          placeholder={t('Describe your project needs in detail...')}
                          placeholderTextColor={FIGMA_COLORS.textSecondary}
                        />
                      </View>
                    </View>

                    {/* Address Section */}
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="location-outline" size={14} color={FIGMA_COLORS.primary80} />
                        <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.primary80 }]}>
                          {t('Project Address')} ({t('Optional')})
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.addressButton, styles.editableInput, { backgroundColor: FIGMA_COLORS.white, borderColor: FIGMA_COLORS.textDividers, flex: 1 }]}
                          onPress={() => setShowMapPicker(true)}
                        >
                          <Ionicons name="location" size={18} color={FIGMA_COLORS.primary60} />
                          <Text 
                            style={[styles.addressText, { color: editedProject.address ? FIGMA_COLORS.textBody : FIGMA_COLORS.textSecondary }]} 
                            numberOfLines={1}
                          >
                            {editedProject.address || t('Select location on map')}
                          </Text>
                          <Ionicons name="chevron-forward" size={18} color={FIGMA_COLORS.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setShowMapPicker(true)}
                          style={[styles.mapButtonSmall, { backgroundColor: FIGMA_COLORS.primary60 }]}
                        >
                          <Ionicons name="map" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Budget & Duration Row */}
                    <View style={styles.cardsRow}>
                      {/* Budget Card */}
                      <View style={[styles.statCard, { backgroundColor: FIGMA_COLORS.white, borderColor: FIGMA_COLORS.textDividers, flex: 1, minWidth: 0 }]}>
                        <View style={styles.statCardHeader}>
                          <Ionicons name="cash-outline" size={14} color={FIGMA_COLORS.primary80} />
                          <Text style={[styles.statCardLabel, { color: FIGMA_COLORS.primary80 }]}>
                            {t('Budget')} (SAR)
                          </Text>
                        </View>
                        {editedProject.budgetUnspecified ? (
                          <Text style={[styles.statCardValue, { color: FIGMA_COLORS.textSecondary }]}>
                            {t('Unspecified')}
                          </Text>
                        ) : (
                          <View style={[styles.budgetInputWrapper, { backgroundColor: FIGMA_COLORS.primary10, borderColor: FIGMA_COLORS.textDividers }]}>
                            <TextInput
                              style={[styles.budgetInput, { color: FIGMA_COLORS.textBody }]}
                              value={editedProject.budget?.toString() || ''}
                              onChangeText={(text) => handleEditField('budget', parseFloat(text) || 0)}
                              placeholder="0"
                              placeholderTextColor={FIGMA_COLORS.textSecondary}
                              keyboardType="numeric"
                            />
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() => {
                            const newValue = !editedProject.budgetUnspecified;
                            handleEditField('budgetUnspecified', newValue);
                            if (newValue) {
                              handleEditField('budget', null);
                            }
                          }}
                          style={styles.checkboxContainer}
                        >
                          <Ionicons
                            name={editedProject.budgetUnspecified ? 'checkbox' : 'checkbox-outline'}
                            size={16}
                            color={editedProject.budgetUnspecified ? FIGMA_COLORS.primary60 : FIGMA_COLORS.textSecondary}
                          />
                          <Text style={[styles.checkboxText, { color: FIGMA_COLORS.textSecondary }]}>
                            {t('Unspecified')}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Duration Card */}
                      <View style={[styles.statCard, { backgroundColor: FIGMA_COLORS.white, borderColor: FIGMA_COLORS.textDividers, flex: 1, minWidth: 0 }]}>
                        <View style={styles.statCardHeader}>
                          <Ionicons name="time-outline" size={14} color={FIGMA_COLORS.green80} />
                          <Text style={[styles.statCardLabel, { color: FIGMA_COLORS.green80 }]}>
                            {t('Duration')} ({t('weeks')})
                          </Text>
                        </View>
                        <View style={[styles.budgetInputWrapper, { backgroundColor: FIGMA_COLORS.green10, borderColor: FIGMA_COLORS.textDividers }]}>
                          <TextInput
                            style={[styles.budgetInput, { color: FIGMA_COLORS.textBody }]}
                            value={editedProject.durationWeeks?.toString() || ''}
                            onChangeText={(text) => handleEditField('durationWeeks', parseInt(text) || 1)}
                            placeholder="0"
                            placeholderTextColor={FIGMA_COLORS.textSecondary}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    </View>

                    {/* Bid Deadline */}
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="time-outline" size={14} color={FIGMA_COLORS.green80} />
                        <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.green80 }]}>
                          {t('Bid Deadline')} ({t('Optional')})
                        </Text>
                      </View>
                      {editedProject.bidsCloseAt ? (
                        <View style={[styles.dateValueContainer, { backgroundColor: FIGMA_COLORS.green10, borderColor: FIGMA_COLORS.green80 }]}>
                          <Text style={[styles.statCardValue, { color: FIGMA_COLORS.textBody, flex: 1 }]} numberOfLines={1}>
                            {formatDateForDisplay(editedProject.bidsCloseAt)}
                          </Text>
                          <TouchableOpacity onPress={() => handleEditField('bidsCloseAt', '')}>
                            <Ionicons name="close-circle" size={18} color={colors.error || '#F44336'} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.datePickerRow}>
                          <TouchableOpacity style={[styles.miniDateButton, { backgroundColor: FIGMA_COLORS.green10 }]} onPress={handlePickDate}>
                            <Ionicons name="calendar-outline" size={14} color={FIGMA_COLORS.green80} />
                            <Text style={[styles.miniDateText, { color: FIGMA_COLORS.green80 }]}>
                              {t('Date')}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.miniDateButton, { backgroundColor: FIGMA_COLORS.green10 }]} onPress={handlePickTime}>
                            <Ionicons name="time-outline" size={14} color={FIGMA_COLORS.green80} />
                            <Text style={[styles.miniDateText, { color: FIGMA_COLORS.green80 }]}>
                              {t('Time')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {/* Photos Section */}
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="images-outline" size={14} color={FIGMA_COLORS.primary80} />
                        <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.primary80 }]}>
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
                            style={[styles.addPhotoButton, { borderColor: FIGMA_COLORS.primary60, backgroundColor: FIGMA_COLORS.primary10 }]}
                            onPress={pickImages}
                          >
                            <Ionicons name="add" size={28} color={FIGMA_COLORS.primary60} />
                            <Text style={[styles.addPhotoText, { color: FIGMA_COLORS.primary60 }]}>{t('Add')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* Edit Buttons */}
                    <View style={styles.editButtonsRow}>
                      <TouchableOpacity
                        style={[styles.cancelEditButton, { backgroundColor: FIGMA_COLORS.purple10, borderColor: FIGMA_COLORS.purple100 }]}
                        onPress={() => setIsEditing(false)}
                      >
                        <Text style={[styles.cancelEditButtonText, { color: FIGMA_COLORS.purple100 }]}>
                          {t('Cancel')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveEditButton, { backgroundColor: FIGMA_COLORS.primary60 }]}
                        onPress={handleSaveEdits}
                      >
                        <Text style={styles.saveEditButtonText}>
                          {t('Save')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  // View Mode
                  <View>
                    {/* Project Overview Section */}
                    <View style={styles.section}>
                      <Text style={[styles.sectionHeaderTitle, { color: FIGMA_COLORS.primary100 }]}>{t('Project Overview')}</Text>
                      <Text style={[styles.sectionDescription, { color: FIGMA_COLORS.textBody }]}>
                        {t('Review your project details below. Once submitted, service providers will start sending bids.')}
                      </Text>
                      
                      {/* Budget and Duration Cards */}
                      <View style={styles.statsRow}>
                        <View style={[styles.statCard, styles.budgetCard, { flex: 1 }]}>
                          <View style={styles.statHeader}>
                            <Ionicons name="cash-outline" size={12} color={FIGMA_COLORS.primary80} />
                            <Text style={[styles.statTitle, { color: FIGMA_COLORS.primary80 }]}>{t('Total Budget')}</Text>
                          </View>
                          <Text style={[styles.statValue, { color: FIGMA_COLORS.textSecondary }]}>
                            {finalProject?.budgetUnspecified ? t('Unspecified') : `${finalProject?.budget || 0} ${t('SAR')}`}
                          </Text>
                        </View>
                        <View style={[styles.statCard, styles.durationCard, { flex: 1 }]}>
                          <View style={styles.statHeader}>
                            <Ionicons name="time-outline" size={12} color={FIGMA_COLORS.green90} />
                            <Text style={[styles.statTitle, { color: FIGMA_COLORS.green90 }]}>{t('Duration')}</Text>
                          </View>
                          <Text style={[styles.statValue, { color: FIGMA_COLORS.textSecondary }]}>
                            {finalProject?.durationWeeks || 0} {t('weeks')}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Description Section */}
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="document-text-outline" size={12} color={FIGMA_COLORS.primary80} />
                        <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.primary80 }]}>{t('Description')}</Text>
                      </View>
                      <View style={styles.descriptionBox}>
                        <Text style={[styles.descriptionText, { color: FIGMA_COLORS.textBody }]}>{finalProject?.description || ''}</Text>
                      </View>
                    </View>

                    {/* Address Section */}
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="location-outline" size={12} color={FIGMA_COLORS.primary80} />
                        <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.primary80 }]}>{t('Address')}</Text>
                      </View>
                      {finalProject?.address ? (
                        <TouchableOpacity
                          style={[styles.addressRow, { backgroundColor: FIGMA_COLORS.primary10, borderRadius: 6, padding: 12 }]}
                          onPress={() => setShowMapPicker(true)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="location" size={20} color={FIGMA_COLORS.primary60} />
                          <Text style={[styles.addressText, { color: FIGMA_COLORS.textBody, flex: 1, marginLeft: 8 }]}>
                            {finalProject.address}
                          </Text>
                          <Ionicons name="create-outline" size={18} color={FIGMA_COLORS.primary60} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.addressRow, { backgroundColor: FIGMA_COLORS.primary10, borderRadius: 6, padding: 16, borderWidth: 2, borderColor: FIGMA_COLORS.primary60, borderStyle: 'dashed' }]}
                          onPress={() => setShowMapPicker(true)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="map-outline" size={24} color={FIGMA_COLORS.primary60} />
                          <Text style={[styles.addressText, { color: FIGMA_COLORS.primary60, flex: 1, marginLeft: 8, fontWeight: '600' }]}>
                            {t('Tap to add project address')}
                          </Text>
                          <Ionicons name="chevron-forward" size={20} color={FIGMA_COLORS.primary60} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Photos Section */}
                    {photos.length > 0 && (
                      <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                          <Ionicons name="images-outline" size={12} color={FIGMA_COLORS.primary80} />
                          <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.primary80 }]}>
                            {t('Project Photos')} ({photos.length}/5)
                          </Text>
                        </View>
                        <View style={styles.photosContainer}>
                          {photos.map((uri, index) => (
                            <View key={index} style={styles.photoWrapper}>
                              <TouchableOpacity
                                onPress={() => handleViewPhoto(index)}
                                activeOpacity={0.8}
                                style={{ flex: 1 }}
                              >
                                <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.removePhoto}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  removePhoto(index);
                                }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <Ionicons name="close-circle" size={28} color="#fff" />
                              </TouchableOpacity>
                            </View>
                          ))}
                          {photos.length < 5 && (
                            <TouchableOpacity 
                              style={[styles.addPhotoButton, { borderColor: FIGMA_COLORS.primary60, backgroundColor: FIGMA_COLORS.primary10 }]} 
                              onPress={pickImages}
                            >
                              <Ionicons name="add" size={28} color={FIGMA_COLORS.primary60} />
                              <Text style={[styles.addPhotoText, { color: FIGMA_COLORS.primary60 }]}>{t('Add')}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Work Phases Section */}
                    {(finalProject?.phases || editedPhases).length > 0 && (
                      <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                          <Ionicons name="document-text-outline" size={12} color={FIGMA_COLORS.primary80} />
                          <Text style={[styles.sectionLabel, { color: FIGMA_COLORS.primary80 }]}>{t('Work Phases')}</Text>
                        </View>
                        {(editedPhases.length > 0 ? editedPhases : (finalProject?.phases || [])).map((phase, index) => {
                          const formatBudget = (amount: number) => {
                            return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
                              style: 'currency',
                              currency: 'SAR',
                              minimumFractionDigits: 0,
                            }).format(amount);
                          };

                          return (
                            <View key={index} style={styles.unifiedPhaseCard}>
                              <View style={styles.unifiedPhaseHeader}>
                                <View style={styles.unifiedPhaseHeaderLeft}>
                                  <View style={styles.unifiedPhaseNumberBadge}>
                                    <Text style={styles.unifiedPhaseNumberText}>{index + 1}</Text>
                                  </View>
                                  <Text style={styles.unifiedPhaseTitle} numberOfLines={2}>
                                    {phase.title}
                                  </Text>
                                </View>
                                <Text style={styles.unifiedPhasePrice}>
                                  {formatBudget(phase.amount)}
                                </Text>
                              </View>
                              
                              <Text style={styles.unifiedPhaseDescription}>
                                {phase.description}
                              </Text>
                              
                              <View style={styles.unifiedPhaseDurationRow}>
                                <Ionicons name="time-outline" size={12} color={FIGMA_COLORS.textSecondary} />
                                <Text style={styles.unifiedPhaseDurationText}>
                                  {phase.durationWeeks} {t('Week')}
                                </Text>
                              </View>

                              <View style={styles.unifiedPhaseActions}>
                                <TouchableOpacity
                                  style={[styles.unifiedPhaseActionButton, { backgroundColor: FIGMA_COLORS.primary60 }]}
                                  onPress={() => {
                                    if (!isEditing) {
                                      if (editedPhases.length === 0 && finalProject?.phases) {
                                        setEditedPhases([...finalProject.phases]);
                                      }
                                    }
                                    handleEditPhase(index);
                                  }}
                                >
                                  <Ionicons name="pencil" size={16} color="#fff" />
                                  <Text style={styles.unifiedPhaseActionText}>{t('Edit')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.unifiedPhaseActionButton, { backgroundColor: colors.error || '#F44336' }]}
                                  onPress={() => {
                                    if (!isEditing) {
                                      if (editedPhases.length === 0 && finalProject?.phases) {
                                        setEditedPhases([...finalProject.phases]);
                                      }
                                    }
                                    handleDeletePhase(index);
                                  }}
                                >
                                  <Ionicons name="trash" size={16} color="#fff" />
                                  <Text style={styles.unifiedPhaseActionText}>{t('Delete')}</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}

                {/* Action Buttons */}
                {!isEditing && finalProject && (
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.unifiedActionButton, styles.unifiedEditButton]}
                      onPress={() => setIsEditing(true)}
                    >
                      <Text style={styles.unifiedActionButtonText}>{t('Edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.unifiedActionButton, styles.unifiedSubmitButton]}
                      onPress={() => submitProject(finalProject)}
                    >
                      <Text style={[styles.unifiedActionButtonText, { color: FIGMA_COLORS.white }]}>
                        {technician ? t('Send Deal') : t('Confirm & Submit')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Loading Overlay with Progress */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.progressCircle}>
              <View style={[styles.progressCircleBackground, { borderColor: colors.border }]} />
                  <View
                    style={[
                  styles.progressCircleFill, 
                  { 
                    borderColor: colors.primary,
                    transform: [{ rotate: `${submissionProgress * 360}deg` }]
                  }
                ]} 
              />
              <View style={styles.progressCircleCenter}>
                <Text style={[styles.progressPercentage, { color: colors.text }]}>
                  {Math.round(submissionProgress * 100)}%
                </Text>
                  </View>
              </View>

            <View style={styles.loadingTextContainer}>
              <Text style={[styles.loadingTitle, { color: colors.text }]}>
                {t('Uploading Project')}
              </Text>
              <Text style={[styles.loadingMessage, { color: colors.textSecondary }]}>
                {submissionMessage}
              </Text>
              </View>

            <View style={styles.loadingDots}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <View style={[styles.dot, { backgroundColor: colors.primary, opacity: 0.7 }]} />
              <View style={[styles.dot, { backgroundColor: colors.primary, opacity: 0.4 }]} />
              </View>
          </View>
          </View>
        )}

      {/* Location Picker Modal */}
      {showMapPicker && (
        <LocationPicker
          initialLocation={
            editedProject?.latitude && editedProject?.longitude 
              ? { latitude: editedProject.latitude, longitude: editedProject.longitude } 
              : undefined
          }
          initialAddress={editedProject?.address}
          onLocationSelect={(location) => {
            // Update address whether in edit mode or not
            if (editedProject) {
              setEditedProject({
                ...editedProject,
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address,
              });
            }
            if (finalProject) {
              setFinalProject({
                ...finalProject,
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address,
              });
            }
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

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={[styles.successModalContent, { backgroundColor: colors.cardBackground }]}>
            <Animated.View style={[styles.successIconContainer, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="checkmark-circle" size={80} color={colors.success} />
            </Animated.View>
            <Text style={[styles.successModalTitle, { color: colors.text }]}>
              {t('Success')}
            </Text>
            <Text style={[styles.successModalMessage, { color: colors.textSecondary }]}>
              {technician ? t('Deal sent successfully!') : t('Project submitted successfully!')}
            </Text>
            <ActivityIndicator size="small" color={colors.primary} style={styles.successModalLoader} />
            <Text style={[styles.successModalSubtext, { color: colors.textTertiary }]}>
              {t('Redirecting to home...')}
            </Text>
          </View>
        </View>
      </Modal>
      
      {/* Phase Edit Modal */}
      <Modal
        visible={showPhaseEditModal && editingPhase !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelPhaseEdit}
      >
        <View style={styles.phaseEditModalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.phaseEditModalContainer}
          >
            <View style={[styles.phaseEditModalContent, { backgroundColor: FIGMA_COLORS.white }]}>
              {/* Modal Header */}
              <View style={styles.phaseEditModalHeader}>
                <Text style={[styles.phaseEditModalTitle, { color: FIGMA_COLORS.primary100 }]}>
                  {t('Edit Phase')} {editingPhaseIndex !== null ? editingPhaseIndex + 1 : ''}
                </Text>
                <TouchableOpacity onPress={handleCancelPhaseEdit}>
                  <Ionicons name="close" size={24} color={FIGMA_COLORS.textBody} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.phaseEditModalScroll} showsVerticalScrollIndicator={false}>
                {editingPhase && (
                  <View style={styles.phaseEditModalBody}>
                    {/* Title */}
                    <View style={styles.phaseEditModalSection}>
                      <Text style={[styles.phaseEditModalLabel, { color: FIGMA_COLORS.primary80 }]}>{t('Title')}</Text>
                      <TextInput
                        style={[styles.phaseEditModalInput, { backgroundColor: FIGMA_COLORS.primary10, color: FIGMA_COLORS.textBody, borderColor: FIGMA_COLORS.textDividers }]}
                        value={editingPhase.title}
                        onChangeText={(text) => handleUpdatePhaseField('title', text)}
                        placeholder={t('Phase title')}
                        placeholderTextColor={FIGMA_COLORS.textSecondary}
                      />
                    </View>

                    {/* Description */}
                    <View style={styles.phaseEditModalSection}>
                      <Text style={[styles.phaseEditModalLabel, { color: FIGMA_COLORS.primary80 }]}>{t('Description')}</Text>
                      <TextInput
                        style={[styles.phaseEditModalInput, { backgroundColor: FIGMA_COLORS.primary10, color: FIGMA_COLORS.textBody, borderColor: FIGMA_COLORS.textDividers, minHeight: 100 }]}
                        value={editingPhase.description}
                        onChangeText={(text) => handleUpdatePhaseField('description', text)}
                        placeholder={t('Phase description')}
                        placeholderTextColor={FIGMA_COLORS.textSecondary}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>

                    {/* Duration, Amount, Percentage Row */}
                    <View style={styles.phaseEditModalRow}>
                      <View style={[styles.phaseEditModalSection, { flex: 1 }]}>
                        <Text style={[styles.phaseEditModalLabel, { color: FIGMA_COLORS.primary80 }]}>{t('Duration (weeks)')}</Text>
                        <TextInput
                          style={[styles.phaseEditModalInput, { backgroundColor: FIGMA_COLORS.primary10, color: FIGMA_COLORS.textBody, borderColor: FIGMA_COLORS.textDividers }]}
                          value={editingPhase.durationWeeks.toString()}
                          onChangeText={(text) => handleUpdatePhaseField('durationWeeks', parseInt(text) || 1)}
                          keyboardType="numeric"
                          placeholderTextColor={FIGMA_COLORS.textSecondary}
                        />
                      </View>
                      <View style={[styles.phaseEditModalSection, { flex: 1 }]}>
                        <Text style={[styles.phaseEditModalLabel, { color: FIGMA_COLORS.primary80 }]}>{t('Amount (SAR)')}</Text>
                        <TextInput
                          style={[styles.phaseEditModalInput, { backgroundColor: FIGMA_COLORS.primary10, color: FIGMA_COLORS.textBody, borderColor: FIGMA_COLORS.textDividers }]}
                          value={editingPhase.amount.toString()}
                          onChangeText={(text) => handleUpdatePhaseField('amount', parseFloat(text) || 0)}
                          keyboardType="numeric"
                          placeholderTextColor={FIGMA_COLORS.textSecondary}
                        />
                      </View>
                      <View style={[styles.phaseEditModalSection, { flex: 1 }]}>
                        <Text style={[styles.phaseEditModalLabel, { color: FIGMA_COLORS.primary80 }]}>{t('Percentage')}</Text>
                        <TextInput
                          style={[styles.phaseEditModalInput, { backgroundColor: FIGMA_COLORS.primary10, color: FIGMA_COLORS.textBody, borderColor: FIGMA_COLORS.textDividers }]}
                          value={editingPhase.percentage.toString()}
                          onChangeText={(text) => handleUpdatePhaseField('percentage', parseFloat(text) || 0)}
                          keyboardType="numeric"
                          placeholderTextColor={FIGMA_COLORS.textSecondary}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.phaseEditModalFooter}>
                <TouchableOpacity
                  style={[styles.phaseEditModalButton, styles.phaseEditModalCancelButton]}
                  onPress={handleCancelPhaseEdit}
                >
                  <Text style={[styles.phaseEditModalButtonText, { color: FIGMA_COLORS.purple100 }]}>
                    {t('Cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.phaseEditModalButton, styles.phaseEditModalSaveButton]}
                  onPress={() => editingPhaseIndex !== null && handleSavePhaseEdit(editingPhaseIndex)}
                >
                  <Text style={[styles.phaseEditModalButtonText, { color: FIGMA_COLORS.white }]}>
                    {t('Save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

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
          
          {photos.length > 1 && (
            <View style={styles.slideshowCounter}>
              <Text style={styles.slideshowCounterText}>
                {currentPhotoIndex + 1} / {photos.length}
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
              {photos.map((photo, index) => {
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
          
          {photos.length > 1 && (
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
                  currentPhotoIndex === photos.length - 1 && styles.slideshowNavButtonDisabled,
                ]}
                onPress={handleNextPhoto}
                disabled={currentPhotoIndex === photos.length - 1}
              >
                <Ionicons
                  name="chevron-forward"
                  size={32}
                  color={currentPhotoIndex === photos.length - 1 ? 'rgba(255, 255, 255, 0.3)' : '#fff'}
                />
              </TouchableOpacity>
              
              <View style={styles.slideshowDots}>
                {photos.map((_, index) => (
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
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
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
    </KeyboardAvoidingView>
  );
}

  // Render desktop layout - reuse mobile content but with desktop styling
  return (
    <View style={[styles.desktopContainer, { backgroundColor: colors.background }]}>
      {/* Desktop Header */}
      <View style={[styles.desktopHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.desktopBackButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.desktopHeaderTitle, { color: colors.text }]}>{t('AI Project Generator')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.desktopScrollView}
        contentContainerStyle={styles.desktopScrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Reuse mobile content structure with desktop styles applied via conditional styling */}
        {/* Step 1: Description Input */}
        {currentStep === 'description' && (
          <View style={styles.desktopFormContainer}>
            <View style={styles.desktopIconSection}>
              <Ionicons name="sparkles" size={80} color={colors.primary} />
              <Text style={[styles.desktopTitle, { color: colors.text }]}>{t('AI Project Generator')}</Text>
              <Text style={[styles.desktopSubtitle, { color: colors.textSecondary }]}>
                {t('Describe your project needs and let AI help you create the perfect project')}
              </Text>
            </View>

            <View style={[styles.desktopInputSection, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.desktopLabelRow}>
                <Ionicons name="document-text" size={24} color={colors.primary} />
                <Text style={[styles.desktopLabel, { color: colors.text }]}>
                  {t('Project Description')} *
                </Text>
              </View>
              <View style={[styles.desktopTextAreaWrapper, { borderColor: colors.primary, backgroundColor: colors.background }]}>
                <Animated.View style={[styles.desktopAiIcon, { transform: [{ scale: pulseAnim }, { rotate: spin }] }]}>
                  <Ionicons name="sparkles" size={28} color={colors.primary} />
                </Animated.View>
                <TextInput
                  style={[styles.desktopTextArea, { color: colors.text }]}
                  multiline
                  numberOfLines={10}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('E.g., I need to renovate my kitchen with modern cabinets...')}
                  placeholderTextColor={colors.textTertiary}
                  textAlignVertical="top"
                />
              </View>

              {/* Example prompts */}
              <View style={styles.desktopExamplesContainer}>
                <Text style={[styles.desktopExamplesTitle, { color: colors.textSecondary }]}>{t('Examples')}:</Text>
                <View style={styles.desktopExamplesGrid}>
                  {currentExamples.slice(0, 3).map((example, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.desktopExampleItem, { backgroundColor: colors.background }]}
                      onPress={() => setDescription(example)}
                    >
                      <Ionicons name="bulb" size={24} color={colors.warning} />
                      <Text style={[styles.desktopExampleText, { color: colors.text }]}>{example}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {error && (
                <View style={styles.desktopErrorContainer}>
                  <Ionicons name="alert-circle" size={24} color={colors.error} />
                  <Text style={[styles.desktopErrorText, { color: colors.error }]}>{error}</Text>
                </View>
              )}

              <Button
                mode="contained"
                onPress={handleDescriptionSubmit}
                loading={isLoading}
                disabled={isLoading || !description.trim()}
                style={[styles.desktopSubmitButton, { backgroundColor: colors.primary }]}
                contentStyle={styles.desktopSubmitButtonContent}
              >
                {t('Continue to Recommendations')}
              </Button>
            </View>
          </View>
        )}

        {/* Step 2: AI Questions - Desktop */}
        {currentStep === 'questions' && aiQuestions.length > 0 && (
          <View style={styles.desktopFormContainer}>
            <View style={styles.desktopQuestionsHeader}>
              <Ionicons name="help-circle" size={80} color={colors.warning} />
              <Text style={[styles.desktopQuestionsTitle, { color: colors.text }]}>
                {t('AI has a few questions')}
              </Text>
              <Text style={[styles.desktopQuestionsSubtitle, { color: colors.textSecondary }]}>
                {t('Please answer these questions to help us create an accurate project')}
              </Text>
            </View>

            <View style={[styles.desktopQuestionsContainer, { backgroundColor: colors.cardBackground }]}>
              {/* Display all questions */}
              <View style={styles.desktopQuestionsList}>
                {aiQuestions.map((question, index) => (
                  <View key={index} style={[styles.desktopQuestionItem, { backgroundColor: colors.background }]}>
                    <View style={[styles.desktopQuestionNumberBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.desktopQuestionNumber}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text style={[styles.desktopQuestionItemText, { color: colors.text }]}>
                      {question}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Combined answer textarea */}
              <View style={styles.desktopAnswersSection}>
                <View style={styles.desktopLabelRow}>
                  <Ionicons name="chatbox-ellipses" size={24} color={colors.primary} />
                  <Text style={[styles.desktopLabel, { color: colors.text }]}>
                    {t('Your Answers')} *
                  </Text>
                </View>
                <View style={[styles.desktopAnswersTextAreaWrapper, { borderColor: colors.primary, backgroundColor: colors.background }]}>
                  <Animated.View style={[styles.desktopAiIconAnswer, { transform: [{ scale: pulseAnim }] }]}>
                    <Ionicons name="create" size={28} color={colors.primary} />
                  </Animated.View>
                  <TextInput
                    style={[styles.desktopAnswersTextArea, { color: colors.text }]}
                    value={answersText}
                    onChangeText={setAnswersText}
                    placeholder={t('Provide details to answer the questions above...')}
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={12}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {error && (
                <View style={styles.desktopErrorContainer}>
                  <Ionicons name="alert-circle" size={24} color={colors.error} />
                  <Text style={[styles.desktopErrorText, { color: colors.error }]}>{error}</Text>
                </View>
              )}

              <View style={styles.desktopButtonRow}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setAiQuestions([]);
                    setAnswersText('');
                    setCurrentStep('description');
                  }}
                  style={styles.desktopCancelButton}
                >
                  {t('Back')}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleQuestionsSubmit}
                  loading={isLoading}
                  disabled={!answersText.trim() || isLoading}
                  style={[styles.desktopContinueButton, { backgroundColor: colors.primary }]}
                  contentStyle={styles.desktopSubmitButtonContent}
                >
                  {t('Generate Project')}
                </Button>
              </View>
            </View>
          </View>
        )}

        {/* Step 3: Review & Edit Project - Desktop */}
        {currentStep === 'review' && (
          <View style={styles.desktopFormContainer}>
            {finalProject && (
              <View>
                {/* AI Generated Success Badge */}
                <View style={styles.aiGeneratedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={FIGMA_COLORS.green80} />
                  <Text style={styles.aiGeneratedBadgeText}>
                    {t('Generated Successfully')}
                  </Text>
                </View>

                <View style={styles.desktopSuccessIcon}>
                  <Ionicons name="checkmark-circle" size={90} color={colors.success} />
                </View>
                <Text style={[styles.desktopSuccessTitle, { color: colors.success }]}>
                  {t('Project Generated Successfully')}
                </Text>

                <View style={[styles.desktopProjectCard, { backgroundColor: colors.cardBackground }]}>
                  {isEditing && editedProject ? (
                    // Edit Mode - Desktop
                    <View style={styles.desktopEditForm}>
                      <View style={styles.desktopSection}>
                        <Text style={[styles.desktopLabel, { color: colors.text }]}>{t('Title')}</Text>
                        <TextInput
                          style={[styles.desktopInput, { backgroundColor: colors.background, color: colors.text }]}
                          value={editedProject.title}
                          onChangeText={(text) => handleEditField('title', text)}
                        />
                      </View>

                      <View style={styles.desktopSection}>
                        <Text style={[styles.desktopLabel, { color: colors.text }]}>{t('Description')}</Text>
                        <TextInput
                          style={[styles.desktopTextArea, { backgroundColor: colors.background, color: colors.text }]}
                          value={editedProject.description}
                          onChangeText={(text) => handleEditField('description', text)}
                          multiline
                          numberOfLines={6}
                          textAlignVertical="top"
                        />
                      </View>

                      <View style={styles.desktopRow}>
                        <View style={[styles.desktopSection, { flex: 1, marginRight: 16 }]}>
                          <View style={styles.desktopLabelRow}>
                            <Text style={[styles.desktopLabel, { color: colors.text, flex: 1 }]}>{t('Address')}</Text>
                            <TouchableOpacity
                              onPress={() => setShowMapPicker(true)}
                              style={[styles.desktopMapButtonSmall, { backgroundColor: colors.primary }]}
                            >
                              <Ionicons name="map" size={20} color="#fff" />
                            </TouchableOpacity>
                          </View>
                          <TextInput
                            style={[styles.desktopInput, { backgroundColor: colors.background, color: colors.text }]}
                            value={editedProject.address || ''}
                            onChangeText={(text) => handleEditField('address', text)}
                            placeholder={t('Enter project address')}
                            placeholderTextColor={colors.textTertiary}
                          />
                        </View>
                      </View>

                      <View style={styles.desktopRow}>
                        <View style={[styles.desktopSection, { flex: 1, marginRight: 16 }]}>
                          <View style={styles.desktopToggleRow}>
                            <Text style={[styles.desktopLabel, { color: colors.text, marginBottom: 0 }]}>{t('Budget (SAR)')}</Text>
                            <View style={styles.toggleRow}>
                              <Text style={[styles.desktopLabel, { color: colors.textSecondary, fontSize: 12, marginRight: 8, marginBottom: 0 }]}>
                                {t('No specific budget')}
                              </Text>
                              <Switch
                                value={editedProject.budgetUnspecified || false}
                                onValueChange={(value) => {
                                  handleEditField('budgetUnspecified', value);
                                  if (value) {
                                    handleEditField('budget', null); // Clear budget when toggle is ON
                                  }
                                }}
                                color={colors.primary}
                              />
                            </View>
                          </View>
                          {!editedProject.budgetUnspecified && (
                            <TextInput
                              style={[styles.desktopInput, { backgroundColor: colors.background, color: colors.text, marginTop: 12 }]}
                              value={editedProject.budget?.toString() || ''}
                              onChangeText={(text) => handleEditField('budget', parseFloat(text) || 0)}
                              placeholder={t('Enter budget')}
                              placeholderTextColor={colors.textTertiary}
                              keyboardType="numeric"
                            />
                          )}
                          {editedProject.budgetUnspecified && (
                            <Text style={[styles.hintText, { color: colors.textSecondary, marginTop: 12 }]}>
                              {t('Budget will be shown as unspecified to technicians')}
                            </Text>
                          )}
                        </View>

                        <View style={[styles.desktopSection, { flex: 1, marginLeft: 16 }]}>
                          <Text style={[styles.desktopLabel, { color: colors.text }]}>{t('Duration (weeks)')}</Text>
                          <TextInput
                            style={[styles.desktopInput, { backgroundColor: colors.background, color: colors.text }]}
                            value={editedProject.durationWeeks?.toString() || ''}
                            onChangeText={(text) => handleEditField('durationWeeks', parseInt(text) || 1)}
                            placeholder={t('Enter duration')}
                            placeholderTextColor={colors.textTertiary}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>

                      <View style={styles.desktopSection}>
                        <View style={styles.desktopToggleRow}>
                          <Text style={[styles.desktopLabel, { color: colors.text, marginBottom: 0 }]}>
                            {t('Needs House Visit')}
                          </Text>
                          <Switch
                            value={editedProject.needsHouseVisit}
                            onValueChange={(value) => handleEditField('needsHouseVisit', value)}
                            color={colors.primary}
                          />
                        </View>
                        <View style={styles.desktopToggleRow}>
                          <Text style={[styles.desktopLabel, { color: colors.text, marginBottom: 0 }]}>
                            {t('Needs Booking')}
                          </Text>
                          <Switch
                            value={editedProject.needsBooking}
                            onValueChange={(value) => handleEditField('needsBooking', value)}
                            color={colors.primary}
                          />
                        </View>
                      </View>

                      {/* Bid Deadline - Desktop */}
                      <View style={styles.desktopSection}>
                        <Text style={[styles.desktopLabel, { color: colors.text, marginBottom: 8 }]}>
                          {t('Bid Deadline')} ({t('Optional')})
                        </Text>
                        {editedProject.bidsCloseAt ? (
                          <View style={[styles.dateDisplayContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Text style={[styles.dateDisplayText, { color: colors.text }]}>
                              {formatDateForDisplay(editedProject.bidsCloseAt)}
                            </Text>
                            <TouchableOpacity onPress={() => handleEditField('bidsCloseAt', '')} style={styles.clearButton}>
                              <Ionicons name="close-circle" size={20} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.datePickerButtons}>
                            <TouchableOpacity
                              style={[styles.datePickerButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                              onPress={handlePickDate}
                            >
                              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                              <Text style={[styles.datePickerButtonText, { color: colors.text }]}>
                                {t('Pick Date')}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.datePickerButton, { backgroundColor: colors.background, borderColor: colors.border }]}
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

                      {/* Project Phases - Desktop Edit Mode */}
                      {(editedPhases || finalProject?.phases || []).length > 0 && (
                        <View style={styles.desktopSection}>
                          <Text style={[styles.desktopSectionTitle, { color: colors.text }]}>
                            {t('Project Phases')}:
                          </Text>
                          <View style={styles.desktopPhasesGrid}>
                            {editedPhases.map((phase, index) => {
                              const isEditingPhase = editingPhaseIndex === index;

                              return (
                                <View key={index} style={[styles.desktopPhaseCard, { backgroundColor: colors.background }]}>
                                  {isEditingPhase && editingPhase ? (
                                    <View>
                                      <Text style={[styles.desktopCardLabel, { color: colors.textSecondary, marginBottom: 12 }]}>
                                        {t('Phase')} {index + 1}
                                      </Text>
                                      
                                      <Text style={[styles.desktopLabel, { color: colors.text, marginBottom: 8 }]}>{t('Title')}</Text>
                                      <TextInput
                                        style={[styles.desktopInput, { backgroundColor: colors.cardBackground, color: colors.text }]}
                                        value={editingPhase.title}
                                        onChangeText={(text) => handleUpdatePhaseField('title', text)}
                                        placeholder={t('Phase title')}
                                        placeholderTextColor={colors.textTertiary}
                                      />

                                      <Text style={[styles.desktopLabel, { color: colors.text, marginTop: 12, marginBottom: 8 }]}>{t('Description')}</Text>
                                      <TextInput
                                        style={[styles.desktopInput, { backgroundColor: colors.cardBackground, color: colors.text, minHeight: 100 }]}
                                        value={editingPhase.description}
                                        onChangeText={(text) => handleUpdatePhaseField('description', text)}
                                        placeholder={t('Phase description')}
                                        placeholderTextColor={colors.textTertiary}
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                      />

                                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                                        <View style={{ flex: 1 }}>
                                          <Text style={[styles.desktopLabel, { color: colors.text, marginBottom: 8 }]}>{t('Duration (weeks)')}</Text>
                                          <TextInput
                                            style={[styles.desktopInput, { backgroundColor: colors.cardBackground, color: colors.text }]}
                                            value={editingPhase.durationWeeks.toString()}
                                            onChangeText={(text) => handleUpdatePhaseField('durationWeeks', parseInt(text) || 1)}
                                            keyboardType="numeric"
                                            placeholderTextColor={colors.textTertiary}
                                          />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                          <Text style={[styles.desktopLabel, { color: colors.text, marginBottom: 8 }]}>{t('Amount (SAR)')}</Text>
                                          <TextInput
                                            style={[styles.desktopInput, { backgroundColor: colors.cardBackground, color: colors.text }]}
                                            value={editingPhase.amount.toString()}
                                            onChangeText={(text) => handleUpdatePhaseField('amount', parseFloat(text) || 0)}
                                            keyboardType="numeric"
                                            placeholderTextColor={colors.textTertiary}
                                          />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                          <Text style={[styles.desktopLabel, { color: colors.text, marginBottom: 8 }]}>{t('Percentage')}</Text>
                                          <TextInput
                                            style={[styles.desktopInput, { backgroundColor: colors.cardBackground, color: colors.text }]}
                                            value={editingPhase.percentage.toString()}
                                            onChangeText={(text) => handleUpdatePhaseField('percentage', parseFloat(text) || 0)}
                                            keyboardType="numeric"
                                            placeholderTextColor={colors.textTertiary}
                                          />
                                        </View>
                                      </View>

                                      <View style={[styles.desktopPhaseEditActions, { marginTop: 20 }]}>
                                        <TouchableOpacity
                                          style={[styles.desktopPhaseActionButton, { backgroundColor: colors.textTertiary }]}
                                          onPress={handleCancelPhaseEdit}
                                        >
                                          <Ionicons name="close" size={18} color="#fff" />
                                          <Text style={styles.desktopPhaseActionText}>{t('Cancel')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                          style={[styles.desktopPhaseActionButton, { backgroundColor: colors.primary }]}
                                          onPress={() => handleSavePhaseEdit(index)}
                                        >
                                          <Ionicons name="checkmark" size={18} color="#fff" />
                                          <Text style={styles.desktopPhaseActionText}>{t('Save')}</Text>
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                  ) : (
                                    <>
                                      <View style={styles.desktopPhaseHeader}>
                                        <Text style={[styles.desktopPhaseTitle, { color: colors.text }]}>
                                          {phase.title}
                                        </Text>
                                        <Text style={[styles.desktopPhasePercentage, { color: colors.primary }]}>
                                          {phase.percentage}%
                                        </Text>
                                      </View>
                                      <Text style={[styles.desktopPhaseDescription, { color: colors.textSecondary }]}>
                                        {phase.description}
                                      </Text>
                                      <View style={styles.desktopPhaseDetails}>
                                        <Text style={[styles.desktopPhaseDetail, { color: colors.textTertiary }]}>
                                          {phase.durationWeeks} {t('weeks')}
                                        </Text>
                                        <Text style={[styles.desktopPhaseDetail, { color: colors.textTertiary }]}>
                                          {phase.amount} {t('SAR')}
                                        </Text>
                                      </View>
                                      {!isEditingPhase && (
                                        <View style={styles.desktopPhaseActions}>
                                          <TouchableOpacity
                                            style={[styles.desktopPhaseActionButton, { backgroundColor: colors.primary }]}
                                            onPress={() => handleEditPhase(index)}
                                          >
                                            <Ionicons name="pencil" size={18} color="#fff" />
                                            <Text style={styles.desktopPhaseActionText}>{t('Edit')}</Text>
                                          </TouchableOpacity>
                                          <TouchableOpacity
                                            style={[styles.desktopPhaseActionButton, { backgroundColor: colors.error }]}
                                            onPress={() => handleDeletePhase(index)}
                                          >
                                            <Ionicons name="trash" size={18} color="#fff" />
                                            <Text style={styles.desktopPhaseActionText}>{t('Delete')}</Text>
                                          </TouchableOpacity>
                                        </View>
                                      )}
                                    </>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      <View style={styles.desktopEditButtonsRow}>
                        <Button
                          mode="outlined"
                          onPress={() => setIsEditing(false)}
                          style={styles.desktopCancelEditButton}
                        >
                          {t('Cancel')}
                        </Button>
                        <Button
                          mode="contained"
                          onPress={handleSaveEdits}
                          style={[styles.desktopSaveEditButton, { backgroundColor: colors.primary }]}
                          contentStyle={styles.desktopSubmitButtonContent}
                        >
                          {t('Save')}
                        </Button>
                      </View>
                    </View>
                  ) : (
                    // View Mode - Desktop
                    <View style={styles.desktopProjectView}>
                      <View style={styles.desktopSection}>
                        <Text style={[styles.desktopCardLabel, { color: colors.textSecondary }]}>{t('Title')}</Text>
                        <Text style={[styles.desktopCardValue, { color: colors.text }]}>{finalProject?.title || ''}</Text>
                      </View>

                      <View style={styles.desktopSection}>
                        <Text style={[styles.desktopCardLabel, { color: colors.textSecondary }]}>{t('Description')}</Text>
                        <Text style={[styles.desktopCardValue, { color: colors.text }]}>{finalProject?.description || ''}</Text>
                      </View>

                      <View style={styles.desktopDetailsGrid}>
                        <View style={[styles.desktopDetailItem, { backgroundColor: colors.background }]}>
                          <Text style={[styles.desktopDetailLabel, { color: colors.textSecondary }]}>{t('Category')}</Text>
                          <Text style={[styles.desktopDetailValue, { color: colors.text }]}>{finalProject?.category || ''}</Text>
                        </View>
                        <View style={[styles.desktopDetailItem, { backgroundColor: colors.background }]}>
                          <Text style={[styles.desktopDetailLabel, { color: colors.textSecondary }]}>{t('Budget')}</Text>
                          <Text style={[styles.desktopDetailValue, { color: colors.text }]}>{finalProject?.budget || 0} {t('SAR')}</Text>
                        </View>
                        <View style={[styles.desktopDetailItem, { backgroundColor: colors.background }]}>
                          <Text style={[styles.desktopDetailLabel, { color: colors.textSecondary }]}>{t('Duration')}</Text>
                          <Text style={[styles.desktopDetailValue, { color: colors.text }]}>{finalProject?.durationWeeks || 0} {t('weeks')}</Text>
                        </View>
                        <View style={[styles.desktopDetailItem, { backgroundColor: colors.background }]}>
                          <Text style={[styles.desktopDetailLabel, { color: colors.textSecondary }]}>{t('House Visit')}</Text>
                          <Text style={[styles.desktopDetailValue, { color: colors.text }]}>
                            {finalProject?.needsHouseVisit ? t('Yes') : t('No')}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.desktopSection}>
                        <Text style={[styles.desktopCardLabel, { color: colors.textSecondary }]}>{t('Address')}</Text>
                        {finalProject?.address ? (
                          <TouchableOpacity
                            style={[styles.desktopAddressRow, { backgroundColor: colors.background, borderRadius: 12, padding: 16 }]}
                            onPress={() => setShowMapPicker(true)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="location" size={24} color={colors.primary} />
                            <Text style={[styles.desktopAddressText, { color: colors.text, flex: 1, marginLeft: 12 }]}>
                              {finalProject.address}
                            </Text>
                            <Ionicons name="create-outline" size={20} color={colors.primary} />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.desktopAddressRow, { backgroundColor: colors.background, borderRadius: 12, padding: 20, borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed' }]}
                            onPress={() => setShowMapPicker(true)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="map-outline" size={28} color={colors.primary} />
                            <Text style={[styles.desktopAddressText, { color: colors.primary, flex: 1, marginLeft: 12, fontWeight: '600' }]}>
                              {t('Tap to add project address')}
                            </Text>
                            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Photos Section - Desktop */}
                      <View style={styles.desktopSection}>
                        <Text style={[styles.desktopCardLabel, { color: colors.textSecondary }]}>
                          {t('Project Photos')} ({photos.length}/5)
                        </Text>
                        <View style={styles.desktopPhotosContainer}>
                          {photos.map((uri, index) => (
                            <View key={index} style={styles.desktopPhotoWrapper}>
                              <TouchableOpacity
                                onPress={() => handleViewPhoto(index)}
                                activeOpacity={0.8}
                                style={{ flex: 1 }}
                              >
                                <Image source={{ uri }} style={styles.desktopPhoto} resizeMode="cover" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.desktopRemovePhoto}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  removePhoto(index);
                                }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <Ionicons name="close-circle" size={28} color="#fff" />
                              </TouchableOpacity>
                            </View>
                          ))}
                          {photos.length < 5 && (
                            <TouchableOpacity
                              style={[styles.desktopAddPhotoButton, { borderColor: colors.primary }]}
                              onPress={pickImages}
                            >
                              <Ionicons name="add" size={40} color={colors.primary} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* Project Phases - Desktop */}
                      {(finalProject?.phases || editedPhases).length > 0 && (
                        <View style={styles.desktopSection}>
                          <Text style={[styles.desktopSectionTitle, { color: colors.text }]}>
                            {t('Project Phases')}:
                          </Text>
                          <View style={styles.desktopPhasesGrid}>
                            {(editedPhases.length > 0 ? editedPhases : (finalProject?.phases || [])).map((phase, index) => {
                              const isEditingPhase = editingPhaseIndex === index;

                              return (
                                <View key={index} style={[styles.desktopPhaseCard, { backgroundColor: colors.background }]}>
                                  {isEditingPhase && editingPhase ? (
                                    <View>
                                      <Text style={[styles.desktopCardLabel, { color: colors.textSecondary, marginBottom: 12 }]}>
                                        {t('Phase')} {index + 1}
                                      </Text>
                                      
                                      <Text style={[styles.desktopLabel, { color: colors.text, marginBottom: 8 }]}>{t('Title')}</Text>
                                      <TextInput
                                        style={[styles.desktopInput, { backgroundColor: colors.cardBackground, color: colors.text }]}
                                        value={editingPhase.title}
                                        onChangeText={(text) => handleUpdatePhaseField('title', text)}
                                        placeholder={t('Phase title')}
                                        placeholderTextColor={colors.textTertiary}
                                      />

                                      <Text style={[styles.desktopLabel, { color: colors.text, marginTop: 12, marginBottom: 8 }]}>{t('Description')}</Text>
                                      <TextInput
                                        style={[styles.desktopInput, { backgroundColor: colors.cardBackground, color: colors.text, minHeight: 100 }]}
                                        value={editingPhase.description}
                                        onChangeText={(text) => handleUpdatePhaseField('description', text)}
                                        placeholder={t('Phase description')}
                                        placeholderTextColor={colors.textTertiary}
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                      />

                                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                                        <View style={{ flex: 1 }}>
                                          <Text style={[styles.desktopLabel, { color: colors.text, marginBottom: 8 }]}>{t('Duration (weeks)')}</Text>
                                          <TextInput
                                            style={[styles.desktopInput, { backgroundColor: colors.cardBackground, color: colors.text }]}
                                            value={editingPhase.durationWeeks.toString()}
                                            onChangeText={(text) => handleUpdatePhaseField('durationWeeks', parseInt(text) || 1)}
                                            keyboardType="numeric"
                                            placeholderTextColor={colors.textTertiary}
                                          />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                          <Text style={[styles.desktopLabel, { color: colors.text, marginBottom: 8 }]}>{t('Amount (SAR)')}</Text>
                                          <TextInput
                                            style={[styles.desktopInput, { backgroundColor: colors.cardBackground, color: colors.text }]}
                                            value={editingPhase.amount.toString()}
                                            onChangeText={(text) => handleUpdatePhaseField('amount', parseFloat(text) || 0)}
                                            keyboardType="numeric"
                                            placeholderTextColor={colors.textTertiary}
                                          />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                          <Text style={[styles.desktopLabel, { color: colors.text, marginBottom: 8 }]}>{t('Percentage')}</Text>
                                          <TextInput
                                            style={[styles.desktopInput, { backgroundColor: colors.cardBackground, color: colors.text }]}
                                            value={editingPhase.percentage.toString()}
                                            onChangeText={(text) => handleUpdatePhaseField('percentage', parseFloat(text) || 0)}
                                            keyboardType="numeric"
                                            placeholderTextColor={colors.textTertiary}
                                          />
                                        </View>
                                      </View>

                                      <View style={[styles.desktopPhaseEditActions, { marginTop: 20 }]}>
                                        <TouchableOpacity
                                          style={[styles.desktopPhaseActionButton, { backgroundColor: colors.textTertiary }]}
                                          onPress={handleCancelPhaseEdit}
                                        >
                                          <Ionicons name="close" size={18} color="#fff" />
                                          <Text style={styles.desktopPhaseActionText}>{t('Cancel')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                          style={[styles.desktopPhaseActionButton, { backgroundColor: colors.primary }]}
                                          onPress={() => handleSavePhaseEdit(index)}
                                        >
                                          <Ionicons name="checkmark" size={18} color="#fff" />
                                          <Text style={styles.desktopPhaseActionText}>{t('Save')}</Text>
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                  ) : (
                                    <>
                                      <View style={styles.desktopPhaseHeader}>
                                        <Text style={[styles.desktopPhaseTitle, { color: colors.text }]}>
                                          {phase.title}
                                        </Text>
                                        <Text style={[styles.desktopPhasePercentage, { color: colors.primary }]}>
                                          {phase.percentage}%
                                        </Text>
                                      </View>
                                      <Text style={[styles.desktopPhaseDescription, { color: colors.textSecondary }]}>
                                        {phase.description}
                                      </Text>
                                      <View style={styles.desktopPhaseDetails}>
                                        <Text style={[styles.desktopPhaseDetail, { color: colors.textTertiary }]}>
                                          {phase.durationWeeks} {t('weeks')}
                                        </Text>
                                        <Text style={[styles.desktopPhaseDetail, { color: colors.textTertiary }]}>
                                          {phase.amount} {t('SAR')}
                                        </Text>
                                      </View>
                                      {isEditing && !isEditingPhase && (
                                        <View style={styles.desktopPhaseActions}>
                                          <TouchableOpacity
                                            style={[styles.desktopPhaseActionButton, { backgroundColor: colors.primary }]}
                                            onPress={() => handleEditPhase(index)}
                                          >
                                            <Ionicons name="pencil" size={18} color="#fff" />
                                            <Text style={styles.desktopPhaseActionText}>{t('Edit')}</Text>
                                          </TouchableOpacity>
                                          <TouchableOpacity
                                            style={[styles.desktopPhaseActionButton, { backgroundColor: colors.error }]}
                                            onPress={() => handleDeletePhase(index)}
                                          >
                                            <Ionicons name="trash" size={18} color="#fff" />
                                            <Text style={styles.desktopPhaseActionText}>{t('Delete')}</Text>
                                          </TouchableOpacity>
                                        </View>
                                      )}
                                    </>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      {!isEditing && finalProject && (
                        <View style={styles.desktopButtonRow}>
                          <Button
                            mode="outlined"
                            onPress={() => setIsEditing(true)}
                            style={styles.desktopCancelButton}
                          >
                            {t('Edit')}
                          </Button>
                          <Button
                            mode="contained"
                            onPress={() => submitProject(finalProject)}
                            style={[styles.desktopContinueButton, { backgroundColor: colors.primary }]}
                            contentStyle={styles.desktopSubmitButtonContent}
                          >
                            {technician ? t('Send Deal') : t('Confirm & Submit')}
                          </Button>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Loading and modals - same as mobile */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.progressCircle}>
              <View style={[styles.progressCircleBackground, { borderColor: colors.border }]} />
              <View
                style={[
                  styles.progressCircleFill, 
                  { 
                    borderColor: colors.primary,
                    transform: [{ rotate: `${submissionProgress * 360}deg` }]
                  }
                ]} 
              />
              <View style={styles.progressCircleCenter}>
                <Text style={[styles.progressPercentage, { color: colors.text }]}>
                  {Math.round(submissionProgress * 100)}%
                </Text>
              </View>
            </View>
            <View style={styles.loadingTextContainer}>
              <Text style={[styles.loadingTitle, { color: colors.text }]}>
                {t('Uploading Project')}
              </Text>
              <Text style={[styles.loadingMessage, { color: colors.textSecondary }]}>
                {submissionMessage}
              </Text>
            </View>
            <View style={styles.loadingDots}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <View style={[styles.dot, { backgroundColor: colors.primary, opacity: 0.7 }]} />
              <View style={[styles.dot, { backgroundColor: colors.primary, opacity: 0.4 }]} />
            </View>
          </View>
        </View>
      )}

      {showMapPicker && (
        <LocationPicker
          initialLocation={
            editedProject?.latitude && editedProject?.longitude 
              ? { latitude: editedProject.latitude, longitude: editedProject.longitude } 
              : undefined
          }
          initialAddress={editedProject?.address}
          onLocationSelect={(location) => {
            if (editedProject) {
              setEditedProject({
                ...editedProject,
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address,
              });
            }
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}


      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={[styles.successModalContent, { backgroundColor: colors.cardBackground }]}>
            <Animated.View style={[styles.successIconContainer, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="checkmark-circle" size={80} color={colors.success} />
            </Animated.View>
            <Text style={[styles.successModalTitle, { color: colors.text }]}>
              {t('Success')}
            </Text>
            <Text style={[styles.successModalMessage, { color: colors.textSecondary }]}>
              {technician ? t('Deal sent successfully!') : t('Project submitted successfully!')}
            </Text>
            <ActivityIndicator size="small" color={colors.primary} style={styles.successModalLoader} />
            <Text style={[styles.successModalSubtext, { color: colors.textTertiary }]}>
              {t('Redirecting to home...')}
            </Text>
          </View>
        </View>
      </Modal>
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 150,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  messageContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  aiMessage: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  promptText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  examplesContainer: {
    marginBottom: 20,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  exampleText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  messagesList: {
    gap: 12,
    marginBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  aiMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
  },
  messageText: {
    fontSize: 14,
    color: '#fff',
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  thinkingText: {
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#f44336',
  },
  summaryContainer: {
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 24,
  },
  projectCard: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' as any,
      },
      default: {
        elevation: 4,
      },
    }),
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  submitButton: {
    marginTop: 20,
    borderRadius: 12,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  conversationContainer: {
    flex: 1,
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    color: '#333',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  phasesSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  phaseCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' as any,
      },
      default: {
        elevation: 2,
      },
    }),
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  phasePercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  phaseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  phaseDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  phaseDetail: {
    fontSize: 12,
    color: '#999',
  },
  formContainer: {
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  textAreaWrapper: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    position: 'relative',
  },
  aiIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    opacity: 0.3,
  },
  textArea: {
    borderRadius: 12,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    minHeight: 160,
    width: '100%',
    textAlign: 'left',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
  },
  stepLabel: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  questionCard: {
    marginBottom: 20,
    elevation: 2,
  },
  questionText: {
    fontSize: 18,
    lineHeight: 26,
  },
  answerSection: {
    marginBottom: 20,
  },
  answerInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  continueButton: {
    flex: 1,
  },
  editButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  editInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  editButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelEditButton: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelEditButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveEditButton: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveEditButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addressSection: {
    marginTop: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    padding: 14,
    borderWidth: 0.5,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 0.5,
    minHeight: 100,
    flex: 1,
    minWidth: 0,
  },
  actionButtons: {
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  questionsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  questionsTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  questionsSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  questionsList: {
    marginBottom: 20,
  },
  questionItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  questionNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  questionItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  answersSection: {
    marginBottom: 20,
  },
  answersTextAreaWrapper: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 12,
    width: '100%',
    position: 'relative',
  },
  aiIconAnswer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    opacity: 0.3,
  },
  answersTextArea: {
    borderRadius: 12,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    minHeight: 200,
    width: '100%',
    textAlign: 'left',
  },
  photosSection: {
    marginTop: 16,
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
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 14,
    zIndex: 10,
  },
  addPhotoButton: {
    width: 72,
    height: 72,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 10,
    marginTop: 2,
  },
  desktopPhotosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  desktopPhotoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  desktopPhoto: {
    width: '100%',
    height: '100%',
  },
  desktopRemovePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 14,
    zIndex: 10,
  },
  desktopAddPhotoButton: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    width: 280,
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  progressCircle: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  progressCircleBackground: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
  },
  progressCircleFill: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  progressCircleCenter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingTextContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  phaseEditActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  phaseActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  phaseActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  phaseActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' as any,
      },
    }),
  },
  desktopBackButton: {
    padding: 8,
  },
  desktopHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  desktopScrollView: {
    flex: 1,
  },
  desktopScrollContent: {
    paddingVertical: 40,
    paddingHorizontal: 40,
    paddingBottom: 120,
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  desktopFormContainer: {
    gap: 40,
  },
  desktopIconSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  desktopTitle: {
    fontSize: 36,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  desktopSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
  desktopInputSection: {
    padding: 40,
    borderRadius: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)' as any,
      },
    }),
  },
  desktopLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  desktopLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  desktopTextAreaWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    minHeight: 200,
    marginBottom: 24,
    gap: 12,
  },
  desktopAiIcon: {
    marginTop: 4,
  },
  desktopTextArea: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
    minHeight: 180,
  },
  desktopExamplesContainer: {
    marginBottom: 24,
  },
  desktopExamplesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  desktopExamplesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  desktopExampleItem: {
    flex: 1,
    minWidth: 280,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 20,
    gap: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' as any,
        cursor: 'pointer' as any,
      },
    }),
  },
  desktopExampleText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  desktopErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
    marginBottom: 24,
    gap: 12,
  },
  desktopErrorText: {
    fontSize: 16,
    flex: 1,
  },
  desktopSubmitButton: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  desktopSubmitButtonContent: {
    paddingVertical: 12,
  },
  // Step 2 Desktop Styles
  desktopQuestionsHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  desktopQuestionsTitle: {
    fontSize: 36,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  desktopQuestionsSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
  desktopQuestionsContainer: {
    padding: 40,
    borderRadius: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)' as any,
      },
    }),
  },
  desktopQuestionsList: {
    marginBottom: 32,
    gap: 16,
  },
  desktopQuestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderRadius: 12,
    gap: 16,
  },
  desktopQuestionNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  desktopQuestionNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  desktopQuestionItemText: {
    fontSize: 17,
    lineHeight: 26,
    flex: 1,
  },
  desktopAnswersSection: {
    marginBottom: 24,
  },
  desktopAnswersTextAreaWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    minHeight: 240,
    gap: 12,
    marginTop: 12,
  },
  desktopAiIconAnswer: {
    marginTop: 4,
  },
  desktopAnswersTextArea: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
    minHeight: 220,
  },
  desktopButtonRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  desktopCancelButton: {
    flex: 1,
    borderRadius: 12,
  },
  desktopContinueButton: {
    flex: 1,
    borderRadius: 12,
  },
  // Step 3 Desktop Styles
  desktopSuccessIcon: {
    alignItems: 'center',
    marginBottom: 20,
  },
  desktopSuccessTitle: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 40,
  },
  desktopProjectCard: {
    padding: 40,
    borderRadius: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)' as any,
      },
    }),
  },
  desktopEditForm: {
    gap: 24,
  },
  desktopProjectView: {
    gap: 24,
  },
  desktopCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  desktopCardValue: {
    fontSize: 18,
    lineHeight: 28,
  },
  desktopDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  desktopDetailItem: {
    flex: 1,
    minWidth: 200,
    padding: 20,
    borderRadius: 12,
  },
  desktopDetailLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  desktopDetailValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  desktopAddressText: {
    fontSize: 16,
    lineHeight: 24,
  },
  desktopMapButtonSmall: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  desktopEditButtonsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  desktopCancelEditButton: {
    flex: 1,
    borderRadius: 12,
  },
  desktopSaveEditButton: {
    flex: 1,
    borderRadius: 12,
  },
  desktopSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  desktopPhasesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 12,
  },
  desktopPhaseCard: {
    flex: 1,
    minWidth: 300,
    padding: 24,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' as any,
      },
    }),
  },
  desktopPhaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  desktopPhaseTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  desktopPhasePercentage: {
    fontSize: 20,
    fontWeight: '700',
  },
  desktopPhaseDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  desktopPhaseDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  desktopPhaseDetail: {
    fontSize: 14,
  },
  desktopPhaseEditActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  desktopPhaseActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  desktopPhaseActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  desktopPhaseActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  dateDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
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
  hintText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    maxHeight: '90%',
    ...Platform.select({
      web: {
        maxWidth: 500,
        alignSelf: 'center',
        marginBottom: '5vh',
        borderRadius: 24,
      } as any,
    }),
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
  },
  datePickerModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  datePickerModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  datePickerModalCloseButton: {
    padding: 4,
    borderRadius: 8,
  },
  datePickerModalBody: {
    padding: 20,
    paddingTop: 16,
  },
  datePickerModalHint: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 16,
    textAlign: 'center',
  },
  datePickerModalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  datePickerModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  datePickerModalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 128, 224, 0.3)' as any,
      },
    }),
  },
  datePickerModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  desktopSection: {
    marginBottom: 24,
  },
  desktopInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
  },
  desktopRow: {
    flexDirection: 'row',
    gap: 16,
  },
  desktopToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  desktopAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      },
    }),
  },
  successModalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)' as any,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successModalTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  successModalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  successModalLoader: {
    marginBottom: 12,
  },
  successModalSubtext: {
    fontSize: 14,
    textAlign: 'center',
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
  // ==================== FIGMA DESIGN STYLES ====================
  figmaHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  figmaBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
  },
  figmaFormContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  figmaLogoSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 24,
  },
  figmaAiIconBox: {
    width: 80,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#FFF2CF', // amber10
    justifyContent: 'center',
    alignItems: 'center',
  },
  figmaAiTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#003867', // primary100
    textAlign: 'center',
  },
  figmaDescriptionText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#383838', // textBody
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 24,
    marginBottom: 100, // Space to push content up
  },
  figmaExampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00549B', // primary70
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    gap: 8,
  },
  figmaExampleIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  figmaExampleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: '#00549B', // primary70
    textAlign: 'center',
  },
  figmaInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E6EFF7', // primary10
    borderWidth: 0.5,
    borderColor: '#003867', // primary100
    borderRadius: 8,
    padding: 8,
    minHeight: 84,
    gap: 12,
  },
  figmaTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '200',
    color: '#003867', // primary100
    minHeight: 68,
    textAlignVertical: 'top',
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  figmaSendButton: {
    width: 32,
    height: 32,
    borderRadius: 35,
    backgroundColor: '#005DAC', // primary60
    justifyContent: 'center',
    alignItems: 'center',
  },
  figmaSendButtonDisabled: {
    opacity: 0.5,
  },
  // New Review Section Styles
  reviewContainer: {
    width: '100%',
  },
  flowContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  divider: {
    height: 0.5,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  formHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
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
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 21,
    marginBottom: 16,
  },
  editableInput: {
    borderWidth: 1,
    borderRadius: 8,
    ...Platform.select({
      web: {
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
      },
      default: {},
    }),
  },
  inputContainer: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapButtonSmall: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetCard: {
    backgroundColor: FIGMA_COLORS.primary10,
    borderColor: FIGMA_COLORS.primary100,
  },
  durationCard: {
    backgroundColor: FIGMA_COLORS.green10,
    borderColor: FIGMA_COLORS.green80,
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
    borderRadius: 6,
    padding: 12,
    borderWidth: 0.5,
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
  },
  miniDateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  descriptionBox: {
    borderWidth: 0.5,
    borderColor: '#D9D9D9',
    borderRadius: 6,
    padding: 16,
  },
  descriptionText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '400',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 6,
  },
  // Unified Phase Card Styles
  unifiedPhaseCard: {
    borderWidth: 1,
    borderColor: FIGMA_COLORS.primary10,
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    gap: 16,
    backgroundColor: FIGMA_COLORS.white,
  },
  unifiedPhaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  unifiedPhaseHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unifiedPhaseNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: FIGMA_COLORS.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unifiedPhaseNumberText: {
    fontSize: 12,
    fontWeight: '400',
    color: FIGMA_COLORS.primary80,
  },
  unifiedPhaseTitle: {
    fontSize: 12,
    fontWeight: '400',
    color: FIGMA_COLORS.textBody,
    flex: 1,
  },
  unifiedPhasePrice: {
    fontSize: 10,
    fontWeight: '600',
    color: FIGMA_COLORS.green80,
  },
  unifiedPhaseDescription: {
    fontSize: 12,
    fontWeight: '400',
    color: FIGMA_COLORS.textBody,
    lineHeight: 18,
  },
  unifiedPhaseDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unifiedPhaseDurationText: {
    fontSize: 12,
    fontWeight: '400',
    color: FIGMA_COLORS.textSecondary,
  },
  unifiedPhaseActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  unifiedPhaseActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  unifiedPhaseActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Unified Action Buttons
  actionButtonsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  unifiedActionButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  unifiedEditButton: {
    backgroundColor: FIGMA_COLORS.purple10,
    borderWidth: 1,
    borderColor: FIGMA_COLORS.purple100,
  },
  unifiedSubmitButton: {
    backgroundColor: FIGMA_COLORS.primary60,
  },
  unifiedActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: FIGMA_COLORS.purple100,
  },
  // Phase Edit Modal Styles
  phaseEditModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  phaseEditModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  phaseEditModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    ...Platform.select({
      web: {
        maxWidth: 600,
        alignSelf: 'center',
        borderRadius: 20,
        marginBottom: '5vh',
      } as any,
    }),
  },
  phaseEditModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: FIGMA_COLORS.textDividers,
  },
  phaseEditModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  phaseEditModalScroll: {
    flex: 1,
  },
  phaseEditModalBody: {
    padding: 20,
    gap: 20,
  },
  phaseEditModalSection: {
    marginBottom: 16,
  },
  phaseEditModalLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  phaseEditModalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 48,
  },
  phaseEditModalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  phaseEditModalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: FIGMA_COLORS.textDividers,
  },
  phaseEditModalButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  phaseEditModalCancelButton: {
    backgroundColor: FIGMA_COLORS.purple10,
    borderWidth: 1,
    borderColor: FIGMA_COLORS.purple100,
  },
  phaseEditModalSaveButton: {
    backgroundColor: FIGMA_COLORS.primary60,
  },
  phaseEditModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // AI Generated Success Badge
  aiGeneratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: FIGMA_COLORS.green10,
    borderWidth: 0.5,
    borderColor: FIGMA_COLORS.green80,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  aiGeneratedBadgeText: {
    fontSize: 12,
    fontWeight: '400',
    color: FIGMA_COLORS.green90,
  },
});
