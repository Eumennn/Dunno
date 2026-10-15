# HEDEF: SPEC 08 (pet boyutu) bitene kadar çalış

Her uyanışta oku. Durum `orchestrator/notes/plan.md`'de.

## Bitiş tanımı
1. SZ1–SZ2 main'de, `stable-SZ*` tag'li, GitHub'da.
2. desktop: vitest, tsc, `npm run tauri build`, `cargo clippy -- -D warnings`, `cargo test` temiz.
3. Yeni kurulum dosyası **ana checkout'ta** `desktop/src-tauri/target/release/bundle/nsis/Dunno_*_x64-setup.exe` (main'den build), raporda tam Windows yolu ve saat.
4. `size-*.png` görüntüleri; `REPORT-spec08.md`; manuel test bölümü 15.

Öneri dağılım: backend -> saf ölçek fonksiyonları + testler; desktop -> uygulama, settings UI, görüntüler.

## Her turda
Durum topla -> boştakine iş ver -> DONE'ları kendin doğrula -> merge + tag + `git push origin main feature/desktop feature/worker --tags` -> plan.md.

## Kurallar
Kod yazmazsın. Gerçek ekrana dokunan test yok. Kullanıcıya komutlarda `npm.cmd`. "Overloaded" hatasında 2-3 dk bekle.
Limit dolarsa sıfırlanma + 5 dk'ya kendini ve mühendisleri uyandır. Tempo 10–15 dk. Bitince son raporu ver, döngüyü durdur.
