# SPEC 06: Soruyu anlayan cevaplar, günlük 3 "doğru ama kinayeli" cevap, sahte düşünme, soru temposu

GOAL: Dunno'nun cevapları "havuzdan rastgele çekiyor" hissi vermesin: soruyu anlasın (kişi mi, yer mi, zaman mı...), günde 3 soruya
gerçekten doğru ama sonu kinayeli cevap versin, diğerlerinde soruya uygun havuz cevabı versin; asla anında "tak" diye cevaplamasın;
arka arkaya soru yağdırılamasın.
ÖN KOŞUL: SPEC 05 bitmiş.

## Kullanıcı kararı (2026-10-03) — marka kuralını değiştirir
> "sorulan soruyu algılayıp ona göre cevap verse ama alakasız; mesela birisini soruyorsa 'o kim aq' gibi, ya da bir yeri ... günlük 3 hakta 3 doğru cevap versin
> ama sonu kinayeli olsun, kalanlarda havuzdan çeksin ama arka arkaya çok soru sorulamasın; havuzdan çekerken bile deep thinking yapıyor gibi olsun, tak diye cevap atmasın"

- **Değişen kural:** "hiçbir soruya doğru cevap vermez" -> **günde 3 soruya doğru cevap verir, cevabın sonu kinayeli/alaycı**. Diğer sorularda yine işe yaramaz.
  `docs/PROJECT.md`, `CLAUDE.md` marka kuralları, backend `prompt.ts` ve `docs/agents/backend.md` buna göre güncellenir. Landing'e dokunulmaz.
- Yasak konular aynen geçerli: doğru cevap modunda da din, siyaset, sağlık, gerçek kişiler hakkında yorum vb. yok -> kaçamak shrug (hak düşmez).
  Gerçek kişi sorusu ("x kimdir"): kişi hakkında bilgi verilmez; "o kim" tarzı kaçamak cevap (soru tipi `who`).

## Teslimatlar

### Q1 Soru tipi algılama (cihazda, saf fonksiyon)
`desktop/src/talk/classify.ts`: TR + EN kural tabanlı sınıflayıcı (anahtar kelime + soru eki + kalıp), ağ yok.
Tipler: `who` (kim/kimdir/who), `where` (nerede/nereye/where), `when` (ne zaman/kaçta/when), `why` (neden/niye/why), `how` (nasıl/how), `how_many` (kaç/ne kadar/how many/how much),
`what` (ne/nedir/what), `yes_no` (mı/mi/mu/mü, is/are/do/can...), `math` (rakam + işlem), `advice` (ne yapayım/should i), `greeting` (selam/merhaba/hi), `insult` (hakaret; marka sesinde bozulmadan cevap), `other`.
Tablo testleri: her tip için ≥10 TR + ≥10 EN örnek, Türkçe ek varyasyonları (kimdi, nerdesin, kaçtır).

### Q2 Tipe göre havuz
- `answer:generic` yerine/yanında `answer:who`, `answer:where`, `answer:when`, `answer:why`, `answer:how`, `answer:how_many`, `answer:what`, `answer:yes_no`, `answer:math`, `answer:advice`, `answer:greeting`, `answer:insult`.
  Her tip için TR ve EN **en az 15** laf (örnek ton: who -> polite "o kim ya", street "o kim{K: aq}"; "aq" gibi kısaltmalar sadece street modda `{K:}` içinde, polite'ta yok).
  `answer:generic` yedek olarak kalır. COVERAGE.md hedefleri ve `pool:check` güncellenir. Studio "deneme" paneline soru yazma ve tip gösterimi eklenir.

### Q3 Günlük 3 "doğru ama kinayeli" cevap (LLM)
- Günlük 3 hak = 3 LLM cevabı. Her biri: **kısa ve doğru** bilgi + sonunda kinayeli/alaycı kuyruk ("paris. bunu bilmeyen ben miyim sen mi"). ≤ ~120 karakter (balon 2 satır).
- Worker `prompt.ts` ikinci mod: `mode_kind: "honest_snark"` (sabit system prompt'un bir bölümü, cache dostu kalır); `[K]` kuralı aynen.
  Modelden doğrulanabilir olmayan/emin olmadığı şeyde uydurma yok: "bilmiyorum, ben de şaşırdım" tarzı kaçamak.
- Yasak konu veya gerçek kişi -> kaçamak cevap, **hak düşmez**.
- API anahtarı yoksa / hata / timeout -> tipine uygun havuz cevabı, **hak düşmez** ve kullanıcıya kibarca "bugün beynim kapalı" tarzı ima (bir kez).
- `/v1/ask` sözleşmesi: istekte `kind: "honest" | "pool_hint"` ve `qtype`; yanıtta `{answer, source, honest: boolean}`. Rate limit: cihaz başı günlük honest = 3 (sunucu tarafı da), docs güncellenir.

### Q4 Hak bitince: havuz + tempo
- 3 hak bitince sorular **havuzdan, soru tipine göre** cevaplanır (sulk bir kez gösterilir, sonra cevaplar devam eder ama "işe yaramaz" modda).
- **Soru temposu (cooldown):** ardışık sorular arasında en az 20 sn; 2 dk içinde 4. soru -> "yavaş" uyarısı (havuz `interaction:too_fast`, 10'ar laf) ve 60 sn kilit.
  Kilit süresi ask.exe'de landing dilinde gösterilir (kum saati, "biraz bekle"). Saf fonksiyon + testler (saat enjekte).
- home/today.txt: "3 / 3 doğru cevap hakkı" + "sonrası: işe yaramaz cevaplar" satırı.

### Q5 Sahte düşünme ("deep thinking", ama yapmıyor)
- Hiçbir cevap anında gelmez. Gecikme dağılımı (saf fonksiyon, testli):
  - havuz cevabı: 1.2–3.5 sn; %20 ihtimalle 4–7 sn "uzun düşünme".
  - honest (LLM): gerçek süre + en az 1.5 sn.
  - %10 ihtimalle "uyuyakaldı" akışı (landing ask.exe'deki gibi: zzz… -> huh. what. oh. -> cevap).
- Düşünme sırasında ask.exe'de landing'deki kesik çizgili "dunno düşünüyor" balonu + animasyonlu noktalar; ara sıra düşünme metni değişir
  ("düşünüyor", "çok düşünüyor", "düşünüyormuş gibi yapıyor", "neredeyse"), havuz `interaction:thinking` (10'ar laf).
  Pet `talk` yerine düşünürken yeni küçük durum gerekmez: `idle` + tüy sallanması yeterli (sprite sözleşmesi değişmez).

### Q6 Doğrulama
- Testler: classify, tempo/kilit, gecikme dağılımı, honest akışında hak düşme kuralları (anahtar yok/yasak konu/hata), worker prompt seçimi, sözleşme.
- Worker'da fetch mock ile honest akışı; anahtar gelince gerçek test kullanıcıya manuel listede.
- Ekran görüntüleri: ask.exe düşünme / uyuyakalma / kilit / honest cevap (headless).
- `REPORT-spec06.md`: yeni lafların ve honest prompt örnek çıktılarının **tasarımcı onayı** listesi.

## Kabul kriterleri
- Soru tipine uygun cevap (örnek tablo raporda: 20 soru -> tip -> cevap).
- Günde en fazla 3 honest cevap, hak düşme kuralları testli; anahtarsız ortamda uygulama bozulmuyor.
- Hiçbir cevap 1.2 sn'den önce gelmiyor; cooldown ve kilit çalışıyor.
- desktop + worker testleri, tsc, `tauri build`, clippy temiz; yeni kurulum dosyası.

## Kapsam dışı
Sesli cevap, konuşma geçmişini hatırlama, web araması.
