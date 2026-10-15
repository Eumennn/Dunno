// workshop.exe denetleyicisi (SPEC 18): durum + ağ + kurulum. app/main.ts sadece olayları buraya iletir (main.ts büyümesin).
import { invoke } from "@tauri-apps/api/core";
import type { Lang } from "../lines/types";
import type { ModDir } from "../mods/mods";
import { validateMods } from "../mods/mods";
import type { Tier } from "../pro/entitlements";
import { PACKS } from "../packs/packs";
import { WorkshopApi, type WsItem } from "../workshop/api";
import { linesPack, themePack, type StudioLine } from "../workshop/studio";
import { initialWs, workshopHtml, wsStrings, type WsState, type WsView } from "../workshop/view";

export interface WsDeps {
  render: () => void;
  /** pet penceresine aksiyon (modu aç/kapat) */
  setMod: (id: string, on: boolean) => void;
  lang: () => Lang;
  tier: () => Tier;
  owned: () => readonly string[];
  deviceId: () => string | null;
  modsEnabled: () => Record<string, boolean>;
  /** kendi mod klasörleri (ham) */
  readMine: () => Promise<ModDir[]>;
  /** mod doğrulama için etiketler ve yerleşik id'ler */
  validate: (dirs: ModDir[]) => ReturnType<typeof validateMods>;
  inTauri: boolean;
  api?: WorkshopApi;
}

const HANDLE_KEY = "dunno.app.handle";
const LIKED_KEY = "dunno.app.liked";
const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* depo yok */
    }
  },
};

export class WorkshopController {
  s: WsState = initialWs();
  private readonly api: WorkshopApi;
  private mineDirs: ModDir[] = [];

  constructor(private readonly d: WsDeps) {
    this.api = d.api ?? new WorkshopApi();
    this.s.handle = store.get(HANDLE_KEY) ?? "";
    try {
      this.s.liked = JSON.parse(store.get(LIKED_KEY) ?? "[]") as string[];
    } catch {
      this.s.liked = [];
    }
  }

  html(): string {
    this.s.enabled = this.d.modsEnabled();
    return workshopHtml(this.d.lang(), this.s, this.d.tier(), this.d.owned());
  }

  private t() {
    return wsStrings(this.d.lang());
  }

  private say(msg: string | null, restart = false): void {
    this.s.msg = msg;
    this.s.restartPending = this.s.restartPending || restart;
    this.d.render();
  }

  private opened = false;

  /** ilk çizimde bir kez (sekme hatırlanmışsa) */
  ensureOpen(): void {
    if (this.opened) return;
    this.opened = true;
    void this.open();
  }

  /** sekme açılınca: liste + kendi modlarım */
  async open(): Promise<void> {
    this.opened = true;
    await this.refreshMine();
    if (this.s.view === "browse" && this.s.items === null && !this.s.loading) await this.load();
  }

  async refreshMine(): Promise<void> {
    this.mineDirs = (await this.d.readMine().catch(() => [])).filter((x) => !PACKS.some((p) => p.id === x.dir));
    const valid = this.d.validate(this.mineDirs).filter((r) => r.mod);
    this.s.installed = valid.map((r) => r.mod!.manifest.id);
    this.s.mine = valid.map((r) => ({ dir: r.dir, name: r.mod!.manifest.name[this.d.lang()] }));
  }

  async load(): Promise<void> {
    this.s.loading = true;
    this.s.creator = null;
    this.d.render();
    const r = await this.api.list(this.s.sort, this.s.kind || undefined);
    this.s.loading = false;
    this.s.items = r.ok ? r.value.items : null;
    this.d.render();
  }

  async segment(group: string, v: string): Promise<boolean> {
    if (group === "ws_view") {
      this.s.view = v as WsView;
      this.s.msg = null;
      this.d.render();
      if (v === "browse" && this.s.items === null) await this.load();
      if (v === "share") await this.refreshMine().then(() => this.d.render());
      return true;
    }
    if (group === "ws_sort" || group === "ws_kind") {
      if (group === "ws_sort") this.s.sort = v === "new" ? "new" : "top";
      else this.s.kind = v;
      await this.load();
      return true;
    }
    return false;
  }

  input(name: string, value: string): void {
    const s = this.s;
    if (name === "theme_tr") s.themeName.tr = value;
    else if (name === "theme_en") s.themeName.en = value;
    else if (name === "lines_tr") s.linesName.tr = value;
    else if (name === "lines_en") s.linesName.en = value;
    else if (name === "idea") s.idea = value;
    else if (name === "handle") {
      s.handle = value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
      store.set(HANDLE_KEY, s.handle);
    } else {
      const m = /^line_(trigger|tr|en)_(\d+)$/.exec(name);
      if (m && s.lines[Number(m[2])]) s.lines[Number(m[2])][m[1] as "trigger" | "tr" | "en"] = value;
    }
  }

  switchPack(name: string, on: boolean): boolean {
    if (!name.startsWith("pack_")) return false;
    this.d.setMod(name.slice(5), on);
    this.say(this.t().restartHint, true);
    return true;
  }

  /** data-action olayları; işlendiyse true */
  async action(a: string, el: HTMLElement): Promise<boolean> {
    const t = this.t();
    const id = el.dataset.id ?? "";
    switch (a) {
      case "ws_creator": {
        const r = await this.api.creator(el.dataset.handle ?? "");
        if (r.ok) this.s.creator = { handle: r.value.handle, items: r.value.items, likes: r.value.likes };
        this.d.render();
        return true;
      }
      case "ws_back":
        this.s.creator = null;
        this.d.render();
        return true;
      case "ws_like": {
        const dev = this.d.deviceId();
        if (!dev) return true;
        const r = await this.api.like(dev, id);
        if (r.ok) {
          this.s.liked = r.value.liked ? [...new Set([...this.s.liked, id])] : this.s.liked.filter((x) => x !== id);
          store.set(LIKED_KEY, JSON.stringify(this.s.liked));
          const patch = (list: WsItem[] | null | undefined) => list?.forEach((i) => i.id === id && (i.likes = r.value.likes));
          patch(this.s.items);
          patch(this.s.creator?.items);
        }
        this.d.render();
        return true;
      }
      case "ws_install": {
        const r = await this.api.item(id);
        if (!r.ok) return this.say(t.offline), true;
        if (r.value.item.premium && this.d.tier() !== "pro") return this.say(t.proOnly), true;
        await this.install(r.value.pack);
        return true;
      }
      case "ws_remove":
        if (this.d.inTauri) await invoke("remove_pack", { dir: id }).catch(() => undefined);
        this.d.setMod(id, false);
        await this.refreshMine();
        this.say(t.restartHint, true);
        return true;
      case "ws_palette":
        this.s.palette = id;
        this.d.render();
        return true;
      case "ws_add_line":
        if (this.s.lines.length < 30) this.s.lines.push({ trigger: "random", tr: "", en: "" });
        this.d.render();
        return true;
      case "ws_make_theme": {
        const p = themePack(this.s.themeName, this.s.palette, this.s.handle);
        if (!p) return this.say(t.nameTr), true;
        await this.install(p);
        return true;
      }
      case "ws_make_lines": {
        const p = linesPack(this.s.linesName, this.s.lines as StudioLine[], this.s.handle);
        if (!p) return this.say(t.nameTr), true;
        await this.install(p);
        return true;
      }
      case "ws_generate": {
        const dev = this.d.deviceId();
        if (!dev || !this.s.idea.trim()) return true;
        this.s.loading = true;
        this.say(t.loading);
        const license = this.d.inTauri ? await invoke<string | null>("license_token").catch(() => null) : null;
        const r = await this.api.createWorld(dev, license, this.s.idea);
        this.s.loading = false;
        if (r.ok) {
          this.s.aiPack = r.value.pack;
          this.say(null);
        } else this.say(r.status === 0 ? t.offline : r.error);
        return true;
      }
      case "ws_install_ai":
        if (this.s.aiPack) await this.install(this.s.aiPack);
        return true;
      case "ws_upload": {
        const dev = this.d.deviceId();
        const pack = this.mineDirs.find((x) => x.dir === id);
        if (!dev || !pack || !/^[a-z0-9_]{3,20}$/.test(this.s.handle)) return this.say(t.handleHint), true;
        const r = await this.api.upload(dev, this.s.handle, pack);
        this.say(r.ok ? t.shareHint : r.status === 0 ? t.offline : r.status === 403 ? t.uploadsClosed : r.error);
        return true;
      }
    }
    return false;
  }

  /** Kurulum: önce burada gerçek mod doğrulaması (geçmezse kurulmaz), sonra Rust yazar, mod açılır. */
  private async install(pack: ModDir): Promise<void> {
    const t = this.t();
    const v = this.d.validate([pack])[0];
    if (!v?.mod) return this.say(v?.errors[0] ?? "invalid pack");
    if (this.d.inTauri) {
      const ok = await invoke<string>("install_pack", { pack }).then(
        () => true,
        () => false,
      );
      if (!ok) return this.say(t.offline);
    }
    this.d.setMod(v.mod.manifest.id, true);
    await this.refreshMine();
    this.say(t.restartHint, true);
  }
}
