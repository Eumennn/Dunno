// Studio sayfasının kendi ekran görüntüleri (headless Edge + CDP). Gerçek ekrana, fareye, klavyeye dokunmaz;
// tarayıcı görünmez, ayrı geçici profil kullanır ve sonunda kapanır. Kaydet'e basılmaz, dosya yazılmaz.
// Kullanım: studio açıkken (npm run studio)  node scripts/shots.mjs [çıktı dizini]
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const STUDIO = "http://127.0.0.1:5180/";
const PORT = 9341;
const OUT = resolve(process.argv[2] ?? join(import.meta.dirname, "..", "..", "orchestrator", "notes", "ui-shots"));
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "dunno-shots-"));
const browser = spawn(EDGE, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  "--no-first-run",
  "--disable-gpu",
  "--hide-scrollbars",
  "--window-size=1440,1000",
  "about:blank",
]);

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page;
    } catch {
      // henüz açılmadı
    }
    await sleep(200);
  }
  throw new Error("headless edge did not start");
}

let ws;
try {
  const page = await target();
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const waiting = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.id && waiting.has(msg.id)) {
      waiting.get(msg.id)(msg);
      waiting.delete(msg.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = ++id;
      waiting.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evaluate = async (expression) =>
    (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
  const shot = async (name) => {
    const res = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, name), Buffer.from(res.result.data, "base64"));
    console.log(`wrote ${join(OUT, name)}`);
  };

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: STUDIO });
  await sleep(2500);
  await shot("studio-pool.png");

  // excel seç, ikinci lafı düzenle, metni kurala aykırı yap (kaydetmeden): hata editörde ve önizlemede görünür
  await evaluate(`document.querySelector('[data-trigger="app:excel"]').click()`);
  await sleep(300);
  await evaluate(`document.querySelector('[data-action="edit"]').click()`);
  await sleep(300);
  await evaluate(`(() => {
    const input = document.querySelector('[data-role="editor"] input[name="text"]');
    input.value = 'Merged Cells! Wow{K:, ***';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(1200);
  await shot("studio-edit-error.png");

  // S3/S4 paneli hazırsa sağ taraf da görünür
  const hasSide = await evaluate(`!!document.querySelector('[data-role="side"] .win')`);
  if (hasSide) {
    await evaluate(`document.querySelector('[data-action="cancel"]')?.click()`);
    await evaluate(`window.scrollTo(0, 0)`);
    await sleep(800);
    await shot("studio-try.png");

    // S4: önce havuz cevabı, sonra yerel worker'a "llm"
    await evaluate(`(() => {
      const input = document.querySelector('[data-role="ask-form"] input[name="q"]');
      input.value = 'fransa nın başkenti ne';
      input.form.requestSubmit();
    })()`);
    await sleep(600);
    await evaluate(`document.querySelector('[data-side-action="llm"]').click()`);
    await sleep(2500);
    await evaluate(`document.querySelector('[aria-label="ask.exe"]').scrollIntoView()`);
    await sleep(300);
    await shot("studio-ask.png");
  }
} finally {
  ws?.close();
  browser.kill();
  await sleep(500);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // edge dosyayı hâlâ tutuyorsa bırak
  }
}
