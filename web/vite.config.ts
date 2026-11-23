import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// build vai para ../static/app, servido pelo app.py em /static/app/; em dev, o vite faz proxy para o painel Python
export default defineConfig({
  plugins: [react()],
  base: "/static/app/",
  build: { outDir: "../static/app", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      ["/api", "/novidades", "/card", "/corrigir", "/traduzir", "/audio", "/classico", "/ping", "/static/favicon.png", "/static/logo-256.png"]
        .map((p) => [p, "http://127.0.0.1:8765"]),
    ),
  },
});
