// Yetenek ağacı çizimi (SPEC 17, saf SVG): RPG ağacı gibi kök -> üç dal (akıl, beden, ruh) -> düğümler; ruh dalında evrim formları
// dallanır. Açık düğüm dolu (ana renk), şu anki form vurgulu (buz mavisi), kilitli düğüm boş + level, bilinmeyen form "???".
// Renk sadece token (currentColor yok: var(--...) ile); köşeler kare, gradyan/blur yok. Her düğüm odaklanabilir ve seçilebilir.
import { esc } from "@ui-kit/kit";
import { STAGE_LEVELS, type Form } from "./evolution";
import { FORM_NODES, PERKS, ROOT, nextPerk, type PerkId } from "./perks";
import type { CompanionStrings } from "./strings";
import type { CompanionView } from "./view";

const NODE = 28;
/** düğüm altındaki etiketin payı */
const LABEL = 18;

/** dirsekli dal: ebeveynin altından çocuğun üstüne */
function edge(x1: number, y1: number, x2: number, y2: number, open: boolean): string {
  // aynı satırdaki yan dal: düğüm kenarından kenarına düz çizgi
  if (Math.abs(y1 - y2) < 4) {
    const d = `M${x1 + NODE / 2} ${y1}H${x2 - NODE / 2}`;
    return `<path d="${d}" class="sk-edge${open ? " sk-edge-on" : ""}"/>`;
  }
  // etiketin altından başlar, çocuğun üstünde biter (yazının üstünden geçmez)
  const start = y1 + NODE / 2 + LABEL;
  const my = Math.round((start + y2 - NODE / 2) / 2);
  const d = `M${x1} ${start}V${my}H${x2}V${y2 - NODE / 2}`;
  return `<path d="${d}" class="sk-edge${open ? " sk-edge-on" : ""}"/>`;
}

function node(x: number, y: number, cls: string, inner: string, label: string, attrs: string, title: string): string {
  // FB6: yerel <title> ipucu yok (yavaş ve sistem görünümlü); üstüne gelince skillTip balonu çıkar
  return `<g class="sk-node ${cls}" tabindex="0" role="button" ${attrs} aria-label="${esc(title)}">
    <rect x="${x - NODE / 2}" y="${y - NODE / 2}" width="${NODE}" height="${NODE}"/>
    <text x="${x}" y="${y + 4}" class="sk-in">${esc(inner)}</text>
    <text x="${x}" y="${y + NODE / 2 + 13}" class="sk-label">${esc(label)}</text></g>`;
}

export function skillTreeSvg(t: CompanionStrings, v: CompanionView, selected: string | null): string {
  const open = new Set(v.perks.filter((p) => p.open).map((p) => p.id));
  const known = new Set(v.tree.filter((n) => n.known).map((n) => n.form));
  const parts: string[] = [];
  // dallar
  for (const p of PERKS) {
    const parent = p.parent === "root" ? ROOT : PERKS.find((x) => x.id === p.parent)!;
    parts.push(edge(parent.x, parent.y, p.x, p.y, open.has(p.id)));
  }
  const evo = PERKS.find((p) => p.id === "evolve_1")!;
  for (const [f, n] of Object.entries(FORM_NODES) as [Exclude<Form, "dunno">, (typeof FORM_NODES)[keyof typeof FORM_NODES]][]) {
    if (f === "glitchling" && !known.has(f)) continue;
    const from = n.parent === "dunno" ? evo : FORM_NODES[n.parent as Exclude<Form, "dunno">];
    parts.push(edge(from.x, from.y, n.x, n.y, known.has(f)));
  }
  // dal başlıkları + açılan / toplam (FB7)
  for (const [b, x] of [["os", 70], ["mind", 220], ["body", 380], ["soul", 600]] as const) {
    const inBranch = PERKS.filter((p) => p.branch === b);
    const done = inBranch.filter((p) => open.has(p.id)).length;
    parts.push(`<text x="${x - NODE / 2 - 8}" y="114" class="sk-branch">${esc(t.branches[b])}</text>`);
    parts.push(`<text x="${x + NODE / 2 + 8}" y="114" class="sk-count">${done}/${inBranch.length}</text>`);
  }
  // kök: level + bu leveldeki xp çubuğu
  parts.push(node(ROOT.x, ROOT.y, "sk-open sk-root", String(v.level), "dunno", `data-perk="root"`, `dunno · ${t.level} ${v.level}`));
  const barW = 84;
  parts.push(`<rect x="${ROOT.x + NODE / 2 + 10}" y="${ROOT.y - 4}" width="${barW}" height="8" class="sk-xp"/><rect x="${ROOT.x + NODE / 2 + 10}" y="${ROOT.y - 4}" width="${Math.round(barW * v.xp.ratio)}" height="8" class="sk-xp-fill"/>`);
  // düğümler
  const next = nextPerk(v.level);
  for (const p of PERKS) {
    const isOpen = open.has(p.id);
    const cls = `${isOpen ? "sk-open" : "sk-locked"}${next?.id === p.id ? " sk-next" : ""}${selected === p.id ? " sk-sel" : ""}`;
    // FB6: kilitli düğüm de adını gösterir (level zaten kutunun içinde yazıyor)
    const label = t.perks[p.id].name;
    parts.push(node(p.x, p.y, cls, isOpen ? "+" : String(p.level), label, `data-perk="${p.id}"`, `${t.perks[p.id].name} (${t.lockedAt(p.level)}): ${t.perks[p.id].desc}`));
  }
  for (const [f, n] of Object.entries(FORM_NODES) as [Exclude<Form, "dunno">, { x: number; y: number }][]) {
    if (f === "glitchling" && !known.has(f)) continue;
    const isKnown = known.has(f);
    const stageLevel = n.y >= 300 ? STAGE_LEVELS[1] : STAGE_LEVELS[0];
    const cls = `${isKnown ? "sk-open" : "sk-locked"}${v.form === f ? " sk-now" : ""}${selected === f ? " sk-sel" : ""}`;
    parts.push(node(n.x, n.y, cls, isKnown ? "*" : "?", isKnown ? t.forms[f] : t.unknownForm, `data-perk="form:${f}"`, isKnown ? `${t.forms[f]}: ${t.formBlurb[f]}` : `${t.unknownForm} (${t.lockedAt(stageLevel)})`));
  }
  return `<svg class="sk-tree" viewBox="0 0 840 420" role="group" aria-label="${esc(t.skillTitle)}" shape-rendering="crispEdges">${parts.join("")}</svg>`;
}

/** seçili düğümün açıklaması + sıradaki düğüm */
export function skillDetail(t: CompanionStrings, v: CompanionView, selected: string | null): string {
  const next = nextPerk(v.level);
  const nextLine = next ? t.nextPerk(next.level, t.perks[next.id].name) : t.allPerks;
  let body = "";
  if (selected?.startsWith("form:")) {
    const f = selected.slice(5) as Form;
    const known = v.tree.some((n) => n.form === f && n.known);
    body = known ? `<b>${esc(t.forms[f])}</b> · ${esc(t.formBlurb[f])}` : `<b>${esc(t.unknownForm)}</b>`;
  } else if (selected && selected !== "root") {
    const p = PERKS.find((x) => x.id === (selected as PerkId));
    if (p) body = `<b>${esc(t.perks[p.id].name)}</b> · ${esc(t.lockedAt(p.level))} · ${esc(t.perks[p.id].desc)}`;
  }
  return `<p class="sk-detail" aria-live="polite">${body || esc(nextLine)}</p>${body ? `<p class="app-hint">${esc(nextLine)}</p>` : ""}`;
}

/** FB6: düğüm balonu (üstüne gelince / odakta): ne açar, hangi level, kaç level kaldı. Bilinmeyen düğüm yoksa null. */
export function skillTip(t: CompanionStrings, v: CompanionView, id: string): string | null {
  const head = (name: string, state: string, on: boolean) => `<b>${esc(name)}</b><span class="sk-tip-state${on ? " sk-tip-on" : ""}">${esc(state)}</span>`;
  if (id === "root") return `${head("dunno", `${t.level} ${v.level}`, true)}<span>${esc(t.tipXp(v.xp.into, v.xp.need))}</span>`;
  if (id.startsWith("form:")) {
    const f = id.slice(5) as Exclude<Form, "dunno">;
    const n = FORM_NODES[f];
    if (!n) return null;
    const known = v.tree.some((x) => x.form === f && x.known);
    const lvl = n.y >= 300 ? STAGE_LEVELS[1] : STAGE_LEVELS[0];
    return known ? `${head(t.forms[f], t.tipOpen, true)}<span>${esc(t.formBlurb[f])}</span>` : `${head(t.unknownForm, t.tipLocked(lvl, Math.max(0, lvl - v.level)), false)}<span>${esc(t.tipUnknownForm)}</span>`;
  }
  const p = PERKS.find((x) => x.id === id);
  if (!p) return null;
  const open = v.level >= p.level;
  return `${head(t.perks[p.id].name, open ? t.tipOpen : t.tipLocked(p.level, p.level - v.level), open)}<span>${esc(t.perks[p.id].desc)}</span>`;
}

/** FB7: ağacın altındaki gösterge (açık / sıradaki / kilitli / form) */
export function skillLegend(t: CompanionStrings): string {
  const item = (cls: string, text: string) => `<li><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="1" y="1" width="12" height="12" class="sk-sw ${cls}"/></svg>${esc(text)}</li>`;
  return `<ul class="sk-legend">${item("sk-sw-open", t.legend.open)}${item("sk-sw-next", t.legend.next)}${item("sk-sw-locked", t.legend.locked)}${item("sk-sw-now", t.legend.form)}</ul>`;
}
