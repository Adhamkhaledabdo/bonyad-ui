/**
 * Custom Input Components
 * 
 * Reusable, professionally styled input components with rounded borders,
 * no shadows, and no underlines. Designed for consistent use across the app.
 * Updated to match Figma design with label above input.
 */

import React, { useState } from 'react';
import { View, Text, TextInput as RNTextInput, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Dimensions, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { FontFamily, UIFontSizes } from '../constants/Fonts';
import { useFontFamily } from '../context/FontContext';

// Figma Design Colors for inputs (from node 8:208)
const figmaInputColors = {
  inputBg: '#E6EFF7',          // Input background - Blue Primary/10
  inputBorder: '#003867',      // Input border - Blue Primary/100 (Navy)
  textDark: '#2D2D2D',         // Label text
  textNavy: '#003867',         // Placeholder text - Blue Primary/100
  textBlack: '#1A1A1A',        // Input text - Black for written text
  iconColor: '#003867',        // Icon color - Blue Primary/100
};

export interface CustomInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  style?: any;
  onFocus?: (e: any) => void;
  onBlur?: (e: any) => void;
  maxLength?: number;
  selectionColor?: string;
}

/**
 * Base Text Input Component
 */
export const CustomTextInput: React.FC<CustomInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  onFocus,
  onBlur,
  maxLength,
  selectionColor,
}) => {
  const { colors, theme } = useTheme();
  const { i18n } = useTranslation();
  const { fontFamily } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const [isFocused, setIsFocused] = useState(false);
  
  // Check if current language is Arabic (RTL)
  const isRTL = i18n.language === 'ar';
  
  // Use Figma colors for light mode, theme colors for dark mode
  // Applied to both web and mobile for consistency
  const useFigmaStyle = !isDarkMode;
  
  const inputBgColor = useFigmaStyle ? figmaInputColors.inputBg : colors.cardBackground;
  const inputBorderColor = error 
    ? colors.error 
    : (isFocused 
      ? colors.primary 
      : (useFigmaStyle ? figmaInputColors.inputBorder : colors.border));
  const labelColor = useFigmaStyle ? figmaInputColors.textDark : colors.text;
  // Placeholder with reduced opacity (50%) for lighter appearance
  const placeholderColor = useFigmaStyle ? figmaInputColors.textNavy + '80' : colors.textTertiary + '80';
  const iconColor = useFigmaStyle ? figmaInputColors.iconColor : (isFocused ? colors.primary : colors.textTertiary);
  const inputTextColor = useFigmaStyle ? figmaInputColors.textBlack : colors.text; // Black for written text

  return (
    <View style={[styles.container, style]}>
      {/* Label above input - Figma style: 12px, #2D2D2D */}
      {label && (
        <Text style={[
          styles.inputLabel, 
          { 
            color: labelColor,
            textAlign: isRTL ? 'right' : 'left',
          }
        ]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: inputBgColor,
            borderColor: inputBorderColor,
            borderWidth: 0.5, // Figma: border-[0.5px]
            flexDirection: isRTL ? 'row-reverse' : 'row', // Flip icons for RTL
            // Allow wrapper to expand for multiline
            ...(multiline && {
              height: 'auto',
              minHeight: 100,
              alignItems: 'flex-start',
              paddingVertical: 8,
            }),
          },
          disabled && styles.inputDisabled,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={iconColor}
            style={isRTL ? styles.rightIconStatic : styles.leftIcon}
          />
        )}
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          selectionColor={selectionColor || colors.primary}
          style={[
            styles.input,
            {
              color: inputTextColor,
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr',
            },
            multiline && styles.textArea,
            Platform.OS === 'web' && {
              direction: isRTL ? 'rtl' : 'ltr',
              outlineStyle: 'none', // Remove web outline
            } as any,
          ]}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIconButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={iconColor}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

/**
 * Name Input - Auto-capitalizes words
 */
export const NameInput: React.FC<Omit<CustomInputProps, 'autoCapitalize'>> = (props) => {
  return (
    <CustomTextInput
      {...props}
      autoCapitalize="words"
      keyboardType="default"
    />
  );
};

/**
 * Phone Number Input
 */
export const PhoneInput: React.FC<Omit<CustomInputProps, 'keyboardType'>> = (props) => {
  return (
    <CustomTextInput
      {...props}
      keyboardType={Platform.OS === 'web' ? 'numeric' : 'number-pad'}
    />
  );
};

/**
 * Email Input
 */
export const EmailInput: React.FC<Omit<CustomInputProps, 'keyboardType' | 'autoCapitalize'>> = (props) => {
  return (
    <CustomTextInput
      {...props}
      keyboardType="email-address"
      autoCapitalize="none"
    />
  );
};

/**
 * Password Input with show/hide toggle
 */
export const PasswordInput: React.FC<Omit<CustomInputProps, 'secureTextEntry' | 'rightIcon' | 'onRightIconPress'>> = (props) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <CustomTextInput
      {...props}
      secureTextEntry={!showPassword}
      rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
      onRightIconPress={() => setShowPassword(!showPassword)}
    />
  );
};

/**
 * Text Area Input for multiline text
 */
export const TextAreaInput: React.FC<Omit<CustomInputProps, 'multiline' | 'numberOfLines'>> = (props) => {
  return (
    <CustomTextInput
      {...props}
      multiline={true}
      numberOfLines={4}
    />
  );
};

/**
 * Dropdown Picker Component
 */
export interface CustomPickerProps {
  label: string;
  value: string;
  onPress: () => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  style?: any;
}

export const CustomPicker: React.FC<CustomPickerProps> = ({
  label,
  value,
  onPress,
  placeholder = 'Select an option',
  error,
  disabled = false,
  icon,
  rightIcon = 'chevron-down-outline',
  style,
}) => {
  const { colors, theme } = useTheme();
  const { i18n } = useTranslation();
  const isDarkMode = theme === 'dark';
  const [isFocused, setIsFocused] = useState(false);
  const isRTL = i18n.language === 'ar';
  
  // Use Figma colors for light mode
  const useFigmaStyle = !isDarkMode;
  const inputBgColor = useFigmaStyle ? figmaInputColors.inputBg : colors.cardBackground;
  const inputBorderColor = error 
    ? colors.error 
    : (isFocused ? colors.primary : (useFigmaStyle ? figmaInputColors.inputBorder : colors.border));
  const labelColor = useFigmaStyle ? figmaInputColors.textDark : colors.text;
  const textColor = useFigmaStyle ? figmaInputColors.textBlack : colors.text; // Black for selected text
  // Placeholder with reduced opacity (50%) for lighter appearance
  const placeholderTextColor = useFigmaStyle ? figmaInputColors.textNavy + '80' : colors.textTertiary + '80';
  const iconColor = useFigmaStyle ? figmaInputColors.iconColor : colors.textTertiary;

  return (
    <View style={[styles.container, style]}>
      {/* Label above picker - Figma style */}
      {label && (
        <Text style={[
          styles.inputLabel, 
          { 
            color: labelColor,
            textAlign: isRTL ? 'right' : 'left',
          }
        ]}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => setIsFocused(true)}
        onPressOut={() => setIsFocused(false)}
        style={[
          styles.pickerWrapper,
          {
            backgroundColor: inputBgColor,
            borderColor: inputBorderColor,
            borderWidth: 0.5, // Figma: border-[0.5px]
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
          disabled && styles.inputDisabled,
        ]}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.pickerText,
            {
              color: value ? textColor : placeholderTextColor,
              flex: 1,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
        >
          {value || placeholder}
        </Text>
        <Ionicons
          name={rightIcon}
          size={20}
          color={iconColor}
        />
      </TouchableOpacity>
      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

/**
 * Upload Button Component
 */
export interface UploadButtonProps {
  label: string;
  onPress: () => void;
  value?: string | number;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  style?: any;
}

export const UploadButton: React.FC<UploadButtonProps> = ({
  label,
  onPress,
  value,
  placeholder = 'Upload file',
  error,
  disabled = false,
  icon = 'cloud-upload-outline',
  loading = false,
  style,
}) => {
  const { colors, theme } = useTheme();
  const { i18n } = useTranslation();
  const isDarkMode = theme === 'dark';
  const [isFocused, setIsFocused] = useState(false);
  const isRTL = i18n.language === 'ar';
  
  // Use Figma colors for light mode
  const useFigmaStyle = !isDarkMode;
  const inputBgColor = useFigmaStyle ? figmaInputColors.inputBg : colors.cardBackground;
  const inputBorderColor = error 
    ? colors.error 
    : (isFocused ? colors.primary : (useFigmaStyle ? figmaInputColors.inputBorder : colors.border));
  const labelColor = useFigmaStyle ? figmaInputColors.textDark : colors.text;
  const textColor = useFigmaStyle ? figmaInputColors.textBlack : colors.text; // Black for selected text
  // Placeholder with reduced opacity (50%) for lighter appearance
  const placeholderTextColor = useFigmaStyle ? figmaInputColors.textNavy + '80' : colors.textTertiary + '80';

  return (
    <View style={[styles.container, style]}>
      {/* Label above upload button - Figma style */}
      {label && (
        <Text style={[
          styles.inputLabel, 
          { 
            color: labelColor,
            textAlign: isRTL ? 'right' : 'left',
          }
        ]}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        onPressIn={() => setIsFocused(true)}
        onPressOut={() => setIsFocused(false)}
        style={[
          styles.uploadButtonWrapper,
          {
            backgroundColor: inputBgColor,
            borderColor: inputBorderColor,
          },
          disabled && styles.inputDisabled,
        ]}
        activeOpacity={0.7}
      >
        {loading && (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
        )}
        <Ionicons
          name={icon}
          size={20}
          color={useFigmaStyle ? figmaInputColors.iconColor : colors.primary}
        />
        <Text
          style={[
            styles.uploadButtonText,
            {
              color: value ? textColor : placeholderTextColor,
            },
          ]}
        >
          {value || placeholder}
        </Text>
      </TouchableOpacity>
      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

/**
 * Chip Component for selected items
 */
export interface ChipProps {
  label: string;
  onClose?: () => void;
  style?: any;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  onClose,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.primary + '15', // 15% opacity
          borderWidth: 1,
          borderColor: colors.primary + '30', // 30% opacity
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: colors.primary,
          },
        ]}
      >
        {label}
      </Text>
      {onClose && (
        <TouchableOpacity
          onPress={onClose}
          style={styles.chipCloseButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name="close-circle"
            size={18}
            color={colors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Selected Chips Container
 */
export interface SelectedChipsProps {
  items: Array<{ id: number | string; label: string }>;
  onRemove: (id: number | string) => void;
  style?: any;
}

export const SelectedChips: React.FC<SelectedChipsProps> = ({
  items,
  onRemove,
  style,
}) => {
  if (items.length === 0) return null;

  return (
    <View style={[styles.selectedChipsContainer, style]}>
      {items.map((item) => (
        <Chip
          key={item.id}
          label={item.label}
          onClose={() => onRemove(item.id)}
        />
      ))}
    </View>
  );
};

/**
 * Custom Checkbox Component
 */
export interface CustomCheckboxProps {
  checked: boolean;
  onPress: () => void;
  label?: string;
  linkText?: string;
  onLinkPress?: () => void;
  error?: string;
  disabled?: boolean;
  style?: any;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onPress,
  label,
  linkText,
  onLinkPress,
  error,
  disabled = false,
  style,
}) => {
  const { colors } = useTheme();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  return (
    <View style={[
      styles.checkboxContainer, 
      { flexDirection: isRTL ? 'row-reverse' : 'row' },
      style
    ]}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          styles.checkboxWrapper,
          {
            borderColor: error ? colors.error : (checked ? colors.primary : colors.border),
            backgroundColor: checked ? colors.primary : 'transparent',
            marginRight: isRTL ? 0 : 12,
            marginLeft: isRTL ? 12 : 0,
          },
        ]}
      >
        {checked && (
          <Ionicons
            name="checkmark"
            size={16}
            color="#FFFFFF"
            style={{ fontWeight: 'bold' }}
          />
        )}
      </TouchableOpacity>
      {label && (
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.7}
          style={{ flex: 1 }}
        >
          <Text style={[
            styles.checkboxText, 
            { 
              color: colors.textSecondary,
              textAlign: isRTL ? 'right' : 'left',
            }
          ]}>
            {label}{' '}
            {linkText && (
              <Text
                style={[styles.checkboxLink, { color: colors.primary }]}
                onPress={onLinkPress || onPress}
              >
                {linkText}
              </Text>
            )}
          </Text>
        </TouchableOpacity>
      )}
      {error && (
        <Text style={[
          styles.errorText, 
          { 
            color: colors.error, 
            marginTop: 4,
            textAlign: isRTL ? 'right' : 'left',
          }
        ]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16, // Tighter spacing between form fields
  },
  inputLabel: {
    fontSize: UIFontSizes.label, // Centralized: 16px
    fontWeight: '600', // Bold label
    marginBottom: 8, // Small gap between label and input
    height: 24, // Slightly taller for larger font
    lineHeight: 24,
    fontFamily: FontFamily.label,
  },
  inputWrapper: {
    borderRadius: 8, // Figma: rounded-[8px]
    flexDirection: 'row',
    alignItems: 'center',
    height: 48, // Increased from 43 for larger font
    minHeight: 48,
    paddingHorizontal: 12, // Increased padding
    paddingVertical: 8, // Figma: p-[8px]
    gap: 12, // Figma: gap-[12px]
    // No shadows, no elevation
  },
  input: {
    flex: 1,
    fontSize: UIFontSizes.input, // Centralized: 16px
    fontWeight: '400', // Regular weight for input text
    paddingVertical: 0, // Remove vertical padding for compact height
    paddingHorizontal: 0, // Remove horizontal padding since wrapper has it
    textAlignVertical: 'center', // Center text vertically
    fontFamily: FontFamily.input,
  },
  textArea: {
    minHeight: 100,
    height: 'auto' as any,
    paddingTop: 8,
    paddingBottom: 8,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  leftIcon: {
    // Icon positioned with gap from wrapper
  },
  rightIconStatic: {
    // Icon positioned with gap from wrapper (RTL)
  },
  rightIconButton: {
    padding: 4,
  },
  rightIcon: {
    // Icon positioned with gap from wrapper
  },
  errorText: {
    fontSize: UIFontSizes.error, // Centralized: 14px
    marginTop: 4,
    marginLeft: 4,
    fontFamily: FontFamily.body,
  },
  pickerWrapper: {
    borderRadius: 8, // Figma: rounded-[8px]
    flexDirection: 'row',
    alignItems: 'center',
    height: 48, // Increased from 43
    minHeight: 48,
    paddingHorizontal: 12, // Increased padding
    gap: 12, // Figma: gap-[12px]
    // No shadows, no elevation
  },
  pickerText: {
    fontSize: UIFontSizes.input, // Centralized: 16px
    fontWeight: '400', // Regular weight
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontFamily: FontFamily.input,
  },
  uploadButtonWrapper: {
    borderRadius: 8, // Figma: rounded-[8px]
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48, // Increased from 43
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: UIFontSizes.input, // Centralized: 16px
    fontWeight: '400', // Regular weight
    marginLeft: 8,
    fontFamily: FontFamily.input,
  },
  selectedChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: UIFontSizes.body, // Centralized: 16px
    marginRight: 6,
    fontFamily: FontFamily.body,
  },
  chipCloseButton: {
    padding: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxWrapper: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    // marginRight/marginLeft is set dynamically for RTL support
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: {
    flex: 1,
    fontSize: UIFontSizes.body, // Centralized: 16px
    lineHeight: 22,
    fontFamily: FontFamily.body,
  },
  checkboxLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

