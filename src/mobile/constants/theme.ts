import { useMemo } from 'react';

const brandColors = {
  primary: '#D92D32',
  primaryLight: '#F36B6E',
  primaryDark: '#B61F24',
};

const lightColors = {
  ...brandColors,
  primarySurface: '#FFF2F3',
  primarySurfaceStrong: '#FFE1E3',
  primaryGlow: 'rgba(217, 45, 50, 0.14)',

  white: '#FFFFFF',
  black: '#09090B',
  gray50: '#FBFCFE',
  gray100: '#F1F4F9',
  gray200: '#E5EAF2',
  gray300: '#D4DCE7',
  gray400: '#A4B0C0',
  gray500: '#728094',
  gray600: '#556172',
  gray700: '#3B4554',
  gray800: '#202733',
  gray900: '#10151D',

  background: '#F7F8FC',
  backgroundAlt: '#FCFCFE',
  surface: '#F4F7FB',
  surfaceMuted: '#F4F7FB',
  surfaceRaised: '#F4F7FB',
  surfaceTint: '#F4F7FB',
  surfaceOverlay: '#F4F7FB',
  border: '#E6EAF1',
  borderStrong: '#D7DEE8',
  text: '#10151D',
  textMuted: '#556172',
  textSubtle: '#7C8898',
  backdrop: 'rgba(16, 21, 29, 0.38)',

  success: '#16A34A',
  successLight: '#EAF8EE',
  warning: '#F59E0B',
  warningLight: '#FFF4DD',
  error: '#DC2626',
  errorLight: '#FDECEC',
  info: '#2563EB',
  infoLight: '#EAF1FF',

  available: '#16A34A',
  inStockyard: '#7A7068',
  inTransit: '#2563EB',
  completed: '#16A34A',
  pending: '#F59E0B',
  failed: '#DC2626',
} as const;

const darkColors = {
  ...brandColors,
  primaryLight: '#FF7E82',
  primarySurface: '#34161A',
  primarySurfaceStrong: '#4B1E23',
  primaryGlow: 'rgba(217, 45, 50, 0.22)',

  white: '#FFFFFF',
  black: '#05070B',
  gray50: '#0E141D',
  gray100: '#131B25',
  gray200: '#1B2532',
  gray300: '#2A3645',
  gray400: '#4A5A70',
  gray500: '#73839A',
  gray600: '#9AA9BC',
  gray700: '#C7D1DE',
  gray800: '#E6EBF2',
  gray900: '#F5F7FA',

  background: '#0B1016',
  backgroundAlt: '#111821',
  surface: '#131C27',
  surfaceMuted: '#121A23',
  surfaceRaised: '#17212D',
  surfaceTint: '#17212D',
  surfaceOverlay: '#192331',
  border: '#243140',
  borderStrong: '#324154',
  text: '#F5F7FA',
  textMuted: '#B6C2D2',
  textSubtle: '#8FA0B5',
  backdrop: 'rgba(2, 6, 12, 0.7)',

  success: '#34D27B',
  successLight: '#10281C',
  warning: '#FFB546',
  warningLight: '#34270F',
  error: '#FF6B6F',
  errorLight: '#341619',
  info: '#5A96FF',
  infoLight: '#10213F',

  available: '#34D27B',
  inStockyard: '#A8B4C5',
  inTransit: '#5A96FF',
  completed: '#34D27B',
  pending: '#FFB546',
  failed: '#FF6B6F',
} as const;

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 18,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.15,
    normal: 1.45,
    relaxed: 1.6,
  },
  letterSpacing: {
    tight: -0.4,
    normal: 0,
    wide: 0.6,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

export const radius = {
  none: 0,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 30,
  full: 9999,
};

export const shadows = {
  none: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  sm: {
    elevation: 2,
    shadowColor: '#09111F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  md: {
    elevation: 5,
    shadowColor: '#09111F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  lg: {
    elevation: 8,
    shadowColor: '#09111F',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
  },
  xl: {
    elevation: 12,
    shadowColor: '#09111F',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.14,
    shadowRadius: 34,
  },
};

const buildTheme = (
  colors: typeof lightColors | typeof darkColors
) => ({
  colors: {
    ...colors,
    secondary: colors.gray900,
    danger: colors.error,
  },
  typography,
  fonts: {
    family: {
      sans: typography.fontFamily.regular,
      mono: 'monospace',
    },
  },
  spacing,
  radius,
  shadows,
});

export const lightTheme = buildTheme(lightColors);
export const darkTheme = buildTheme(darkColors);
export type AppTheme = typeof lightTheme;

let activeThemeReference: AppTheme = lightTheme;

// Legacy theme proxy for untouched screens/components.
export const theme = new Proxy(lightTheme as AppTheme, {
  get(_target, property) {
    return activeThemeReference[property as keyof AppTheme];
  },
}) as AppTheme;

export function useTheme(): AppTheme {
  const { useApp } = require('../context/AppContext') as typeof import('../context/AppContext');
  const { isDarkMode } = useApp();
  const resolvedTheme = isDarkMode ? darkTheme : lightTheme;
  activeThemeReference = resolvedTheme;
  return resolvedTheme;
}

export function useThemedStyles<T>(factory: (activeTheme: AppTheme) => T) {
  const activeTheme = useTheme();
  return useMemo(() => factory(activeTheme), [activeTheme]);
}
