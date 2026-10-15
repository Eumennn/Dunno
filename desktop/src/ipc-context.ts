// Bağlam ve toplantı olayları (karşılığı: src-tauri/src/watch.rs). Yükler sadece etiket ve bool taşır;
// exe yolu ve pencere başlığı asla gelmez (SPEC 09 K7b: başlık Rust'ta kategoriye çevrilir, buraya sadece "site" gelir).
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export const EVENT_CONTEXT = "context://changed";
export const EVENT_MEETING = "meeting://state";

/** `context://changed`: app / idle eşiği / pil eşiği / saat dilimi değişince gelir. */
export interface ContextPayload {
  /** "excel", "vscode", "browser", "zoom" ...; tanınmayan uygulamada null */
  app: string | null;
  idleTrigger: "idle:10" | "idle:30" | "idle:60" | null;
  batteryTrigger: "battery:low" | null;
  timeTrigger: "time:morning" | "time:noon" | "time:evening" | "time:night" | "time:late_night";
  /** öndeki sekme/pencere başlığının site kategorisi (SPEC 09 K7b, content/context/sites.json); ayar kapalıysa null */
  site?: string | null;
  /** sessiz kategori (adult/kumar): o pencere öndeyken hiç laf yok */
  siteSilent?: boolean;
}

/** `meeting://state`: sadece değişince (ve açılışta bir kez) gelir. */
export interface MeetingPayload {
  inMeeting: boolean;
}

/** get_watch_state: son yayınlanan durum; ilk okumadan önce inMeeting true (güvenli taraf). */
export interface WatchState {
  context: ContextPayload | null;
  inMeeting: boolean;
}

export function onContextChanged(cb: (c: ContextPayload) => void): Promise<UnlistenFn> {
  return listen<ContextPayload>(EVENT_CONTEXT, (e) => cb(e.payload));
}

export function onMeetingState(cb: (m: MeetingPayload) => void): Promise<UnlistenFn> {
  return listen<MeetingPayload>(EVENT_MEETING, (e) => cb(e.payload));
}

/** Tray'deki "toplantıdayım" anahtarı; ≤1 sn içinde meeting://state olarak döner. */
export function setManualMeeting(on: boolean): Promise<void> {
  return invoke("set_manual_meeting", { on });
}

/** settings.exe "sekme adlarına bak" (SPEC 09 K7b): kapalıyken Rust başlığı hiç okumaz. */
export function setTabTitles(on: boolean): Promise<void> {
  return invoke("set_tab_titles", { on });
}

/** Webview olaylardan sonra yüklenirse ilk durumu kaçırmasın diye: dinleyiciyi kurduktan sonra çağır. */
export function getWatchState(): Promise<WatchState> {
  return invoke("get_watch_state");
}

/** Bağlamdan laf motoru trigger'ları (LineEngine.pick'e verilecek aktif liste). */
export function contextTriggers(c: ContextPayload | null): string[] {
  if (!c) return [];
  const out: string[] = [];
  // site > app (motor önceliği); sessiz kategoride trigger yok, talker zaten bastırır
  if (c.site && !c.siteSilent) out.push(`site:${c.site}`);
  if (c.app) out.push(`app:${c.app}`);
  out.push(c.timeTrigger);
  if (c.idleTrigger) out.push(c.idleTrigger);
  if (c.batteryTrigger) out.push(c.batteryTrigger);
  return out;
}

/** FB8 `media://now`: çalan müziğin özeti (metin yok); kapalıyken / bilgi yokken null */
export function onMediaNow(cb: (m: { app: string | null; playing: boolean; track: number } | null) => void): Promise<UnlistenFn> {
  return listen<{ app: string | null; playing: boolean; track: number } | null>("media://now", (e) => cb(e.payload));
}

/** settings.exe "müziğe tepki": kapalıyken Rust medyayı hiç sorgulamaz */
export function setMusicWatch(on: boolean): Promise<void> {
  return invoke("set_music_watch", { on });
}
