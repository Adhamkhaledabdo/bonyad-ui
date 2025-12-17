import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Platform, Linking, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { buildApiUrl, API_ENDPOINTS, getServerBaseUrl } from '../config/api';
import { storage } from '../utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(SCREEN_WIDTH - 40, 350); // Max 350px or screen width minus padding

interface RoomVisualizerScreenProps {
  onBack: () => void;
}

export default function RoomVisualizerScreen({ onBack }: RoomVisualizerScreenProps) {
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [style, setStyle] = useState('modern');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const styles_list = [
    { label: i18n.language === 'en' ? 'Modern' : 'حديث', value: 'modern' },
    { label: i18n.language === 'en' ? 'Saudi Majlis' : 'مجلس سعودي', value: 'majlis' },
    { label: i18n.language === 'en' ? 'Minimal' : 'بسيط', value: 'minimal' },
    { label: i18n.language === 'en' ? 'Industrial' : 'صناعي', value: 'industrial' },
  ];

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const generateDesign = async () => {
    if (!selectedImage) {
      Alert.alert(
        t('Error'),
        i18n.language === 'en' ? 'Please select an image first' : 'يرجى اختيار صورة أولاً'
      );
      return;
    }

    setIsGenerating(true);

    try {
      const token = await storage.getAuthToken();

      // Create FormData
      const formData = new FormData();
      
      // Platform-specific handling for image file
      if (Platform.OS === 'web') {
        // For web, convert blob URI to actual file/blob
        const blobResponse = await fetch(selectedImage);
        const blob = await blobResponse.blob();
        
        formData.append('image', blob, 'room.jpg');
      } else {
        // For iOS/Android, use the file URI directly
        const fileUri = Platform.OS === 'ios' ? selectedImage.replace('file://', '') : selectedImage;
        
        formData.append('image', {
          uri: fileUri,
          type: 'image/jpeg',
          name: 'room.jpg',
        } as any);
      }
      
      formData.append('style', style);
      formData.append('strength', '0.7');

      // Send to API
      const response = await fetch(buildApiUrl(API_ENDPOINTS.AI.ROOM_DESIGN), {
        method: 'POST',
        headers: {
          // Don't set Content-Type header - let fetch/FormData set it automatically with boundary
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Construct full URL for the generated image
        const serverBaseUrl = getServerBaseUrl();
        const generatedImageFullUrl = `${serverBaseUrl}${data.generatedImageUrl}`;
        setGeneratedImage(generatedImageFullUrl);
        console.log('✅ Generated Image URL:', generatedImageFullUrl);
        Alert.alert(
          t('Success'),
          i18n.language === 'en' ? 'Design generated successfully!' : 'تم إنشاء التصميم بنجاح!'
        );
      } else {
        console.log('❌ Room Design API Error - Status:', response.status);
        const errorText = await response.text();
        console.log('❌ Error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          Alert.alert(
            t('Error'),
            errorData.error || (i18n.language === 'en' ? 'Failed to generate design' : 'فشل إنشاء التصميم')
          );
        } catch {
          // Not JSON, show status message
          const statusMessage = response.status === 503 
            ? (i18n.language === 'en' ? 'Service unavailable. Please try again later.' : 'الخدمة غير متاحة. يرجى المحاولة لاحقًا.')
            : (i18n.language === 'en' ? 'Failed to generate design' : 'فشل إنشاء التصميم');
          Alert.alert(t('Error'), statusMessage);
        }
      }
    } catch (error: any) {
      console.error('Design Generation API Error:', error);
      Alert.alert(
        t('Error'),
        i18n.language === 'en' ? 'Network error. Please try again.' : 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!generatedImage) return;
    
    try {
      const canOpen = await Linking.canOpenURL(generatedImage);
      if (canOpen) {
        await Linking.openURL(generatedImage);
      } else {
        Alert.alert(
          t('Error'),
          i18n.language === 'en' ? 'Cannot download image' : 'لا يمكن تنزيل الصورة'
        );
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert(
        t('Error'),
        i18n.language === 'en' ? 'Failed to download image' : 'فشل تنزيل الصورة'
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name={i18n.language === 'ar' ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {i18n.language === 'en' ? 'AI Room Visualizer' : 'مصور الغرفة الذكي'}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <View style={[styles.circle, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="color-palette" size={60} color={colors.primary} />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {i18n.language === 'en' ? 'See Your New Design' : 'شاهد تصميمك الجديد'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {i18n.language === 'en' 
            ? 'Upload a photo of your room and transform it with AI' 
            : 'قم برفع صورة لغرفتك وحولها باستخدام الذكاء الاصطناعي'}
        </Text>

        {/* Image Upload */}
        <TouchableOpacity
          onPress={pickImage}
          style={[styles.uploadButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        >
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.uploadedImage} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={48} color={colors.primary} />
              <Text style={[styles.uploadText, { color: colors.text }]}>
                {i18n.language === 'en' ? 'Upload Photo' : 'رفع صورة'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Style Picker */}
        <View style={styles.stylePicker}>
          <Text style={[styles.label, { color: colors.text }]}>
            {i18n.language === 'en' ? 'Choose Style' : 'اختر النمط'}
          </Text>
          <View style={[styles.pickerContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Picker
              selectedValue={style}
              onValueChange={setStyle}
              style={[styles.picker, { color: colors.text }]}
            >
              {styles_list.map((item) => (
                <Picker.Item key={item.value} label={item.label} value={item.value} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          onPress={generateDesign}
          style={[styles.generateButton, { backgroundColor: colors.primary }]}
          disabled={!selectedImage || isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={24} color="#fff" />
              <Text style={styles.generateButtonText}>
                {i18n.language === 'en' ? 'Generate Design' : 'إنشاء التصميم'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Generated Image */}
        {generatedImage && (
          <View style={styles.resultContainer}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              {i18n.language === 'en' ? 'Your New Design' : 'تصميمك الجديد'}
            </Text>
            <Image 
              source={{ uri: generatedImage }} 
              style={styles.generatedImage}
              resizeMode="contain"
              onError={(error) => {
                console.error('❌ Error loading generated image:', error);
                Alert.alert(
                  t('Error'),
                  i18n.language === 'en' ? 'Failed to load generated image' : 'فشل تحميل الصورة المولدة'
                );
              }}
              onLoad={() => {
                console.log('✅ Generated image loaded successfully');
              }}
            />
            <TouchableOpacity 
              onPress={handleDownloadImage}
              style={[styles.getLookButton, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.getLookButtonText}>
                {i18n.language === 'en' ? 'Download Image' : 'تحميل الصورة'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="image" size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              {i18n.language === 'en' ? 'AI Image Generation' : 'إنشاء صور بالذكاء الاصطناعي'}
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="speedometer" size={24} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              {i18n.language === 'en' ? 'Powered by Stability.ai' : 'مدعوم بواسطة Stability.ai'}
            </Text>
          </View>
        </View>
      </ScrollView>
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
    padding: 8,
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
  content: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  uploadButton: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  uploadText: {
    fontSize: 16,
    marginTop: 10,
    fontWeight: '600',
  },
  stylePicker: {
    width: '100%',
    marginBottom: 20,
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
  },
  picker: {
    height: 50,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 10,
    width: '100%',
    marginBottom: 30,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  generatedImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    marginBottom: 15,
  },
  getLookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    width: '100%',
  },
  getLookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresContainer: {
    width: '100%',
    gap: 15,
    marginTop: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
  },
});

