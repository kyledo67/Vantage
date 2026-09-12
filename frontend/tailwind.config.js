/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Vantage brand palette — near-black violet base with an orchid-purple CTA
        // and a mint-green accent reserved for live/positive-EV signals.
        vantage: {
          bg: '#09090D',
          nav: '#101018',
          surface: '#15141D',
          surfaceAlt: '#1C1A24',
          raised: '#2A1D31',
          border: '#312E3C',
          borderLight: '#484451',
          accent: '#CE63E9',
          accentEnd: '#794BD4',
          ctaText: '#170D1B',
          positive: '#63D6A5',
          alert: '#DF78FF',
          danger: '#E0616B',
          text: '#F5EEF7',
          textDim: '#AAA1B4',
        },
      },
      backgroundImage: {
        'vantage-hero': 'linear-gradient(135deg, #CE63E9 0%, #794BD4 100%)',
      },
      fontFamily: {
        // Multi-word names MUST be quoted — an unquoted "Segoe UI" makes the whole
        // font-family declaration invalid and the browser drops it entirely.
        sans: ['Outfit', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
}
