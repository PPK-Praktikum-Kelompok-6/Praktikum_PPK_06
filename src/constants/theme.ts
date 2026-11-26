/**
 * Design System Tokens (owner: Bayu)
 * Royal Indigo-Violet & Cotap Midnight Theme with Frosted Glassmorphism & WCAG AA compliance.
 * Import from here instead of hardcoding raw values.
 */

export const Colors = {
  // Brand - Modern Electric Cobalt & Royal Tech Blue (Clean, Elegant, Professional)
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  primaryBg: '#EFF6FF',
  primaryBorder: '#BFDBFE',
  primaryGhost: '#F8FAFC',
  rippleOuter: '#DBEAFE',
  rippleMid: '#BFDBFE',

  // Dark Hero & Glass surfaces (Modern Deep Slate-900 / Navy)
  midnight: '#0F172A',
  midnightSurface: '#1E293B',
  midnightBorder: 'rgba(255, 255, 255, 0.12)',
  glassHighlight: 'rgba(255, 255, 255, 0.22)',
  glassOverlay: 'rgba(255, 255, 255, 0.08)',
  heroGradient:
    'radial-gradient(circle at 14% 12%, rgba(191, 219, 254, 0.50) 0%, rgba(96, 165, 250, 0.28) 32%, rgba(37, 99, 235, 0.12) 58%, rgba(15, 23, 42, 0) 82%), linear-gradient(135deg, #1D4ED8 0%, #1E3A8A 52%, #0F172A 100%)',

  // Light Frosted Glassmorphism tokens
  glassSurface: 'rgba(255, 255, 255, 0.88)',
  glassSurfaceStrong: 'rgba(255, 255, 255, 0.95)',
  glassBorder: 'rgba(255, 255, 255, 0.90)',
  glassPillTint: 'rgba(255, 255, 255, 0.60)',
  glassInactiveCircle: 'rgba(255, 255, 255, 0.55)',
  glassActiveBorder: 'rgba(255, 255, 255, 0.40)',
  ambientViolet: 'rgba(59, 130, 246, 0.12)',
  ambientIndigo: 'rgba(37, 99, 235, 0.08)',

  // Neutral Backgrounds & Surfaces (Modern Cool Slate-50)
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
  textWhiteMuted: 'rgba(255, 255, 255, 0.85)',

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderFocus: '#2563EB',

  // Status & Badges (WCAG AA compliant contrast ratios >= 4.5:1)
  success: '#166534',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',

  warning: '#92400E',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',

  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',

  info: '#0284C7',
  infoBg: '#F0F9FF',
  infoBorder: '#BAE6FD',

  // Floating tab bar (Frosted Glass)
  tabBarBg: 'rgba(255, 255, 255, 0.80)',
  tabBarBorder: 'rgba(255, 255, 255, 0.92)',
  tabBarActiveBg: '#2563EB',
  tabBarInactiveBg: 'rgba(255, 255, 255, 0.60)',
  tabBarActiveTint: '#FFFFFF',
  tabBarInactiveTint: '#475569',
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
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
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

export const GradientMeshes = {
  violet: require('../../assets/images/gradients/mesh-violet-v2.png'),
  indigo: require('../../assets/images/gradients/mesh-indigo.png'),
  pastel: require('../../assets/images/gradients/mesh-pastel.png'),
  emerald: require('../../assets/images/gradients/mesh-emerald.png'),
} as const;

export const GradientShapes = {
  heroBlob: require('../../assets/images/shapes/grad-01-hero-v2.png'),
  warningBean: require('../../assets/images/shapes/grad-03-warning.png'),
  droplet: require('../../assets/images/shapes/grad-04-droplet.png'),
  spark: require('../../assets/images/shapes/grad-10-spark.png'),
  sphere: require('../../assets/images/shapes/grad-15-sphere.png'),
  successWave: require('../../assets/images/shapes/grad-16-success.png'),
} as const;

export const HandGestureIcons = {
  raiseHand: require('../../assets/images/gestures/hand-gestures-01.png'),
  tapRing: require('../../assets/images/gestures/hand-gestures-04.png'),
  swipeDown: require('../../assets/images/gestures/hand-gestures-10.png'),
  tapBurst: require('../../assets/images/gestures/hand-gestures-25.png'),
  peace: require('../../assets/images/gestures/hand-gestures-26.png'),
  palmScan: require('../../assets/images/gestures/hand-gestures-38.png'),
  handTimer: require('../../assets/images/gestures/hand-gestures-41.png'),
  handLocked: require('../../assets/images/gestures/hand-gestures-42.png'),
  thumbsUp: require('../../assets/images/gestures/hand-gestures-43.png'),
  handBlocked: require('../../assets/images/gestures/hand-gestures-50.png'),
} as const;

export type GradientMeshName = keyof typeof GradientMeshes;
export type GradientShapeName = keyof typeof GradientShapes;
export type HandGestureName = keyof typeof HandGestureIcons;
