/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'dark': {
          50: '#f8f9fa',
          100: '#f1f3f4',
          200: '#e8eaed',
          300: '#dadce0',
          400: '#bdc1c6',
          500: '#9aa0a6',
          600: '#80868b',
          700: '#5f6368',
          800: '#3c4043',
          900: '#202124',
          950: '#0f0f11',
        },
        'card': {
          DEFAULT: 'rgba(25, 25, 28, 0.9)',
          secondary: 'rgba(35, 35, 38, 0.8)',
          border: 'rgba(255, 255, 255, 0.08)',
        }
      },
      backgroundColor: {
        'primary': '#0f0f11',
        'card': 'rgba(25, 25, 28, 0.9)',
        'input': 'rgba(20, 20, 23, 0.8)',
      },
      borderColor: {
        'card': 'rgba(255, 255, 255, 0.08)',
        'input': 'rgba(255, 255, 255, 0.12)',
      }
    },
  },
  plugins: [],
};
