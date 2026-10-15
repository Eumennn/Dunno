# SPEC 09 raporu: kostümler, osurma, balon, uygulama temaları, sekme farkındalığı, soru anlama

> SON HAL (2026-10-06). Kullanıcı manuel kontrolü: `desktop-manual-test.md` bölüm 16.
> 2026-10-06: tmux ekibi kapatıldı; K2, K6, K7b, K8b ve K9 bağlama tek ajanla (bulut oturumu, Linux) tamamlandı. Ekibin yerelde
> bitmemiş WIP'i GitHub'a hiç gitmemişti (feature/desktop, feature/worker eski), o yüzden bu işler main üstünde baştan yazıldı.

## Kurulum dosyası
Bu oturum Linux bulut konteyneri: Windows NSIS kurulumu burada üretilemez. Ana checkout'ta (Windows):
```
cd C:\Users\pc\Downloads\Dunnothebean\desktop
npm.cmd ci
npm.cmd run tauri build
npm.cmd run check:release
```
Çıktı: **`C:\Users\pc\Downloads\Dunnothebean\desktop\src-tauri\target\release\bundle\nsis\Dunno_0.1.0_x64-setup.exe`**.

## Ne değişti
| # | Teslimat | Not | Tag |
|---|---|---|---|
| K1 | aksesuar uyumu | anchor yeniden ölçümü, overflow, fit testi (ekip) | stable-K1 |
| K2 | 8 kostüm | böcek, sinek, arı, hayalet, dinozor, kurbağa, astronot, pizza dilimi. Kostüm = rol renkleri + şeritler + noktalara oturan parçalar, `hidesTuft`, `blocks` (kapattığı slotlar), kanat çırpma (çift/tek kare). wardrobe.exe `costumes` ızgarası, başarımlarla açılır | stable-K2 |
| K3 | osurma | (ekip) | stable-K3 |
| K4 | çizgi roman balonu | (ekip) | stable-K4 |
| K5 | uygulama geneli 16 tema | (ekip); ek: anahtar ve kaydırıcı konturu `--text` (gece yarısında kayboluyordu) | stable-K5 |
| K6 | 14 yeni aksesuar + slotlar | kovboy şapkası, korsan bandanası, aşçı şapkası, sihirbaz şapkası, pelerin, papyon, monokl, nerd gözlüğü, atkı, kedi kulakları, kurdele, çiçek, mezuniyet kepi, inşaat kaskı. Slotlar head/eyes/neck/body/side, slot başına bir, en fazla 3 (en eski çıkar). Yeni `neck` bağlantı noktası. Eski tek aksesuarlı kayıt taşınır | stable-K6 |
| K7 | sekme başlığı farkındalığı | K7a eşleme + 156 laf/dil (ekip). K7b: başlık **Rust'ta** okunup gömülü `sites.json` ile kategoriye çevrilir; webview'e sadece kategori gider. settings.exe "sekme adlarına bak" (varsayılan açık, kapalıyken başlık hiç okunmaz). Sessiz kategori (adult) önde iken hiç laf yok. TS ve Rust aynı örnek tablosuyla test edilir | stable-K7 |
| K8 | soru anlama + ters cevap + havuz 25 | (ekip) | stable-K8 |
| K8b | boyut kaydırıcısı | settings.exe boyut seçici kademeli kaydırıcı (ui-kit `stepSliderHtml`), sadece 5 tam kademe | stable-K8b |
| K9 | başarımlar | K9a tablo (ekip). Bağlama: soru tipi, honest (charged), too_fast, peek başlangıcı, "bugün sus" olayları artık sayılıyor | stable-K9 |

## Doğrulama (2026-10-06, bu oturum)
- desktop: vitest 1183 (65 dosya), tsc + typecheck:node temiz, `pool:check` geçti, `vite build` geçti.
- worker 136, studio 42, tsc temiz.
- Rust: `cargo clippy --target x86_64-pc-windows-msvc --all-targets -- -D warnings` temiz; `cargo test` (Linux, Windows'a özel okuma testleri hariç) 60/60.
- **Yapılamayan:** Windows `tauri build` + `check:release` ve Windows'ta `cargo test` (Win32 canlı okuma testleri). Yukarıdaki komutlarla ana checkout'ta.
- Gerçek ekrana/fareye dokunan test yok. Görüntüler uygulamanın kendi dev sayfalarından headless (Chromium).

## Görüntüler (`orchestrator/notes/ui-shots/`)
`costume-<id>.png` (8 kostüm: idle/walk/sleep/peek, sağ ve sol), `fit-<id>.png` (14 yeni aksesuar: walk + run_away, sağ/sol),
`wardrobe-k2k6-tr.png`, `wardrobe-k2k6-testmode-en.png` (kostüm ızgarası, 3 parça + kostüm), `settings-k7-k8b-tr.png`, `settings-k7-k8b-midnight-en.png`
(sekme anahtarı + boyut kaydırıcısı; gece yarısında okunur). Ekipten: `fart-*`, `bubble-*`, `theme-ui-*`, `fit-*` (ilk 6).

## Tasarımcı onayı bekleyenler
1. **Kostüm çizimleri (8)** ve **14 yeni aksesuar**: placeholder (üretici haritaları `desktop/scripts/sprites/costumes.mjs`, `accessories.mjs`). Kostüm renkleri mevcut tema renklerinden.
2. Yeni temalar (11), UI rol renkleri (K5).
3. Fart lafları (`content/pool/PENDING-K3.md`), site lafları (`PENDING-K7.md`), ters cevaplar ve yeni tip havuzları (`PENDING-K8.md`, `inverse.md`).
4. Başarım adları/koşulları (K9, `achievements-k9.md`).
5. Yeni arayüz metinleri: "sekme adlarına bak" / "başlığı okur, unutur. hiçbir yere göndermez."; about.txt gizlilik satırı "sekme adına bir bakarım, türünü anlarım, unuturum. ayarlardan kapatılır."; dolap "her yere bir tane. en fazla 3 parça. fazlası moda değil", "kostüm kapatıyor", slot adları.

## Kullanıcıya not: landing ile çelişki (K7)
Landing FAQ: *"i only know which app you're in. honestly i'd rather not know that either. nothing gets stored."*
K7 ile dunno, ayar açıkken öndeki sekmenin **türünü** de anlıyor (başlık saklanmıyor/gönderilmiyor). Landing yeniden yazılmadığı için
metin değiştirilmedi; FAQ'ya "sekme adına bakıp türünü anlar, unutur; kapatılabilir" eklenmesi önerilir (karar kullanıcıda).

## Bilinen
- Kostüm parçaları yandan pozda basit (dinozor kuyruğu ve astronot sırt çantası ayrı yan çizimli; böcek bacakları sadece önden).
- Studio try.exe tek aksesuar ve kostümsüz önizler (opsiyonel araç).
- Hayalet/astronot gibi beyaz kostümler beyaz balonun yanında düşük kontrastlı; tasarımcı çiziminde ele alınmalı.
