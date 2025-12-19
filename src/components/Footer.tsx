import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';

interface FooterProps {
  style?: any;
}

export default function Footer({ style }: FooterProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [screenWidth, setScreenWidth] = React.useState(Dimensions.get('window').width);

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1200;

  const handleLinkPress = (url: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const handleEmailPress = () => {
    handleLinkPress('mailto:support@Bonyad.com');
  };

  const handlePhonePress = () => {
    handleLinkPress('tel:+15551234567');
  };

  const handleSocialPress = (platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin') => {
    const urls = {
      facebook: 'https://facebook.com',
      twitter: 'https://twitter.com',
      instagram: 'https://instagram.com',
      linkedin: 'https://linkedin.com',
    };
    handleLinkPress(urls[platform]);
  };

  // Quick Links data
  const quickLinks = [
    { key: 'about', label: t('About Us') || 'About Us' },
    { key: 'services', label: t('Services') || 'Services' },
    { key: 'howItWorks', label: t('How It Works') || 'How It Works' },
    { key: 'pricing', label: t('Pricing') || 'Pricing' },
    { key: 'contact', label: t('Contact') || 'Contact' },
  ];

  // For Clients links
  const clientLinks = [
    { key: 'findServices', label: t('Find Services') || 'Find Services' },
    { key: 'postProject', label: t('Post Project') || 'Post Project' },
    { key: 'successStories', label: t('Success Stories') || 'Success Stories' },
    { key: 'support', label: t('Support') || 'Support' },
    { key: 'faq', label: t('FAQ') || 'FAQ' },
  ];

  // For Providers links
  const providerLinks = [
    { key: 'becomeProvider', label: t('Become a Provider') || 'Become a Provider' },
    { key: 'providerDashboard', label: t('Provider Dashboard') || 'Provider Dashboard' },
    { key: 'resources', label: t('Resources') || 'Resources' },
    { key: 'guidelines', label: t('Guidelines') || 'Guidelines' },
    { key: 'community', label: t('Community') || 'Community' },
  ];

  // Legal links
  const legalLinks = [
    { key: 'terms', label: t('Terms of Service') || 'Terms of Service' },
    { key: 'privacy', label: t('Privacy Policy') || 'Privacy Policy' },
    { key: 'cookies', label: t('Cookie Policy') || 'Cookie Policy' },
    { key: 'disclaimer', label: t('Disclaimer') || 'Disclaimer' },
    { key: 'licenses', label: t('Licenses') || 'Licenses' },
  ];

  // Bottom utility links
  const utilityLinks = [
    { key: 'accessibility', label: t('Accessibility') || 'Accessibility' },
    { key: 'sitemap', label: t('Sitemap') || 'Sitemap' },
    { key: 'helpCenter', label: t('Help Center') || 'Help Center' },
  ];

  const renderLinkColumn = (title: string, links: Array<{ key: string; label: string }>) => (
    <View style={styles.linkColumn}>
      <Text style={styles.linkColumnTitle}>{title}</Text>
      <View style={styles.linkList}>
        {links.map((link) => (
          <TouchableOpacity
            key={link.key}
            style={styles.linkItem}
            onPress={() => {
              // Handle navigation based on link key
              console.log(`Navigate to: ${link.key}`);
            }}
          >
            <Text style={styles.linkText}>{link.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.footer, { backgroundColor: colors.primary }, style]}>
      {/* Main Footer Content */}
      <View style={[styles.footerContent, isMobile && styles.footerContentMobile]}>
        {/* Left Column - Company Info & Contact */}
        <View style={[styles.leftColumn, isMobile && styles.leftColumnMobile]}>
          {/* Description */}
          <Text style={styles.description}>
            {t('Connecting clients with trusted service providers. Get quality services delivered by verified professionals.') ||
              'Connecting clients with trusted service providers. Get quality services delivered by verified professionals.'}
          </Text>

          {/* Contact Information */}
          <View style={styles.contactContainer}>
            {/* Email */}
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={16} color="rgba(255,255,255,0.8)" />
              <TouchableOpacity onPress={handleEmailPress}>
                <Text style={styles.contactText}>support@Bonyad.com</Text>
              </TouchableOpacity>
            </View>

            {/* Phone */}
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={16} color="rgba(255,255,255,0.8)" />
              <TouchableOpacity onPress={handlePhonePress}>
                <Text style={styles.contactText}>+1 (555) 123-4567</Text>
              </TouchableOpacity>
            </View>

            {/* Address */}
            <View style={styles.contactRow}>
              <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.contactText}>123 Service Street, CA 90210</Text>
            </View>
          </View>

          {/* Social Media Icons */}
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialPress('facebook')}
            >
              <Ionicons name="logo-facebook" size={16} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialPress('twitter')}
            >
              <Ionicons name="logo-twitter" size={16} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialPress('instagram')}
            >
              <Ionicons name="logo-instagram" size={16} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialPress('linkedin')}
            >
              <Ionicons name="logo-linkedin" size={16} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Link Columns - Only show on larger screens */}
        {!isMobile && (
          <>
            {renderLinkColumn(t('Quick Links') || 'Quick Links', quickLinks)}
            {renderLinkColumn(t('For Clients') || 'For Clients', clientLinks)}
            {renderLinkColumn(t('For Providers') || 'For Providers', providerLinks)}
            {renderLinkColumn(t('Legal') || 'Legal', legalLinks)}
          </>
        )}

        {/* Mobile: Show links in a collapsible format */}
        {isMobile && (
          <View style={styles.mobileLinksContainer}>
            {renderLinkColumn(t('Quick Links') || 'Quick Links', quickLinks)}
            {renderLinkColumn(t('For Clients') || 'For Clients', clientLinks)}
            {renderLinkColumn(t('For Providers') || 'For Providers', providerLinks)}
            {renderLinkColumn(t('Legal') || 'Legal', legalLinks)}
          </View>
        )}
      </View>

      {/* Footer Bottom Section */}
      <View style={styles.footerBottom}>
        <View style={styles.footerBottomContent}>
          <Text style={styles.copyrightText}>
            © {new Date().getFullYear()} Bonyad. {t('All rights reserved.') || 'All rights reserved.'}
          </Text>
          <View style={styles.utilityLinks}>
            {utilityLinks.map((link) => (
              <TouchableOpacity
                key={link.key}
                style={styles.utilityLink}
                onPress={() => {
                  console.log(`Navigate to: ${link.key}`);
                }}
              >
                <Text style={styles.utilityLinkText}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    width: '100%',
    ...Platform.select({
      web: {
        minHeight: 'auto',
        position: 'relative' as any,
        marginTop: 'auto',
      },
    }),
  },
  footerContent: {
    paddingHorizontal: 34,
    paddingTop: 59,
    paddingBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    ...Platform.select({
      web: {
        maxWidth: 1440,
        marginHorizontal: 'auto',
        width: '100%',
      },
    }),
  },
  footerContentMobile: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    flexDirection: 'column',
  },
  leftColumn: {
    width: 418,
    flexDirection: 'column',
    gap: 12,
    ...Platform.select({
      web: {
        '@media (max-width: 768px)': {
          width: '100%',
        },
      } as any,
    }),
  },
  leftColumnMobile: {
    width: '100%',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 24,
    letterSpacing: -0.15,
  },
  contactContainer: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: -0.15,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  socialButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: 'rgba(255,255,255,0.2)',
        },
      } as any,
    }),
  },
  linkColumn: {
    minWidth: 193,
    marginBottom: 16,
    ...Platform.select({
      web: {
        flex: 0,
        '@media (max-width: 768px)': {
          minWidth: '45%',
          marginBottom: 24,
        },
      } as any,
    }),
  },
  linkColumnTitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    fontWeight: '400',
    marginBottom: 16,
    letterSpacing: -0.31,
  },
  linkList: {
    flexDirection: 'column',
    gap: 8,
  },
  linkItem: {
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  linkText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: -0.15,
  },
  mobileLinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 32,
    gap: 24,
  },
  footerBottom: {
    borderTopWidth: 0.7,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 24.7,
    paddingHorizontal: 48,
    paddingBottom: 24,
    ...Platform.select({
      web: {
        maxWidth: 1440,
        marginHorizontal: 'auto',
        width: '100%',
        '@media (max-width: 768px)': {
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 20,
        },
      } as any,
      default: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
      },
    }),
  },
  footerBottomContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      web: {
        '@media (max-width: 768px)': {
          flexDirection: 'column',
          gap: 16,
          alignItems: 'flex-start',
        },
      } as any,
    }),
  },
  copyrightText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: -0.15,
  },
  utilityLinks: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
    ...Platform.select({
      web: {
        '@media (max-width: 768px)': {
          flexDirection: 'column',
          gap: 12,
          alignItems: 'flex-start',
          width: '100%',
        },
      } as any,
    }),
  },
  utilityLink: {
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  utilityLinkText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    letterSpacing: -0.15,
  },
});

