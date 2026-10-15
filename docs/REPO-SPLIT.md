# Repo bölme (REPO-01, 2026-10-10 güncel)

| Repo | Görünürlük | Geçmiş | İçerik |
|---|---|---|---|
| `eumennn/dunno` | herkese açık | yok (yeni) | **landing** (`index.html`, GitHub Pages: `eumennn.github.io/Dunno` (büyük D: Pages yolu harf duyarlı)), README, PRIVACY, CHANGELOG, SECURITY; **Releases**: `Dunno-setup.exe`, `Dunno.dmg`, sürümlü kopyalar, imzalı `latest.json` |
| `eumennn/dunno-dev` (bu repo, eski adı `dunnothebean`) | **özel** | korunur | Tauri/TS/Rust masaüstü, worker, studio, ui-kit, testler, spec'ler, orchestrator, içerik/varlıklar, CI |

Ayrı web reposu (`dunno-web`) kaldırıldı: landing kullanıcı reposundan yayınlanır.
Tanım: `orchestrator/repo-split/manifest.json`. Şablonlar: `orchestrator/repo-split/public-app/`. Landing kaynağı `site/index.html` (ihracatta köke `index.html`).

## İhracat ve denetim (yerel, push yok)
```
node orchestrator/repo-split/split.mjs --out ..\dunno-split
```
Herkese açık repo klasörünü üretir ve denetler: yasaklı yol (orchestrator, specs, CLAUDE.md, kaynak kod, iç tasarım dosyaları),
gizli bilgi kalıbı (API anahtarı, GitHub/Slack token, özel anahtar, tauri imza anahtarı, webhook), kişisel iz (`C:\Users\<ad>`, geliştirici e-postası).
Test: `desktop/scripts/repo-split.test.ts`.

## Kurulum (bir kez)
1. `eumennn/dunno` boş ve herkese açık (açıldı). İhracat çıktısı oraya `main` olarak gönderilir (landing ya da README değişince tekrar).
2. `eumennn/dunno` > Settings > Pages > Source: **Deploy from a branch**, Branch: `main`, klasör `/ (root)`. Adres: `https://eumennn.github.io/Dunno/`.
   Domain alınca: aynı sayfada Custom domain + DNS'te `CNAME` kaydı `eumennn.github.io` (ihracata `CNAME` dosyası eklenir).
3. Bu repo: Settings > General > adı `dunno-dev`, en altta Change visibility > **Private**. (GitHub eski adresi yeni ada yönlendirir; yerel klonlar çalışmaya devam eder.)
4. Sırlar ve ilk sürüm: `docs/RELEASE.md` 4. adım (`release.yml`).

## Gizli bilgi denetimi (2026-10-06)
Ayrıntı: `orchestrator/notes/secret-audit.md`. Özet: geçmişte (418 commit, tüm dallar) anahtar/token/özel anahtar yok; `.dev.vars` hiç commit edilmemiş;
döndürülecek (rotate) bir şey yok. Kişisel izler (commit yazar e-postası, `C:\Users\pc` yolları) sadece özel repoda kalır; herkese açık repolar geçmişsiz başlar.
