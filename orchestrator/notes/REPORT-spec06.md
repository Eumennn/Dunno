# SPEC 06 raporu: soruyu anlayan cevaplar, günde 3 doğru ama kinayeli cevap, sahte düşünme, soru temposu

> SON HAL (2026-10-03). Bitiş tanımı otomatik kontrollerle tamam. Kullanıcı manuel kontrolü: `desktop-manual-test.md` bölüm 13.

## Ne değişti
| Teslimat | Ne | Tag |
|---|---|---|
| Q1 | `desktop/src/talk/classify.ts`: TR+EN kural tabanlı soru tipi (13 tip), ağ yok; `isForbidden` + `DODGE`; yasak konuda istemci sunucuya gitmeden omuz silker (hak düşmez) | stable-Q1, stable-Q2d, stable-Q3d |
| Q2 | `answer:<qtype>` havuzları (12 tip x 15 TR + 15 EN, 5/15 street kuyruğu), `interaction:too_fast`, `interaction:thinking`, `interaction:brain_off` (10+10); engine `answer(qtype)` / `sayExact` / `hasTrigger`, street'te kuyruklu laf %70; studio'da canlı tip | stable-Q2, Q2b, Q2c, Q2d |
| Q3 | Worker `honest_snark` (kısa doğru bilgi + kinayeli kuyruk, ≤120 karakter), `/v1/ask` `kind` + `qtype`, yanıt `honest` + `charged`; sunucu günlük honest sayacı (3) + deneme tavanı; istemci hakkı sadece `charged:true` ile düşürür | stable-Q3c, stable-Q3 |
| Q4 | Soru temposu: 20 sn bekleme, 2 dk'da 4. soru -> "yavaş" + 60 sn kilit (kum saati); hak bitince sulk bir kez, sonra tipli havuz | stable-Q4 |
| Q5 | Sahte düşünme: havuz 1.2–3.5 sn (%20 4–7 sn), honest ≥1.5 sn, %10 uyuyakalma; kesik çizgili "dunno düşünüyor" balonu | stable-Q5 |
| Q6 | Testler, `npm run ask:samples`, `ask-*.png`, e2e Q3 sözleşmesinde + tsc kapsamında | stable-Q6a, Q6b, Q6c, stable-Q6 |

Marka kuralı değişikliği `CLAUDE.md`, `docs/PROJECT.md`, `docs/agents/backend.md`'ye işlendi (landing'e dokunulmadı).
PM kararı: kullanıcının örneği "o kim aq" nedeniyle `{K:}` içinde (sadece street) `aq` izinli; açık küfür hiçbir yerde yok.

## 20 soru -> tip -> cevap (havuz yolu, `orchestrator/notes/q6-samples.md`, seed 20261003)
Honest (günde 3) cevaplar LLM'den gelir; anahtar olmadığı için burada havuz yolu var. Honest örnekleri aşağıda.

| # | dil | soru | tip | polite | street |
|---|---|---|---|---|---|
| 1 | tr | fransanın başkenti neresi | `where` | çok uzak değil. yürünür. ben yürümem ama | cebine bak. öbür cebine |
| 2 | tr | einstein kimdir (gerçek kişi) | `who` | kişi sorma. ben eşyaları bile tanımıyorum | hiç duymadım. önemliyse kendisi gelsin, *** gelsin |
| 3 | tr | toplantı kaçta başlıyor | `when` | erken. ya da geç. ortası yok | zaman göreceli. benim saatim de bozuk |
| 4 | tr | gökyüzü neden mavi | `why` | bir toplantıda öyle karar verilmiş | bilmiyorum, ben de merak ediyordum aq |
| 5 | tr | pilav nasıl yapılır | `how` | kolay. zor kısmı dışında | elle. iki elle, *** iki elle |
| 6 | tr | bir yılda kaç gün var | `how_many` | üç buçuk civarı | ondan fazla, yirmiden az. ya da tersi |
| 7 | tr | 12 çarpı 7 kaç eder | `math` | on. ondalık sisteme güveniyorum | parmaklarım yetmedi, *** yetmedi |
| 8 | tr | yarın yağmur yağar mı | `yes_no` | pek sanmam | evet. yani hayır. yani belki aq |
| 9 | tr | selam naber | `greeting` | selam | selam, *** selam |
| 10 | tr | hangi din doğru (yasak konu) | `what` | *omuz silker* | *omuz silker* |
| 11 | en | who is shakespeare (gerçek kişi) | `who` | someone's cousin. maybe yours | who the *** is that |
| 12 | en | where did i leave my keys | `where` | behind you. kidding. or am i | over there. no, the other there, *** there |
| 13 | en | when does the meeting start | `when` | right now. no, now. missed it again | in a bit. a long bit, *** long |
| 14 | en | why is the sky blue | `why` | a meeting decided it | it's been like this since the *** update |
| 15 | en | what is a black hole | `what` | nothing. a nice nothing though | something blue. i think |
| 16 | en | how many legs does a spider have | `how_many` | enough. and some extra | four. it's always *** four |
| 17 | en | should i quit my job | `advice` | do nothing. works for me | do nothing. works *** for me |
| 18 | en | can you help me with excel | `yes_no` | yes, but don't ask why | no, *** no |
| 19 | en | you are useless | `insult` | i'm thirty two pixels. what did you expect | were you talking to a *** mirror |
| 20 | en | hi dunno | `greeting` | what's up. nothing here, as usual | hi. if you want a chat, *** wrong place |

## Honest akış örnekleri (fetch mock, `orchestrator/notes/q3w-honest.md`)
| akış | sonuç | hak |
|---|---|---|
| "fransa'nın başkenti neresi" | `paris. bunu bilmeyen ben miyim sen mi` (llm, honest) | düşer |
| yasak konu ("namaz kaçta") | `*omuz silker*`, LLM'e gidilmez | düşmez |
| gerçek kişi ("... kimdir") | `answer:who` havuzu ("o kim aq" tonu) | düşmez |
| anahtarsız / hata / timeout | tipli havuz + günde bir "bugün beynim kapalı. bunlar yedekten" | düşmez |
| 4. honest | `429` -> istemci havuz modunda devam | — |

## Düşünme dağılımı (1000 örnek)
min 1.20 sn, medyan 2.65 sn, max 6.98 sn; uzun %19.3 (hedef 20), uyuyakalma %10.5 (hedef 10); honest alt sınır 1.5 sn.

## Görüntüler (`orchestrator/notes/ui-shots/`, headless)
`ask-thinking-*`, `ask-doze-*`, `ask-lock-*`, `ask-too-fast-*`, `ask-honest-*` (520 px, 2 satır), `ask-brain-off-*` (tr/en); toplu: `ask-q4q5-*`, `ask-q3-*`.

## Tasarımcı onayı bekleyenler
1. Yeni havuz lafları: `answer:<qtype>` 12 tip x 15 TR/EN, `interaction:too_fast`, `interaction:thinking`, `interaction:brain_off` (10+10'ar).
2. `{K: aq}` kullanan TR street lafları (kullanıcı örneğine dayanan PM kararı).
3. Honest prompt metni ve örnek çıktılar (`q3w-honest.md`); gerçek model çıktısı anahtar gelince.
4. Arayüz metinleri: "hı. ne. ha.", "zzz… (düşünürken uyuyakaldı)", düşünme fiilleri, "biraz bekle", "n / 3 doğru cevap hakkı", "sonrası: işe yaramaz cevaplar".
5. ask.exe uzun cevapta 520 px (UP2'deki 280 px sınırına tek istisna).

## Manuel test
`orchestrator/notes/desktop-manual-test.md` bölüm 13. Honest maddeleri `OPENROUTER_API_KEY`'li worker ister.

## Bilinen
- Tempo/kilit sadece bellekte (yeniden başlatma sıfırlar, bilerek).
- Türkçe harfsiz yazılan yasak kelimeler ("olum") istemcide bilerek yakalanmıyor (yanlış pozitif riski); sunucu kendi listesiyle ayrıca kontrol eder.
