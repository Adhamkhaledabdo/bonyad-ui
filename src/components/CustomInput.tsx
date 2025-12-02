/**
 * Custom Input Components
 * 
 * Reusable, professionally styled input components with rounded borders,
 * no shadows, and no underlines. Designed for consistent use across the app.
 */

import React, { useState } from 'react';
import { View, Text, TextInput as RNTextInput, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

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
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.cardBackground,
            borderColor: error ? colors.error : (isFocused ? colors.primary : colors.border),
            borderWidth: 1,
          },
          disabled && styles.inputDisabled,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={isFocused ? colors.primary : colors.textTertiary}
            style={styles.leftIcon}
          />
        )}
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || label}
          placeholderTextColor={colors.textTertiary}
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
              color: colors.text,
            },
            multiline && styles.textArea,
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
              color={isFocused ? colors.primary : colors.textTertiary}
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
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => setIsFocused(true)}
        onPressOut={() => setIsFocused(false)}
        style={[
          styles.pickerWrapper,
          {
            backgroundColor: colors.cardBackground,
            borderColor: error ? colors.error : (isFocused ? colors.primary : colors.border),
            borderWidth: 1,
          },
          disabled && styles.inputDisabled,
        ]}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.pickerText,
            {
              color: value ? colors.text : colors.textTertiary,
              flex: 1,
            },
          ]}
        >
          {value || placeholder || label}
        </Text>
        <Ionicons
          name={rightIcon}
          size={20}
          color={colors.textTertiary}
          style={styles.rightIcon}
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
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        onPressIn={() => setIsFocused(true)}
        onPressOut={() => setIsFocused(false)}
        style={[
          styles.uploadButtonWrapper,
          {
            backgroundColor: colors.cardBackground,
            borderColor: error ? colors.error : (isFocused ? colors.primary : colors.border),
          },
          disabled && styles.inputDisabled,
        ]}
        activeOpacity={0.7}
      >
        {loading && (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
        )}
        <Text
          style={[
            styles.uploadButtonText,
            {
              color: value ? colors.text : colors.textTertiary,
            },
          ]}
        >
          {value || placeholder || label}
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

  return (
    <View style={[styles.checkboxContainer, style]}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          styles.checkboxWrapper,
          {
            borderColor: error ? colors.error : (checked ? colors.primary : colors.border),
            backgroundColor: checked ? colors.primary : 'transparent',
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
          <Text style={[styles.checkboxText, { color: colors.textSecondary }]}>
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
        <Text style={[styles.errorText, { color: colors.error, marginTop: 4 }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16, // Reduced from 20 to make spacing smaller
  },
  // Label style removed - labels are now inside inputs as placeholders
  inputWrapper: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 4,
    // No shadows, no elevation
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: 12,
    textAlignVertical: 'top', // For multiline support
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  leftIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  rightIconButton: {
    padding: 8,
    marginRight: 8,
  },
  rightIcon: {
    marginRight: 12,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  pickerWrapper: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 4,
    // No shadows, no elevation
  },
  pickerText: {
    fontSize: 16,
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: 12,
  },
  uploadButtonWrapper: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
    marginLeft: 8,
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
    fontSize: 14,
    marginRight: 6,
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
    marginRight: 12,
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
    fontSize: 14,
    lineHeight: 20,
  },
  checkboxLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

