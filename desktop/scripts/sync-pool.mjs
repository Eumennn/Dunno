// Tek kaynak content/pool/pool_<lang>.json + banned_<lang>.txt -> desktop/assets/ kopyası. predev/prebuild/pretest çalıştırır.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktop = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(desktop, "..", "content", "pool");
const to = join(desktop, "assets");
mkdirSync(to, { recursive: true });
for (const lang of ["tr", "en", "es"]) {
  try {
    copyFileSync(join(from, `pool_${lang}.json`), join(to, `pool_${lang}.json`));
    // SPEC 06 Q2d: talk/classify.ts isForbidden aynı yasak listeleri kullanır (worker ile tek kaynak)
    copyFileSync(join(from, `banned_${lang}.txt`), join(to, `banned_${lang}.txt`));
  } catch {}
}
// SPEC 09 K7: sekme başlığı eşleme tablosu (talk/sites.ts)
copyFileSync(join(desktop, "..", "content", "context", "sites.json"), join(to, "sites.json"));
