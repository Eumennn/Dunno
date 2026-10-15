// Dunno Studio: havuz listesi (S1) + düzenleme (S2). S3/S4 panelleri side.ts'ten.
import "@ui-kit/fonts.css";
import "@ui-kit/tokens.css";
import "@ui-kit/kit.css";
import "./studio.css";
import { renderText } from "@desktop/lines/engine";
import type { CoverageRow, Issue } from "@desktop/lines/pool-check";
import {
  blankEntry,
  buildTree,
  duplicateEntry,
  filterEntries,
  insertEntry,
  issuesByIndex,
  removeEntry,
  replaceEntry,
  type Entry,
  type Lang,
} from "./model";
import { ctlCloseHtml } from "@ui-kit/kit";
import { mountSide } from "./side";
import { editorHtml, langTabsHtml, listHtml, treeHtml, type EditorState } from "./view";

interface State {
  pool: Record<Lang, Entry[]>;
  coverage: CoverageRow[];
  lang: Lang;
  trigger: string | null;
  search: string;
  issues: Map<number, string[]>;
  editor: EditorState | null;
}

const $ = <T extends HTMLElement>(role: string) => document.querySelector<T>(`[data-role="${role}"]`)!;
const s: State = { pool: { tr: [], en: [], es: [] }, coverage: [], lang: "tr", trigger: null, search: "", issues: new Map(), editor: null };

async function api<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  return { status: res.status, body: (await res.json()) as T };
}

function status(text: string): void {
  $("status").textContent = text;
}

// ---------------------------------------------------------------- çizim

function renderTree(): void {
  $("lang").innerHTML = langTabsHtml(s.lang);
  $("tree").innerHTML = treeHtml(buildTree(s.coverage, s.lang), s.trigger);
}

function renderList(): void {
  const items = filterEntries(s.pool[s.lang], s.lang, { trigger: s.trigger, search: s.search });
  $("list").innerHTML = listHtml(items, s.lang, s.issues);
  const total = s.pool[s.lang].length;
  status(`${items.length} / ${total} laf${s.issues.size ? ` · ${s.issues.size} satırda hata` : ""}`);
}

function renderEditor(): void {
  const win = $("editor-win");
  win.hidden = s.editor === null;
  $("editor").innerHTML = s.editor ? editorHtml(s.editor, s.lang) : "";
}

function renderEditorIssues(): void {
  const box = document.querySelector('[data-role="editor-issues"]');
  if (!box || !s.editor) return;
  // sadece hata kutusu yeniden çizilir: yazarken odak kaybolmasın
  const tmp = document.createElement("div");
  tmp.innerHTML = editorHtml(s.editor, s.lang);
  box.replaceWith(tmp.querySelector('[data-role="editor-issues"]')!);
}

function renderAll(): void {
  renderTree();
  renderList();
  renderEditor();
}

// ---------------------------------------------------------------- veri

async function load(): Promise<void> {
  const { body } = await api<{ tr: Entry[]; en: Entry[]; es?: Entry[]; coverage: CoverageRow[] }>("/api/pool");
  s.pool = { tr: body.tr, en: body.en, es: body.es ?? [] };
  s.coverage = body.coverage;
  await checkCurrent();
  renderAll();
  side.refresh();
}

async function checkCurrent(): Promise<void> {
  const { body } = await api<{ issues: Issue[] }>("/api/check", {
    method: "POST",
    body: JSON.stringify({ lang: s.lang, entries: s.pool[s.lang] }),
  });
  s.issues = issuesByIndex(body.issues);
}

/** Editördeki taslakla birlikte dosyanın son hali + taslağın sırası. */
function compose(ed: EditorState): { entries: Entry[]; index: number } {
  const entries = s.pool[s.lang];
  return ed.index === null ? insertEntry(entries, ed.draft) : { entries: replaceEntry(entries, ed.index, ed.draft), index: ed.index };
}

async function save(entries: Entry[], focusIndex: number | null): Promise<boolean> {
  const { status: code, body } = await api<{ ok: boolean; issues: Issue[] }>(`/api/pool/${s.lang}`, {
    method: "PUT",
    body: JSON.stringify(entries),
  });
  if (code === 200 && body.ok) {
    s.editor = null;
    await load();
    status("kaydedildi");
    return true;
  }
  const byIndex = issuesByIndex(body.issues ?? []);
  if (s.editor && focusIndex !== null) s.editor = { ...s.editor, issues: byIndex.get(focusIndex) ?? [], saving: false };
  status(code === 422 ? "kaydedilmedi: kural hatası" : "kaydedilmedi: sunucu hatası");
  renderEditor();
  return false;
}

// ---------------------------------------------------------------- editör

function readDraft(form: HTMLFormElement): Entry {
  const f = new FormData(form);
  const get = (k: string) => String(f.get(k) ?? "");
  return { id: get("id").trim(), trigger: get("trigger"), intent: get("intent"), [s.lang]: get("text") };
}

let checkTimer: ReturnType<typeof setTimeout> | undefined;
function liveCheck(): void {
  clearTimeout(checkTimer);
  checkTimer = setTimeout(async () => {
    if (!s.editor) return;
    const { entries, index } = compose(s.editor);
    const { body } = await api<{ issues: Issue[] }>("/api/check", {
      method: "POST",
      body: JSON.stringify({ lang: s.lang, entries }),
    });
    if (!s.editor) return;
    s.editor = { ...s.editor, issues: issuesByIndex(body.issues).get(index) ?? [] };
    renderEditorIssues();
  }, 250);
}

function openEditor(draft: Entry, index: number | null): void {
  s.editor = { draft, index, issues: index === null ? [] : (s.issues.get(index) ?? []) };
  renderEditor();
  liveCheck();
  document.querySelector<HTMLInputElement>('[data-role="editor"] input[name="text"]')?.focus();
}

// ---------------------------------------------------------------- olaylar

document.addEventListener("click", (ev) => {
  const el = (ev.target as HTMLElement).closest<HTMLElement>("[data-action], .seg");
  if (!el || !document.getElementById("app")!.contains(el)) return;
  if (el.classList.contains("seg") && el.closest('[data-role="lang"]')) {
    s.lang = el.dataset.value === "en" ? "en" : "tr";
    s.editor = null;
    $("list").lang = s.lang;
    $("editor").lang = s.lang;
    void checkCurrent().then(renderAll);
    return;
  }
  const index = Number(el.dataset.index);
  const entries = s.pool[s.lang];
  switch (el.dataset.action) {
    case "pick-trigger":
      s.trigger = el.dataset.trigger || null;
      renderTree();
      renderList();
      break;
    case "new":
      openEditor(blankEntry(entries, s.lang, s.trigger ?? "random"), null);
      break;
    case "edit":
      openEditor({ ...entries[index] }, index);
      break;
    case "dup":
      openEditor(duplicateEntry(entries, s.lang, index), null);
      break;
    case "del":
      if (window.confirm(`sil: ${String(entries[index]?.id ?? "")}?`)) void save(removeEntry(entries, index), null);
      break;
    case "cancel":
      s.editor = null;
      renderEditor();
      break;
  }
});

document.addEventListener("input", (ev) => {
  const t = ev.target as HTMLElement;
  if (t.matches('[data-role="search"]')) {
    s.search = (t as HTMLInputElement).value;
    renderList();
    return;
  }
  const form = t.closest<HTMLFormElement>('[data-role="editor"] form');
  if (form && s.editor) {
    s.editor = { ...s.editor, draft: readDraft(form) };
    const text = String(s.editor.draft[s.lang] ?? "");
    $("prev-polite").textContent = renderText(text, "polite");
    $("prev-street").textContent = renderText(text, "street");
    liveCheck();
  }
});

document.addEventListener("change", (ev) => {
  const form = (ev.target as HTMLElement).closest<HTMLFormElement>('[data-role="editor"] form');
  if (form && s.editor) {
    s.editor = { ...s.editor, draft: readDraft(form) };
    liveCheck();
  }
});

document.addEventListener("submit", (ev) => {
  const form = (ev.target as HTMLElement).closest<HTMLFormElement>('[data-role="editor"] form');
  if (!form || !s.editor) return;
  ev.preventDefault();
  s.editor = { ...s.editor, draft: readDraft(form), saving: true };
  const { entries, index } = compose(s.editor);
  void save(entries, index);
});

const side = mountSide($("side"), () => s.pool);

// landing gibi her başlık çubuğunda .ctl (x): edit.exe'de düzenlemeyi kapatır, diğerlerinde pencere gövdesini katlar
for (const bar of document.querySelectorAll<HTMLElement>("#app .win > .bar")) {
  const title = bar.textContent?.trim() ?? "";
  const label = bar.closest('[data-role="editor-win"]') ? `${title} kapat` : `${title} katla`;
  bar.insertAdjacentHTML("beforeend", `<span class="ctl-slot">${ctlCloseHtml(label)}</span>`);
}
document.addEventListener("click", (ev) => {
  const ctl = (ev.target as HTMLElement).closest<HTMLElement>(".bar .ctl");
  if (!ctl) return;
  const win = ctl.closest<HTMLElement>(".win")!;
  if (win.matches('[data-role="editor-win"]')) {
    s.editor = null;
    renderEditor();
    return;
  }
  const collapsed = win.classList.toggle("win-collapsed");
  ctl.setAttribute("aria-expanded", String(!collapsed));
});
void load().catch(() => status("sunucuya ulaşılamadı"));
