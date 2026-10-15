# HEDEF: SPEC 08'i bitir, sonra SPEC 09 bitene kadar çalış

Her uyanışta oku. Durum `orchestrator/notes/plan.md`'de.

## Aşama 1: SPEC 08 (`specs/08-pet-size.md`)
`orchestrator/prompts/goal-spec08.md` bitiş tanımı. (Bilgisayar yeniden başladığı için SPEC 08 hiç başlamamıştı.) Bitince beklemeden Aşama 2.

## Aşama 2: SPEC 09 (`specs/09-costumes-themes-understanding.md`)
Sıra: K1 (aksesuar uyumu) -> K4 (balon) + K3 (fart) -> K5 (UI temaları) -> K2 (kostümler) + K6 (aksesuarlar) -> K7 (sekme) ; K8 (soru anlama + havuz) paralelde backend'de.
Bitiş tanımı:
1. K1–K8 main'de, `stable-K*` tag'li, GitHub'da.
2. desktop + worker + studio: testler, tsc, `pool:check`, `npm run tauri build`, `cargo clippy -- -D warnings`, `cargo test` temiz.
3. Spec'teki headless görüntüler.
4. Yeni kurulum dosyası ana checkout'ta; `REPORT-spec09.md` (tam yol + tasarımcı onayı bekleyenler); manuel test bölümü 16.

Öneri dağılım: backend -> K8 (sınıflayıcı + ters tablo + havuz), K7 eşleme tablosu + site lafları + testler, K3 fart lafları ve tetik kuralları (saf), K5 tema renkleri + UI kontrast testleri;
desktop -> K1, K4, K3 sprite + bağlama, K5 UI uygulaması, K2 kostümler, K6 aksesuarlar, K7 Rust tarafı + ayar.

## Her turda
Durum topla -> boştakine iş ver -> DONE'ları kendin doğrula -> merge + tag + `git push origin main feature/desktop feature/worker --tags` -> plan.md.

## Kurallar
Kod yazmazsın (doküman güncellemeleri hariç: PROJECT.md animasyon listesi, ui.md tema/balon istisnaları). Gerçek ekrana dokunan test yok.
Pencere başlığı hiçbir yerde loglanmaz/saklanmaz/gönderilmez: review'da özellikle kontrol et.
Kullanıcıya komutlarda `npm.cmd`. "Overloaded" hatasında 2-3 dk bekle. Limit dolarsa sıfırlanma + 5 dk'ya kendini ve mühendisleri uyandır.
Tempo 10–15 dk. Bitince son raporu ver, döngüyü durdur.
