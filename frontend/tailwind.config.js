/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      /**
       * Centralized typography scale — a flat +30% pass over the previous
       * scale (kept in the history below for reference). Every `text-*`
       * utility in the app reads from here, so raising a value here raises
       * every consumer at once; nothing should ever hardcode a `text-[Npx]`
       * arbitrary value instead of reaching for one of these.
       *
       *              size   line-height  use
       *   xs / textXs   16px   1.45   metadata, captions
       *   sm / textSm   18px   1.5    labels, sidebar items, nav links,
       *                                table headers, filter labels,
       *                                supporting copy, table row secondary
       *   base/textBase 21px   1.58   body copy, buttons, inputs,
       *                                table row primary text
       *   md / textMd   23px   1.5    supporting/lead copy one step up
       *   lg / textLg   26px   1.4    market prices, EV values, percentages,
       *                                key metrics, glossary term titles
       *   xl            29px   1.35
       *   2xl/headingSm 34px   1.15   section title (mobile)
       *   3xl           39px   1.12   section title (desktop), modal title (low)
       *   4xl/headingMd 42px   1.1    modal title (high), page/methodology
       *                                title (mobile)
       *   5xl           52px   1.08   page/methodology title (desktop)
       *   6xl/headingLg 62px   1.06   hero (mobile high / tablet)
       *   7xl           83px   1.05   (reserved)
       *   8xl / hero    90px   1.03   hero (desktop)
       */
      fontSize: {
        xs: ['16px', { lineHeight: '1.45' }],
        sm: ['18px', { lineHeight: '1.5' }],
        base: ['21px', { lineHeight: '1.58' }],
        md: ['23px', { lineHeight: '1.5' }],
        lg: ['26px', { lineHeight: '1.4' }],
        xl: ['29px', { lineHeight: '1.35' }],
        '2xl': ['34px', { lineHeight: '1.15' }],
        '3xl': ['39px', { lineHeight: '1.12' }],
        '4xl': ['42px', { lineHeight: '1.1' }],
        '5xl': ['52px', { lineHeight: '1.08' }],
        '6xl': ['62px', { lineHeight: '1.06' }],
        '7xl': ['83px', { lineHeight: '1.05' }],
        '8xl': ['90px', { lineHeight: '1.03' }],
        // Named aliases — same values, intent-revealing names for new code.
        textXs: ['16px', { lineHeight: '1.45' }],
        textSm: ['18px', { lineHeight: '1.5' }],
        textBase: ['21px', { lineHeight: '1.58' }],
        textMd: ['23px', { lineHeight: '1.5' }],
        textLg: ['26px', { lineHeight: '1.4' }],
        headingSm: ['34px', { lineHeight: '1.15' }],
        headingMd: ['42px', { lineHeight: '1.1' }],
        headingLg: ['62px', { lineHeight: '1.06' }],
        hero: ['90px', { lineHeight: '1.03' }],
      },
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
