import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// O Vite troca import.meta.env.VITE_* pelo valor literal no momento do build:
// variavel faltando nao vira erro, vira a string "undefined" dentro do bundle,
// e o fetch sai para "undefined/store/power-ups" sem reclamar de nada.
//
// Por isso a checagem e aqui e nao em runtime: falha no `bun run build`, dentro
// do CI, em vez de numa TV Box sem devtools.
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
    base: "/store/",
    server: {
      port: 5174,
      // Em producao o ingress serve pagina e API no mesmo dominio.
      // O proxy reproduz isso em desenvolvimento, onde cada backend
      // esta numa porta: assim o codigo usa caminho relativo nos dois.
      proxy: {
        "/api/auth": "http://localhost:3000",
        "/api/store": "http://localhost:3001",
        // A arte do catalogo nao vem de backend nenhum: tem servico de arquivo
        // estatico proprio, que o ingress atende em /assets/. Em dev isso e um
        // servidor estatico local sobre a pasta assets/ da raiz -- veja o
        // README dela. Nao colide com o bundle, que fica sob /store/assets/.
        "/assets":
          process.env.ASSETS_PROXY_TARGET ?? "http://localhost:8080",
      },
    },
    // Os testes rodam pelo mesmo config do build: o mesmo transform de JSX, as
    // mesmas variaveis de ambiente, o mesmo resolve. Assim o que passa no teste
    // e o que vai para o bundle, e nao uma segunda montagem parecida.
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      // Sem globals: describe/it/expect vem por import, como nos testes do
      // backend. O que o arquivo usa fica declarado no topo dele.
      globals: false,
      css: false,
    },
  };
});
