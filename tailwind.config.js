/** @type {import('tailwindcss').Config} */
// Mirrors the churchdashboard design system: Inter only, flat zinc/brand palette,
// 8px corner radius, lightweight ring-1 borders, shadow-card / shadow-cta.
//
// We keep aliases for tokens the old "Glassmorphic Clinical Warmth" system used
// (surface-*, on-surface, primary-*, tertiary, calm-amber, muted-coral) so a few
// long-tail pages that still reference them resolve to a sane churchdashboard
// equivalent during the redesign rather than erroring out.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        ink:  '#09090B',
        zinc: {
          25:  '#FAFAFA',
          150: '#ECECEE',
        },
        brand: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
        },
        primary: {
          DEFAULT: '#2563EB',
          50:  '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
        },

        // Surface aliases — map to white / zinc surfaces in the new palette.
        surface:                     '#FFFFFF',
        'surface-dim':               '#ECECEE',
        'surface-variant':           '#F4F4F5',
        'surface-container-lowest':  '#FFFFFF',
        'surface-container-low':     '#FAFAFA',
        'surface-container':         '#F4F4F5',
        'surface-container-high':    '#ECECEE',
        'surface-container-highest': '#E4E4E7',

        'on-surface':         '#09090B',
        'on-surface-variant': '#52525B',
        'outline-variant':    '#E4E4E7',

        'secondary-container':    '#DBEAFE',
        'on-secondary-container': '#1E40AF',

        tertiary: {
          DEFAULT:   '#059669',
          container: '#D1FAE5',
          on:        '#FFFFFF',
        },

        'calm-amber':  '#B45309',
        'muted-coral': '#DC2626',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 6px rgba(15,23,42,0.04)',
        cta:  '0 4px 14px rgba(37,99,235,0.28)',
        // Legacy aliases so older class references still resolve to something sensible.
        ambient:     '0 1px 2px rgba(15,23,42,0.04), 0 1px 6px rgba(15,23,42,0.04)',
        'ambient-lg':'0 4px 14px rgba(15,23,42,0.06)',
        glow:        '0 4px 14px rgba(37,99,235,0.28)',
      },
      fontSize: {
        'display-lg':  ['2.5rem',  { lineHeight: '1.1',  letterSpacing: '-0.02em', fontWeight: '800' }],
        'display-md':  ['2rem',    { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '800' }],
        'headline-sm': ['1.25rem', { lineHeight: '1.3',  letterSpacing: '-0.01em', fontWeight: '700' }],
        'body-md':     ['0.875rem',{ lineHeight: '1.5' }],
      },
    },
  },
  plugins: [],
};
