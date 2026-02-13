import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        baseline: {
          primary: "#3B82F6",
          accent: "#60A5FA",
          surface: "#1F2937",
          card: "#111827",
          border: "#374151",
          muted: "#9CA3AF",
          teal: "#14B8A6",
          tealMuted: "#0D9488",
          green: "#10B981",
          greenMuted: "#059669",
          blue: "#3B82F6",
          blueMuted: "#2563EB",
          indigo: "#6366F1",
          indigoMuted: "#4F46E5",
          amber: "#F59E0B",
          amberMuted: "#D97706",
        },
      },
    },
  },
  plugins: [],
};
export default config;
