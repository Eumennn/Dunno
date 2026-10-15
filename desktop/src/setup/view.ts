// FB9 kurulum ekranları (saf HTML üretimi; test edilir).
import { blocks, type SetupMode, type Step } from "./flow";
import type { SetupStrings } from "./strings";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export interface SetupView {
  step: Step;
  existing: boolean;
  ready: boolean;
  version: string;
  pct: number;
  line: string;
  launch: boolean;
  error: string | null;
  /** FB11: kurulum ya da kaldırma (aynı program) */
  mode?: SetupMode;
  /** kaldırırken ayarlar da silinsin mi */
  deleteData?: boolean;
}

const closeSvg = `<svg viewBox="0 0 12 12" width="12" height="12" shape-rendering="crispEdges" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke-width="2"></path></svg>`;

const checkbox = (action: string, on: boolean, label: string) =>
  `<label class="su-check"><input type="checkbox" data-action="${action}"${on ? " checked" : ""} /><span class="su-box" aria-hidden="true"></span>${esc(label)}</label>`;

function progressHtml(title: string, v: SetupView, file: string): string {
  const n = blocks(v.pct);
  const cells = Array.from({ length: 20 }, (_, i) => `<span class="su-cell${i < n ? " on" : ""}"></span>`).join("");
  return `<h1 class="su-title">${esc(title)}<span class="su-dots" aria-hidden="true">...</span></h1>
        <div class="su-progress">
          <div class="su-progress-head mono"><span>${esc(file)}</span><span>${v.pct}%</span></div>
          <div class="su-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v.pct}">${cells}</div>
        </div>
        <p class="su-text" role="status">${esc(v.line)}</p>`;
}

/** FB11 kaldırıcı ekranları */
function uninstallBody(t: SetupStrings, v: SetupView): string {
  switch (v.step) {
    case "welcome":
      return `<h1 class="su-title">${esc(t.uTitle)}</h1>
        <p class="su-text">${esc(t.uBody)}</p>
        ${checkbox("data", v.deleteData ?? false, t.uData)}
        <div class="su-actions">
          <button type="button" class="pbtn pbtn-blue" data-action="uninstall">${esc(t.uYes)}</button>
          <button type="button" class="pbtn" data-action="quit">${esc(t.uNo)}</button>
        </div>`;
    case "installing":
      return progressHtml(t.uRemoving, v, "dunno.exe");
    case "done":
      return `<h1 class="su-title">${esc(t.uDoneTitle)}</h1>
        <p class="su-text">${esc(t.uDoneBody)}</p>
        <div class="su-actions"><button type="button" class="pbtn pbtn-dark" data-action="quit">[ ${esc(t.close)} ]</button></div>`;
    case "failed":
      return `<h1 class="su-title">${esc(t.failTitle)}</h1>
        <p class="su-text">${esc(t.failBody)}</p>
        ${v.error ? `<p class="su-meta mono">${esc(v.error)}</p>` : ""}
        <div class="su-actions">
          <button type="button" class="pbtn pbtn-blue" data-action="uninstall">${esc(t.retry)}</button>
          <button type="button" class="pbtn" data-action="quit">[ ${esc(t.close)} ]</button>
        </div>`;
  }
}

function body(t: SetupStrings, v: SetupView): string {
  if (v.mode === "uninstall") return uninstallBody(t, v);
  switch (v.step) {
    case "welcome":
      return `<h1 class="su-title">${esc(v.existing ? t.updateTitle : t.welcomeTitle)}</h1>
        <p class="su-text">${esc(t.welcomeBody)}</p>
        ${v.ready ? "" : `<p class="su-warn" role="alert">${esc(t.empty)}</p>`}
        <div class="su-actions">
          <button type="button" class="pbtn pbtn-blue" data-action="yes"${v.ready ? "" : " disabled"}>${esc(t.yes)}</button>
          <button type="button" class="pbtn" data-action="dunno"${v.ready ? "" : " disabled"}>${esc(t.dunno)}</button>
        </div>
        <p class="su-meta mono">${esc(t.meta.replace("{v}", v.version))}</p>`;
    case "installing":
      return progressHtml(t.installing, v, `dunno_${v.version}.pkg`);
    case "done":
      return `<h1 class="su-title">${esc(t.doneTitle)}</h1>
        <p class="su-text">${esc(t.doneBody)}</p>
        ${checkbox("launch", v.launch, t.launch)}
        ${v.error ? `<p class="su-launch-fail" role="alert">${esc(t.launchFail)}</p>` : ""}
        <div class="su-actions"><button type="button" class="pbtn pbtn-dark" data-action="finish">${esc(t.finish)}</button></div>`;
    case "failed":
      return `<h1 class="su-title">${esc(t.failTitle)}</h1>
        <p class="su-text">${esc(t.failBody)}</p>
        ${v.error ? `<p class="su-meta mono">${esc(v.error)}</p>` : ""}
        <div class="su-actions">
          <button type="button" class="pbtn pbtn-blue" data-action="retry">${esc(t.retry)}</button>
          <button type="button" class="pbtn" data-action="quit">[ ${esc(t.close)} ]</button>
        </div>`;
  }
}

/** Pencerenin tamamı; Dunno'nun canvas'ı sabit kalır (yeniden çizimde korunur), sadece .su-main değişir. */
export function shellHtml(t: SetupStrings): string {
  return `<div class="su-win">
    <div class="bar su-bar-top" data-tauri-drag-region>
      <span class="px" data-tauri-drag-region>${esc(t.barTitle)}</span>
      <span class="bar-ctls"><button type="button" class="ctl" data-action="quit" aria-label="${esc(t.close)}">${closeSvg}</button></span>
    </div>
    <div class="su-grid">
      <div class="su-stage" aria-hidden="true"><canvas class="su-pet"></canvas><div class="su-floor"></div></div>
      <div class="su-main"></div>
    </div>
  </div>`;
}

export function mainHtml(t: SetupStrings, v: SetupView): string {
  return body(t, v);
}
