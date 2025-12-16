/**
 * Global Alert Manager
 * Allows showing alerts from anywhere in the app, including non-component contexts
 */

import { AlertButton } from '../components/AlertPopup';
import { ConfirmationType } from '../components/ConfirmationPopup';

type AlertType = 'error' | 'success' | 'warning' | 'info';

interface AlertConfig {
  title: string;
  message?: string;
  type: AlertType;
  buttons?: AlertButton[];
}

interface ConfirmationConfig {
  title: string;
  message: string;
  type?: ConfirmationType;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel?: () => void;
}

type AlertHandler = (config: AlertConfig) => void;
type ConfirmationHandler = (config: ConfirmationConfig) => void;

class GlobalAlertManager {
  private alertHandler: AlertHandler | null = null;
  private confirmationHandler: ConfirmationHandler | null = null;

  registerAlertHandler(handler: AlertHandler) {
    this.alertHandler = handler;
  }

  registerConfirmationHandler(handler: ConfirmationHandler) {
    this.confirmationHandler = handler;
  }

  showAlert(title: string, message?: string, type: AlertType = 'info', buttons?: AlertButton[]) {
    if (this.alertHandler) {
      this.alertHandler({ title, message, type, buttons });
    } else {
      // Fallback to console if no handler registered
      console.warn('Alert:', title, message);
    }
  }

  showError(message: string, title: string = 'Error') {
    this.showAlert(title, message, 'error');
  }

  showSuccess(message: string, title: string = 'Success', onPress?: () => void) {
    this.showAlert(
      title,
      message,
      'success',
      onPress ? [{ text: 'OK', onPress }] : undefined
    );
  }

  showWarning(message: string, title: string = 'Warning') {
    this.showAlert(title, message, 'warning');
  }

  showInfo(message: string, title: string = 'Info') {
    this.showAlert(title, message, 'info');
  }

  showConfirm(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    type: ConfirmationType = 'warning'
  ) {
    if (this.confirmationHandler) {
      this.confirmationHandler({
        title,
        message,
        type,
        onConfirm,
        onCancel,
      });
    } else {
      // Fallback to console if no handler registered
      console.warn('Confirm:', title, message);
    }
  }
}

export const globalAlertManager = new GlobalAlertManager();

