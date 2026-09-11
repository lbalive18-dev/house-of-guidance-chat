/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B6E4F',
          50: '#E6F3EE',
          100: '#CCE7DD',
          200: '#99CFBB',
          300: '#66B899',
          400: '#33A077',
          500: '#0B6E4F',
          600: '#095940',
          700: '#074330',
          800: '#052D20',
          900: '#021610',
        },
        secondary: {
          DEFAULT: '#D4AF37',
          50: '#FBF6E7',
          100: '#F7EDCF',
          200: '#EFDB9F',
          300: '#E7C96F',
          400: '#DFB73F',
          500: '#D4AF37',
          600: '#AA8C2C',
          700: '#7F6921',
          800: '#554616',
          900: '#2A230B',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#0F1712',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        arabic: ['"Noto Naskh Arabic"', '"Traditional Arabic"', 'serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(11, 110, 79, 0.08), 0 1px 2px rgba(11, 110, 79, 0.06)',
      },
    },
  },
  plugins: [],
};
