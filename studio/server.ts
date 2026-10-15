// Dunno Studio sunucusu: vite dev sunucusuna eklenti (configureServer) olarak bağlanan küçük JSON API.
// Sadece 127.0.0.1'de çalışır (vite.config.ts). content/pool/*.json okur/yazar; doğrulama desktop'un pool-check.ts'i.
// Soru metni loglanmaz, saklanmaz; /api/ask sadece yerel worker'a iletir.
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import type { Plugin } from "vite";
import {
  checkPool,
  coverage,
  coverageMarkdown,
  parseBanned,
  POOL_TARGETS,
  type BannedLists,
  type CoverageRow,
  type Issue,
} from "../desktop/src/lines/pool-check";

export type Lang = "tr" | "en" | "es";
export const LANGS: readonly Lang[] = ["tr", "en", "es"];
export const STUDIO_HOST = "127.0.0.1";
export const STUDIO_PORT = 5180;
export const ASK_TIMEOUT_MS = 5000;
const MAX_BODY = 2 * 1024 * 1024;
/** studio'nun worker'a gönderdiği sabit cihaz kimliği (kota bu kimliğe sayılır) */
const STUDIO_DEVICE = "studio-local-0001";

export interface PoolApiOptions {
  /** content/pool */
  contentDir: string;
  /** yazınca kopyalanacak yer (desktop/assets); yoksa kopyalanmaz */
  assetsDir?: string;
  /** yerel worker, ör. http://127.0.0.1:8787 */
  workerBase: string;
  fetchImpl?: typeof fetch;
}

export type Entry = Record<string, unknown>;

export interface PoolData {
  tr: Entry[];
  en: Entry[];
  es: Entry[];
  banned: BannedLists & { es?: string[] };
}

const KEY_ORDER = ["id", "trigger", "intent", "tr", "en", "es"];

/**
 * Havuz dosyası biçimi (git diff okunur kalsın): satır başına bir nesne, `{ "k": v, ... }`,
 * trigger değişince boş satır. Mevcut dosyalar bu biçimle birebir aynı (test).
 */
export function formatPool(entries: readonly Entry[]): string {
  const line = (e: Entry) => {
    const keys = [...KEY_ORDER.filter((k) => k in e), ...Object.keys(e).filter((k) => !KEY_ORDER.includes(k))];
    return `  { ${keys.map((k) => `${JSON.stringify(k)}: ${JSON.stringify(e[k])}`).join(", ")} }`;
  };
  const out: string[] = [];
  entries.forEach((e, i) => {
    if (i > 0 && e.trigger !== entries[i - 1].trigger) out.push("");
    out.push(line(e) + (i < entries.length - 1 ? "," : ""));
  });
  return entries.length === 0 ? "[]\n" : `[\n${out.join("\n")}\n]\n`;
}

export function calcStudioCoverage(tr: Entry[], en: Entry[], es: Entry[]): CoverageRow[] {
  const count = (entries: unknown) => {
    const m = new Map<string, number>();
    if (!Array.isArray(entries)) return m;
    for (const raw of entries) {
      const e = raw as Record<string, unknown>;
      if (typeof e?.trigger !== "string") continue;
      if (typeof e.intent === "string" && e.intent.trim().toLowerCase() === "placeholder") continue;
      m.set(e.trigger, (m.get(e.trigger) ?? 0) + 1);
    }
    return m;
  };
  const t = count(tr);
  const n = count(en);
  const s = count(es);

  const allTriggers = new Set<string>([
    ...Array.from(t.keys()),
    ...Array.from(n.keys()),
    ...Array.from(s.keys()),
  ]);

  const rows: CoverageRow[] = [];
  for (const trigger of allTriggers) {
    const trCount = t.get(trigger) ?? 0;
    const enCount = n.get(trigger) ?? 0;
    const esCount = s.get(trigger) ?? 0;
    if (trCount === 0 && enCount === 0 && esCount === 0) continue;

    // Hedef: dildeki replik sayısı kadar (böylece eksiklik uyarısı kırmızı yanmaz, tam görünür)
    const target = Math.max(trCount, enCount, esCount);
    rows.push({
      trigger,
      target,
      tr: trCount,
      en: enCount,
      es: esCount,
    });
  }
  return rows;
}

export async function readPool(contentDir: string): Promise<PoolData> {
  const read = async (name: string) => {
    try { return await readFile(join(contentDir, name), "utf8"); } catch { return "[]"; }
  };
  const readBanned = async (name: string) => {
    try { return parseBanned(await readFile(join(contentDir, name), "utf8")); } catch { return []; }
  };
  return {
    tr: JSON.parse(await read("pool_tr.json")) as Entry[],
    en: JSON.parse(await read("pool_en.json")) as Entry[],
    es: JSON.parse(await read("pool_es.json")) as Entry[],
    banned: { tr: await readBanned("banned_tr.txt"), en: await readBanned("banned_en.txt"), es: await readBanned("banned_es.txt") },
  };
}

export interface SaveResult {
  ok: boolean;
  issues: Issue[];
}

/**
 * Bir dili doğrular; kural hatası yoksa dosyayı biçimiyle yazar, COVERAGE.md'yi yeniler ve assets'e kopyalar.
 * Hata varsa hiçbir şey yazılmaz (gap'ler, yani kapsam açığı, kaydı engellemez).
 */
export async function savePool(opts: PoolApiOptions, lang: Lang, entries: Entry[]): Promise<SaveResult> {
  const pool = await readPool(opts.contentDir);
  const other = lang === "tr" ? pool.en : pool.tr;
  const issues = checkPool(lang, entries, pool.banned, other);
  const oldIssues = new Set(checkPool(lang, pool[lang], pool.banned, other).filter(i => i.severity === "error").map(i => i.id + ":" + i.message)); if (issues.some(i => i.severity === "error" && !oldIssues.has(i.id + ":" + i.message))) return { ok: false, issues };

  const file = `pool_${lang}.json`;
  await writeFile(join(opts.contentDir, file), formatPool(entries), "utf8");
  const next = { ...pool, [lang]: entries };
  await writeFile(join(opts.contentDir, "COVERAGE.md"), coverageMarkdown(coverage(next.tr, next.en)), "utf8");
  if (opts.assetsDir) {
    await mkdir(opts.assetsDir, { recursive: true });
    await copyFile(join(opts.contentDir, file), join(opts.assetsDir, file));
  }
  return { ok: true, issues };
}

export type AskSource = "llm" | "pool" | "offline" | "limit" | "error";
export interface AskResponse {
  answer: string | null;
  source: AskSource;
}

/** Yerel worker'a /v1/ask. Anahtarsız worker kendi havuzundan döner (source: pool). */
export async function askWorker(
  opts: PoolApiOptions,
  body: { question: string; mode: string; lang: string },
): Promise<AskResponse> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASK_TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${opts.workerBase.replace(/\/+$/, "")}/v1/ask`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: body.question, mode: body.mode, lang: body.lang, deviceId: STUDIO_DEVICE }),
      signal: controller.signal,
    });
    if (res.status === 429) return { answer: null, source: "limit" };
    if (!res.ok) return { answer: null, source: "error" };
    const data = (await res.json()) as { answer?: unknown; source?: unknown };
    if (typeof data.answer !== "string") return { answer: null, source: "error" };
    return { answer: data.answer, source: data.source === "llm" ? "llm" : "pool" };
  } catch {
    return { answer: null, source: "offline" };
  } finally {
    clearTimeout(timer);
  }
}

function send(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(data));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new Error("body too large");
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const isLang = (v: unknown): v is Lang => v === "tr" || v === "en" || v === "es";

/**
 * Sadece aynı origin: başka bir site tarayıcı üzerinden dosya yazamasın.
 * Origin yoksa (curl, test) kabul; varsa Host ile aynı olmalı. JSON zorunlu (basit istek ön kontrolsüz gelemesin).
 */
function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export type Next = (err?: unknown) => void;

export function createPoolApi(opts: PoolApiOptions) {
  return async (req: IncomingMessage, res: ServerResponse, next: Next): Promise<void> => {
    const url = new URL(req.url ?? "/", "http://studio.local");
    if (!url.pathname.startsWith("/api/")) return next();
    if (!sameOrigin(req)) return send(res, 403, { error: "cross-origin request refused" });
    const method = req.method ?? "GET";
    if (method !== "GET" && !String(req.headers["content-type"] ?? "").startsWith("application/json")) {
      return send(res, 415, { error: "json only" });
    }
    try {
      if (url.pathname === "/api/pool" && method === "GET") {
        const pool = await readPool(opts.contentDir);
        return send(res, 200, { tr: pool.tr, en: pool.en, es: pool.es, coverage: calcStudioCoverage(pool.tr, pool.en, pool.es) });
      }
      const save = /^\/api\/pool\/(tr|en|es)$/.exec(url.pathname);
      if (save && method === "PUT") {
        const entries = await readJson(req);
        if (!Array.isArray(entries)) return send(res, 400, { error: "expected a json array" });
        const result = await savePool(opts, save[1] as Lang, entries as Entry[]);
        return send(res, result.ok ? 200 : 422, result);
      }
      if (url.pathname === "/api/check" && method === "POST") {
        const body = (await readJson(req)) as { lang?: unknown; entries?: unknown };
        if (!isLang(body.lang) || !Array.isArray(body.entries)) return send(res, 400, { error: "expected {lang, entries}" });
        const pool = await readPool(opts.contentDir);
        const other = body.lang === "tr" ? pool.en : pool.tr;
        return send(res, 200, { issues: checkPool(body.lang, body.entries, pool.banned, other) });
      }
      if (url.pathname === "/api/ask" && method === "POST") {
        const body = (await readJson(req)) as { question?: unknown; mode?: unknown; lang?: unknown };
        if (typeof body.question !== "string" || body.question.trim() === "" || !isLang(body.lang)) {
          return send(res, 400, { error: "expected {question, mode, lang}" });
        }
        const mode = body.mode === "street" ? "street" : "polite";
        return send(res, 200, await askWorker(opts, { question: body.question, mode, lang: body.lang }));
      }
      return send(res, 404, { error: "not found" });
    } catch {
      // ayrıntı (dosya yolu, soru) yanıta girmez
      return send(res, 500, { error: "studio server error" });
    }
  };
}

/** vite eklentisi: dev sunucusuna /api/* ekler. */
export function poolApiPlugin(opts: PoolApiOptions): Plugin {
  return {
    name: "dunno-studio-api",
    configureServer(server) {
      const handler = createPoolApi(opts);
      server.middlewares.use((req, res, next) => void handler(req, res, next));
    },
  };
}
