/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    // Sigma + Graphology (WebGL) pesan ~700 kB sin comprimir.
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
