/**
 * 🔤 FONTS: App-wide font family and size configuration
 * 
 * Language-aware fonts:
 * - English: System/default fonts
 * - Arabic: Sakkal Majalla
 * 
 * Font files should be placed in: assets/fonts/
 * Required files:
 * - alfont_com_majalla.ttf (SakkalMajalla)
 * 
 * Download from: https://alfont.com/sakkal-majalla-arabic-font-download.html
 */

import { Platform } from 'react-native';

// Arabic font family - used for Arabic language
export const ARABIC_FONT = 'SakkalMajalla';
export const ARABIC_FONT_BOLD = 'SakkalMajalla-Bold';

// System/default font - used for English and other languages
export const SYSTEM_FONT = Platform.select({
  ios: 'System',
  android: 'Roboto',
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  default: undefined,
});

export const SYSTEM_FONT_BOLD = Platform.select({
  ios: 'System',
  android: 'Roboto',
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  default: undefined,
});

// Legacy exports for backwards compatibility (these use Arabic font)
export const PRIMARY_FONT = ARABIC_FONT;
export const PRIMARY_FONT_BOLD = ARABIC_FONT_BOLD;

/**
 * Get font family based on language
 * @param isArabic - Whether the current language is Arabic
 * @returns The appropriate font family string
 */
export const getFontFamily = (isArabic: boolean): string | undefined => {
  if (isArabic) {
    return ARABIC_FONT;
  }
  return SYSTEM_FONT;
};

/**
 * Get bold font family based on language
 * @param isArabic - Whether the current language is Arabic
 * @returns The appropriate bold font family string
 */
export const getBoldFontFamily = (isArabic: boolean): string | undefined => {
  if (isArabic) {
    return ARABIC_FONT_BOLD;
  }
  return SYSTEM_FONT_BOLD;
};

// Font families for different use cases (Arabic - legacy)
export const Fonts = {
  // Primary/Default font
  primary: ARABIC_FONT,
  primaryBold: ARABIC_FONT_BOLD,
  
  // Headings (titles, headers) - use bold
  heading: ARABIC_FONT_BOLD,
  
  // Body text (paragraphs, descriptions)
  body: ARABIC_FONT,
  
  // Labels (form labels, captions)
  label: ARABIC_FONT,
  
  // Input text (text inside input fields)
  input: ARABIC_FONT,
  
  // Buttons
  button: ARABIC_FONT_BOLD,
  
  // Navigation (tabs, menu items)
  navigation: ARABIC_FONT,
  
  // Monospace (code, technical text)
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    web: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace",
  }),
  
  // Arabic text (for RTL support)
  arabic: Platform.select({
    ios: ARABIC_FONT,
    android: ARABIC_FONT,
    web: `'${ARABIC_FONT}', 'Noto Sans Arabic', 'Arial', sans-serif`,
  }),
};

// Platform-specific font family strings (legacy - uses Arabic font)
export const FontFamily = {
  primary: Platform.select({
    ios: ARABIC_FONT,
    android: ARABIC_FONT,
    web: `'${ARABIC_FONT}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  }),
  
  primaryBold: Platform.select({
    ios: ARABIC_FONT_BOLD,
    android: ARABIC_FONT_BOLD,
    web: `'${ARABIC_FONT_BOLD}', '${ARABIC_FONT}', system-ui, -apple-system, sans-serif`,
  }),
  
  heading: Platform.select({
    ios: Fonts.heading,
    android: Fonts.heading,
    web: `'${Fonts.heading}', '${ARABIC_FONT}', system-ui, -apple-system, sans-serif`,
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
    web: `'${Fonts.button}', '${ARABIC_FONT}', system-ui, -apple-system, sans-serif`,
  }),
  
  mono: Fonts.mono,
  
  arabic: Fonts.arabic,
};

/**
 * Get language-aware FontFamily object
 * @param isArabic - Whether the current language is Arabic
 * @returns FontFamily object with appropriate fonts
 */
export const getLanguageFontFamily = (isArabic: boolean) => {
  const font = getFontFamily(isArabic);
  const boldFont = getBoldFontFamily(isArabic);
  
  return {
    primary: font,
    primaryBold: boldFont,
    heading: boldFont,
    body: font,
    label: font,
    input: font,
    button: boldFont,
    mono: Fonts.mono,
    arabic: Fonts.arabic,
  };
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

// Font size scale types
export type FontSizeScale = 'small' | 'medium' | 'large';

// Font size multipliers for each scale
export const FONT_SIZE_MULTIPLIERS: Record<FontSizeScale, number> = {
  small: 0.85,
  medium: 1.0,
  large: 1.2,
};

// Base font sizes (generic scale) - at medium (1.0x)
const BASE_FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 38,
  '6xl': 46,
  '7xl': 54,
};

// Default font sizes at medium scale
export const FontSizes = BASE_FONT_SIZES;

/**
 * Get scaled font sizes based on the selected scale
 * @param scale - The font size scale (small, medium, large)
 * @returns Object with all font sizes scaled appropriately
 */
export const getScaledFontSizes = (scale: FontSizeScale = 'medium') => {
  const multiplier = FONT_SIZE_MULTIPLIERS[scale];
  return {
    xs: Math.round(BASE_FONT_SIZES.xs * multiplier),
    sm: Math.round(BASE_FONT_SIZES.sm * multiplier),
    md: Math.round(BASE_FONT_SIZES.md * multiplier),
    lg: Math.round(BASE_FONT_SIZES.lg * multiplier),
    xl: Math.round(BASE_FONT_SIZES.xl * multiplier),
    '2xl': Math.round(BASE_FONT_SIZES['2xl'] * multiplier),
    '3xl': Math.round(BASE_FONT_SIZES['3xl'] * multiplier),
    '4xl': Math.round(BASE_FONT_SIZES['4xl'] * multiplier),
    '5xl': Math.round(BASE_FONT_SIZES['5xl'] * multiplier),
    '6xl': Math.round(BASE_FONT_SIZES['6xl'] * multiplier),
    '7xl': Math.round(BASE_FONT_SIZES['7xl'] * multiplier),
  };
};

// Base UI-specific font sizes (at medium scale)
const BASE_UI_FONT_SIZES = {
  // Form elements
  label: 20,
  input: 18,
  placeholder: 16,
  error: 14,
  
  // Buttons
  buttonLarge: 54,
  buttonMedium: 22,
  buttonSmall: 20,
  
  // Titles & Headers
  welcomeTitle: 40,
  welcomeSubtitle: 24,
  sectionTitle: 26,
  cardTitle: 22,
  
  // Body text
  bodyLarge: 18,
  body: 16,
  bodySmall: 14,
  caption: 14,
  
  // Links
  link: 24,
  linkSmall: 20,
  
  // Navigation
  navItem: 16,
  tabLabel: 14,
  
  // Mobile Logo
  logoText: 30,
  logoArabic: 24,
  
  // Language toggle
  langToggle: 20,
  
  // OTP
  otpInput: 36,
  otpLabel: 22,
  
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

// Default UI font sizes at medium scale
export const UIFontSizes = BASE_UI_FONT_SIZES;

/**
 * Get scaled UI font sizes based on the selected scale
 * @param scale - The font size scale (small, medium, large)
 * @returns Object with all UI font sizes scaled appropriately
 */
export const getScaledUIFontSizes = (scale: FontSizeScale = 'medium') => {
  const multiplier = FONT_SIZE_MULTIPLIERS[scale];
  return {
    // Form elements
    label: Math.round(BASE_UI_FONT_SIZES.label * multiplier),
    input: Math.round(BASE_UI_FONT_SIZES.input * multiplier),
    placeholder: Math.round(BASE_UI_FONT_SIZES.placeholder * multiplier),
    error: Math.round(BASE_UI_FONT_SIZES.error * multiplier),
    
    // Buttons
    buttonLarge: Math.round(BASE_UI_FONT_SIZES.buttonLarge * multiplier),
    buttonMedium: Math.round(BASE_UI_FONT_SIZES.buttonMedium * multiplier),
    buttonSmall: Math.round(BASE_UI_FONT_SIZES.buttonSmall * multiplier),
    
    // Titles & Headers
    welcomeTitle: Math.round(BASE_UI_FONT_SIZES.welcomeTitle * multiplier),
    welcomeSubtitle: Math.round(BASE_UI_FONT_SIZES.welcomeSubtitle * multiplier),
    sectionTitle: Math.round(BASE_UI_FONT_SIZES.sectionTitle * multiplier),
    cardTitle: Math.round(BASE_UI_FONT_SIZES.cardTitle * multiplier),
    
    // Body text
    bodyLarge: Math.round(BASE_UI_FONT_SIZES.bodyLarge * multiplier),
    body: Math.round(BASE_UI_FONT_SIZES.body * multiplier),
    bodySmall: Math.round(BASE_UI_FONT_SIZES.bodySmall * multiplier),
    caption: Math.round(BASE_UI_FONT_SIZES.caption * multiplier),
    
    // Links
    link: Math.round(BASE_UI_FONT_SIZES.link * multiplier),
    linkSmall: Math.round(BASE_UI_FONT_SIZES.linkSmall * multiplier),
    
    // Navigation
    navItem: Math.round(BASE_UI_FONT_SIZES.navItem * multiplier),
    tabLabel: Math.round(BASE_UI_FONT_SIZES.tabLabel * multiplier),
    
    // Mobile Logo
    logoText: Math.round(BASE_UI_FONT_SIZES.logoText * multiplier),
    logoArabic: Math.round(BASE_UI_FONT_SIZES.logoArabic * multiplier),
    
    // Language toggle
    langToggle: Math.round(BASE_UI_FONT_SIZES.langToggle * multiplier),
    
    // OTP
    otpInput: Math.round(BASE_UI_FONT_SIZES.otpInput * multiplier),
    otpLabel: Math.round(BASE_UI_FONT_SIZES.otpLabel * multiplier),
    
    // Desktop specific
    desktop: {
      welcomeTitle: Math.round(BASE_UI_FONT_SIZES.desktop.welcomeTitle * multiplier),
      welcomeSubtitle: Math.round(BASE_UI_FONT_SIZES.desktop.welcomeSubtitle * multiplier),
      buttonLabel: Math.round(BASE_UI_FONT_SIZES.desktop.buttonLabel * multiplier),
      linkText: Math.round(BASE_UI_FONT_SIZES.desktop.linkText * multiplier),
      formTitle: Math.round(BASE_UI_FONT_SIZES.desktop.formTitle * multiplier),
      formSubtitle: Math.round(BASE_UI_FONT_SIZES.desktop.formSubtitle * multiplier),
    },
  };
};

export default Fonts;
