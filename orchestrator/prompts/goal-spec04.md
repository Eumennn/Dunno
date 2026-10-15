# HEDEF: SPEC 04 (arayüz cilası) bitene kadar çalış

Her uyanışta oku. Durum `orchestrator/notes/plan.md`'de.

## Bitiş tanımı
1. UP1–UP6 main'de, `stable-UP*` tag'li, GitHub'da.
2. desktop: vitest, tsc, `npm run tauri build`, `cargo clippy -- -D warnings`, `cargo test` temiz; yeni NSIS kurulum dosyası.
3. `orchestrator/notes/ui-shots/up-*.png`: her yüzey 4 kenar + 4 köşede, taşma yok.
4. `REPORT-spec04.md` kısa: ne değişti, kurulum dosyası yolu, manuel test bölümü.

## Her turda
Durum topla (status.sh, git log, plan.md) -> boştakine iş ver (UP1'i backend'e verebilirsin: saf fonksiyon + testler; UP2–UP5 desktop) ->
DONE'ları kendin doğrula -> merge + tag + push (`git push origin main feature/desktop feature/worker --tags`) -> plan.md.

## Kurallar
- Kod yazmazsın. Gerçek ekrana dokunan test yok.
- Kullanıcıya komut verirken `npm` yerine `npm.cmd` yaz (PowerShell script kısıtı).
- Tempo 10–15 dk. Bitince son raporu ver, döngüyü durdur.
