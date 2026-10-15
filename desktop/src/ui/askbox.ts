// Soru kutusu: landing ask.exe penceresi. Enter gönderir; Esc, dışarı tıklama, kapat kontrolü ya da boş gönderim kapatır.
// Soru metni sadece çözülen değer ve pencerenin kendi satırı olarak durur; hiçbir yerde saklanmaz/loglanmaz.
import type { UiStrings } from "../i18n";
import type { Mode } from "../settings";
import { Bubble, type BubbleHost } from "./bubble";
import { waitSeconds } from "../talk/tempo";
import { askHtml, askWaitHtml, type AskLog } from "./surfaces";

/** bu uzunluğun üstündeki cevap geniş ask.exe'de (≤ ~120 karakter 2 satır) */
export const WIDE_AT = 56;

/** kilit ekranı en fazla bu kadar açık kalır (sonra pet'e tekrar tıklanır) */
export const WAIT_SHOW_MS = 6_000;

export const MAX_QUESTION = 200;

export class AskWindow {
  readonly bubble: Bubble;
  private log: AskLog[] = [];
  private wide = false;
  private cancelFn?: () => void;

  constructor(
    host: BubbleHost,
    private readonly t: UiStrings,
    private left: number,
    private readonly total: number,
    private mode: Mode,
    /** araç çubuğundaki polite | street *** (ayarla aynı kaynak) */
    private readonly onMode: (mode: Mode) => void,
    private readonly onClose?: () => void,
  ) {
    this.bubble = new Bubble(host);
    const handleClose = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(".ctl")) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
        this.cancelFn?.();
        this.onClose?.();
      }
    };
    this.bubble.el.addEventListener("click", handleClose, true);
    this.bubble.el.addEventListener("pointerdown", handleClose, true);
  }

  /** Soruyu bekler: metin ya da kapatıldıysa null. signal iptal edilirse null. */
  ask(signal?: AbortSignal): Promise<string | null> {
    this.render(true);
    const el = this.bubble.el;
    const form = el.querySelector("form")!;
    const input = el.querySelector<HTMLInputElement>("input")!;
    return new Promise((resolve) => {
      let done = false;
      const finish = (value: string | null) => {
        if (done) return;
        done = true;
        this.cancelFn = undefined;
        window.removeEventListener("blur", cancel);
        resolve(value);
      };
      const cancel = () => finish(null);
      this.cancelFn = cancel;
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = input.value.trim();
        input.value = "";
        finish(q === "" ? null : q);
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") cancel();
      });
      el.querySelector(".ctl")?.addEventListener("click", cancel);
      // mod seçici: yerinde güncellenir (yeniden çizim yazılan soruyu silmesin)
      el.querySelectorAll<HTMLButtonElement>(".seg").forEach((seg) =>
        seg.addEventListener("click", () => {
          this.mode = seg.dataset.value as Mode;
          el.querySelectorAll<HTMLButtonElement>(".seg").forEach((s) => {
            const on = s === seg;
            s.classList.toggle("seg-on", on);
            s.setAttribute("aria-pressed", String(on));
          });
          this.onMode(this.mode);
          input.focus();
        }),
      );
      window.addEventListener("blur", cancel);
      signal?.addEventListener("abort", cancel, { once: true });
      input.focus();
    });
  }

  /** Soru gönderildi: sohbet satırı + düşünme balonu, form kalkar. spend: bir hak eksilir (hak bittiyse false). */
  thinking(question: string, verb: string, spend = true): void {
    if (spend) this.left = Math.max(0, this.left - 1);
    this.log = [{ who: "you", text: question }, { who: "think", verb }];
    this.render(false);
  }

  /** Düşünme metni değişir ("çok düşünüyor", "neredeyse"...). */
  setVerb(verb: string): void {
    if (!this.log.some((m) => m.who === "think")) return;
    this.log = this.log.map((m) => (m.who === "think" ? { who: "think", verb } : m));
    this.render(false);
  }

  /** Uyuyakalma: düşünme balonu yerine dunno satırı (zzz…). */
  doze(text: string): void {
    this.log = [...this.log.filter((m) => m.who !== "think"), { who: "dunno", text }];
    this.render(false);
  }

  /** Cevabın altına ek dunno satırı (bugün beynim kapalı iması). */
  say(text: string): void {
    this.log = [...this.log, { who: "dunno", text }];
    this.render(false);
  }

  /** Uyandı, yeniden düşünüyor. */
  rethink(verb: string): void {
    this.log = [...this.log.filter((m) => m.who !== "think"), { who: "think", verb }];
    this.render(false);
  }

  /**
   * Tempo kilidi: kum saati + "biraz bekle" + geri sayım. waitMs dolunca, WAIT_SHOW_MS sonra ya da iptal edilince kapanır.
   */
  wait(waitMs: number, signal?: AbortSignal): Promise<void> {
    const end = Date.now() + waitMs;
    const draw = () => this.bubble.setHtml(askWaitHtml(this.t, this.left, this.total, waitSeconds(end - Date.now())));
    draw();
    return new Promise((resolve) => {
      const tick = setInterval(() => {
        const el = this.bubble.el.querySelector("[data-wait]");
        if (el) el.textContent = this.t.waitSeconds(waitSeconds(end - Date.now()));
      }, 1_000);
      const done = () => {
        clearInterval(tick);
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(done, Math.min(waitMs, WAIT_SHOW_MS));
      signal?.addEventListener("abort", done, { once: true });
    });
  }

  /** Cevap; left verilirse kalpler güncellenir (hak sadece charged cevapta düşer). Uzun cevapta pencere genişler. */
  answer(text: string, left?: number): void {
    if (left !== undefined) this.left = left;
    if (text.length > WIDE_AT) this.wide = true;
    this.log = [...this.log.filter((m) => m.who !== "think"), { who: "dunno", text }];
    this.render(false);
  }

  close(): void {
    this.log = [];
    this.bubble.close();
  }

  private render(form: boolean): void {
    this.bubble.setHtml(askHtml(this.t, this.mode, this.left, this.total, this.log, form, this.wide));
  }
}
