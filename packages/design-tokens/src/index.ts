/**
 * @loqme/design-tokens — Platform-Neutral Design Token Architecture
 * Visual Identity: White + Teal / Dark Turquoise (سبز کله‌غازی)
 * Compatible with Web (CSS Custom Properties) and Native Mobile (React Native / StyleSheet)
 */

export const TOKENS = {
  colors: {
    primary: {
      50: '#F0FDFA',  // Soft teal tint for selected cards / subtle tags
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#0D9488', // Vibrant Teal
      600: '#0F766E', // Base Brand / Primary CTA (سبز کله‌غازی)
      700: '#115E59', // Hover / Focused state
      800: '#134E4A',
      900: '#042F2E',
    },
    neutral: {
      0: '#FFFFFF',
      25: '#FFFFFF',  // Clean White Canvas Foundation
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A', // Deep Charcoal Slate Typography
      950: '#020617',
    },
    success: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      500: '#10B981',
      600: '#059669',
      700: '#047857',
    },
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      500: '#F59E0B',
      600: '#D97706',
    },
    danger: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      500: '#EF4444',
      600: '#DC2626',
    },
  },
  typography: {
    fontFamily: {
      persian: 'Vazirmatn',
      fallback: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },
  radius: {
    none: '0px',
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
  },
  motion: {
    easing: {
      easeOut: 'cubic-bezier(0.23, 1, 0.32, 1)',
      easeInOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
      drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
    },
    durations: {
      press: '160ms',
      fast: '150ms',
      normal: '250ms',
      smooth: '350ms',
    },
    scale: {
      activePress: 0.97,
    },
  },
} as const;

export type LoqmeTokens = typeof TOKENS;

/**
 * Generates CSS Custom Property declarations for Web injection
 */
export function generateCssVariables(): Record<string, string> {
  return {
    '--bg-canvas': TOKENS.colors.neutral[0],
    '--bg-surface': TOKENS.colors.neutral[50],
    '--bg-surface-elevated': TOKENS.colors.neutral[0],
    '--text-primary': TOKENS.colors.neutral[900],
    '--text-secondary': TOKENS.colors.neutral[600],
    '--text-tertiary': TOKENS.colors.neutral[400],
    '--brand-teal-50': TOKENS.colors.primary[50],
    '--brand-teal-100': TOKENS.colors.primary[100],
    '--brand-teal-500': TOKENS.colors.primary[500],
    '--brand-teal-600': TOKENS.colors.primary[600],
    '--brand-teal-700': TOKENS.colors.primary[700],
    '--border-subtle': TOKENS.colors.neutral[200],
    '--border-focus': TOKENS.colors.primary[600],
    '--radius-sm': TOKENS.radius.sm,
    '--radius-md': TOKENS.radius.md,
    '--radius-lg': TOKENS.radius.lg,
    '--radius-xl': TOKENS.radius.xl,
    '--ease-out': TOKENS.motion.easing.easeOut,
    '--ease-in-out': TOKENS.motion.easing.easeInOut,
    '--ease-drawer': TOKENS.motion.easing.drawer,
    '--duration-press': TOKENS.motion.durations.press,
    '--duration-fast': TOKENS.motion.durations.fast,
    '--duration-normal': TOKENS.motion.durations.normal,
  };
}
