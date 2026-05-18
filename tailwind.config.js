/** @type {import('tailwindcss').Config} */
// Design System: "Glassmorphic Clinical Warmth" — Blue variant.
// Creative North Star: "The Ethereal Guardian".
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Inter is the body voice. Manrope is the editorial display voice.
        // Cormorant Garamond is the "wedding-invitation" voice used by the
        // step-wizard prompts on CreateEvent — classic, elegant, serif.
        sans:      ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display:   ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        editorial: ['"Cormorant Garamond"', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
      fontSize: {
        'display-lg':  ['3.5rem',  { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '800' }],
        'display-md':  ['2.5rem',  { lineHeight: '1.1',  letterSpacing: '-0.02em', fontWeight: '800' }],
        'headline-sm': ['1.5rem',  { lineHeight: '1.2',  letterSpacing: '-0.01em', fontWeight: '700' }],
        'body-md':     ['0.875rem',{ lineHeight: '1.5' }],
      },
      colors: {
        // "Warm Slate" — never pure black.
        ink: '#131c2b',

        // Surface hierarchy — stacked frosted glass.
        surface:                  '#f6f9fc',
        'surface-dim':            '#ced9e6',
        'surface-variant':        '#dde3ec',
        'surface-container-lowest':  '#ffffff',
        'surface-container-low':     '#f0f4f9',
        'surface-container':         '#e8eef5',
        'surface-container-high':    '#dfe6ef',
        'surface-container-highest': '#d5dfeb',

        'on-surface':         '#131c2b',
        'on-surface-variant': '#44485a',
        'outline-variant':    '#c4cad6',

        // Primary — editorial blue replacing the doc's teal.
        primary: {
          DEFAULT: '#0b3a8a',
          50:  '#eef3fc',
          100: '#dbe5f8',
          200: '#b9d0f3',
          300: '#7faaf5',     // primary_fixed_dim
          400: '#3d76db',
          500: '#1f5cc7',
          600: '#1656c2',     // primary_container (gradient end)
          700: '#0b3a8a',     // primary (gradient start)
          800: '#082c6a',
          900: '#061f4c',
          container:     '#1656c2',
          fixed:         '#b9d3ff',
          'fixed-dim':   '#7faaf5',
          on:            '#ffffff',
          'on-container':'#eef3fc',
        },

        // Keep `brand` as an alias of primary so existing markup (brand-600 etc.) stays valid.
        brand: {
          50:  '#eef3fc',
          100: '#dbe5f8',
          500: '#1f5cc7',
          600: '#1656c2',
          700: '#0b3a8a',
          800: '#082c6a',
        },

        // Secondary — soft glass tint.
        'secondary-container': '#d4e0f5',
        'on-secondary-container': '#16213a',

        // Tertiary — health green for "Normal" results.
        tertiary: {
          DEFAULT:   '#00715e',
          container: '#a4f3d1',
          fixed:     '#a4f3d1',
          on:        '#ffffff',
        },

        // Status tones — pulled directly from the design spec.
        'calm-amber':  '#b58200',
        'muted-coral': '#ba1a1a',
      },
      borderRadius: {
        // Spec: never 4 or 8px corners. DEFAULT 16px, lg 32px.
        DEFAULT: '1rem',     // 16px
        sm:      '0.5rem',   // 8px — chips only
        md:      '1rem',     // 16px
        lg:      '2rem',     // 32px
        xl:      '2rem',     // 32px
        '2xl':   '2.5rem',
        '3xl':   '3rem',
        full:    '9999px',
      },
      backdropBlur: {
        glass: '32px',
        rail:  '24px',
      },
      boxShadow: {
        // Ambient shadow per spec — on_surface @ 5%, blur 40-60, negative spread.
        ambient:    '0 25px 50px -5px rgba(19, 28, 43, 0.05)',
        'ambient-lg':'0 40px 60px -5px rgba(19, 28, 43, 0.07)',
        // Soft lift through gradient — primary glow for buttons.
        glow:       '0 12px 30px -10px rgba(11, 58, 138, 0.45)',
        // Legacy aliases kept so existing class names still resolve.
        card:       '0 25px 50px -5px rgba(19, 28, 43, 0.05)',
        cta:        '0 12px 30px -10px rgba(11, 58, 138, 0.45)',
      },
      spacing: {
        // Spec: Spacing 4 = 1.4rem, Spacing 6 = 2rem.
        '4.5': '1.125rem',
        '14':  '3.5rem',
        '18':  '4.5rem',
      },
      keyframes: {
        // Slowly oscillating orbs — "living cellular feel".
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%':      { transform: 'translate3d(-2%, 3%, 0) scale(1.08)' },
        },
        'drift-slow': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%':      { transform: 'translate3d(3%, -2%, 0) scale(1.05)' },
        },
      },
      animation: {
        drift:        'drift 18s ease-in-out infinite',
        'drift-slow': 'drift-slow 26s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
