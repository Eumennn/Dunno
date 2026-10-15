# SPEC 10 raporu: Clicky açık kaynak kodundan alınan fikirler

> SON HAL (2026-10-06). Kullanıcı manuel kontrolü: `desktop-manual-test.md` bölüm 17. Tek ana ajan (bulut, Linux konteyner).

## Kurulum dosyası
Windows NSIS kurulumu bu konteynerde üretilemez. Ana checkout'ta (Windows):
```
cd C:\Users\pc\Downloads\Dunnothebean\desktop
npm.cmd ci
npm.cmd run tauri build
npm.cmd run check:release
```
Çıktı: **`C:\Users\pc\Downloads\Dunnothebean\desktop\src-tauri\target\release\bundle\nsis\Dunno_0.1.0_x64-setup.exe`**.
İmzalı (güncellenebilir) yayın: `docs/RELEASE.md` (anahtar üretimi kullanıcıda; pubkey girilene kadar `check:release` uyarı verir).

## Lisans / kaynak
Clicky (MIT) **kodundan satır alınmadı**; sadece fikirler uyarlandı (Tauri + TS + Rust, Windows). Bu yüzden `THIRD_PARTY_NOTICES.md` gerekmedi.
Clicky adı/logosu/görseli kullanılmadı. Bilerek alınmayanlar (ekran görüntüsü, mikrofon, global kısayol, tam ekran katman) eklenmedi.

## Ne değişti
| # | Teslimat | Not | Tag |
|---|---|---|---|
| CL3 | daktilo balon metni | `talk/typewriter.ts` (25–40 ms/karakter, cümle sonu +220 ms, virgül +110 ms), `ui/typewriter.ts` (balon boyu tam metne göre sabit, gelmeyen kısım gizli; tam metin ekran okuyucuya bir kez; tıklayınca tamam; balon kapanırsa durur; hareket azaltma tercihinde akış yok). Konuşma balonları, ask.exe cevapları ve "beyin kapalı" iması akıyor; `readingMs` akış bitince | stable-CL3 |
| CL2 | yay uçuşu + yaylanma | `pet/flight.ts`: ikinci dereceden bezier, smoothstep 3t²−2t³, 600–900 ms; kontrol noktası çalışma alanına kenetli (eğri ekrandan taşmaz); inişte kenara doğru 2 px / −1 px tam sayı yaylanma. Çağır, kenara gönder, sürükle-bırak oturma ve test modu pin bırakma uçuyor; uçarken dragged. Uçuş kareleri (≤0.9 sn, kullanıcı başlatır) sürükleme gibi 80 ms taşıma sınırından muaf | stable-CL2 |
| CL4 | ilk açılış karşılaması | `pet/welcome.ts`: setup.exe sonrası sağ kenardan peek → ortaya uçuş → karşılama lafı (daktilo) → rastgele alt köşeye uçup uyku. Sadece ilk açılış; about.txt "karşılamayı tekrar oynat"; toplantı/bugün sus'ta yok; yakalanırsa biter | stable-CL4 |
| CL5 | çoklu monitör | `src-tauri/src/monitors.rs` (saf): imlecin monitörü (negatif koordinatlı sol monitör dahil), monitör başına DPI ile mantıksal konum, görev çubuğu değişince aynı monitörü tanıma, çıkarılınca birincile dönüş. Pet artık "etkin" monitörde yaşar; sürüklerken imleç başka monitöre geçince alan değişir ve pet imlecin altına geçer (`workarea://changed` + `cursor`). Kenar yolu ve UP1 monitör başına (mevcut yapı) | stable-CL5 |
| CL1 | imzalı otomatik güncelleme | `tauri-plugin-updater` (native-tls: Windows'ta schannel), `update_check` / `update_install` komutları; uç nokta GitHub Releases `latest.json`; `requireSignedVersion`; NSIS passive. Günde bir sessiz kontrol (dev'de yok), sürüm başına bir toast, kurulum sadece about.txt [ kur ]. `createUpdaterArtifacts` sadece `tauri.release.conf.json`'da (düz build anahtar istemez). `make-latest.mjs` sürüm/not/URL'yi worker `releases.json`'dan alır (/v1/release ile aynı kaynak); `check:release` güncelleme yapılandırmasını ve `latest.json`'u denetler (`--publish`). Yerel sahte sunucu (`update:serve`) + uçtan uca test; elle akış için `tauri.update-test.conf.json` | stable-CL1 |
| CL6 | isteğe bağlı kullanım istatistiği | `desktop/src/telemetry.ts` varsayılan KAPALI, kapalıyken ağ çağrısı sıfır (testli), izinli alanlar dışında hiçbir şey gövdeye girmez. Worker `POST /v1/event`: izinli olay listesi, fazla alan 400, 256 bayt sınır, KV gün sayacı, IP/çerez yok. settings.exe açık rıza anahtarı, about.txt gizlilik satırı | stable-CL6 |

## Doğrulama (2026-10-06, bu oturum)
- desktop: vitest 1221 (72 dosya), tsc + typecheck:node temiz, `pool:check` geçti, `npm run build` (vite) geçti, `check:release` PASS (pubkey uyarısı).
- worker 143 + tsc, studio 42 + tsc.
- Rust: `cargo clippy --target x86_64-pc-windows-msvc --all-targets -- -D warnings` temiz; `cargo test` (Linux) 65/65 (monitör, site, olay yükü testleri dahil).
- **Yapılamayan (Windows'a özel):** `tauri build` + NSIS, Windows `cargo test` (Win32 canlı okuma), `npm run e2e` (betik `cmd.exe` ile wrangler açıyor). Ana checkout'ta koşulmalı.
- Gerçek ekrana/fareye dokunan test yok; görüntüler uygulamanın kendi dev sayfalarından headless.

## Görüntüler (`orchestrator/notes/ui-shots/`)
`typing-400ms.png`, `typing-1100ms.png`, `typing-done.png` (konuşma balonu + ask.exe cevabı akarken; balon boyu sabit),
`about-update-tr.png` (güncelleme satırı), `settings-cl6-tr.png` (istatistik anahtarı kapalı). Uçuş/karşılama/çoklu monitör hareket olduğu için
testlerle doğrulandı (yol, süre, sınır, yaylanma, karşılama sırası, monitör geçişi) ve manuel listede.

## Tasarımcı onayı bekleyenler
1. Karşılama lafı (placeholder): "merhaba. ben dunno. hiçbir şey bilmem. köşede uyuyorum" / "hi. i'm dunno. i know nothing. i'll be asleep in the corner".
2. Güncelleme metinleri: toast "yeni sürüm. kurmak zorunda değilsin. ama kur" (spec), "güncellemeleri kontrol et", "bakıyorum", "yeni sürüm: x", "kur", "en yenisi bu. yani bu kadar".
3. İstatistik metinleri: "kullanım sayılarını gönder" + açıklama, about.txt gizlilik satırı.
4. Daktilo hızı (25–40 ms) ve yaylanma (2 px) hissi.

## Kullanıcıya notlar
- **Güncelleme anahtarı:** `docs/RELEASE.md` 1. adım (pubkey'i tauri.conf.json'a girmek gerekiyor; özel anahtar repoya girmez).
- **GitHub Releases uç noktası:** repo özelse `latest.json` herkese açık indirilemez; yayın için herkese açık bir yer seçilip `endpoints` + `releases.json` güncellenmeli.
- **Canlı worker:** `/v1/event` ve `/v1/ask` için canlı API adresi (`VITE_API_BASE` + CSP `connect-src`) deploy sırasında girilmeli (SPEC 02'den beri açık konu).
