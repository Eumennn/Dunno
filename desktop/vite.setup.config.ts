// FB9: kurulum programının arayüzü (setup.html -> dist-setup), setup-tauri/ bunu gömer. Ana uygulamanın derlemesinden ayrı.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const uiKit = fileURLToPath(new URL("../ui-kit", import.meta.url));

export default defineConfig({
  clearScreen: false,
  resolve: { alias: { "@ui-kit": uiKit } },
  server: { port: 1421, strictPort: true, fs: { allow: [".", uiKit] } },
  build: {
    target: "es2022",
    outDir: "dist-setup",
    emptyOutDir: true,
    rollupOptions: { input: { setup: fileURLToPath(new URL("./setup.html", import.meta.url)) } },
  },
});
