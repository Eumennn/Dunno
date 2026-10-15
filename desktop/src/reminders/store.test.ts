import { describe, expect, it } from "vitest";
import { addReminder, cleanReminders, clearReminders, dueReminders, STALE_MS, whenLabel } from "./store";

const now = new Date(2026, 9, 10, 14, 0);
const at = (min: number) => new Date(now.getTime() + min * 60_000);

describe("hatırlatıcı listesi", () => {
  it("sınır, sıralama, temizlik", () => {
    let l = addReminder([], at(30), "b", 2, "1").list;
    l = addReminder(l, at(10), "a", 2, "2").list;
    expect(l.map((r) => r.label)).toEqual(["a", "b"]);
    expect(addReminder(l, at(5), "c", 2, "3").ok).toBe(false);
    expect(cleanReminders([{ id: "x", at: "bozuk", label: "y" }, ...l, 5])).toHaveLength(2);
  });
  it("zamanı gelen çalar, çok eskiyen düşer", () => {
    const l = [{ id: "1", at: at(-1).toISOString(), label: "a" }, { id: "2", at: new Date(now.getTime() - STALE_MS - 1).toISOString(), label: "b" }, { id: "3", at: at(5).toISOString(), label: "c" }];
    const d = dueReminders(l, now);
    expect([d.due.map((r) => r.id), d.stale.map((r) => r.id), d.rest.map((r) => r.id)]).toEqual([["1"], ["2"], ["3"]]);
  });
  it("etiketle ya da hepsi silinir; zaman etiketi", () => {
    const l = [{ id: "1", at: at(1).toISOString(), label: "çay" }, { id: "2", at: at(2).toISOString(), label: "toplantı" }];
    expect(clearReminders(l, "çay")).toEqual({ list: [l[1]], removed: 1 });
    expect(clearReminders(l, null).removed).toBe(2);
    expect(whenLabel(at(30), now, "tr")).toBe("14:30");
    expect(whenLabel(at(60 * 20), now, "tr")).toBe("yarın 10:00");
    expect(whenLabel(at(60 * 48), now, "en")).toBe("mon 14:00");
  });
});
