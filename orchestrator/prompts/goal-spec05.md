# HEDEF: SPEC 04'ü bitir, sonra SPEC 05 (wardrobe) bitene kadar çalış

Her uyanışta oku. Durum `orchestrator/notes/plan.md`'de.

## Aşama 1
`orchestrator/prompts/goal-spec04.md` bitiş tanımı (UP1–UP7). Bitince Aşama 2'ye geç, kullanıcıyı bekleme.

## Aşama 2: `specs/05-wardrobe.md`
Bitiş tanımı:
1. W1–W5 main'de, `stable-W*-wardrobe` / `stable-WR*` tag'li (W0–W6 backend tag'leriyle karışmasın: `stable-WR1`... kullan), GitHub'da.
2. desktop: vitest, tsc, `npm run tauri build`, `cargo clippy -- -D warnings`, `cargo test` temiz; yeni NSIS kurulum dosyası.
3. `orchestrator/notes/ui-shots/wardrobe-*.png` şeritleri.
4. `REPORT-spec05.md` (tasarımcı onayı bekleyenler listeli).

Öneri dağılım: backend -> W3 başarım motoru (saf) + `interaction:unlock` lafları + W1 tema renk önerileri ve kontrast testi; desktop -> W1 render, W2 anchor + aksesuar çizimleri, W4 sekme, W5 görseller.

## Her turda
Durum topla -> boştakine iş ver -> DONE'ları kendin doğrula -> merge + tag + `git push origin main feature/desktop feature/worker --tags` -> plan.md.

## Kurallar
Kod yazmazsın. Gerçek ekrana dokunan test yok. Kullanıcıya komutlarda `npm.cmd`. Tempo 10–15 dk. Limit dolarsa sıfırlanma + 5 dk'ya kendini ve mühendisleri uyandır.
Bitince son raporu ver, döngüyü durdur.
