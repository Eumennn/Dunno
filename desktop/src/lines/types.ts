// Laf motoru tipleri. Format: docs/PROJECT.md "Laf havuzu formatı".

export type Lang = "tr" | "en";
export type Mode = "polite" | "street";
/** konuşma sıklığı: az / normal / çok */
export type Frequency = "low" | "normal" | "high";
/** bastırma nedenleri: "bugün sus" ve toplantı */
/** site: sessiz kategori sekmesi önde (SPEC 09 K7, adult/kumar) */
export type SuppressReason = "mute" | "meeting" | "site";

/**
 * Havuz lafı. Yerel pool_<lang>.json iki dili birden taşıyabilir;
 * /v1/lines tek dilli gelir ({id, trigger, intent, tr} gibi). İkisi de bu tipe normallenir.
 * Metinde `{K:...}` sadece street modda görünür.
 */
export interface Line {
  id: string;
  /** "app:excel", "time:night", "idle:30", "battery:low", "interaction:click", "answer:generic", "random" */
  trigger: string;
  intent?: string;
  /** SPEC 13: nadir laf (easter egg tadında); grupta RARE_CHANCE olasılıkla seçilir */
  rare?: boolean;
  /** SPEC 15: Pro derin havuz lafı (Free'de söylenmez) */
  pro?: boolean;
  tr?: string;
  en?: string;
  es?: string;
}

/** trigger kategorileri; seçim önceliği LINE_PRIORITY sırasıyla */
/** site: SPEC 09 K7 sekme/pencere başlığı kategorisi (en spesifik) */
/** egg: SPEC 14 gizli dünya / canavar havuzları; öncelik listesinde yok, sadece pickExact ile */
export type Category = "site" | "app" | "time" | "idle" | "battery" | "interaction" | "answer" | "random" | "egg";

/** /v1/ask cevabı; answer içinde `[K]` olabilir (renderText işler) */
export interface AskResult {
  answer: string;
  source: "llm" | "pool";
}

/** /v1/lines yanıtı */
export interface LinesResponse {
  date: string | null;
  lines: Line[];
}

/** Günlük soru sayacının kalıcı durumu (tauri-plugin-store'a olduğu gibi yazılabilir). */
export interface QuestionState {
  /** yerel gün, "YYYY-MM-DD" */
  day: string;
  /** bugün sorulan soru */
  used: number;
  /** son LLM sorusundan beri sorulan soru (günler arası sürer) */
  sinceLlm: number;
  /** bir sonraki LLM sorusuna kadar aralık: 3 ya da 4 */
  gap: number;
}

/** Bir sorunun sonucu: sorulabilir mi, LLM'e mi gidecek, kaç hak kaldı. */
export interface AskDecision {
  allowed: boolean;
  useLlm: boolean;
  remaining: number;
}
