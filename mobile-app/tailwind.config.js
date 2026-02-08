/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Custom colors for Cognitive Inbox
        'brand-dark': '#121212',
        'brand-gray': '#1E1E1E',
      }
    },
  },
  plugins: [],
}
