import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@react-three") || id.includes("@pmndrs") || id.includes("maath") || id.includes("zustand")) return "r3f";
          if (id.includes("three")) return "three";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("spacetimedb")) return "spacetimedb";
        },
      },
    },
  },
});
