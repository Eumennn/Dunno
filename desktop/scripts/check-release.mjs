// Sürüm tek kaynak kontrolü: tauri.conf.json version == worker/src/data/releases.json version,
// releases.json windows URL'sinin dosya adı == Tauri NSIS çıktı adı (<productName>_<version>_x64-setup.exe).
// Ayrıca package.json ve Cargo.toml sürümleri de aynı olmalı.
// SPEC 10 CL1: güncelleme yapılandırması (https uç nokta, requireSignedVersion, pubkey girildi mi) ve varsa
// desktop/release/latest.json (sürüm + URL releases.json ile aynı, imza dolu).
// Kullanım: npm run check:release            (sadece tutarlılık; pubkey yoksa uyarı)
//           npm run check:release -- --built (derlenmiş NSIS dosyası da var mı)
//           npm run check:release -- --publish (yayın öncesi: pubkey, .sig ve latest.json şart)
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktop = join(dirname(fileURLToPath(import.meta.url)), "..");
const paths = {
  tauri: join(desktop, "src-tauri", "tauri.conf.json"),
  cargo: join(desktop, "src-tauri", "Cargo.toml"),
  pkg: join(desktop, "package.json"),
  releases: join(desktop, "..", "worker", "src", "data", "releases.json"),
};

const problems = [];
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const tauri = readJson(paths.tauri);
const pkg = readJson(paths.pkg);
const cargoVersion = /^\s*version\s*=\s*"([^"]+)"/m.exec(readFileSync(paths.cargo, "utf8"))?.[1];
const version = tauri.version;
const expectedExe = `${tauri.productName}_${version}_x64-setup.exe`;

if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) problems.push(`tauri.conf.json version "${version}" is not x.y.z`);
if (pkg.version !== version) problems.push(`package.json version ${pkg.version} != tauri.conf.json ${version}`);
if (cargoVersion !== version) problems.push(`Cargo.toml version ${cargoVersion} != tauri.conf.json ${version}`);
// FB9 kurulum programı (setup-tauri): dosya özelliklerindeki sürüm de aynı
const setupConf = readJson(join(desktop, "setup-tauri", "tauri.conf.json")).version;
const setupCargo = /^\s*version\s*=\s*"([^"]+)"/m.exec(readFileSync(join(desktop, "setup-tauri", "Cargo.toml"), "utf8"))?.[1];
if (setupConf !== version) problems.push(`setup-tauri/tauri.conf.json version ${setupConf} != tauri.conf.json ${version}`);
if (setupCargo !== version) problems.push(`setup-tauri/Cargo.toml version ${setupCargo} != tauri.conf.json ${version}`);

if (!existsSync(paths.releases)) {
  problems.push(`missing ${paths.releases}`);
} else {
  const releases = readJson(paths.releases);
  if (releases.version !== version) {
    problems.push(`worker releases.json version ${releases.version} != tauri.conf.json ${version}`);
  }
  const winName = String(releases.urls?.windows ?? "").split("/").pop();
  if (winName !== expectedExe) problems.push(`releases.json windows file "${winName}" != expected "${expectedExe}"`);
}

// güncelleme (SPEC 10 CL1)
const warnings = [];
const publish = process.argv.includes("--publish");
const updater = tauri.plugins?.updater;
if (!updater) problems.push("tauri.conf.json plugins.updater missing");
else {
  if (!Array.isArray(updater.endpoints) || updater.endpoints.length === 0) problems.push("updater endpoints empty");
  for (const e of updater.endpoints ?? []) if (!String(e).startsWith("https://")) problems.push(`updater endpoint not https: ${e}`);
  if (updater.dangerousInsecureTransportProtocol) problems.push("updater dangerousInsecureTransportProtocol must stay off in tauri.conf.json (only tauri.update-test.conf.json)");
  if (updater.requireSignedVersion !== true) problems.push("updater requireSignedVersion must be true");
  const placeholder = !updater.pubkey || /^\[.*\]$/.test(String(updater.pubkey).trim());
  if (placeholder) (publish ? problems : warnings).push("updater pubkey not set (docs/RELEASE.md: tauri signer generate)");
}
if (tauri.bundle?.createUpdaterArtifacts) problems.push("createUpdaterArtifacts belongs in tauri.release.conf.json (plain build must not need the private key)");
const latestPath = join(desktop, "release", "latest.json");
if (existsSync(latestPath)) {
  const latest = readJson(latestPath);
  const releases = existsSync(paths.releases) ? readJson(paths.releases) : {};
  if (latest.version !== version) problems.push(`release/latest.json version ${latest.version} != ${version}`);
  const win = latest.platforms?.["windows-x86_64"];
  if (!win?.signature) problems.push("release/latest.json windows signature empty");
  if (win?.url !== releases.urls?.windows) problems.push(`release/latest.json url ${win?.url} != releases.json ${releases.urls?.windows}`);
} else if (publish) problems.push("release/latest.json missing (npm run release:latest)");
// canlı worker adresi (VITE_API_BASE) CSP connect-src'de olmalı; yoksa yayındaki exe sunucuya hiç bağlanamaz (sessizce havuza düşer)
const apiBase = (process.env.VITE_API_BASE ?? "").trim().replace(/\/+$/, "");
const connectSrc = /connect-src([^;]*)/.exec(String(tauri.app?.security?.csp ?? ""))?.[1].trim().split(/\s+/) ?? [];
if (!apiBase) (publish ? problems : warnings).push("VITE_API_BASE not set: the build talks to the local worker (http://127.0.0.1:8787)");
else {
  let origin = "";
  try {
    origin = new URL(apiBase).origin;
  } catch {
    problems.push(`VITE_API_BASE is not a url: ${apiBase}`);
  }
  if (origin && !origin.startsWith("https://")) (publish ? problems : warnings).push(`VITE_API_BASE not https: ${origin}`);
  if (origin && !connectSrc.includes(origin)) problems.push(`CSP connect-src is missing ${origin} (tauri.conf.json app.security.csp)`);
}
for (const w of warnings) console.warn(`WARN  ${w}`);

if (process.argv.includes("--built")) {
  const built = join(desktop, "src-tauri", "target", "release", "bundle", "nsis", expectedExe);
  if (!existsSync(built)) problems.push(`built installer not found: ${built}`);
}

if (problems.length > 0) {
  for (const p of problems) console.error(`FAIL  ${p}`);
  process.exit(1);
}
console.log(`PASS  version ${version}, installer ${expectedExe}`);
