/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0faf7',
          100: '#dbf3ea',
          500: '#10a37f',
          600: '#0d8a6c',
          700: '#0b7159',
        },
        ink: '#0d0d0d',
        surface: '#f7f7f8',
      },
      boxShadow: {
        card: '0 1px 2px rgba(13,13,13,0.05), 0 4px 16px rgba(13,13,13,0.04)',
      },
      borderRadius: {
        xl: '14px',
      },
      fontSize: {
        '2xs': ['0.6875rem', '1rem'],
      },
    },
  },
  plugins: [],
};
