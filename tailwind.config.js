/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // DESIGN-meta.md Core Tokens (Dynamic Theme with CSS RGB Variables)
        primary: '#0064e0',            // Cobalt primary - Buy CTAs only
        'primary-deep': '#0457cb',     // Pressed/dark-surface variant
        'primary-soft': '#0091ff',     // Translucent tint
        'on-primary': '#ffffff',
        'ink-button': 'rgb(var(--color-ink-button-rgb, 0 0 0) / <alpha-value>)',
        'on-ink-button': '#ffffff',
        'fb-blue': '#1876f2',          // Radio/checkbox active
        'meta-link': '#385898',
        'oculus-purple': '#a121ce',
        success: '#31a24c',
        'success-bg': '#24e400',
        attention: '#f2a918',
        warning: '#f7b928',
        'warning-bg': '#ffe200',
        critical: '#e41e3f',
        'critical-strong': '#f0284a',
        canvas: 'rgb(var(--color-canvas-rgb, 255 255 255) / <alpha-value>)',
        'surface-soft': 'rgb(var(--color-surface-soft-rgb, 241 244 247) / <alpha-value>)',
        'ink-deep': 'rgb(var(--color-ink-deep-rgb, 10 19 23) / <alpha-value>)',
        ink: 'rgb(var(--color-ink-rgb, 28 30 33) / <alpha-value>)',
        charcoal: 'rgb(var(--color-charcoal-rgb, 68 73 80) / <alpha-value>)',
        slate: 'rgb(var(--color-slate-rgb, 75 76 79) / <alpha-value>)',
        steel: 'rgb(var(--color-steel-rgb, 93 108 123) / <alpha-value>)',
        stone: 'rgb(var(--color-stone-rgb, 133 149 164) / <alpha-value>)',
        hairline: 'rgb(var(--color-hairline-rgb, 206 208 212) / <alpha-value>)',
        'hairline-soft': 'rgb(var(--color-hairline-soft-rgb, 222 227 233) / <alpha-value>)',
        'disabled-text': 'rgb(var(--color-disabled-text-rgb, 188 192 196) / <alpha-value>)',

        // Compatibility Aliases
        brand: {
          50: 'rgb(var(--color-surface-soft-rgb, 241 244 247) / <alpha-value>)',
          100: 'rgb(var(--color-hairline-soft-rgb, 222 227 233) / <alpha-value>)',
          500: '#0064e0',
          600: '#0457cb',
          700: '#0049ab',
          cobalt: '#0064e0',
          'cobalt-deep': '#0457cb',
          red: '#e41e3f',
          'red-dark': '#c8102e',
          'red-light': '#fef2f2',
          blue: '#0064e0',
          'blue-dark': '#0457cb',
          navy: '#0a1317',
        },
        surface: {
          bg: 'rgb(var(--color-canvas-rgb, 255 255 255) / <alpha-value>)',
          card: 'rgb(var(--color-canvas-rgb, 255 255 255) / <alpha-value>)',
          muted: 'rgb(var(--color-surface-soft-rgb, 241 244 247) / <alpha-value>)',
          border: 'rgb(var(--color-hairline-soft-rgb, 222 227 233) / <alpha-value>)',
          dark: '#0a1317',
        }
      },
      fontFamily: {
        sans: ['"Optimistic VF"', 'Montserrat', 'Helvetica', 'Arial', '"Noto Sans"', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // DESIGN-meta.md Typography Tokens
        'hero-display': ['64px', { lineHeight: '1.16', fontWeight: '500' }],
        'display-lg': ['48px', { lineHeight: '1.17', fontWeight: '500' }],
        'heading-lg': ['36px', { lineHeight: '1.28', fontWeight: '500' }],
        'heading-md': ['28px', { lineHeight: '1.21', fontWeight: '300' }],
        'heading-sm': ['24px', { lineHeight: '1.25', fontWeight: '500' }],
        'subtitle-lg': ['18px', { lineHeight: '1.44', fontWeight: '700' }],
        'subtitle-md': ['18px', { lineHeight: '1.44', fontWeight: '400' }],
        'body-md-bold': ['16px', { lineHeight: '1.50', fontWeight: '700', letterSpacing: '-0.16px' }],
        'body-md': ['16px', { lineHeight: '1.50', fontWeight: '400', letterSpacing: '-0.16px' }],
        'body-sm-bold': ['14px', { lineHeight: '1.43', fontWeight: '700', letterSpacing: '-0.14px' }],
        'body-sm': ['14px', { lineHeight: '1.43', fontWeight: '400', letterSpacing: '-0.14px' }],
        'caption-bold': ['12px', { lineHeight: '1.33', fontWeight: '700' }],
        'caption': ['12px', { lineHeight: '1.33', fontWeight: '400' }],
        'button-md': ['14px', { lineHeight: '1.43', fontWeight: '700', letterSpacing: '-0.14px' }],
        'link-md': ['16px', { lineHeight: '1.50', fontWeight: '700', letterSpacing: '-0.16px' }],

        // Tailwind standard mapping
        'xs': ['12px', { lineHeight: '1.33' }],
        'sm': ['14px', { lineHeight: '1.43', letterSpacing: '-0.14px' }],
        'base': ['16px', { lineHeight: '1.50', letterSpacing: '-0.16px' }],
        'lg': ['18px', { lineHeight: '1.44' }],
        'xl': ['24px', { lineHeight: '1.25' }],
        '2xl': ['28px', { lineHeight: '1.21' }],
        '3xl': ['36px', { lineHeight: '1.28' }],
        '4xl': ['48px', { lineHeight: '1.17' }],
        '5xl': ['64px', { lineHeight: '1.16' }],
      },
      spacing: {
        'xxs': '4px',
        'xs': '8px',
        'sm': '10px',
        'md': '12px',
        'base': '16px',
        'lg': '20px',
        'xl': '24px',
        'xxl': '32px',
        'xxxl': '40px',
        'section-sm': '48px',
        'section': '64px',
        'section-lg': '80px',
        'hero': '120px',
      },
      borderRadius: {
        'xs': '2px',
        'sm': '4px',
        'md': '6px',
        'lg': '8px',        // Form inputs, radio containers
        'xl': '16px',       // Standard feature cards, checkout summary
        'xxl': '24px',      // Warranty/accessory tiles
        'xxxl': '32px',     // Photographic feature cards, promo strips
        'feature': '40px',  // Accessory hero panels
        'full': '100px',    // Pill buttons, tab chips, badges
        'circle': '9999px', // Color swatches, circular icon buttons
        'card': '16px',
        'btn': '100px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        'none': 'none',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'subtle': 'rgba(0, 0, 0, 0.2) 1px 1px 0px 0px',
        'sticky': 'rgba(20, 22, 26, 0.3) 0px 1px 4px 0px',
        'summary': 'rgba(20, 22, 26, 0.3) 0px 1px 4px 0px',
        'card': 'none',     // Meta design system is flat by default
        'elevated': 'rgba(20, 22, 26, 0.3) 0px 1px 4px 0px',
        'header': 'none',
      }
    },
  },
  plugins: [],
}
