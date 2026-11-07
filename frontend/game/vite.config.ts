import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/game/",
  // Phaser alone is ~1.4 MB; it is loaded as its own chunk after sign-in
  build: { chunkSizeWarningLimit: 1800 },
  server: {
    port: 5176,
    proxy: {
      "/api/auth": "http://localhost:3000",
      "/api/game": "http://localhost:3001",
    },
  },
});
