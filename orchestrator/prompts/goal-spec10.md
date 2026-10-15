# HEDEF: SPEC 09'u bitir, sonra SPEC 10 (Clicky fikirleri) bitene kadar çalış

Her uyanışta oku. Durum `orchestrator/notes/plan.md`'de.

## Aşama 1: SPEC 09
`orchestrator/prompts/goal-spec09.md` Aşama 2 bitiş tanımı (K1–K8). SPEC 08 bitti. Bitince beklemeden Aşama 2.

## Aşama 2: SPEC 10 (`specs/10-clicky-ideas.md`)
Sıra: CL3 (daktilo) + CL2 (yay uçuşu) -> CL4 (karşılama) -> CL5 (çoklu monitör) -> CL1 (güncelleme) -> CL6 (telemetri, varsayılan kapalı).
Bitiş tanımı: CL1–CL6 main'de, `stable-CL*` tag'li, GitHub'da; testler, tsc, `tauri build`, clippy temiz; yeni kurulum dosyası ana checkout'ta; `REPORT-spec10.md`; manuel test bölümü 17.
Öneri dağılım: backend -> CL1 latest.json + release tutarlılığı, CL6 worker `/v1/event` + istemci sarmalayıcı (saf), CL2/CL5 saf geometri; desktop -> CL2/CL3/CL4/CL5 uygulama, CL1 updater bağlama.

## Her turda
Durum topla -> boştakine iş ver -> DONE'ları kendin doğrula -> merge + tag + `git push origin main feature/desktop feature/worker --tags` -> plan.md.

## Kurallar
Kod yazmazsın (dokümanlar hariç). Gerçek ekrana dokunan test yok. Pencere başlığı / soru metni hiçbir yere gitmez.
Updater özel anahtarı ve API anahtarları asla commit edilmez. Kullanıcıya komutlarda `npm.cmd`.
"Overloaded" hatasında 2-3 dk bekle. Limit dolarsa sıfırlanma + 5 dk'ya kendini ve mühendisleri uyandır. Tempo 10–15 dk. Bitince son raporu ver, döngüyü durdur.
