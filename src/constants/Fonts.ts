/**
 * 🔤 FONTS: App-wide font family and size configuration
 * 
 * Primary font: Sakkal Majalla
 * All font sizes are INCREASED for better readability with SakkalMajalla
 * 
 * Font files should be placed in: assets/fonts/
 * Required files:
 * - alfont_com_majalla.ttf (SakkalMajalla)
 * 
 * Download from: https://alfont.com/sakkal-majalla-arabic-font-download.html
 */

import { Platform } from 'react-native';

// Primary font family - used as default throughout the app
export const PRIMARY_FONT = 'SakkalMajalla';
export const PRIMARY_FONT_BOLD = 'SakkalMajalla-Bold';

// Font families for different use cases
export const Fonts = {
  // Primary/Default font
  primary: PRIMARY_FONT,
  primaryBold: PRIMARY_FONT_BOLD,
  
  // Headings (titles, headers) - use bold
  heading: PRIMARY_FONT_BOLD,
  
  // Body text (paragraphs, descriptions)
  body: PRIMARY_FONT,
  
  // Labels (form labels, captions)
  label: PRIMARY_FONT,
  
  // Input text (text inside input fields)
  input: PRIMARY_FONT,
  
  // Buttons
  button: PRIMARY_FONT_BOLD,
  
  // Navigation (tabs, menu items)
  navigation: PRIMARY_FONT,
  
  // Monospace (code, technical text)
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    web: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace",
  }),
  
  // Arabic text (for RTL support)
  arabic: Platform.select({
    ios: PRIMARY_FONT,
    android: PRIMARY_FONT,
    web: `'${PRIMARY_FONT}', 'Noto Sans Arabic', 'Arial', sans-serif`,
  }),
};

// Platform-specific font family strings
export const FontFamily = {
  primary: Platform.select({
    ios: PRIMARY_FONT,
    android: PRIMARY_FONT,
    web: `'${PRIMARY_FONT}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  }),
  
  primaryBold: Platform.select({
    ios: PRIMARY_FONT_BOLD,
    android: PRIMARY_FONT_BOLD,
    web: `'${PRIMARY_FONT_BOLD}', '${PRIMARY_FONT}', system-ui, -apple-system, sans-serif`,
  }),
  
  heading: Platform.select({
    ios: Fonts.heading,
    android: Fonts.heading,
    web: `'${Fonts.heading}', '${PRIMARY_FONT}', system-ui, -apple-system, sans-serif`,
  }),
  
  body: Platform.select({
    ios: Fonts.body,
    android: Fonts.body,
    web: `'${Fonts.body}', system-ui, -apple-system, sans-serif`,
  }),
  
  label: Platform.select({
    ios: Fonts.label,
    android: Fonts.label,
    web: `'${Fonts.label}', system-ui, -apple-system, sans-serif`,
  }),
  
  input: Platform.select({
    ios: Fonts.input,
    android: Fonts.input,
    web: `'${Fonts.input}', system-ui, -apple-system, sans-serif`,
  }),
  
  button: Platform.select({
    ios: Fonts.button,
    android: Fonts.button,
    web: `'${Fonts.button}', '${PRIMARY_FONT}', system-ui, -apple-system, sans-serif`,
  }),
  
  mono: Fonts.mono,
  
  arabic: Fonts.arabic,
};

// Font weights
export const FontWeights = {
  thin: '100' as const,
  extraLight: '200' as const,
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
  black: '900' as const,
};

// ============================================
// 📏 FONT SIZES - INCREASED for SakkalMajalla
// ============================================

// Base font sizes (generic scale)
export const FontSizes = {
  xs: 12,    // was 10
  sm: 14,    // was 12
  md: 16,    // was 14
  lg: 18,    // was 16
  xl: 20,    // was 18
  '2xl': 24, // was 20
  '3xl': 28, // was 24
  '4xl': 32, // was 28
  '5xl': 38, // was 32
  '6xl': 46, // was 40
  '7xl': 54, // was 48
};

// UI-specific font sizes (use these in components)
export const UIFontSizes = {
  // Form elements
  label: 20,           // Form labels
  input: 18,           // Input text
  placeholder: 16,     // Placeholder text
  error: 14,           // Error messages
  
  // Buttons
  buttonLarge: 54,     // Large buttons
  buttonMedium: 22,    // Medium buttons (default)
  buttonSmall: 20,     // Small buttons
  
  // Titles & Headers
  welcomeTitle: 40,         // Welcome/Login screen titles
  welcomeSubtitle: 24,      // Welcome/Login screen subtitles
  sectionTitle: 26,         // Section headers
  cardTitle: 22,            // Card titles
  
  // Body text
  bodyLarge: 18,       // Large body text
  body: 16,            // Default body text
  bodySmall: 14,       // Small body text
  caption: 14,         // Captions/hints
  
  // Links
  link: 24,            // Link text
  linkSmall: 20,       // Small links
  
  // Navigation
  navItem: 16,         // Navigation items
  tabLabel: 14,        // Tab labels
  
  // Mobile Logo
  logoText: 30,        // "Bonyad" text
  logoArabic: 24,      // Arabic logo text
  
  // Language toggle
  langToggle: 20,      // Language toggle text
  
  // OTP
  otpInput: 36,        // OTP input digits
  otpLabel: 22,        // OTP labels
  
  // Desktop specific
  desktop: {
    welcomeTitle: 32,
    welcomeSubtitle: 20,
    buttonLabel: 22,
    linkText: 24,
    formTitle: 44,
    formSubtitle: 22,
  },
};

export default Fonts;

