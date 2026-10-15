// Konuşma durumunun kalıcı kısmı: günlük doğru cevap hakkı, son 20 laf, /v1/lines önbelleği.
// Soru metni burada YOK; sadece sayaçlar ve laf id'leri.
import type { LinesCache } from "../api";
import type { Backend } from "../settings";

// "questions" (eski QuestionLimiter) artık okunmaz; SPEC 06 Q3 hakkı "honest" anahtarında
const KEYS = { honest: "honest", recent: "recent", lines: "linesCache", sulkDay: "sulkDay" } as const;

export interface TalkState {
  /** HonestQuota durumu; geçersizse HonestQuota sıfırdan başlar */
  honest: unknown;
  recent: string[];
  lines: LinesCache | null;
  /** hak bitimi sulk'unun gösterildiği yerel gün (YYYY-MM-DD); o gün sonrası havuz cevapları (SPEC 06 Q4) */
  sulkDay: string | null;
}

export class TalkMemory {
  private constructor(
    private readonly backend: Backend,
    readonly initial: TalkState,
  ) {}

  static async load(backend: Backend): Promise<TalkMemory> {
    const get = async (k: string) => {
      try {
        return await backend.get(k);
      } catch {
        return undefined;
      }
    };
    const [q, r, l, sd] = await Promise.all([get(KEYS.honest), get(KEYS.recent), get(KEYS.lines), get(KEYS.sulkDay)]);
    return new TalkMemory(backend, {
      honest: q ?? null,
      recent: Array.isArray(r) ? r.filter((x): x is string => typeof x === "string") : [],
      lines: typeof l === "object" && l !== null ? (l as LinesCache) : null,
      sulkDay: typeof sd === "string" && /^d{4}-d{2}-d{2}$/.test(sd) ? sd : null,
    });
  }

  async save(patch: Partial<TalkState>): Promise<void> {
    if (patch.honest !== undefined) await this.backend.set(KEYS.honest, patch.honest);
    if (patch.recent !== undefined) await this.backend.set(KEYS.recent, patch.recent);
    if (patch.lines !== undefined) await this.backend.set(KEYS.lines, patch.lines);
    if (patch.sulkDay !== undefined) await this.backend.set(KEYS.sulkDay, patch.sulkDay);
    await this.backend.save();
  }
}
