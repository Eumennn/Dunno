// dunno.exe görünümleri (saf HTML üreticileri): landing'in pencere dili, ui-kit sınıflarıyla.
// Sekmeler landing'deki pencere başlıkları gibi: home · settings.exe · stats.txt · about.txt
import { COMPANION_STRINGS } from "../companion/strings";
import { petTabHtml } from "../companion/app-view";
import { WORLDS } from "../eggs/eggs";
import { esc, heartsHtml, noPx, segmentedHtml, stepSliderHtml, switchHtml } from "@ui-kit/kit";
import { CONTACT, isMac, LANG_NAMES, SITE_URL, type PetStateName, type UiStrings } from "../i18n";
import { testModeHtml } from "./testmode-view";
import { REMINDER_STRINGS } from "../reminders/strings";
import { whenLabel } from "../reminders/store";
import { SIZE_LABELS } from "../size/size";
import type { AppStatus } from "../ipc-app";
import type { StatsSnapshot } from "../stats/stats";
import { appName, LISTS, NAME_MAX, SLIDER_MAX, SLIDERS, type ListId, type SliderId } from "../personal/profile";
import { BUBBLE_STYLES, bubbleOpen, FREE_MAX_MODS, PERSONALITIES, progression, VOICE_STYLES, voiceOpen, type Reward } from "../pro/entitlements";

export type Tab = "home" | "pet" | "wardrobe" | "workshop" | "settings" | "stats" | "about";
/** SPEC 17: pet.txt (Dunno OS: level, evrim, ilişki, anılar, lore, kart) */
export const TABS: readonly Tab[] = ["home", "pet", "wardrobe", "workshop", "settings", "stats", "about"];


export function tabLabel(tab: Tab, t: UiStrings): string {
  return tab === "home"
    ? t.tabHome
    : tab === "pet"
      ? "pet.txt"
      : tab === "workshop"
        ? "workshop.exe"
        : tab === "wardrobe"
      ? "wardrobe.exe"
      : tab === "settings"
        ? "settings.exe"
        : tab === "stats"
          ? "stats.txt"
          : "about.txt";
}

const CTL = (label: string, path: string) =>
  `<button type="button" class="ctl" data-ctl="${label}" aria-label="${label}"><svg viewBox="0 0 12 12" width="12" height="12" shape-rendering="crispEdges" aria-hidden="true"><path d="${path}" stroke-width="2"></path></svg></button>`;

/** Pencere çerçevesi: başlık çubuğu (sürüklenir) + sekmeler + gövde. */
export function frameHtml(t: UiStrings, tab: Tab, bodyHtml: string, locked: ReadonlyMap<Tab, number> = new Map(), asideHtml?: string): string {
  // klavye: aktif sekme tab sırasında, diğerleri ok tuşlarıyla (roving tabindex)
  // FB6: kilitli sekme görünür (ne zaman açılacağı yazar), tıklanınca kilit sayfası; uzantı (.exe/.txt) dar pencerede gizlenir
  const tabs = TABS.map((x) => {
    const lv = locked.get(x);
    const name = tabLabel(x, t);
    const dot = name.lastIndexOf(".");
    const text = dot > 0 ? `${esc(name.slice(0, dot))}<span class="app-tab-ext">${esc(name.slice(dot))}</span>` : esc(name);
    return `<button type="button" tabindex="${x === tab ? 0 : -1}" class="app-tab${x === tab ? " app-tab-on" : ""}${lv ? " app-tab-locked" : ""}${noPx(name)}" role="tab" aria-selected="${x === tab}" data-tab="${x}"${lv ? ` aria-label="${esc(name)} · lv ${lv}"` : ""}>${text}${lv ? `<span class="app-tab-lv" aria-hidden="true">lv ${lv}</span>` : ""}</button>`;
  }).join("");
  return `<div class="win app-win">
    <div class="bar app-bar" data-drag><span>dunno.exe</span><span class="app-ctls">${CTL("minimize", "M3 9h6")}${CTL("maximize", "M2 3h8M2 9h8M3 3v6M9 3v6")}${CTL("close", "M3 3l6 6M9 3l-6 6")}</span></div>
    <nav class="app-tabs" role="tablist">${tabs}</nav>
    <div class="app-bodywrap${asideHtml ? " has-aside" : ""}">${asideHtml ? `<aside class="app-aside">${asideHtml}</aside>` : ""}<main class="app-body" role="tabpanel">${bodyHtml}</main></div>
  </div>`;
}

/** FB4-3: etiketler tek tip (gövde fontu; piksel font Türkçe harf çizemediği için karışık görünüyordu) */
const label = (text: string) => `<span class="app-label">${esc(text)}</span>`;

/** Ayar satırı: etiket (+ açıklama) solda, kontrol sağda; dar pencerede alta kırılır. */
const row = (text: string, control: string, hint?: string) =>
  `<div class="app-row"><div class="app-row__text">${label(text)}${hint ? `<p class="app-hint">${esc(hint)}</p>` : ""}</div><div class="app-row__ctl">${control}</div></div>`;

/** settings.exe bölüm başlığı (UX-01): davranış, görünüm, gizlilik, sistem. */
const group = (title: string, key = "") => `<h3 class="app-group" data-group="${esc(key)}">${esc(title)}</h3>`;

/**
 * FB4-3: settings.exe bölümleri kart (diğer sekmelerle aynı pencere dili): her `app-group` başlığından sonraki satırlar bir kutuda,
 * başlık çubuğunda dosya adı (behavior.cfg ...), kutunun içinde yerelleştirilmiş başlık.
 */
export function cardify(html: string): string {
  return html
    .split(/(?=<h3 class="app-group")/)
    .map((chunk) => {
      const m = /^<h3 class="app-group" data-group="([^"]*)">([^<]*)<\/h3>/.exec(chunk);
      if (!m) return chunk.trim() ? `<div class="set-loose">${chunk}</div>` : "";
      const body = chunk.slice(m[0].length);
      return `<section class="win app-card set-card" aria-label="${m[2]}"><div class="bar"><span>${m[1] || "settings"}.cfg</span></div>
        <div class="app-pad set-pad"><h3 class="set-title">${m[2]}</h3>${body}</div></section>`;
    })
    .join("");
}

/** Anahtar satırı (ui-kit piksel anahtar + açıklama). */
const switchRow = (name: string, text: string, on: boolean, hint: string) => row(text, switchHtml(name, on, text), hint);

/** SPEC 19 M4: macOS Erişilebilirlik izni durumu (app/main.ts sorar). null: Mac değil ya da henüz bilinmiyor, satır yok. */
let macAx: "granted" | "missing" | null = null;
export const setMacAx = (v: "granted" | "missing" | null): void => {
  macAx = v;
};

function macAxRow(t: UiStrings, s: AppStatus): string {
  if (macAx === null || !s.tabTitles) return "";
  const ctl =
    macAx === "granted"
      ? `<span class="mono">${esc(t.settingsMacAxOn)}</span>`
      : `<button type="button" class="pbtn pbtn-blue pbtn-sm" data-action="ax_request">${esc(t.settingsMacAxGrant)}</button>`;
  return row(t.settingsMacAx, ctl, t.settingsMacAxHint);
}

export function stateName(t: UiStrings, state: string): string {
  return (t.stateNames as Record<string, string>)[state] ?? state;
}

/** today.txt'teki laf sayısı (stats snapshot.today.lines); stats yüklenmediyse null. */
export function linesToday(s: AppStatus): number | null {
  return s.stats ? s.stats.today.lines : null;
}

/** SPEC 17: ana sayfada level + form + ilişki özeti; pet.txt'ye götürür (final ürün: ana ekranda gelişim görünsün) */
function companionLine(s: AppStatus): string {
  const v = s.companion;
  if (!v) return "";
  const c = COMPANION_STRINGS[s.lang];
  return `<button type="button" class="app-lvl" data-goto="pet"><span><span class="mono">${esc(c.level)} ${v.level}</span> · ${esc(c.forms[v.form])} · ${esc(c.bonds[v.bond])}</span><span class="app-lvl-bar"><span style="width:${Math.round(v.xp.ratio * 100)}%"></span></span></button>`;
}

/** FB6 ilk 10 dakika: yapılacak beş küçük şey (bitince kart kaybolur) */
function firstStepsHtml(s: AppStatus): string {
  const f = s.companion?.firstSteps;
  if (!f) return "";
  const c = COMPANION_STRINGS[s.lang];
  const done = f.filter((x) => x.done).length;
  const items = f
    .map((x) => `<li class="fs-item${x.done ? " fs-done" : ""}"><span class="fs-box" aria-hidden="true">${x.done ? "x" : ""}</span><span>${esc(c.firstShort[x.step])}</span></li>`)
    .join("");
  return `<div class="win app-card fs-card"><div class="bar bar-blue"><span>${esc(c.firstTitle)}</span><span class="fs-count mono">${done}/${f.length}</span></div>
    <div class="app-pad"><ol class="fs-list" aria-label="${esc(c.firstTitle)}">${items}</ol></div></div>`;
}

/** FB7 alarms.txt: kurulu alarmlar (ask.exe'den kurulur), sil düğmesi */
function remindersHtml(s: AppStatus): string {
  const rs = REMINDER_STRINGS[s.lang];
  const list = s.reminders ?? [];
  const now = new Date();
  const rows = list.length
    ? `<ul class="rm-list">${list
        .map((r) => `<li><span class="mono">${esc(whenLabel(new Date(r.at), now, s.lang))}</span><span class="rm-label">${esc(r.label || "-")}</span><button type="button" class="pbtn pbtn-sm" data-action="reminder_delete" data-id="${esc(r.id)}">${esc(rs.remove)}</button></li>`)
        .join("")}</ul>`
    : `<p class="app-hint">${esc(rs.empty)}</p>`;
  return `<div class="win app-card"><div class="bar bar-idle"><span>${esc(rs.card)}</span></div><div class="app-pad">${rows}<p class="app-dim">${esc(rs.hint)}</p></div></div>`;
}

/** FB6: bir haftadan sonra bir kez sorulan sayaç izni (varsayılan kapalı kalır; cevap ne olursa olsun kart bir daha gelmez) */
function telemetryAskHtml(t: UiStrings, s: AppStatus): string {
  if (!s.telemetryAsk) return "";
  return `<div class="win app-card"><div class="bar bar-idle"><span>numbers.txt</span></div><div class="app-pad">
    <p>${esc(t.telemetryAskText)}</p>
    <div class="app-actions"><button type="button" class="pbtn pbtn-sm" data-action="telemetry_answer" data-value="false">${esc(t.telemetryAskNo)}</button><button type="button" class="pbtn pbtn-blue pbtn-sm" data-action="telemetry_answer" data-value="true">${esc(t.telemetryAskYes)}</button></div>
  </div></div>`;
}

export function homeHtml(t: UiStrings, s: AppStatus, preview: string = s.state): string {
  return `<section class="app-home">
    <div class="win app-card app-stagecard"><div class="bar bar-blue"><span>now.txt</span></div>
      <div class="app-stage"><canvas id="app-pet" aria-hidden="true"></canvas>
        <p class="app-now"><span class="kick">${esc(t.homeNow)}</span> ${esc(s.inMeeting ? t.homeHiding : stateName(t, preview as PetStateName))}</p>
        ${companionLine(s)}
      </div>
    </div>
    <div class="app-side">
      ${firstStepsHtml(s)}
      ${telemetryAskHtml(t, s)}
      ${remindersHtml(s)}
      <div class="win app-card"><div class="bar bar-idle"><span>today.txt</span></div>
        <div class="app-pad">
          ${heartsHtml(s.left, s.total, t.heartsLabel(s.left))}
          <p class="app-big">${esc(t.homeQuestionsLeft(s.left, s.total))}</p>
          <p class="app-dim">${esc(t.homeAfterLimit)}</p>
          <p class="app-dim">${esc(t.todayResets)} · ${esc(t.todayLines(linesToday(s)))}</p>
          <p class="app-dim">${esc(t.homeMode)}: ${esc(s.mode === "street" ? t.modeStreet : t.modePolite)} · ${esc(t.homeLang)}: ${esc(LANG_NAMES[s.lang])}</p>
          ${s.inMeeting ? `<p class="app-dim">${esc(t.homeInMeeting)}</p>` : ""}
        </div>
      </div>
      <div class="win app-card"><div class="bar"><span>quiet.exe</span></div>
        <div class="app-pad app-switches">
          ${switchRow("mute_today", t.homeMuteToday, s.muted, t.homeMuteHint)}
          ${switchRow("meeting", t.homeMeeting, s.manualMeeting, t.homeMeetingHint)}
          ${switchRow("voice", t.settingsVoice, s.voice ?? true, t.settingsVoiceHint)}
        </div>
      </div>
      <div class="app-actions">
        <button type="button" class="pbtn pbtn-blue pbtn-sm" data-action="summon">${esc(t.homeSummon)}</button>
        <button type="button" class="pbtn pbtn-sm" data-action="send_edge">${esc(t.homeSendToEdge)}</button>
      </div>
    </div>
  </section>`;
}

/** FB4-2: 0..100 sürekli kaydırıcı (klavyede ok = 1, PageUp/Down = 10); değer yanında. Bırakınca "change" ile uygulanır. */
export function rangeHtml(name: string, value: number, lo: string, hi: string): string {
  const v = Math.round(Math.min(100, Math.max(0, value)));
  return `<div class="step range" data-slider-group="${esc(name)}">
    <input type="range" class="step-range" min="0" max="100" step="1" value="${v}" data-slider="${esc(name)}" aria-label="${esc(name)}" aria-valuetext="${v}" />
    <div class="step-ticks"><span>${esc(lo)}</span><span class="mono range-value" data-range-value="${esc(name)}">${v}</span><span>${esc(hi)}</span></div>
  </div>`;
}

/** settings.exe modlar satırı (SPEC 12 B): app/main.ts'in okuyup doğruladığı mod klasörü. */
export interface ModRow {
  dir: string;
  /** geçerliyse mod bilgisi; değilse null + hatalar */
  mod: { id: string; name: string; version: string; author: string; description: string } | null;
  errors: string[];
}

/** SPEC 15: Free'de modun atlanan kısmı ya da sınır notu. */
const blockedNote = (t: UiStrings, b: string[] | undefined) => (!b ? "" : b[0] === "limit" ? t.modsLimit(FREE_MAX_MODS) : t.modsProKinds(b.join(", ")));

/** Modlar bölümü: geçerli modlar aç/kapa (varsayılan kapalı), geçersizler sebebiyle, klasör + yeniden başlat. */
export function modsHtml(t: UiStrings, s: AppStatus, mods: readonly ModRow[]): string {
  const want = s.mods ?? {};
  const active = new Set(s.modsActive ?? []);
  const rows = mods
    .map((m) =>
      m.mod
        ? switchRow(`mod:${m.mod.id}`, `${m.mod.name} ${m.mod.version}`, want[m.mod.id] === true, [t.modsBy(m.mod.author, m.mod.description), blockedNote(t, s.modsBlocked?.[m.mod.id])].filter(Boolean).join(" · "))
        : row(m.dir, `<span class="app-hint">${esc(t.modsInvalid)}</span>`, m.errors.slice(0, 3).join(" · ")),
    )
    .join("");
  const pending = mods.some((m) => m.mod && (want[m.mod.id] === true) !== active.has(m.mod.id));
  return `${group(t.settingsGroups.mods, "mods")}
    <p class="app-hint">${esc(t.modsHint)}</p>
    ${rows || `<p class="app-hint">${esc(t.modsEmpty)}</p>`}
    <div class="app-actions">
      <button type="button" class="pbtn pbtn-sm" data-action="mods_open">${esc(t.modsOpen)}</button>
      ${pending ? `<button type="button" class="pbtn pbtn-blue pbtn-sm" data-action="restart">${esc(t.modsRestart)}</button>` : ""}
    </div>
    ${pending ? `<p class="app-hint">${esc(t.modsPending)}</p>` : ""}`;
}

/** açılan başarım sayısı (SPEC 15 ilerleme) */
export const doneCount = (s: AppStatus) => s.wardrobe?.achievements.filter((a) => a.done).length ?? 0;

const rewardName = (t: UiStrings, r: Reward) =>
  r.kind === "bubble" ? `${t.settingsBubbleStyle} ${t.bubbleStyles[r.id]}` : r.kind === "voice" ? `${t.settingsVoiceStyle} ${t.voiceStyles[r.id]}` : t.rewardMonster;

/** Sıradaki ilerleme ödülü satırı (az seçenekle başlar, başarımla açılır). */
export function progressHint(t: UiStrings, s: AppStatus): string {
  const done = doneCount(s);
  const n = progression(done).next;
  return n ? t.progressNext(rewardName(t, n.reward), n.at, done) : t.progressAll;
}

/** Balon + ses stili (SPEC 15): sadece açılan seçenekler görünür (FB6: görünüm ve ses kategorilerine ayrıldı). */
export function bubbleStyleHtml(t: UiStrings, s: AppStatus): string {
  const bubbles = BUBBLE_STYLES.filter((b) => bubbleOpen(doneCount(s), b));
  const bubble = bubbles.includes(s.bubbleStyle ?? "classic") ? (s.bubbleStyle ?? "classic") : "classic";
  return row(t.settingsBubbleStyle, segmentedHtml("bubble_style", bubbles.map((b) => ({ value: b, label: t.bubbleStyles[b] })), bubble), progressHint(t, s));
}
export function voiceStyleHtml(t: UiStrings, s: AppStatus): string {
  const voices = VOICE_STYLES.filter((v) => voiceOpen(doneCount(s), v));
  const voice = voices.includes(s.voiceStyle ?? "classic") ? (s.voiceStyle ?? "classic") : "classic";
  return row(t.settingsVoiceStyle, segmentedHtml("voice_style", voices.map((v) => ({ value: v, label: t.voiceStyles[v] })), voice), progressHint(t, s));
}
export const stylesHtml = (t: UiStrings, s: AppStatus): string => bubbleStyleHtml(t, s) + voiceStyleHtml(t, s);

/** Pro bölümü (SPEC 15): durum, ne içerir, lisans anahtarı (lisans sistemi açıksa), kişilik (Pro). */
export function proHtml(t: UiStrings, s: AppStatus, ui: { key: string; msg: string | null; order?: string; email?: string } = { key: "", msg: null }): string {
  const p = s.pro ?? { tier: "free", enabled: false, tail: null, sim: false };
  const status = p.sim ? t.proSim : p.tier === "pro" && p.tail ? t.proOn(p.tail) : t.proFree;
  const licensed = p.tier === "pro" && !!p.tail;
  const key = !p.enabled
    ? `<p class="app-hint">${esc(t.proDisabled)}</p>`
    : licensed
      ? `<div class="app-actions"><button type="button" class="pbtn pbtn-sm" data-action="pro_remove">${esc(t.proRemove)}</button></div>`
      : `<p class="app-label">${esc(t.proClaimTitle)}</p>
        <div class="pro-claim"><label class="app-field"><span class="app-hint">${esc(t.proOrder)}</span>
          <input id="pro-order" class="field mono" type="text" inputmode="numeric" spellcheck="false" autocomplete="off" maxlength="24" value="${esc(ui.order ?? "")}" /></label>
        <label class="app-field"><span class="app-hint">${esc(t.proEmail)}</span>
          <input id="pro-email" class="field" type="email" spellcheck="false" autocomplete="off" maxlength="254" value="${esc(ui.email ?? "")}" /></label></div>
        <div class="app-actions"><button type="button" class="pbtn pbtn-blue pbtn-sm" data-action="pro_claim">${esc(t.proClaim)}</button></div>
        <label class="app-field"><span class="app-hint">${esc(t.proKeyLabel)}</span>
          <input id="pro-key" class="field mono" type="text" spellcheck="false" autocomplete="off" maxlength="1024" value="${esc(ui.key)}" />
        </label>
        <div class="app-actions"><button type="button" class="pbtn pbtn-sm" data-action="pro_activate">${esc(t.proActivate)}</button></div>`;
  const sub = p.until ? `<p class="app-hint">${esc(p.expired ? t.proExpired : t.proUntil(p.until))}</p>` : "";
  const pro = p.tier === "pro";
  const personality = row(
    `${t.settingsPersonality}${pro ? "" : ` · ${t.proOnly}`}`,
    segmentedHtml("personality", PERSONALITIES.map((x) => ({ value: x, label: t.personalities[x] })), pro ? (s.personality ?? "balanced") : "balanced"),
    t.personalityHint,
  );
  return `${group(t.settingsGroups.pro, "pro")}
    ${row(t.proStatus, `<span class="app-big">${esc(p.tier)}</span>`, status)}
    ${sub}
    <p class="app-hint">${esc(t.proWhat)}</p>
    ${key}
    ${ui.msg ? `<p class="app-hint" role="status">${esc(ui.msg)}</p>` : ""}
    <div class="${pro ? "" : "app-locked"}">${personality}</div>`;
}

/** settings.exe kişisel dunno formu (SPEC 16): yeniden çizimde kaybolmasın diye dunno.exe belleğinde (store'a ancak "kaydet" ile, pet penceresi yazar). */
export interface PersonalForm {
  consent: boolean;
  name: string;
  lists: Record<ListId, string>;
  sliders: Record<SliderId, number>;
  dirty: boolean;
  msg: string | null;
}

/** Kişisel Dunno (SPEC 16): Pro + açık rıza; ne kullanıp ne kullanmadığı her zaman yazılı. */
export function personalHtml(t: UiStrings, s: AppStatus, f: PersonalForm): string {
  const what = `<ul class="app-list-plain">${t.personalWhat.map((x) => `<li class="app-hint">${esc(x)}</li>`).join("")}</ul>`;
  const head = `${group(t.settingsGroups.personal, "personal")}${what}`;
  const pro = s.pro?.tier === "pro";
  const p = s.personal;
  if (!pro) return `${head}<p class="app-hint">${esc(t.personalProOnly)}</p>`;
  if (!p?.on) {
    return `${head}
      <label class="app-check"><input type="checkbox" id="personal-consent"${f.consent ? " checked" : ""} /> <span>${esc(t.personalConsent)}</span></label>
      <div class="app-actions"><button type="button" class="pbtn pbtn-blue pbtn-sm" data-action="personal_on"${f.consent ? "" : " disabled"}>${esc(t.personalOn)}</button></div>`;
  }
  const rej = (key: string) => {
    const hits = Object.entries(p.rejected ?? {}).filter(([k]) => k === key || k.startsWith(`${key}.`));
    return hits.length ? `<p class="app-hint" role="status">${esc(t.personalRejected[hits[0][1] as keyof UiStrings["personalRejected"]])}</p>` : "";
  };
  const field = (id: string, label: string, value: string, max: number, hint?: string) => `<label class="app-field"><span class="app-hint">${esc(label)}</span>
      <input id="${id}" class="field" type="text" spellcheck="false" autocomplete="off" maxlength="${max}" value="${esc(value)}" />${hint ? `<span class="app-hint">${esc(hint)}</span>` : ""}</label>`;
  const lists = LISTS.map((id) => field(`ps-${id}`, t.personalFields[id], f.lists[id], 400, t.personalListHint) + rej(id)).join("");
  const sliders = SLIDERS.map((id) => {
    const [lo, hi] = t.personalSliders[id];
    const opts = Array.from({ length: SLIDER_MAX + 1 }, (_, i) => ({ value: String(i), label: i === 0 ? lo : i === SLIDER_MAX ? hi : "·" }));
    return row(`${lo} / ${hi}`, stepSliderHtml(`ps_${id}`, opts, String(f.sliders[id])));
  }).join("");
  return `${head}
    <p class="app-hint">${esc(t.personalSince(p.consentAt ? p.consentAt.slice(0, 10) : ""))}</p>
    ${field("ps-preferred_name", t.personalFields.preferred_name, f.name, NAME_MAX)}${rej("preferred_name")}
    ${lists}
    ${sliders}
    <div class="app-actions">
      <button type="button" class="pbtn pbtn-blue pbtn-sm" data-action="personal_save">${esc(t.personalSave)}</button>
      <button type="button" class="pbtn pbtn-sm" data-action="personal_off">${esc(t.personalForget)}</button>
    </div>
    ${f.msg ? `<p class="app-hint" role="status">${esc(f.msg)}</p>` : ""}`;
}

/** Gizli bölüm (SPEC 14): sadece bir dünya açıldıysa ya da canavar bulunduysa görünür. */
export function eggsHtml(t: UiStrings, s: AppStatus): string {
  const e = s.eggs;
  if (!e || (!e.worlds.length && !e.monsterFound)) return "";
  const worlds = ["normal", ...e.worlds] as (keyof UiStrings["eggWorldNames"])[];
  return `${group(t.settingsGroups.secret, "secret")}
    ${e.worlds.length ? row(t.eggWorld, segmentedHtml("egg_world", worlds.map((w) => ({ value: w, label: t.eggWorldNames[w] })), e.world), t.eggWorldHint) : ""}
    ${e.monsterFound ? switchRow("monster", t.eggMonster, e.monster, t.eggMonsterHint) : ""}`;
}

/** FB6: settings.exe kategorileri (soldaki menü); "all" sadece testlerde/eski çağrıda hepsini tek sayfada çizer */
export const SET_CATS = ["general", "look", "sound", "privacy", "pro", "mods"] as const;
export type SetCat = (typeof SET_CATS)[number];

function setNavHtml(t: UiStrings, cat: SetCat): string {
  const items = SET_CATS.map(
    (c) =>
      `<button type="button" class="set-nav__item${c === cat ? " set-nav__on" : ""}" role="tab" aria-selected="${c === cat}" tabindex="${c === cat ? 0 : -1}" data-setcat="${c}"><span class="set-nav__name">${esc(t.setCats[c].name)}</span><span class="set-nav__hint">${esc(t.setCats[c].hint)}</span></button>`,
  ).join("");
  return `<nav class="set-nav" role="tablist" aria-orientation="vertical" aria-label="settings.exe">${items}</nav>`;
}

export function settingsHtml(
  t: UiStrings,
  s: AppStatus,
  mods: readonly ModRow[] = [],
  pro?: { key: string; msg: string | null },
  personal?: PersonalForm,
  cat: SetCat | "all" = "all",
): string {
  const parts: Record<SetCat, () => string> = {
    general: () => `
    ${group(t.settingsGroups.behavior, "behavior")}
    ${row(t.settingsMode, segmentedHtml("mode", [{ value: "polite", label: t.modePolite }, { value: "street", label: t.modeStreet }], s.mode))}
    ${row(t.settingsLang, segmentedHtml("lang", [{ value: "tr", label: LANG_NAMES.tr }, { value: "en", label: LANG_NAMES.en }], s.lang))}
    ${row(t.settingsFrequency, segmentedHtml("frequency", [{ value: "low", label: t.freqLow }, { value: "normal", label: t.freqNormal }, { value: "high", label: t.freqHigh }], s.frequency), t.settingsFrequencyHint)}
    ${switchRow("mute_today", t.settingsMuteToday, s.muted, t.homeMuteHint)}
    ${group(t.settingsGroups.system, "system")}
    ${switchRow("autostart", isMac() ? t.settingsAutostartMac : t.settingsAutostart, s.autostart, t.settingsAutostartHint)}`,
    look: () => `
    ${group(t.settingsGroups.look, "look")}
    ${row(t.settingsSize, rangeHtml("size", s.size, SIZE_LABELS[s.lang][0], SIZE_LABELS[s.lang][100]))}
    ${row(t.settingsDark, segmentedHtml("dark_mode", (["off", "on", "system"] as const).map((v) => ({ value: v, label: t.darkModes[v] })), s.darkMode ?? "off"))}
    ${group(t.settingsGroups.bubble, "bubble")}
    ${row(t.settingsBubble, segmentedHtml("bubble", [{ value: "short", label: t.bubbleShort }, { value: "normal", label: t.bubbleNormal }, { value: "long", label: t.bubbleLong }], s.bubbleSpeed))}
    ${bubbleStyleHtml(t, s)}`,
    sound: () => `
    ${group(t.settingsGroups.sound, "sound")}
    ${switchRow("voice", t.settingsVoice, s.voice ?? true, t.settingsVoiceHint)}
    ${row(t.settingsVoiceVolume, rangeHtml("voice_volume", s.voiceVolume ?? 50, t.voiceVolumes.low, t.voiceVolumes.high))}
    ${voiceStyleHtml(t, s)}
    ${switchRow("fart", t.settingsFart, s.fart, t.settingsFartHint)}`,
    privacy: () => `
    ${group(t.settingsGroups.privacy, "privacy")}
    ${switchRow("tab_titles", t.settingsTabTitles, s.tabTitles, t.settingsTabTitlesHint)}
    ${macAxRow(t, s)}
    ${isMac() ? "" : switchRow("music", t.settingsMusic, s.music ?? false, t.settingsMusicHint)}
    ${switchRow("telemetry", t.settingsTelemetry, s.telemetry, t.settingsTelemetryHint)}
    ${personal ? personalHtml(t, s, personal) : ""}`,
    pro: () => proHtml(t, s, pro),
    mods: () => `${modsHtml(t, s, mods)}${eggsHtml(t, s)}`,
  };
  if (cat === "all") return `<section class="app-list set">${cardify(SET_CATS.map((c) => parts[c]()).join(""))}</section>
  ${testModeHtml(t, s)}`;
  return `<section class="set-split">${setNavHtml(t, cat)}<div class="set-main" role="tabpanel">
    <section class="app-list set">${cardify(parts[cat]())}</section>
    ${cat === "general" ? testModeHtml(t, s) : ""}
  </div></section>`;
}

/** stats.txt (FB4-6): bugün, toplam, son 7 gün çubukları, en çok laf attığı uygulamalar, birlikte geçen süre. Hepsi cihazda. */
export function statsHtml(t: UiStrings, v: StatsSnapshot | null, appLabel: (tag: string) => string = (x) => x): string {
  const n = (x: number | undefined) => (v ? String(x ?? 0) : "-");
  const table = (rows: [string, string][]) =>
    `<table class="app-stats mono">${rows.map(([k, val]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(val)}</td></tr>`).join("")}</table>`;
  const today = table([
    [t.statsAskedToday, n(v?.today.questions)],
    [t.statsPokesToday, n(v?.today.clicks)],
    [t.statsLinesToday, n(v?.today.lines)],
  ]);
  const days = v ? Math.max(1, Math.round((Date.parse(`${v.day}T12:00:00`) - Date.parse(`${v.since}T12:00:00`)) / 86_400_000) + 1) : 0;
  const total = table([
    [t.statsQuestionsTotal, n(v?.total.questions)],
    [t.statsPokes, n(v?.total.clicks)],
    [t.statsDrags, n(v?.total.drags)],
    [t.statsSleep, v ? t.minutes(v.total.sleepMinutes) : "-"],
    [t.statsHonest, n(v?.total.honest)],
    [t.statsFarts, n(v?.total.farts)],
    [t.statsTogether, v ? t.statsDays(days, v.activeDays) : "-"],
    [t.statsTopApp, v ? (v.total.topApp ? appLabel(v.total.topApp) : t.statsNone) : "-"],
  ]);
  // son 7 gün: soru + dürtme + laf toplamı, en yüksek güne göre (düz çubuk, gradyan yok)
  const week = v?.week ?? [];
  const score = (d: { questions: number; clicks: number; lines: number }) => d.questions + d.clicks + d.lines;
  const max = Math.max(1, ...week.map(score));
  const bars = week
    .map((d) => {
      const h = Math.round((score(d) / max) * 100);
      const label = t.weekdays[new Date(`${d.day}T12:00:00`).getDay()];
      return `<div class="st-bar" title="${esc(`${d.day}: ${score(d)}`)}"><span class="st-fill" style="height:${h}%"></span><span class="st-day mono">${esc(label)}</span></div>`;
    })
    .join("");
  const apps = (v?.total.apps ?? []).length
    ? `<ul class="st-apps">${v!.total.apps
        .map((a) => `<li><span>${esc(appLabel(a.app))}</span><span class="st-track"><span class="st-fill-h" style="width:${Math.round((a.n / v!.total.apps[0].n) * 100)}%"></span></span><span class="mono">${a.n}</span></li>`)
        .join("")}</ul>`
    : `<p class="app-hint">${esc(t.statsNone)}</p>`;
  return `<section class="app-home st">
    <div class="app-side">
      <div class="win app-card"><div class="bar bar-blue"><span>today.log</span></div><div class="app-pad">${today}</div></div>
      <div class="win app-card"><div class="bar bar-idle"><span>week.txt</span></div><div class="app-pad">
        ${v ? `<div class="st-week">${bars}</div><p class="app-hint">${esc(t.statsWeekHint)}</p>` : `<p class="app-hint">-</p>`}
      </div></div>
      <div class="win app-card"><div class="bar"><span>apps.txt</span></div><div class="app-pad">${apps}</div></div>
    </div>
    <div class="app-side">
      <div class="win app-card"><div class="bar bar-idle"><span>total.log</span></div><div class="app-pad">${total}
        <p class="app-dim">${esc(t.statsPrivacy)}</p>
        <button type="button" class="pbtn pbtn-sm" data-action="stats_reset">${esc(t.statsReset)}</button>
      </div></div>
    </div>
  </section>`;
}

/** about.txt güncelleme satırı (SPEC 10 CL1): kontrol düğmesi; yeni sürüm varsa sürüm + [ kur ], elle kontrolde güncelse not. */
function updateHtml(t: UiStrings, u: AppStatus["update"]): string {
  const busy = u?.busy ?? false;
  const check = `<button type="button" class="pbtn pbtn-sm" data-action="update_check"${busy ? " disabled" : ""}>${esc(busy ? t.aboutUpdateBusy : t.aboutUpdateCheck)}</button>`;
  const found = u?.available
    ? ` <span class="mono">${esc(t.aboutUpdateAvailable(u.available))}</span> <button type="button" class="pbtn pbtn-blue pbtn-sm" data-action="update_install"${busy ? " disabled" : ""}>${esc(t.aboutUpdateInstall)}</button>`
    : u?.upToDate
      ? ` <span class="app-dim">${esc(t.aboutUpdateNone)}</span>`
      : "";
  const err = u?.error ? ` <span class="app-dim">${esc(t.aboutUpdateError)}: <span class="mono">${esc(u.error)}</span></span>` : "";
  return `<p class="app-update">${check}${found}${err}</p>`;
}

export function aboutHtml(t: UiStrings, version: string, update?: AppStatus["update"]): string {
  const privacy = t.aboutPrivacy.map((p) => `<li>${esc(p)}</li>`).join("");
  // final ürün düzeni: kimlik kartı (sürüm, güncelleme, karşılama) + gizlilik kartı; dar pencerede alt alta
  return `<section class="app-home about">
    <div class="app-side">
      <div class="win app-card"><div class="bar bar-blue"><span>about.txt</span></div><div class="app-pad">
        <p class="app-big">dunno <span class="app-dim" data-tap="version">${esc(t.aboutVersion)} ${esc(version)}</span></p>
        <p><span class="hl">the ai that teaches you nothing.</span></p>
        ${updateHtml(t, update)}
        <p class="app-actions"><button type="button" class="pbtn pbtn-sm" data-action="welcome">${esc(t.aboutWelcome)}</button><button type="button" class="pbtn pbtn-sm" data-action="onboard_restart">${esc(t.aboutFirstSteps)}</button></p>
        <p class="app-dim">${esc(t.aboutSite)}: <span class="mono">${esc(SITE_URL)}</span></p>
        <p class="app-dim">${esc(t.aboutContact)}: <span class="mono">${esc(CONTACT)}</span></p>
      </div></div>
    </div>
    <div class="app-side">
      <div class="win app-card"><div class="bar bar-idle"><span class="${noPx(t.aboutPrivacyTitle)}">${esc(t.aboutPrivacyTitle)}</span></div><div class="app-pad">
        <ul class="app-ul">${privacy}</ul>
      </div></div>
    </div>
  </section>`;
}

export function tabBodyHtml(
  tab: Tab,
  t: UiStrings,
  s: AppStatus,
  version: string,
  preview?: string,
  mods: readonly ModRow[] = [],
  pro?: { key: string; msg: string | null },
  personal?: PersonalForm,
  /** pet.txt yetenek ağacında seçili düğüm */
  petSel: string | null = null,
  /** FB6 settings.exe seçili kategori */
  setCat: SetCat = "general",
): string {
  switch (tab) {
    case "home":
      return homeHtml(t, s, preview);
    case "settings":
      return settingsHtml(t, s, mods, pro, personal, setCat);
    case "stats":
      return statsHtml(t, s.stats, (x) => appName(s.lang, x) ?? x);
    case "pet":
      return petTabHtml(s.lang, s.companion, s.pro?.tier ?? "free", { open: s.eggs?.worlds.length ?? 0, total: WORLDS.length - 1 }, petSel);
    case "about":
      return aboutHtml(t, version, s.update);
    case "workshop":
      return ""; // app/main.ts çizer (app/workshop-controller.ts)
    case "wardrobe":
      return ""; // app/main.ts çizer (wardrobe-view.ts; varlık ve önizleme durumu orada)
  }
}
