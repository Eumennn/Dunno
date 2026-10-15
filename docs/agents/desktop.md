# Masaüstü Rehberi (Tauri 2, Windows)

Kim okur: Masaüstü mühendisi (zorunlu), PM (review sırasında).
Ne değildir: Görev listesi değil (o `specs/`). Ürün sözleşmesi `docs/PROJECT.md`'de. Bu dosya **nasıl** kod yazacağını anlatır.

## Stack
- Tauri 2, Rust (stable, MSVC), Vite + vanilla TypeScript (strict). UI framework yok.
- Rust crate'leri: `tauri`, `serde`, `windows` (Win32: WindowsAndMessaging, ProcessStatus, Power, Input_KeyboardAndMouse yalnızca `GetLastInputInfo` için), `tauri-plugin-store`, `tauri-plugin-autostart`.
  Yeni crate / npm paketi = PM onayı.
- Ortam: Windows, PowerShell 5.1 (`&&` yok). Rust ve VS Build Tools kurulu.

## Mimari
```
desktop/src/                 (webview, TS)
  main.ts                    # başlatma, olay bağlama
  player/                    # sprite sheet yükleme, frameTag oynatma, ayna
  pet/state.ts               # durum makinesi: idle/walk/talk/sleep/run_away/sulk/peek/shh/dragged/shrug
  pet/movement.ts            # kenar yolu, hedef seçimi (konum Rust'a komutla gönderilir)
  ui/bubble.ts, ui/askbox.ts # balon ve soru kutusu (DOM, ui.md stilleri)
  lines/engine.ts            # pool yükleme, trigger eşleme, {K:} ve [K] işleme, sıklık
  api.ts                     # /v1/ask, /v1/lines (timeout + fallback)
  settings.ts                # store sarmalayıcı
desktop/src-tauri/src/
  main.rs / lib.rs           # builder, komut kaydı, tray
  window.rs                  # konumlandırma, çalışma alanı, cursor-ignore geçişi
  context/mod.rs             # ContextSnapshot { app, idle_secs, battery_pct, on_ac }
  context/windows.rs         # Win32 çağrıları (unsafe sadece burada)
  meeting.rs                 # toplantı tespiti, güvenli taraf
  tray.rs
```
- **Rust = sistem, TS = davranış.** Rust olay yayar (`context://changed`, `meeting://state`), TS karar verir.
- Rust -> TS olayları ve TS -> Rust komutları tek bir `ipc.ts` / `commands.rs` dosyasında tiplenir.
- `unsafe` sadece `context/windows.rs` ve `window.rs` içinde, her bloğun üstünde neden güvenli olduğunu anlatan bir satır.

## Pencere kuralları
- Pencere küçük (pet + balon payı). Tam ekran şeffaf katman yok.
- Şeffaf alan tıklamayı geçirmeli: imleç pet'in dolu piksellerinin dışındaysa `set_ignore_cursor_events(true)`, üstündeyse `false`.
  İmleç takibi Rust'ta düşük frekanslı (ör. 30 Hz) `GetCursorPos` ile; klavye asla dinlenmez.
- Görev çubuğunda görünmez (`skipTaskbar`), odak çalmaz (soru kutusu açılınca hariç).
- DPI ölçeklemeye dikkat: fiziksel/mantıksal piksel dönüşümü tek yardımcıda.

## Animasyon
- Aseprite JSON (array veya hash) + PNG. `frameTags` adı = durum adı, `duration` ms.
- Canvas `imageSmoothingEnabled = false`, tam sayı ölçek (2x/3x). Sola gidişte `scale(-1,1)`.
- Placeholder: `scripts/gen-placeholder-sheet` her durum için renkli 48x48 kare + durum baş harfi üretir, aynı JSON formatında.
  Gerçek sheet gelince kod değişmeden dosya değişir.

## Laf motoru
- Format `docs/PROJECT.md`'deki gibi. Seçim: önce en spesifik trigger (app > time > idle > random), son 20 lafı tekrar etme.
- `{K: ...}`: polite'ta tamamen silinir, street'te parantezsiz gösterilir. `[K]` (LLM'den): street `***`, polite boş + fazla boşluk temizliği.
- Sıklık ayarı: az (20-40 dk), normal (8-15 dk), çok (3-6 dk), rastgele aralık. "bugün sus" ve toplantı durumu her şeyi bastırır.

## Gizlilik (pazarlık yok)
- Ekran görüntüsü, klavye kancası, pano okuma yok.
- Pencere başlığı sadece toplantı eşlemesi için bellekte okunur; saklanmaz, loglanmaz, ağa gitmez.
- Ağa giden tek şey: soru metni (sadece LLM'e gidecek sorularda), mod, dil, rastgele `deviceId` (ilk açılışta üretilir).

## Test
- Rust: saf fonksiyonlar (exe -> app eşleme, toplantı kararı, kenar yolu geometrisi) `cargo test` ile.
- TS: laf motoru, `{K}`/`[K]` işleme, günlük limit (tarih enjekte edilerek) için vitest.
- Manuel: PM'in test protokolü (`orchestrator/notes/desktop-manual-test.md`).

## Komutlar (PowerShell)
```
cd desktop; npm install
npm run tauri dev
npm run tauri build
cd src-tauri; cargo clippy -- -D warnings; cargo test
```

## Teslim kontrol listesi
- [ ] `npm run tauri build` hatasız; `cargo clippy -- -D warnings` temiz; testler geçiyor
- [ ] Yeni davranış için en az bir test (saf mantık) var
- [ ] Gizlilik kurallarını bozan satır yok (`grep -rn "title\|log" src-tauri/src` gözden geçirildi)
- [ ] Palet dışı renk yok (ui.md)
- [ ] Manuel kontrol yapıldı ve DONE mesajına ne denendiği yazıldı
- [ ] Commit atıldı
