// Worker istemcisi: /v1/ask ve /v1/lines. Tarayıcı/webview uyumlu (fetch + AbortController), Node API yok.
// Her hata sessizce null/önbellek döner; çağıran havuza düşer. Soru metni hiçbir yerde loglanmaz.
import { mergeLines } from "./lines/engine";
import type { Lang, Line, Mode } from "./lines/types";
import type { QType } from "./talk/classify";

declare global {
  interface ImportMetaEnv {
    /** Worker adresi; build/dev sırasında verilir (canlı worker, e2e portu). Yoksa yerel worker. */
    readonly VITE_API_BASE?: string;
  }
}

export const LOCAL_BASE_URL = "http://127.0.0.1:8787";

/** Boş/eksik değer yerel worker'a düşer; sondaki / atılır. */
export function resolveBaseUrl(raw: string | undefined): string {
  const v = (raw ?? "").trim().replace(/\/+$/, "");
  return v === "" ? LOCAL_BASE_URL : v;
}

/** Build anında VITE_API_BASE, yoksa yerel worker. (Tauri CSP connect-src bu origin'i içermeli.) */
export const DEFAULT_BASE_URL = resolveBaseUrl(import.meta.env.VITE_API_BASE);
/** worker LLM zaman aşımı 4 sn; ağ payıyla 6 sn (SPEC 06 Q3 honest) */
export const ASK_TIMEOUT_MS = 6000;
export const LINES_TIMEOUT_MS = 5000;

/** dil başına son /v1/lines yanıtı; kalıcı saklanıp çevrimdışı açılışta geri verilebilir */
export type LinesCache = Partial<Record<Lang, { etag: string | null; date: string | null; lines: Line[] }>>;

export interface ApiOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  askTimeoutMs?: number;
  linesTimeoutMs?: number;
  cache?: LinesCache | null;
}

export interface AskRequest {
  question: string;
  mode: Mode;
  lang: Lang;
  deviceId: string;
  /** SPEC 06 Q3: honest = günlük doğru cevap hakkı; pool_hint = eski işe yaramaz cevap */
  kind: "honest" | "pool_hint";
  qtype: QType;
  /** SPEC 17 L1/L3: ton ve evrim formu (enum; metin değil). Varsayılansa hiç gönderilmez. */
  tone?: "sad" | "angry" | "joking" | "kind";
  persona?: string;
}

/** /v1/ask 200 yanıtı (SPEC 06 Q3). charged:true değilse hak düşmez. */
export interface AskAnswer {
  answer: string;
  source: "llm" | "pool";
  honest: boolean;
  charged: boolean;
}

/** answer: 200 · limit: 429 (sunucu sayacı dolu) · error: anahtar/ağ/timeout/4xx/5xx/bozuk gövde */
export type AskOutcome = { kind: "answer"; result: AskAnswer } | { kind: "limit" } | { kind: "error" };

export class DunnoApi {
  readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly askTimeoutMs: number;
  private readonly linesTimeoutMs: number;
  private cache: LinesCache;

  constructor({
    baseUrl = DEFAULT_BASE_URL,
    fetchImpl,
    askTimeoutMs = ASK_TIMEOUT_MS,
    linesTimeoutMs = LINES_TIMEOUT_MS,
    cache = null,
  }: ApiOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    // window.fetch bağlamından kopunca "Illegal invocation" verir; her çağrıda global'e ilet
    this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init));
    this.askTimeoutMs = askTimeoutMs;
    this.linesTimeoutMs = linesTimeoutMs;
    this.cache = cache ? structuredCloneLines(cache) : {};
  }

  /**
   * POST /v1/ask. Cevap `[K]` içerebilir (renderText işler).
   * 429 -> limit; hata, timeout (6 sn), 4xx/5xx, ağ yok ya da bozuk gövde -> error: çağıran yerel havuza düşer.
   * honest/charged sadece tam olarak true ise true (eski sunucu: hak düşmez).
   */
  async ask(req: AskRequest): Promise<AskOutcome> {
    const res = await this.request("/v1/ask", this.askTimeoutMs, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    });
    if (res?.status === 429) return { kind: "limit" };
    if (!res || res.status !== 200) return { kind: "error" };
    try {
      const data = (await res.json()) as Record<string, unknown>;
      if (typeof data.answer !== "string" || data.answer.trim() === "") return { kind: "error" };
      return {
        kind: "answer",
        result: { answer: data.answer, source: data.source === "llm" ? "llm" : "pool", honest: data.honest === true, charged: data.charged === true },
      };
    } catch {
      return { kind: "error" };
    }
  }

  /**
   * GET /v1/lines?lang=. Önbellekte ETag varsa If-None-Match gönderir; 304'te önbellek döner.
   * Hata/timeout'ta önbellek (yoksa []) döner. Dönen laflar normallenmiş Line[]'dır.
   */
  async fetchLines(lang: Lang): Promise<Line[]> {
    const cached = this.cache[lang];
    const headers: Record<string, string> = {};
    if (cached?.etag) headers["if-none-match"] = cached.etag;

    const res = await this.request(`/v1/lines?lang=${lang}`, this.linesTimeoutMs, { headers });
    if (!res) return cached?.lines ?? [];
    if (res.status === 304) return cached?.lines ?? [];
    if (res.status !== 200) return cached?.lines ?? [];
    try {
      const data = (await res.json()) as { date?: unknown; lines?: unknown };
      const lines = mergeLines(Array.isArray(data.lines) ? data.lines : []);
      this.cache[lang] = {
        etag: res.headers.get("etag"),
        date: typeof data.date === "string" ? data.date : null,
        lines,
      };
      return lines;
    } catch {
      return cached?.lines ?? [];
    }
  }

  /** Kalıcı saklamak için önbellek kopyası. */
  snapshot(): LinesCache {
    return structuredCloneLines(this.cache);
  }

  private async request(path: string, timeoutMs: number, init: RequestInit): Promise<Response | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await this.fetchImpl(`${this.baseUrl}${path}`, { ...init, signal: controller.signal });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

function structuredCloneLines(cache: LinesCache): LinesCache {
  return JSON.parse(JSON.stringify(cache)) as LinesCache;
}
