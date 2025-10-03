/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';
import forms from '@tailwindcss/forms';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Our new "Finch" color palette
        'finch-teal': {
          50: '#f0f9f8',
          100: '#ddeeed',
          200: '#bfe0da',
          300: '#a1d1c8',
          400: '#83c2b5',
          500: '#65b3a3',
          600: '#47a490',
          700: '#398272', // Base color from logo
          800: '#2a6155',
          900: '#1c4038',
        },
        'finch-orange': {
          50: '#fff8f0',
          100: '#feeedd',
          200: '#feddc0',
          300: '#fecb9d',
          400: '#feb97a',
          500: '#fea757', // Base color from logo
          600: '#e5974e',
          700: '#c28042',
          800: '#9e6836',
          900: '#7b512a',
        },
        // Also adding professional grays
        'finch-gray': colors.slate,
      }
    },
  },
  plugins: [
    forms,
  ],
}