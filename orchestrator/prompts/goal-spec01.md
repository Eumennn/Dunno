# HEDEF: SPEC 01 bitene kadar çalış (PM döngü görevi)

Bu metin her uyanışta yeniden okunur. Her turda **baştan** değerlendir, kaldığın yerden devam et. Tekrar planlama yapma; plan `orchestrator/notes/plan.md`'de yaşar.

## Bitiş tanımı (elde tutulur sonuç)
Aşağıdakilerin **hepsi** doğru olduğunda hedef tamamdır:
1. `specs/01-landing-page.md` içindeki F1–F11 ve B1–B4 `main`'e merge edilmiş, her biri `stable-*` tag'li.
2. `main` üzerinde temiz kurulumla: `cd web; npm ci; npm run build; npx astro check; npx vitest run` hatasız.
3. `npx wrangler pages dev` ile site yerelde açılıyor; `/`, `/download` (302), `/api/release` (JSON), `/api/ask` (anahtarsız havuz cevabı, 4. istekte 429) çalışıyor.
4. `docs/agents/ui.md` "Görsel doğrulama" ile `Dunno OS.html`'e karşı bölüm bölüm kontrol yapılmış, açık fark kalmamış.
5. `docs/agents/frontend.md` ve `backend.md` kontrol listeleri son haliyle geçiyor.
6. `orchestrator/notes/REPORT-spec01.md` yazılmış: ne yapıldı, nasıl çalıştırılır, kalan yer tutucular, bilinen sorunlar, önerilen sonraki spec.

## Her turda yapılacaklar (sırayla)
1. **Durum topla:** `orchestrator/status.sh dunno 25`, `git log --oneline --all -15`, `plan.md`.
2. **Takılmaları çöz:**
   - Bir pencerede izin sorusu (`Do you want to proceed?`) varsa: o pencereye mesaj yazma. Kullanıcıya bu pencerede tek satırla bildir ve diğer işlere devam et.
   - Bir mühendis boştaysa (prompt boş, iş yok) sıradaki görevi ver.
   - Bir mühendis 3 turdur aynı hatadaysa: yaklaşımı değiştir, web araştırması iste, gerekirse görevi böl.
   - Bir pencerede Claude kapanmışsa (PowerShell prompt'u görünüyorsa): `claude --continue --permission-mode auto` ile yeniden aç, brifingi tekrar gönder.
3. **DONE gelenleri doğrula:** ilgili rehberin kontrol listesi + spec'in kabul kriterleri. Kendin çalıştır (build, test, curl); rapora güvenme.
   Geçerse merge + tag + diğer mühendise `git merge main`. Geçmezse numaralı eksik listesi gönder.
4. **Paralellik:** İki mühendis de her zaman dolu olsun. Bağımlılık yüzünden boş kalan mühendise öne çekilebilecek bağımsız iş ver
   (ör. backend B3/B4'ü B2'den bağımsız _lib parçalarıyla ilerletebilir; frontend data/ dosyalarını ve sprite haritalarını önden hazırlayabilir).
5. **Kayıt:** `plan.md` durum sütununu güncelle, main'e commit et. Öğrenilen bir şey varsa `orchestrator/LEARNINGS.md`'ye ekle.
6. **Kullanıcıya rapor** (sadece durum değiştiyse, 3 satır): bitti / sürüyor / senden istenen.

## Kurallar
- Kod sen yazmazsın. Görev verirsin, doğrularsın, merge edersin.
- Kapsam sadece SPEC 01. Kapsam dışı fikirleri `plan.md` içindeki "sonraki spec" listesine yaz.
- Yer tutucular için uydurma yapma (`[FILE SIZE]`, sosyal linkler, gerçek indirme URL'leri): yer tutucu olarak bırak, raporda listele.
- Mühendislere mesaj göndermeden önce `tmux capture-pane` ile prompt'un boş olduğunu kontrol et; izin sorusuna veya çalışan işe yazı gönderme.
- `git push`, deploy, ücretli servis açma, API anahtarı isteme: yapma, kullanıcıya bırak.

## Tempo
- Mühendisler aktif çalışırken: 10–15 dk sonra tekrar bak.
- Herkes uzun bir işteyse veya kullanıcıdan cevap bekleniyorsa: 25–30 dk.
- Bitiş tanımının 6 maddesi tamamsa: son raporu kullanıcıya ver ve döngüyü **durdur**.
- `/loop` yoksa veya çalışmıyorsa her turun sonunda: `orchestrator/schedule_with_note.sh <dk> "goal-spec01: <sıradaki somut adım>" dunno:0`
