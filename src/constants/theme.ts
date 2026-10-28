/**
 * Design System Tokens (owner: Bayu)
 * Royal Indigo-Violet & Cotap Midnight Theme with Frosted Glassmorphism & WCAG AA compliance.
 * Import from here instead of hardcoding raw values.
 */

export const Colors = {
  // Brand - Royal Indigo-Violet (Cotap aesthetic)
  primary: '#5838DF',
  primaryDark: '#371C96',
  primaryLight: '#7C5CFF',
  primaryBg: '#EDE9FE',
  primaryBorder: '#DDD6FE',
  primaryGhost: '#F5F3FF',
  rippleOuter: '#F3E8FF',
  rippleMid: '#E9D5FF',

  // Dark Hero & Glass surfaces (Cotap gradient + top-left radial glow)
  midnight: '#210F63',
  midnightSurface: '#391E9E',
  midnightBorder: 'rgba(255, 255, 255, 0.18)',
  glassHighlight: 'rgba(255, 255, 255, 0.28)',
  glassOverlay: 'rgba(255, 255, 255, 0.10)',
  heroGradient:
    'radial-gradient(circle at 16% 14%, rgba(196, 181, 253, 0.55) 0%, rgba(124, 92, 255, 0.28) 38%, transparent 70%), linear-gradient(135deg, #5B3BE8 0%, #391E9E 52%, #210F63 100%)',

  // Light Frosted Glassmorphism tokens
  glassSurface: 'rgba(255, 255, 255, 0.72)',
  glassSurfaceStrong: 'rgba(255, 255, 255, 0.84)',
  glassBorder: 'rgba(255, 255, 255, 0.88)',
  glassPillTint: 'rgba(255, 255, 255, 0.54)',
  glassInactiveCircle: 'rgba(255, 255, 255, 0.52)',
  glassActiveBorder: 'rgba(255, 255, 255, 0.36)',
  ambientViolet: 'rgba(124, 92, 255, 0.13)',
  ambientIndigo: 'rgba(88, 56, 223, 0.09)',

  // Neutral Backgrounds & Surfaces
  background: '#F4F3FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surfaceMuted: '#E2E8F0',

  // Text colors
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  textWhite: '#FFFFFF',
  textWhiteMuted: 'rgba(255, 255, 255, 0.78)',

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderFocus: '#5838DF',

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

  // Floating tab bar (Frosted Glass)
  tabBarBg: 'rgba(255, 255, 255, 0.58)',
  tabBarBorder: 'rgba(255, 255, 255, 0.90)',
  tabBarActiveBg: '#5838DF',
  tabBarInactiveBg: 'rgba(255, 255, 255, 0.55)',
  tabBarActiveTint: '#FFFFFF',
  tabBarInactiveTint: '#1E293B',
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
    shadowColor: '#210F63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  md: {
    shadowColor: '#210F63',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  lg: {
    shadowColor: '#210F63',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 6,
  },
  floatingNav: {
    shadowColor: '#210F63',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

export const MinTouch = 48;

export const StatusLabel = {
  waiting: 'Belum Dimulai',
  open: 'Dibuka',
  closed: 'Ditutup',
  attended: 'Sudah Hadir',
} as const;
