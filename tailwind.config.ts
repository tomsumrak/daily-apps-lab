import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        muted: "#667085",
        paper: "#f7f3ea",
        line: "#e5e7eb"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
