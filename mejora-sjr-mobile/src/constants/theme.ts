/**
 * theme.ts
 * Sistema de diseño y constantes visuales para Mejora SJR Mobile.
 * Cumple con la paleta institucional (#0A3D62) y códigos de estado semánticos (Rojo de error).
 */

export const COLORS = {
  // Colores Institucionales San Juan del Río
  primary: '#0A3D62', // Azul Institucional SJR (US-003)
  primaryDark: '#072740',
  primaryLight: '#165B90',
  primaryMuted: '#E0F2FE',
  accent: '#D97706', // Oro Cantera SJR
  accentLight: '#FEF3C7',

  // Colores Semánticos (Validación Visual)
  error: '#DC2626', // Rojo de error (US-003)
  errorBorder: '#EF4444',
  errorBackground: '#FEF2F2',
  errorText: '#B91C1C',

  success: '#16A34A',
  successBackground: '#F0FDF4',
  successText: '#15803D',

  warning: '#D97706',
  warningBackground: '#FFFBEB',

  info: '#0284C7',
  infoBackground: '#F0F9FF',

  // Neutros
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderFocus: '#0A3D62',
  divider: '#E2E8F0',

  // Tipografía
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  placeholder: '#94A3B8',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
};

export const TYPOGRAPHY = {
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  body: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  caption: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.textInverse,
  },
};
