// Evrim (SPEC 17 R5, strateji §4, saf): davranışa göre dallanan formlar.
//                 DUNNO
//          +--------+--------+
//        CHAOS              CHILL
//      +---+---+         +---+---+
//   GREMLIN  DEMON     SLOTH   CLOUD          (gizli: GLITCHLING, evrim anında glitch dünyası açıksa)
// Level 10 ilk evrim, level 25 ikinci. Free: yol davranıştan otomatik. Pro: o aşamanın dallarından birini seçebilir (strateji §14).
// Görünüm: gizli kostüm `evo_<form>` (kostüm giyilmemişse); ton: persona etiketi (talker + LLM ipucu).
import type { RelationshipState } from "./relationship";
import type { Trait } from "./memory";

export const FORMS = ["dunno", "chaos", "chill", "gremlin", "demon", "sloth", "cloud", "glitchling"] as const;
export type Form = (typeof FORMS)[number];
/** gizli formlar (ağaçta açılana kadar hiç görünmez) */
export const SECRET_FORMS: readonly Form[] = ["glitchling"];

export const STAGE_LEVELS = [10, 25] as const;

/** her formun çocukları */
export const TREE: Readonly<Record<Form, readonly Form[]>> = {
  dunno: ["chaos", "chill"],
  chaos: ["gremlin", "demon"],
  chill: ["sloth", "cloud"],
  gremlin: [],
  demon: [],
  sloth: [],
  cloud: [],
  glitchling: [],
};

export interface EvolutionState {
  /** dunno -> ... (kök dahil) */
  path: Form[];
  /** Pro: kullanıcı yolu kendisi seçti */
  chosen: boolean;
}

export const initialEvolution = (): EvolutionState => ({ path: ["dunno"], chosen: false });
export const formOf = (e: EvolutionState): Form => e.path[e.path.length - 1];
export const stageOf = (e: EvolutionState): number => e.path.length - 1;

export function cleanEvolution(raw: unknown): EvolutionState {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const path = Array.isArray(r.path) ? r.path : [];
  // yol ağaçta geçerli olmalı (glitchling ikinci aşamada her dalın yerine geçebilir)
  const out: Form[] = ["dunno"];
  for (const f of path.slice(1, 3)) {
    const parent = out[out.length - 1];
    const ok = (FORMS as readonly unknown[]).includes(f) && (TREE[parent].includes(f as Form) || (f === "glitchling" && out.length === 2));
    if (!ok) break;
    out.push(f as Form);
  }
  return { path: out, chosen: r.chosen === true && out.length > 1 };
}

export interface EvoInputs {
  rel: Pick<RelationshipState, "chaos" | "curiosity" | "energy" | "trust" | "boredom">;
  traits: readonly Trait[];
  /** o an etkin gizli dünya (SPEC 14) */
  world: string;
}

/** Davranışa göre dal: kaos/kıpır mı, sakin mi; ikinci aşamada merak vs saf kaos, enerji vs güven. */
export function pickChild(parent: Form, x: EvoInputs): Form | null {
  const kids = TREE[parent];
  if (!kids.length) return null;
  if (parent === "dunno") {
    const t = (n: Trait) => (x.traits.includes(n) ? 15 : 0);
    const chaos = x.rel.chaos + t("spam_clicker") + t("serial_dragger") + t("power_user");
    const chill = (100 - x.rel.energy) * 0.5 + x.rel.trust * 0.5 + t("quiet_user") + t("night_owl");
    return chaos >= chill ? "chaos" : "chill";
  }
  if (x.world === "glitch") return "glitchling";
  if (parent === "chaos") return x.rel.curiosity >= x.rel.chaos ? "gremlin" : "demon";
  return x.rel.energy < 50 ? "sloth" : "cloud";
}

/** Level eşiğini geçince bir sonraki aşama (otomatik). Değişmezse null. */
export function evolve(e: EvolutionState, level: number, x: EvoInputs): EvolutionState | null {
  const stage = stageOf(e);
  if (stage >= STAGE_LEVELS.length || level < STAGE_LEVELS[stage]) return null;
  const next = pickChild(formOf(e), x);
  return next ? { path: [...e.path, next], chosen: false } : null;
}

/** Pro: mevcut aşamanın kardeş dalına geç (glitchling seçilemez, bulunur). Geçersizse null. */
export function choosePath(e: EvolutionState, form: Form): EvolutionState | null {
  if (e.path.length < 2 || SECRET_FORMS.includes(form)) return null;
  const parent = e.path[e.path.length - 2];
  if (!TREE[parent].includes(form)) return null;
  return { path: [...e.path.slice(0, -1), form], chosen: true };
}

/** Pro seçim seçenekleri: son formun kardeşleri (kendisi dahil). */
export function choices(e: EvolutionState): Form[] {
  if (e.path.length < 2) return [];
  const parent = e.path[e.path.length - 2];
  return [...TREE[parent]];
}

/** Persona (talker tonu + LLM ipucu): form ya da dalı */
export type Persona = Form;
export const personaOf = (e: EvolutionState): Persona => formOf(e);

/** Ağaç görünümü: açılmış formlar adıyla, açılmamışlar "???" (merak) */
export function treeView(e: EvolutionState): { form: Form; known: boolean; current: boolean; depth: number }[] {
  const out: { form: Form; known: boolean; current: boolean; depth: number }[] = [];
  const walk = (f: Form, depth: number) => {
    out.push({ form: f, known: e.path.includes(f), current: formOf(e) === f, depth });
    for (const k of TREE[f]) walk(k, depth + 1);
  };
  walk("dunno", 0);
  if (e.path.includes("glitchling")) out.push({ form: "glitchling", known: true, current: formOf(e) === "glitchling", depth: 2 });
  return out;
}
