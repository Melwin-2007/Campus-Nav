/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: "#4F46E5",
          "indigo-hover": "#4338CA",
          teal: "#14B8A6",
          "teal-hover": "#0D9488",
          amber: "#F59E0B",
          "amber-hover": "#D97706",
          red: "#EF4444",
          green: "#10B981",
        },
        midnight: "#0B1120",
        surface: {
          light: "#FFFFFF",
          "light-subtle": "#F8FAFC",
          dark: "#0F172A",
          "dark-card": "#1E293B",
          "dark-border": "#334155",
        },
        category: {
          academic: "#3B82F6",
          dept: "#8B5CF6",
          lab: "#06B6D4",
          admin: "#64748B",
          library: "#10B981",
          food: "#F97316",
          sports: "#84CC16",
          medical: "#F43F5E",
          parking: "#2563EB",
          washroom: "#14B8A6",
          entrance: "#F59E0B",
          other: "#A855F7",
        },
      },
      fontFamily: {
        heading: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(15, 23, 42, 0.08)",
        floating: "0 10px 30px -5px rgba(15, 23, 42, 0.15)",
        "glow-amber": "0 0 20px 4px rgba(245, 158, 11, 0.45)",
        "glow-teal": "0 0 20px 4px rgba(20, 184, 166, 0.45)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "radar-ping": "radar 2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
      keyframes: {
        radar: {
          "75%, 100%": {
            transform: "scale(2.5)",
            opacity: "0",
          },
        },
      },
    },
  },
  plugins: [],
};
