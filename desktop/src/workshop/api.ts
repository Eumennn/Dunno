// Workshop + AI dünya istemcisi (SPEC 18). Sadece dunno.exe'den, kullanıcı bir şeye basınca. Ağ yoksa / sunucu yoksa sessizce boş.
// Giden: liste isteği, paket kimliği, cihaz kimliği (rastgele, kişisel değil), takma ad, yüklenen paket, AI fikri, Pro lisans metni.
import { DEFAULT_BASE_URL } from "../api";
import type { ModDir } from "../mods/mods";

export interface WsItem {
  id: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  author: string;
  kinds: string[];
  version: string;
  bytes: number;
  createdAt: string;
  likes: number;
  downloads: number;
  premium?: boolean;
}

export type WsResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

export class WorkshopApi {
  constructor(
    private readonly base = DEFAULT_BASE_URL,
    private readonly fetchImpl: typeof fetch = (i, init) => fetch(i, init),
  ) {}

  private async call<T>(path: string, init: RequestInit = {}, timeoutMs = 8_000): Promise<WsResult<T>> {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await this.fetchImpl(`${this.base}${path}`, { ...init, signal: ctl.signal, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) return { ok: false, status: res.status, error: typeof body.error === "string" ? body.error : "error" };
      return { ok: true, value: body as T };
    } catch {
      return { ok: false, status: 0, error: "offline" };
    } finally {
      clearTimeout(t);
    }
  }

  list(sort: "new" | "top", kind?: string) {
    return this.call<{ items: WsItem[] }>(`/v1/workshop?sort=${sort}${kind ? `&kind=${encodeURIComponent(kind)}` : ""}`);
  }
  item(id: string) {
    return this.call<{ item: WsItem; pack: ModDir }>(`/v1/workshop/item/${encodeURIComponent(id)}`);
  }
  creator(handle: string) {
    return this.call<{ handle: string; items: WsItem[]; likes: number; packs: number }>(`/v1/workshop/creator/${encodeURIComponent(handle)}`);
  }
  like(deviceId: string, id: string) {
    return this.call<{ liked: boolean; likes: number }>("/v1/workshop/like", { method: "POST", body: JSON.stringify({ deviceId, id }) });
  }
  upload(deviceId: string, handle: string, pack: ModDir) {
    return this.call<{ ok: true; status: string; id: string }>("/v1/workshop/upload", { method: "POST", body: JSON.stringify({ deviceId, handle, pack }) }, 20_000);
  }
  createWorld(deviceId: string, license: string | null, idea: string) {
    return this.call<{ pack: ModDir; left: number }>("/v1/create/world", { method: "POST", body: JSON.stringify({ deviceId, license, idea }) }, 30_000);
  }
}
