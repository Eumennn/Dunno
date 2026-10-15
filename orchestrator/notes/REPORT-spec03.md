# SPEC 03 raporu: laf havuzu + Dunno Studio + landing uyumlu masaüstü UI + sprite seti + dunno.exe

> SON HAL (2026-10-02 22:50). Bitiş tanımı otomatik kontrollerle tamam. Tasarımcı onayı ve kullanıcı manuel kontrolü bekleyenler aşağıda.

## Ne yapıldı
| Teslimat | Durum | Tag |
|---|---|---|
| P1 kapsam tablosu (`content/pool/COVERAGE.md`) + app listesi genişlemesi | bitti | stable-P1-20261002-2116 |
| P2 havuz: TR 388, EN 388 (ayrı yazım, çeviri değil) | bitti, **tasarımcı onayı bekliyor** | stable-P2-20261002-2127 |
| P3 `npm run pool:check` (CI’da kapsam dahil) | bitti | stable-P3-20261002-2127 |
| S1 studio liste | bitti | stable-S1-20261002-2208 |
| S2 studio düzenleme + anında doğrulama | bitti | stable-S2-20261002-2208 |
| S3 deneme paneli (gerçek LineEngine) | bitti | stable-S3-20261002-2212 |
| S4 soru cevabı denemesi | bitti | stable-S4-20261002-2212 |
| U1 ui-kit (landing’den birebir) | bitti | stable-U1-20261002-2125 |
| U2 uygulama yüzeyleri (konuşma, ask.exe, setup.exe, error.exe, toast) | bitti | stable-U2-20261002-2230 |
| U3 landing ile yan yana karşılaştırma, fark listesi kapandı | bitti | stable-U3-20261002-2230 |
| A1 32x32 sprite seti + ikonlar | bitti, **tasarımcı ince ayarı/onayı bekliyor** | stable-A1-20261002-2205 |
| A2 küçük + yavaş pet (64 px, yürüme 18 px/s) | bitti | stable-A2-20261002-2125 |
| M1 dunno.exe (home / settings.exe / stats.txt / about.txt) + stats çekirdeği (M1a) | bitti | stable-M1-20261002-2230, stable-M1a |
| M2 sade tray (dunno.exe’yi aç, bugün sus, toplantıdayım, çıkış) | bitti | stable-M2-20261002-2222 |
| Ek: caret titremesi düzeltmesi | bitti, kullanıcı testi GEÇTİ | stable-BUGCARET |
| Ek: saat dilimi tek kaynak (Rust) + kayma testi | bitti | stable-TIMESYNC |
| Ek: tek örnek (ikinci açılış dunno.exe’yi öne getirir) | bitti | (U3 içinde) |

## Doğrulama (PM, main @ 736e8ad)
- desktop: `npm ci`, `pool:check` 0 hata / 0 boşluk, vitest 191 (26 dosya), tsc temiz, `npm run tauri build` -> `Dunno_0.1.0_x64-setup.exe` 2.44 MiB, `check:release` PASS, `cargo clippy -- -D warnings` temiz, `cargo test` 46.
- studio: `npm ci`, vitest 35, tsc (sunucu dahil) temiz.
- worker: vitest 114, tsc temiz. Uçtan uca `npm run e2e` 6/6, portlar sonrasında boş.
- Bileşen CSS’inde hex yok (hex sadece `ui-kit/tokens.css`). Ekran görüntüleri sadece uygulamanın/studio’nun kendi sayfaları (headless), masaüstü değil; gerçek girdi yok.

## Dunno Studio nasıl açılır
En kolayı: kök dizindeki `Studio.cmd`'ye çift tıkla (kurar, açar, tarayıcıyı açar).
Elle (PowerShell'de script kısıtı varsa `npm` yerine `npm.cmd`):
```
cd studio; npm.cmd ci
npm.cmd run studio        # http://127.0.0.1:5180 (sadece yerel, strictPort)
```
- `pool.exe`: kategori > trigger ağacı (sayı/hedef, hedef altı pembe), arama, TR/EN, her laf için polite/street önizleme; ekle / düzenle / çoğalt / sil.
- `edit.exe`: her tuşta doğrulama; kural hatası varsa kaydetmez, hata satırında görünür.
- `try.exe`: öndeki uygulama, saat, boşta, pil, etkileşim, ağız, dil -> aktif trigger’lar, kazanan, adaylar, 10 çekiliş; sprite ve balon uygulamadakiyle aynı bileşen.
- `ask.exe`: önce havuz cevabı; "llm" düğmesi yerel worker’a (varsayılan `127.0.0.1:8787`, `STUDIO_WORKER_BASE` ile değişir). Anahtar yoksa "llm'e gitmedi, worker kendi havuzundan döndü" yazar.
- Kayıt dosyaya hemen yazar, biçim korunur, COVERAGE.md ve `desktop/assets` kopyası güncellenir. Git’e kendiliğinden girmez: `cd desktop; npm run pool:check` sonra commit. Ayrıntı `studio/README.md`.

## Havuz istatistikleri
Dil başına 388 laf (toplam 776): 16 uygulama x 10 (excel, word, powerpoint, vscode, terminal, figma, photoshop, spotify, browser, slack, discord, mail, notion, game, file_explorer, settings), saat 5 x 10, boşta 3 x 10, etkileşim 4 x 10, battery:low 8, random 40, answer:generic 60. ~%20 lafta `{K:}` sokak eki. Gece geç saat lafları "uyu artık / ben nöbet tutarım" tonunda.
- `app:game` için exe eşlemesi yok: laflar yazılı ama şimdilik tetiklenmez.
- Toplantı uygulamaları için laf yok (shh).

## Tasarımcı onayı bekleyenler
1. **Tüm havuz** (`content/pool/pool_tr.json`, `pool_en.json`, 776 laf). Studio’da gözden geçirilebilir.
2. **Sprite seti** (`desktop/assets/dunno_sheet.png/json`, Aseprite: Import Sprite Sheet 32x32; büyütülmemiş kopya `content/art/dunno_sheet_32.png`; üretici `desktop/scripts/sprites/`, `npm run gen:sheet`). Bilinen farklar: başın üstü hafif sivri, yan kollar baklava, yüz maskesi bant gibi, tüy büyük ölçekte ilmek gibi görünebiliyor; `surprised` pozu sözleşmede yok, çizilmedi.
3. **İkonlar** (uygulama + tray, logo pozundan). Tray 16 px görünümü gözle kontrol edilmedi.
4. **Arayüz metinleri** (ekip yazdı, emin olunmayanlar):
   - setup.exe TR: "dunno masaüstüne kurulsun mu?", alt açıklama çevirisi, "[ evet ]" / "[ bilmiyorum ]", "harika cevap. seninle gurur duyuyor. yine de kuruluyor."
   - ask.exe TR placeholder: "sor, cevaplamam"
   - error.exe başlıkları: EN "429: out of questions" / "503: closed today", TR "429: soru hakkı bitti" / "503: bugün kapalı", "[ tamam ]"
   - bugün sus: "bugün kapalıyım. yarın da belki." / "closed today. maybe tomorrow too."
   - durum adları (boş boş duruyor, dikizliyor, susuyor…), stats etiketleri ("dürtme", "en çok laf attığı yer"), about TR gizlilik cümleleri (landing EN’den uyarlama), tray "dunno.exe'yi aç"
5. **Yer tutucular:** about.txt site linki `[site link]`; SPEC 02’den kalanlar (OPENROUTER_API_KEY, ALERT_WEBHOOK, RL_SALT, KV id, indirme URL’leri, yayıncı alanları) REPORT-spec02’de.

## Kullanıcının manuel kontrolü bekleyenler
`orchestrator/notes/desktop-manual-test.md`: SPEC 02 maddeleri (D1, D3, D4, D8, D9, D10 kurulum) + bölüm 10 (dunno.exe). Bölüm 9 (caret) GEÇTİ.

## Kalan işler / sonraki spec listesi
- "Sürüklenince nereye yerleşsin" ayarı (yol modeli sadece kenar).
- `app:game` için oyun exe eşlemesi.
- Türkçe destekli piksel font (Silkscreen’de ı/ş/ğ yok; şu an öğe bazında Segoe’ya düşülüyor).
- EN ask.exe placeholder dar alanda kesiliyor (küçük).
- Tasarımcı sprite/ikon/metin onayından gelen düzeltmeler.
