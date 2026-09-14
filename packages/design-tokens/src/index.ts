/**
 * @loqme/design-tokens — Platform-Neutral Design Token Architecture
 * Visual Identity: White + Teal / Dark Turquoise (سبز کله‌غازی)
 * Compatible with Web (CSS Custom Properties) and Native Mobile (React Native / StyleSheet)
 */

export const TOKENS = {
  colors: {
    primary: {
      50: "#F0FDFA", // Soft teal tint for selected cards / subtle tags
      100: "#CCFBF1",
      200: "#99F6E4",
      300: "#5EEAD4",
      400: "#2DD4BF",
      500: "#0D9488", // Vibrant Teal
      600: "#135E66", // Template Deep Teal Brand / Primary CTA
      700: "#0F4E55", // Hover / Focused state
      800: "#0B3E44",
      900: "#06292D",
    },
    accent: {
      50: "#F0FDF4",
      100: "#DCFCE7",
      200: "#BBF7D0",
      300: "#86EFAC",
      400: "#5FE0A4",
      500: "#65CF9B", // Template Mint Green Accent
      600: "#10B981",
      700: "#047857",
    },
    neutral: {
      0: "#FFFFFF",
      25: "#FFFFFF", // Primary marketplace canvas
      50: "#F8FAFC",
      100: "#F1F5F9",
      200: "#E2E8F0",
      300: "#CBD5E1",
      400: "#94A3B8",
      500: "#64748B",
      600: "#475569",
      700: "#334155",
      800: "#1E293B",
      900: "#172B29", // Charcoal with a restrained teal undertone
      950: "#0F172A",
    },
    success: {
      50: "#ECFDF5",
      100: "#D1FAE5",
      500: "#10B981",
      600: "#059669",
      700: "#047857",
    },
    warning: {
      50: "#FFFBEB",
      100: "#FEF3C7",
      500: "#F59E0B",
      600: "#D97706",
    },
    danger: {
      50: "#FEF2F2",
      100: "#FEE2E2",
      500: "#EF4444",
      600: "#DC2626",
    },
  },
  typography: {
    fontFamily: {
      persian: "Vazirmatn",
      fallback:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    },
    fontSize: {
      xs: "0.75rem", // 12px
      sm: "0.875rem", // 14px
      base: "1rem", // 16px
      lg: "1.125rem", // 18px
      xl: "1.25rem", // 20px
      "2xl": "1.5rem", // 24px
      "3xl": "1.875rem", // 30px
      "4xl": "2.25rem", // 36px
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
    0: "0px",
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
  },
  radius: {
    none: "0px",
    sm: "4px",
    md: "8px",
    lg: "8px",
    xl: "12px",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
  },
  motion: {
    easing: {
      easeOut: "cubic-bezier(0.23, 1, 0.32, 1)",
      easeInOut: "cubic-bezier(0.77, 0, 0.175, 1)",
      drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
    },
    durations: {
      press: "160ms",
      fast: "150ms",
      normal: "250ms",
      smooth: "350ms",
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
  const primitives: Record<string, string> = {};
  for (const [family, shades] of Object.entries(TOKENS.colors)) {
    for (const [shade, value] of Object.entries(shades)) {
      primitives[`--loqme-${family}-${shade}`] = value;
    }
  }
  return {
    ...primitives,
    "--bg-canvas": TOKENS.colors.neutral[0],
    "--bg-surface": TOKENS.colors.neutral[50],
    "--bg-surface-elevated": TOKENS.colors.neutral[0],
    "--text-primary": TOKENS.colors.neutral[900],
    "--text-secondary": TOKENS.colors.neutral[600],
    "--text-tertiary": TOKENS.colors.neutral[400],
    "--brand-teal-50": TOKENS.colors.primary[50],
    "--brand-teal-100": TOKENS.colors.primary[100],
    "--brand-teal-500": TOKENS.colors.primary[500],
    "--brand-teal-600": TOKENS.colors.primary[600],
    "--brand-teal-700": TOKENS.colors.primary[700],
    "--brand-accent-400": TOKENS.colors.accent[400],
    "--brand-accent-500": TOKENS.colors.accent[500],
    "--border-subtle": TOKENS.colors.neutral[200],
    "--border-focus": TOKENS.colors.primary[600],
    // Semantic tokens
    "--color-primary": TOKENS.colors.primary[600],
    "--color-primary-hover": TOKENS.colors.primary[700],
    "--color-primary-soft": TOKENS.colors.primary[50],
    "--color-accent": TOKENS.colors.accent[500],
    "--color-accent-hover": TOKENS.colors.accent[600],
    "--color-accent-soft": TOKENS.colors.accent[100],
    "--color-background": TOKENS.colors.neutral[25],
    "--color-canvas-warm": TOKENS.colors.neutral[25],
    "--color-surface": TOKENS.colors.neutral[0],
    "--color-surface-muted": TOKENS.colors.neutral[50],
    "--color-text": TOKENS.colors.neutral[900],
    "--color-text-secondary": TOKENS.colors.neutral[600],
    "--color-text-muted": TOKENS.colors.neutral[400],
    "--color-border": TOKENS.colors.neutral[200],
    "--color-border-strong": TOKENS.colors.neutral[300],
    "--color-success": TOKENS.colors.success[600],
    "--color-warning": TOKENS.colors.warning[600],
    "--color-danger": TOKENS.colors.danger[600],
    // Radius & Motion
    "--radius-sm": TOKENS.radius.sm,
    "--radius-md": TOKENS.radius.md,
    "--radius-lg": TOKENS.radius.lg,
    "--radius-xl": TOKENS.radius.xl,
    "--radius-full": TOKENS.radius.full,
    "--ease-out": TOKENS.motion.easing.easeOut,
    "--ease-in-out": TOKENS.motion.easing.easeInOut,
    "--ease-drawer": TOKENS.motion.easing.drawer,
    "--duration-press": TOKENS.motion.durations.press,
    "--duration-fast": TOKENS.motion.durations.fast,
    "--duration-normal": TOKENS.motion.durations.normal,
  };
}
