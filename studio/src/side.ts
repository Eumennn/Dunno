// Sağ panel: S3 try.exe ("şu durumda ne der" + K7 sekme farkındalığı) ve S4 ask.exe (soru + dunnolama denemesi).
// Sprite ve balon masaüstünün kendi bileşenleri (Player, Bubble), değiştirilmeden import edilir.
import "@desktop/styles/pet.css";
import sheetJson from "@desktop-assets/dunno_sheet.json";
import sheetUrl from "@desktop-assets/dunno_sheet.png?url";
import { LineEngine, mergeLines, renderText } from "@desktop/lines/engine";
import { APP_TAGS, MEETING_APPS } from "@desktop/lines/pool-check";
import { Player, type Facing } from "@desktop/player/player";
import { parseSheet } from "@desktop/player/sheet";
import { Bubble, type BubbleHost } from "@desktop/ui/bubble";
import { speechHtml } from "@desktop/ui/surfaces";
import { HitRegions } from "@desktop/ui/hit";
import { dunnoHtml, esc, segmentedHtml, thinkingHtml, youHtml } from "@ui-kit/kit";
import type { Entry, Lang } from "./model";
import { dressInto, loadWardrobe, themeLabel, type Outfit, type WardrobeOptions } from "./outfit";
import { answerType, classify } from "@desktop/talk/classify";
import deepPoolsData from "./dunno_tr_pools.json";
import sitesEntertainment from "./sites_entertainment.json";
import { DunnoMultilingualDialogueEngine } from "./dunno_tr_engine";
import {
  SITE_TAGS,
  askNote,
  dunnolaPreview,
  qtypeLive,
  qtypeNote,
  tryContext,
  type AskSource,
  type IdleMinutes,
  type TryInput,
} from "./try";

export interface Side {
  /** havuz değişince (kayıttan sonra) yeniden hesapla */
  refresh(): void;
}

const INTERACTIONS = ["click", "spam_click", "drag", "limit_reached", "fart"];

function option(value: string, label: string, selected: boolean): string {
  return `<option value="${esc(value)}"${selected ? " selected" : ""}>${esc(label)}</option>`;
}

/** WR4s: kıyafet, poz ve yön (sprite önizlemesi; laf motorunu etkilemez). */
interface Look {
  outfit: Outfit;
  /** "": lafın durumu (talk/shh) */
  pose: string;
  facing: Facing;
}

function outfitHtml(look: Look, options: WardrobeOptions | null, poses: string[]): string {
  if (!options) return "";
  const themes = options.themes.map((t) => option(t.id, themeLabel(t), look.outfit.theme === t.id)).join("");
  const accs = [option("", "(yok)", look.outfit.accessory === null), ...options.accessories.map(({ acc }) => option(acc.id, acc.name.tr, look.outfit.accessory === acc.id))].join("");
  const pose = [option("", "(laf)", look.pose === ""), ...poses.map((p) => option(p, p, look.pose === p))].join("");
  const errs = options.errors.length ? `<p class="note">içerik hatası: ${options.errors.map(esc).join(" · ")}</p>` : "";
  return `<div class="try-controls" data-role="outfit">
  <label>tema <select class="field" name="theme">${themes}</select></label>
  <label>aksesuar <select class="field" name="accessory">${accs}</select></label>
  <label>poz <select class="field" name="pose">${pose}</select></label>
  <div class="try-segs"><div data-role="side-facing">${segmentedHtml("yön", [{ value: "right", label: "sağ" }, { value: "left", label: "sol" }], look.facing)}</div></div>
</div>${errs}`;
}

function controlsHtml(input: TryInput): string {
  const sites = [
    option("", "(yok)", !input.site),
    ...SITE_TAGS.map((s) => option(s, `site:${s}`, input.site === s)),
  ].join("");
  const apps = [
    option("", "(yok)", input.app === null),
    ...APP_TAGS.map((a) => option(a, a, input.app === a)),
    ...MEETING_APPS.map((a) => option(a, `${a} (toplantı)`, input.app === a)),
  ].join("");
  const hours = Array.from({ length: 24 }, (_, i) => option(String(i), `${String(i).padStart(2, "0")}:00`, input.hour === i)).join("");
  const idles = [0, 10, 30, 60].map((m) => option(String(m), m ? `${m} dk` : "yok", input.idle === m)).join("");
  const inter = [option("", "(yok)", input.interaction === null), ...INTERACTIONS.map((i) => option(i, i, input.interaction === i))].join("");
  return `<div class="try-controls">
  <label>sekme (K7) <select class="field" name="site">${sites}</select></label>
  <label>başlık <input class="field" name="windowTitle" value="${esc(input.windowTitle ?? "")}" placeholder="ör: youtube / github" autocomplete="off" /></label>
  <label>öndeki uygulama <select class="field" name="app">${apps}</select></label>
  <label>saat <select class="field" name="hour">${hours}</select></label>
  <label>boşta <select class="field" name="idle">${idles}</select></label>
  <label>etkileşim <select class="field" name="interaction">${inter}</select></label>
  <label class="check"><input type="checkbox" name="battery"${input.batteryLow ? " checked" : ""} /> pil düşük</label>
  <div class="try-segs">
    <div data-role="side-mode">${segmentedHtml("ağız modu", [{ value: "polite", label: "polite" }, { value: "street", label: "street ***" }], input.mode)}</div>
    <div data-role="side-lang">${segmentedHtml("dil", [{ value: "tr", label: "tr" }, { value: "en", label: "en" }, { value: "es", label: "es" }], input.lang)}</div>
  </div>
  <button type="button" class="pbtn pbtn-sm" data-side-action="draw">yeniden çek</button>
</div>`;
}

export function mountSide(el: HTMLElement, getPool: () => Record<Lang, Entry[]>): Side {
  const input: TryInput = {
    app: "excel",
    site: null,
    windowTitle: "",
    hour: 3,
    idle: 0,
    batteryLow: false,
    interaction: null,
    mode: "street",
    lang: "tr",
  };
  const deepEngine = new DunnoMultilingualDialogueEngine(deepPoolsData as any, sitesEntertainment as any);
  let lines: unknown[] = [];
  const chat: string[] = [];

  el.innerHTML = `<section class="win" aria-label="try.exe">
  <div class="bar bar-idle"><span>try.exe</span></div>
  <div class="win-body">
    <div data-role="try-controls"></div>
    <div data-role="try-outfit"></div>
    <div class="stage" data-role="stage"><canvas class="pet" data-role="pet"></canvas></div>
    <div data-role="try-result" class="try-result"></div>
  </div>
</section>
<section class="win" aria-label="ask.exe">
  <div class="bar"><span>ask.exe</span></div>
  <div class="win-body">
    <div class="chat" data-role="chat" aria-live="polite"></div>
    <form class="ask-form" data-role="ask-form">
      <input class="field" name="q" maxlength="200" autocomplete="off" placeholder="soru veya seçili metin yaz" aria-label="soru" />
      <button type="submit" class="pbtn pbtn-sm">havuz</button>
      <button type="button" class="pbtn pbtn-sm" data-side-action="dunnola">dunnola</button>
      <button type="button" class="pbtn pbtn-sm pbtn-blue" data-side-action="llm">llm</button>
    </form>
    <p class="note mono" data-role="ask-type">tip: -</p>
    <p class="note" data-role="ask-note">önce havuz cevabı; "dunnola" seçili metni özetler; "llm" yerel worker'ın /v1/ask'ine sorar.</p>
  </div>
</section>`;

  const q = <T extends HTMLElement>(role: string) => el.querySelector<T>(`[data-role="${role}"]`)!;
  const stage = q<HTMLElement>("stage");
  const canvas = q<HTMLCanvasElement>("pet");

  // masaüstünün sprite oynatıcısı ve balonu
  let player: Player | null = null;
  const host: BubbleHost = {
    stage,
    hit: new HitRegions(canvas, () => {}),
    petBox: () => ({ x: canvas.offsetLeft, y: canvas.offsetTop, w: canvas.offsetWidth, h: canvas.offsetHeight }),
    visibleX: () => [0, stage.clientWidth],
  };
  let bubble: Bubble | null = null;
  const sheet = parseSheet(sheetJson);
  const look: Look = { outfit: { theme: "classic", accessory: null }, pose: "", facing: "right" };
  let wardrobe: WardrobeOptions | null = null;
  const dressed = document.createElement("canvas");
  let lastState = "idle";
  const img = new Image();
  img.onload = async () => {
    wardrobe = loadWardrobe(sheetJson, sheet);
    await dressInto(dressed, img, sheet, wardrobe, look.outfit);
    player = new Player(canvas, sheet, dressed);
    renderOutfit();
    const size = player.resize(2, window.devicePixelRatio || 1);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    player.setState("idle");
    const frame = () => {
      player?.tick();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    draw();
  };
  img.src = sheetUrl;

  function renderOutfit(): void {
    q("try-outfit").innerHTML = outfitHtml(look, wardrobe, [...sheet.tags.keys()]);
  }

  function play(state: string): void {
    lastState = state;
    player?.setFacing(look.facing);
    try {
      player?.setState(look.pose || state, { restart: true });
    } catch {
      player?.setState("idle");
    }
  }

  async function redress(): Promise<void> {
    if (!wardrobe || !player) return;
    await dressInto(dressed, img, sheet, wardrobe, look.outfit);
    player.resize(2, window.devicePixelRatio || 1); // önbelleği sıfırlar, yeni sheet çizilir
  }

  function say(text: string | null, state: string): void {
    bubble?.close();
    bubble = null;
    if (text) {
      bubble = new Bubble(host);
      bubble.setHtml(speechHtml(text));
    }
    play(state);
  }

  function draw(): void {
    q("try-controls").innerHTML = controlsHtml(input);
    const r = tryContext(input, lines);
    const suppressed = r.meeting || Boolean(r.silentSite);
    const head = r.meeting
      ? `<p><b>toplantı önde:</b> dunno susar (shh), laf yok.</p>`
      : r.silentSite
      ? `<p><b>hassas sekme (adult/kumar):</b> dunno susar (shh), laf yok.</p>`
      : `<p><b>kazanan:</b> <span class="mono">${esc(r.winner ?? "-")}</span></p>`;
    const cands = r.candidates.map((c) => `<li><span class="mono">${esc(c.id)}</span> ${esc(c.text)}</li>`).join("");
    const draws = r.draws.map((d) => `<li>${esc(d)}</li>`).join("");
    q("try-result").innerHTML = `<p><b>aktif:</b> ${r.active.map((t) => `<span class="mono">${esc(t)}</span>`).join(" · ")}</p>
${head}
${suppressed ? "" : `<details open><summary>adaylar (${r.candidates.length})</summary><ul class="cands">${cands}</ul></details>
<details open><summary>10 çekiliş</summary><ol class="draws">${draws}</ol></details>`}`;
    say(r.draws[0] ?? null, suppressed ? "shh" : input.interaction === "fart" ? "fart" : "talk");
  }

  function renderChat(note?: string): void {
    q("chat").innerHTML = chat.join("");
    if (note !== undefined) q("ask-note").textContent = note;
    const c = q("chat");
    c.scrollTop = c.scrollHeight;
  }

  async function askLlm(question: string): Promise<void> {
    chat.push(youHtml(question), thinkingHtml());
    renderChat();
    let source: AskSource = "error";
    let answer: string | null = null;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, mode: input.mode, lang: input.lang }),
      });
      const body = (await res.json()) as { answer: string | null; source: AskSource };
      source = body.source;
      answer = body.answer;
    } catch {
      source = "offline";
    }
    chat.pop();
    const text = answer ? renderText(answer, input.mode) : "";
    chat.push(dunnoHtml(text || "(cevap yok)"));
    renderChat(askNote(source));
    say(text || null, text ? "talk" : "shrug");
  }

  el.addEventListener("change", (ev) => {
    const t = ev.target as HTMLInputElement | HTMLSelectElement;
    if (t.closest('[data-role="outfit"]')) {
      if (t.name === "theme") look.outfit.theme = t.value;
      if (t.name === "accessory") look.outfit.accessory = t.value || null;
      if (t.name === "pose") {
        look.pose = t.value;
        play(lastState);
      } else void redress();
      return;
    }
    if (!t.closest('[data-role="try-controls"]')) return;
    if (t.name === "site") input.site = t.value || null;
    if (t.name === "windowTitle") input.windowTitle = t.value;
    if (t.name === "app") input.app = t.value || null;
    if (t.name === "hour") input.hour = Number(t.value);
    if (t.name === "idle") input.idle = Number(t.value) as IdleMinutes;
    if (t.name === "interaction") input.interaction = t.value || null;
    if (t.name === "battery") input.batteryLow = (t as HTMLInputElement).checked;
    draw();
  });

  el.addEventListener("click", (ev) => {
    const t = ev.target as HTMLElement;
    const seg = t.closest<HTMLElement>(".seg");
    if (seg?.closest('[data-role="side-mode"]')) {
      input.mode = seg.dataset.value === "street" ? "street" : "polite";
      draw();
      return;
    }
    if (seg?.closest('[data-role="side-facing"]')) {
      look.facing = seg.dataset.value === "left" ? "left" : "right";
      player?.setFacing(look.facing);
      renderOutfit();
      return;
    }
    if (seg?.closest('[data-role="side-lang"]')) {
      input.lang = seg.dataset.value === "es" ? "es" : (seg.dataset.value === "en" ? "en" : "tr");
      draw();
      return;
    }
    const action = t.closest<HTMLElement>("[data-side-action]")?.dataset.sideAction;
    if (action === "draw") draw();
    if (action === "dunnola") {
      const field = el.querySelector<HTMLInputElement>('[data-role="ask-form"] input[name="q"]')!;
      const sel = field.value.trim();
      const deepSel = deepEngine.dunnolaSelectedText(sel, true, {
        locale: input.lang as any,
        mouthMode: input.mode,
      });
      if (deepSel && !deepSel.silent && deepSel.response) {
        chat.push(youHtml(sel), dunnoHtml(`${deepSel.response} — ${deepSel.lazyRewrite}`));
        q("ask-type").textContent = `tip: ${deepSel.poolKey} (${deepSel.wordCount} kelime) [Dunnolama 12K]`;
        renderChat(`dunnolama önizlemesi (${input.lang.toUpperCase()}, 10 katmanlı yapısal NLU).`);
        say(deepSel.response, "talk");
      } else {
        const preview = dunnolaPreview(sel, input.mode, input.lang);
        if (preview) {
          chat.push(youHtml(sel), dunnoHtml(`${preview.response} — ${preview.lazyRewrite}`));
          q("ask-type").textContent = `tip: ${preview.category} (${preview.wordCount} kelime)`;
          renderChat("dunnolama önizlemesi (yerel yapısal analiz, ağa gitmedi).");
          say(preview.response, "talk");
        }
      }
    }
    if (action === "llm") {
      const field = el.querySelector<HTMLInputElement>('[data-role="ask-form"] input[name="q"]')!;
      const question = field.value.trim();
      if (question) void askLlm(question);
    }
  });

  // yazarken canlı tip (soru hiçbir yere gönderilmez)
  el.addEventListener("input", (ev) => {
    const t = ev.target as HTMLInputElement;
    if (t.name !== "q" || !t.closest('[data-role="ask-form"]')) return;
    const live = classify(t.value);
    q("ask-type").textContent = t.value.trim() ? qtypeLive(live, answerType(live)) : "tip: -";
  });

  el.addEventListener("submit", (ev) => {
    const form = (ev.target as HTMLElement).closest<HTMLFormElement>('[data-role="ask-form"]');
    if (!form) return;
    ev.preventDefault();
    const question = String(new FormData(form).get("q") ?? "").trim();
    if (!question) return;

    // 10 katmanlı derin NLU motoru (12K replik: TR, EN, ES)
    const deepRes = deepEngine.reply(question, {
      locale: input.lang as any,
      mouthMode: input.mode,
      windowTitle: input.windowTitle || undefined,
      activeProcessName: input.app || undefined,
    });

    let answer: string | null = null;
    if (!deepRes.silent && deepRes.response) {
      answer = deepRes.response;
      q("ask-type").textContent = `tip: ${deepRes.detectedIntent} (${deepRes.effectivePoolKey}) [derin havuz 12K]`;
    } else {
      const qtype = classify(question);
      const engine = new LineEngine({ lines });
      const atype = answerType(qtype); // K8: ters tiplerde karşıt havuz
      answer = engine.answer(input.lang, input.mode, atype);
      q("ask-type").textContent = qtypeNote(qtype, engine.hasTrigger(`answer:${atype}`, input.lang), atype);
    }

    chat.push(youHtml(question), dunnoHtml(answer ?? "(havuz boş)"));
    renderChat(`havuz cevabı (${input.lang.toUpperCase()}, yerel, worker'a gitmedi). llm'i denemek için "llm".`);
    say(answer, "talk");
  });

  return {
    refresh() {
      const pool = getPool();
      lines = mergeLines(pool.tr, pool.en, pool.es ?? []);
      draw();
    },
  };
}
