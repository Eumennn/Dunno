# SPEC 02 raporu: backend (worker) + masaüstü MVP (Windows)

> SON HAL (2026-10-02 21:15). SPEC 02 otomatik kontrollerle kapandı; kullanıcı manuel kontrolü bekleyenler aşağıda açıkça işaretli.

## Ne yapıldı
| Teslimat | Durum | Tag |
|---|---|---|
| W0 taşıma (web/ -> worker/, site/index.html) | bitti | stable-W0-20261002-0034 |
| W1 POST /v1/ask | bitti | stable-W1-20261002-0039 |
| W2 cihaz başı kota | bitti | stable-W2-20261002-0042 |
| W3 harcama tavanı + %80 alarm | bitti | stable-W3-20261002-0045 |
| W4 günlük laf üretimi + /v1/lines | bitti | stable-W4-20261002-0056 |
| W5 /v1/release, /download | bitti | stable-W5-20261002-0204 |
| W6 testler + smoke.ps1 | bitti | stable-W6-20261002-0204 |
| D1 pencere | bitti (manuel kontrol bekliyor) | stable-D1-20261002-0044 |
| D2 animasyon oynatıcı | bitti | stable-D2-20261002-0051 |
| D3 hareket | bitti (manuel kontrol bekliyor) | stable-D3-20261002-0206 |
| D4 soru kutusu | bitti (manuel kontrol bekliyor) | stable-D4-20261002-0257 |
| D5 laf motoru | bitti | stable-D5-20261002-0257 |
| D6 ilk açılış + ayarlar | bitti | stable-D6-20261002-0222 |
| D7 bağlam | bitti (backend: Rust okuma, toplantı kararı, izleyici + olaylar) | stable-D7-20261002-0234 |
| D8 toplantı koruması | bitti (manuel kontrol bekliyor) | stable-D8-20261002-2105 |
| D9 tray + autostart | bitti (manuel kontrol bekliyor) | stable-D9-20261002-2105 |
| D10 NSIS yükleyici | bitti (kurulum/kaldırma manuel kontrol bekliyor) | stable-D10-20261002-2114 |
| E2E uçtan uca (npm run e2e) | bitti | stable-E2E-20261002-2107 |

## Nasıl kurulur / çalıştırılır (PowerShell)
Worker (backend):
```
cd worker; npm ci
npx vitest run; npx tsc --noEmit
npx wrangler dev --test-scheduled            # http://127.0.0.1:8787
# laf seti dolu gelsin istersen: npx wrangler dev --test-scheduled --var DUNNO_FAKE_LLM:1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke.ps1   # 20 kontrol
```
Masaüstü:
```
cd desktop; npm ci
npm run tauri dev
npm run tauri build      # -> src-tauri/target/release/bundle/nsis/Dunno_0.1.0_x64-setup.exe
cd src-tauri; cargo clippy -- -D warnings; cargo test
```

## Bekleyen asset ve anahtarlar (yer tutucu kullanılıyor)
- Sprite sheet: `desktop/assets/dunno_sheet.png/json` (şu an üretilmiş placeholder; aynı adla değiştirilince kod değişmez)
- Laf havuzları: `desktop/assets/pool_tr.json`, `pool_en.json` (placeholder, intent 'placeholder')
- Logo / uygulama ikonu / tray ikonları (16/22)
- `OPENROUTER_API_KEY` (yoksa her şey havuzla çalışır), `ALERT_WEBHOOK`, `RL_SALT` (canlı için)
- KV namespace id (`worker/wrangler.toml` yer tutucu)
- Gerçek indirme URL'leri (`worker/src/data/releases.json`, şu an example.com), dosya boyutu `[FILE SIZE]`
- Site origin (CORS listesinde example.com yer tutucu)
- Yükleyici yayıncı/telif alanları (`[PUBLISHER]`, `[COPYRIGHT]`)
- Canlıya çıkışta: OpenRouter hesabında prompt loglama/eğitim kapalı olmalı (sorular OpenRouter + model sağlayıcısına gider); ayrıntı privacy-audit.md
- İlk açılış / arayüz metinleri (placeholder işaretli)
- Türkçe destekli piksel font: Silkscreen'de ı/ş/ğ yok, TR'de piksel başlıklar şimdilik Inter

## PM kararları (onay için)
- `DAILY_SPEND_CAP_REQUESTS = 1000` (yer tutucu)
- `/v1/lines` laf nesnesi tek dilli `{id, trigger, intent, <lang>}`; boşsa `{date:null, lines:[]}`
- Zoom/Teams için laf üretilmez (toplantıda susulur)
- Sürüm tek kaynak: `tauri.conf.json` + `releases.json` birlikte yükseltilir (test eşitliği kontrol eder)

## Bilinen sorunlar
- Windows'ta `wrangler dev` kapatılınca workerd alt süreçleri kalabiliyor (LEARNINGS.md).
- npm 11 esbuild/workerd postinstall için allow-scripts uyarısı veriyor; zararsız.
- `wrangler dev` etkileşimli kısayolları açıkken pencereye giden rastgele tuşlar Cloudflare Tunnel açabiliyor; yerel çalıştırmada `--ip 127.0.0.1 --show-interactive-dev-session=false` kullanın.
- Toplantı tespiti bilerek geniş: Teams sohbet penceresi de toplantı sayılır (pet susar). macOS'ta bağlam okuma yok, her zaman toplantı varsayılır.

## Önerilen SPEC 03
- Yazıldı ve başladı: `specs/03-pool-editor-ui.md` (laf havuzu, Dunno Studio, landing uyumlu UI, sprite seti, dunno.exe ana penceresi).

## Canlıya çıkış
- `npx wrangler deploy --env production` (üst seviye `ENVIRONMENT=dev` yerel içindir). Kontrol listesi: `docs/agents/backend.md` "Canlıya çıkış kontrol listesi".

## Doğrulama (PM, main @ 521b368, 2026-10-02 21:14)
- worker: `npm ci`, vitest 113/113, `tsc --noEmit` temiz.
- desktop: `npm ci`, vitest 145/145, `tsc` temiz, `npm run tauri build` -> `Dunno_0.1.0_x64-setup.exe` (2.39 MiB), `check:release` PASS, `cargo clippy -- -D warnings` temiz, `cargo test` 43/43.
- Uçtan uca: `cd desktop; npm run e2e` 6/6. Betik kendi worker'ını 127.0.0.1:8788'de açar ve kapatır: gerçek `api.ts` ile /v1/ask (3 cevap, 4.'de sulk), /v1/lines (200/304, birleşme), worker çıktısında soru yok, worker kapalıyken havuz cevabı ve laf. Arayüze giriş yok (Test güvenliği kuralı).

## Kullanıcının manuel kontrolü bekleyenler
Protokol: `orchestrator/notes/desktop-manual-test.md` ("Sabah için" + bölüm 0–8 + "Eklemeler").
- D1 pencere (şeffaf, tıklama geçirme, odak çalmama)
- D3 hareket (kenar yürüme, kaçma, sürükleme)
- D4 soru kutusu arayüzü (tıklama/yazma akışı; mantık e2e ile otomatik doğrulandı)
- D8 toplantı (Edge "Meet" penceresi ve tray "toplantıdayım", ≤2 sn)
- D9 tray menüsü, "bugün sus" gün dönümü, Windows ile başlat
- D10 yükleyiciyi kurma ve kaldırma (imzasız, SmartScreen beklenir)
- Gece olayı: Riot Vanguard diyaloğu, ayarını kontrol et.
