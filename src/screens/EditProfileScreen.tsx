import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import * as ImagePicker from 'expo-image-picker';
import { getUserProfile, uploadProfileImage } from '../services/ProfileService';
import { showAlert, showError } from '../utils/alert';

interface EditProfileScreenProps {
  userDetails: any;
  onBack: () => void;
  onSave: () => void;
}

export default function EditProfileScreen({ userDetails, onBack, onSave }: EditProfileScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [selectedImageAsset, setSelectedImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const profile = await getUserProfile();
      
      setName(profile.name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || profile.phoneNumber || '');
      setDescription(profile.description || '');
      setProfileImage(profile.profileImage || profile.avatar || null);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      showError(error.message || t('Failed to load profile'));
    }
  };

  const handleSelectImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        showError(t('Permission Required'), t('Please grant permission to access your photos'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImageAsset(asset);
        setProfileImage(asset.uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      showError(error.message || t('Failed to select image'));
    }
  };

  const handleUploadImage = async () => {
    if (!selectedImageAsset) {
      return;
    }

    setIsUploadingImage(true);
    try {
      const result = await uploadProfileImage(selectedImageAsset);
      
      // Update the profile image URL with the uploaded one
      setProfileImage(result.profileImage);
      setSelectedImageAsset(null);
      
      showAlert(t('Success'), result.message);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      showError(error.message || t('Failed to upload image'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const token = await storage.getAuthToken();
      const userId = await storage.getUserId();

      if (!token || !userId) {
        showError(t('No authentication token found'));
        setIsLoading(false);
        return;
      }

      // Update profile data
      const updateResponse = await fetch(
        buildApiUrl(API_ENDPOINTS.USER.UPDATE_PROFILE),
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            email,
            description: userDetails?.role?.toUpperCase() === 'TECHNICIAN' ? description : undefined,
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error('Failed to update profile');
      }

      // Upload profile image if a new one was selected
      if (selectedImageAsset) {
        try {
          const uploadResult = await uploadProfileImage(selectedImageAsset);
          // Update the profile image URL with the uploaded one
          setProfileImage(uploadResult.profileImage);
          setSelectedImageAsset(null);
        } catch (uploadError: any) {
          console.error('Error uploading image:', uploadError);
          showError(uploadError.message || t('Failed to upload image'));
          setIsLoading(false);
          return;
        }
      }

      showAlert(t('Success'), t('Profile updated successfully'), [
        { text: t('OK'), onPress: onSave },
      ]);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showError(error.message || t('Failed to update profile'));
    } finally {
      setIsLoading(false);
    }
  };

  const isTechnician = userDetails?.role?.toUpperCase() === 'TECHNICIAN';

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Edit Profile')}</Text>
        <TouchableOpacity onPress={handleSave} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveButton, { color: colors.primary }]}>{t('Save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.content}>
          {/* Profile Image */}
          <View style={styles.imageSection}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.gray100 }]}>
                <Ionicons name="person" size={60} color={colors.primary} />
              </View>
            )}
            <TouchableOpacity
              style={[styles.changeImageButton, { backgroundColor: colors.primary }, isUploadingImage && styles.changeImageButtonDisabled]}
              onPress={handleSelectImage}
              disabled={isUploadingImage}
            >
              {isUploadingImage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={styles.changeImageText}>{t('Change Photo')}</Text>
                </>
              )}
            </TouchableOpacity>
            {selectedImageAsset && !isUploadingImage && (
              <TouchableOpacity
                style={[styles.uploadImageButton, { backgroundColor: colors.success || '#4CAF50' }]}
                onPress={handleUploadImage}
              >
                <Ionicons name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.uploadImageText}>{t('Upload Photo')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Name */}
          <Card style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Card.Content>
              <Text style={[styles.label, { color: colors.text }]}>{t('Name')}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder={t('Enter your name')}
                placeholderTextColor={colors.textSecondary}
              />
            </Card.Content>
          </Card>

          {/* Email */}
          <Card style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Card.Content>
              <Text style={[styles.label, { color: colors.text }]}>{t('Email')}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={email}
                onChangeText={setEmail}
                placeholder={t('Enter your email')}
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Card.Content>
          </Card>

          {/* Phone (Read-only) */}
          <Card style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Card.Content>
              <Text style={[styles.label, { color: colors.text }]}>{t('Phone Number')}</Text>
              <View style={[styles.readOnlyInput, { borderColor: colors.border, backgroundColor: colors.gray100 }]}>
                <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>{phone}</Text>
                <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
              </View>
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                {t('To change your phone number, contact support')}
              </Text>
            </Card.Content>
          </Card>

          {/* Description (Technician only) */}
          {isTechnician && (
            <Card style={[styles.card, { backgroundColor: colors.cardBackground }]}>
              <Card.Content>
                <Text style={[styles.label, { color: colors.text }]}>{t('Description')}</Text>
                <TextInput
                  style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('Enter your professional description')}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </Card.Content>
            </Card>
          )}
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
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  changeImageButtonDisabled: {
    opacity: 0.6,
  },
  uploadImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    marginTop: 8,
  },
  uploadImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  readOnlyText: {
    fontSize: 16,
    flex: 1,
  },
  helpText: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
});

