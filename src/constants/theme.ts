/**
 * Shared design tokens (owner: Bayu). Palette from docs/TUGAS_BAYU.md §3.3.
 * Import from here instead of hardcoding colors/spacing in components.
 */
export const Colors = {
  primary: '#2563EB',
  primaryDark: '#1E40AF',
  success: '#16A34A',
  successBg: '#DCFCE7',
  danger: '#DC2626',
  muted: '#64748B',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
} as const;
