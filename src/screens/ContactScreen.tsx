import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { Ionicons } from '@expo/vector-icons';

interface ContactScreenProps {
  onBack?: () => void;
}

const CONTACT_EMAIL = 'support@bonyad.com';
const CONTACT_PHONE = '+966111234567';

export default function ContactScreen({ onBack }: ContactScreenProps) {
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${CONTACT_EMAIL}`).catch(() => {});
  };

  const handlePhonePress = () => {
    Linking.openURL(`tel:${CONTACT_PHONE}`).catch(() => {});
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text, fontSize: scaledSize(16) }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(20) }]}>Contact Us</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text, fontSize: scaledSize(22) }]}>We're here to help</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
            Reach out to the Bonyad team for support, partnerships, media inquiries, or general questions.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>Email</Text>
          <TouchableOpacity onPress={handleEmailPress} style={styles.contactRow}>
            <Ionicons name="mail-outline" size={22} color={colors.primary} />
            <Text style={[styles.contactValue, { color: colors.text, fontSize: scaledSize(16) }]}>{CONTACT_EMAIL}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>Phone</Text>
          <TouchableOpacity onPress={handlePhonePress} style={styles.contactRow}>
            <Ionicons name="call-outline" size={22} color={colors.primary} />
            <Text style={[styles.contactValue, { color: colors.text, fontSize: scaledSize(16) }]}>{CONTACT_PHONE}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>Our Offices</Text>
          <View style={styles.officeRow}>
            <Ionicons name="location-outline" size={20} color={colors.primary} style={{ marginTop: 2 }} />
            <View style={styles.officeDetails}>
              <Text style={[styles.officeTitle, { color: colors.text, fontSize: scaledSize(16) }]}>Riyadh Headquarters</Text>
              <Text style={[styles.officeAddress, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
                King Fahd Road, Financial District{'\n'}Riyadh, Saudi Arabia
              </Text>
            </View>
          </View>

          <View style={styles.officeRow}>
            <Ionicons name="location-outline" size={20} color={colors.primary} style={{ marginTop: 2 }} />
            <View style={styles.officeDetails}>
              <Text style={[styles.officeTitle, { color: colors.text, fontSize: scaledSize(16) }]}>Jeddah Office</Text>
              <Text style={[styles.officeAddress, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
                Prince Sultan Street{'\n'}Jeddah, Saudi Arabia
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>Business Hours</Text>
          <Text style={[styles.businessHours, { color: colors.text, fontSize: scaledSize(16) }]}>
            Sunday - Thursday{'\n'}9:00 AM – 6:00 PM KSA Time
          </Text>
          <Text style={[styles.note, { color: colors.textSecondary, fontSize: scaledSize(13) }]}>
            Our team will respond within 24 hours. For urgent matters, please call our support line.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingTop: Platform.OS === 'web' ? 24 : 0,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  sectionLabel: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 10,
  },
  officeRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  officeDetails: {
    flex: 1,
  },
  officeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  officeAddress: {
    fontSize: 14,
    lineHeight: 20,
  },
  businessHours: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
  },
});

