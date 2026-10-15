// REPO-01: herkese açık repo ihracatı (orchestrator/repo-split/split.mjs) yasaklı yol, gizli bilgi ve kişisel izi yakalar;
// gerçek ihracat temiz. GitHub'a dokunmaz.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error saf .mjs, tip yok
import { audit, exportRepo, PUBLIC } from "../../orchestrator/repo-split/split.mjs";
import manifest from "../../orchestrator/repo-split/manifest.json";

const forbidden = manifest.forbidden_in_public;

describe("repo bölme (REPO-01)", () => {
  it("denetim: yasaklı yol, anahtar, özel anahtar, kişisel yol yakalanır", () => {
    const d = mkdtempSync(join(tmpdir(), "split-"));
    mkdirSync(join(d, "orchestrator"), { recursive: true });
    writeFileSync(join(d, "orchestrator", "plan.md"), "iç not");
    writeFileSync(join(d, "a.txt"), "OPENROUTER_API_KEY=sk-or-v1-" + "a".repeat(40));
    writeFileSync(join(d, "b.txt"), "untrusted comment: rsign encrypted secret key");
    writeFileSync(join(d, "c.txt"), "C:\\Users\\pc\\Downloads");
    writeFileSync(join(d, "ok.txt"), "C:\\Users\\<ad>\\ örnek yol, dunnothebean@gmail.com iletişim");
    const p: string[] = audit(d, forbidden);
    expect(p.some((x) => x.startsWith("orchestrator/plan.md: yasaklı"))).toBe(true);
    expect(p.some((x) => x.startsWith("a.txt: gizli"))).toBe(true);
    expect(p.some((x) => x.startsWith("b.txt: gizli"))).toBe(true);
    expect(p.some((x) => x.startsWith("c.txt: kişisel"))).toBe(true);
    expect(p.some((x) => x.startsWith("ok.txt"))).toBe(false);
  });

  it("gerçek ihracat (public-app) temiz; kaynak kod ve iç notlar yok; landing kökte, Pages için .nojekyll", () => {
    const out = mkdtempSync(join(tmpdir(), "split-out-"));
    expect(PUBLIC).toEqual(["public-app"]);
    for (const name of PUBLIC) expect(audit(exportRepo(name, out), forbidden), name).toEqual([]);
    const app = join(out, "public-app");
    expect(existsSync(join(app, "index.html"))).toBe(true);
    expect(existsSync(join(app, ".nojekyll"))).toBe(true);
    expect(existsSync(join(app, "desktop"))).toBe(false);
    // landing indirme düğmesi Releases'teki sabit adlara gider (CI release.yml bu adlarla yükler)
    const html = readFileSync(join(app, "index.html"), "utf8");
    expect(html).toContain(`github.com/${manifest.repos["public-app"].github}/releases/latest/download/Dunno-setup.exe`);
    expect(html).toContain(`github.com/${manifest.repos["public-app"].github}/releases/latest/download/Dunno.dmg`);
  });

  it("güncelleme uç noktası herkese açık uygulama reposunda", async () => {
    const tauri = (await import("../src-tauri/tauri.conf.json")).default as { plugins: { updater: { endpoints: string[] } } };
    expect(tauri.plugins.updater.endpoints[0]).toBe(`https://github.com/${manifest.repos["public-app"].github}/releases/latest/download/latest.json`);
    expect(manifest.repos["public-app"].visibility).toBe("public");
  });
});
