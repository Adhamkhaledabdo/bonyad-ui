import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Figma Design Colors
const FIGMA_COLORS = {
  primary: '#005DAC',
  primaryDark: '#003867',
  primaryLight: '#E6EFF7',
  inputBorder: '#80AED6',
  inputBackground: '#F0F0F0',
  textHeader: '#003867',
  textBody: '#2D2D2D',
  textSecondary: '#6E6E6E',
  white: '#FFFFFF',
  divider: '#D9D9D9',
};

interface ProfileInputFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  isPassword?: boolean;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  isPasswordVisible?: boolean;
  containerStyle?: object;
  isDarkMode?: boolean;
  colors?: {
    text?: string;
    background?: string;
    inputBackground?: string;
    border?: string;
  };
}

export default function ProfileInputField({
  label,
  value,
  onChangeText,
  editable = true,
  isPassword = false,
  showPasswordToggle = false,
  onTogglePassword,
  isPasswordVisible = false,
  containerStyle,
  isDarkMode = false,
  colors,
  ...textInputProps
}: ProfileInputFieldProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Theme-aware colors
  const textColor = colors?.text || (isDarkMode ? '#FFFFFF' : FIGMA_COLORS.textBody);
  const inputBgColor = colors?.inputBackground || (isDarkMode ? '#2D2D2D' : FIGMA_COLORS.inputBackground);
  const borderColor = colors?.border || FIGMA_COLORS.inputBorder;
  const labelColor = colors?.text || (isDarkMode ? '#FFFFFF' : FIGMA_COLORS.textBody);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, { color: labelColor }, isRTL && styles.textRTL]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: inputBgColor,
            borderColor: borderColor,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: isDarkMode ? '#FFFFFF' : FIGMA_COLORS.primaryDark },
            isRTL && styles.textRTL,
          ]}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          secureTextEntry={isPassword && !isPasswordVisible}
          placeholderTextColor={isDarkMode ? '#888888' : '#999999'}
          {...textInputProps}
        />
        {showPasswordToggle && (
          <TouchableOpacity onPress={onTogglePassword} style={styles.eyeIcon}>
            <Ionicons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={20}
              color={isDarkMode ? '#888888' : FIGMA_COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 4,
    height: 32,
    lineHeight: 32,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderRadius: 8,
    height: 43,
    paddingHorizontal: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '300',
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  textRTL: {
    textAlign: 'right',
  },
});

