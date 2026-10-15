// workshop.exe (SPEC 18, saf HTML): keşfet (topluluk paketleri) · paketler (uygulama paketleri: kozmetik + premium dünya)
// · yarat (Creator Studio: tema, laf paketi, Pro AI dünya) · paylaş (kendi modunu yükle). Landing pencere dili, token renkler.
import { esc, segmentedHtml, switchHtml } from "@ui-kit/kit";
import type { Lang } from "../lines/types";
import type { Tier } from "../pro/entitlements";
import { entitled, PACKS } from "../packs/packs";
import type { ModDir } from "../mods/mods";
import { previewLines, STUDIO_PALETTES, STUDIO_TRIGGERS } from "./studio";
import type { WsItem } from "./api";

export const WS_VIEWS = ["browse", "packs", "create", "share"] as const;
export type WsView = (typeof WS_VIEWS)[number];

export interface WsState {
  view: WsView;
  sort: "new" | "top";
  kind: string;
  items: WsItem[] | null;
  loading: boolean;
  msg: string | null;
  installed: string[];
  liked: string[];
  creator: { handle: string; items: WsItem[]; likes: number } | null;
  handle: string;
  /** yarat: tema */
  themeName: { tr: string; en: string };
  palette: string;
  /** yarat: laf paketi */
  linesName: { tr: string; en: string };
  lines: { trigger: string; tr: string; en: string }[];
  /** yarat: AI dünya */
  idea: string;
  aiPack: ModDir | null;
  /** paylaş: yüklenebilir kendi modları (dir, ad) */
  mine: { dir: string; name: string }[];
  /** settings.mods (paket aç/kapa) */
  enabled: Record<string, boolean>;
  restartPending: boolean;
}

export const initialWs = (): WsState => ({
  view: "browse",
  sort: "top",
  kind: "",
  items: null,
  loading: false,
  msg: null,
  installed: [],
  liked: [],
  creator: null,
  handle: "",
  themeName: { tr: "", en: "" },
  palette: "classic",
  linesName: { tr: "", en: "" },
  lines: [{ trigger: "random", tr: "", en: "" }],
  idea: "",
  aiPack: null,
  mine: [],
  enabled: {},
  restartPending: false,
});

const S = {
  tr: {
    views: { browse: "keşfet", packs: "paketler", create: "yarat", share: "paylaş" },
    sorts: { top: "popüler", new: "yeni" },
    kinds: { "": "hepsi", themes: "tema", reactions: "laf", accessories: "aksesuar", costumes: "kostüm", sounds: "ses" },
    loading: "yükleniyor. acele etme",
    offline: "workshop'a ulaşamadım. internet yok ya da ben tembelim",
    empty: "burada henüz bir şey yok. ilk sen ol",
    by: "yapan",
    install: "kur",
    installed: "kurulu",
    remove: "kaldır",
    like: "beğen",
    downloads: (n: number) => `${n} indirme`,
    pro: "pro",
    proOnly: "pro paketi",
    packLabel: "paket",
    restart: "yeniden başlat",
    restartHint: "yeni paketler yeniden başlatınca gelir",
    creator: (h: string) => `@${h}`,
    creatorStats: (p: number, l: number) => `${p} paket · ${l} beğeni`,
    back: "geri",
    packOwned: "sende var",
    packLockedPack: "tek seferlik paket. bu paket şunu ekler:",
    packLockedPro: "pro ile gelir. bu dünya şunu ekler:",
    packOn: "açık",
    themeTitle: "tema yap",
    linesTitle: "laf paketi yap",
    aiTitle: "ai dünya üretici",
    nameTr: "ad (türkçe)",
    nameEn: "ad (english)",
    palette: "renkler",
    build: "yap ve kur",
    addLine: "laf ekle",
    trigger: "ne zaman",
    triggers: {
      "interaction:click": "dürtünce",
      "interaction:drag": "sürükleyince",
      "time:morning": "sabah",
      "time:noon": "öğle",
      "time:evening": "akşam",
      "time:night": "gece",
      "idle:10": "10 dk boşta",
      "idle:30": "30 dk boşta",
      "app:browser": "tarayıcıda",
      "app:excel": "tabloda",
      "app:vscode": "kod yazarken",
      "app:game": "oyunda",
      random: "rastgele",
    } as Record<string, string>,
    ideaPh: "ör. dunno'nun yozlaşmış bir ceo olduğu dünya",
    generate: "üret",
    aiPro: "ai dünya üretici pro ile gelir. fikri yaz, dunno dünyayı kursun",
    aiLeft: "günde 3 dünya",
    handle: "takma ad",
    handleHint: "3-20 harf, rakam ya da _. e-posta, isim yok",
    upload: "yükle",
    shareHint: "yüklenen paket önce incelenir, sonra keşfet'te görünür. sadece veri, kod yok",
    uploadsClosed: "paylaşım şimdilik davetle. kendi modun bilgisayarında çalışmaya devam eder",
    noMine: "yüklenecek kendi modun yok. önce yarat'tan bir şey yap",
    privacy: "workshop'a sadece paket, takma ad ve rastgele cihaz kimliği gider. soru, başlık, hafıza gitmez.",
  },
  en: {
    views: { browse: "browse", packs: "packs", create: "create", share: "share" },
    sorts: { top: "top", new: "new" },
    kinds: { "": "all", themes: "theme", reactions: "lines", accessories: "accessory", costumes: "costume", sounds: "sound" },
    loading: "loading. no rush",
    offline: "couldn't reach the workshop. no internet or i'm lazy",
    empty: "nothing here yet. be the first",
    by: "by",
    install: "install",
    installed: "installed",
    remove: "remove",
    like: "like",
    downloads: (n: number) => `${n} downloads`,
    pro: "pro",
    proOnly: "pro pack",
    packLabel: "pack",
    restart: "restart",
    restartHint: "new packs arrive after a restart",
    creator: (h: string) => `@${h}`,
    creatorStats: (p: number, l: number) => `${p} packs · ${l} likes`,
    back: "back",
    packOwned: "you own this",
    packLockedPack: "one-time pack. this pack adds:",
    packLockedPro: "comes with pro. this world adds:",
    packOn: "on",
    themeTitle: "make a theme",
    linesTitle: "make a line pack",
    aiTitle: "ai world generator",
    nameTr: "name (türkçe)",
    nameEn: "name (english)",
    palette: "colors",
    build: "make and install",
    addLine: "add line",
    trigger: "when",
    triggers: {
      "interaction:click": "on poke",
      "interaction:drag": "on drag",
      "time:morning": "morning",
      "time:noon": "noon",
      "time:evening": "evening",
      "time:night": "night",
      "idle:10": "idle 10 min",
      "idle:30": "idle 30 min",
      "app:browser": "in the browser",
      "app:excel": "in a spreadsheet",
      "app:vscode": "while coding",
      "app:game": "in a game",
      random: "random",
    } as Record<string, string>,
    ideaPh: "e.g. a world where dunno is a corrupt ceo",
    generate: "generate",
    aiPro: "the ai world generator comes with pro. write an idea, dunno builds the world",
    aiLeft: "3 worlds a day",
    handle: "handle",
    handleHint: "3-20 letters, digits or _. no email, no real name",
    upload: "upload",
    shareHint: "uploads are reviewed first, then show up in browse. data only, no code",
    uploadsClosed: "sharing is invite only for now. your mod still works on your computer",
    noMine: "no mods of your own to upload. make something in create first",
    privacy: "the workshop only gets the pack, your handle and a random device id. no questions, titles or memories.",
  },
};
export type WsStrings = (typeof S)["tr"];
export const wsStrings = (lang: Lang): WsStrings => S[lang] as WsStrings;

const card = (file: string, bar: string, body: string) =>
  `<div class="win app-card"><div class="bar ${bar}"><span>${esc(file)}</span></div><div class="app-pad">${body}</div></div>`;

function itemCard(t: WsStrings, lang: Lang, it: WsItem, s: WsState, tier: Tier): string {
  const installed = s.installed.includes(it.id);
  const liked = s.liked.includes(it.id);
  const locked = it.premium && tier !== "pro";
  const kinds = it.kinds.map((k) => `<span class="pt-chip">${esc((t.kinds as Record<string, string>)[k] ?? k)}</span>`).join("");
  return `<article class="ws-item" data-ws-item="${esc(it.id)}">
    <p class="ws-name">${esc(it.name[lang])}${it.premium ? ` <span class="ws-pro">${esc(t.pro)}</span>` : ""}</p>
    <p class="app-hint">${esc(it.description[lang])}</p>
    <p class="pt-chips">${kinds}</p>
    <p class="app-hint">${esc(t.by)} <button type="button" class="ws-link" data-action="ws_creator" data-handle="${esc(it.author)}">${esc(t.creator(it.author))}</button> · ${esc(t.downloads(it.downloads))}</p>
    <div class="app-actions">
      <button type="button" class="pbtn pbtn-sm${liked ? " pbtn-blue" : ""}" data-action="ws_like" data-id="${esc(it.id)}" aria-pressed="${liked}">${esc(t.like)} ${it.likes}</button>
      ${installed ? `<button type="button" class="pbtn pbtn-sm" data-action="ws_remove" data-id="${esc(it.id)}">${esc(t.remove)}</button>` : `<button type="button" class="pbtn pbtn-blue pbtn-sm" data-action="ws_install" data-id="${esc(it.id)}"${locked ? " disabled" : ""}>${esc(locked ? t.proOnly : t.install)}</button>`}
    </div>
  </article>`;
}

function browseHtml(t: WsStrings, lang: Lang, s: WsState, tier: Tier): string {
  if (s.creator) {
    const c = s.creator;
    return card(t.creator(c.handle), "bar-blue", `<p class="app-hint">${esc(t.creatorStats(c.items.length, c.likes))}</p>
      <div class="ws-grid">${c.items.map((i) => itemCard(t, lang, i, s, tier)).join("") || `<p class="app-hint">${esc(t.empty)}</p>`}</div>
      <p><button type="button" class="pbtn pbtn-sm" data-action="ws_back">${esc(t.back)}</button></p>`);
  }
  const bar = `<div class="wr-toolbar">${segmentedHtml("ws_sort", (["top", "new"] as const).map((v) => ({ value: v, label: t.sorts[v] })), s.sort)}${segmentedHtml("ws_kind", Object.entries(t.kinds).map(([v, l]) => ({ value: v, label: l })), s.kind)}</div>`;
  const body = s.loading ? `<p class="app-hint">${esc(t.loading)}</p>` : s.items === null ? `<p class="app-hint">${esc(t.offline)}</p>` : s.items.length ? `<div class="ws-grid">${s.items.map((i) => itemCard(t, lang, i, s, tier)).join("")}</div>` : `<p class="app-hint">${esc(t.empty)}</p>`;
  return card("browse.txt", "bar-idle", bar + body);
}

function packsHtml(t: WsStrings, lang: Lang, s: WsState, tier: Tier, owned: readonly string[]): string {
  const rows = PACKS.map((p) => {
    const has = entitled(p, tier, owned);
    const on = s.enabled[p.id] !== false;
    const state = has
      ? `<label class="wr-filter">${switchHtml(`pack_${p.id}`, on, `${p.name[lang]}: ${t.packOn}`)} <span>${esc(t.packOn)}</span></label>`
      : `<span class="ws-pro">${esc(p.requires === "pro" ? t.pro : t.packLabel)}</span>`;
    const lead = has ? t.packOwned : p.requires === "pro" ? t.packLockedPro : t.packLockedPack;
    return `<article class="ws-item${has ? "" : " ws-locked"}"><p class="ws-name">${esc(p.name[lang])}</p><p class="app-hint">${esc(lead)} ${esc(p.description[lang])}</p><div class="app-actions">${state}</div></article>`;
  }).join("");
  return card("packs.txt", "bar-blue", `<div class="ws-grid">${rows}</div>`);
}

const input = (name: string, value: string, label: string, ph = "", max = 32) =>
  `<label class="app-field"><span class="app-label">${esc(label)}</span><input class="field" data-ws-input="${esc(name)}" value="${esc(value)}" placeholder="${esc(ph)}" maxlength="${max}" spellcheck="false"></label>`;

function createHtml(t: WsStrings, lang: Lang, s: WsState, tier: Tier): string {
  const swatches = STUDIO_PALETTES.map(
    (p) =>
      `<button type="button" class="ws-swatch${s.palette === p.id ? " ws-swatch-on" : ""}" data-action="ws_palette" data-id="${esc(p.id)}" aria-pressed="${s.palette === p.id}" title="${esc(p.name[lang])}">${["body", "shade", "light", "belly"].map((k) => `<i style="background:${p.colors[k as keyof typeof p.colors]}"></i>`).join("")}</button>`,
  ).join("");
  const theme = card(t.themeTitle, "bar-idle", `${input("theme_tr", s.themeName.tr, t.nameTr)}${input("theme_en", s.themeName.en, t.nameEn)}<p class="app-label">${esc(t.palette)}</p><div class="ws-swatches">${swatches}</div><p><button type="button" class="pbtn pbtn-blue pbtn-sm" data-action="ws_make_theme">${esc(t.build)}</button></p>`);
  const opts = (sel: string) => STUDIO_TRIGGERS.map((x) => `<option value="${x}"${x === sel ? " selected" : ""}>${esc(t.triggers[x] ?? x)}</option>`).join("");
  const rows = s.lines
    .map(
      (l, i) =>
        `<div class="ws-line"><select class="field" data-ws-input="line_trigger_${i}" aria-label="${esc(t.trigger)}">${opts(l.trigger)}</select><input class="field" data-ws-input="line_tr_${i}" value="${esc(l.tr)}" placeholder="türkçe" maxlength="60"><input class="field" data-ws-input="line_en_${i}" value="${esc(l.en)}" placeholder="english" maxlength="60"></div>`,
    )
    .join("");
  const lines = card(t.linesTitle, "", `${input("lines_tr", s.linesName.tr, t.nameTr)}${input("lines_en", s.linesName.en, t.nameEn)}${rows}<div class="app-actions"><button type="button" class="pbtn pbtn-sm" data-action="ws_add_line">${esc(t.addLine)}</button><button type="button" class="pbtn pbtn-blue pbtn-sm" data-action="ws_make_lines">${esc(t.build)}</button></div>`);
  const ai =
    tier === "pro"
      ? `${input("idea", s.idea, t.aiTitle, t.ideaPh, 140)}<p class="app-hint">${esc(t.aiLeft)}</p><p><button type="button" class="pbtn pbtn-blue pbtn-sm" data-action="ws_generate"${s.loading ? " disabled" : ""}>${esc(s.loading ? t.loading : t.generate)}</button></p>${
          s.aiPack
            ? `<div class="ws-item"><p class="ws-name">${esc(s.aiPack.dir)}</p><ul class="app-ul">${previewLines(s.aiPack, lang).map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p><button type="button" class="pbtn pbtn-blue pbtn-sm" data-action="ws_install_ai">${esc(t.install)}</button></p></div>`
            : ""
        }`
      : `<p class="app-hint">${esc(t.aiPro)}</p>`;
  return `<div class="app-home ws-create"><div class="app-side">${theme}${card(t.aiTitle, "bar-blue", ai)}</div><div class="app-side">${lines}</div></div>`;
}

function shareHtml(t: WsStrings, s: WsState): string {
  const list = s.mine.length
    ? `<ul class="ws-mine">${s.mine.map((m) => `<li><span>${esc(m.name)}</span><button type="button" class="pbtn pbtn-sm pbtn-blue" data-action="ws_upload" data-id="${esc(m.dir)}">${esc(t.upload)}</button></li>`).join("")}</ul>`
    : `<p class="app-hint">${esc(t.noMine)}</p>`;
  return card("share.txt", "bar-idle", `${input("handle", s.handle, t.handle, "", 20)}<p class="app-hint">${esc(t.handleHint)}</p>${list}<p class="app-hint">${esc(t.shareHint)}</p>`);
}

export function workshopHtml(lang: Lang, s: WsState, tier: Tier, owned: readonly string[]): string {
  const t = wsStrings(lang);
  const nav = segmentedHtml("ws_view", WS_VIEWS.map((v) => ({ value: v, label: t.views[v] })), s.view);
  const body = s.view === "browse" ? browseHtml(t, lang, s, tier) : s.view === "packs" ? packsHtml(t, lang, s, tier, owned) : s.view === "create" ? createHtml(t, lang, s, tier) : shareHtml(t, s);
  const msg = s.msg ? `<p class="ws-msg" role="status">${esc(s.msg)}${s.restartPending ? ` <button type="button" class="pbtn pbtn-sm pbtn-blue" data-action="restart">${esc(t.restart)}</button>` : ""}</p>` : "";
  return `<section class="ws"><div class="ws-nav">${nav}</div>${msg}${body}<p class="app-dim">${esc(t.privacy)}</p></section>`;
}
