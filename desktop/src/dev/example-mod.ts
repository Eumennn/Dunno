// Sadece geliştirme önizlemesi (Tauri dışı, ?mods=example): content/mods/example_pastel'i Rust okuyucusunun biçimine çevirir.
// Üretim derlemesine girmez (app/main.ts import.meta.env.DEV altında dinamik yükler).
import type { ModDir } from "../mods/mods";

const text = import.meta.glob("../../../content/mods/example_pastel/**/*.{json,md,txt}", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;
const png = import.meta.glob("../../../content/mods/example_pastel/**/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const rel = (p: string) => p.slice(p.indexOf("example_pastel/") + "example_pastel/".length);

export async function exampleModDirs(): Promise<ModDir[]> {
  const files = Object.entries(text).map(([p, t]) => ({ path: rel(p), size: t.length, text: t }));
  for (const [p, url] of Object.entries(png)) {
    const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
    let bin = "";
    for (const b of buf) bin += String.fromCharCode(b);
    files.push({ path: rel(p), size: buf.length, base64: btoa(bin) } as never);
  }
  return [{ dir: "example_pastel", files }];
}
