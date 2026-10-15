# K9 tembel başarımlar (SPEC 09, taslak: PM onayı + tasarımcı metin onayı bekliyor)

Kaynak kod: `desktop/src/wardrobe/achievements.ts` (`ACHIEVEMENTS`, ilk 9 SPEC 05, sonrası K9), metinler `achievements-k9.strings.ts` (i18n.ts biçimi).
Kimlikler (`id`) ve açılan parçalar (`unlocks`) desktop K2 (kostüm) / K6 (aksesuar) / K5 (tema) tarafından **aynen** kullanılır.
Sayaçlar sadece sayı ve soru **tipi** (talk/classify.ts), soru metni asla. Test modunda hepsi açık (`fillTo` + `step`).
Doğum günü şapkası parti şapkasıyla aynı olduğu için çıkarıldı. Bu dosya kaynaktan üretildi.

## Yeni olaylar (desktop bağlar)
| olay | ne zaman |
|---|---|
| `{type: "question", qtype}` | her soru (qtype = classify sonucu; mevcut olaya alan eklendi) |
| `{type: "honest"}` | sunucu charged:true honest cevap |
| `{type: "too_fast"}` | soru temposu "yavaş" (interaction:too_fast) |
| `{type: "fart"}` | fart.ts fire |
| `{type: "edge"}` | yan kenarda durup bakma (peek) başladı |
| `{type: "mute"}` | "bugün sus" açıldı |
Seri (`streak`, `maxStreak`) her olayda yerel gün değişimiyle kendiliğinden hesaplanır; `line` olayı app'li her lafta `appLines`'ı artırır.

## Tablo (33 yeni başarım)
| id | açılan | kaynak | hedef | tr: ad / koşul | en: ad / koşul |
|---|---|---|---|---|---|
| `sweet_tooth` | tema `strawberry` | soru tipi `hungry` | 10 | tatlı krizi / 10 kez acıktım de | sweet tooth / say you're hungry 10 times |
| `early_bird` | tema `lemon` | `morningQuestions` (05-09 arası soru) | 5 | erkenci kuş / sabah 9'dan önce 5 soru sor | early bird / ask 5 questions before 9 am |
| `edge_dweller` | tema `ocean` | `edges` (yan kenarda durup bakma (peek)) | 30 | kenar mahalle / 30 kez kenardan baktır | edge dweller / peek from the edge 30 times |
| `two_weeks` | tema `forest` | `maxStreak` (en uzun ardışık gün serisi) | 14 | iki hafta dayandın / 14 gün üst üste aç | two weeks, somehow / open 14 days in a row |
| `thank_you_10` | tema `peach` | soru tipi `thanks` | 10 | kibar şeftali / 10 kez teşekkür et | polite peach / say thanks 10 times |
| `quiet_days` | tema `gray_cat` | `muteDays` ("bugün sus" günü) | 5 | gri sessizlik / 5 farklı gün "bugün sus" de | gray silence / pick "quiet today" on 5 days |
| `good_morning_10` | tema `coffee` | soru tipi `good_morning` | 10 | kahve kokulu sabah / 10 kez günaydın de | coffee morning / say good morning 10 times |
| `good_night_10` | tema `midnight` | soru tipi `good_night` | 10 | gece yarısı / 10 kez iyi geceler de | midnight / say good night 10 times |
| `questions_100` | tema `retro_green` | `questions` (soru (toplam)) | 100 | eski monitör / 100 soru sor | old monitor / ask 100 questions |
| `love_5` | tema `cotton_candy` | soru tipi `love` | 5 | pamuk kalp / 5 kez seni seviyorum de | cotton heart / say i love you 5 times |
| `bored_10` | tema `watermelon` | soru tipi `bored` | 10 | sıkıntıdan karpuz / 10 kez sıkıldım de | bored melon / say you're bored 10 times |
| `drag_200` | kostüm `bug` | `drags` (sürükleme) | 200 | taşınan böcek / 200 kez sürükle | carried bug / drag 200 times |
| `too_fast_10` | kostüm `fly` | `tooFast` (çok hızlı soru (yavaş uyarısı)) | 10 | sinekleştin / 10 kez çok hızlı soru sor | you got pesky / ask too fast 10 times |
| `honest_15` | kostüm `bee` | `honestAnswers` (honest cevap (charged)) | 15 | bal gibi doğru / 15 doğru cevap al | honey honest / get 15 honest answers |
| `ghost_hours` | kostüm `ghost` | `idleHours` (boşta geçen saat) | 12 | yokmuş gibi / 12 saat boşta kal | not even here / stay idle for 12 hours |
| `fossil_30` | kostüm `dino` | `openDays` (açılan farklı gün) | 30 | fosilleştin / 30 farklı gün aç | fossilized / open on 30 different days |
| `night_frog_20` | kostüm `frog` | `nightQuestions` (00-05 arası soru) | 20 | gece vıraklaması / gece 5'ten önce 20 soru sor | night croak / ask 20 questions before 5 am |
| `meetings_50` | kostüm `astronaut` | `meetingGuards` (toplantı koruması) | 50 | uzaya kaçış / 50 toplantıda saklan | space escape / hide in 50 meetings |
| `hungry_25` | kostüm `pizza` | soru tipi `hungry` | 25 | bir dilim daha / 25 kez acıktım de | one more slice / say you're hungry 25 times |
| `drag_100` | aksesuar `cowboy_hat` | `drags` (sürükleme) | 100 | kovboy taşıması / 100 kez sürükle | cowboy carry / drag 100 times |
| `out_of_questions_15` | aksesuar `pirate_bandana` | `outDays` (hakkın bittiği gün) | 15 | yağma bitti / 15 farklı gün hakkını bitir | loot's gone / run out of questions on 15 days |
| `fart_5` | aksesuar `chef_hat` | `farts` (osurma (fart.ts)) | 5 | mutfakta bir şey var / 5 sessiz olaya şahit ol | something in the kitchen / witness 5 quiet incidents |
| `why_20` | aksesuar `wizard_hat` | soru tipi `why` | 20 | neden büyücüsü / 20 kez neden diye sor | why wizard / ask why 20 times |
| `honest_3` | aksesuar `cape` | `honestAnswers` (honest cevap (charged)) | 3 | pelerinli kahraman / 3 doğru cevap al | caped hero / get 3 honest answers |
| `sorry_10` | aksesuar `bow_tie` | soru tipi `sorry` | 10 | papyonlu özür / 10 kez özür dile | bow tie apology / say sorry 10 times |
| `what_30` | aksesuar `monocle` | soru tipi `what` | 30 | o ne, bu ne / 30 kez ne diye sor | what's that / ask what 30 times |
| `math_20` | aksesuar `nerd_glasses` | soru tipi `math` | 20 | hesap kitap / 20 matematik sorusu sor | number cruncher / ask 20 math questions |
| `streak_7` | aksesuar `scarf` | `maxStreak` (en uzun ardışık gün serisi) | 7 | bir haftalık atkı / 7 gün üst üste aç | week-long scarf / open 7 days in a row |
| `hello_20` | aksesuar `cat_ears` | soru tipi `greeting` | 20 | miyav selam / 20 kez selam ver | meow hello / say hi 20 times |
| `bye_10` | aksesuar `ribbon` | soru tipi `bye` | 10 | gitmeyen veda / 10 kez görüşürüz de | goodbye that stays / say bye 10 times |
| `how_are_you_10` | aksesuar `flower` | soru tipi `how_are_you` | 10 | nasılsın çiçeği / 10 kez nasılsın de | how are you flower / ask how i am 10 times |
| `questions_50` | aksesuar `grad_cap` | `questions` (soru (toplam)) | 50 | mezun olamadın / 50 soru sor | no diploma / ask 50 questions |
| `app_lines_50` | aksesuar `hard_hat` | `appLines` (app:* bağlamında laf) | 50 | iş başında / çalışırken 50 laf ye | on the job / hear 50 lines while working |
