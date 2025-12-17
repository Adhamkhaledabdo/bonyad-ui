import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

// Predefined color palette
const PRESET_COLORS = [
  '#0080E0', '#0066B3', '#33A3FF', // Blues
  '#2C3E50', '#34495E', '#7F8C8D', // Grays
  '#4CAF50', '#8BC34A', '#CDDC39', // Greens
  '#FF9800', '#FF5722', '#F44336', // Oranges/Red
  '#9C27B0', '#673AB7', '#3F51B5', // Purples
  '#E91E63', '#F50057', '#C2185B', // Pinks
  '#00BCD4', '#009688', '#4DD0E1', // Teals
  '#795548', '#5D4037', '#3E2723', // Browns
  '#000000', '#FFFFFF', '#F5F5F5', // Black/White
];

export default function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  const defaultColor = value || '#0080E0';
  const [hexInput, setHexInput] = useState(defaultColor);

  const isValidHex = (hex: string) => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
  };

  const handleColorSelect = (color: string) => {
    setHexInput(color);
    onChange(color);
    // Don't close modal immediately - let user see the selection
  };
  
  const handleDone = () => {
    setShowPicker(false);
  };

  const handleHexChange = (text: string) => {
    // Add # if not present
    if (text && !text.startsWith('#')) {
      text = '#' + text;
    }
    setHexInput(text);
    if (isValidHex(text)) {
      onChange(text);
    }
  };

  const currentColor = (value && isValidHex(value)) ? value : defaultColor;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}
      
      <TouchableOpacity
        style={[styles.colorButton, { borderColor: colors.border }]}
        onPress={() => setShowPicker(true)}
      >
        <View style={[styles.colorPreview, { backgroundColor: currentColor }]} />
        <Text style={[styles.colorText, { color: colors.text }]}>
          {currentColor.toUpperCase()}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={handleDone}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleDone}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('Select Color')}
              </Text>
              <TouchableOpacity onPress={handleDone}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {/* Current Color Preview */}
              <View style={[styles.currentColorPreview, { borderColor: colors.border }]}>
                <Text style={[styles.currentColorLabel, { color: colors.textSecondary }]}>
                  {t('Current Color')}:
                </Text>
                <View style={styles.currentColorDisplay}>
                  <View style={[styles.largeColorPreview, { backgroundColor: currentColor }]} />
                  <Text style={[styles.currentColorHex, { color: colors.text }]}>
                    {currentColor.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Hex Input */}
              <View style={[styles.hexInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.hexLabel, { color: colors.text }]}>
                  {t('Enter Hex Color')}:
                </Text>
                <View style={styles.hexInputRow}>
                  <View style={[styles.colorPreviewSmall, { backgroundColor: currentColor }]} />
                  <TextInput
                    style={[styles.hexInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={hexInput}
                    onChangeText={handleHexChange}
                    placeholder="#0080E0"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={7}
                    autoCapitalize="none"
                  />
                </View>
                {Platform.OS === 'web' && (
                  <View style={styles.webColorInputContainer}>
                    <Text style={[styles.webColorLabel, { color: colors.text }]}>
                      {t('Or use color picker')}:
                    </Text>
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e: any) => handleColorSelect(e.target.value)}
                      style={{
                        width: '100%',
                        height: 60,
                        marginTop: 8,
                        border: `2px solid ${colors.border}`,
                        borderRadius: 12,
                        cursor: 'pointer',
                        backgroundColor: 'transparent',
                      } as any}
                    />
                  </View>
                )}
              </View>

              {/* Preset Colors */}
              <View style={styles.presetSection}>
                <Text style={[styles.presetLabel, { color: colors.text }]}>
                  {t('Preset Colors')}:
                </Text>
                <View style={styles.presetGrid}>
                  {PRESET_COLORS.map((color) => {
                    const isSelected = currentColor.toUpperCase() === color.toUpperCase();
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.presetColor,
                          { backgroundColor: color },
                          isSelected && [styles.selectedColor, { borderColor: colors.primary, borderWidth: 3 }],
                        ]}
                        onPress={() => handleColorSelect(color)}
                        activeOpacity={0.7}
                      >
                        {isSelected && (
                          <View style={styles.checkmarkContainer}>
                            <Ionicons name="checkmark-circle" size={24} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: colors.primary }]}
                onPress={handleDone}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.doneButtonText}>{t('Done')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  colorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  colorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    ...Platform.select({
      web: {
        maxHeight: '85vh',
        borderRadius: 24,
        margin: 'auto',
        width: '90%',
        maxWidth: 500,
      } as any,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalScrollView: {
    padding: 20,
  },
  currentColorPreview: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  currentColorLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentColorDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  largeColorPreview: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  currentColorHex: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  hexInputContainer: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  hexLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#666',
  },
  hexInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Platform.OS === 'web' ? 12 : 0,
  },
  colorPreviewSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  hexInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  webColorInputContainer: {
    marginTop: 12,
  },
  webColorLabel: {
    fontSize: 12,
    marginBottom: 8,
    opacity: 0.7,
  },
  presetSection: {
    marginTop: 8,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    color: '#666',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetColor: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 1,
      },
    }),
  },
  selectedColor: {
    transform: [{ scale: 1.1 }],
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 128, 224, 0.4)',
      } as any,
      default: {
        elevation: 4,
      },
    }),
  },
  checkmarkContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 2,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      } as any,
    }),
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

