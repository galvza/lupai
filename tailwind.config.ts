import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#C8FF3C",
        dark: {
          bg: "#0F0F0F",
          card: "#1A1A1A",
          border: "#222222",
          deeper: "#0A0A0A",
        },
        light: {
          bg: "#F2F1ED",
          card: "#F8F7F4",
          border: "#E8E8E4",
        },
        positive: {
          bg: "#162A16",
          text: "#C8FF3C",
        },
        negative: {
          bg: "#2A1616",
          text: "#FF6B6B",
        },
        warning: {
          "light-bg": "#FEF9E7",
          "light-text": "#B8860B",
          "dark-bg": "#1A1A0A",
          "dark-text": "#E8C84A",
        },
        success: {
          bg: "#E8F5E8",
          text: "#2A7A2A",
        },
      },
      fontFamily: {
        serif: ["Instrument Serif", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
