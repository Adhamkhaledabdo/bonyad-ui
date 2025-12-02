import React, { useState, useEffect } from 'react';
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
import { storage } from '../utils/storage';
import { buildApiUrl } from '../config/api';
import { requestPhoneChange } from '../services/ProfileService';
import { showAlert, showError } from '../utils/alert';

interface ChangePhoneScreenProps {
  onBack: () => void;
  onOTPSent?: (newPhoneNumber: string) => void;
}

export default function ChangePhoneScreen({ onBack, onOTPSent }: ChangePhoneScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  
  const [currentPhone, setCurrentPhone] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCurrentPhone();
  }, []);

  const loadCurrentPhone = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        return;
      }

      const response = await fetch(
        buildApiUrl('/users/profile'),
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCurrentPhone(data.phoneNumber || data.phone || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleRequestChange = async () => {
    if (!newPhone.trim()) {
      showError(t('Please enter a new phone number'));
      return;
    }
    
    if (newPhone === currentPhone) {
      showError(t('New phone number must be different'));
      return;
    }
    
    // Format phone (9 digits)
    let formatted = newPhone.trim();
    if (formatted.startsWith('0')) {
      formatted = formatted.substring(1);
    }
    if (formatted.startsWith('+966')) {
      formatted = formatted.substring(4);
    }
    if (formatted.startsWith('966')) {
      formatted = formatted.substring(3);
    }
    
    if (formatted.length !== 9) {
      showError(t('Phone number must be 9 digits'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await requestPhoneChange(formatted);
      
      showAlert(t('Success'), result.message, [
        {
          text: t('OK'),
          onPress: () => {
            // Navigate to OTP verification
            if (onOTPSent) {
              onOTPSent(formatted);
            }
          }
        }
      ]);
      
    } catch (error: any) {
      showError(error.message || t('Failed to send OTP'));
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Change Phone Number')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.content}>
          {/* Current Phone */}
          <Card style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Card.Content>
              <Text style={[styles.label, { color: colors.text }]}>{t('Current Phone Number')}</Text>
              <View style={[styles.phoneDisplay, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons name="call" size={20} color={colors.textSecondary} />
                <Text style={[styles.phoneDisplayText, { color: colors.text }]}>
                  +966 {currentPhone}
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* New Phone */}
          <Card style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Card.Content>
              <Text style={[styles.label, { color: colors.text }]}>{t('New Phone Number')}</Text>
              <View style={[styles.phoneInputWrapper, { borderColor: colors.border }]}>
                <Text style={[styles.countryCode, { color: colors.textSecondary }]}>+966 |</Text>
                <TextInput
                  style={[styles.phoneInput, { color: colors.text }]}
                  placeholder="5XXXXXXXX"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  value={newPhone}
                  onChangeText={setNewPhone}
                  maxLength={9}
                />
              </View>
            </Card.Content>
          </Card>

          {/* Send OTP Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]}
            onPress={handleRequestChange}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.buttonText}>{t('Send Verification Code')}</Text>
              </>
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
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  phoneDisplayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
  },
  countryCode: {
    fontSize: 16,
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

