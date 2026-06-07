import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#020617",
        surface: "#07101f",
        surfaceAlt: "#0b1425",
        accent: "#22c55e",
        accentSoft: "#16a34a",
        borderSubtle: "#1e293b",
        textPrimary: "#e5e7eb",
        textSecondary: "#9ca3af",
        fordham: "#8b1d35",
        gold: "#d4a94d"
      },
      boxShadow: {
        glow: "0 0 35px rgba(34, 197, 94, 0.24)",
        fordham: "0 0 40px rgba(139, 29, 53, 0.34)"
      }
    }
  },
  plugins: []
} satisfies Config;
