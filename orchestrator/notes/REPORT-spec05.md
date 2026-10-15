# SPEC 05 raporu: gardırop (renk temaları, aksesuarlar, tembel başarımlar)

> SON HAL (2026-10-03). Bitiş tanımı otomatik kontrollerle tamam. Kullanıcı manuel kontrolü: `desktop-manual-test.md` bölüm 12.

## Ne yapıldı
| Teslimat | Ne | Tag |
|---|---|---|
| WR1 | 5 tema (`content/wardrobe/themes.json`), WCAG kontrast testi, render sırasında rol bazlı palet değişimi (`wardrobe/recolor.ts`); kontur/göz/yanak sabit | stable-WR1a, stable-WR1b |
| WR2 | Kare başına bağlantı noktaları (`content/art/dunno_anchors.json`, 36 kare), 6 aksesuar (bere, taç, parti şapkası, gece başlığı, güneş gözlüğü, kulaklık), katmanlama + ayna + peek kenar kırpma, uykuda kafa aksesuarları gizli, tüy her şapkada görünür (testli) | stable-WR2a, stable-WR2b, stable-WR2c |
| WR3 | Tembel başarım motoru (saf, 9 başarım), olaylara bağlı, store'da kalıcı; açılınca `interaction:unlock` lafı + toast (sus/toplantıda ertelenir) | stable-WR3, stable-WR3c |
| WR4 | dunno.exe'de wardrobe.exe sekmesi: önizleme + durum seçici, tema/aksesuar ızgaraları, kilitli siluet + koşul + ilerleme, achievements.txt | stable-WR4 |
| WR5 | Testler + `npm run wardrobe:shots` (headless) + görüntüler + manuel liste | stable-WR5a, stable-WR5 |
| (ops.) | Studio try.exe kıyafet seçici: WIP olarak main'de, denenmedi | (yok) |

## Doğrulama (PM, main @ 12090b7)
- desktop: `npm ci`, vitest 347, tsc temiz, `pool:check` 0/0, `cargo clippy -- -D warnings` temiz, `cargo test` 47.
- `npm run tauri build` -> `desktop\src-tauri\target\release\bundle\nsis\Dunno_0.1.0_x64-setup.exe` (2.45 MiB), `check:release` PASS.
- studio vitest 38, worker vitest 114.
- Görüntüler (`orchestrator/notes/ui-shots/`): `wardrobe-themes.png` (5 tema x idle/walk/sleep/peek sol/sağ), `wardrobe-accessories.png` (6 aksesuar x aynı pozlar),
  `wardrobe-tab-tr.png`, `wardrobe-tab-en.png`, `wardrobe-tab-tr-full.png`, `wardrobe-tab-unlocked.png`, `wardrobe-preview-states.png`. Hepsi headless, gerçek girdi yok.

## Tasarımcı onayı bekleyenler
1. **Tema aday renkleri** (`docs/agents/ui.md` "Tema renkleri"): nane, lavanta, gece, yanmış tost. Sınırdakiler: gece gölge/kontur 2.50, yanmış tost yanak/gövde 1.25, lavanta yanak/gövde 1.28.
2. **Başarım başlıkları ve koşul metinleri** (TR/EN, `desktop/src/i18n.ts`) ve açılma toast'u ("açıldı: taç. kimse bu kadarını beklemiyordu").
3. **`interaction:unlock` lafları** (10 TR + 10 EN, `content/pool/`).
4. **6 aksesuarın piksel çizimleri** (ekip çizimi, yer tutucu kalitesinde) ve tüy kararları (taç arkada; diğer şapkalar tüyü önden çıkarır).
5. **Eksik poz varyantları:** gece başlığının uyku varyantı (şu an uykuda gizli); kulaklığın yan (walk/run_away) çizimi (şu an gizli).

## Kendi aksesuarını ekleme
`content/wardrobe/accessories/README.md`: Aseprite'tan 32x32 PNG (`<id>.png`, sadece ana palet) + `<id>.json` (anchor türü head/eyes/ears, pivot, `antenna`: through/behind, `hiddenIn` pozları).
Sonra `npm.cmd run wardrobe:shots` ile şeritleri üret ve bak; testler (`npm.cmd test`) tüy görünürlüğünü ve sınırları kontrol eder.
Kendi sprite sheet'in için bağlantı noktaları da aynı README'de.

## Bilinen
- Gardırop sekmesi 780x620'de ~460 px kaydırılıyor (içerik iki sütunda).
