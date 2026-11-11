/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_AUTH_URL: string;
  readonly VITE_STORE_URL: string;
  readonly VITE_RANKING_URL: string;
  readonly VITE_GAME_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
