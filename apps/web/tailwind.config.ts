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
        dark: {
          bg: "#0b0b0f",
          surface: "#15151a",
          border: "#30363d",
          hover: "#1f1f26",
        },
        text: {
          primary: "#f0f6fc",
          secondary: "#c9d1d9",
          muted: "#8b949e",
        },
        accent: {
          primary: "#00ffa3",
          hover: "#00ce84",
        },
        success: "#3fb950",
        warning: "#f0883e",
      },
    },
  },
  plugins: [],
};
export default config;
