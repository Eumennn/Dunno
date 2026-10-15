# SPEC 03: Laf havuzu + laf editörü (Dunno Studio) + landing ile uyumlu masaüstü UI

PROJECT: Dunno
GOAL: (1) Dunno'nun gerçekten çeşitli konuşabildiği dolu bir laf havuzu, (2) ekibin havuzu yönetip "şu durumda ne der" diye
deneyebildiği bir iç araç, (3) masaüstü uygulamasının tüm arayüzünün `Dunno OS.html` landing page'iyle aynı görsel dilde olması.
ÖN KOŞUL: SPEC 02 bitmiş (D8/D9 bağlama, uçtan uca kontrol, D10, REPORT-spec02.md).
KAYNAKLAR: `docs/PROJECT.md`, `docs/agents/desktop.md`, `docs/agents/ui.md` (landing uyumu bölümü), `docs/agents/backend.md`,
`Dunno OS.html` + `dunno-reference.dc.html` (görsel dilin kaynağı; CSS satır 17–40 civarı `.win/.bar/.ctl/.pbtn`).

## A. Laf havuzu (P1–P3)
- **P1 Kapsam tablosu:** `content/pool/COVERAGE.md`: her trigger için hedef sayı, mevcut sayı. Trigger listesi = `desktop/src/lines/types.ts` + PROJECT.md.
  Hedef: `app:*`, `time:*`, `idle:*`, `interaction:*` için trigger başına **en az 10**, `random` için **40**, `answer:*` (soru cevapları) için **60**,
  `battery:low` 8. Ayrıca `app:` listesi genişletilir: excel, word, powerpoint, vscode, terminal, figma, photoshop, spotify, browser, youtube(başlık eşlemesi yok -> browser),
  slack, discord, mail, notion, game, file_explorer, settings. (Toplantı uygulamaları için laf YOK, onlar shh.)
- **P2 Yazım:** TR ve EN ayrı yazılır (çeviri değil, her dilde doğal). Kurallar: CLAUDE.md marka kuralları, ≤60 karakter, küçük harf, ünlem/emoji yok,
  yasak konular yok, `{K: ...}` sadece eki sokak modunda gösterilecek kısım için. Karakter: tükenmiş emekli asistan, kırıcı değil, gizliden şefkatli
  (gece geç saat lafları "uyu artık" tonunda). Her laf `intent` alanında ne yaptığını tek cümleyle söyler. `intent: "placeholder"` kalmaz.
- **P3 Doğrulama:** `npm run pool:check` (desktop'ta): şema, benzersiz id, uzunluk (render sonrası polite ve street ayrı), yasak kelime listesi
  (`content/pool/banned_tr.txt`, `banned_en.txt`), `{K:}` sözdizimi, kapsam hedefleri. CI testi olarak da çalışır.
- Kaynak dosyalar `content/pool/pool_tr.json`, `pool_en.json`; build sırasında `desktop/assets/`'e kopyalanır (tek kaynak).
- Son söz tasarımcıda: havuz merge edilir ama REPORT'ta "tasarımcı onayı bekliyor" olarak işaretlenir.

## B. Dunno Studio, iç araç (S1–S4)
Ekip ve tasarımcı için, son kullanıcıya dağıtılmaz. **Yerel web uygulaması**: `studio/` (Vite + vanilla TS), `npm run studio` ile `localhost`'ta açılır,
küçük bir Node sunucusu (`studio/server.ts`, sadece 127.0.0.1) `content/pool/*.json` dosyalarını okur/yazar. Görsel dil landing ile aynı (bölüm C).
- **S1 Liste:** trigger ağacı (kategori > trigger, sayılarla, hedefin altındakiler pembe), arama, dil sekmesi (TR/EN), her laf için polite ve street önizlemesi.
- **S2 Düzenleme:** ekle / düzenle / sil / çoğalt. Kaydederken P3 doğrulaması anında çalışır, hatalar satırında gösterilir. Kayıt dosyaya yazar (biçim korunur, git diff okunur kalır).
- **S3 Deneme paneli ("şu durumda ne der"):** öndeki uygulama, saat, boşta kalma, pil, etkileşim, ağız modu, dil seçilir ->
  **masaüstündeki gerçek `LineEngine`** (`desktop/src/lines/engine.ts`, kopya değil, import) ile hangi trigger'ın kazandığı, aday lafların listesi ve
  10 örnek çekiliş gösterilir. Dunno sprite'ı ve konuşma balonu uygulamadakiyle aynı bileşenle çizilir.
- **S4 Soru cevabı denemesi:** soru yaz -> önce havuz cevabı, "LLM" düğmesiyle yerel worker'ın `/v1/ask`'i (anahtar yoksa havuz döner, bu açıkça yazılır).
- Testler: sunucunun dosya yazma/okuma, doğrulama hatalarının UI'a gelişi (vitest).

## C. Masaüstü UI'ın landing ile uyumu (U1–U3)
Hedef: kullanıcı landing'deki pencereleri gördükten sonra uygulamayı açtığında "aynı dünya" demeli.
- **U1 Ortak UI kiti:** `ui-kit/` (paylaşılan CSS + küçük TS yardımcılar), desktop ve studio buradan import eder. Landing'den **birebir** alınır:
  `.win`, `.bar` (+ `-err/-idle/-blue`), `.ctl` piksel kontroller, `.pbtn` (+ `-dark/-blue/-sm`), `.kick`, `.hl`, sert offset gölgeler,
  segmented seçici (landing ask.exe'deki `polite | street ***`), piksel kalpler, kesik çizgili "düşünüyor" balonu ve animasyonlu noktalar,
  toast balonu (landing görev çubuğu toast'u). Değerler `dunno-reference.dc.html`'den, token isimleri `docs/agents/ui.md`'den.
- **U2 Uygulama yüzeyleri:**
  - Konuşma balonu ve soru kutusu: landing ask.exe görünümü (beyaz balon, `dunno:` öneki, kullanıcı mavi balon, kalpler, `ask away (i won't answer)` gibi placeholder dil).
  - İlk açılış: `setup.exe` tarzı pencere (landing indirme penceresi): başlık çubuğu, dil seçimi ve ağız modu segmented seçici, `[ yes ]` / `[ dunno ]` tarzı butonlar.
  - Ayarlar penceresi (yeni, tray'den açılır): `settings.exe` başlıklı pencere; mod, dil, sıklık, Windows ile başlat, "bugün sus", hakkında. Tray menüsü sistem menüsü olarak kalır ama "ayarlar..." buraya açar.
  - "Limit doldu" ve "bugün sus" durumları landing'deki hata kutusu dilinde (`.bar-err`, `office hours are over. forever.`).
  - Fontlar: Silkscreen sadece başlık çubuğu/etiket; gövde Segoe UI yığını (landing ile aynı). Silkscreen'de olmayan Türkçe harfler için başlık çubuğunda da Segoe'ya düş.
- **U3 Görsel doğrulama:** her yüzeyin ekran görüntüsü `orchestrator/notes/ui-shots/` altına (uygulamanın kendi penceresinin görüntüsü, `PrintWindow` veya webview
  snapshot; **masaüstünün tamamı değil**), yanına landing'deki karşılığının kırpımı. PM yan yana karşılaştırıp fark listesi çıkarır.

## Ekip dağılımı (öneri, PM karar verir)
Sıra: önce D (sprite, A1–A2), sonra C (ui-kit) ve E (ana pencere), paralelde A (havuz) ve B (studio).
- Backend mühendisi: P1–P3 (havuz yazımı + doğrulayıcı), S1/S2 sunucu kısmı, S4.
- Masaüstü mühendisi: U1–U3, S3 (engine ve balon bileşenini paylaşan), S1/S2 arayüzü.

## Kabul kriterleri
- `npm run pool:check` geçiyor; COVERAGE.md hedefleri dolu; placeholder laf yok.
- `npm run studio` açılıyor; laf ekleyip kaydetmek dosyayı değiştiriyor; deneme paneli "excel + 03:00 + street" için doğru trigger'ı ve adayları gösteriyor.
- Masaüstü tüm yüzeyler ui-kit kullanıyor; bileşen CSS'inde hex yok; ekran görüntüleri landing ile yan yana fark listesi kapanmış.
- Desktop ve studio testleri, `tauri build`, clippy temiz.

## Kapsam dışı
Studio'nun internete açılması, kullanıcı hesabı, uzaktan havuz yayınlama (günlük laflar zaten worker'da), macOS, yeni animasyon/sprite (tasarımcıdan gelecek).

## D. Dunno sprite seti (A1–A2) — EN YÜKSEK ÖNCELİK (kullanıcı ekledi)
Referans: `content/art/dunno_reference_poses.webp` (tasarımcının çizdiği pozlar). Soldan sağa, yukarıdan aşağı:
1 idle (yarı kapalı göz, kollar yanda) · 2 shrug (kollar yukarı/yana) · 3 sleep (yere yayılmış, kapalı göz, mavi zzz) · 4 surprised (yuvarlak göz, mavi şok çizgileri; peek'in başı veya talk için kullanılabilir) ·
5 sulk (arkası dönük) · 6 run_away / walk (yana dönük, koşu, mavi ter damlaları, hız çizgileri) · 7 shh (parmak ağızda) · 8 peek (kenarın arkasından bakıyor) · alt: logo (yarım kafa + "dunno" yazısı).
- **A1 Piksel sprite'lar:** Referansa sadık, **32x32** karelerde elle piksel haritası (handoff §3'teki gibi harf -> renk haritaları, `desktop/scripts/sprites/*.ts` veya `.mjs`),
  sadece palet renkleri (`#2B1E2F` kontur, `#F2A65A` gövde, `#D9774A` gölge, `#FFD29A` ışık, `#FFF1D6` yüz/karın, `#E86A7A` yanak, `#6EC5E9` zzz/ter/şok). Tek tel kıvrık tüy imza öğesi.
  Her durum için sözleşmedeki kare sayısı (`src/pet/state.ts` STATE_FRAMES); kareler arası farklar küçük ve sakin: 1px gövde nefesi, tüy sallanması, göz kırpma, kol 1-2px.
  walk: 6 kare yan profil (poz 6'nın sakin hali, ter damlası yok); run_away: poz 6 (ter + hız çizgileri); talk: idle + ağız açık/kapalı; dragged: tüy ve ayaklar sarkık.
  Üretici `npm run gen:sheet` gerçek sheet'i üretir: `assets/dunno_sheet.png` + `.json` (Aseprite hash formatı, frameTags = durumlar) — **Aseprite'ta açılıp düzenlenebilir** olmalı
  (Aseprite "Import Sprite Sheet" ile; ayrıca tasarımcı için `content/art/dunno_sheet_32.png` büyütülmemiş kopya). Placeholder üretici kalır ama varsayılan değil.
- **A2 Daha küçük ve daha yavaş:** `SPRITE_SCALE` 3 -> 2 (ekranda 64px), `WALK_SPEED` 40 -> 18 px/s, `RUN_SPEED` 180 -> 110, kare süreleri: idle 500ms, walk 220ms, talk 260ms, sleep 800ms, shrug 260ms,
  diğerleri en az 250ms. Kendiliğinden hareket daha seyrek: yürüyüş aralarında daha uzun idle (8–20 sn), daha sık uyku.
  Pencere boyutu ve tıklama alanı (dolu pikseller) yeni boyuta göre.
- Uygulama ikonu ve tray ikonu: alttaki logo pozundan (yarım kafa) 16/22/32/256/1024 PNG + `.ico`, placeholder ikonun yerine.
- Doğrulama: her durumun 4x büyütülmüş önizleme şeridi `orchestrator/notes/ui-shots/sprites.png` (uygulamanın kendi canvas'ından üretilir), referansla yan yana. Kullanıcı onayı manuel listeye.

## E. Ana uygulama penceresi: `dunno.exe` (M1–M2) (kullanıcı ekledi)
Pet tek başına yetmiyor; kullanıcı "uygulama" açabilmeli. Landing'deki Dunno OS pencere diliyle (ui-kit) bir ana pencere:
- **M1 Pencere:** tray simgesine çift tık / sol tık ve Başlat menüsü kısayolu açar (görev çubuğunda görünür, kapatınca pet çalışmaya devam eder). Başlık `dunno.exe`.
  Sekmeler landing'deki pencere başlıkları gibi: `home` · `settings.exe` · `stats.txt` · `about.txt`.
  - home: büyük Dunno (aktif durum animasyonu), günün durumu (`3 / 3 questions left`, mod, dil), "bugün sus" ve "toplantıdayım" anahtarları, "dunno'yu çağır" (pet'i ekranın ortasına getirir).
  - settings.exe: SPEC 03 C'deki ayarların hepsi (mod, dil, sıklık, Windows ile başlat, sürüklenince nereye yerleşsin vb.).
  - stats.txt: sadece cihazda tutulan sayaçlar (bugün/toplam soru, dürtme, sürükleme, uyuma süresi, en çok laf attığı uygulama kategorisi). Hiçbiri ağa gitmez; "sıfırla" butonu.
  - about.txt: sürüm, gizlilik özeti (landing FAQ dilinde), landing linki, `dunnothebean@gmail.com`.
- **M2** Tray menüsü sadeleşir: `dunno.exe'yi aç`, `bugün sus`, `toplantıdayım`, `çıkış`. Kalan her şey pencerede.
- Metinler marka sesinde, TR/EN.
