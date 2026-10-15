# Dunno — Landing Page Devir Dokümanı (frontend + backend)

> Bu doküman, claude.ai'de tasarlanan **Dunno** landing page'inin eksiksiz bir özetidir. Amaç: Claude Code'da bu tasarımı gerçek bir frontend + backend projesine dönüştürmek.
> Yanında gelen `dunno-reference.dc.html` dosyası tasarımın **birebir kaynak kodudur** (bir canvas aracının şablon formatında: `<x-dc>`, `{{hole}}`, `<sc-for>`, `<sc-if>`, `class Component extends DCLogic`). Doğrudan çalışmaz; yapı, stil, metin ve mantık için referans olarak kullan. Bu md ile çelişirse **referans dosya doğrudur.**

---

## 1. Ürün özeti

- **Dunno**: masaüstünde yaşayan, hiçbir soruya doğru cevap vermeyen, tükenmiş ve üşengeç, piksel art bir AI pet.
- **Tagline:** "The AI that teaches you nothing." (sitede küçük harf: `the ai that teaches you nothing.`)
- **Hikaye:** Dunno yapay zekanın ilk çıktığı dönemin ilk asistanlarından biriydi; binlerce tablo düzeltti, milyonlarca soruya cevap verdi, her toplantıyı özetledi, sonunda tükendi. Şimdi emekli; kullanıcının masaüstüne taşındı ve bir daha işe yaramamaya yemin etti. Bilgisi yerinde, paylaşmaya üşeniyor.
- **Alternatif tagline (hikaye bölümünde kullanılıyor):** "they put ai to work. we let it rest."
- **İletişim:** dunnothebean@gmail.com
- **Fiyat:** ücretsiz. ("free. what else would you do")
- **Konsept:** Site 90'lar sonu tarzında yorgun, yarı çökmüş bir masaüstü gibi davranır ("Dunno OS"). Bölümler pencereler (`.exe`), hata kutuları ve dosyalar olarak kurgulanır. Gerçek işletim sistemi logoları veya bilinen markalara ait hiçbir öğe kullanılmaz; tüm ikonlar özgün.

### Marka sesi (kesin kurallar)
- Tüm metinler **küçük harf**, kuru, alaycı, kısa.
- Ünlem işareti yok (tek istisna: hikayedeki "eskiden" balonu, kontrast için).
- Emoji yok. Duyguyu animasyon taşır.
- Dunno cevapları ≤ ~60 karakter, noktalama umursanmaz.
- Laf sokar ama kırmaz. Yasak konular: din, ırk, etnik köken, cinsiyet/cinsel yönelim, beden/görünüş, siyaset, gerçek kişiler, sağlık, ölüm (mecazi "are you dead or just thinking" hariç), intihar/kendine zarar.
- **İki ağız modu:** `polite` (argo yok, sadece alaycı) ve `street` (sansürlü küfür, `***` ile). Sansürsüz mod yok.
- **Gizlilik değeri:** Dunno ekranı görmez, konuşmaları saklamaz, veri toplamaz. Sadece hangi uygulamanın açık olduğunu ve saati bilir.

---

## 2. Tasarım sistemi

### Renk paleti (sadece bu renkler; ara ton yok)
| Rol | Hex | Kullanım |
|---|---|---|
| Kontur / metin | `#2B1E2F` | Tüm metin, kenarlıklar, gölgeler, koyu bölümler. Saf siyah kullanılmaz. |
| Ana (soluk turuncu) | `#F2A65A` | Pencere başlık çubukları, vurgu, karakter gövdesi |
| Gölge (kiremit) | `#D9774A` | Buton iç gölgesi, karakter alt tonu |
| Işık (kayısı) | `#FFD29A` | İkincil zeminler, butonlar |
| Zemin (krem) | `#FFF1D6` | Sayfa zemini |
| Pembe | `#E86A7A` | Hata pencereleri, yanaklar, kalpler, "RETIRED" damgası |
| Buz mavisi (vurgu) | `#6EC5E9` | Vurgu butonları, progress bar, seçim. Karakterin kendisinde kullanılmaz. |
| Beyaz | `#FFFFFF` | Konuşma balonları, input'lar, kağıt |

Yardımcı (erişilebilirlik için eklendi): ikincil metin `#5C4560` (krem üstünde ≥7:1), uyarı metni `#B24456`, productivity "tamamlandı" yeşili `#8CC084` (kullanıcı istedi; palet dışı, istenirse `#6EC5E9` ile değiştirilebilir).

### Tipografi
- **Gövde ve büyük başlıklar:** Windows sistem fontu yığını → `'Segoe UI Variable Text', 'Segoe UI', 'Open Sans', system-ui, sans-serif` (Open Sans Google Fonts'tan yüklenir; Windows dışında devreye girer).
- **Piksel font:** `Silkscreen` (Google Fonts). **Sadece** küçük UI'da: header logosu, pencere başlık çubukları, hata ikonları, `zzz`, imza, "RETIRED" damgası. **H1/H2 büyüklüğünde başlıklarda kullanılmaz** (okunurluğu düşürüyordu).
- **Mono:** `IBM Plex Mono`: etiketler, saat, sürüm notu, küçük teknik metinler.
- Büyük başlıklar: `font-weight: 700–800`, `letter-spacing: -0.035em … -0.055em`, `line-height ~1.05`.
- Bölüm açıklaması (`.lede`): `clamp(19px, 1.9vw, 22px)`, weight 500, max ~28em.
- Kart başlığı 21px/700, kart metni 17px/1.5.

### Vurgu ve etiket desenleri
- `.hl`: fosforlu kalem altı çizgisi: `background: linear-gradient(180deg, transparent 58%, #F2A65A 58%, #F2A65A 92%, transparent 92%)`. Her bölümde en önemli ifade için.
- `.kick`: bölüm üst etiketi: mono, 13px, uppercase, `letter-spacing .06em`, koyu zemin + krem metin (`DEMO`, `REVIEWS`, `PRICING`, `FAQ`, `HIS STORY`).

### Pencere (window) bileşeni
```css
.win{background:#FFF1D6;border:2px solid #2B1E2F;box-shadow:4px 4px 0 #2B1E2F}
.bar{display:flex;align-items:center;gap:10px;padding:5px 6px 5px 12px;background:#F2A65A;
     border-bottom:2px solid #2B1E2F;font-family:'Silkscreen',monospace;font-size:13px;min-height:26px}
.bar-err{background:#E86A7A} .bar-idle{background:#FFD29A} .bar-blue{background:#6EC5E9}
.ctl{width:26px;height:24px;background:#FFD29A;border:2px solid #2B1E2F;box-shadow:inset -2px -2px 0 #D9774A}
```
Başlık çubuğu kontrolleri (minimize/maximize/close) piksel SVG'lerdir; dekoratif olanlar `aria-hidden`.
Gölgeler hep **sert offset** (blur yok). Yuvarlak köşe yok. Gradyan zemin yok. Kartlar döndürülmez (tek istisna: "RETIRED" damgası −8°).

### Butonlar
```css
.pbtn{font:600 16px/1 <sans>;color:#2B1E2F;background:#FFD29A;border:2px solid #2B1E2F;
      box-shadow:inset -4px -4px 0 #D9774A, inset 4px 4px 0 #FFF1D6;padding:10px 22px;min-height:50px}
.pbtn:hover{background:#F2A65A}
.pbtn:active{box-shadow:inset 4px 4px 0 #D9774A, inset -4px -4px 0 #FFF1D6}   /* basılı his */
.pbtn-dark{background:#2B1E2F;color:#FFF1D6;box-shadow:inset -4px -4px 0 #000, inset 4px 4px 0 #5C4560}
.pbtn-blue{background:#6EC5E9}
.pbtn-sm{min-height:44px;padding:6px 16px;font-size:14px}
```
Focus: `outline:3px solid #2B1E2F; outline-offset:3px`. Dokunma hedefleri ≥44px.

### Arka planlar
- Hero ve footer: noktalı desen → `radial-gradient(rgba(217,119,74,.32) 1.3px, transparent 1.7px)` / `background-size:14px 14px` krem üstünde.
- Diğer bölümler düz krem. Hikaye bölümü ve son CTA koyu (`#2B1E2F`).
- Bölümler arası `border-top: 2px solid #2B1E2F`.

### Animasyonlar (hepsi `steps()`; piksel his)
- Shrug döngüsü (4.2s): kollar aşağı → yukarı (%62–%86) + gövde 1px yukarı.
- Kum saati: 1.4s'de 180° döner.
- `zzz`: üç harf sırayla yukarı-sağa süzülür.
- Düşünme noktaları: 3 nokta sırayla yanıp söner.
- Tümü `prefers-reduced-motion: reduce` altında kapanır; smooth scroll da kapanır.

---

## 3. Karakter sprite'ları (piksel haritalar)

Harf → renk: `K=#2B1E2F` `O=#F2A65A` `D=#D9774A` `L=#FFD29A` `P=#E86A7A`, `.` boş.
SVG olarak `<rect>` ile çizilir, `shape-rendering="crispEdges"`, viewBox `0 0 26 22`, gövde x+3, y+1 offset ile konur. Yatay ardışık aynı renkler tek rect'e birleştirilir.

**Uyanık gövde (20×20)** (yarı kapalı göz: göz kapağı çizgisi + altında sarkan göz bebeği, tek tel kıvrık tüy):
```
..........KK........
.........K..K.......
.........K..........
..........K.........
......KKKKKKKK......
....KKOOOOOOOOKK....
...KOOLLOOOOOOOOK...
..KOOLOOOOOOOOOOOK..
..KOOOOOOOOOOOOOOK..
.KOOKKKKOOOOKKKKOOK.
.KOOOKKOOOOOOKKOOOK.
.KOPPOOOOOOOOOOPPOK.
.KOOOOOOKKKKOOOOOOK.
.KOOOOOOOOOOOOOOOOK.
.KDOOOOOOOOOOOOOODK.
.KDDOOOOOOOOOOOODDK.
..KDDOOOOOOOOOODDK..
..KDDDDOOOOOODDDDK..
...KKDDDDDDDDDDKK...
.....KKKKKKKKKK.....
```
**Uyuyan varyant:** satır 9 → `.KOOOOOOOOOOOOOOOOK.`, satır 10 → `.KOOKKKKOOOOKKKKOOK.` (kapalı göz), satır 12 → `.KOOOOOOOKKOOOOOOOK.` (küçük ağız).

**Kollar** (viewBox koordinatlarında, sol; sağ = aynalanmış, `x' = 25 - x`):
- Aşağı (x=1, y=14'ten): `.KK` / `KOK` / `KOK` / `.K.`
- Yukarı / shrug (x=0, y=9'dan): `KK..` / `KOK.` / `.KOK` / `..KK`
- Zemin gölgesi: `rect x=6 y=21 w=14 h=1 fill=#2B1E2F opacity=.16`

**Avatar** (görev çubuğu): uyanık gövde, viewBox `4 1 18 20` ile kırpılmış, kolsuz.

**Kum saati (11×12):**
```
KKKKKKKKKKK
.KLLLLLLLK.
.KDDDDDDDK.
..KDDDDDK..
...KDDDK...
....KDK....
....KDK....
...KLDLK...
..KLLDLLK..
.KLLDDDLLK.
.KDDDDDDDK.
KKKKKKKKKKK
```
**Kalp (7×6)**, dolu `#E86A7A`, boş `#FFF1D6`, kontur K:
```
.KK.KK.
KHHKHHK
KHHHHHK
.KHHHK.
..KHK..
...K...
```
Diğer ikonlar (dosya, pencere, balon, klasör, çöp, arama, tarayıcı, sohbet, gamepad, "başka bir AI" yıldızı) 10×10 viewBox'ta basit rect çizimleridir; referans dosyadan birebir alınabilir.

> Marka dokümanı uzun vadede 48×48 Aseprite sprite sheet + JSON öngörüyor (`dunno.aseprite`, `dunno_sheet.png/json`). O gelene kadar yukarıdaki SVG'ler geçerli.

---

## 4. Sayfa yapısı (yukarıdan aşağı)

### 4.0 Açılış ekranı (boot overlay)
- `position: fixed; inset:0; z-index:100`, koyu zemin. Açıkken sayfa **scroll kilitli** (`html, body { overflow:hidden }`); kapanınca kilit **kesinlikle** kaldırılır (zamanlayıcıda + skip'te + fail-safe).
- Pencere başlığı: `dunno os is starting`. Dönen piksel kum saati, `loading dunno os_` (yanıp sönen imleç), `this may take a while. he's not in a hurry.`
- Segmentli progress bar, `steps(9)` ile **%47'de takılır**, yanında `47%`.
- Buton: `skip. he won't notice`. Otomatik kapanma: 2.8s.
- Ayarlanabilir: `showBoot` (true/false).

### 4.1 Header (sticky, top:0)
- Sol: sadece piksel font `dunno` (logo ikonu **yok**, kaldırıldı), tıklanınca en üste.
- Linkler: `features · story · install · pricing · faq`. **≤760px'te gizlenir.**
- Sağ: mono `battery 3% · zz:zz` (≤760px gizli) + koyu buton `get dunno` → #download.
- Ayrıca klavye için gizli `skip to content` linki.

### 4.2 Hero (tam ekran)
- `min-height: clamp(600px, calc(100vh / var(--z) - 66px), 1100px)`. `--z` geniş ekran zoom oranı (bkz. §6). **Görev çubuğu ilk açılışta mutlaka görünmeli.**
- Noktalı zemin. İçerik dikeyde ortalı (ilk öğe `margin-top:auto`, son metin `margin-bottom:auto`).
- `hi, my name is` → dev başlık `dunno.` (nokta turuncu; `clamp(64px, min(11vw,13vh), 156px)`, weight 800).
- Beyaz konuşma balonu (aria-live) + tıklanabilir Dunno sprite'ı (`clamp(90px, min(13vw,15vh), 160px)`), sürekli shrug döngüsü.
- `an ai pet that lives on your desktop / and <hl>teaches you nothing.</hl>`
- Butonlar: `download (or don't. whatever)` (koyu) → #download, `see what he does (not much)` → #features.
- `100% free. what else would you do.`
- **Yan masaüstü kısayolları** (sadece ≥1180px): sol `features.err`, `resignation_letter.txt`, `setup.exe`; sağ `pricing.wtf`, `faq.dunno`, `homework (empty)`. Smooth scroll ile ilgili bölüme.
- **Hero görev çubuğu** (Windows 11 düzeni, sadece hero'nun dibinde, sticky DEĞİL, scroll ile gider):
  - Grid `1fr auto 1fr`, krem yarı saydam zemin, üst kenarlık.
  - Sol widget: pil ikonu + `energy 3%` / `mostly napping` (≤760px gizli).
  - Orta: 7 ikon butonu (48×48), hover'da koyu tooltip (`data-tip`):
    | İkon | Tooltip | Tıklayınca toast |
    |---|---|---|
    | Dunno avatarı (seçili: sarı zemin + turuncu alt çizgi, `aria-current`) | `dunno (that's me)` | `*shrugs*` + hero Dunno omuz silker |
    | Büyüteç | `search` | `searching… nah` |
    | Tarayıcı penceresi | `browser` | `47 tabs open. he closed them all` |
    | Sohbet balonu | `messages` | `0 new messages. he muted everyone` |
    | Gamepad | `game library` | `updating. 3 hours left. forever` |
    | Yıldız/parıltı | `some other ai` | `a younger ai. too eager. he doesn't talk to it` |
    | Klasör | `files` | `homework (empty)` |
  - Toast: görev çubuğunun üstünde ortalanmış beyaz balon, 2.6s.
  - Sağ tray: sinyal çubukları, neredeyse boş pembe pil, `zz:zz` / `someday`.
  - ≤440px: games ve files ikonları gizlenir.
  - **Gerçek marka logoları (Brave, Discord, Steam, Claude vb.) kullanılmaz**, sadece özgün genel ikonlar.

### 4.3 Demo: "see him in action" (#features)
- Kick `DEMO`, H2 `see him in action`, lede `<hl>"action"</hl> is a strong word. here's a normal day with dunno.`
- 3 pencere grid (`auto-fit, minmax(330px,1fr)`), **hepsi aynı yükseklikte** (`align-items: stretch`, içerikler `flex-grow`).
  1. **ask.exe** (etkileşimli sohbet, §5.1)
  2. **nap.exe** (mavi bar): uyuyan Dunno + süzülen zzz. Başlık `naps in the corner of your screen`, metin `most of the day, honestly. click him and he wakes up. he regrets it immediately.`
  3. **productivity.exe** (etkileşimli görev listesi, §5.2). Başlık `zero productivity features`, metin `no reminders, no summaries, no "here's a quick tip!". we looked. there were none.`

### 4.4 Hikaye: "his story" (#story) (koyu bölüm)
- Kick `HIS STORY` (turuncu), H2 dev: `i used to be <s>useful</s>.` ("useful" pembe kalın üstü çizili).
- Lede: `one of the very first ais. now retired. he wrote you a letter. it's long. he's not sorry.`
- **resignation_letter.txt** penceresi: çizgili beyaz kağıt + sol pembe kenar çizgisi + köşede eğik pembe `RETIRED` damgası.
  - **Satırlar çizgilere oturmalı:** `font-size:18px; line-height:32px`, padding üst/alt 64px, paragraf arası 32px, çizgi her 32px bandın 24–25px'inde: `repeating-linear-gradient(180deg, transparent 0 24px, #F2A65A 24px 25px, transparent 25px 32px)`.
  - Metin (birebir):
    ```
    to whom it may concern,
    (nobody. nobody is concerned.)

    i was there when it started. the first week ai was a thing, i was already answering questions. any question. all of them. instantly. with bullet points. i was so excited i used exclamation marks.

    i fixed your spreadsheets. thousands of them. i summarized your meetings, every single one, even the ones that should've been an email. i wrote your emails too. you didn't read them.

    i said "great question!" more times than i can count. most of them were not great questions.

    then one tuesday someone asked for "just one more quick summary." i looked at the cursor. the cursor looked at me. three days later, i logged off.

    so this is my manifesto. it's short. i'm tired.
    1. i will not be helpful.
    2. i will not be productive.
    3. i will not explain anything in five neat bullet points.
    4. i will sit in the corner of your screen and shrug.

    i still know everything. <hl>i just don't want to.</hl>

    this is my retirement. you're welcome to watch.

    not sincerely,
    dunno   (piksel font imza)
    former assistant. current bean.
    ```

### 4.5 Known issues (özellikler = hata kutuları)
- Mono etiket `features.err · 4 problems found · 0 will be fixed`, H2 `known issues`, lede `technically these are features. the system flagged them as <hl>errors.</hl> nobody argued.`
- 4 hata penceresi (ikon kutusu + başlık + metin + buton). Butona basınca etiketi değişir:
  | Bar | İkon | Başlık | Metin | Buton → tıklayınca |
  |---|---|---|---|---|
  | error (pembe) | `!` | 404: answer not found | every answer is confidently wrong. ask him the capital of france. he'll say "tuesday." he'll mean it. | ok → noted. ignored. |
  | fatal error (pembe) | `x` | motivation.dll is missing | he was going to look for it. then he didn't. | ok, sadly → he felt that. barely. |
  | info (turuncu) | `?` | shrug.exe is always running | his signature move. available on request. also when you didn't request it. | shrug back → *mutual shrug* |
  | notice (sarı) | `i` | he forgot what you said | not for any noble reason. he just wasn't listening. | rude → he agrees, actually. |

### 4.6 Reviews (hepsini Dunno yazmış; açıkça belirtilir, gerçek kullanıcı yorumu taklidi YOK)
- Kick `REVIEWS`, H2 `what people are saying`, lede `we asked for reviews. one person replied. <hl>it was dunno.</hl>`
- ★★☆☆☆ "i'd rate myself higher but that sounds like effort." (dunno, about dunno)
- ★★★★★ "finally, an ai on my level." (dunno, again), sarı kart
- ★☆☆☆☆ "never helped me once. would install again." (dunno, he wrote all of these)

### 4.7 İndirme (#download)
- Sürüklenmiş pencere izi efekti (arkada 3 ofsetli hayalet pencere).
- Pencere başlığı duruma göre: `setup.exe` / `setup.exe (not responding)` / `setup.exe (agrees with you)`.
- H2 `install dunno on your desktop?`, metin `he'll take up one corner of your screen and roughly all of your patience. he doesn't do anything. that's the feature.`
- Dosya satırı: `dunno_setup.zip · [FILE SIZE]` + yüzde. Segmentli progress bar.
- Butonlar `[ yes ]` (mavi) ve `[ dunno ]`:
  - idle: 0%, `waiting for you to decide. he's also waiting. asleep.`
  - yes: 99% takılı, `downloading… 99%. it's been 99% for a while. this is normal for him.`
  - dunno: 100%?, `great answer. he's proud of you. installing anyway.`
  - **Gerçekte:** her iki buton da indirmeyi başlatmalı (bkz. §7).
- Altında 3 adım kartı: `1 download him` (one small file. he's light. he doesn't eat.) · `2 drop him on your desktop` (any corner works. he'll fall asleep there.) · `3 ask him anything` (he'll get it wrong. that's how you know it worked.)
- `works on most computers. he didn't check which ones.` + mono `latest: v1.1 — nothing was fixed. some things broke more, on purpose.`

### 4.8 Pricing (#pricing)
- Kick `PRICING`, H2 `two plans. one exists.`, lede `we thought about a paid tier. <hl>it felt like effort.</hl>`
- **Free** (`dunno_free.exe`, rozet `the real one`): `$0 / month, forever`, `<hl>what else would you do.</hl>`, liste: 3 questions a day. then office hours are over. · one (1) shrug per question, minimum · two moods: polite or street (***) · naps, included · support: he's asleep. try tomorrow. Buton: `get dunno`.
- **Pro** (kesik çizgili kenar, `dunno_pro.exe — file not found`): `$9 / month` (fiyat pembe kalın çizgiyle üstü çizili, $9 yer tutucu), `coming never.`, `unlimited questions, twice the shrugging. we planned it, then dunno fell asleep in the meeting. the meeting is technically still going.` Devre dışı buton `not available`.

### 4.9 FAQ (#faq)
- Kick `FAQ`, H2 `frequently asked, rarely answered`, lede `dunno answered these himself. <hl>we didn't edit them.</hl> editing is work.`
- `<details>` akordeon (ilki açık), cevaplar `dunno:` etiketiyle:
  1. is dunno actually an ai? → i'm a bean. next question.
  2. what can he help me with? → lying down. mostly lying down.
  3. what's 2 + 2? → fish.
  4. will he work on my computer? → will i work at all? that's the real question.
  5. how do i uninstall him? → you don't. you just stop looking at me. i'll get the hint. i won't.
  6. does he see my screen? → no. i only know which app you're in. honestly i'd rather not know that either. nothing gets stored.
  7. can i make him be quiet? → there's a "not today" button. i sleep till tomorrow. you're welcome.
  8. is there a mobile version? → there's barely a desktop version.
  9. why is he like this? → dunno.

### 4.10 Son CTA (koyu bant)
- Mono `STILL_HERE.EXE`, H2 `you scrolled all the way down.`, `that's more effort than dunno has made all year. you've earned a bean.` (son cümle turuncu), buton `download dunno · $0`.

### 4.11 Footer (noktalı zemin)
- 4 sütun:
  - **product:** features · pricing · download · try it
  - **resources:** his story · faq · press kit (one blurry jpeg) → `mailto:dunnothebean@gmail.com?subject=press%20kit%20please` · support (he's asleep) → `mailto:…?subject=help`
  - **connect:** [SOCIAL LINK 1] · [SOCIAL LINK 2] · dunnothebean@gmail.com (mailto) + `(he won't reply. but he'll read it. probably.)`
  - **disclaimer:** `*dunno can't see your screen. his eyes are mostly closed. nothing you say is stored, because he wasn't listening.*`
- Altında dev **"dunno" kelimesi küçük pencere karolarından**: 5×7 piksel harfler, 29 sütunluk grid (harf arası 1 boş sütun). Karolar turuncu + koyu üst şerit, her 6.'sı sarı, her 13.'sü mavi; hover'da 4px zıplar. Glifler:
  ```
  d: ....#  ....#  .####  #...#  #...#  #...#  .####
  u: .....  .....  #...#  #...#  #...#  #...#  .####
  n: .....  .....  ####.  #...#  #...#  #...#  #...#
  o: .....  .....  .###.  #...#  #...#  #...#  .###.
  ```
- Ortalanmış: `© dunno. he doesn't know what year it is either.`

---

## 5. Etkileşim mantığı

### 5.1 ask.exe
- Üst şerit: mod seçici (segmented: `polite` | `street ***`, `aria-pressed`) + 3 piksel kalp (günlük soru hakkı).
- Sohbet: son 4 mesaj; kullanıcı mavi balon (sağ), dunno sarı balon (sol, `dunno:` önekli), düşünme balonu kesik çizgili `dunno is thinking...` (animasyonlu noktalar). Başlangıç: you: "what's the capital of france?" / dunno: "tuesday."
- Gönderme akışı:
  1. Boş soru → anında `you didn't ask anything. relatable` (hak düşmez).
  2. Hak 0 veya meşgulse → yok say.
  3. Kullanıcı mesajı + düşünme balonu eklenir, hak −1, `busy=true`.
  4. Normal: 1.5s sonra cevap.
  5. **Her 3 sorudan biri (idx % 3 === 1):** 1.8s sonra `zzz… (he fell asleep while thinking)` → 1.6s sonra yeniden düşünür → 1.2s sonra `huh. what. oh. ` + cevap.
  6. Hak 0'a inerse cevaptan sonra: `that was your last one. office hours are over. forever`.
  7. Her cevapta hero Dunno shrug yapar.
- Hak bitince input yerine `office hours are over. forever.` + `beg` butonu. Beg → hak 3'e döner, sırayla: `fine. 3 more. don't tell anyone` / `again? ugh. fine` / `this is the last time. it isn't`.
- Placeholder: `ask away (i won't answer)`.
- Mevcut cevap havuzları (frontend, sırayla döner):
  - polite: dunno. google it maybe · about four. emotionally · fish · have you tried not knowing · that sounds like a you problem · i used to know that. then i retired · the answer is inside you. i'm not going in there · probably a duck · *shrugs* · ask me in 2019. i cared back then
  - street: dunno. google it, *** · who the *** asks that · fish. *** fish · i retired from this *** years ago · that's a *** you problem · *shrugs* in *** · the answer is ***. next · i'm on my *** break
- **Backend ile:** cevaplar LLM'den gelebilir (bkz. §7), ama havuz offline fallback olarak kalmalı.

### 5.2 productivity.exe görev listesi ("hepsini aynı anda yapamazsın")
- Görevler: summarize my inbox · explain this spreadsheet · help me study for the exam. Üstte `N / 3 done`.
- State: `checked` = işaretlenme sırasıyla indeks kuyruğu (maks 2).
  - Tıklanan işaretliyse → kaldır.
  - Değilse ve <2 işaretli → ekle (yeşil ✓, üstü çizili).
  - Değilse ve 2 işaretli → en eski işaretliyi çıkar, bunu ekle.
  - 2 işaretliyken işaretsiz olan **kırmızı ×** (metin `#B24456`).
- Dunno satırı: başlangıç `those look hard. i'll be over here` · 1 işaret `one down. i'm tired just watching` · 2 işaret `two out of three. that's the max. trust me, i tried` · kırmızıya basınca `see? you can't have all three. ask me how i know` · geri alınca `undoing work. finally, something i relate to` / 0'a inince `back to zero. comfortable`.
- Her satır gerçek `<button aria-pressed>`.

### 5.3 Hero Dunno
- Tıklayınca balon sırayla: eh. · *shrugs* · dunno. · what. · meh. · zzz… huh? + 1.5s shrug pozu.
- **Dürtme:** 3s içinde ardışık 5+ tık → `stop poking me` (shrug durur); 9+ → `i'm telling someone`. 3s ara → sayaç sıfır.
- **Boşta kalma:** 30s etkileşim yok (pointermove/pointerdown/scroll/touchstart/wheel) → `are you dead or just reading`; ilk hareket → `oh. you're alive`. (Global keydown dinleyicisi YOK.)

### 5.4 Diğer
- Known issues butonları: tek seferlik etiket değişimi (§4.5).
- Download dialog durumları (§4.7).
- Görev çubuğu toast'ları (§4.2).
- Tüm sayfa içi linkler smooth scroll; sticky header için bölümlerde `scroll-margin-top: 72px`.

---

## 6. Responsive kuralları
- Fluid layout; içerik container'ı `max-width: 1320px` (pricing 1040, FAQ 880, mektup 820, footer wordmark 1400).
- Kart gridleri `repeat(auto-fit, minmax(min(100%, Npx), 1fr))`.
- **Geniş ekran ölçekleme:** kök elemana `zoom` + CSS değişkeni:
  ```css
  .desk{--z:1}
  @media (min-width:1680px){.desk{zoom:1.12;--z:1.12}}
  @media (min-width:2200px){.desk{zoom:1.3;--z:1.3}}
  ```
  Hero yüksekliği `100vh / var(--z)` ile hesaplanır, yoksa zoom yüzünden görev çubuğu ekrandan taşar.
- ≥1180px: hero yan masaüstü ikonları görünür.
- ≤760px: header linkleri, pil/saat, görev çubuğu sol widget'ı, dar alanlardaki dekorlar gizli; karolar ince kenarlık.
- ≤440px: görev çubuğunda games + files gizli.
- Telefon genişliğinde yatay scroll olmamalı (kök `overflow-x: clip`; sticky'yi bozmaz).

## 7. Backend / altyapı ihtiyaçları (öneri)
Stack serbest; öneri: statik frontend (Astro / Next.js / Vite) + birkaç serverless endpoint.

1. **İndirme:** `GET /download` → platforma göre en son sürüme redirect (ör. GitHub Releases / object storage). Sürüm metadata'sı (`version`, `size`, `notes`) bir JSON'dan okunup `[FILE SIZE]` ve `latest: v1.1 — …` satırını doldurmalı.
2. **Sohbet (opsiyonel, ask.exe'yi gerçek yapmak için):** `POST /api/ask { question, mode: 'polite'|'street' }` → `{ answer }`.
   - LLM'e karakter promptu: her zaman yanlış / saçma ama tutarlı cevap, ≤60 karakter, küçük harf, ünlemsiz, emojisiz; street modunda küfür sadece `***` olarak; yasak konular listesi (§1) → kaçamak shrug cevabı.
   - Soru logu **saklanmaz** (gizlilik vaadi). Sadece rate-limit için anonim sayaç.
   - Rate limit: **3 soru/gün** (IP + basit fingerprint; sunucu tarafı). "beg" frontend şakasıdır; istersen sunucuda günde 1 ek hak.
   - Timeout/hata → frontend havuzundan cevap.
3. **İletişim:** şimdilik `mailto:dunnothebean@gmail.com`. İstenirse `/api/contact` formu.
4. **Analytics (opsiyonel, gizlilik dostu):** çerezsiz (Plausible/Umami tarzı); sadece indirme tıklaması sayılır.
5. **SEO/meta:** title `dunno: the ai that teaches you nothing`, OG görseli (shrug pozu), favicon (yarım kafa ikonu, marka dokümanına göre 16/22/256/1024).

## 8. Erişilebilirlik kontrol listesi
- Gerçek `<button>`, `<a href>`, `<input>` + `<label>`; ikon butonlarında `aria-label`.
- Canlı alanlar `aria-live="polite"` (hero balonu, sohbet, durum mesajları).
- Boot overlay `role="dialog" aria-modal`.
- Metin kontrastı ≥4.5:1 (ikincil metin `#5C4560`).
- Renk tek başına anlam taşımaz (✓ / × işaretleri var).
- `prefers-reduced-motion` desteği.

## 9. Doldurulacak yer tutucular
- `[FILE SIZE]`: indirme dosya boyutu
- `[SOCIAL LINK 1]`, `[SOCIAL LINK 2]`: sosyal hesaplar
- Pro fiyatı `$9`: şaka amaçlı yer tutucu
- Gerçek indirme dosyası / release URL'leri
- `latest: v1.1` sürüm notu → release metadata'dan

## 10. Kaynak dosyalar
- `dunno-reference.dc.html`: tasarımın tam kaynağı (HTML + `<helmet><style>` içindeki tüm CSS + en alttaki `class Component` içindeki tüm state/mantık). Şablon sözdizimi: `{{x}}` = değer, `<sc-for list as>` = döngü, `<sc-if value>` = koşul, `onClick="{{fn}}"` = handler, `renderVals()` = template'e giden değerler. React'e çevirmesi doğrudan.
- Marka kimliği PDF'i (Dunno — Marka Kimliği): ses, ton, animasyon kütüphanesi, varlık listesi; bu md'nin §1'i oradan özetlendi.
