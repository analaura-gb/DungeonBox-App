import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/ranking/",
  server: {
    port: 5175,
    proxy: {
      "/api/auth": "http://localhost:3000",
      "/api/ranking": "http://localhost:3002",
    },
  },
});
