import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { 
  getFontFamily, 
  getBoldFontFamily, 
  getLanguageFontFamily, 
  ARABIC_FONT,
  FontSizeScale,
  FONT_SIZE_MULTIPLIERS,
  getScaledFontSizes,
  getScaledUIFontSizes,
} from '../constants/Fonts';
import { storage } from '../utils/storage';

interface FontContextType {
  fontFamily: string | undefined;
  boldFontFamily: string | undefined;
  isArabic: boolean;
  fonts: ReturnType<typeof getLanguageFontFamily>;
  // Font size related
  fontSizeScale: FontSizeScale;
  setFontSizeScale: (scale: FontSizeScale) => void;
  fontSizes: ReturnType<typeof getScaledFontSizes>;
  uiFontSizes: ReturnType<typeof getScaledUIFontSizes>;
  // Helper to get scaled font size
  scaledSize: (baseSize: number) => number;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

// CSS style ID for web font injection
const FONT_STYLE_ID = 'bonyad-global-font';

export function FontProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [fontSizeScale, setFontSizeScaleState] = useState<FontSizeScale>('medium');
  const [isLoaded, setIsLoaded] = useState(false);

  const fontFamily = getFontFamily(isArabic);
  const boldFontFamily = getBoldFontFamily(isArabic);
  const fonts = getLanguageFontFamily(isArabic);
  const fontSizes = getScaledFontSizes(fontSizeScale);
  const uiFontSizes = getScaledUIFontSizes(fontSizeScale);

  // Load saved font size preference on mount
  useEffect(() => {
    const loadFontSize = async () => {
      const savedFontSize = await storage.getFontSize();
      setFontSizeScaleState(savedFontSize);
      setIsLoaded(true);
    };
    loadFontSize();
  }, []);

  // Function to change and persist font size
  const setFontSizeScale = useCallback(async (scale: FontSizeScale) => {
    setFontSizeScaleState(scale);
    await storage.saveFontSize(scale);
  }, []);

  // Helper function to scale any font size
  const scaledSize = useCallback((baseSize: number) => {
    return Math.round(baseSize * FONT_SIZE_MULTIPLIERS[fontSizeScale]);
  }, [fontSizeScale]);

  // Inject global CSS on web to override React Native Web's font shorthand
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      let styleEl = document.getElementById(FONT_STYLE_ID) as HTMLStyleElement;
      
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = FONT_STYLE_ID;
        document.head.appendChild(styleEl);
      }
      
      // For Arabic: use SakkalMajalla
      // For English: use system default fonts
      const fontFamilyCSS = isArabic 
        ? `'SakkalMajalla', 'Noto Sans Arabic', system-ui, sans-serif`
        : `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
      
      // Get the font size multiplier for current scale
      const sizeMultiplier = FONT_SIZE_MULTIPLIERS[fontSizeScale];
      
      // Override font-family for text elements only
      // Exclude icon fonts by not targeting elements with icon font-families
      styleEl.textContent = `
        /* Global font override for ${isArabic ? 'Arabic' : 'English'} - Scale: ${fontSizeScale} (${sizeMultiplier}x) */
        
        :root {
          --bonyad-font-scale: ${sizeMultiplier};
        }
        
        /* Target React Native Web text elements */
        [dir] [class*="css-text"]:not([style*="Ionicons"]):not([style*="ionicons"]):not([style*="Material"]):not([style*="FontAwesome"]):not([style*="icon"]),
        [dir] [class*="r-fontFamily"]:not([style*="Ionicons"]):not([style*="ionicons"]):not([style*="Material"]):not([style*="FontAwesome"]):not([style*="icon"]) {
          font-family: ${fontFamilyCSS} !important;
        }
        
        /* Target form elements */
        input:not([type="button"]):not([type="submit"]),
        textarea,
        select,
        button {
          font-family: ${fontFamilyCSS} !important;
        }
      `;
    }
    
    return () => {
      // Cleanup is optional - we keep the style for performance
    };
  }, [isArabic, fontSizeScale]);

  return (
    <FontContext.Provider value={{ 
      fontFamily, 
      boldFontFamily, 
      isArabic, 
      fonts,
      fontSizeScale,
      setFontSizeScale,
      fontSizes,
      uiFontSizes,
      scaledSize,
    }}>
      {children}
    </FontContext.Provider>
  );
}

/**
 * Hook to access font context for language-based font switching.
 * Must be used within a FontProvider.
 */
export function useFont() {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
}

/**
 * Standalone hook that doesn't require FontProvider.
 * Use this when FontProvider might not be available in the component tree.
 * Note: This hook does NOT have access to font size scaling from context.
 * For font size scaling, use useFont() within a FontProvider.
 */
export function useFontFamily() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const fontFamily = getFontFamily(isArabic);
  const boldFontFamily = getBoldFontFamily(isArabic);
  const fonts = getLanguageFontFamily(isArabic);

  // Try to get font size from context if available
  const context = useContext(FontContext);
  const fontSizeScale = context?.fontSizeScale ?? 'medium';
  const setFontSizeScale = context?.setFontSizeScale ?? (() => {});
  const fontSizes = context?.fontSizes ?? getScaledFontSizes('medium');
  const uiFontSizes = context?.uiFontSizes ?? getScaledUIFontSizes('medium');
  const scaledSize = context?.scaledSize ?? ((size: number) => size);

  return {
    fontFamily,
    boldFontFamily,
    isArabic,
    fonts,
    fontSizeScale,
    setFontSizeScale,
    fontSizes,
    uiFontSizes,
    scaledSize,
  };
}

export { getFontFamily, getBoldFontFamily, getLanguageFontFamily };
export type { FontSizeScale };
