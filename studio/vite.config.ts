/// <reference types="vitest/config" />
// Dunno Studio: iç araç, son kullanıcıya dağıtılmaz. `npm run studio` -> http://127.0.0.1:5180
// Sadece 127.0.0.1'e bağlanır. /api/* server.ts'ten (vite eklentisi).
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { poolApiPlugin, STUDIO_HOST, STUDIO_PORT } from "./server";

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const uiKit = at("../ui-kit");
const desktop = at("../desktop");

export default defineConfig({
  clearScreen: false,
  resolve: { alias: { "@ui-kit": uiKit, "@desktop": `${desktop}/src`, "@desktop-assets": `${desktop}/assets` } },
  server: {
    host: STUDIO_HOST,
    port: STUDIO_PORT,
    strictPort: true,
    fs: { allow: [at("."), uiKit, desktop, at("../content")] },
  },
  preview: { host: STUDIO_HOST, port: STUDIO_PORT, strictPort: true },
  plugins: [
    poolApiPlugin({
      contentDir: at("../content/pool"),
      assetsDir: `${desktop}/assets`,
      workerBase: process.env.STUDIO_WORKER_BASE ?? "http://127.0.0.1:8787",
    }),
  ],
  test: {
    include: ["*.test.ts", "src/**/*.test.ts"],
  },
});
