# HEDEF: SPEC 02 bitene kadar çalış (PM döngü görevi)

Bu metin her uyanışta yeniden okunur. Her turda **baştan** değerlendir, kaldığın yerden devam et. Plan `orchestrator/notes/plan.md`'de yaşar.

## Bitiş tanımı (elde tutulur sonuç)
Aşağıdakilerin **hepsi** doğru olduğunda hedef tamamdır:
1. `specs/02-backend-desktop.md` içindeki W0–W6 ve D1–D10 `main`'e merge edilmiş, her biri `stable-*` tag'li.
2. `main` üzerinde: `cd worker; npm ci; npx vitest run; npx tsc --noEmit` ve `cd desktop; npm ci; npm run tauri build; cd src-tauri; cargo clippy -- -D warnings; cargo test` hatasız.
3. Üretilen Windows yükleyicisi (`desktop/src-tauri/target/release/bundle/nsis/*.exe`) kurulup açılıyor; kullanıcı manuel test protokolünü (`orchestrator/notes/desktop-manual-test.md`) geçti diye onay verdi.
4. Masaüstü uygulaması yerel `wrangler dev` worker'ına bağlanıp `/v1/ask` ve `/v1/lines` kullanıyor; worker kapalıyken de havuzla çalışıyor.
5. `orchestrator/notes/REPORT-spec02.md` yazılmış: ne yapıldı, nasıl kurulur/çalıştırılır, bekleyen asset ve anahtarlar, bilinen sorunlar, önerilen SPEC 03.

## Her turda yapılacaklar (sırayla)
1. **Durum topla:** `orchestrator/status.sh dunno 25`, `git log --oneline --all -15`, `plan.md`.
2. **Takılmaları çöz:**
   - İzin sorusu varsa o pencereye yazma; kullanıcıya tek satırla bildir, diğer işlere devam et.
   - Boştaki mühendise sıradaki görevi ver. Bağımlılık yüzünden boşsa öne çekilebilir bağımsız iş ver.
   - Aynı hatada 3 tur: yaklaşımı değiştir, web araştırması iste, görevi böl.
   - Claude kapanmışsa (PowerShell prompt'u): `claude --continue --permission-mode auto` ile aç, brifingi tekrar gönder.
3. **DONE gelenleri doğrula:** rehber kontrol listesi + spec kabul kriterleri, komutları kendin çalıştır. Geçerse merge + tag + diğerine `git merge main`.
4. **Kayıt:** `plan.md` güncelle, main'e commit et; öğrenileni `orchestrator/LEARNINGS.md`'ye ekle;
   `git push origin main feature/desktop feature/worker --tags` (force yok).
5. **Kullanıcıya rapor** (sadece durum değiştiyse, 3 satır): bitti / sürüyor / senden istenen.

## Kurallar
- Kod sen yazmazsın. Kapsam sadece SPEC 02.
- Asset, anahtar, webhook, URL uydurma; yer tutucu bırak, raporda listele.
- Mühendise mesaj göndermeden önce prompt'un boş olduğunu kontrol et.
- Deploy, ücretli servis, API anahtarı isteme: yapma. GitHub'a push serbest (kullanıcı istedi), force push yasak.

## Tempo
- Mühendisler aktifken 10–15 dk, herkes uzun işteyse veya kullanıcı bekleniyorsa 25–30 dk.
- Bitiş tanımı tamamsa son raporu ver ve döngüyü **durdur**.
- `/loop` çalışmıyorsa: `orchestrator/schedule_with_note.sh <dk> "goal-spec02: <sıradaki adım>" dunno:0`
