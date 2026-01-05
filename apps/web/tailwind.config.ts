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
        "bet365": {
          green: {
            DEFAULT: "#067a3d",
            dark: "#045a2e",
            light: "#0a9d52",
            hover: "#0a9d52",
          },
          bg: {
            DEFAULT: "#1a1a1a",
            surface: "#252525",
            sidebar: "#2a2a2a",
          },
        },
        dark: {
          bg: "#1a1a1a",
          surface: "#252525",
          border: "#333333",
          hover: "#2a2a2a",
          sidebar: "#2a2a2a",
        },
        text: {
          primary: "#ffffff",
          secondary: "#cccccc",
          muted: "#999999",
        },
        accent: {
          primary: "#067a3d",
          hover: "#0a9d52",
        },
        success: "#3fb950",
        warning: "#f0883e",
      },
    },
  },
  plugins: [],
};
export default config;
