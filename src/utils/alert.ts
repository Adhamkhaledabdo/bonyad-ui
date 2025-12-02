import { Alert, Platform } from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Cross-platform alert utility
 * Uses window.alert/window.confirm on web, Alert.alert on mobile
 */
export const showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void => {
  if (Platform.OS === 'web') {
    // Web implementation
    if (buttons && buttons.length > 1) {
      // Two-button alert - use confirm
      const confirmButton = buttons.find(btn => btn.style !== 'cancel');
      const cancelButton = buttons.find(btn => btn.style === 'cancel');
      
      if (confirmButton) {
        const confirmed = window.confirm(`${title}\n\n${message || ''}`);
        if (confirmed && confirmButton.onPress) {
          confirmButton.onPress();
        } else if (!confirmed && cancelButton && cancelButton.onPress) {
          cancelButton.onPress();
        }
      } else {
        // Just show message with OK
        window.alert(`${title}\n\n${message || ''}`);
        if (buttons[0]?.onPress) {
          buttons[0].onPress();
        }
      }
    } else {
      // Single button alert - use alert
      window.alert(`${title}\n\n${message || ''}`);
      if (buttons && buttons[0]?.onPress) {
        buttons[0].onPress();
      }
    }
  } else {
    // Mobile implementation - use React Native Alert
    if (buttons && buttons.length > 0) {
      Alert.alert(title, message, buttons);
    } else {
      Alert.alert(title, message, [{ text: 'OK' }]);
    }
  }
};

/**
 * Convenience function for error alerts
 */
export const showError = (message: string, title: string = 'Error'): void => {
  showAlert(title, message);
};

/**
 * Convenience function for success alerts
 */
export const showSuccess = (message: string, title: string = 'Success', onPress?: () => void): void => {
  showAlert(title, message, onPress ? [{ text: 'OK', onPress }] : undefined);
};

/**
 * Convenience function for confirmation dialogs
 */
export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void => {
  showAlert(
    title,
    message,
    [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'OK',
        style: 'default',
        onPress: onConfirm,
      },
    ]
  );
};
