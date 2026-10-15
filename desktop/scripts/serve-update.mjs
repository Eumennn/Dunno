// Yerel sahte güncelleme sunucusu (SPEC 10 CL1, gerçek yayın yok): 127.0.0.1:8799/latest.json + kurulum dosyası.
// Uygulama bu uca `tauri dev --config src-tauri/tauri.update-test.conf.json` ile bakar (sadece dev; http orada açık).
// Kullanım: npm run update:serve -- --exe <imzalı kurulum.exe> [--sig <exe.sig>] [--version 0.1.1] [--port 8799]
// Elle test adımları: orchestrator/notes/desktop-manual-test.md bölüm 17.
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { latestJson, sources } from "./make-latest.mjs";

/** Saf sayılır: verilen manifest ve dosyaları sunan http sunucusu (dinlemeye başlamaz). */
export function updateServer(latest, files = {}) {
  return createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (req.method !== "GET") {
      res.writeHead(405).end();
    } else if (path === "/latest.json") {
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(latest));
    } else if (files[path]) {
      res.writeHead(200, { "content-type": "application/octet-stream" }).end(files[path]);
    } else {
      res.writeHead(404).end();
    }
  });
}

function main() {
  const arg = (name) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const exe = arg("--exe");
  if (!exe || !existsSync(exe)) {
    console.error("FAIL  --exe <imzalı kurulum.exe> gerekli");
    process.exit(1);
  }
  const sig = arg("--sig") ?? `${exe}.sig`;
  const port = Number(arg("--port") ?? 8799);
  const name = basename(exe);
  const src = sources();
  const latest = latestJson({
    version: arg("--version") ?? src.version,
    notes: "yerel test sürümü",
    url: `http://127.0.0.1:${port}/${name}`,
    signature: readFileSync(sig, "utf8"),
  });
  updateServer(latest, { [`/${name}`]: readFileSync(exe) }).listen(port, "127.0.0.1", () =>
    console.log(`latest.json ${latest.version} -> http://127.0.0.1:${port}/latest.json`),
  );
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/serve-update.mjs")) main();
