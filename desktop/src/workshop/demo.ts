// dunno.exe önizlemesi (Tauri dışı, ?ws=demo): sahte workshop yanıtları. Sadece ui-shots ve geliştirme.
import { WorkshopApi, type WsItem } from "./api";

const item = (id: string, tr: string, en: string, author: string, kinds: string[], likes: number, downloads: number, premium = false): WsItem => ({
  id,
  name: { tr, en },
  description: { tr: "örnek paket açıklaması", en: "sample pack description" },
  author,
  kinds,
  version: "1.0.0",
  bytes: 4096,
  createdAt: "2026-10-09T10:00:00.000Z",
  likes,
  downloads,
  premium,
});

export const DEMO_ITEMS: WsItem[] = [
  item("sleepy_cats", "uykulu kediler", "sleepy cats", "mert_dev", ["themes", "reactions"], 128, 940),
  item("office_rage", "ofis öfkesi", "office rage", "ece", ["reactions"], 96, 610),
  item("neon_bits", "neon bitler", "neon bits", "pixelpal", ["themes", "accessories"], 77, 402),
  item("space_gossip", "uzay dedikodusu", "space gossip", "orbit_kid", ["reactions"], 41, 188, true),
];

export function demoApi(): WorkshopApi {
  const fake: typeof fetch = async (input) => {
    const url = String(input);
    const ok = (v: unknown) => new Response(JSON.stringify(v), { status: 200, headers: { "content-type": "application/json" } });
    if (url.includes("/v1/workshop/creator/")) return ok({ handle: "mert_dev", items: DEMO_ITEMS.slice(0, 1), likes: 128, packs: 1 });
    if (url.includes("/v1/workshop/like")) return ok({ liked: true, likes: 129 });
    if (url.includes("/v1/workshop")) return ok({ items: DEMO_ITEMS });
    return new Response("{}", { status: 503 });
  };
  return new WorkshopApi("http://demo.invalid", fake);
}
