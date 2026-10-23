/**
 * Design System Tokens (owner: Bayu)
 * Royal Violet & Midnight Cotap Theme with WCAG AA compliance.
 * Import from here instead of hardcoding raw values.
 */

export const Colors = {
  // Brand - Royal & Midnight Violet (Cotap aesthetic)
  primary: '#6D28D9',
  primaryDark: '#4C1D95',
  primaryLight: '#7C3AED',
  primaryBg: '#EDE9FE',
  primaryGhost: '#F5F3FF',

  // Dark Hero & Glass surfaces
  midnight: '#1E1035',
  midnightSurface: '#2E1065',
  midnightBorder: 'rgba(255, 255, 255, 0.16)',
  glassHighlight: 'rgba(255, 255, 255, 0.22)',
  glassOverlay: 'rgba(255, 255, 255, 0.08)',

  // Neutral Backgrounds & Surfaces
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surfaceMuted: '#E2E8F0',

  // Text colors
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  textWhite: '#FFFFFF',
  textWhiteMuted: 'rgba(255, 255, 255, 0.75)',

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderFocus: '#6D28D9',

  // Status & Badges (WCAG AA compliant contrast ratios >= 4.5:1)
  success: '#166534',
  successBg: '#DCFCE7',
  successBorder: '#86EFAC',

  warning: '#92400E',
  warningBg: '#FEF3C7',
  warningBorder: '#FCD34D',

  danger: '#991B1B',
  dangerBg: '#FEE2E2',
  dangerBorder: '#FCA5A5',

  info: '#1E40AF',
  infoBg: '#DBEAFE',
  infoBorder: '#93C5FD',

  // Floating tab bar
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabBarActiveBg: '#6D28D9',
  tabBarActiveTint: '#FFFFFF',
  tabBarInactiveTint: '#64748B',
} as const;

export const Typography = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  hero: 32,
} as const;

export const FontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  floatingNav: {
    shadowColor: '#1E1035',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;
