// Uçtan uca (canlı worker) testleri: normal `npm test`'e girmez, `npm run e2e` ile koşar.
// Worker'ı test kendisi açar/kapatır (live.e2e.ts). UI'ya giriş yok: sadece api.ts + saf konuşma fonksiyonları.
import { defineConfig } from "vitest/config";

export const E2E_PORT = Number(process.env.E2E_PORT ?? 8788);

export default defineConfig({
  test: {
    include: ["e2e/**/*.e2e.ts"],
    // worker açılışı + cron birkaç saniye sürebilir
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    env: {
      VITE_API_BASE: `http://127.0.0.1:${E2E_PORT}`,
      E2E_PORT: String(E2E_PORT),
    },
  },
});
