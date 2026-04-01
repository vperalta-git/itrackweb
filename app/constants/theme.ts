// I-TRACK Design System - Red & White Minimalist Theme

export const colors = {
  // Primary Brand
  primary: '#DC2626', // Red
  primaryLight: '#EF4444',
  primaryDark: '#991B1B',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Semantic
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Status
  available: '#10B981',
  inStockyard: '#6B7280',
  inTransit: '#3B82F6',
  completed: '#10B981',
  pending: '#F59E0B',
  failed: '#DC2626',
};

export const typography = {
  // Font Families (iOS native fonts)
  fontFamily: {
    regular: 'System',
    bold: 'System',
    semibold: 'System',
  },

  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  // Font Weights
  fontWeight: {
    normal: '400' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
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
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const shadows = {
  none: {
    elevation: 0,
  },
  sm: {
    elevation: 1,
    shadowOpacity: 0.1,
  },
  md: {
    elevation: 2,
    shadowOpacity: 0.15,
  },
  lg: {
    elevation: 4,
    shadowOpacity: 0.2,
  },
  xl: {
    elevation: 6,
    shadowOpacity: 0.25,
  },
};
