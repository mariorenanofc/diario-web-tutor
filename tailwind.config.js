/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#0E2F59',
        'accent-green': '#4CD948',
        'accent-green-light': '#9CD98B',
        'background-light': '#F2F1DF',
        'accent-red': '#F24405',
        'gray-primary': '#D1D5DB', // Added for common lighter gray text/elements
        'gray-dark': '#4B5563', // Added for common darker gray text/elements
        'black-text': '#1F2937', // For very dark text against light backgrounds
      },
    },
  },
  plugins: [],
}

