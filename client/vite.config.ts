import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Chunk splitting for better caching + faster loads
    rollupOptions: {
      output: {
        manualChunks: {
          react:    ["react", "react-dom", "react-router-dom"],
          leaflet:  ["leaflet", "react-leaflet"],
          ui:       ["@radix-ui/react-tooltip", "lucide-react"],
          query:    ["@tanstack/react-query"],
          socket:   ["socket.io-client"],
        },
      },
    },
    // Warn if any chunk exceeds 600kb
    chunkSizeWarningLimit: 600,
    // Minify with esbuild (default, fastest)
    minify: "esbuild",
    // Generate source maps only in dev
    sourcemap: mode === "development",
  },
}));