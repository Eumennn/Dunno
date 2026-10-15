// Müzik tepkileri (FB8, saf): Rust'tan gelen çalan müzik özeti (kaynak etiketi, çalıyor mu, şarkı karması) -> ara sıra bir laf tetiği.
// Şarkı/sanatçı adı hiç gelmez; karmalar sadece bellekte, gün dönünce sıfırlanır, saklanmaz.
export interface MediaNow {
  app: string | null;
  playing: boolean;
  /** 0: bilgi yok */
  track: number;
}

export type MusicTrigger = "interaction:music_repeat" | "interaction:music_skip" | "interaction:music_marathon" | "interaction:music_night";
export const MUSIC_TRIGGERS: readonly MusicTrigger[] = ["interaction:music_repeat", "interaction:music_skip", "interaction:music_marathon", "interaction:music_night"];

/** iki müzik lafı arası en az */
export const MUSIC_COOLDOWN_MS = 20 * 60_000;
/** aynı şarkı bugün bu kaçıncı kez başlıyorsa "repeat" */
export const REPEAT_AT = 3;
/** bu kadar sürede bu kadar şarkı değiştiyse (her biri kısa) "skip" */
export const SKIP_WINDOW_MS = 2 * 60_000;
export const SKIPS = 4;
/** kesintisiz çalma süresi "marathon" */
export const MARATHON_MS = 2 * 3_600_000;

export interface MusicState {
  day: string;
  plays: Map<number, number>;
  changes: number[];
  /** çalmanın başladığı an (duraklamada null) */
  since: number | null;
  last: MediaNow | null;
  lastSaid: number;
  /** günde bir kez olanlar */
  said: Set<MusicTrigger>;
}

const dayOf = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export const initialMusic = (now: Date): MusicState => ({ day: dayOf(now), plays: new Map(), changes: [], since: null, last: null, lastSaid: -Infinity, said: new Set() });

/** Yeni medya durumu; laf atılacaksa tetiği döner (durum yerinde güncellenir). */
export function stepMusic(s: MusicState, media: MediaNow | null, now: Date): MusicTrigger | null {
  const t = now.getTime();
  if (dayOf(now) !== s.day) {
    s.day = dayOf(now);
    s.plays.clear();
    s.said.clear();
  }
  const prev = s.last;
  s.last = media;
  if (!media || !media.playing) {
    s.since = null;
    return null;
  }
  if (s.since === null) s.since = t;
  let fresh = false;
  if (media.track && media.track !== prev?.track) {
    fresh = true;
    s.plays.set(media.track, (s.plays.get(media.track) ?? 0) + 1);
    s.changes = [...s.changes.filter((c) => t - c < SKIP_WINDOW_MS), t];
  }
  if (t - s.lastSaid < MUSIC_COOLDOWN_MS) return null;
  const pick = (k: MusicTrigger, daily = false): MusicTrigger | null => {
    if (daily && s.said.has(k)) return null;
    s.lastSaid = t;
    if (daily) s.said.add(k);
    return k;
  };
  if (fresh && s.changes.length >= SKIPS) {
    s.changes = [];
    return pick("interaction:music_skip");
  }
  if (fresh && (s.plays.get(media.track) ?? 0) === REPEAT_AT) return pick("interaction:music_repeat");
  if (t - s.since >= MARATHON_MS) return pick("interaction:music_marathon", true);
  const h = now.getHours();
  if (fresh && h >= 1 && h < 5) return pick("interaction:music_night", true);
  return null;
}
