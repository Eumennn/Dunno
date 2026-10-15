# SPEC 17: Retention Core (Ürün Stratejisi Faz 1) + dil modeli + kurulum

Kaynak: kullanıcının `Dunno_Urun_Stratejisi_Detayli.md` belgesi (2026-10-09). Ana fikir: **"Dunno starts as a pet. Eventually, it becomes YOUR Dunno."**
Bu spec stratejinin **Faz 1 (Retention Core)** kısmını, mevcut kodu bozmadan ve CLAUDE.md kurallarına (gizlilik, marka dili, yasak konular,
test güvenliği) uyarak uygular. Faz 2-4 (topluluk, creator platform, ödeme) burada **yapılmaz**; sadece yerleri hazırlanır.

## Değişmez kurallar (strateji §20, §22 + CLAUDE.md)
- Her şey **cihazda** (tauri store). Ağa, LLM'e, telemetriye profil/hafıza/ilişki verisi gitmez. Sunucuya en fazla soyut bir
  **persona etiketi** (`chaos|chill|gremlin|...`) ve **ton etiketi** (`sad|angry|joking|neutral`) gider; ikisi de enum, metin değil.
- Tutulan: sayılar, davranış özetleri (trait), tercih, uygulama **etiketi** (`excel`, başlık değil), Dunno'nun seçtiği olay kartları
  (sabit şablon + sayı). Tutulmayan: soru metni, klavye, pano okuma, ekran görüntüsü, dosya içeriği, şifre, hassas veri.
- Suçluluk yok, agresif streak yok: gün atlamak ceza değildir; uzun aradan sonra Dunno kuru bir "oh. you exist." der.
- main.ts büyümez: yeni sistemler `src/companion/` altında bağımsız, saf modüller + tek bir `Companion` cephesi; main.ts sadece olay iletir.
- Laflar marka diliyle (küçük harf, kuru, ≤ ~60 karakter, ünlem/emoji yok). Stratejide verilen örnekler kullanılır; geri kalan yeni laflar
  `placeholder` işaretli az sayıda (tasarımcı havuzu bekler).
- Free/Pro (SPEC 15) sözleşmesi korunur: **Free: Have a Dunno. Pro: Make Dunno yours.** Pro bir duvar değil, kişiselleştirme aracı.

## Mimari (strateji §21)
```
desktop/src/companion/
  events.ts        CompanionEvent türleri + EventBus (interaction, question, drag, idle, app_change, world_change,
                   achievement, session_start, session_end, ...)
  memory.ts        trait'ler (night_owl, serial_dragger, spam_clicker, power_user, quiet_user, favorite_app) + anı kartları
  relationship.ts  trust, familiarity, chaos, curiosity, boredom, energy (0..100) + davranış etkileri + yokluk dönüşü
  progression.ts   XP (günlük tavanlı, spam'le kasılamaz) + level eğrisi + milestone ödülleri
  evolution.ts     dallanan form ağacı (dunno -> chaos/chill -> gremlin/demon/sloth/cloud + gizli form)
  incidents.ts     günlere yayılan kısa olay zincirleri (aktif gün sayısına göre, takvime değil)
  card.ts          "My Dunno Card" verisi + piksel kart çizimi (paylaşım)
  companion.ts     cephe: olayları modüllere dağıtır, store'a yazar, talker/controller'a etkileri verir
```
Event akışı: main.ts'deki mevcut `achieve()` / `onStat` noktaları aynı olayı `companion.emit()`'e de iletir. Modüller birbirini
çağırmaz; cephe sırayla uygular (memory -> relationship -> progression -> evolution -> incidents).

## İş paketleri (sıra = uygulama sırası)

### R0 Kurulum (FB5'ten devam)
- [x] Yayıncı/telif yer tutucuları gerçek değer, NSIS yan panel + başlık görselleri (marka), kurulum ikonu, başlat menüsü klasörü.
- [ ] docs/RELEASE.md: kod imzalama (Azure Trusted Signing / OV sertifika) ve SmartScreen itibarı rehberi. "Kaçak uygulama" hissinin
  asıl kaynağı imzasız exe uyarısıdır; bu kodla değil sertifikayla çözülür. `bundle.windows.signCommand` yeri hazırlanır.

### R1 Olay omurgası (`events.ts`, `companion.ts`)
- Olay türleri stratejideki listeden; mevcut olaylar (click, drag, question+qtype, honest, line+app, edge, idle_hour, fart, mute,
  open) eşlenir. `session_start` (açılış), `session_end` (kapanışta değil: son görülme zamanı dakikalık kalp atışıyla).
- Done: saf testler; main.ts'e en fazla ~25 satır.

### R2 Memory (`memory.ts`)
- Trait'ler eşikli ve geri dönebilir (7 günlük kayan pencere): `night_owl` (00-05 arası etkileşim payı), `serial_dragger`,
  `spam_clicker`, `power_user`, `quiet_user`, `favorite_app` (en çok laf atılan uygulama etiketi).
- Anı kartları: Dunno'nun seçtiği küçük olaylar, sabit şablon + sayı (`"you dragged me {n} times today."`, `"you kept me open {h} hours."`,
  ilk soru, ilk gizli dünya, level/evrim anları). En fazla 60 kart, eskiler düşer. Metin saklanmaz, şablon id + sayı saklanır.
- Free: son 3 anı + "something happened here."; Pro: tam zaman çizelgesi (strateji §14).

### R3 Relationship (`relationship.ts`)
- 6 değer 0..100. Etkiler: tıklama/sürükleme -> chaos+, soru -> curiosity+, iltifat/teşekkür -> trust+, hakaret -> trust- (kalıcı ceza yok,
  geri kazanılır), uzun boşta -> boredom+, uyku -> energy+. Günlük yumuşak dönüş (orta değere).
- Davranış: chaos -> dinlenme kısa + absürt laf payı; boredom -> kendiliğinden laf sıklığı; energy düşük -> daha çok uyku;
  trust yüksek -> kişisel/yakın laflar (Pro kişisel Dunno ile birleşir). Hepsi mevcut `chattiness`/`restScale` çarpanlarına bağlanır
  (sınır 0.5..2, mod davranışı gibi).
- Yokluk dönüşü: 3+ gün sonra açılışta bir kez "oh. you exist." / "i was about to replace you." (strateji örnekleri). Suçluluk yok.

### R4 Level / XP (`progression.ts`)
- XP kaynakları: etkileşim, keşif (gizli dünya/olay), başarım, dünya olayı (incident), kişiselleştirme (dolap), soru.
  Günlük tavan: tıklama/sürükleme XP'si günde en fazla 60 (spam ile kasılmaz). Eğri: level n için toplam `25 * n^1.6` (yuvarlanmış).
- Milestone'lar gerçek içerik açar: L3 lore 1, L5 evrime ilk adım bilgisi, L8 kart çerçevesi, **L10 ilk evrim**, L15 lore 2,
  **L25 ikinci evrim**, L30 ilişki dönüm noktası. Level atlayınca kısa toast (marka dili).

### R5 Evolution (`evolution.ts` + sprite)
- Ağaç (strateji §4): `dunno -> chaos | chill`, `chaos -> gremlin | demon`, `chill -> sloth | cloud`; gizli: `glitchling`
  (evrim anında glitch dünyası açıksa). Dal seçimi ilişki + trait'lerden (chaos vs sakinlik, curiosity vs chaos, energy vs trust).
- Görünüm: gizli kostüm gibi formlar (`evo_*`, gen-wardrobe ile, tüm pozlarda). Kostüm giyilmemişse form görünür; giyilen kostüm önde.
- Pro: evrim anında yolu seçebilir (strateji §14 "choose your evolution path"); Free: otomatik yol.
- Ağaçta açılmamış dallar `???` görünür ("benim dunno neden böyle oldu" merakı).

### R6 Secret Discovery
- Mevcut 100/1000 dürtme dünyaları korunur; eklenen: 10.000 dürtme -> gizli olay + XP + anı, 100.000 -> meta olay (sadece sayaç).
- Koşullar arayüzde gösterilmez (`???`).

### R7 Incidents (`incidents.ts`)
- Zincir "the thing" (strateji §8): aktif gün 1 "i found something." 2 "don't ask." 3 "okay, maybe ask." 4 "this is bad."
  5 WORLD SHIFT (geçici dünya kayması + anı + XP). Aktif günle ilerler (takvim değil), kaçırılan gün ceza değil.

### R8 Dunno OS (dunno.exe)
- Yeni sekme **pet.txt**: level + XP çubuğu, form + evrim ağacı (`???`), ilişki çubukları, trait'ler, kart.
- Yeni sekme **memories.log**: anı zaman çizelgesi (Free son 3, Pro tamamı) + lore sayfaları.

### R9 Share Card (`card.ts`)
- Strateji §12 kartı: DUNNO, Level, Chaos %, Lazy %, birlikte gün, etkileşim, gizli dünyalar x/y. Piksel kart (canvas), marka paleti.
- "kopyala" (panoya **yazma**; okuma yok) + "kaydet" (Rust: Resimler/Dunno klasörüne PNG). Ağ yok.

### L1-L4 Dil modeli
- L1 **Ton algısı** (`talk/tone.ts`): sad / angry / joking / neutral (TR+EN, küfür tek başına öfke sayılmaz). İlişkiyi besler
  (hakaret trust-, iltifat trust+) ve LLM'e `tone:` ipucu olarak gider.
- L2 **Takip sorusu**: cevaptan hemen sonra "neden", "nasıl yani", "ciddi misin", "so?" -> `follow_up` tipi (oturum içi, metin saklanmaz).
- L3 **Persona ipucu**: worker system prompt'u sabit kalır (cache); user mesajına `persona:` ve `tone:` satırları (enum, doğrulanır).
  Persona = evrim formu/dalı; üslup tablosu system prompt'ta.
- L4 Sunucu tarafı doğrulama + testler (validate.ts enum'ları, prompt testleri).

## Done when
- Desktop/worker/studio testleri, tsc, build, pool:check, cargo check yeşil; yeni modüllerin saf testleri.
- Gizlilik testi: companion store'unda soru metni/serbest metin yok (sadece sayı, enum, şablon id).
- Manuel liste bölüm 29.

## Sonraki fazlar (bu spec'te yok)
Faz 2 Workshop (gezinme, topluluk içeriği, yükleme, profil, beğeni), Faz 3 Creator Studio + AI world generator, Faz 4 ödeme
(Deep Memory, Custom Personality, Premium Worlds, Cosmetic Packs). Mevcut mod formatı (SPEC 12) Faz 3'ün temelidir.
