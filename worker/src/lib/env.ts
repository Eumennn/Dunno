/** Kullandığımız kadarıyla KV arayüzü; testlerde Map tabanlı mock bunu karşılar. */
export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  /** yoksa LLM atlanır, havuz kullanılır */
  OPENROUTER_API_KEY?: string;
  /** yoksa llm.ts içindeki varsayılan model */
  DUNNO_MODEL?: string;
  RL_SALT?: string;
  /** cihaz başı günlük LLM kotası (W2), varsayılan 3 */
  LLM_DAILY_PER_DEVICE?: string;
  /** günlük toplam LLM isteği tavanı (W3) */
  DAILY_SPEND_CAP_REQUESTS?: string;
  /** %80'de tek seferlik POST (W3), yoksa atlanır */
  ALERT_WEBHOOK?: string;
  /** "1" iken laf üretimi sahte sabit çıktı kullanır (sadece yerel, .dev.vars; wrangler.toml'da yok) */
  DUNNO_FAKE_LLM?: string;
  /** "dev" iken RL_SALT yoksa yerel sabit tuz kullanılır; başka her değer/yokluk = canlı */
  ENVIRONMENT?: string;
  /** SPEC 18 workshop moderasyonu (secret, en az 24 karakter); yoksa onay/red ve bekleyen listesi kapalı */
  WORKSHOP_ADMIN_TOKEN?: string;
  /** FB6 workshop yüklemeleri: "open" herkese, "invite" sadece WORKSHOP_INVITES'taki takma adlara, diğer her değer/yokluk kapalı (launch varsayılanı) */
  WORKSHOP_UPLOADS?: string;
  /** "invite" modunda izinli takma adlar (virgülle) */
  WORKSHOP_INVITES?: string;
  /** SPEC 18 AI dünya üretici: Pro lisansı açık anahtarı (32 bayt base64; masaüstü DUNNO_LICENSE_PUBKEY ile aynı). Yoksa canlıda kapalı. */
  PRO_PUBKEY?: string;
  /** ödeme -> lisans (launch): Lemon Squeezy webhook imza sırrı */
  LS_WEBHOOK_SECRET?: string;
  /** ürün eşlemesi JSON (lib/billing.ts productsFrom) */
  LS_PRODUCTS?: string;
  /** lisans imzalama özel anahtarı (PKCS8 base64 / PEM; scripts/license.mjs keygen). Sadece secret, repoda asla. */
  LICENSE_PRIVATE_KEY?: string;
  /** sayaçlar, günlük laflar */
  DUNNO_KV: KVLike;
}

/** ExecutionContext'in kullandığımız kısmı; testlerde sahte ctx bunu karşılar. */
export interface Ctx {
  waitUntil(promise: Promise<unknown>): void;
}
