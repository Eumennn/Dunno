// MeetingGuard aksiyonlarını arayüze uygular (saf sıra; arayüz enjekte).
import type { Mode } from "../lines/types";
import type { GuardActions } from "../pet/meeting-guard";

export interface GuardUi {
  closeAskbox(): void;
  hideBubble(): void;
  playShh(): void;
  hide(): void;
  restore(): void;
  setSuppressed(on: boolean): void;
  setEffectiveMode(mode: Mode): void;
}

/**
 * Sıra önemli: önce bastırma (yeni laf başlamasın), sonra kutu/balon kapanır, sonra shh / saklan.
 * Geri gelişte önce görünür olur, en son bastırma kalkar.
 */
export function applyGuard(a: GuardActions, ui: GuardUi): void {
  ui.setEffectiveMode(a.effectiveMode);
  if (a.suppress) ui.setSuppressed(true);
  if (a.closeAskbox) ui.closeAskbox();
  if (a.hideBubble) ui.hideBubble();
  if (a.playShh) ui.playShh();
  if (a.hide) ui.hide();
  if (a.restore) ui.restore();
  if (!a.suppress) ui.setSuppressed(false);
}
