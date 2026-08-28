/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Validated data-viz palette (light mode)
        "series-old": "#2a78d6",
        "series-new": "#eb6834",
        "status-good": "#006300",
        "status-bad": "#d03b3b",
        ink: {
          DEFAULT: "#0b0b0b",
          secondary: "#52514e",
          muted: "#898781",
        },
        surface: {
          DEFAULT: "#fcfcfb",
          page: "#f9f9f7",
        },
        grid: "#e1e0d9",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
