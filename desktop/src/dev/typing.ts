// Dev önizleme (SPEC 10 CL3): daktilo balon metni uygulamanın yazıcısıyla (ui/typewriter.ts). ?at=<ms>: akış o anda tıklanmış gibi
// donmaz, o ana kadar akar ve durur (headless ara kare); ?at yoksa akış sonuna kadar. ui-shots/typing-*.png.
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import "@ui-kit/kit.css";
import "../styles/pet.css";
import { STRINGS } from "../i18n";
import { askHtml, speechHtml } from "../ui/surfaces";
import { domTarget, runTypewriter } from "../ui/typewriter";

const params = new URLSearchParams(location.search);
const at = Number(params.get("at") ?? "NaN");
const SPEECH = "bilmem. belki salı, belki değil. sorma bence";
const ANSWER = "su 100 derecede kaynar. deniz seviyesinde. sen kaynamadan sor";
const root = document.querySelector<HTMLElement>("#typing")!;
root.style.cssText = "display:flex;gap:32px;align-items:flex-start;padding:24px;background:var(--paper);font-family:var(--font-body);color:var(--ink)";

const speech = document.createElement("div");
speech.innerHTML = speechHtml(SPEECH);
const ask = document.createElement("div");
ask.innerHTML = askHtml(STRINGS.tr, "polite", 2, 3, [{ who: "you", text: "su kaç derecede kaynar" }, { who: "dunno", text: ANSWER }], false, true);
root.append(speech, ask);

let t = 0;
const clock = () => t;
const ticks: (() => void)[] = [];
for (const [el, text] of [
  [speech.querySelector(".bubble-fill")!, SPEECH],
  [[...ask.querySelectorAll(".msg-dunno")].at(-1)!, ANSWER],
] as const) {
  const target = domTarget(el, text)!;
  runTypewriter(text, target, { rng: () => 0.5, now: clock, every: (fn) => ticks.push(fn), stop: () => {} });
}
// enjekte saat: ?at'e kadar (yoksa sonuna kadar) ilerlet
const end = Number.isFinite(at) ? at : 10_000;
for (t = 0; t <= end; t += 16) for (const f of ticks) f();
document.body.dataset.ready = "1";
