/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FFC107',
        secondary: '#FFF8E1',
        accent: '#FF6B6B',
        accentLight: '#FFD2D2'
      },
      fontFamily: {
        heading: ['Inter', 'sans-serif'],
        body: ['Roboto', 'sans-serif']
      },
      borderColor: {
        DEFAULT: '#e5e7eb'
      }
    }
  },
  plugins: []
}