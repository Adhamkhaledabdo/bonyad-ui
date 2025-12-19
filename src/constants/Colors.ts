// 🎨 THEME: App-wide color palette with light/dark mode support

export const LightColors = {
  // Primary
  primary: '#0080E0',
  primaryDark: '#0066B3',
  primaryLight: '#33A3FF',
  
  // Background
  background: '#F5F7FA',
  cardBackground: '#FFFFFF',
  surface: '#FFFFFF',
  
  // Text
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  
  // Status
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  
  // Grays
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  
  // TextField Background
  textFieldBackground: '#FFFFFF',
  
  // Social
  google: '#DB4437',
  apple: '#000000',
  twitter: '#1DA1F2',
  
  // Project Status
  pending: '#FF9800',
  accepted: '#4CAF50',
  rejected: '#F44336',
  inProgress: '#2196F3',
  completed: '#4CAF50',
  
  // UI Elements
  border: '#DDDDDD',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // White & Black
  white: '#FFFFFF',
  black: '#000000',
  
  // Legacy support
  textDark: '#1A1A1A',
  textMedium: '#666666',
  textLight: '#999999',
};

export const DarkColors = {
  // Primary - Brand Blue (consistent across light and dark mode)
  primary: '#00A5F4',
  primaryDark: '#0088CC',
  primaryLight: '#33B8FF',
  
  // Background - Pure Black as specified
  background: '#000000',
  cardBackground: '#1C1C1E', // iOS secondarySystemBackground equivalent (dark gray)
  surface: '#1C1C1E', // Same as cardBackground for consistency
  secondaryBackground: 'rgba(0, 0, 0, 0.9)', // 90% opacity black
  
  // Text - White for optimal contrast
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#888888',
  
  // Status
  success: '#66BB6A',
  error: '#FF0000', // Red as specified for destructive actions
  warning: '#FFB74D',
  info: '#00A5F4', // Use brand blue for info
  
  // Grays - Adjusted for dark mode
  gray100: '#1C1C1E',
  gray200: '#2C2C2E',
  gray300: '#3A3A3C',
  gray400: '#48484A',
  gray500: '#636366',
  
  // TextField Background - iOS darkGray equivalent
  textFieldBackground: '#2C2C2E', // Dark gray for text fields
  
  // Social
  google: '#DB4437',
  apple: '#FFFFFF',
  twitter: '#1DA1F2',
  
  // Project Status
  pending: '#FFB74D',
  accepted: '#66BB6A',
  rejected: '#FF0000', // Red for rejected
  inProgress: '#00A5F4', // Brand blue
  completed: '#66BB6A',
  
  // UI Elements
  border: '#2C2C2E',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  // Tab Bar Background - iOS secondarySystemBackground
  tabBarBackground: '#1C1C1E',
  
  // White & Black
  white: '#FFFFFF',
  black: '#000000',
  
  // Legacy support
  textDark: '#FFFFFF',
  textMedium: '#B0B0B0',
  textLight: '#888888',
};

export const Colors = LightColors; // Default for backward compatibility

export const Gradients = {
  primary: ['#0080E0', '#0066B3'],
  success: ['#4CAF50', '#388E3C'],
  error: ['#F44336', '#D32F2F'],
  blue: ['#2196F3', '#1976D2'],
};

