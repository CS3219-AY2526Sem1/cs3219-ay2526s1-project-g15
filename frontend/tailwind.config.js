/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html","./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          600: "#5B47BF",   
          700: "#4A3CA2",
        }
      },
      boxShadow: {
        card: "0 6px 24px rgba(0,0,0,0.06)"
      },
      borderRadius: {
        xl2: "1rem"
      }
    },
  },
  plugins: [],
};
