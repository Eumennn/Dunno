# Gizli bilgi denetimi (REPO-01, 2026-10-06)

Kapsam: `git log --all -p` (418 commit, tüm uzak dallar: main, feature/desktop, feature/worker, feature/landing-*, claude/*), çalışma ağacı.

| Kontrol | Sonuç |
|---|---|
| API anahtarı kalıpları (`sk-or-v1-`, `sk-`, `AIza`, `AKIA`) | yok |
| GitHub / Slack / Discord token ve webhook | yok |
| Özel anahtar (`BEGIN … PRIVATE KEY`, minisign/tauri `encrypted secret key`) | yok |
| `TAURI_SIGNING_PRIVATE_KEY`, `OPENROUTER_API_KEY`, `RL_SALT`, `ALERT_WEBHOOK` değerli atama | yok (sadece boş örnek ve `dev-only-change-me` yer tutucu) |
| `.env`, `.dev.vars`, `*.key`, `*.pem`, `*.p12` dosyası | hiç eklenmemiş; sadece `*.dev.vars.example` (boş değerler) |
| İç veri | orchestrator notları, spec'ler, CLAUDE.md, tasarım referansları: özel repoda kalır |
| Kişisel iz | commit yazar e-postası (405 commit), `C:\Users\pc` yolu (20 yer): sadece özel repoda; herkese açık ihracatta yok (split.mjs denetler) |

**Döndürme (rotation) gerekmiyor.** Canlı sırlar (OpenRouter anahtarı, RL_SALT, alarm webhook'u, updater özel anahtarı) hiç repoya girmedi;
yerelde `.dev.vars` ve kullanıcının `%USERPROFILE%\.tauri\` klasöründe. Updater özel anahtarı henüz üretilmedi.

Önlemler: `.gitignore` (`.dev.vars`, `.env*`, `*.key`, `desktop/release/`), `check:release` (createUpdaterArtifacts sadece release config'te, pubkey ≠ özel anahtar),
`split.mjs` herkese açık ihracat denetimi.
