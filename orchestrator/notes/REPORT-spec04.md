# SPEC 04 raporu: arayüz cilası

> SON HAL (2026-10-03). Bitiş tanımı otomatik kontrollerle tamam. Kullanıcı manuel kontrolü: `desktop-manual-test.md` bölüm 11.

## Ne değişti
| Teslimat | Ne | Tag |
|---|---|---|
| UP1 | `placePopover` konumlandırma motoru (saf, 53 tablo testi: 4 kenar, 4 köşe, %100/125/150, çoklu monitör, uzun metin) | stable-UP1 |
| UP2 | ask.exe pet'e piksel kuyrukla bağlı balon, 256 px, her zaman ekranın içine açılır | stable-UP2 |
| UP3 | error.exe aynı motorla, `[ tamam ]` ya da 6 sn sonra kapanır | stable-UP3 |
| UP4 | home: tek piksel anahtar + açıklama, canlı önizleme pozu, today.txt (kalpler, yenilenme saati, bugün atılan laf), "kenara gönder" | stable-UP4 |
| UP5 | settings.exe anahtarları, TR satır kırılması, min 720x580, klavye/focus, son sekme hatırlanır | stable-UP5 |
| UP6 | `ui-shots/up-{ask,error,speech,toast,setup}.png`: 4 kenar + 4 köşe, hepsi "fits" (8 px iç boşluk) | stable-UP6 |
| UP7 | `facingForEdge`: peek sol kenarda aynalı, uyku kenara sırt, yürüme hareket yönü; `ui-shots/up7-peek-{left,right}.png` | stable-UP7 |

Teknik: yüzey açılınca pet penceresi pet+yüzey kutusuna büyür (Rust `set_window_box`, odak çalmaz), kapanınca 96x84 tabana döner. Koordinatlar çalışma alanına göre (görev çubuğu hariç); çoklu monitör ofsetini Rust ekler.

## Doğrulama (PM, main @ 1346021)
- desktop: `npm ci`, vitest 297, tsc temiz, `pool:check` 0/0, `cargo clippy -- -D warnings` temiz, `cargo test` 47.
- `npm run tauri build` -> `desktop\src-tauri\target\release\bundle\nsis\Dunno_0.1.0_x64-setup.exe` (2.45 MiB), `check:release` PASS.
- Ekran görüntüleri uygulamanın kendi önizleme sayfalarından (headless); gerçek girdi yok.

## Manuel test
`orchestrator/notes/desktop-manual-test.md` bölüm 11 (kenar/köşe balonları, error.exe 6 sn, %125/%150 ölçek, ikinci monitör, peek yönü, home anahtarları, klavye).

## Bilinen
- Balon açılırken/kapanırken pencere boyut değişiminde tek karelik titreme olabilir (manuel listede).
- Yolda üst kenar yok; `top` fonksiyonda kapsandı (peek yerine idle).
