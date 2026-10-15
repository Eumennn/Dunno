// REPO-01: herkese açık reponun (public-app: kullanıcı dosyaları + landing) yerel ihracatı + denetim. Push etmez, GitHub'da repo açmaz.
// Kullanım (repo kökünden): node orchestrator/repo-split/split.mjs [--out <klasör>]   (varsayılan: ../dunno-split)
// Her ihracat: manifest include (sadece git'te izlenen dosyalar) + şablonlar; sonra denetim:
//  - yasaklı yollar (forbidden_in_public) yok
//  - gizli bilgi kalıbı yok (API anahtarı, token, özel anahtar, imza anahtarı, webhook)
//  - kişisel yerel yol (C:\Users\<ad>) ve geliştirici e-postası yok (iletişim adresi hariç)
// Çıkış kodu 1 = denetim başarısız (dosya listesi yazılır).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifest = JSON.parse(readFileSync(join(root, "orchestrator", "repo-split", "manifest.json"), "utf8"));

export const SECRET = [
  /sk-or-v1-[A-Za-z0-9]{20,}/,
  /\bsk-[A-Za-z0-9]{32,}/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{30,}/,
  /AKIA[0-9A-Z]{16}/,
  /xox[abp]-[A-Za-z0-9-]{10,}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY/,
  /encrypted secret key/,
  /hooks\.slack\.com\/services\//,
  /discord(app)?\.com\/api\/webhooks\//,
];
export const PERSONAL = [/[A-Z]:\\Users\\(?!x\\|<)[A-Za-z0-9_]+/, /\/c\/Users\/[A-Za-z0-9_]+/, /eymenturkkan468@/];

/** herkese açık repolar (manifest'te görünürlüğü public olanlar) */
export const PUBLIC = Object.entries(manifest.repos)
  .filter(([, r]) => r.visibility === "public")
  .map(([n]) => n);

const files = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? (f === ".git" ? [] : files(p)) : [p];
  });

/** Bir klasörü denetler; sorun listesi döner. */
export function audit(dir, forbidden) {
  const out = [];
  for (const p of files(dir)) {
    const rel = relative(dir, p).replaceAll("\\", "/");
    if (forbidden.some((f) => rel === f || rel.startsWith(f))) out.push(`${rel}: yasaklı yol`);
    const text = readFileSync(p, "latin1");
    for (const re of SECRET) if (re.test(text)) out.push(`${rel}: gizli bilgi kalıbı ${re}`);
    for (const re of PERSONAL) if (re.test(text)) out.push(`${rel}: kişisel iz ${re}`);
  }
  return out;
}

function tracked() {
  return new Set(execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean));
}

export function exportRepo(name, out) {
  const spec = manifest.repos[name];
  const dest = join(out, name);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  const git = tracked();
  // include: "yol" (aynı yere) ya da { from, to } (ör. site/index.html -> index.html, Pages kökü)
  for (const item of spec.include ?? []) {
    const { from, to } = typeof item === "string" ? { from: item, to: item } : item;
    if (!git.has(from)) throw new Error(`${name}: ${from} git'te izlenmiyor`);
    mkdirSync(dirname(join(dest, to)), { recursive: true });
    cpSync(join(root, from), join(dest, to));
  }
  if (spec.templates) cpSync(join(root, spec.templates), dest, { recursive: true });
  return dest;
}

function main() {
  const i = process.argv.indexOf("--out");
  const out = i > 0 ? process.argv[i + 1] : join(root, "..", "dunno-split");
  let failed = false;
  for (const name of PUBLIC) {
    const dest = exportRepo(name, out);
    const problems = audit(dest, manifest.forbidden_in_public);
    const count = files(dest).length;
    if (problems.length) {
      failed = true;
      console.error(`FAIL  ${name} (${count} dosya)`);
      for (const p of problems) console.error(`  ${p}`);
    } else console.log(`PASS  ${name}: ${count} dosya -> ${dest} (hedef ${manifest.repos[name].github}, geçmişsiz)`);
  }
  if (!existsSync(join(root, ".gitignore")) || !readFileSync(join(root, ".gitignore"), "utf8").includes("*.key")) {
    failed = true;
    console.error("FAIL  dev: .gitignore *.key (updater özel anahtarı) eksik");
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("repo-split/split.mjs")) main();
