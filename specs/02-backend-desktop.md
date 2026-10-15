# SPEC 02: Backend (tüm uygulama) + Masaüstü MVP (Windows)

PROJECT: Dunno
GOAL: Windows'ta kurulup çalışan, ekranın kenarlarında gezen, soru cevaplayan (yanlış), bağlamı algılayan Dunno masaüstü uygulaması
ve onu besleyen Cloudflare Worker backend'i.
KAYNAKLAR: `docs/PROJECT.md` (ürün sözleşmesi), `docs/agents/desktop.md`, `docs/agents/backend.md`, `docs/agents/ui.md`.

## Kapsam kararları (değiştirme)
- **Landing page yazılmaz.** Hazır `Dunno OS.html` olduğu gibi `site/index.html` olarak yayınlanır. İçine dokunulmaz.
- SPEC 01'de yazılan Astro iskeleti (`web/` altında `src/`, `astro.config.mjs` vb.) silinir. `web/functions/_lib` ve testleri worker'a taşınır.
- Masaüstü: **Tauri 2 + Vite + vanilla TypeScript** (React yok), Rust tarafı Windows API için `windows` crate.
- Önce Windows. macOS bu spec'te yok (makine yok), ama Rust kodu platform modülleriyle ayrılır (`platform/windows.rs`).
- Asset'ler (sprite sheet, laf havuzları, ikonlar) tasarımcıdan gelecek; o zamana kadar yer tutucu.

## Dizin yapısı
```
site/index.html            # = Dunno OS.html kopyası (tek kaynak kök dizindeki dosya)
worker/                    # Cloudflare Worker (backend)
  src/index.ts             # router
  src/routes/*.ts
  src/lib/*.ts             # validate, postprocess, prompt, pool, ratelimit, llm, spend, lines
  test/*.test.ts
  wrangler.toml
desktop/                   # Tauri uygulaması
  src/                     # TS: player, movement, bubble, askbox, pool engine, settings
  src-tauri/src/           # Rust: pencere, context (app/idle/battery), meeting guard, tray
  assets/                  # placeholder sprite sheet + pool_tr.json + pool_en.json
```

## Backend teslimatları (pencere 2)
- **W0 Taşıma:** `web/functions/_lib` + testleri `worker/`'a taşı, Workers runtime'a uyarla, `web/`'i sil. `site/index.html` oluştur. Testler geçer.
- **W1 /v1/ask:** `POST {question, mode, lang, deviceId}` -> `{answer, source}`. Cevapta `[K]` **korunur** (değiştirme masaüstünde yapılır). LLM: OpenRouter, Kimi, `max_tokens` ~60, thinking kapalı, system prompt sabit (cache dostu), 4 sn timeout. Anahtarsız/hata -> havuz.
- **W2 Rate limit:** cihaz başı (`deviceId` + IP hash) günlük LLM kotası `LLM_DAILY_PER_DEVICE` (varsayılan 3). Aşılınca 429.
- **W3 Harcama tavanı + alarm:** KV'de günlük istek/token sayacı. `%80`'de `ALERT_WEBHOOK`'a tek seferlik bildirim, `%100`'de tüm LLM çağrıları havuza düşer. Tavan env'den (`DAILY_SPEND_CAP_REQUESTS`).
- **W4 Günlük laf üretimi:** Cron trigger günde 1 kez dil başına ~100 laf üretir (pool formatında, `{K:...}` dahil), doğrular (uzunluk, yasak konu kelime listesi, format), KV'ye `lines:<lang>:<date>` yazar. `GET /v1/lines?lang=tr` en son seti döner (ETag ile).
- **W5 Release:** `GET /v1/release` (sürüm, boyut, notlar, URL), `GET /download` -> platform URL'sine 302.
- **W6 Testler + yerel çalıştırma:** vitest; `npx wrangler dev` ile tüm uçlar curl ile doğrulanır.

## Masaüstü teslimatları (pencere 1)
- **D1 Pencere:** Tauri 2 iskeleti. Şeffaf, çerçevesiz, her zaman üstte, görev çubuğunda görünmeyen, **pet boyutunda küçük** pencere
  (tam ekran tıklama-geçirme yerine pencerenin kendisi hareket eder). Pencerenin şeffaf pikselleri tıklamayı arkaya geçirmeli
  (Windows: görünmeyen alanlarda `set_ignore_cursor_events` geçişi). Ölçülebilir sonuç: masaüstündeki bir simgeye pet'in yanından tıklanabiliyor.
- **D2 Animasyon oynatıcı:** Aseprite sprite sheet + JSON (frameTags = durumlar). Canvas, nearest-neighbor, 48x48 -> 2-3x ölçek,
  sola dönüş yatay ayna. Placeholder: her durum için renkli kutu + durum adı içeren üretilmiş sheet. Durumlar: `docs/PROJECT.md` sözleşmesi.
- **D3 Hareket:** Çalışma alanının (görev çubuğu hariç) köşe ve kenarlarında yürür, durur, uyur. İmleç yaklaşınca `run_away`.
  Sürüklenebilir (`dragged`), bırakınca en yakın kenara yerleşir. Çoklu monitörde birincil ekran.
- **D4 Soru kutusu:** Pet'e tıklayınca balon + input. Günlük 3 soru (yerel, gün değişince sıfır). Dolunca `sulk`, sırtını döner.
  Cevap akışı: çoğu havuzdan, her 3-4 sorudan biri `/v1/ask`'ten; hata/timeout/429 -> havuz. `talk` animasyonu.
- **D5 Laf motoru:** `pool_<lang>.json` formatı (PROJECT.md), trigger eşleştirme (`app:*`, `time:*`, `idle:*`, `battery:low`, `interaction:*`, `random`),
  `{K:...}` sadece street modda, `[K]` -> street `***` / polite boş. Kendi kendine laf atma (sıklık ayarına göre), günlük lafları `/v1/lines`'tan çekip birleştirme (çevrimdışı çalışır).
- **D6 İlk açılış:** dil (TR/EN) + ağız modu (terbiyeli / sokak) seçimi. Ayarlar kalıcı (tauri-plugin-store).
- **D7 Bağlam (Rust, cihazda):** öndeki uygulamanın exe adı (`GetForegroundWindow` -> process), boşta kalma (`GetLastInputInfo`; 10/30/60 dk),
  pil (`GetSystemPowerStatus`), saat, tıklama sayısı (sadece pet'e). exe -> `app:excel|vscode|figma|spotify|browser|zoom|teams|...` eşleme tablosu.
  **Ekran görüntüsü yok, klavye takibi yok, pencere başlığı saklanmaz/gönderilmez.**
- **D8 Toplantı koruması (zorunlu):** Zoom/Teams/Webex öndeyse veya toplantı süreci aktifse, ya da tarayıcı öndeyken başlıkta Meet/Zoom/Teams geçiyorsa
  (yalnızca yerelde eşleştirilir) -> `shh` animasyonu + saklan veya zorla polite + sessiz. Ayrıca tray'de "toplantıdayım" el ile anahtarı.
  Başarısızlık modu güvenli tarafta: emin değilse sus.
- **D9 Tray menüsü:** mod değiştir, "bugün sus" (ertesi güne kadar uyur), konuşma sıklığı (az/normal/çok), dil, Windows ile başlat, çıkış.
- **D10 Build:** `npm run tauri build` ile imzasız Windows yükleyici (NSIS). Sürüm bilgisi W5 ile uyumlu.

## Kabul kriterleri
- `desktop/`: `npm run tauri build` hatasız, `cargo clippy` uyarısız, `cargo test` + TS testleri geçiyor.
- Uygulama kurulup açılıyor; pet kenarda geziyor, yanından masaüstüne tıklanabiliyor, sürüklenebiliyor.
- 3 soru sonrası sulk; ertesi gün (sistem saati ileri alınarak) sıfırlanıyor.
- Zoom/Teams açıkken 2 sn içinde susuyor/saklanıyor (manuel test protokolü PM tarafından `orchestrator/notes/` altına yazılır).
- Backend: `npx vitest run` geçiyor; anahtarsız `/v1/ask` havuz dönüyor; kota ve harcama tavanı testli; cron elle tetiklenince KV'ye laf yazıyor.
- Hiçbir yerde soru metni veya pencere başlığı loglanmıyor.

## Kapsam dışı
macOS build ve imzalama, gerçek deploy, ücretli hesaplar, landing page değişiklikleri, ses, yeni skinler.

## Kullanıcıdan gelecekler (uydurma, yer tutucu kullan)
Sprite sheet (`dunno_sheet.png/json`), `pool_tr.json` / `pool_en.json`, logo/ikon setleri, OpenRouter anahtarı, alarm webhook'u, gerçek indirme URL'leri.
