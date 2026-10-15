// dunno.exe önizlemesi (Tauri dışı, ?companion=<form>): örnek companion durumu. Sadece ui-shots ve geliştirme için.
import { finishedOnboard } from "./onboarding";
import { initialCompanion, type CompanionState } from "./companion";
import { FORMS, TREE, type Form } from "./evolution";
import { xpFor } from "./progression";

export function demoCompanion(form: string | null): CompanionState {
  const s = initialCompanion();
  const f: Form = (FORMS as readonly string[]).includes(form ?? "") ? (form as Form) : "chaos";
  const parent = (Object.keys(TREE) as Form[]).find((p) => TREE[p].includes(f));
  const path: Form[] = f === "dunno" ? ["dunno"] : f === "glitchling" ? ["dunno", "chaos", "glitchling"] : parent === "dunno" ? ["dunno", f] : ["dunno", parent!, f];
  const level = path.length === 3 ? 27 : path.length === 2 ? 14 : 6;
  const at = (d: number) => new Date(2026, 9, d, 21, 12).toISOString();
  return {
    ...s,
    progress: { xp: xpFor(level) + 40, level, day: "2026-10-09", earned: {} },
    evo: { path, chosen: false },
    // FB6 önizleme: "dunno" formunda ilk adımların yarısı yapılmış, diğerlerinde bitmiş
    onboard: f === "dunno" ? { done: ["ask", "drag"], hints: 1, lastHint: null, finished: false, rewarded: ["ask", "drag"] } : finishedOnboard(),
    rel: { ...s.rel, trust: 64, familiarity: 71, chaos: 82, curiosity: 55, boredom: 18, energy: 9, daysTogether: 43, interactions: 2381 },
    memory: {
      ...s.memory,
      days: { "2026-10-09": { clicks: 160, drags: 34, questions: 12, lines: 20, night: 40, minutes: 300 } },
      apps: { excel: 31, browser: 12 },
      memories: [
        { id: "first_hello", at: at(1) },
        { id: "first_question", at: at(1) },
        { id: "first_drag", at: at(2) },
        { id: "drag_day", at: at(3), n: 17 },
        { id: "secret_world", at: at(4), tag: "paper" },
        { id: "long_session", at: at(5), n: 4 },
        { id: "level", at: at(6), n: 10 },
        { id: "evolved", at: at(6), tag: path[1] ?? "dunno" },
        { id: "favorite_app", at: at(8), tag: "excel" },
      ],
    },
  };
}
