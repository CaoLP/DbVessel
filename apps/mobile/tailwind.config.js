/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          bg: '#030014',
          surface: 'rgba(15, 12, 30, 0.4)',
          border: 'rgba(255, 255, 255, 0.08)',
          glow: 'rgba(99, 102, 241, 0.25)',
        }
      }
    },
  },
  plugins: [],
}
