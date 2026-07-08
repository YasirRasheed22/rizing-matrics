// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // YOUR RINGNEX BRAND COLORS (exact from logo)
        primary: {
          50: "#fff4ed",
          100: "#ffe8d5",
          200: "#ffd0ab",
          300: "#ffb07a",
          400: "#ff8a47",
          500: "#ff6b35",   // Main Orange (from your logo)
          600: "#f05524",
          700: "#d43c1d",
          800: "#b02f1c",
          900: "#8f2719",
        },
        secondary: {
          50: "#e6f7ff",
          100: "#b8e6ff",
          200: "#80d4ff",
          300: "#40c4ff",
          400: "#00a1e0",   // Main Blue (from your logo)
          500: "#008cc7",
          600: "#0077a8",
          700: "#00668a",
          800: "#00556d",
          900: "#003d52",
        },
        success: "#00c853",
        warning: "#ff9800",
        danger: "#f44336",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(to right, #ff6b35, #00a1e0)",
        "gradient-hover": "linear-gradient(to right, #f05524, #008cc7)",
      },
      boxShadow: {
        'ringnex': '0 10px 25px -5px rgba(255, 107, 53, 0.25)',
      }
    },
  },
  plugins: [],
}