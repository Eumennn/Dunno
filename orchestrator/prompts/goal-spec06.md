# HEDEF: SPEC 05'i bitir, sonra SPEC 06 (soru davranışı) bitene kadar çalış

Her uyanışta oku. Durum `orchestrator/notes/plan.md`'de.

## Aşama 1
`orchestrator/prompts/goal-spec05.md` bitiş tanımı (WR1–WR5, REPORT-spec05). Bitince kullanıcıyı beklemeden Aşama 2.

## Aşama 2: `specs/06-ask-behavior.md`
Bitiş tanımı:
1. Q1–Q6 main'de, `stable-Q*` tag'li, GitHub'da.
2. desktop + worker: vitest, tsc, `npm run tauri build`, `cargo clippy -- -D warnings`, `cargo test`, `pool:check` temiz; yeni NSIS kurulum dosyası.
3. Ekran görüntüleri (`orchestrator/notes/ui-shots/ask-*.png`).
4. `REPORT-spec06.md` (20 örnek soru -> tip -> cevap tablosu, tasarımcı onayı bekleyenler).

Öneri dağılım: backend -> Q2 havuz lafları, Q3 worker (prompt + sözleşme + rate limit), Q1 sınıflayıcı (saf); desktop -> Q3 istemci akışı, Q4 tempo/kilit + UI, Q5 sahte düşünme, Q6 görüntüler.
Marka kuralı değişikliğini (günde 3 doğru+kinayeli cevap) `docs/PROJECT.md`, `CLAUDE.md`, `docs/agents/backend.md`'ye işlet (PM yapar, commit).

## Her turda
Durum topla -> boştakine iş ver -> DONE'ları kendin doğrula -> merge + tag + `git push origin main feature/desktop feature/worker --tags` -> plan.md.

## Kurallar
Kod yazmazsın (doküman güncellemeleri hariç). Gerçek ekrana dokunan test yok. Kullanıcıya komutlarda `npm.cmd`.
API "Overloaded" hatalarında 2-3 dk bekle, tekrar dene. Limit dolarsa sıfırlanma + 5 dk'ya kendini ve mühendisleri uyandır.
Tempo 10–15 dk. Bitince son raporu ver, döngüyü durdur.
