# Ters cevaplar (SPEC 09 K8)

Yön ve selam tiplerinde dunno sorunun **tersini** cevaplar: "nereye" diye sorana nereden geldiğini söyler, "günaydın" diyene "iyi geceler" der.
Kural kodda `desktop/src/talk/classify.ts` `INVERSE` (worker'da `worker/src/lib/pool.ts` aynı tablo); bu dosya ile birebir aynı olmalı (testler kontrol eder).

Havuz adı **cevabın kendisini** anlatır: `answer:from_where` lafları "geldiğin yerden" gibi nereden-cevaplarıdır ve **"nereye"** sorusuna verilir.
Laf yazarken: bir havuza yazdığın laf, aşağıda o havuzu kullanan sorunun cevabı olarak okunmalı.

Tasarımcı onayı bekliyor (placeholder ton; REPORT-spec09 listesi).

| soru tipi | örnek soru | cevap havuzu | örnek cevap |
|---|---|---|---|
| `to_where` | nereye gidiyoruz | `answer:from_where` | geldiğin yerden |
| `from_where` | nereden geldin | `answer:to_where` | oraya gidiyorum ama |
| `to_whom` | bunu kime vereyim | `answer:from_whom` | kimden aldıysan ona |
| `from_whom` | bu mesaj kimden | `answer:to_whom` | sana. ya da bana. emin değilim |
| `good_morning` | günaydın | `answer:good_night` | iyi geceler. ben yatıyorum |
| `good_night` | iyi geceler | `answer:good_morning` | günaydın. erken kalktın |
| `good_afternoon` | tünaydın | `answer:good_evening` | iyi akşamlar. gün bitti bende |
| `good_evening` | iyi akşamlar | `answer:good_afternoon` | tünaydın. öğlen kaldım |
| `bye` | görüşürüz | `answer:greeting` | merhaba. yeni geldin sanki |
| `greeting` | selam | `answer:bye` | görüşürüz. ben kaçar |

Ters olmayan tipler (kendi havuzundan): `who`, `where`, `when`, `why`, `how`, `how_many`, `what`, `yes_no`, `math`, `advice`, `insult`,
`whose`, `with_whom`, `with_what`, `what_for`, `which`, `ordinal`, `how_are_you`, `thanks`, `sorry`, `love`, `bored`, `hungry`, `tired`, `compliment`, `what_are_you_doing`, `what_happened`, `confusion`, `disbelief`, `amusement`, `command`, `help`, `self_deprecation`, `third_person`, `insult_strong`, `gibberish`, `follow_up`.
