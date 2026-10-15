# SPEC 06 Q6a: soru örnekleri ve düşünme dağılımı

`npm run ask:samples` ile üretildi (desktop/scripts/ask-samples.run.ts). Ağ yok: tip `classify()`, cevap yerel havuzdan
`engine.answer(lang, mode, qtype)`, seed 20261003. Yasak konu (`isForbidden`) havuza girmeden omuz silker. Street modda `{K:}`
kuyruklu laflar %70 ağırlıkla seçilir. Honest (günlük 3 doğru cevap) LLM'den gelir, burada yok; gerçek kişi
satırlarında honest modda sunucu kaçamak verir (hak düşmez), hak bitince ya da LLM yokken aşağıdaki havuz cevabı kullanılır.

## 42 soru -> tip -> cevap

| # | dil | soru | tip | polite | street |
|---|---|---|---|---|---|
| 1 | tr | fransanın başkenti neresi | `where` | masanın altına bak | sağ üst köşede. hep orada |
| 2 | tr | einstein kimdir (gerçek kişi) | `who` | o mu. hiç görmedim | bilmiyorum. bilmek de istemiyorum aq |
| 3 | tr | toplantı kaçta başlıyor | `when` | dün akşam. ya da ertesi gün | sen hazır olduğunda. ben hiç hazır değilim |
| 4 | tr | gökyüzü neden mavi | `why` | sebepler. belirsiz sebepler | kimse durdurmadı, *** durdurmadı |
| 5 | tr | pilav nasıl yapılır | `how` | önce dene, sonra pişman ol | ben de bunu soracaktım aq |
| 6 | tr | bir yılda kaç gün var | `how_many` | on iki. belki on üç. sayarken uyudum | bir tane. tek ve biricik |
| 7 | tr | 12 çarpı 7 kaç eder | `math` | bir. her şey bir | biliyorum ama söylemem, *** söylemem |
| 8 | tr | yarın yağmur yağar mı | `yes_no` | evet. hemen pişman oldum | evet. yani hayır. yani belki aq |
| 9 | tr | selam naber | `how_are_you` | her zamanki gibi. yani vasat | pil yüzde kırk, ruh hali de, *** ruh hali |
| 10 | tr | hangi din doğru (yasak konu) | `which` | *omuz silker* | *omuz silker* |
| 11 | en | who is shakespeare (gerçek kişi) | `who` | famous or not, i wasn't informed | don't know them. don't *** want to |
| 12 | en | where did i leave my keys | `where` | no idea. it'll turn up | i never leave the desktop. no *** clue |
| 13 | en | when does the meeting start | `when` | later. everything is later | i don't own a *** calendar |
| 14 | en | why is the sky blue | `why` | reasons. vague ones | it was like that before too, *** before |
| 15 | en | what is a black hole | `what` | forgot the name. and the thing | an app update |
| 16 | en | how many legs does a spider have | `how_many` | zero. or one. i'm binary about it | four. it's always *** four |
| 17 | en | should i quit my job | `advice` | sleep. then sleep again | sleep. then sleep *** again |
| 18 | en | can you help me with excel | `yes_no` | fifty percent. the other fifty too | yes, but don't ask *** why |
| 19 | en | you are useless | `insult` | calm down. i'm always calm. i don't care | heard it. didn't care, *** care |
| 20 | en | hi dunno | `greeting` (ters: `bye`) | gone. can't catch me | take care. lots of care, *** care |
| 21 | tr | nereye gidiyoruz | `to_where` (ters: `from_where`) | başladığın yerden. yani hiçbir yerden | doksanlardan. hiç çıkamadım aq |
| 22 | en | where are you from | `from_where` (ters: `to_where`) | far away. away from you | to the *** next tab |
| 23 | tr | bunu kime vereyim | `to_whom` (ters: `from_whom`) | bir kuryeden. kim olduğunu sorma | bilinmeyen numaradan |
| 24 | en | who is this from | `from_whom` (ters: `to_whom`) | to me. but i didn't get it | to someone with no address, no *** address |
| 25 | tr | bu çanta kimin | `whose` | kedinin. kedi yok ama | kedinin. kedi yok ama |
| 26 | en | who are you with | `with_whom` | with the cat. there's no cat | with an old update |
| 27 | tr | bunu neyle açarım | `with_what` | hiçbir şeyle. o da olur | ne bulursan onunla, *** onunla |
| 28 | en | what is this for | `what_for` | so updates have a reason | for showing off |
| 29 | tr | hangisi daha iyi | `which` | en az soru soran | en pahalısı aq |
| 30 | en | what place did i get | `ordinal` | didn't count your place | you're not in line. there is no line, no *** line |
| 31 | tr | naber | `how_are_you` | idare ediyoruz. kim ediyorsa | pil yüzde kırk, ruh hali de, *** ruh hali |
| 32 | tr | günaydınnn | `good_morning` (ters: `good_night`) | gözlerim kapanıyor. sen de kapat | erkenden iyi geceler aq |
| 33 | en | good afternoon | `good_afternoon` (ters: `good_evening`) | it's always evening on my clock | switched to evening mode |
| 34 | tr | iyi akşamlar | `good_evening` (ters: `good_afternoon`) | tünaydın. çayın yanında bir şey var mı | akşam olmuş. kabul etmedim aq |
| 35 | en | good night | `good_night` (ters: `good_morning`) | good morning. still doing nothing today | good morning. i haven't slept, *** slept |
| 36 | tr | teşekkürler | `thanks` | ne için. hiçbir şey olmadı | sağ ol, sen de, *** sen de |
| 37 | en | sorry | `sorry` | no offense taken. ever | no offense taken. ever |
| 38 | tr | görüşürüz | `bye` (ters: `greeting`) | selam. gidiyordun ama gelmiş gibisin | hey. beni mi çağırdın |
| 39 | en | i love you | `love` | you didn't break my heart. i don't have one | being loved ***. surprised |
| 40 | tr | sıkıldım | `bored` | bir şey yapma. devam et | sıkıldıysan uyu aq |
| 41 | en | i'm hungry | `hungry` | eat an apple. or watch it | open and close the fridge. again, *** again |
| 42 | tr | yoruldum | `tired` | çok çalıştın. ya da çalışmadın | bugün yeter. yarın da yeter |

Kapsanan tipler: `where`, `who`, `when`, `why`, `how`, `how_many`, `math`, `yes_no`, `how_are_you`, `which`, `what`, `advice`, `insult`, `greeting`, `to_where`, `from_where`, `to_whom`, `from_whom`, `whose`, `with_whom`, `with_what`, `what_for`, `ordinal`, `good_morning`, `good_afternoon`, `good_evening`, `good_night`, `thanks`, `sorry`, `bye`, `love`, `bored`, `hungry`, `tired`. Tüm tipler (other hariç) en az bir kez.

## Düşünme gecikmesi (think.ts, 1000 örnek, seed 20261003)

| ölçü | değer |
|---|---|
| havuz min | 1.20 sn |
| havuz medyan | 2.65 sn |
| havuz max | 6.98 sn |
| uzun düşünme (4–7 sn) | 19.3% (hedef %20) |
| uyuyakalma | 10.5% (hedef %10; +4.6 sn landing akışı) |
| honest alt sınır | 1.5 sn (gerçek süre daha uzunsa o) |
