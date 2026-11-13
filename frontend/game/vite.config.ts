import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const requiredEnv = [
  "VITE_API_BASE_URL",
  "VITE_AUTH_URL",
  "VITE_STORE_URL",
  "VITE_RANKING_URL",
  "VITE_GAME_URL",
];

function assertEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const missing = requiredEnv.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  assertEnv(mode);

  return {
    plugins: [react(), tailwindcss()],
    base: "/game/",
    build: { chunkSizeWarningLimit: 1800 },
    server: {
      port: 5176,
      proxy: {
        "/api/auth": "http://localhost:3000",
        "/api/store": "http://localhost:3001",
        "/api/game": "http://localhost:3003",
        "/assets": process.env.ASSETS_PROXY_TARGET ?? "http://localhost:8080",
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      globals: false,
      css: false,
    },
  };
});
