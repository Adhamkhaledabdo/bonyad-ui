import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { changePassword } from '../services/ProfileService';
import { showAlert, showError } from '../utils/alert';

interface ChangePasswordScreenProps {
  onBack: () => void;
}

export default function ChangePasswordScreen({ onBack }: ChangePasswordScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      showError(t('All fields are required'));
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showError(t('New passwords do not match'));
      return;
    }
    
    if (newPassword.length < 6) {
      showError(t('New password must be at least 6 characters'));
      return;
    }
    
    if (oldPassword === newPassword) {
      showError(t('New password must be different from current password'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await changePassword(oldPassword, newPassword);
      
      showAlert(t('Success'), result.message, [
        {
          text: t('OK'),
          onPress: () => {
            // Clear fields
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            
            // Go back to profile
            onBack();
          }
        }
      ]);
      
    } catch (error: any) {
      showError(error.message || t('Failed to change password'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Change Password')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.content}>
          {/* Old Password */}
          <Card style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Card.Content>
              <Text style={[styles.label, { color: colors.text }]}>{t('Current Password')}</Text>
              <View style={[styles.passwordInputContainer, { borderColor: colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  placeholder={t('Enter current password')}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showOldPassword}
                />
                <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)}>
                  <Ionicons
                    name={showOldPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>

          {/* New Password */}
          <Card style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Card.Content>
              <Text style={[styles.label, { color: colors.text }]}>{t('New Password')}</Text>
              <View style={[styles.passwordInputContainer, { borderColor: colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('Enter new password')}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Ionicons
                    name={showNewPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                {t('At least 6 characters')}
              </Text>
            </Card.Content>
          </Card>

          {/* Confirm Password */}
          <Card style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Card.Content>
              <Text style={[styles.label, { color: colors.text }]}>{t('Confirm Password')}</Text>
              <View style={[styles.passwordInputContainer, { borderColor: colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('Confirm new password')}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('Change Password')}</Text>
            )}
          </TouchableOpacity>
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  helpText: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

