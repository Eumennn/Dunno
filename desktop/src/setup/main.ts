// FB9 kurulum programı arayüzü. Tauri dışında (tarayıcı önizlemesi) kurulum taklit edilir: ?step=welcome|installing|done|failed&lang=tr|en&existing=1
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import "@ui-kit/kit.css";
import "./setup.css";
import { invoke } from "@tauri-apps/api/core";
import sheetJson from "../../assets/dunno_sheet.json";
import sheetUrl from "../../assets/dunno_sheet.png";
import { Player } from "../player/player";
import { parseSheet } from "../player/sheet";
import { lineAt, petState, progressAt, type Step } from "./flow";
import { SETUP_STRINGS, setupLang } from "./strings";
import { mainHtml, shellHtml, type SetupView } from "./view";

interface SetupInfo {
  mode?: "install" | "uninstall";
  existing: boolean;
  version: string;
  ready: boolean;
}

const inTauri = "__TAURI_INTERNALS__" in window;
const q = new URLSearchParams(location.search);
const lang = q.get("lang") === "en" || q.get("lang") === "tr" ? (q.get("lang") as "tr" | "en") : setupLang(navigator.language);
const t = SETUP_STRINGS[lang];
document.documentElement.lang = lang;

const root = document.getElementById("setup")!;
root.innerHTML = shellHtml(t);
const main = root.querySelector<HTMLElement>(".su-main")!;
const canvas = root.querySelector<HTMLCanvasElement>(".su-pet")!;
const closeBtn = root.querySelector<HTMLButtonElement>(".ctl")!;

const view: SetupView = { step: "welcome", existing: false, ready: true, version: "0.1.0", pct: 0, line: "", launch: true, error: null };
let startedAt = 0;
let picked: string | null = null;
let finished = false;
let player: Player | null = null;

function render(): void {
  main.innerHTML = mainHtml(t, view);
  closeBtn.disabled = view.step === "installing";
  player?.setState(petState(view.step, view.mode));
  main.querySelector<HTMLButtonElement>(".pbtn")?.focus();
}

function tickInstall(): void {
  if (view.step !== "installing") return;
  const ms = performance.now() - startedAt;
  const pct = progressAt(ms, finished);
  const line = lineAt(ms, view.mode === "uninstall" ? t.uLines : t.lines, picked);
  if (pct !== view.pct || line !== view.line) {
    view.pct = pct;
    view.line = line;
    // sadece değişen parçalar (odak ve animasyon bozulmasın)
    const bar = main.querySelector(".su-bar");
    if (bar) {
      main.querySelectorAll(".su-cell").forEach((c, i) => c.classList.toggle("on", i < Math.round(pct / 5)));
      bar.setAttribute("aria-valuenow", String(pct));
      const head = main.querySelector(".su-progress-head span:last-child");
      if (head) head.textContent = `${pct}%`;
      const st = main.querySelector("[role=status]");
      if (st) st.textContent = line;
    }
  }
}

async function runInstall(dunno: boolean): Promise<void> {
  picked = dunno ? t.dunnoPicked : null;
  finished = false;
  startedAt = performance.now();
  view.step = "installing";
  view.pct = 0;
  view.line = lineAt(0, t.lines, picked);
  view.error = null;
  render();
  const minShow = new Promise((r) => setTimeout(r, 2600)); // çok hızlı bitse de bir an görünsün
  try {
    if (inTauri) await invoke("install");
    else await new Promise((r) => setTimeout(r, 4200));
    await minShow;
    finished = true;
    tickInstall();
    await new Promise((r) => setTimeout(r, 450));
    view.step = "done";
  } catch (e) {
    view.step = "failed";
    view.error = String(e).slice(0, 80);
  }
  render();
}

/** FB11 kaldırma: NSIS kaldırıcısı sessiz; ilerleme yine süreye göre. */
async function runUninstall(): Promise<void> {
  picked = null;
  finished = false;
  startedAt = performance.now();
  view.step = "installing";
  view.pct = 0;
  view.line = lineAt(0, t.uLines, null);
  view.error = null;
  render();
  const minShow = new Promise((r) => setTimeout(r, 2200));
  try {
    if (inTauri) await invoke("uninstall", { deleteData: view.deleteData === true });
    else await new Promise((r) => setTimeout(r, 3000));
    await minShow;
    finished = true;
    tickInstall();
    await new Promise((r) => setTimeout(r, 400));
    view.step = "done";
  } catch (e) {
    view.step = "failed";
    view.error = String(e).slice(0, 80);
  }
  render();
}

async function finish(): Promise<void> {
  if (view.launch && inTauri) {
    try {
      await invoke("launch");
    } catch (e) {
      // kurulum tamam ama açılmadı: kapanmadan söyle (bir daha [ bitir ] kapatır)
      if (!view.error) {
        view.error = String(e).slice(0, 80);
        view.launch = false;
        render();
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 400)); // explorer'ın başlatması için kısa pay
  }
  quit();
}

function quit(): void {
  if (inTauri) void invoke("quit");
  else window.close();
}

root.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!el) return;
  switch (el.dataset.action) {
    case "yes":
      void runInstall(false);
      break;
    case "dunno":
      void runInstall(true);
      break;
    case "retry":
      void runInstall(false);
      break;
    case "uninstall":
      void runUninstall();
      break;
    case "finish":
      void finish();
      break;
    case "quit":
      if (view.step !== "installing") quit();
      break;
  }
});
root.addEventListener("change", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.dataset.action === "launch") view.launch = el.checked;
  if (el.dataset.action === "data") view.deleteData = el.checked;
});
// kapatma kısayolu (kurulurken değil)
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && view.step !== "installing" && view.step !== "done") quit();
});

async function start(): Promise<void> {
  const info: SetupInfo = inTauri
    ? await invoke<SetupInfo>("setup_info").catch(() => ({ existing: false, version: "", ready: false }))
    : { mode: q.get("mode") === "uninstall" ? "uninstall" : "install", existing: q.get("existing") === "1", version: "0.1.0", ready: q.get("empty") !== "1" };
  Object.assign(view, info);
  if (view.mode === "uninstall") {
    document.title = t.uTitle;
    const bar = root.querySelector(".su-bar-top .px");
    if (bar) bar.textContent = t.uBarTitle;
  }
  const img = new Image();
  img.src = sheetUrl;
  await img.decode();
  player = new Player(canvas, parseSheet(sheetJson), img);
  const size = player.resize(5, window.devicePixelRatio || 1);
  canvas.style.width = `${size.w}px`;
  canvas.style.height = `${size.h}px`;
  const step = q.get("step") as Step | null;
  if (!inTauri && step && step !== "welcome") {
    view.step = step;
    if (step === "installing") {
      startedAt = performance.now() - Number(q.get("ms") ?? 3000);
      view.line = lineAt(Number(q.get("ms") ?? 3000), view.mode === "uninstall" ? t.uLines : t.lines, null);
      view.pct = progressAt(Number(q.get("ms") ?? 3000), false);
    }
    if (step === "failed") view.error = "installer exit 2";
    if (step === "done" && q.get("launchfail") === "1") view.error = "dunno.exe not found";
    if (q.get("launch") === "0") view.launch = false;
  }
  render();
  const loop = () => {
    player?.tick();
    tickInstall();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

void start();
