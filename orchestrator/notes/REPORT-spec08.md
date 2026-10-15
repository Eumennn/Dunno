# SPEC 08 raporu: pet boyutu

> SON HAL (2026-10-04 12:25). Kullanıcı manuel kontrolü: `desktop-manual-test.md` bölüm 15.

## Kurulum dosyası
**`C:\Users\pc\Downloads\Dunnothebean\desktop\src-tauri\target\release\bundle\nsis\Dunno_0.1.0_x64-setup.exe`**
(2.48 MiB, 2026-10-04 12:23, ana checkout main @ 3eeae82'den build; `check:release` PASS). Eski sürümün üstüne kur.

## Ne değişti
| # | Teslimat | Not | Tag |
|---|---|---|---|
| SZ1a | Saf ölçek modülü `desktop/src/size/size.ts` | 5 kademe tam sayı ölçek (1x–5x), DPI'da keskin fiziksel piksel, pencere/pet kutusu, dolu piksel tıklama dikdörtgenleri, anchor, hız ölçekleme, kenara yeniden oturma, balon yerleşimi için pet kutusu. 52 test (5 seviye x %100/125/150 x 4 kenar) | stable-SZ1a |
| SZ1b | settings.exe "boyut" seçici + canlı uygulama | minik 1x / küçük 2x (varsayılan = eski boyut) / normal 3x / büyük 4x / dev 5x. Yeniden başlatma yok, pet kenarda kalır, yürüme hızı ölçekle, düşünme işareti ölçekli; test modunda "boyut değiştir" döngüsü | stable-SZ1b |
| SZ1c | Tıklama alanı = o anki karenin dolu pikselleri | Saydam köşeler alttaki pencereye tıklama geçirir; hover/yakınlık hâlâ pet kutusuyla (pet imleç gelince durur). Aksesuar pikselleri tıklanır, aynada da doğru | stable-SZ1c |

## Doğrulama (PM, main @ 3eeae82)
- desktop: `npm ci`, vitest 635, tsc temiz, `pool:check` 0/0, `cargo clippy -- -D warnings` temiz, `cargo test` 58.
- `npm run tauri build` (yukarıdaki dosya), `check:release` PASS.
- Gerçek ekrana/fareye dokunan test yok; tıklama geçirme Rust birim testleriyle, görüntüler uygulamanın kendi sayfasından (headless).

## Görüntüler (`orchestrator/notes/ui-shots/`)
`size-all.png`, `size-minik.png`, `size-kucuk.png`, `size-normal.png`, `size-buyuk.png`, `size-dev.png` (idle + bere + balon + düşünme işareti, peek sol/sağ; gerçek Player yolu).

## Tasarımcı onayı bekleyenler
1. Boyut etiketleri: tr minik / küçük / normal / büyük / dev, en tiny / small / normal / big / huge. Varsayılan "küçük" (bugünkü boyut).

## Bilinen
- Balon/soru kutusu metin boyutu pet boyutuyla büyümüyor (arayüz metni; sadece konumu pet'e göre).
- SPEC 09 K8b: settings'teki seçici kaydırıcı (slider) görünümüne geçecek (kademeler aynı).
