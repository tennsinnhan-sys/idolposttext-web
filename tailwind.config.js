/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        "2xl": "12px",
        "3xl": "14px",
      },
      colors: {
        // UIの色（ボタン・カード・見出しなど）を撮可チェックと同じ、彩度を抑えたグレー・ブルー系に統一する。
        // メンバーカラー（COLORS配列のhex値）はこことは別管理なので影響を受けない。
        indigo: {
          50: "#eef1f6",
          100: "#e4e9f0",
          200: "#d3dbe8",
          300: "#b7c2d6",
          400: "#8993a8",
          500: "#5b6b8c",
          600: "#4a5876",
          700: "#3c4761",
          800: "#2c3547",
          900: "#1c2333",
        },
        violet: {
          50: "#eef1f6",
          100: "#e4e9f0",
          200: "#d3dbe8",
          300: "#b7c2d6",
          400: "#8993a8",
        },
        teal: {
          50: "#eaf3ee",
          100: "#d9ebe0",
          300: "#7fb89b",
          800: "#2f5e46",
        },
        amber: {
          50: "#faf3e7",
          100: "#f2e2c4",
          400: "#c98a2e",
          700: "#8a5a0b",
        },
        pink: {
          50: "#f7edf2",
          100: "#f0dce8",
          300: "#c968a0",
          700: "#8a3c68",
        },
        rose: {
          50: "#f7edee",
          400: "#b5555a",
          500: "#a64448",
        },
        sky: {
          50: "#eaf1f5",
          200: "#a9c3d3",
          400: "#4a7f9e",
          500: "#3d6c88",
          700: "#2c4f66",
        },
        emerald: {
          300: "#7fb89b",
        },
        gray: {
          50: "#fbfcfd",
          100: "#f1f3f6",
          200: "#e2e6ec",
          300: "#c4cbd9",
          400: "#8993a8",
          500: "#5b6b8c",
          700: "#3c4761",
          800: "#1c2333",
        },
      },
    },
  },
  plugins: [],
};
