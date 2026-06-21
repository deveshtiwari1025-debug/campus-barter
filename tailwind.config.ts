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
        background: "#F6F8F7",     // Soft cool off-white with sage tint
        primary: "#5B8C72",        // Muted sage green (Swap actions)
        secondary: "#E0A458",      // Warm honey/amber (Buy actions)
        tertiary: "#6B85A0",       // Soft slate blue (Badges, info)
        ink: "#2A2F2D",            // Warm-cool charcoal text
        alert: "#C97064",          // Muted clay-red (Reports, errors)
      },
      fontFamily: {
        display: ["var(--font-jakarta)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        'card': '14px',            // Soft rounded corners for campus cards
      },
    },
  },
  plugins: [],
};
export default config;