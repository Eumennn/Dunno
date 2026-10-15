import { describe, expect, it } from "vitest";
import { MeetingGuard, SHH_MS, type GuardContext } from "../pet/meeting-guard";
import { applyGuard, type GuardUi } from "./guard-apply";

function recorder() {
  const calls: string[] = [];
  const ui: GuardUi = {
    closeAskbox: () => calls.push("closeAskbox"),
    hideBubble: () => calls.push("hideBubble"),
    playShh: () => calls.push("playShh"),
    hide: () => calls.push("hide"),
    restore: () => calls.push("restore"),
    setSuppressed: (on) => calls.push(`suppress:${on}`),
    setEffectiveMode: (m) => calls.push(`mode:${m}`),
  };
  return { ui, calls };
}

const ctx = (over: Partial<GuardContext> = {}): GuardContext => ({
  askboxOpen: false,
  bubbleVisible: false,
  mode: "street",
  ...over,
});

describe("applyGuard", () => {
  it("toplantı başlayınca: bastır, kutuyu ve balonu kapat, shh; süre dolunca saklan", () => {
    let t = 1000;
    const g = new MeetingGuard({ now: () => t });
    g.update(false, ctx()); // clear
    const r = recorder();
    applyGuard(g.update(true, ctx({ askboxOpen: true, bubbleVisible: true })), r.ui);
    expect(r.calls).toEqual(["mode:polite", "suppress:true", "closeAskbox", "hideBubble", "playShh"]);

    const r2 = recorder();
    t += SHH_MS;
    applyGuard(g.tick(ctx()), r2.ui);
    expect(r2.calls).toEqual(["mode:polite", "suppress:true", "hide"]);
  });

  it("toplantı bitince: önce geri gel, en son bastırmayı kaldır, kullanıcının moduna dön", () => {
    let t = 0;
    const g = new MeetingGuard({ now: () => t });
    g.update(true, ctx());
    t = 5000;
    g.tick(ctx());
    const r = recorder();
    applyGuard(g.update(false, ctx()), r.ui);
    expect(r.calls).toEqual(["mode:street", "restore", "suppress:false"]);
  });

  it("açılışta toplantı yoksa sadece bastırma kalkar, geri gelme yok", () => {
    const g = new MeetingGuard();
    const r = recorder();
    applyGuard(g.update(false, ctx()), r.ui);
    expect(r.calls).toEqual(["mode:street", "suppress:false"]);
  });

  it("aynı toplantı durumu tekrar gelince tek seferlikler tekrarlanmaz", () => {
    const g = new MeetingGuard({ now: () => 0 });
    g.update(true, ctx());
    const r = recorder();
    applyGuard(g.update(true, ctx({ askboxOpen: true })), r.ui);
    expect(r.calls).toEqual(["mode:polite", "suppress:true"]);
  });
});
