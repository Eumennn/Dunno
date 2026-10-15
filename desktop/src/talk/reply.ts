// Soru cevabı akışı (saf): hak -> honest istek ya da havuz -> fallback. Soru metni sadece ask'e gider, saklanmaz/loglanmaz.
// SPEC 06 Q3: hak varken her soru honest; hak SADECE charged:true ise düşer. 429 -> hak biter, havuzdan devam.
// Anahtar yok / hata / timeout -> tipine uygun havuz cevabı, hak düşmez, brainOff (talker günde bir kez ima eder).
// SPEC 06 Q4: hak bitince bir kez sulk, sonra soru tipine uygun havuz cevapları ("işe yaramaz" mod) devam eder.
// SPEC 06 Q3d: yasak konu her yolda DODGE (omuz silkme); honest'ta sunucuya hiç gitmez (hak düşmez, LLM maliyeti yok).
import type { Tone } from "../companion/events";
import type { AskOutcome, AskRequest } from "../api";
import type { LineEngine } from "../lines/engine";
import { renderText } from "../lines/engine";
import type { Lang, Mode } from "../lines/types";
import { answerType, CHAT_TYPES, DODGE, isForbidden, isPolitical, POLITICS_ANSWER, type QType } from "./classify";
import type { HonestQuota } from "./quota";
import type { DunnoMultilingualDialogueEngine } from "./dunno_tr_engine";

export type Reply =
  | { kind: "sulk"; text: string | null }
  | {
      kind: "answer";
      text: string;
      source: "llm" | "pool" | "local";
      /** doğru cevap (hak harcandı) */
      honest: boolean;
      /** honest denendi ama beyin kapalı (anahtar yok / hata / timeout) */
      brainOff: boolean;
      /** yasak konu: omuz silkme (pet shrug pozu) */
      dodge: boolean;
    };

export interface ReplyContext {
  quota: HonestQuota;
  engine: LineEngine;
  ask: (req: AskRequest) => Promise<AskOutcome>;
  lang: Lang;
  mode: Mode;
  deviceId: string;
  /** havuz da boşsa söylenecek son çare (i18n) */
  fallback: string;
  /** bugün hak bitimi sulk'u gösterildi mi; gösterildiyse hak yokken havuzdan cevap */
  sulked: boolean;
  /** SPEC 17 L1/L3: ton ve evrim formu ipucu (enum; sunucuya metin değil etiket gider) */
  tone?: Tone;
  persona?: string;
  /** SPEC 19: 12K replik derin NLU diyalog motoru (isteğe bağlı) */
  deepEngine?: DunnoMultilingualDialogueEngine;
}

export const LIMIT_TRIGGERS = ["interaction:limit_reached"];

export function limitReply(ctx: Pick<ReplyContext, "engine" | "lang" | "mode">): Reply {
  return { kind: "sulk", text: ctx.engine.sayExact(LIMIT_TRIGGERS, ctx.lang, ctx.mode) };
}

/** Soru tipine uygun havuz cevabı (answer:<tip> > generic > answer:* > random), o da yoksa fallback. Ters tiplerde karşıt havuz (K8). */
export function poolReply(
  ctx: Pick<ReplyContext, "engine" | "lang" | "mode" | "fallback"> & { deepEngine?: DunnoMultilingualDialogueEngine; question?: string },
  qtype: QType,
  brainOff = false
): Reply {
  if (ctx.deepEngine && ctx.question) {
    try {
      const res = ctx.deepEngine.reply(ctx.question, {
        locale: ctx.lang as any,
        mouthMode: ctx.mode,
      });
      if (!res.silent && res.response) {
        return { kind: "answer", text: res.response, source: "pool", honest: false, brainOff, dodge: false };
      }
    } catch {
      // derin havuz eşleşmezse standart havuzdan devam
    }
  }
  const pooled = ctx.engine.answer(ctx.lang, ctx.mode, answerType(qtype));
  if (pooled) return { kind: "answer", text: pooled, source: "pool", honest: false, brainOff, dodge: false };
  return { kind: "answer", text: ctx.fallback, source: "local", honest: false, brainOff, dodge: false };
}

/** Yasak konu cevabı: worker DODGE_ANSWER ile aynı metin. */
export function dodgeReply(lang: Lang): Reply {
  return { kind: "answer", text: DODGE[lang], source: "local", honest: false, brainOff: false, dodge: true };
}

/** üzgün tonda teselliye dönen sohbet tipleri (iltifat, selam gibi tipler kendi cevabını korur) */
const SAD_COMFORT: ReadonlySet<QType> = new Set<QType>(["bored", "tired", "confusion", "gibberish", "what_happened", "how_are_you"]);

/** LLM ipuçları: varsayılan değilse eklenir (nötr ton / dunno formu istek gövdesini değiştirmez) */
function hints(ctx: Pick<ReplyContext, "tone" | "persona">): { tone?: Exclude<Tone, "neutral">; persona?: string } {
  const out: { tone?: Exclude<Tone, "neutral">; persona?: string } = {};
  if (ctx.tone && ctx.tone !== "neutral") out.tone = ctx.tone;
  if (ctx.persona && ctx.persona !== "dunno") out.persona = ctx.persona;
  return out;
}

export async function reply(question: string, qtype: QType, ctx: ReplyContext): Promise<Reply> {
  // hak bitimi sulk'u önce (günde bir kez); sonra yasak konu her yolda omuz silkme, istek yok
  if (!ctx.quota.canAsk() && !ctx.sulked) return limitReply(ctx);
  // FB4-1: siyaset/seçim sorusu her zaman "ne diin la" (yasak konu: sunucuya gitmez, hak düşmez)
  if (isPolitical(question)) return { kind: "answer", text: POLITICS_ANSWER[ctx.lang], source: "local", honest: false, brainOff: false, dodge: true };
  if (isForbidden(question)) return dodgeReply(ctx.lang);

  // Derin NLU diyalog motoru (Dizi, film, oyun, anime, popüler kültür, mevsim, gün):
  if (ctx.deepEngine) {
    try {
      const deepRes = ctx.deepEngine.reply(question, {
        locale: ctx.lang as any,
        mouthMode: ctx.mode,
      });
      const isEntertainmentOrCulture =
        Boolean(deepRes.matchedEntertainmentPool) ||
        deepRes.detectedIntent.startsWith("season:") ||
        deepRes.detectedIntent.startsWith("holiday:") ||
        deepRes.detectedIntent.startsWith("topic:") ||
        deepRes.detectedIntent.startsWith("insult:");
      if (!deepRes.silent && deepRes.response && isEntertainmentOrCulture) {
        return { kind: "answer", text: deepRes.response, source: "pool", honest: false, brainOff: false, dodge: false };
      }
    } catch {
      // devam et
    }
  }

  // SPEC 17 L1: üzgün ton + sohbet/tanınmayan mesaj ("moralim bozuk"): yerelde yumuşak teselli, hak düşmez, istek yok
  if (ctx.tone === "sad" && (qtype === "other" || SAD_COMFORT.has(qtype))) return poolReply({ ...ctx, question }, "self_deprecation");
  // FB4-9: sohbet niyeti (selam, napıyon, malsın, iltifat, ...) her zaman Dunno havuzundan; hak düşmez, istek yok
  if (CHAT_TYPES.has(qtype)) return poolReply({ ...ctx, question }, qtype);
  if (!ctx.quota.canAsk()) return poolReply({ ...ctx, question }, qtype);
  const { lang, mode } = ctx;
  const out = await ctx.ask({ question, mode, lang, deviceId: ctx.deviceId, kind: "honest", qtype, ...hints(ctx) });
  if (out.kind === "limit") {
    ctx.quota.exhaust(); // sunucu sayacı dolu: bugünlük havuz
    return poolReply({ ...ctx, question }, qtype);
  }
  if (out.kind === "error") return poolReply({ ...ctx, question }, qtype, true);
  const r = out.result;
  if (r.charged) ctx.quota.charge();
  const text = renderText(r.answer, mode);
  // sunucu havuz cevabı verdiyse (anahtar yok / hata) beyin kapalı; kaçamak (yasak konu) llm + honest:false, ima yok
  const brainOff = r.source === "pool" && !r.charged;
  if (text === "") return poolReply({ ...ctx, question }, qtype, brainOff);
  return { kind: "answer", text, source: r.source, honest: r.honest && r.charged, brainOff, dodge: false };
}
