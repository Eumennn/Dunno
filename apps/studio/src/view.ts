// Studio görünümü: ui-kit sınıflarıyla HTML üreten saf fonksiyonlar (DOM'suz, testlenir). Metinler her zaman kaçışlanır.
import { renderText } from "@desktop/lines/engine";
import { POOL_TARGETS } from "@desktop/lines/pool-check";
import { esc, segmentedHtml } from "@ui-kit/kit";
import type { Entry, Item, Lang, TreeNode } from "./model";

const text = (e: Entry, lang: Lang) => String(e[lang] ?? "");

export function langTabsHtml(lang: Lang): string {
  return segmentedHtml("dil", [{ value: "tr", label: "tr" }, { value: "en", label: "en" }, { value: "es", label: "es" }], lang);
}

/** Kategori > trigger ağacı; hedefin altındakiler `under` (pembe). */
export function treeHtml(tree: readonly TreeNode[], selected: string | null): string {
  const groups = tree
    .map((n) => {
      const items = n.triggers
        .map((t) => {
          const cls = ["tree-item", t.count < t.target ? "under" : "", t.trigger === selected ? "tree-on" : ""].filter(Boolean).join(" ");
          return `<li><button type="button" class="${cls}" data-action="pick-trigger" data-trigger="${esc(t.trigger)}" aria-pressed="${t.trigger === selected}"><span>${esc(t.trigger)}</span><span class="tree-count">${t.count}/${t.target}</span></button></li>`;
        })
        .join("");
      const under = n.count < n.target ? " under" : "";
      return `<li class="tree-group"><div class="tree-cat${under}"><span class="px">${esc(n.category)}</span><span class="tree-count">${n.count}/${n.target}</span></div><ul>${items}</ul></li>`;
    })
    .join("");
  const all = `<button type="button" class="tree-item${selected === null ? " tree-on" : ""}" data-action="pick-trigger" data-trigger="" aria-pressed="${selected === null}">hepsi</button>`;
  return `<nav class="tree" aria-label="trigger ağacı">${all}<ul>${groups}</ul></nav>`;
}

/** Bir laf satırı: id, trigger, intent, polite/street önizleme, aksiyonlar; hata varsa satırda listelenir. */
export function lineRowHtml(item: Item, lang: Lang, issues: readonly string[] = []): string {
  const e = item.entry;
  const t = text(e, lang);
  const polite = renderText(t, "polite");
  const street = renderText(t, "street");
  const same = polite === street;
  const errs = issues.length
    ? `<ul class="row-issues" role="alert">${issues.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`
    : "";
  const btn = (action: string, label: string, extra = "") =>
    `<button type="button" class="pbtn pbtn-sm${extra}" data-action="${action}" data-index="${item.index}">${label}</button>`;
  return `<li class="row${issues.length ? " row-err" : ""}" data-index="${item.index}">
  <div class="row-head"><span class="mono row-id">${esc(String(e.id ?? ""))}</span><span class="row-trigger">${esc(String(e.trigger ?? ""))}</span></div>
  <div class="row-prev"><span class="kick" lang="en">polite</span> ${esc(polite) || "<i>(boş)</i>"}</div>
  ${same ? "" : `<div class="row-prev"><span class="kick" lang="en">street</span> ${esc(street)}</div>`}
  <div class="row-intent">${esc(String(e.intent ?? ""))}</div>
  ${errs}
  <div class="row-actions">${btn("edit", "düzenle")}${btn("dup", "çoğalt")}${btn("del", "sil", " pbtn-dark")}</div>
</li>`;
}

export function listHtml(items: readonly Item[], lang: Lang, issues: ReadonlyMap<number, readonly string[]>): string {
  if (items.length === 0) return `<p class="empty">laf yok</p>`;
  return `<ul class="rows">${items.map((it) => lineRowHtml(it, lang, issues.get(it.index) ?? [])).join("")}</ul>`;
}

export interface EditorState {
  draft: Entry;
  /** düzenlenen satırın sırası; yeni laf için null */
  index: number | null;
  issues: readonly string[];
  saving?: boolean;
}

/** Düzenleme formu: alanlar, canlı polite/street önizleme, doğrulama hataları. */
export function editorHtml(s: EditorState, lang: Lang): string {
  const d = s.draft;
  const t = text(d, lang);
  const options = Object.keys(POOL_TARGETS)
    .map((tr) => `<option value="${esc(tr)}"${tr === d.trigger ? " selected" : ""}>${esc(tr)}</option>`)
    .join("");
  const errs = s.issues.length
    ? `<ul class="row-issues" role="alert">${s.issues.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`
    : `<p class="ok">kurallara uyuyor</p>`;
  return `<form class="editor" data-role="editor">
  <label>id <input class="field mono" name="id" value="${esc(String(d.id ?? ""))}" autocomplete="off" /></label>
  <label>trigger <select class="field" name="trigger">${options}</select></label>
  <label>intent <input class="field" name="intent" value="${esc(String(d.intent ?? ""))}" autocomplete="off" /></label>
  <label>${lang} metin <input class="field" name="text" value="${esc(t)}" autocomplete="off" spellcheck="false" /></label>
  <div class="row-prev"><span class="kick" lang="en">polite</span> <span data-role="prev-polite">${esc(renderText(t, "polite"))}</span></div>
  <div class="row-prev"><span class="kick" lang="en">street</span> <span data-role="prev-street">${esc(renderText(t, "street"))}</span></div>
  <div data-role="editor-issues">${errs}</div>
  <div class="row-actions">
    <button type="submit" class="pbtn pbtn-sm"${s.saving ? " disabled" : ""}>kaydet</button>
    <button type="button" class="pbtn pbtn-sm pbtn-dark" data-action="cancel">vazgeç</button>
  </div>
</form>`;
}
