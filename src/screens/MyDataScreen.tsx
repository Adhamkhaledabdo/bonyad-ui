import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';

interface MyDataScreenProps {
  onBack: () => void;
  onEditProfile: () => void;
  onChangePhone: () => void;
  onChangePassword: () => void;
  onNavigateToSubscription?: () => void;
  onNavigateToServices?: () => void;
  onNavigateToAvailability?: () => void;
  isTechnician?: boolean;
}

export default function MyDataScreen({ 
  onBack, 
  onEditProfile, 
  onChangePhone, 
  onChangePassword,
  onNavigateToSubscription,
  onNavigateToServices,
  onNavigateToAvailability,
  isTechnician = false 
}: MyDataScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('My Data')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 120) }}
      >
        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 120) }]}>
          {/* Edit Profile Information */}
          <TouchableOpacity
            style={[styles.optionCard, { backgroundColor: colors.cardBackground }]}
            onPress={onEditProfile}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="person" size={28} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>{t('Edit Profile Information')}</Text>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                {t('Update your name, email, and profile picture')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>

          {/* Change Phone Number */}
          <TouchableOpacity
            style={[styles.optionCard, { backgroundColor: colors.cardBackground }]}
            onPress={onChangePhone}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="call" size={28} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>{t('Change Phone Number')}</Text>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                {t('Update your phone number')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>

          {/* Change Password */}
          <TouchableOpacity
            style={[styles.optionCard, { backgroundColor: colors.cardBackground }]}
            onPress={onChangePassword}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="lock-closed" size={28} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>{t('Change Password')}</Text>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                {t('Update your password')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>

          {/* Technician-specific options */}
          {isTechnician && (
            <>
              {/* Services */}
              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.cardBackground }]}
                onPress={() => onNavigateToServices?.()}
              >
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="construct" size={28} color={colors.primary} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{t('Services')}</Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    {t('Manage your services')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </TouchableOpacity>

              {/* Availability */}
              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.cardBackground }]}
                onPress={() => onNavigateToAvailability?.()}
              >
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="calendar" size={28} color={colors.primary} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{t('Availability')}</Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    {t('Manage your availability schedule')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </TouchableOpacity>

              {/* Subscription */}
              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.cardBackground }]}
                onPress={() => onNavigateToSubscription?.()}
              >
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="star" size={28} color={colors.primary} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{t('Subscription')}</Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    {t('View and manage your subscription')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </TouchableOpacity>
            </>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});

