# HEDEF: SPEC 02'yi kapat, sonra SPEC 03 bitene kadar çalış (PM döngü görevi)

Her uyanışta yeniden okunur. Durumu `orchestrator/notes/plan.md`'den al, kaldığın yerden devam et.

## Aşama 1: SPEC 02'yi kapat
`orchestrator/prompts/goal-spec02.md` bitiş tanımı. Kalanlar (gece 03:05'te oturum kapandı):
- feature/desktop WIP `3947f2d` (D8/D9 bağlama) -> bitir, doğrula, merge.
- feature/worker `848862d` (api.ts VITE_API_BASE) -> doğrula, merge.
- Uçtan uca kontrol (masaüstü <-> yerel worker, worker kapalıyken havuz).
- D10: build, kurulum dosyası; kurup kaldırma kontrolünü kullanıcı listesine yaz.
- `REPORT-spec02.md` son hali. Kullanıcının manuel kontrolü hâlâ bekleyenler raporda açıkça.
Kullanıcının manuel onayını **bekleme**; SPEC 02 otomatik kontrollerle kapanınca Aşama 2'ye geç.

## Aşama 2: SPEC 03 (`specs/03-pool-editor-ui.md`)
Bitiş tanımı:
1. P1–P3, S1–S4, U1–U3, A1–A2, M1–M2 main'de, `stable-*` tag'li, GitHub'da.
2. `npm run pool:check`, desktop + studio testleri, `tauri build`, `cargo clippy -- -D warnings` main'de temiz.
3. `orchestrator/notes/ui-shots/` altında her yüzey için landing ile yan yana karşılaştırma ve kapanmış fark listesi.
4. `REPORT-spec03.md`: studio nasıl açılır, havuz istatistikleri, tasarımcı onayı bekleyen laflar, kalan işler.

## Her turda
1. `orchestrator/status.sh dunno 25`, `git log --oneline --all -15`, `plan.md`.
2. Boştaki mühendise iş ver, takılanı çöz (3 tur aynı hata: yaklaşım değiştir), kapanmış Claude'u `claude --continue --permission-mode auto` ile aç.
3. DONE'ları rehber kontrol listesi + spec kabul kriterleriyle kendin doğrula; geçerse merge + tag + diğerine `git merge main`.
4. `plan.md` güncelle, commit, `git push origin main feature/desktop feature/worker --tags` (force yok).
5. Kullanıcıya rapor sadece durum değiştiyse, 3 satır.

## Kurallar
- Kod sen yazmazsın. Asset/anahtar/URL uydurma. Mühendise mesajdan önce prompt boş mu bak.
- **Gerçek ekrana dokunan test YASAK** (CLAUDE.md "Test güvenliği"). Gece bir test tıklaması Riot Vanguard penceresine gitti ve bir pencereye yazı yazıldı; tekrarlanmayacak.
- Kullanım limiti dolarsa sıfırlanma + 5 dk'ya `schedule_with_note.sh` ile kendini ve mühendisleri uyandır.

## Tempo
Aktifken 10–15 dk, uzun işlerde 25–30 dk. Aşama 2 bitiş tanımı tamamsa son raporu ver ve döngüyü durdur.
