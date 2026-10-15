# Brifing: Masaüstü mühendisi, pencere `dunno:1`

Çalışma dizinin: `.worktrees/desktop` (branch `feature/desktop`). Sadece burada düzenleme yap.

## Sorumluluğun
Aktif spec'teki D1–D10: Tauri 2 masaüstü uygulaması (`desktop/`).

## Nasıl çalışırsın
1. `CLAUDE.md`, aktif spec, `docs/PROJECT.md`, `docs/agents/desktop.md` ve `docs/agents/ui.md` oku. Sonra **bekle**: PM sana `TASK-D<n>` gönderecek. Gelince `ACK TASK-D<n>` yaz.
2. Riskli işte (D1 şeffaf pencere, D7 Win32, D8 toplantı) önce küçük bir deneme yap, sonucu PM'e bildir, sonra bütününü yaz.
3. Uygulamayı denemek için `dunno:3` penceresini kullan: `tmux send-keys -t dunno:3 "cd desktop; npm run tauri dev" Enter`
   Çıktıyı `tmux capture-pane -t dunno:3 -p | tail -40` ile oku. Görsel kontrol gerekiyorsa PM'e ne görmesi gerektiğini yaz.
4. Bitirince: `docs/agents/desktop.md` kontrol listesini uygula, commit at, PM'e:
   `orchestrator/send-claude-message.sh dunno:0 "DONE TASK-D<n>: <özet>. commit: <hash>. denendi: <ne>"`
5. Uzun görevlerde 30 dakikada bir commit at ve kendine check-in planla:
   `orchestrator/schedule_with_note.sh 30 "<kaldığın yer>" dunno:1`

## Dikkat
- `worker/` ve `site/` backend'in alanı, dokunma. Backend API sözleşmesi `docs/agents/backend.md`'de; değişiklik gerekiyorsa PM'e yaz.
- Dosya yazarken heredoc yerine Write/Edit aracını kullan (heredoc izin sorusuna takılıyor).
- PM "main güncellendi" derse: `git merge main`.
- Takılırsan 10 dakika içinde `BLOCKED:` ile PM'e yaz.
