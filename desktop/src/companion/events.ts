// Companion olayları (SPEC 17 R1, strateji §21): event-driven omurga. Memory, relationship, progression, evolution ve incidents
// aynı olayları ayrı ayrı dinler; main.ts sadece olayı iletir. Olaylar METİN taşımaz: tür, sayı, enum ve uygulama ETİKETİ.

/** L1: mesajın tonu (talk/tone.ts); sadece enum */
export type Tone = "neutral" | "sad" | "angry" | "joking" | "kind";

export type CompanionEvent =
  /** pet penceresi açıldı (oturum başı) */
  | { type: "session_start" }
  /** açıkken dakikada bir (son görülme + boşta kalma + oturum süresi) */
  | { type: "heartbeat"; idle?: boolean }
  /** dürtme; total: toplam dürtme sayısı (gizli eşikler için) */
  | { type: "click"; total?: number }
  | { type: "drag" }
  /** soru; qtype: talk/classify tipi, tone: L1 tonu (metin YOK) */
  | { type: "question"; qtype?: string; tone?: Tone }
  /** günün doğru cevabı verildi */
  | { type: "honest" }
  /** kendiliğinden laf; app: öndeki uygulama etiketi */
  | { type: "line"; app: string | null }
  /** yan kenarda bakmaya başladı */
  | { type: "edge" }
  /** uyudu (dakika) */
  | { type: "sleep"; minutes: number }
  /** başarım açıldı */
  | { type: "achievement"; id: string }
  /** dolapta seçim (tema/kostüm/aksesuar) */
  | { type: "customize" }
  /** gizli dünya açıldı / değişti */
  | { type: "world_change"; world: string; unlocked?: boolean }
  /** 60 dk boşta */
  | { type: "idle_hour" }
  /** FB6 ilk adımlar: dunno.exe açıldı / pet.txt görüldü (dunno.exe bildirir) */
  | { type: "onboard"; step: "open" | "tree" };

export type CompanionEventType = CompanionEvent["type"];

/** Dokunma olayları (ilişki ve XP'de ortak tavan) */
export const TOUCH: ReadonlySet<CompanionEventType> = new Set(["click", "drag"]);

/** Etkileşim sayılan olaylar (son etkileşim zamanı, trait pencereleri) */
export const INTERACTIONS: ReadonlySet<CompanionEventType> = new Set(["click", "drag", "question", "customize"]);

type Listener = (ev: CompanionEvent, at: Date) => void;

/** Küçük olay yolu: dinleyiciler sırayla çağrılır; biri hata verirse diğerleri yine çalışır. */
export class EventBus {
  private readonly listeners = new Set<Listener>();

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(ev: CompanionEvent, at = new Date()): void {
    for (const fn of this.listeners) {
      try {
        fn(ev, at);
      } catch (e) {
        console.warn("[companion]", e);
      }
    }
  }
}
