/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#0f5238",
        "primary-container": "#2d6a4f",
        "on-primary": "#ffffff",
        "on-primary-container": "#a8e7c5",
        "secondary": "#5c614d",
        "secondary-container": "#e0e5cc",
        "tertiary": "#713638",
        "background": "#fbf8ff",
        "surface": "#fbf8ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f4f2ff",
        "surface-container": "#ececff",
        "surface-variant": "#dee0ff",
        "on-surface": "#161a32",
        "on-surface-variant": "#404943",
        "outline": "#707973",
        "outline-variant": "#bfc9c1",
        "error": "#ba1a1a",
        "error-container": "#ffdad6"
      },
      fontFamily: {
        body: ["Inter", "sans-serif"]
      }
    }
  },
  plugins: [require("@tailwindcss/forms")]
};