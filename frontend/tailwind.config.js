/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#294942",
          deep: "#1C332E",
          mist: "#3D6B62",
          soft: "#6E8F88",
        },
        charcoal: "#2D3E3B",
        slateblue: "#A8B6BD",
        cream: "#F6F1E8",
        linen: "#EDE4D4",
        sand: "#E8DFD0",
        fog: "#E4EAF0",
        gold: "#B0894F",
        ink: "#1A1A1A",
      },
      fontFamily: {
        serif: ["\"Playfair Display\"", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        brand: "0.28em",
      },
      boxShadow: {
        editorial: "0 24px 60px -32px rgba(41, 73, 66, 0.45)",
      },
    },
  },
  plugins: [],
};
