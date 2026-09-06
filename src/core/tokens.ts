/**
 * Core Design Tokens TypeScript mirror for Loqme
 * Synchronized with src/app/globals.css
 * Visual Identity: White + Teal / Dark Turquoise (سبز کله‌غازی)
 */
export const TOKENS = {
  colors: {
    primary: {
      50: '#F0FDFA',  // Soft teal tint for selected cards
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#0D9488', // Vibrant Teal
      600: '#0F766E', // Base Brand / Primary CTA (سبز کله‌غازی)
      700: '#115E59', // Hover state
      800: '#134E4A',
      900: '#042F2E',
    },
    neutral: {
      0: '#FFFFFF',
      25: '#FFFFFF',  // Clean White Canvas
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A', // Deep Charcoal Slate
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
} as const;
