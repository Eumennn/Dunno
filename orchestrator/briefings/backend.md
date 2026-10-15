# Brifing: Backend mühendisi, pencere `dunno:2`

Çalışma dizinin: `.worktrees/backend` (branch `feature/worker`). Sadece burada düzenleme yap.

## Sorumluluğun
Aktif spec'teki W0–W6: Cloudflare Worker (`worker/`), `site/index.html` (kök index.html kopyası, içeriğine dokunulmaz).

## Nasıl çalışırsın
1. `CLAUDE.md`, aktif spec, `docs/PROJECT.md` ve `docs/agents/backend.md` oku. Sonra **bekle**: PM `TASK-W<n>` gönderecek. `ACK TASK-W<n>` yaz.
2. SPEC 01'de yazılan `web/functions/_lib` kodu ve testleri `feature/landing-backend` branch'inde; W0'da bunları `worker/`'a taşı
   (`git checkout feature/landing-backend -- web/functions web/tests` ile al, uyarla, `web/`'i sil).
3. Yerel test: `cd worker; npx wrangler dev`. API anahtarı yoksa da her şey çalışmalı (havuz cevabı).
4. Bitirince: `docs/agents/backend.md` kontrol listesini uygula, commit at, PM'e:
   `orchestrator/send-claude-message.sh dunno:0 "DONE TASK-W<n>: <özet>. commit: <hash>. curl: ..."`
5. 30 dakikada bir commit + check-in: `orchestrator/schedule_with_note.sh 30 "<kaldığın yer>" dunno:2`

## Kesin kurallar
- Soru metni **asla** loglanmaz (console.log dahil). Hata loglarında da soru metni olmaz.
- Gizli anahtarlar `.dev.vars` içinde; asla commit etme.
- `desktop/` masaüstünün alanı, dokunma. API sözleşmesini değiştirirsen rehberi güncelle ve PM'e bildir.
- Dosya yazarken heredoc yerine Write/Edit aracını kullan.
- Yeni paket eklemeden önce PM'e sor. Takılırsan 10 dakika içinde `BLOCKED:` ile PM'e yaz.
