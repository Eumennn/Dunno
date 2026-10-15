// İlk açılış karşılaması (SPEC 10 CL4). Clicky'deki karşılama animasyonu fikri; kod taşınmadı.
// setup.exe'den sonra: dunno sağ kenardan bakar (peek), ekranın ortasına yay çizerek uçar, kısa bir laf eder,
// sonra seçtiği alt köşeye uçup uyur. Sadece ilk açılışta; about.txt "karşılamayı tekrar oynat" yeniden oynatır.
// Plan saf (welcomePlan), oynatıcı controller + balon arayüzüyle (testte sahte).
import type { Facing } from "../player/player";
import type { PetState } from "./state";

export interface WelcomeArea {
  /** kutu sol üstünün alabileceği en büyük x / y (çalışma alanı - kutu) */
  xMax: number;
  yMax: number;
  /** yol üstünde alt kenarın başı / sonu (s) */
  bottomStart: number;
  bottomEnd: number;
}

export interface WelcomePlan {
  peek: { x: number; y: number };
  center: { x: number; y: number };
  /** iniş köşesi (yol s) ve hangisi */
  corner: { s: number; side: "left" | "right" };
}

/** kenardan bakış, laf ve uyku süreleri (ms) */
export const WELCOME_PEEK_MS = 1_400;
export const WELCOME_SAY_MS = 3_500;
export const WELCOME_SLEEP_MS = 45_000;
/** FB4-4: iniş köşenin tam üstü değil, alt kenarda köşeden biraz içeride (köşe geçişinde zıplama olmasın) */
export const WELCOME_CORNER_INSET = 0.12;

export function welcomePlan(a: WelcomeArea, rng: () => number): WelcomePlan {
  const side = rng() < 0.5 ? "left" : "right";
  return {
    peek: { x: a.xMax, y: Math.round(a.yMax / 2) },
    center: { x: Math.round(a.xMax / 2), y: Math.round(a.yMax / 2) },
    corner: {
      s: Math.round(side === "left" ? a.bottomStart + (a.bottomEnd - a.bottomStart) * WELCOME_CORNER_INSET : a.bottomEnd - (a.bottomEnd - a.bottomStart) * WELCOME_CORNER_INSET),
      side,
    },
  };
}

export interface WelcomePet {
  pinAt(x: number, y: number, state: PetState, facing: Facing): void;
  flyToPoint(x: number, y: number, pose: PetState, facing?: Facing): Promise<void>;
  flyHomeAndSleep(s: number, sleepMs: number): Promise<void>;
  hold(reason: string, on: boolean): void;
}

/** Karşılamayı oynatır. say: balon (daktiloyla) ms boyunca. sleep: bekleme (testte sahte). */
export async function playWelcome(
  pet: WelcomePet,
  area: WelcomeArea,
  line: string,
  deps: {
    say: (text: string, ms: number) => Promise<void>;
    sleep: (ms: number) => Promise<void>;
    rng?: () => number;
    /** FB4-4: laf balonu açılırken kısa selam sesi (Dunno sesi, SPEC 11) */
    voice?: () => void;
  },
): Promise<WelcomePlan> {
  const plan = welcomePlan(area, deps.rng ?? Math.random);
  pet.hold("welcome", true);
  try {
    pet.pinAt(plan.peek.x, plan.peek.y, "peek", "right");
    await deps.sleep(WELCOME_PEEK_MS);
    await pet.flyToPoint(plan.center.x, plan.center.y, "talk", "right");
    deps.voice?.();
    await deps.say(line, WELCOME_SAY_MS);
    await pet.flyHomeAndSleep(plan.corner.s, WELCOME_SLEEP_MS);
  } finally {
    pet.hold("welcome", false);
  }
  return plan;
}
