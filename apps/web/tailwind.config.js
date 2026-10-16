// Compatibility palettes keep existing page utilities on the shared Green Deck tokens.
const shades = [50,100,200,300,400,500,600,700,800,900,950];
const palette = family => Object.fromEntries(shades.map(shade => [shade,
  `rgb(var(--deck-${family}-${family === 'primary' && shade === 950 ? 900 : shade}-rgb) / <alpha-value>)`]));
const neutral = palette('neutral');
const primary = palette('primary');
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        slate: neutral, gray: neutral, zinc: neutral, neutral, stone: neutral,
        teal: primary, emerald: primary, green: primary,
        loqme: {
          ...primary,
          primary: {
            50: 'var(--loqme-primary-50)',
            100: 'var(--loqme-primary-100)',
            200: 'var(--loqme-primary-200)',
            300: 'var(--loqme-primary-300)',
            400: 'var(--loqme-primary-400)',
            500: 'var(--loqme-primary-500)',
            600: 'var(--loqme-primary-600)',
            700: 'var(--loqme-primary-700)',
            800: 'var(--loqme-primary-800)',
            900: 'var(--loqme-primary-900)',
          },
          accent: {
            50: 'var(--loqme-accent-50)',
            100: 'var(--loqme-accent-100)',
            200: 'var(--loqme-accent-200)',
            300: 'var(--loqme-accent-300)',
            400: 'var(--loqme-accent-400)',
            500: 'var(--loqme-accent-500)',
            600: 'var(--loqme-accent-600)',
            700: 'var(--loqme-accent-700)',
          },
          neutral: {
            0: 'var(--loqme-neutral-0)',
            25: 'var(--loqme-neutral-25)',
            50: 'var(--loqme-neutral-50)',
            100: 'var(--loqme-neutral-100)',
            200: 'var(--loqme-neutral-200)',
            300: 'var(--loqme-neutral-300)',
            400: 'var(--loqme-neutral-400)',
            500: 'var(--loqme-neutral-500)',
            600: 'var(--loqme-neutral-600)',
            700: 'var(--loqme-neutral-700)',
            800: 'var(--loqme-neutral-800)',
            900: 'var(--loqme-neutral-900)',
            950: 'var(--loqme-neutral-950)',
          },
          success: {
            50: 'var(--loqme-success-50)',
            100: 'var(--loqme-success-100)',
            500: 'var(--loqme-success-500)',
            600: 'var(--loqme-success-600)',
            700: 'var(--loqme-success-700)',
          },
          warning: {
            50: 'var(--loqme-warning-50)',
            100: 'var(--loqme-warning-100)',
            500: 'var(--loqme-warning-500)',
            600: 'var(--loqme-warning-600)',
          },
          danger: {
            50: 'var(--loqme-danger-50)',
            100: 'var(--loqme-danger-100)',
            500: 'var(--loqme-danger-500)',
            600: 'var(--loqme-danger-600)',
          },
        },
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(17, 94, 89, 0.06)',
        'card': '0 2px 10px -1px rgba(0, 0, 0, 0.04)',
        'floating': '0 12px 30px -4px rgba(14, 78, 73, 0.16)',
      },
      fontFamily: {
        sans: ['var(--font-vazirmatn)', 'Vazirmatn', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        fadeSlideIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
      animation: {
        'fade-slide-in-1': 'fadeSlideIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-slide-in-2': 'fadeSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards',
        'fade-slide-in-3': 'fadeSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.24s forwards',
        'fade-slide-in-4': 'fadeSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.36s forwards',
      },
    },
  },
  plugins: [],
};
