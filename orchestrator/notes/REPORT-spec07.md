# SPEC 07 raporu: kullanıcı geri bildirimi, 2. tur

> SON HAL (2026-10-03 23:35). Kullanıcı manuel kontrolü: `desktop-manual-test.md` bölüm 14.

## Kurulum dosyası
**`C:\Users\pc\Downloads\Dunnothebean\desktop\src-tauri\target\release\bundle\nsis\Dunno_0.1.0_x64-setup.exe`**
(2.48 MiB, 2026-10-03 23:32, ana checkout main @ a2514d3'den build; `check:release` PASS). Eski sürümün üstüne kur.

## Ne değişti
| # | Sorun | Kök neden / çözüm | Tag |
|---|---|---|---|
| FB1 | Bere peek'te havada, duvarın ötesine taşıyor | Uygulama aksesuarı ayrı bir canvas overlay yoluyla çiziyordu ve kenar kırpmasını (clipRight) hiç uygulamıyordu; şeritler doğru yoldan çizildiği için sorun görünmemişti. Artık pet ve önizleme tek kaynak `dress.ts/composeFrame` ile çiziliyor, overlay kaldırıldı. Gerçek sheet + PNG'lerle sınır testi: 5 tema x 6 aksesuar x her kare, aynalı peek dahil | stable-FB1, stable-FB1b |
| FB2 | Tüm tema/aksesuarları görmek | Gizli test modu: about.txt sürüm satırına 5 tık. Hepsi açık (ilerleme silinmez), 9 başarımı tetikle, doğru cevap hakkını sıfırla, soru temposunu kapat, toplantı başlat/bitir, 8 kenar/köşeye gönder | stable-FB2a, stable-FB2b |
| FB3 | dunno.exe genişlesin | 900x620 varsayılan, büyüt düğmesi + başlığa çift tık, boyut/konum/büyütülmüş hali hatırlanır (sökülen monitörde ortada açılır); içerik ve Dunno (5x/7x/9x) pencereyle büyür, home dikeyde dolar | stable-FB3, stable-FB3b |
| FB4 | "toplantıdayım" kapanınca geç geliyor | Çıkışta her durumda 10 sn bekleniyordu (elle kapatmada da) + 750 ms yoklama; shh animasyonu bitmeden saklanıyordu. Elle kapatma ~10 ms, Zoom/Teams kapanınca ≤1.5 sn (testli), shh tam oynar | stable-FB4 |
| FB5 | Balonlar çok hızlı gidiyor | Süre 4–12 sn (karakter başına), uzun doğru cevapta 14 sn; imleç üstündeyken kapanmaz, tıklayınca kapanır; settings "balon süresi: kısa / normal / uzun" | stable-FB5a, stable-FB5 |
| FB6 | Düşünme fark edilmiyor | Pet'in başının üstünde piksel noktalar / uzun düşünmede kum saati; "düşünüyor" metni en az bir kez (uzunda 2–3) değişir | stable-FB6a, stable-FB6b, stable-FB6 |

## Doğrulama (PM, main @ a2514d3)
- desktop: `npm ci`, vitest 579, tsc + `typecheck:node` temiz, `pool:check` 0/0, `cargo clippy -- -D warnings` temiz, `cargo test` 56, `npm run e2e` 7/7 (sonra portlar boş, workerd yok).
- `npm run tauri build` (yukarıdaki dosya), `check:release` PASS. worker vitest 133 + tsc; studio vitest 40.
- Gerçek ekrana/fareye dokunan test yok. Görüntüler uygulamanın kendi sayfalarından (headless).

## Görüntüler (`orchestrator/notes/ui-shots/`)
- FB1: `wardrobe-edge-classic.png`, `wardrobe-edge-lavender.png`, `wardrobe-edge-night.png` (6 aksesuar x peek sol/sağ, sleep, sulk, run_away, dragged, walk sol/sağ; gerçek Player yolu).
- FB2: `fb2-testmode-tr.png`, `wardrobe-tab-testmode.png`.
- FB3: `fb3-home-900.png`, `fb3-home-1600.png`, `fb3-home-1920.png`, `fb3-wardrobe-1600.png`, `fb3-stats-1600.png`, `fb3-about-*.png`.
- FB6: `fb6-thinking-dots.png`, `fb6-thinking-hourglass.png`.

## Tasarımcı onayı bekleyenler
1. Test modu metinleri (`desktop/src/devmode/strings.ts`): "test modu. kimseye söyleme", "test modu kapandı. hiç olmadı say", düğme etiketleri.
2. "balon süresi" ayar etiketi; home "toplantıda, saklanıyor".
3. Pet üstü düşünme işaretinin çizimi (nokta ve kum saati, ekip çizimi).

## Bilinen
- Test modu bir geliştirici aracı; kapatınca kilitli seçimler klasik/aksesuarsız döner, ilerleme aynı kalır.
- Toplantı uygulaması (Zoom/Teams) açık kaldıkça çıkış 10 sn beklemeye devam eder (pencereler arası geçişte titreme olmasın diye); uygulama kapanınca ≤1.5 sn.
