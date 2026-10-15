// Kişisel Dunno (SPEC 16, saf). Pro + açık rıza, varsayılan KAPALI, sadece cihazda (store), ağa/LLM'e/telemetriye gitmez.
// Profil sadece kullanıcının BİLEREK yazdıklarından ve cihazdaki uygulama kategorilerinden oluşur:
// - soru metni ve sohbet içerikleri saklanmaz (CLAUDE.md gizlilik kuralı; Plan v2'deki "konuşmalar" maddesi bu yüzden uygulanmadı)
// - pencere başlığı / sekme adı hiç girmez (Rust kategoriye çevirir; burada sadece "app:excel" gibi etiketler)
// - sır/şifre/token/e-posta/link/uzun sayı ve yasak konu (sağlık, din, siyaset, ...) içeren girdi reddedilir
// Kullanıcı profili görür, düzenler, tek tuşla siler; kapatınca da silinir.

import { renderText } from "../lines/engine";

export const SLIDERS = ["calm_chaotic", "sweet_teasing", "polite_roast", "quiet_chatty", "robotic_absurd"] as const;
export type SliderId = (typeof SLIDERS)[number];
/** kaydırıcı 0..4, orta 2 */
export const SLIDER_MAX = 4;

export const LISTS = ["inside_jokes", "recurring_topics", "common_workflows", "explicit_preferences"] as const;
export type ListId = (typeof LISTS)[number];

export const NAME_MAX = 16;
export const ITEM_MAX = 40;
export const LIST_MAX = 8;

export interface Profile {
  preferred_name: string;
  inside_jokes: string[];
  recurring_topics: string[];
  common_workflows: string[];
  explicit_preferences: string[];
  sliders: Record<SliderId, number>;
}

export interface PersonalState {
  on: boolean;
  /** açık rıza zamanı (ISO); kapalıyken null */
  consentAt: string | null;
  profile: Profile;
}

export const emptyProfile = (): Profile => ({
  preferred_name: "",
  inside_jokes: [],
  recurring_topics: [],
  common_workflows: [],
  explicit_preferences: [],
  sliders: { calm_chaotic: 2, sweet_teasing: 2, polite_roast: 2, quiet_chatty: 2, robotic_absurd: 2 },
});
export const initialPersonal = (): PersonalState => ({ on: false, consentAt: null, profile: emptyProfile() });

/** uygulama etiketinin laftaki adı (cihazda; başlık değil) */
export const APP_NAMES: Record<"tr" | "en", Record<string, string>> = {
  tr: { browser: "tarayıcı", file_explorer: "dosya gezgini", settings: "ayarlar", game: "oyun", study: "ders notları", mail: "e-posta", ide: "ide" },
  en: { browser: "the browser", file_explorer: "file explorer", settings: "settings", game: "games", study: "study notes", mail: "email", ide: "the ide" },
};
export const appName = (lang: "tr" | "en", tag: string | null): string | null => (tag ? (APP_NAMES[lang][tag] ?? tag.replace(/_/g, " ")) : null);

// ---------------------------------------------------------------- girdi süzgeci

/** sır / kimlik bilgisi belirtileri: e-posta, link, uzun sayı (kart/telefon/TC), token biçimleri, şifre kelimeleri */
const SECRET: readonly RegExp[] = [
  /[^\s@]+@[^\s@]+\.[^\s@]+/, // e-posta
  /(https?:\/\/|www\.|\.(com|net|org|io|dev|app)\b)/i, // link
  /\d[\d\s-]{6,}\d/, // 8+ haneli sayı dizisi
  /\b(sk|pk|ghp|gho|xox[abp]|AKIA|AIza)[-_A-Za-z0-9]{8,}/, // bilinen token önekleri
  /\b[A-Za-z0-9+/_-]{24,}\b/, // uzun rastgele dizi (anahtar, hash)
  // \b Türkçe harfte çalışmaz (ş): kök eşleşmesi
  /(şifre|sifre|parola|password|passwd|\bpin\b|iban|token|api ?key|secret)/i,
];

export type Reject = "secret" | "sensitive" | "too_long" | "empty";

/**
 * Tek girdi: kırpar, küçük harfe çevirir, reddeder. sensitive: yasak konu denetimi (talk/classify isForbidden; dışarıdan verilir,
 * böylece bu modül saf kalır).
 */
export function cleanEntry(raw: unknown, max: number, sensitive: (t: string) => boolean): { value: string } | { reject: Reject } {
  if (typeof raw !== "string") return { reject: "empty" };
  const plain = raw.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  // Türkçe küçük harf "I"yı "ı" yapar: sır denetimi ham metinde de (token/anahtar biçimi bozulmasın)
  const v = plain.toLocaleLowerCase("tr");
  if (!v) return { reject: "empty" };
  if (Array.from(v).length > max) return { reject: "too_long" };
  if (SECRET.some((r) => r.test(plain) || r.test(v))) return { reject: "secret" };
  if (sensitive(v)) return { reject: "sensitive" };
  return { value: v };
}

export interface ProfileInput {
  preferred_name?: unknown;
  sliders?: unknown;
  inside_jokes?: unknown;
  recurring_topics?: unknown;
  common_workflows?: unknown;
  explicit_preferences?: unknown;
}

/** Form / store girdisinden profil + reddedilenler (alan -> neden). Reddedilen girdi profile hiç girmez. */
export function sanitizeProfile(raw: ProfileInput | unknown, sensitive: (t: string) => boolean): { profile: Profile; rejected: Partial<Record<string, Reject>> } {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as ProfileInput;
  const p = emptyProfile();
  const rejected: Partial<Record<string, Reject>> = {};
  if (typeof r.preferred_name === "string" && r.preferred_name.trim()) {
    const c = cleanEntry(r.preferred_name, NAME_MAX, sensitive);
    if ("value" in c) p.preferred_name = c.value;
    else rejected.preferred_name = c.reject;
  }
  for (const id of LISTS) {
    const v = r[id];
    const items = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
    for (const [i, item] of items.slice(0, LIST_MAX).entries()) {
      if (typeof item === "string" && !item.trim()) continue;
      const c = cleanEntry(item, ITEM_MAX, sensitive);
      if ("value" in c) {
        if (!p[id].includes(c.value)) p[id].push(c.value);
      } else rejected[`${id}.${i}`] = c.reject;
    }
  }
  const s = (typeof r.sliders === "object" && r.sliders !== null ? r.sliders : {}) as Record<string, unknown>;
  for (const id of SLIDERS) {
    const n = s[id];
    if (typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= SLIDER_MAX) p.sliders[id] = n;
  }
  return { profile: p, rejected };
}

/** Store'dan gelen durum: bozuksa kapalı + boş; rıza zamanı yoksa kapalı. */
export function cleanPersonal(raw: unknown, sensitive: (t: string) => boolean): PersonalState {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<Record<keyof PersonalState, unknown>>;
  const consentAt = typeof r.consentAt === "string" && !Number.isNaN(Date.parse(r.consentAt)) ? r.consentAt : null;
  if (r.on !== true || !consentAt) return initialPersonal();
  return { on: true, consentAt, profile: sanitizeProfile(r.profile, sensitive).profile };
}

/** Açık rıza ile aç (Pro gerekli; çağıran denetler). */
export const consent = (now: Date): PersonalState => ({ on: true, consentAt: now.toISOString(), profile: emptyProfile() });
/** Kapat = sil: profil hiç kalmaz. */
export const forget = (): PersonalState => initialPersonal();

// ---------------------------------------------------------------- davranış

/** kaydırıcı -> 0..1 */
const unit = (p: Profile, id: SliderId) => p.sliders[id] / SLIDER_MAX;

/** Konuşma sıklığı / dinlenme çarpanı (kişilik ön ayarının yerine; mod davranış sınırında 0.5..2). */
export function sliderBehavior(p: Profile): { chattiness: number; restScale: number } {
  const chat = 0.6 + unit(p, "quiet_chatty") * 1.0; // 0.6 .. 1.6
  const rest = 1.6 - unit(p, "calm_chaotic") * 1.05; // 1.6 .. 0.55
  return { chattiness: Math.round(chat * 100) / 100, restScale: Math.round(rest * 100) / 100 };
}

/** Kişisel lafların kendiliğinden laflardaki payı (sıklıktan bağımsız; profil boşsa 0). */
export const PERSONAL_SHARE = 0.25;

export interface Template {
  id: string;
  /** {name} {app} {joke} {topic} {workflow} {pref} yer tutucuları; {K:...} street kuyruğu */
  tr?: string;
  en?: string;
  /** ton etiketleri: kaydırıcılara göre ağırlık */
  tags?: ("sweet" | "tease" | "roast" | "absurd" | "robotic")[];
}

const SLOTS: Record<string, (p: Profile, app: string | null) => string[]> = {
  name: (p) => (p.preferred_name ? [p.preferred_name] : []),
  app: (_p, app) => (app ? [app] : []),
  joke: (p) => p.inside_jokes,
  topic: (p) => p.recurring_topics,
  workflow: (p) => p.common_workflows,
  pref: (p) => p.explicit_preferences,
};
const PLACE = /\{(name|app|joke|topic|workflow|pref)\}/g;

/** Şablonun yer tutucuları dolabilir mi. */
export function fillable(tpl: string, p: Profile, app: string | null): boolean {
  return [...tpl.matchAll(PLACE)].every((m) => SLOTS[m[1]](p, app).length > 0);
}

/** Ağırlık: tonu kaydırıcıyla eşleşen şablon daha sık (0.25 .. 1.75). */
export function weightOf(t: Template, p: Profile): number {
  let w = 1;
  for (const tag of t.tags ?? []) {
    if (tag === "sweet") w *= 1.75 - unit(p, "sweet_teasing") * 1.5;
    if (tag === "tease") w *= 0.25 + unit(p, "sweet_teasing") * 1.5;
    if (tag === "roast") w *= 0.25 + unit(p, "polite_roast") * 1.5;
    if (tag === "absurd") w *= 0.25 + unit(p, "robotic_absurd") * 1.5;
    if (tag === "robotic") w *= 1.75 - unit(p, "robotic_absurd") * 1.5;
  }
  return w;
}

/**
 * Kişisel laf seç + doldur (render öncesi metin; {K:} kalır, talker renderText ile işler). app: şu anki uygulama etiketinin
 * görünen adı ("excel"). Dolabilen şablon yoksa null.
 */
export function personalLine(templates: readonly Template[], lang: "tr" | "en", p: Profile, app: string | null, rng: () => number): { id: string; text: string } | null {
  // birkaç deneme: uzun bir şaka/konu dolunca 60 karakteri aşan sonuç atılır (marka kuralı)
  for (let i = 0; i < 6; i++) {
    const r = pickFill(templates, lang, p, app, rng);
    if (!r) return null;
    if (Math.max(...(["polite", "street"] as const).map((m) => Array.from(renderText(r.text, m)).length)) <= MAX_CHARS) return r;
  }
  return null;
}

/** marka: cevap ≤ ~60 karakter */
export const MAX_CHARS = 60;

function pickFill(templates: readonly Template[], lang: "tr" | "en", p: Profile, app: string | null, rng: () => number): { id: string; text: string } | null {
  const ok = templates.filter((t) => t[lang] && fillable(t[lang]!, p, app));
  if (!ok.length) return null;
  const weights = ok.map((t) => weightOf(t, p));
  let x = rng() * weights.reduce((a, b) => a + b, 0);
  let pick = ok[ok.length - 1];
  for (let i = 0; i < ok.length; i++) {
    x -= weights[i];
    if (x < 0) {
      pick = ok[i];
      break;
    }
  }
  const text = pick[lang]!.replace(PLACE, (_m, k: string) => {
    const opts = SLOTS[k](p, app);
    return opts[Math.floor(rng() * opts.length) % opts.length];
  });
  return { id: pick.id, text };
}
