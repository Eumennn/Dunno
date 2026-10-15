export const MODES = ["polite", "street"] as const;
export type Mode = (typeof MODES)[number];

export const LANGS = ["tr", "en"] as const;
export type Lang = (typeof LANGS)[number];

/** SPEC 06 Q3: honest = günde 3 doğru-ama-kinayeli cevap; pool_hint = eski işe yaramaz cevap (varsayılan) */
export const KINDS = ["honest", "pool_hint"] as const;
export type Kind = (typeof KINDS)[number];

/** istemcinin classify() sonucu (desktop/src/talk/classify.ts QTYPES ile aynı) */
export const QTYPES = [
  "who",
  "where",
  "when",
  "why",
  "how",
  "how_many",
  "what",
  "yes_no",
  "math",
  "advice",
  "greeting",
  "insult",
  // SPEC 09 K8
  "from_where",
  "to_where",
  "to_whom",
  "from_whom",
  "whose",
  "with_whom",
  "with_what",
  "what_for",
  "which",
  "ordinal",
  "how_are_you",
  "good_morning",
  "good_afternoon",
  "good_evening",
  "good_night",
  "thanks",
  "sorry",
  "bye",
  "love",
  "bored",
  "hungry",
  "tired",
  "compliment",
  "what_are_you_doing",
  "what_happened",
  "confusion",
  "disbelief",
  "amusement",
  "command",
  "help",
  "self_deprecation",
  "third_person",
  "insult_strong",
  "gibberish",
  "follow_up",
  "other",
] as const;
export type QType = (typeof QTYPES)[number];

export const MAX_QUESTION_CHARS = 200;
/** uygulamanın ürettiği rastgele kimlik (ör. UUID); kişisel veri içermez */
export const DEVICE_ID = /^[A-Za-z0-9_-]{8,64}$/;

/** SPEC 17 L1/L3: ton ve evrim formu ipuçları (enum; bilinmeyen değer sessizce atılır) */
export const TONES = ["sad", "angry", "joking", "kind"] as const;
export type Tone = (typeof TONES)[number];
export const PERSONAS = ["chaos", "chill", "gremlin", "demon", "sloth", "cloud", "glitchling"] as const;
export type Persona = (typeof PERSONAS)[number];

export type AskInput = { question: string; mode: Mode; lang: Lang; deviceId: string; kind: Kind; qtype: QType; tone?: Tone; persona?: Persona };
export type Validation = { ok: true; value: AskInput } | { ok: false; error: string };

const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (list as readonly string[]).includes(v);

/** POST /v1/ask gövdesini doğrular. Hata mesajlarında soru metni asla yer almaz. */
export function validateAsk(body: unknown): Validation {
  if (typeof body !== "object" || body === null) return { ok: false, error: "invalid body" };
  const { question, mode, lang, deviceId, kind, qtype, tone, persona } = body as Record<string, unknown>;

  if (typeof question !== "string") return { ok: false, error: "invalid question" };
  const q = question.trim();
  if (q.length === 0) return { ok: false, error: "empty question" };
  // kod noktası sayısı: emoji vb. iki UTF-16 birimi tek karakter sayılır
  if (Array.from(q).length > MAX_QUESTION_CHARS) return { ok: false, error: "question too long" };

  if (!oneOf(MODES, mode)) return { ok: false, error: "invalid mode" };
  if (!oneOf(LANGS, lang)) return { ok: false, error: "invalid lang" };
  if (typeof deviceId !== "string" || !DEVICE_ID.test(deviceId)) return { ok: false, error: "invalid device id" };

  // kind yoksa eski istemci: pool_hint. Bilinmeyen kind açık hata (yanlışlıkla hak harcanmasın).
  if (kind !== undefined && !oneOf(KINDS, kind)) return { ok: false, error: "invalid kind" };
  // qtype sadece ipucu: geçersiz/yoksa other
  const type: QType = oneOf(QTYPES, qtype) ? qtype : "other";

  const value: AskInput = { question: q, mode, lang, deviceId, kind: kind ?? "pool_hint", qtype: type };
  // ipuçları: sadece geçerli enum (serbest metin prompt'a asla girmez)
  if (oneOf(TONES, tone)) value.tone = tone;
  if (oneOf(PERSONAS, persona)) value.persona = persona;
  return { ok: true, value };
}
