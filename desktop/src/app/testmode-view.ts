// settings.exe "test modu" bölümü (SPEC 07 FB2, saf HTML): sadece mod açıkken görünür. Metinler devmode/strings.ts.
// Düğmeler data-test ile app/main.ts'e gider; pet penceresi (tek yazan) uygular.
import { esc } from "@ui-kit/kit";
import { EDGE_TARGETS } from "../devmode/edges";
import { TESTMODE_STRINGS, triggerLabel } from "../devmode/strings";
import type { UiStrings } from "../i18n";
import type { AppStatus } from "../ipc-app";
import { ACHIEVEMENTS } from "../wardrobe/achievements";
import { SIZE_LABELS } from "../size/size";

const btn = (attrs: string, label: string, disabled = false) =>
  `<button type="button" class="pbtn pbtn-sm" ${attrs}${disabled ? " disabled" : ""}>${esc(label)}</button>`;

export function testModeHtml(t: UiStrings, s: AppStatus): string {
  if (!s.testMode.on) return "";
  const x = TESTMODE_STRINGS[s.lang];
  const done = new Set(s.wardrobe?.achievements.filter((a) => a.done).map((a) => a.id) ?? []);
  const triggers = ACHIEVEMENTS.map((a) => {
    const name = t.achievements[a.id]?.title ?? a.id;
    return done.has(a.id)
      ? btn(`data-test="trigger" data-id="${a.id}"`, `${name}: ${x.triggered}`, true)
      : btn(`data-test="trigger" data-id="${a.id}"`, triggerLabel(s.lang, name));
  }).join("");
  const edges = EDGE_TARGETS.map((e) => btn(`data-test="edge" data-target="${e}"`, x.edges[e])).join("");
  const tempoOn = !s.testMode.tempoOff;
  return `<section class="win app-card app-test">
    <div class="bar bar-err"><span>${esc(x.title)}</span></div>
    <div class="app-pad">
      <p class="app-dim">${esc(x.note)}</p>
      <p class="app-label">${esc(x.triggerTitle)}</p>
      <div class="app-btns">${triggers}</div>
      <div class="app-btns">
        ${btn(`data-test="reset_quota"`, x.resetQuota)}
        ${btn(`data-test="tempo" data-on="${!tempoOn}"`, tempoOn ? x.tempoOn : x.tempoOff)}
        ${btn(`data-test="meeting" data-on="${!s.manualMeeting}"`, s.manualMeeting ? x.meetingEnd : x.meetingStart)}
        ${btn(`data-test="size_next"`, t.sizeNext(SIZE_LABELS[s.lang][s.size] ?? String(s.size)))}
        ${btn(`data-test="fart"`, t.testFart)}
      </div>
      <div class="app-btns">${(["wave", "jump", "dance", "yawn", "sneeze"] as const).map((a) => btn(`data-test="anim" data-anim="${a}"`, a)).join("")}</div>
      <p class="app-label">${esc(x.sendTitle)}</p>
      <div class="app-btns">${edges}</div>
      <div class="app-btns">${btn(`data-test="pro" data-on="${!s.testMode.proSim}"`, s.testMode.proSim ? x.proSimOff : x.proSimOn)}</div>
      <div class="app-btns">${btn(`data-test="off"`, x.close)}</div>
    </div>
  </section>`;
}
