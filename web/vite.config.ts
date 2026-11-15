import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(import.meta.dirname, "."),
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "next/link": path.resolve(import.meta.dirname, "src/lib/next-shims.tsx"),
      "next/navigation": path.resolve(import.meta.dirname, "src/lib/next-shims.tsx"),
    },
  },
  build: { outDir: "dist", emptyOutDir: true, target: "es2022" },
  server: {
    port: 5317,
    strictPort: true,
    proxy: { "/api": { target: process.env.OMP_API_TARGET || "http://127.0.0.1:4317", changeOrigin: true } },
  },
});
