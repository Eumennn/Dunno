// Takip sorusu (SPEC 17 L2, saf): cevaptan hemen sonra gelen kısa "neden", "nasıl yani", "ciddi misin", "really?".
// Oturum içi: önceki soru/cevap metni saklanmaz, sadece son cevabın ZAMANI tutulur (talker bellekte).
import { fold } from "./classify";

/** son cevaptan bu kadar ms içinde gelirse takip sayılır */
export const FOLLOW_UP_MS = 90_000;

const FOLLOW = /^(peki )?(neden|niye|nicin|nasil yani|nasil ya|ne demek( istiyorsun)?|ciddi misin|ciddi mi|emin misin|gercekten mi|sahi mi|yok artik mi|yani|o ne demek|ee+|e+ sonra|sonra|devami|kanitla|kaynak|why|how so|what do you mean|really|seriously|are you sure|you sure|so|and then|then what|source|prove it|explain|meaning)\??[.!?]*$/;

export function isFollowUp(raw: string): boolean {
  const s = fold(raw).replace(/['’`]/g, "").replace(/\s+/g, " ").trim();
  if (!s || s.split(" ").length > 4) return false;
  return FOLLOW.test(s);
}
