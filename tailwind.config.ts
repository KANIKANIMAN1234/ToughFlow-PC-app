import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        apple: {
          text: "#1d1d1f",
          "text-secondary": "rgba(0,0,0,0.56)",
          blue: "#0071e3",
          "blue-hover": "#0077ed",
          link: "#0066cc",
          section: "#f5f5f7",
          glyph: "#6e6e73",
          border: "#d2d2d7",
        },
        brand: {
          50: "#f5f9ff",
          100: "#e8f2ff",
          500: "#0071e3",
          600: "#0071e3",
          700: "#0077ed",
          900: "#004c99",
        },
        surface: {
          DEFAULT: "#f5f5f7",
          card: "#ffffff",
          border: "#d2d2d7",
        },
      },
      fontFamily: {
        sans: [
          "SF Pro JP",
          "SF Pro Text",
          "SF Pro Icons",
          "Hiragino Kaku Gothic Pro",
          "ヒラギノ角ゴ Pro W3",
          "メイリオ",
          "Meiryo",
          "MS PGothic",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        display: [
          "SF Pro JP",
          "SF Pro Display",
          "SF Pro Icons",
          "Hiragino Kaku Gothic Pro",
          "ヒラギノ角ゴ Pro W3",
          "メイリオ",
          "Meiryo",
          "MS PGothic",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        headline: ["32px", { lineHeight: "1.08", letterSpacing: "-0.003em" }],
        body: ["17px", { lineHeight: "1.47", letterSpacing: "-0.021em" }],
        caption: ["14px", { lineHeight: "1.47", letterSpacing: "0" }],
        "nav-link": ["12px", { lineHeight: "1", letterSpacing: "0" }],
      },
      borderRadius: {
        pill: "980px",
        card: "18px",
      },
      boxShadow: {
        apple: "3px 5px 30px 0px rgba(0,0,0,0.22)",
        "focus-ring": "0 0 0 3px rgba(0,113,227,0.2)",
      },
      spacing: { sidebar: "240px" },
      width: { sidebar: "240px" },
      maxWidth: {
        content: "1260px",
      },
    },
  },
  plugins: [],
};

export default config;
