/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const uiKit = fileURLToPath(new URL("../ui-kit", import.meta.url));
// dev önizleme (sprites.html) referans çizimi okur
const art = fileURLToPath(new URL("../content/art", import.meta.url));
// gardırop temaları (content/wardrobe/themes.json)
const wardrobeContent = fileURLToPath(new URL("../content/wardrobe", import.meta.url));
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

// Tauri beklentileri: sabit port, ekranı temizleme, src-tauri'yi izleme.
// @ui-kit: landing ile ortak görsel dil (repo kökündeki ui-kit/, studio da kullanır).
export default defineConfig({
  clearScreen: false,
  resolve: { alias: { "@ui-kit": uiKit } },
  // about.txt sürümü (tauri.conf/package.json ile aynı; check:release eşitliği denetler)
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
    fs: { allow: [".", uiKit, art, wardrobeContent] },
  },
  build: {
    target: "es2022",
    outDir: "dist",
    // iki pencere: pet (index.html) + dunno.exe (app.html). sprites.html sadece dev.
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        app: fileURLToPath(new URL("./app.html", import.meta.url)),
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "../ui-kit/**/*.test.ts"],
  },
});
