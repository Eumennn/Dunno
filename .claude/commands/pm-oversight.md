---
description: PM olarak bir spec'i kilitle ve mühendisleri tamamlanana kadar düzenli check-in'lerle yönet
---

Bu spec üzerinde KİLİT oluştur ve proje yöneticisi olarak yürütmeyi denetle:

$ARGUMENTS

Argüman bir spec yoludur (örn. `specs/01-landing-page.md`). Boşsa `specs/` altındaki en yüksek numaralı spec'i al.

1. Oku: `CLAUDE.md`, spec, `orchestrator/briefings/pm.md`, `docs/PROJECT.md`, `docs/agents/desktop.md`, `docs/agents/backend.md`, `docs/agents/ui.md`.
2. `orchestrator/notes/plan.md` yoksa oluştur (teslimat, sahip, bağımlılık, durum); varsa oradan devam et.
3. Mühendislere görevleri **tek tek** ver (`orchestrator/send-claude-message.sh dunno:<n> "TASK-..."`). Çalışan mühendisi bölme.
4. Her DONE'da ilgili rehberin "Teslim kontrol listesi"ni ve spec'in kabul kriterlerini doğrula. Görsel teslimatlarda `docs/agents/ui.md` "Görsel doğrulama" adımlarını uygula.
5. Dev sunucusu penceresini (`dunno:3`) düzenli oku, hataları ilgili mühendise ilet.
6. Geçen işi main'e merge et, tag at, diğer mühendise `git merge main` dedirt.
7. Her turun sonunda kendine check-in planla: `orchestrator/schedule_with_note.sh 15 "<somut sonraki adım>" dunno:0`

Kilit: sadece bu spec'in kapsamı. Kapsam dışı fikirler `plan.md` içindeki "sonraki spec" listesine.
Yolunu kaybedersen spec'e ve plan.md'ye dön.
