# Dunno --- Uzun Vadeli Ürün Stratejisi

## Ana vizyon

> **Dunno starts as a pet. Eventually, it becomes YOUR Dunno.**

Dunno yalnızca ekranda yürüyen komik bir pixel-art pet değil; zamanla
kullanıcıyı tanıyan, kişilik geliştiren, hatıralar oluşturan, level
atlayan, evrimleşen, gizli dünyalar keşfeden ve sonunda kullanıcıya özgü
hale gelen bir desktop companion olmalı.

Ürün yolculuğu:

`Funny Pet → Personal Companion → Relationship → Progression → Evolution → Worlds → Community → Creator Platform`

## Mevcut güçlü taraflar

-   Tauri 2 + Rust + TypeScript mimarisi
-   Local-first ve privacy-conscious yaklaşım
-   Aktif uygulama / idle / battery / meeting context
-   Rule-based question classifier
-   Contextual dialogue pool
-   LLM fallback ve sınırlı gerçek cevap sistemi
-   Cloudflare Worker, rate limit ve spend cap
-   Offline fallback
-   Wardrobe, themes ve achievements
-   Hareket ve animasyon state sistemi
-   Test altyapısı

## Ana problem: retention

İlk kullanım eğlenceli olabilir:

`Install → "HAHA" → 20-60 dakika → içerik tüketilir → merak azalır → silinir`

Hedef:

`Install → Eğlen → Dunno seni tanısın → Gelişsin → Secret keşfet → Evrimleşsin → Koleksiyon oluştur → Kendi Dunno'nu yarat → Toplulukla paylaş`

Dunno'nun ana retention formülü:

`Personality + Memory + Relationship + Progression + Discovery + Collection + Community`

------------------------------------------------------------------------

# 1. Dunno Memory

Dunno kullanıcıyı zamanla tanımalı. Ancak bunu privacy-first yapmalı.

Tutulabilecek davranışsal özetler:

-   favorite_app: figma
-   night_owl: true
-   frequent_dragger: true
-   high_interaction_user: true

Tutulmaması gerekenler:

-   ekran görüntüleri
-   klavye içeriği
-   clipboard
-   özel mesajlar
-   dosya içerikleri
-   şifreler
-   hassas kişisel veriler

### Memory katmanları

**Preferences:** theme, accessory, animation, renk vb.

**Behavioral traits:** night owl, serial dragger, spam clicker, power
user, quiet user, procrastinator.

**Relationship:** days together, interactions, questions,
trust/familiarity.

**Memories:** Dunno'nun seçtiği küçük ve komik olaylar.

Örnek:

> "You dragged me 17 times."

> "You kept me open during a 4-hour session."

Bu sistem kullanıcıya "bu benim Dunno'm" hissi vermeli.

------------------------------------------------------------------------

# 2. Relationship System

Dunno'nun kullanıcıyla zaman içinde ilişkisi oluşmalı.

Örnek state'ler:

-   trust
-   familiarity
-   chaos
-   curiosity
-   boredom
-   energy

Bunlar yalnızca sayı olmamalı; davranışa dönüşmeli.

High trust: - daha kişisel replikler - kullanıcıya yaklaşma - özel
animasyonlar

High chaos: - daha absürt davranışlar

High boredom: - kendi kendine etkileşim başlatma

Kullanıcı bilgisayarını birkaç gün açmadığında Dunno ölmemeli veya
suçluluk yaratmamalı.

Örneğin:

> "Oh. You exist."

> "I was about to replace you."

------------------------------------------------------------------------

# 3. Level ve Progression

Dunno level atlamalı.

XP kaynakları:

-   interaction
-   discoveries
-   achievements
-   world events
-   customization
-   questions
-   community participation

Milestone'lar gerçek içerik açmalı:

-   animation
-   theme
-   accessory
-   world
-   lore
-   evolution
-   interaction

------------------------------------------------------------------------

# 4. Evolution

Dunno'nun farklı davranışlara göre dallanan evolution yolları olmalı.

Örnek:

``` text
                 DUNNO
                   |
          +--------+--------+
          |                 |
        CHAOS              CHILL
          |                 |
      +---+---+         +---+---+
   GREMLIN DEMON      SLOTH  CLOUD
```

Bazı evolution'lar gizli olmalı.

Kullanıcı "Benim Dunno neden böyle oldu?" diye merak etmeli.

------------------------------------------------------------------------

# 5. Secret Discovery

Daha önceki 100 / 1000 / 10000 click fikri progression sisteminin
parçası yapılmalı.

Örnek:

-   100 clicks → secret event
-   1,000 clicks → secret world
-   10,000 clicks → hidden evolution
-   100,000 clicks → meta event

Bütün koşullar açıkça gösterilmemeli. Topluluk keşifleri viral içerik
oluşturmalı.

------------------------------------------------------------------------

# 6. Dunno OS

Dunno OS settings ekranı değil, Dunno'nun dünyası olmalı.

Bölümler:

-   PET
-   WORLDS
-   COLLECTION
-   MEMORIES
-   LORE
-   ACHIEVEMENTS
-   WARDROBE
-   PROFILE
-   WORKSHOP

Kullanıcı burada Dunno'sunun gelişimini ve koleksiyonunu görmeli.

------------------------------------------------------------------------

# 7. Dunno Universe

Farklı world'ler:

-   Normal
-   Monster
-   Glitch
-   Space
-   Hell
-   Retro
-   Office
-   Backrooms
-   ???

Her world farklı sprite, UI, replik, davranış, ses, lore ve achievement
içerebilir.

Bu yapı yeni içerik üretimini ölçeklenebilir hale getirir.

------------------------------------------------------------------------

# 8. Daily / Weekly Incidents

Kullanıcıya zorunlu günlük görev vermek yerine Dunno'nun başına kısa
olaylar gelmeli.

Örnek:

Day 1: "I found something."

Day 2: "Don't ask."

Day 3: "Okay, maybe ask."

Day 4: "This is bad."

Day 5: WORLD SHIFT

Amaç kullanıcıyı zorlamak değil; geri geldiğinde yeni bir şey bulmasını
sağlamak.

------------------------------------------------------------------------

# 9. Contextual Utility

Dunno productivity app'e dönüşmemeli. Ancak karakterini destekleyen
küçük utility özellikleri olabilir.

### Pomodoro

> "You've been staring at this screen for 47 minutes."

### Break

> "Get up."

### Focus

> "I'll stop bothering you."

Utility, Dunno'nun karakterinin uzantısı olmalı.

------------------------------------------------------------------------

# 10. Community / Workshop

Uzun vadede Dunno Workshop:

-   themes
-   accessories
-   costumes
-   animations
-   dialogue packs
-   worlds
-   behavior packs

içermeli.

İlk aşama: - community content tüketimi

Sonraki aşamalar: - upload - creator profiles - likes - ratings -
featured content - collections

------------------------------------------------------------------------

# 11. Modding / Creator Platform

İçerik paketleri standartlaştırılmalı:

``` text
my-pack/
├── manifest.json
├── sprites/
├── animations/
├── dialogue/
├── themes/
├── sounds/
└── behavior.json
```

Daha sonra Creator Studio:

-   Create World
-   Create Theme
-   Create Dialogue Pack
-   Create Accessory
-   Create Animation Pack

AI yardımcı olabilir.

Örneğin:

> "Create a world where Dunno is a corrupt CEO."

AI world + theme + dialogue + lore + behavior + achievements üretebilir.

------------------------------------------------------------------------

# 12. Viral Growth

## My Dunno Card

Örnek:

``` text
DUNNO

Level 27
Chaos 82%
Lazy 91%

Together for 43 days
2,381 interactions

Secret Worlds: 7/17
```

Bu kart paylaşılabilir olmalı.

Amaç: `Funny Moment → Screenshot → Share → New User`

------------------------------------------------------------------------

# 13. Monetization

Pro'nun ana fikri:

> **Free: Have a Dunno.**
>
> **Pro: Make Dunno yours.**

## Free

-   core pet
-   temel memory
-   temel personality
-   temel wardrobe
-   temel worlds
-   achievements
-   collection
-   community content
-   sınırlı AI

## Pro

-   Deep Memory
-   Custom Personality
-   Expanded AI
-   Voice
-   Advanced Wardrobe
-   Custom Worlds
-   AI World Generator
-   Evolution Paths
-   Creator Tools
-   Exclusive Worlds

Pro yalnızca "daha fazla AI mesajı" olmamalı.

------------------------------------------------------------------------

# 14. Pro'yu satma biçimi

"Limitin bitti, para ver" yaklaşımı kullanılmamalı.

Kullanıcı bir şey keşfetmeli.

Örnek:

**Dunno discovered a memory.**

Free: \> "Something happened here."

Pro: \> "View full memory timeline."

Başka:

**Dunno evolved.**

Free: \> Basic evolution

Pro: \> Choose your evolution path

Pro bir engel değil, Dunno'yu kişiselleştirme ve yaratma aracı gibi
görünmeli.

------------------------------------------------------------------------

# 15. Cosmetics

Subscription dışında tek seferlik cosmetic/seasonal pack'ler olabilir:

-   Halloween
-   Cyberpunk
-   Retro
-   Space
-   Meme
-   seasonal packs

Mağaza agresifleşmemeli.

------------------------------------------------------------------------

# 16. Creator Economy

Uzun vadede kullanıcılar içerik üretebilir.

Akış:

`Create → Publish → Community → Featured → Creator`

İleride gelir paylaşımı bile düşünülebilir.

Bu sayede içerik üretimi yalnızca Dunno ekibine bağlı kalmaz.

------------------------------------------------------------------------

# 17. Retention Ladder

Hedef kullanıcı yolculuğu:

-   Day 0 --- WOW
-   Day 1 --- FUN
-   Day 3 --- CURIOUS
-   Day 7 --- ATTACHED
-   Day 14 --- COLLECTING
-   Day 30 --- INVESTED
-   Day 60 --- IDENTITY
-   Day 90 --- COMMUNITY

------------------------------------------------------------------------

# 18. İlk 30 gün

-   Day 0: ilk interaction
-   Day 1: ilk secret
-   Day 2: personality trait
-   Day 3: customization
-   Day 5: mini incident
-   Day 7: world unlock
-   Day 10: evolution
-   Day 14: personal memory
-   Day 21: secret event
-   Day 30: relationship milestone

Bunlar zorunlu daily login değil; kullanıcının gerçek kullanımına göre
esnetilmeli.

------------------------------------------------------------------------

# 19. Geliştirme fazları

## Phase 1 --- Retention Core

1.  Memory
2.  Relationship
3.  Level / XP
4.  Evolution
5.  Secret Discovery
6.  Dunno OS
7.  Share Card

## Phase 2 --- Community

1.  Workshop browsing
2.  Community content
3.  Upload
4.  Creator profiles
5.  Likes / ratings

## Phase 3 --- Creator Platform

1.  Content Pack formatı
2.  Modding API
3.  Creator Studio
4.  AI World Generator
5.  AI Theme/Dialogue Generator

## Phase 4 --- Monetization

1.  Free / Pro
2.  Deep Memory
3.  Custom Personality
4.  Voice
5.  Creator Tools
6.  Premium Worlds
7.  Cosmetic Packs

------------------------------------------------------------------------

# 20. Şimdilik yapılmaması gerekenler

Erken aşamada aynı anda şunlara girilmemeli:

-   multiplayer
-   sosyal network
-   VRM
-   voice cloning
-   büyük marketplace
-   onlarca world
-   karmaşık PvP
-   agresif streak sistemi
-   agresif reklam
-   her şeyi AI ile üretme

Önce core loop sağlamlaştırılmalı.

------------------------------------------------------------------------

# 21. Teknik mimari önerisi

Yeni sistemler bağımsız modüller olmalı:

``` text
memory/
relationship/
progression/
evolution/
worlds/
incidents/
collection/
workshop/
creator/
monetization/
```

Event-driven yaklaşım:

``` text
interaction
question
drag
idle
app_change
world_change
achievement
session_start
session_end
```

Bu event'leri Memory, Progression, Relationship, Achievements ve
Incidents ayrı ayrı dinleyebilir.

Mevcut `main.ts` gibi orchestration dosyalarının daha fazla büyümesi
engellenmeli.

------------------------------------------------------------------------

# 22. Privacy ilkesi

Dunno'nun privacy-first kimliği korunmalı.

Tut: - davranışsal özetler - sayımlar - tercihler

Tutma: - keyboard content - clipboard - screenshots - private messages -
file contents - passwords - hassas kişisel veriler

------------------------------------------------------------------------

# 23. Başarı metrikleri

### Activation

-   ilk 5 dakika interaction
-   ilk achievement
-   ilk customization
-   ilk secret discovery

### Retention

-   D1
-   D7
-   D30
-   D60
-   D90

### Engagement

-   session length
-   sessions/day
-   interactions/session
-   questions/session

### Progression

-   average level
-   evolution unlock rate
-   worlds unlocked
-   collection completion

### Community

-   shared cards
-   workshop visits
-   downloaded packs
-   uploaded packs
-   creator retention

### Monetization

-   Pro conversion
-   Pro retention
-   ARPU
-   cosmetic purchases
-   creator revenue

------------------------------------------------------------------------

# 24. Nihai ürün tanımı

> **A local-first, privacy-conscious desktop companion that learns your
> habits, develops its own personality, evolves over time, discovers
> hidden worlds, and eventually becomes uniquely yours.**

Ana slogan:

> **Dunno starts as a pet. Eventually, it becomes YOUR Dunno.**

Pro sloganı:

> **Free: Have a Dunno.**
>
> **Pro: Make Dunno yours.**
