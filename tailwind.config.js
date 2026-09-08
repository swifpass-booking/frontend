/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          100: '#DCE3F0',
          700: '#1D3A6B',
          800: '#152C54',
          900: '#0F1F3D',
          950: '#0A1730',
        },
        brand: {
          blue: '#1A56DB',
          amber: '#F5A623',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 31, 61, 0.06), 0 1px 3px rgba(15, 31, 61, 0.08)',
        popover: '0 12px 32px rgba(15, 31, 61, 0.18)',
      },
    },
  },
  plugins: [],
};
