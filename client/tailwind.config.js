/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        metro: {
          purple: '#A855F7', // Purple line
          green: '#22C55E',  // Green line
          yellow: '#EAB308', // Yellow line
        }
      }
    },
  },
  plugins: [],
}
