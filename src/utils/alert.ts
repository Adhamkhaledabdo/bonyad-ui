import { AlertButton } from '../components/AlertPopup';
import { globalAlertManager } from './globalAlertManager';

/**
 * Cross-platform alert utility
 * Uses AlertPopup component via global alert manager
 */
export const showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void => {
  // Determine alert type based on buttons or default to 'info'
  let type: 'error' | 'success' | 'warning' | 'info' = 'info';
  
  // If there's a destructive button, use 'error' type
  if (buttons?.some(btn => btn.style === 'destructive')) {
    type = 'error';
  }
  
  globalAlertManager.showAlert(title, message, type, buttons);
};

/**
 * Convenience function for error alerts
 */
export const showError = (message: string, title: string = 'Error'): void => {
  globalAlertManager.showError(message, title);
};

/**
 * Convenience function for success alerts
 */
export const showSuccess = (message: string, title: string = 'Success', onPress?: () => void): void => {
  globalAlertManager.showSuccess(message, title, onPress);
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
  globalAlertManager.showConfirm(title, message, onConfirm, onCancel);
};
