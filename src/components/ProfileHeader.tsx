import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Figma Design Colors
const FIGMA_COLORS = {
  primary: '#005DAC',
  primaryDark: '#003867',
  primaryLight: '#E6EFF7',
  white: '#FFFFFF',
  divider: '#D9D9D9',
};

interface ProfileHeaderProps {
  title: string;
  onBack: () => void;
  userName?: string;
  userAvatar?: string | null;
  showUserInfo?: boolean;
  isDarkMode?: boolean;
  colors?: {
    background?: string;
    text?: string;
    border?: string;
    primary?: string;
  };
}

export default function ProfileHeader({
  title,
  onBack,
  userName,
  userAvatar,
  showUserInfo = true,
  isDarkMode = false,
  colors,
}: ProfileHeaderProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Theme-aware colors
  const bgColor = colors?.background || (isDarkMode ? '#1C1C1E' : FIGMA_COLORS.white);
  const textColor = colors?.text || (isDarkMode ? '#FFFFFF' : FIGMA_COLORS.primaryDark);
  const dividerColor = colors?.border || (isDarkMode ? '#383838' : FIGMA_COLORS.divider);
  const primaryColor = colors?.primary || FIGMA_COLORS.primary;
  const avatarBgColor = isDarkMode ? '#2D2D2D' : FIGMA_COLORS.primaryLight;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header Row */}
      <View style={[styles.headerRow, isRTL && styles.rowRTL]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons
            name={isRTL ? 'chevron-forward' : 'chevron-back'}
            size={24}
            color={textColor}
          />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* User Info Section */}
      {showUserInfo && (
        <>
          <View style={styles.userSection}>
            <View style={[styles.avatarContainer, { backgroundColor: avatarBgColor }]}>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.avatar} />
              ) : (
                <Ionicons name="person" size={50} color={primaryColor} />
              )}
            </View>
            {userName && (
              <Text style={[styles.userName, { color: textColor }]}>{userName}</Text>
            )}
          </View>
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 20,
    fontWeight: '400',
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 24,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  divider: {
    height: 0.5,
    marginHorizontal: 16,
  },
});

