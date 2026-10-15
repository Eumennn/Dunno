// İmzalı güncelleme manifesti (SPEC 10 CL1): desktop/release/latest.json. Tauri updater biçimi
// { version, notes, pub_date, platforms: { "windows-x86_64": { signature, url } } }.
// Sürüm kaynağı tek: tauri.conf.json version == worker releases.json version (check:release), notlar ve indirme URL'si
// releases.json'dan (/v1/release ile aynı). İmza: tauri build (tauri.release.conf.json, createUpdaterArtifacts) çıktısı
// <kurulum>.exe.sig; özel anahtar repoya girmez (docs/RELEASE.md).
// Kullanım: npm run release:latest [-- --sig <dosya.sig>] [-- --out <klasör>] [-- --url <indirme url>] [-- --date <ISO>]
//          Mac (SPEC 19, universal): [-- --mac-sig <Dunno.app.tar.gz.sig>] [-- --mac-url <.app.tar.gz indirme url>]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktop = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const entry = (signature, url, what) => {
  if (!signature || !signature.trim()) throw new Error(`${what} signature is empty`);
  if (!/^https?:\/\//.test(url ?? "")) throw new Error(`${what} url "${url}" is not http(s)`);
  return { signature: signature.trim(), url };
};

/** Saf: manifest nesnesi. mac verilirse universal paket hem Apple Silicon hem Intel için yazılır. */
export function latestJson({ version, notes, url, signature, date, mac }) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`version "${version}" is not x.y.z`);
  const platforms = { "windows-x86_64": entry(signature, url, "windows") };
  if (mac) {
    const m = entry(mac.signature, mac.url, "mac");
    platforms["darwin-aarch64"] = m;
    platforms["darwin-x86_64"] = m;
  }
  return {
    version,
    notes: notes ?? "",
    pub_date: new Date(date ?? Date.now()).toISOString(),
    platforms,
  };
}

/** Repodaki kaynaklardan sürüm, not, URL ve beklenen .sig yolu. */
export function sources(root = desktop) {
  const tauri = readJson(join(root, "src-tauri", "tauri.conf.json"));
  const releases = readJson(join(root, "..", "worker", "src", "data", "releases.json"));
  const exe = `${tauri.productName}_${tauri.version}_x64-setup.exe`;
  return {
    version: tauri.version,
    notes: releases.notes,
    url: releases.urls?.windows,
    sig: join(root, "src-tauri", "target", "release", "bundle", "nsis", `${exe}.sig`),
  };
}

function main() {
  const arg = (name) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const src = sources();
  const sigPath = arg("--sig") ?? src.sig;
  if (!existsSync(sigPath)) {
    console.error(`FAIL  signature not found: ${sigPath} (npm run release:build ile imzalı build al)`);
    process.exit(1);
  }
  const out = arg("--out") ?? join(desktop, "release");
  const macSig = arg("--mac-sig");
  if (macSig && !existsSync(macSig)) {
    console.error(`FAIL  mac signature not found: ${macSig}`);
    process.exit(1);
  }
  const mac = macSig ? { signature: readFileSync(macSig, "utf8"), url: arg("--mac-url") } : undefined;
  const json = latestJson({ ...src, url: arg("--url") ?? src.url, signature: readFileSync(sigPath, "utf8"), date: arg("--date"), mac });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "latest.json"), JSON.stringify(json, null, 2) + "\n");
  console.log(`wrote ${join(out, "latest.json")} (${json.version})`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/make-latest.mjs")) main();
