// dunno.exe pet.txt sekmesi (SPEC 17 R8, saf HTML; strateji §6 "Dunno OS"): kart + ilişki + trait'ler | evrim ağacı + anılar + lore.
// Landing pencere dili (ui-kit). Renk sadece token; çubuklar düz dolgu (gradyan yok).
import { esc } from "@ui-kit/kit";
import type { Lang } from "../lines/types";
import type { Tier } from "../pro/entitlements";
import { appName } from "../personal/profile";
import { XP_TABLE } from "./progression";
import { STATS } from "./relationship";
import { GIF_STRINGS } from "../share/strings";
import { COMPANION_STRINGS } from "./strings";
import type { CompanionView } from "./view";
import { skillDetail, skillLegend, skillTreeSvg } from "./skill-tree";

const card = (file: string, bar: string, body: string, cls = "") =>
  `<div class="win app-card ${cls}"><div class="bar ${bar}"><span>${esc(file)}</span></div><div class="app-pad">${body}</div></div>`;

const meter = (label: string, value: number, key: string) =>
  `<li class="pt-meter" data-stat="${esc(key)}"><span>${esc(label)}</span><span class="st-track"><span class="st-fill-h" style="width:${Math.max(0, Math.min(100, value))}%"></span></span><span class="mono">${value}</span></li>`;

const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function petTabHtml(lang: Lang, v: CompanionView | undefined, tier: Tier, worlds: { open: number; total: number }, selected: string | null = null): string {
  const t = COMPANION_STRINGS[lang];
  if (!v) return `<section class="app-txt"><p class="app-hint">${esc(t.noMemories)}</p></section>`;
  const form = t.forms[v.form];
  const pct = Math.round(v.xp.ratio * 100);
  const head = `<div class="pt-head">
      <canvas id="pt-card" class="pt-card" width="300" height="180" role="img" aria-label="${esc(`${t.cardTitle}: ${t.level} ${v.level}, ${form}`)}"></canvas>
      <div class="pt-id">
        <p class="app-big">${esc(t.level)} ${v.level}</p>
        <p><span class="hl">${esc(form)}</span> <span class="app-dim">${esc(t.formBlurb[v.form])}</span></p>
        <div class="pt-xp" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span class="st-fill-h" style="width:${pct}%"></span></div>
        <p class="app-hint mono">${esc(t.xpOf(v.xp.into, v.xp.need))}</p>
      </div>
    </div>
    <p class="app-hint">${esc(t.bonds[v.bond])} · ${esc(t.together(v.daysTogether))} · ${esc(t.interactions(v.interactions))} · ${esc(t.secretWorlds(worlds.open, worlds.total))}</p>
    <div class="app-actions"><button type="button" class="pbtn pbtn-sm" data-action="card_copy">${esc(t.cardCopy)}</button><button type="button" class="pbtn pbtn-blue pbtn-sm" data-action="card_save">${esc(t.cardSave)}</button><button type="button" class="pbtn pbtn-sm" data-action="gif_save">${esc(GIF_STRINGS[lang].save)}</button></div>`;
  const mood = `<ul class="pt-meters">${STATS.map((k) => meter(t.stats[k], v.stats[k], k)).join("")}</ul>`;
  const traits = v.traits.length ? `<p class="pt-chips">${v.traits.map((x) => `<span class="pt-chip">${esc(t.traits[x])}</span>`).join("")}</p>` : `<p class="app-hint">${esc(t.noTraits)}</p>`;
  const fav = v.favoriteApp ? `<p>${esc(t.favoriteApp)}: <span class="mono">${esc(appName(lang, v.favoriteApp) ?? v.favoriteApp)}</span></p>` : "";

  const next = v.nextEvolution !== null ? `<p class="app-hint">${esc(t.nextEvolution(v.nextEvolution))}</p>` : "";
  const pick =
    v.stage === 0
      ? ""
      : tier === "pro" && v.choices.length
        ? `<p class="app-label">${esc(t.choosePathPro)}</p><div class="app-actions">${v.choices
            .map((f) => `<button type="button" class="pbtn pbtn-sm${f === v.form ? " pbtn-blue" : ""}" data-action="evolve_choose" data-form="${esc(f)}"${f === v.form ? ' aria-pressed="true"' : ""}>${esc(t.forms[f])}</button>`)
            .join("")}</div>`
        : `<p class="app-hint">${esc(t.choosePath)}</p>`;

  const mems = v.memories.length
    ? `<ol class="pt-mems">${v.memories
        .map((m) => `<li class="${m.locked ? "pt-locked" : ""}"><span class="mono app-dim">${esc(localDay(m.at))}</span> <span>${esc(m.locked ? t.memoryLocked : t.memory(m, t.forms))}</span></li>`)
        .join("")}</ol>${tier === "pro" ? "" : `<p class="app-hint">${esc(t.memoriesFree(Math.min(3, v.memoriesTotal), v.memoriesTotal))}</p>`}`
    : `<p class="app-hint">${esc(t.noMemories)}</p>`;
  const lore = t.lore
    .map((l) => {
      const r = v.rewards.find((x) => x.reward === l.id);
      return r?.open
        ? `<details class="pt-lore"><summary>${esc(l.title)}</summary><p>${esc(l.body)}</p></details>`
        : `<p class="pt-lore pt-unknown">??? <span class="app-hint">${esc(t.loreLocked(r?.level ?? 0))}</span></p>`;
    })
    .join("");

  const xp = card("xp.txt", "", xpRulesHtml(lang));
  const skill = card(t.skillTitle, "bar-idle", `<div class="sk-wrap">${skillTreeSvg(t, v, selected)}<div class="sk-tip" role="tooltip" hidden></div></div>${skillLegend(t)}${skillDetail(t, v, selected)}${next}${pick}`, "pt-skill");
  return `<section class="pt-page">${skill}<div class="app-home pt">
    <div class="app-side">
      ${card("dunno.card", "bar-blue", head)}
      ${card("mood.txt", "bar-idle", mood)}
      ${card("traits.txt", "", traits + fav)}
    </div>
    <div class="app-side">
      ${card("memories.log", "", mems)}
      ${xp}
      ${card(t.loreTitle, "bar-idle", lore + `<p class="app-dim">${esc(t.privacyNote)}</p>`)}
    </div>
  </div></section>`;
}

/** FB6: level sistemi açıkça: xp nereden gelir, günlük tavan (spam ile level kasılmaz) */
export function xpRulesHtml(lang: Lang): string {
  const t = COMPANION_STRINGS[lang];
  const rows = (Object.keys(t.xpSources) as (keyof typeof t.xpSources)[])
    .map((k) => {
      const [each, cap] = XP_TABLE[k];
      return `<li><span>${esc(t.xpSources[k])}</span><span class="mono">+${each}</span><span class="app-dim">${esc(Number.isFinite(cap) ? t.xpCap(cap) : "")}</span></li>`;
    })
    .join("");
  return `<p class="app-hint">${esc(t.xpIntro)}</p><ul class="pt-xprules">${rows}</ul>`;
}

/** FB6: kilitli sekme sayfası: hangi level, şu an kaç, ilerleme ve xp yolları */
export function lockedTabHtml(lang: Lang, file: string, need: number, v: CompanionView | undefined): string {
  const t = COMPANION_STRINGS[lang];
  const level = v?.level ?? 1;
  const pct = Math.round(Math.min(1, level / need) * 100);
  const body = `<p class="app-big">${esc(t.tabLocked(need))}</p>
    <p>${esc(t.tabLockedNow(level, need - level))}</p>
    <div class="pt-xp" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span class="st-fill-h" style="width:${pct}%"></span></div>
    <p class="app-hint">${esc(t.tabLockedPro)}</p>
    <div class="app-actions"><button type="button" class="pbtn pbtn-sm" data-goto="pet">${esc(t.tabLockedTree)}</button></div>`;
  return `<section class="pt-page pt-lockpage">${card(file, "bar-idle", body)}${card("xp.txt", "", xpRulesHtml(lang))}</section>`;
}
