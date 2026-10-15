// Daktilo yazıcı (SPEC 10 CL3): balon metnini harf harf açar. Zamanlama talk/typewriter.ts (saf).
// Balon boyu baştan tam metne göre: görünmeyen kısım yerinde ama gizli (visibility), yani balon akarken zıplamaz.
// Erişilebilirlik: tam metin bir kez ekran okuyucu için (sr-only), akan kopya aria-hidden. Tıklayınca anında tamamlanır.
import { shownAt, typeMs, typeSchedule } from "../talk/typewriter";

/** Akışı gösteren hedef (DOM'suz test için arayüz). */
export interface TypeTarget {
  /** ilk n karakter görünür */
  show(n: number): void;
  /** hedef hâlâ ekranda mı (balon kapandıysa akış biter) */
  alive(): boolean;
}

export interface Typing {
  /** akış bitti (tamamlandı, tıklandı ya da balon kapandı) */
  readonly done: Promise<void>;
  /** hemen tamamla */
  finish(): void;
}

const TICK_MS = 16;

/** Akışı başlatır. now/set/clear testte enjekte edilir. */
export function runTypewriter(
  text: string,
  target: TypeTarget,
  opts: { rng?: () => number; now?: () => number; every?: (fn: () => void, ms: number) => unknown; stop?: (h: unknown) => void } = {},
): Typing {
  const now = opts.now ?? (() => performance.now());
  const every = opts.every ?? ((fn, ms) => setInterval(fn, ms));
  const stop = opts.stop ?? ((h) => clearInterval(h as ReturnType<typeof setInterval>));
  const at = typeSchedule(text, opts.rng);
  const total = [...text].length;
  const start = now();
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  let shown = -1;
  let handle: unknown = null;
  const end = () => {
    if (handle !== null) stop(handle);
    handle = null;
    resolve();
  };
  const step = () => {
    if (!target.alive()) return end();
    const n = shownAt(at, now() - start);
    if (n !== shown) {
      shown = n;
      target.show(n);
    }
    if (n >= total) end();
  };
  if (total === 0 || typeMs(at) === 0) {
    target.show(total);
    resolve();
  } else {
    step();
    if (shown < total) handle = every(step, TICK_MS);
  }
  return {
    done,
    finish: () => {
      if (handle === null) return;
      if (target.alive()) target.show(total);
      end();
    },
  };
}

/**
 * DOM hedefi: el'in içindeki son metin düğümü (balon gövdesi / ask.exe dunno satırı) daktilo yapısına çevrilir.
 * Metin düğümü yoksa null (akış yok, metin olduğu gibi kalır).
 */
export function domTarget(el: Element, text: string): TypeTarget | null {
  const node = [...el.childNodes].reverse().find((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "");
  if (!node) return null;
  const lead = (node.textContent ?? "").slice(0, (node.textContent ?? "").length - (node.textContent ?? "").trimStart().length);
  const chars = [...text];
  const wrap = document.createElement("span");
  const sr = document.createElement("span");
  sr.className = "sr-only";
  sr.textContent = text;
  const shown = document.createElement("span");
  shown.setAttribute("aria-hidden", "true");
  const typed = document.createElement("span");
  const rest = document.createElement("span");
  rest.className = "tw-rest";
  shown.append(typed, rest);
  wrap.append(document.createTextNode(lead), sr, shown);
  node.replaceWith(wrap);
  return {
    show: (n) => {
      typed.textContent = chars.slice(0, n).join("");
      rest.textContent = chars.slice(n).join("");
    },
    alive: () => wrap.isConnected,
  };
}

/** Hareket azaltma tercihi: akış yok, metin hemen tam. */
export function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Balon elemanındaki metni akıtır; balona tıklama tamamlar. Hedef bulunamazsa ya da hareket azaltıldıysa hemen biter. */
export function typeInto(bubbleEl: HTMLElement, textEl: Element | null, text: string): Typing {
  const target = textEl && !reducedMotion() ? domTarget(textEl, text) : null;
  if (!target) return { done: Promise.resolve(), finish: () => {} };
  const typing = runTypewriter(text, target);
  const onClick = () => typing.finish();
  bubbleEl.addEventListener("click", onClick, { once: true });
  void typing.done.then(() => bubbleEl.removeEventListener("click", onClick));
  return typing;
}
