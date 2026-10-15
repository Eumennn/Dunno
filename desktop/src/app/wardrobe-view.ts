// wardrobe.exe sekmesi (SPEC 05 W4, saf HTML): sol önizleme + durum seçici, sağ themes / costumes / accessories ızgaraları,
// altta achievements.txt. SPEC 09: kostümler (K2) ve slotlu çoklu aksesuar (K6: slot başına bir, en fazla 3; kostümün kapattığı slot işaretli). Kilitli parça: siluet + kilit + koşul + ilerleme. Tema renkleri themes.json'dan (kaynakta hex yok).
import { esc, lockIconHtml, noPx, segmentedHtml, switchHtml } from "@ui-kit/kit";
import type { UiStrings } from "../i18n";
import { localDay } from "../lines/engine";
import type { Lang } from "../settings";
import type { Unlock } from "../wardrobe/achievements";
import type { Theme } from "../wardrobe/themes";
import { PACK_IDS, packOf, PRESETS, presetOpen, recommend } from "../pro/presets";

import { allAccessories, allCostumes, isModTheme, modCostumeBlocks, wornLimitNow, slotFor, wear, type AccessoryId, type WardrobeView } from "../wardrobe/wardrobe";

/** Kostümün kapattığı slotlar (content/wardrobe/costumes/<id>.json blocks; costumes testi aynı olduğunu doğrular). */
export const COSTUME_BLOCKS: Record<string, readonly string[]> = {
  bug: [],
  fly: ["eyes"],
  bee: [],
  ghost: ["neck", "body"],
  dino: ["head", "side"],
  frog: ["head"],
  astronaut: ["head", "eyes", "side"],
  pizza: [],
  cockroach: [],
  cat: ["head"],
  dog: [],
  slime: [],
  mushroom: ["head", "side"],
  robot: ["head", "eyes"],
  alien: [],
  fish: [],
  duck: [],
  skeleton: [],
  vampire: ["neck", "body"],
  mini_monster: ["head"],
};

/** dunno.exe'de tıklama sonrası anında görünüm (pet penceresi select ile aynı kuralı uygular, sonra durum yayınlar). */
export function toggleView(w: WardrobeView, sel: { accessory?: string | null; costume?: string | null }): WardrobeView {
  if (sel.accessory === null) return { ...w, accessories: [] };
  if (sel.accessory !== undefined && slotFor(sel.accessory) !== undefined) {
    return { ...w, accessories: wear(w.accessories as AccessoryId[], sel.accessory as AccessoryId) };
  }
  if (sel.costume !== undefined) return { ...w, costume: sel.costume === null || sel.costume === w.costume ? null : sel.costume };
  return w;
}

export const PREVIEW_STATES = ["idle", "walk", "sleep", "peek"] as const;
export type PreviewState = (typeof PREVIEW_STATES)[number];

const same = (a: Unlock, b: Unlock) => a.kind === b.kind && a.id === b.id;

/** Kilitli parçanın koşulu ve ilerlemesi ("37 / 100"). */
function lockInfo(t: UiStrings, w: WardrobeView, item: Unlock): string {
  const a = w.achievements.find((x) => same(x.unlocks, item));
  if (!a) return "";
  const goal = t.achievements[a.id]?.goal(a.target) ?? a.id;
  return `<span class="wr-lock">${lockIconHtml}<span class="wr-goal">${esc(goal)}</span><span class="wr-prog mono">${a.value} / ${a.target}</span></span>`;
}

function themeTile(t: UiStrings, lang: Lang, w: WardrobeView, theme: Theme): string {
  const item: Unlock = { kind: "theme", id: theme.id };
  const open = w.unlocked.some((u) => same(u, item));
  const on = w.theme === theme.id;
  const sw = (["body", "shade", "light", "belly"] as const).map((r) => `<i style="background:${esc(theme.colors[r])}"></i>`).join("");
  return `<button type="button" class="wr-tile${on ? " wr-tile-on" : ""}${open ? "" : " wr-locked"}" data-theme="${esc(theme.id)}" aria-pressed="${on}" aria-disabled="${!open}">
    <span class="wr-swatch">${sw}</span>
    <span class="wr-name">${esc(theme.name[lang])}</span>
    ${open ? "" : lockInfo(t, w, item)}
  </button>`;
}

function accessoryTile(t: UiStrings, w: WardrobeView, id: AccessoryId, url: string | undefined): string {
  const item: Unlock = { kind: "accessory", id };
  const open = w.unlocked.some((u) => same(u, item));
  const on = w.accessories.includes(id);
  const slot = slotFor(id) ?? "head";
  const blocked = on && w.costume !== null && (COSTUME_BLOCKS[w.costume] ?? modCostumeBlocks(w.costume) ?? []).includes(slot);
  const img = url ? `<img class="wr-img" src="${esc(url)}" alt="" width="64" height="64" />` : `<span class="wr-img"></span>`;
  return `<button type="button" class="wr-tile${on ? " wr-tile-on" : ""}${open ? "" : " wr-locked"}" data-accessory="${esc(id)}" data-slot="${slot}" aria-pressed="${on}" aria-disabled="${!open}">
    ${img}
    <span class="wr-name">${esc(t.accessoryNames[id] ?? id)}</span>
    <span class="app-hint wr-slot">${esc(t.wrSlots[slot])}${blocked ? ` · ${esc(t.wrBlocked)}` : ""}</span>
    ${open ? "" : lockInfo(t, w, item)}
  </button>`;
}

function costumeTile(t: UiStrings, w: WardrobeView, id: string, url: string | undefined): string {
  const item: Unlock = { kind: "costume", id };
  const open = w.unlocked.some((u) => same(u, item));
  const on = w.costume === id;
  const img = url ? `<img class="wr-img" src="${esc(url)}" alt="" width="64" height="64" />` : `<span class="wr-img"></span>`;
  return `<button type="button" class="wr-tile${on ? " wr-tile-on" : ""}${open ? "" : " wr-locked"}" data-costume="${esc(id)}" aria-pressed="${on}" aria-disabled="${!open}">
    ${img}
    <span class="wr-name">${esc(t.costumeNames[id] ?? id)}</span>
    ${open ? "" : lockInfo(t, w, item)}
  </button>`;
}

/** Dolap kategorisi (UX-01): aynı anda tek ızgara (seçim yorgunluğu azalır). */
export const WR_CATS = ["start", "themes", "costumes", "accessories"] as const;
export type WrCat = (typeof WR_CATS)[number];

export interface WardrobeUi {
  cat: WrCat;
  /** sadece açık parçalar (kilitliler gizli) */
  onlyOpen: boolean;
  /** FB5: achievements.txt tam liste açık mı (varsayılan kapalı: başlık + özet + düğme) */
  achOpen?: boolean;
}

/** "üzerindekiler" kartı (UX-01): tema, kostüm, aksesuarlar; kostüm ve aksesuar tek tıkla çıkar. */
function wornHtml(t: UiStrings, lang: Lang, w: WardrobeView, themes: readonly Theme[]): string {
  const theme = themes.find((x) => x.id === w.theme);
  const chip = (label: string, attr: string) =>
    `<button type="button" class="wr-chip" ${attr} aria-label="${esc(t.wrTakeOff(label))}">${esc(label)} <span aria-hidden="true">x</span></button>`;
  const parts = [
    w.costume ? chip(t.costumeNames[w.costume] ?? w.costume, `data-costume="${esc(w.costume)}"`) : "",
    ...w.accessories.map((id) => chip(t.accessoryNames[id] ?? id, `data-accessory="${esc(id)}"`)),
  ].join("");
  return `<div class="win app-card wr-worn"><div class="bar bar-idle"><span>wearing.txt</span></div>
    <div class="app-pad"><p class="app-dim">${esc(t.wrThemeNow)}: <strong>${esc(theme?.name[lang] ?? w.theme)}</strong></p>
      <div class="wr-chips">${parts || `<span class="app-hint">${esc(t.wrNothingWorn)}</span>`}</div>
    </div>
  </div>`;
}

const open = (w: WardrobeView, item: Unlock) => w.unlocked.some((u) => same(u, item));

/** Tek parça (testler ve eski çağrılar): sol panel + ana alan */
export function wardrobeHtml(...a: Parameters<typeof wardrobeParts>): string {
  const p = wardrobeParts(...a);
  return `<div class="wr-aside">${p.aside}</div>${p.main}`;
}

/** FB6: dolap iki parça: sabit sol panel (aside) + kayan ana alan (main) */
export function wardrobeParts(
  t: UiStrings,
  lang: Lang,
  w: WardrobeView,
  themes: readonly Theme[],
  accUrl: (id: string) => string | undefined,
  costumeUrl: (id: string) => string | undefined,
  preview: PreviewState,
  /** test modu (SPEC 07 FB2): kilitler yok sayılıyor notu */
  note?: string,
  ui: WardrobeUi = { cat: "costumes", onlyOpen: false },
): { aside: string; main: string } {
  const bare = w.accessories.length === 0;
  const none = `<button type="button" class="wr-tile wr-none${bare ? " wr-tile-on" : ""}" data-accessory="" aria-pressed="${bare}"><span class="wr-img"></span><span class="wr-name">${esc(t.wrNone)}</span></button>`;
  const noCostume = `<button type="button" class="wr-tile wr-none${w.costume === null ? " wr-tile-on" : ""}" data-costume="" aria-pressed="${w.costume === null}"><span class="wr-img"></span><span class="wr-name">${esc(t.wrNone)}</span></button>`;
  // mod temaları (SPEC 12 B) tasarımcı onayı beklemez: not sadece yerleşik aday temalar için
  const candidate = themes.some((x) => x.status === "candidate" && !isModTheme(x.id)) ? `<p class="app-hint">${esc(t.wrCandidate)}</p>` : "";
  const testNote = note ? `<p class="app-hint wr-test">${esc(note)}</p>` : "";
  // UX-01: tek kategori ızgarası + "sadece açıklar" filtresi; sayılar sekmede (açık / toplam)
  const keep = (item: Unlock) => !ui.onlyOpen || open(w, item);
  const themeItems = themes.filter((x) => keep({ kind: "theme", id: x.id }));
  const COSTUMES = allCostumes();
  const ACCESSORIES = allAccessories();
  const costumeItems = COSTUMES.filter((id) => keep({ kind: "costume", id }));
  const accItems = ACCESSORIES.filter((id) => keep({ kind: "accessory", id }));
  const count = (kind: Unlock["kind"], ids: readonly string[]) => `${ids.filter((id) => open(w, { kind, id })).length}/${ids.length}`;
  const counts: Record<WrCat, string> = {
    start: "",
    themes: count("theme", themes.map((x) => x.id)),
    costumes: count("costume", COSTUMES),
    accessories: count("accessory", ACCESSORIES),
  };
  // kostümler paket başlıklarıyla (SPEC 15): 20+ kutucuk tek yığın değil
  const costumeGrid = PACK_IDS.map((pack) => {
    const ids = costumeItems.filter((id) => packOf(id) === pack);
    return ids.length ? `<p class="app-label wr-pack">${esc(t.packNames[pack as keyof UiStrings["packNames"]])}</p><div class="wr-grid">${ids.map((id) => costumeTile(t, w, id, costumeUrl(id))).join("")}</div>` : "";
  }).join("");
  const grid =
    ui.cat === "start"
      ? startHtml(t, w, themes)
      : ui.cat === "themes"
      ? `${testNote}<div class="wr-grid">${themeItems.map((x) => themeTile(t, lang, w, x)).join("")}</div>${candidate}`
      : ui.cat === "costumes"
        ? `${testNote}<div class="wr-grid">${noCostume}</div>${costumeGrid}`
        : `${testNote}<p class="app-hint">${esc(t.wrSlotHint(wornLimitNow()))}</p><div class="wr-grid">${none}${accItems.map((id) => accessoryTile(t, w, id as AccessoryId, accUrl(id))).join("")}</div>`;
  const hidden = ui.onlyOpen && (ui.cat === "themes" ? themeItems.length < themes.length : ui.cat === "costumes" ? costumeItems.length < COSTUMES.length : accItems.length < ACCESSORIES.length);
  // FB6: sol panel (önizleme + üzerindekiler) kaydırma alanının DIŞINDA, pencereye sabit; tek kaydırma alanı sağda
  // (kategori + ızgara, altında achievements.txt). JS ölçümü yok: önizleme yapısı gereği hiç oynamaz.
  const aside = `<div class="win app-card app-stagecard wr-preview"><div class="bar bar-blue"><span>preview.txt</span></div>
      <div class="app-stage"><canvas id="wr-pet" aria-hidden="true"></canvas>
        ${segmentedHtml("preview", PREVIEW_STATES.map((s) => ({ value: s, label: t.wrPreview[s] })), preview)}
      </div>
    </div>
    ${wornHtml(t, lang, w, themes)}`;
  const main = `<section class="wr wr-main">
    <div class="win app-card"><div class="bar bar-idle"><span>${ui.cat}</span></div>
      <div class="app-pad">
        <div class="wr-toolbar">
          ${segmentedHtml("wrcat", WR_CATS.map((c) => ({ value: c, label: `${t.wrCats[c]} ${counts[c]}`.trim() })), ui.cat)}
          ${ui.cat === "start" ? "" : `<label class="wr-filter">${switchHtml("wr_only_open", ui.onlyOpen, t.wrOnlyOpen)} <span>${esc(t.wrOnlyOpen)}</span></label>`}
        </div>
        ${grid}
        ${hidden ? `<p class="app-hint">${esc(t.wrHiddenLocked)}</p>` : ""}
      </div>
    </div>
    ${achievementsHtml(t, w, ui.achOpen === true)}
  </section>`;
  return { aside, main };
}

/** Başla (SPEC 15): hazır görünümler + sıradaki başarımlar + ilerleme. Az seçenekle başlar, gerisi kategorilerde. */
export function startHtml(t: UiStrings, w: WardrobeView, themes: readonly Theme[]): string {
  const presets = PRESETS.map((p) => {
    const o = presetOpen(w, p);
    const ready = o.open === o.total;
    const on = w.theme === p.theme && w.costume === p.costume && [...w.accessories].sort().join() === [...p.accessories].sort().join();
    const th = themes.find((x) => x.id === p.theme);
    const swatch = th ? (["body", "shade", "light", "belly"] as const).map((r) => `<i style="background:${esc(th.colors[r])}"></i>`).join("") : "";
    const what = [p.costume ? (t.costumeNames[p.costume] ?? p.costume) : "", ...p.accessories.map((a) => t.accessoryNames[a] ?? a)].filter(Boolean).join(", ") || t.wrNone;
    return `<button type="button" class="wr-tile wr-preset${on ? " wr-tile-on" : ""}${ready ? "" : " wr-locked"}" data-preset="${esc(p.id)}" aria-pressed="${on}" aria-disabled="${!ready}">
      <span class="wr-swatch">${swatch}</span>
      <span class="wr-name">${esc(t.presetNames[p.id as keyof UiStrings["presetNames"]] ?? p.id)}</span>
      <span class="app-hint">${ready ? esc(what) : `${lockIconHtml} ${esc(t.wrPresetOpen(o.open, o.total))}`}</span>
    </button>`;
  }).join("");
  const next = recommend(w)
    .map((a) => {
      const s = t.achievements[a.id];
      return `<li><span class="wr-next-title">${esc(s?.title ?? a.id)}</span> <span class="app-hint">${esc(s?.goal(a.target) ?? "")}</span> <span class="mono">${a.value} / ${a.target}</span></li>`;
    })
    .join("");
  const done = w.achievements.filter((a) => a.done).length;
  return `<p class="app-label">${esc(t.wrPresets)}</p>
    <div class="wr-grid">${presets}</div>
    <p class="app-label">${esc(t.wrNext)}</p>
    <ul class="wr-next">${next}</ul>
    <p class="app-hint">${esc(t.wrProgress(done, w.achievements.length))}</p>`;
}

/** achievements.txt: tüm başarımlar, açık/kilitli, açılma tarihi. */
export function achievementsHtml(t: UiStrings, w: WardrobeView, open = true): string {
  const done = w.achievements.filter((a) => a.done).length;
  // FB5: kapalıyken sadece başlık + "x/y" + düğme; tam liste düğmeyle açılır (sol sütun kısa kalır, önizleme sabit görünür)
  const toggle = `<button type="button" class="pbtn pbtn-sm" data-action="ach_toggle" aria-expanded="${open}" aria-controls="wr-ach-list">${esc(open ? t.wrAchHide : t.wrAchShow)}</button>`;
  const head = `<div class="wr-ach-head"><span class="app-hint">${esc(t.wrProgress(done, w.achievements.length))}</span>${toggle}</div>`;
  if (!open) {
    return `<section class="win app-card wr-ach"><div class="bar"><span>achievements.txt</span></div>
    <div class="app-pad">${head}</div>
  </section>`;
  }
  const rows = w.achievements
    .map((a) => {
      const s = t.achievements[a.id];
      const state = a.done ? esc(t.wrUnlockedOn(a.at ? localDay(new Date(a.at)) : "")) : `${lockIconHtml} <span class="mono">${a.value} / ${a.target}</span>`;
      return `<tr class="${a.done ? "wr-done" : ""}"><th scope="row"><span class="${noPx(s?.title ?? "")}">${esc(s?.title ?? a.id)}</span><span class="app-hint">${esc(s?.goal(a.target) ?? "")}</span></th><td>${state}</td></tr>`;
    })
    .join("");
  return `<section class="win app-card wr-ach"><div class="bar"><span>achievements.txt</span></div>
    <div class="app-pad">${head}<table class="wr-table" id="wr-ach-list">${rows}</table></div>
  </section>`;
}

/**
 * Izgarada klavye gezinme (UX-01, saf): kutucuk konumlarından (sol üst) ok tuşuyla sıradaki kutucuk.
 * Sağ/sol: sıradaki/önceki; aşağı/yukarı: alt/üst satırda en yakın sütun; Home/End: ilk/son. Hareket yoksa null.
 */
export function gridMove(pos: readonly { x: number; y: number }[], i: number, key: string): number | null {
  if (i < 0 || !pos.length) return null;
  switch (key) {
    case "ArrowRight":
      return i + 1 < pos.length ? i + 1 : null;
    case "ArrowLeft":
      return i > 0 ? i - 1 : null;
    case "Home":
      return 0;
    case "End":
      return pos.length - 1;
    case "ArrowDown":
    case "ArrowUp": {
      const down = key === "ArrowDown";
      const rows = [...new Set(pos.map((p) => p.y))].sort((a, b) => a - b);
      const r = rows.indexOf(pos[i].y) + (down ? 1 : -1);
      if (r < 0 || r >= rows.length) return null;
      let best = -1;
      pos.forEach((p, k) => {
        if (p.y !== rows[r]) return;
        if (best < 0 || Math.abs(p.x - pos[i].x) < Math.abs(pos[best].x - pos[i].x)) best = k;
      });
      return best;
    }
    default:
      return null;
  }
}

