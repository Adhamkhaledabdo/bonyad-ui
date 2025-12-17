import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import { storage } from '../utils/storage';

interface CostExplorerScreenProps {
  onBack: () => void;
}

export default function CostExplorerScreen({ onBack }: CostExplorerScreenProps) {
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const [roomType, setRoomType] = useState('kitchen');
  const [area, setArea] = useState('5');
  const [material, setMaterial] = useState('marble');
  const [city, setCity] = useState('riyadh');
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);

  const roomTypes = [
    { label: i18n.language === 'en' ? 'Kitchen' : 'مطبخ', value: 'kitchen' },
    { label: i18n.language === 'en' ? 'Living Room' : 'صالة', value: 'living' },
    { label: i18n.language === 'en' ? 'Bathroom' : 'حمام', value: 'bathroom' },
    { label: i18n.language === 'en' ? 'Bedroom' : 'غرفة نوم', value: 'bedroom' },
    { label: i18n.language === 'en' ? 'Office' : 'مكتب', value: 'office' },
  ];

  const materials = [
    { label: i18n.language === 'en' ? 'Marble' : 'رخام', value: 'marble' },
    { label: i18n.language === 'en' ? 'Tiles' : 'بلاط', value: 'tiles' },
    { label: i18n.language === 'en' ? 'Wood' : 'خشب', value: 'wood' },
    { label: i18n.language === 'en' ? 'Paint' : 'دهان', value: 'paint' },
  ];

  const cities = [
    { label: 'Riyadh', value: 'riyadh' },
    { label: 'Jeddah', value: 'jeddah' },
    { label: 'Dammam', value: 'dammam' },
    { label: 'Mecca', value: 'mecca' },
  ];

  const handleEstimate = async () => {
    setIsEstimating(true);
    
    try {
      const token = await storage.getAuthToken();
      
      const response = await fetch(buildApiUrl(API_ENDPOINTS.AI.COST_ESTIMATE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          roomType: roomType,
          areaM2: parseFloat(area) || 5,
          materials: [material],
          city: city.charAt(0).toUpperCase() + city.slice(1),
          style: 'modern',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEstimate(data);
      } else {
        const errorData = await response.json();
        Alert.alert(
          t('Error'),
          errorData.error || (i18n.language === 'en' ? 'Failed to get cost estimate' : 'فشل الحصول على تقدير التكلفة')
        );
      }
    } catch (error: any) {
      console.error('Cost Estimation API Error:', error);
      Alert.alert(
        t('Error'),
        i18n.language === 'en' ? 'Network error. Please try again.' : 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.'
      );
    } finally {
      setIsEstimating(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name={i18n.language === 'ar' ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
          {i18n.language === 'en' ? 'Cost Explorer' : 'استكشاف التكاليف'}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <View style={[styles.circle, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="calculator" size={60} color={colors.primary} />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text, fontSize: scaledSize(24) }]}>
          {i18n.language === 'en' ? 'Estimate Your Project' : 'قدّر مشروعك'}
        </Text>

        {/* Form */}
        <View style={styles.form}>
          {/* Room Type */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(16) }]}>
              {i18n.language === 'en' ? 'Room Type' : 'نوع الغرفة'}
            </Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Picker
                selectedValue={roomType}
                onValueChange={setRoomType}
                style={[styles.picker, { color: colors.text }]}
              >
                {roomTypes.map((item) => (
                  <Picker.Item key={item.value} label={item.label} value={item.value} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Area */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(16) }]}>
              {i18n.language === 'en' ? 'Area (m²)' : 'المساحة (م²)'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
              value={area}
              onChangeText={setArea}
              keyboardType="numeric"
              placeholder={i18n.language === 'en' ? 'Enter area' : 'أدخل المساحة'}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Material */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(16) }]}>
              {i18n.language === 'en' ? 'Material' : 'المادة'}
            </Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Picker
                selectedValue={material}
                onValueChange={setMaterial}
                style={[styles.picker, { color: colors.text }]}
              >
                {materials.map((item) => (
                  <Picker.Item key={item.value} label={item.label} value={item.value} />
                ))}
              </Picker>
            </View>
          </View>

          {/* City */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontSize: scaledSize(16) }]}>
              {i18n.language === 'en' ? 'City' : 'المدينة'}
            </Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Picker
                selectedValue={city}
                onValueChange={setCity}
                style={[styles.picker, { color: colors.text }]}
              >
                {cities.map((item) => (
                  <Picker.Item key={item.value} label={item.label} value={item.value} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Estimate Button */}
          <TouchableOpacity
            onPress={handleEstimate}
            style={[styles.estimateButton, { backgroundColor: colors.primary }]}
            disabled={isEstimating}
          >
            {isEstimating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="flash" size={24} color="#fff" />
                <Text style={[styles.estimateButtonText, { fontSize: scaledSize(18) }]}>
                  {i18n.language === 'en' ? 'Estimate Cost' : 'تقدير التكلفة'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Estimate Result */}
        {estimate && (
          <View style={[styles.resultContainer, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.resultTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
              {i18n.language === 'en' ? 'Estimated Cost' : 'التكلفة المقدرة'}
            </Text>
            <View style={styles.costRange}>
              <Text style={[styles.costAmount, { color: colors.primary, fontSize: scaledSize(32) }]}>
                {estimate.minCostSAR.toLocaleString()} - {estimate.maxCostSAR.toLocaleString()} SAR
              </Text>
            </View>
            <View style={styles.timeEstimate}>
              <Ionicons name="time" size={20} color={colors.textSecondary} />
              <Text style={[styles.timeText, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
                {estimate.estimatedTimeDays} {i18n.language === 'en' ? 'days' : 'أيام'}
              </Text>
            </View>
          </View>
        )}
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
  },
  backButton: {
    padding: 8,
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  pickerContainer: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
  },
  picker: {
    height: 50,
  },
  estimateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginTop: 10,
  },
  estimateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 30,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  costRange: {
    marginVertical: 15,
  },
  costAmount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 16,
  },
});

