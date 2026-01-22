/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Montserrat", "system-ui", "sans-serif"],
      },
      colors: {
        trackly: {
          bg: "#F7F8FA",
          card: "#FFFFFF",
          border: "#E6E8EC",
          text: "#1F2937",
          muted: "#6B7280",
          primary: "#2563EB",
          success: "#16A34A",
          warning: "#D97706",
          danger: "#DC2626",
        },
      },
      borderRadius: {
        trackly: "12px",
      },
    },
  },
  plugins: [],
};
