import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';

interface CommissionPaymentScreenProps {
  onBack?: () => void;
}

export default function CommissionPaymentScreen({ onBack }: 
  CommissionPaymentScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [projectAmount, setProjectAmount] = useState('');
  const [commission, setCommission] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Custom popup hooks
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showConfirmation, hideConfirmation } = useConfirmationPopup();

  // Calculate commission (1% of project amount)
  const calculateCommission = (amountString: string) => {
    // Remove any non-numeric characters except decimal point
    const cleanAmount = amountString.replace(/[^0-9.]/g, '');
    
    if (cleanAmount && !isNaN(parseFloat(cleanAmount)) && parseFloat(cleanAmount) > 0) {
      const amount = parseFloat(cleanAmount);
      const fee = amount * 0.01;
      setCommission(fee.toFixed(2));
    } else {
      setCommission('');
    }
  };

  const commissionAmount = commission ? parseFloat(commission) : 0;

  const handleAmountChange = (value: string) => {
    setProjectAmount(value);
    calculateCommission(value);
  };

  const processPayment = () => {
    if (commissionAmount <= 0) return;

    showConfirmation(
      t('Payment Confirmation'),
      t('You are about to pay {{amount}} SAR commission', { amount: commissionAmount.toFixed(2) }),
      async () => {
        setIsProcessingPayment(true);
        try {
          // TODO: Implement actual payment logic here
          console.log(`💳 Processing payment of ${commissionAmount} SAR`);
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          showSuccess(t('Payment successful'), t('Success'));
          setProjectAmount('');
          setCommission('');
        } catch (error) {
          showError(t('Failed to process payment'), t('Error'));
        } finally {
          setIsProcessingPayment(false);
        }
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
        {/* Header */}
        {onBack && (
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onBack}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(20) }]}>
              {t('Commission Payment')}
            </Text>
            <View style={{ width: 24 }} />
          </View>
        )}

        <View style={styles.content}>
          {/* Title */}
          <Text style={[styles.title, { color: colors.text, fontSize: scaledSize(24) }]}>
            {t('Commission Payment')}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
            {t('Enter the project amount to calculate and pay the commission fee (1% of project amount)')}
          </Text>

          {/* Project Amount Field */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text, fontSize: scaledSize(16) }]}>
              {t('Project Amount')}
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t('Enter project amount')}
                placeholderTextColor={colors.textSecondary}
                value={projectAmount}
                onChangeText={handleAmountChange}
                keyboardType="decimal-pad"
                {...Platform.select({
                  web: {
                    inputMode: 'decimal' as any,
                    autoComplete: 'off' as any,
                    type: 'text' as any,
                  },
                })}
              />
              <Text style={[styles.currency, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>SAR</Text>
            </View>
          </View>

          {/* Commission Value Field (Read-only) */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text, fontSize: scaledSize(16) }]}>
              {t('Commission Amount')}
            </Text>
            <View style={[styles.inputContainer, styles.disabledInput, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={commission ? `${commission} SAR` : ''}
                placeholder={t('Will be calculated automatically')}
                placeholderTextColor={colors.textSecondary}
                editable={false}
              />
            </View>
          </View>

          {/* Info Text */}
          <View style={[styles.infoContainer, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text, fontSize: scaledSize(14) }]}>
              {t('Commission is calculated as 1% of the project amount')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Pay Button (Fixed at bottom) */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.payButton,
            {
              backgroundColor: commissionAmount > 0 ? colors.primary : colors.border,
              opacity: commissionAmount > 0 && !isProcessingPayment ? 1 : 0.6,
            },
          ]}
          onPress={processPayment}
          disabled={commissionAmount <= 0 || isProcessingPayment}
        >
          {isProcessingPayment ? (
            <View style={styles.processingContainer}>
              <Text style={[styles.payButtonText, { color: colors.cardBackground, fontSize: scaledSize(18) }]}>
                {t('Processing...')}
              </Text>
            </View>
          ) : (
            <Text style={[styles.payButtonText, { color: colors.cardBackground, fontSize: scaledSize(18) }]}>
              {t('Pay {{amount}} SAR', { amount: commissionAmount > 0 ? commissionAmount.toFixed(2) : '0.00' })}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      
      {/* Confirmation Popup */}
      <ConfirmationPopup
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmStyle={confirmState.confirmStyle}
        icon={confirmState.icon}
        onConfirm={confirmState.onConfirm}
        onCancel={hideConfirmation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 20,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      android: {
        elevation: 1,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  disabledInput: {
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
        WebkitAppearance: 'none' as any,
      },
    }),
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    ...Platform.select({
      android: {
        elevation: 8,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  payButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
    ...Platform.select({
      android: {
        elevation: 2,
      },
    }),
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
