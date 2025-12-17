import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';

interface WebFooterProps {
  onNavigateToHome?: () => void;
  onNavigateToOverview?: () => void;
}

export default function WebFooter({
  onNavigateToHome,
  onNavigateToOverview,
}: WebFooterProps) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();

  if (Platform.OS !== 'web') {
    return null; // Only render on web
  }

  const handleLinkPress = (url: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <View style={[styles.footer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
      <View style={styles.footerContent}>
        {/* Company Info */}
        <View style={styles.footerSection}>
          <Image 
            source={require('../../assets/bonyad-logo.svg')}
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={[styles.footerDescription, { color: colors.textSecondary }]}>
            {i18n.language === 'en' 
              ? 'Connecting skilled technicians with homeowners for quality home improvements.'
              : 'نربط الفنيين المهرة بأصحاب المنازل لتحسينات منزلية عالية الجودة.'}
          </Text>
          {/* Social Links */}
          <View style={styles.socialLinks}>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleLinkPress('https://facebook.com')}
            >
              <Ionicons name="logo-facebook" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleLinkPress('https://twitter.com')}
            >
              <Ionicons name="logo-twitter" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleLinkPress('https://instagram.com')}
            >
              <Ionicons name="logo-instagram" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleLinkPress('https://linkedin.com')}
            >
              <Ionicons name="logo-linkedin" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Links */}
        <View style={styles.footerSection}>
          <Text style={[styles.footerSectionTitle, { color: colors.text }]}>
            {i18n.language === 'en' ? 'Quick Links' : 'روابط سريعة'}
          </Text>
          <TouchableOpacity 
            style={styles.footerLink}
            onPress={onNavigateToHome || onNavigateToOverview}
          >
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>
              {i18n.language === 'en' ? 'Home' : 'الرئيسية'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.footerLink}
            onPress={onNavigateToOverview}
          >
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>
              {i18n.language === 'en' ? 'About Us' : 'من نحن'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.footerLink}
            onPress={() => handleLinkPress('#services')}
          >
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>
              {i18n.language === 'en' ? 'Services' : 'الخدمات'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.footerLink}
            onPress={() => handleLinkPress('#contact')}
          >
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>
              {i18n.language === 'en' ? 'Contact' : 'اتصل بنا'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Legal & Policies */}
        <View style={styles.footerSection}>
          <Text style={[styles.footerSectionTitle, { color: colors.text }]}>
            {i18n.language === 'en' ? 'Legal' : 'قانوني'}
          </Text>
          <TouchableOpacity 
            style={styles.footerLink}
            onPress={() => handleLinkPress('/privacy-policy')}
          >
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>
              {i18n.language === 'en' ? 'Privacy Policy' : 'سياسة الخصوصية'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.footerLink}
            onPress={() => handleLinkPress('/terms-of-service')}
          >
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>
              {i18n.language === 'en' ? 'Terms of Service' : 'شروط الخدمة'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.footerLink}
            onPress={() => handleLinkPress('/cookie-policy')}
          >
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>
              {i18n.language === 'en' ? 'Cookie Policy' : 'سياسة ملفات تعريف الارتباط'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.footerLink}
            onPress={() => handleLinkPress('/refund-policy')}
          >
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>
              {i18n.language === 'en' ? 'Refund Policy' : 'سياسة الاسترجاع'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contact Info */}
        <View style={styles.footerSection}>
          <Text style={[styles.footerSectionTitle, { color: colors.text }]}>
            {i18n.language === 'en' ? 'Contact Us' : 'اتصل بنا'}
          </Text>
          <View style={styles.contactItem}>
            <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {i18n.language === 'en' 
                ? 'King Fahd Road, Olaya\nRiyadh, Saudi Arabia'
                : 'طريق الملك فهد، العليا\nالرياض، المملكة العربية السعودية'}
            </Text>
          </View>
          <View style={styles.contactItem}>
            <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
            <TouchableOpacity onPress={() => handleLinkPress('mailto:info@bonyad.com')}>
              <Text style={[styles.contactText, { color: colors.primary }]}>
                info@bonyad.com
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
            <TouchableOpacity onPress={() => handleLinkPress('tel:+966111234567')}>
              <Text style={[styles.contactText, { color: colors.primary }]}>
                +966 11 123 4567
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Footer Bottom */}
      <View style={[styles.footerBottom, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerCopyright, { color: colors.textSecondary }]}>
          © {new Date().getFullYear()} Bonyad. {i18n.language === 'en' ? 'All rights reserved.' : 'جميع الحقوق محفوظة.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    width: '100%',
    borderTopWidth: 1,
    marginTop: 'auto',
  },
  footerContent: {
    maxWidth: 1200,
    width: '100%',
    marginHorizontal: 'auto',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    gap: 32,
    ...Platform.select({
      web: {
        '@media (max-width: 768px)': {
          flexDirection: 'column',
          paddingHorizontal: 16,
          paddingTop: 32,
          paddingBottom: 24,
          gap: 24,
        },
      } as any,
    }),
  },
  footerSection: {
    flex: 1,
    minWidth: 200,
    ...Platform.select({
      web: {
        '@media (max-width: 768px)': {
          minWidth: '100%',
        },
      } as any,
    }),
  },
  footerLogo: {
    width: 120,
    height: 35,
    marginBottom: 16,
  },
  footerDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        ':hover': {
          backgroundColor: 'rgba(0, 128, 224, 0.1)',
        },
      } as any,
    }),
  },
  footerSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  footerLink: {
    marginBottom: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  footerLinkText: {
    fontSize: 14,
    ...Platform.select({
      web: {
        transition: 'color 0.2s',
        ':hover': {
          color: '#0080E0',
        },
      } as any,
    }),
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  footerBottom: {
    maxWidth: 1200,
    width: '100%',
    marginHorizontal: 'auto',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    ...Platform.select({
      web: {
        '@media (max-width: 768px)': {
          paddingHorizontal: 16,
          paddingVertical: 12,
        },
      } as any,
    }),
  },
  footerCopyright: {
    fontSize: 12,
    textAlign: 'center',
  },
});
