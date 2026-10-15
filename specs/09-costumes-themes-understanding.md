# SPEC 09: Kostümler, osurma, konuşma balonu, uygulama genelinde temalar, sekme farkındalığı, geniş soru anlama

GOAL: Kullanıcının 2026-10-04 geri bildirimi. ÖN KOŞUL: SPEC 08 (boyut ayarı) önce biter; bu spec onun üstüne kurulur.

> "dunno'yu böcek yapma sinek yapma gibi kostümler; osurma animasyonu 'pardon yemeği çok kaçırmışım'; yürürken kulaklık çıkıyor aksesuar çıkıyor;
> konuşmalar yorum balonu şeklinde olsun dikdörtgen değil; dunno'nun boyutunu ölçekle ayarlama; sekme isimlerini görebiliyorsa ona göre laf atma;
> mesajları anlama havuzunu genişlet: nerden, nereye, kime, günaydın gibi kelime öbeklerini anlayıp onların tersinde cevap vermeli, havuz geniş olmalı;
> theme değişiklikleri hem dunno'yu hem exe'yi değiştirsin, daha fazla renk kombinasyonu; aksesuarlardaki uyum problemlerini düzelt, daha çok aksesuar ekle"

## K1 Aksesuar uyumu (HIGH, önce)
- Yürürken (walk 6 kare, run_away 4 kare) kulaklık ve diğer aksesuarlar gövdeden "çıkıyor": her karenin anchor'ı yeniden ölçülür, kare kare titreme/kayma yok.
- Otomatik test: her aksesuar x her durum x her kare x {sol, sağ} x her boyut (SPEC 08): aksesuarın kafa/göz anchor'ına göre ofseti sabit (±0 px), gövde konturunun dışına taşma yok
  (tanımlı istisnalar hariç: taç yukarı taşabilir vs., aksesuar JSON'unda `overflow` alanı).
- Headless şerit: `fit-*.png` her aksesuar için walk + run_away kareleri yan yana, sol ve sağ.

## K2 Kostümler (tüm gövde)
- Yeni tür: **kostüm** = aksesuardan büyük, tüm gövdeyi saran katman(lar) + gerekirse gövde rengini değiştiren yerel palet.
  İlk set: **böcek** (kabuk deseni + 2 anten + 6 küçük bacak), **sinek** (iri petek gözler gözlerin üstüne, şeffaf piksel kanatlar, 2 anten; yürürken kanat 2 kare çırpar),
  ek olarak: **arı** (çizgiler + iğne + kanat), **hayalet** (çarşaf), **dinozor** (sırt pulları + kuyruk), **kurbağa** (yeşil + üst göz kabarcıkları), **astronot** (kask camı + sırt çantası), **pizza dilimi** (gövde üçgen kostüm).
- Kostüm her durum için ya kare kare katman (anchor + poz bazlı varyant) ya da durum bazlı tam çizim içerir; tüy imzası mümkünse görünür (antenler tüyün yerini alabilir: kostüm JSON'unda `hidesTuft: true`).
- Kostüm + aksesuar birlikte: kostüm JSON'u hangi aksesuar slotlarını kapattığını söyler (ör. astronot -> `head` kapalı).
- Açılma: tembel başarımlarla (SPEC 05 motoru), test modunda hepsi açık. Yeni başarım önerileri (metinler marka sesinde): "50 kez sinekleştin" vb. PM tablo yapar.
- wardrobe.exe'de `costumes` sekmesi/ızgarası.

## K3 Osurma animasyonu
- Yeni durum `fart` (one-shot, 6 kare): hafif çömelme, arkadan 2-3 karelik piksel bulut (palet: `#FFD29A`/`#D9774A` tonları, yarı saydam yok, sadece piksel), gövde 1px titreme, sonra utangaç ifade.
- Ardından balon: havuz `interaction:fart` (≥20 TR + ≥20 EN; örnek: "pardon. yemeği çok kaçırmışım", "o ben değildim. tamam bendim").
- Tetiklenme: rastgele ve seyrek (günde en fazla 2), yemek saatlerinden sonra (12:30–14:30, 19:30–21:30) biraz daha olası, **toplantı korumasında ve 'bugün sus'ta asla**, polite modda da olur (kaba kelime yok).
  Ayarda kapatılabilir ("osuruk: açık/kapalı"). Ses yok.
- Sprite sözleşmesine `fart` eklenir (STATE_FRAMES, sheet üretici, PROJECT.md animasyon listesi). Ayna ve kostümlerle uyum.

## K4 Konuşma balonu biçimi
- Dikdörtgen kutu yerine **çizgi roman konuşma balonu**: piksel basamaklı yuvarlak köşeler (CSS `border-radius` YOK; köşeler 2-3 px basamak, ya da 9-slice piksel görsel), `--ink` kontur, beyaz zemin,
  pet'e bakan piksel kuyruk (UP1 yönüyle). Düşünme balonu: aynı biçim + kuyruk yerine küçükten büyüğe 3 piksel daire (klasik düşünce balonu).
- Uzun metinde balon genişler ama oranı korur; ask.exe/error.exe pencere dili aynı kalır (kullanıcı .exe'yi beğendi), sadece konuşma ve düşünme balonları değişir.
- ui-kit'e `speech-bubble` ve `thought-bubble` bileşenleri; ui.md'ye "piksel yuvarlak köşe istisnası (sadece balonlar, basamaklı)" notu.

## K5 Uygulama genelinde temalar + daha çok renk
- Tema seçimi artık **hem Dunno'nun sprite'ını hem tüm .exe pencerelerini** (dunno.exe, ask.exe, error.exe, setup.exe, toast, balon kuyruğu) renklendirir.
  UI tema rolleri: başlık çubuğu (`--main` yerine tema gövde rengi), buton (`--light` yerine tema ışık), buton gölgesi (tema gölge), vurgu (`--ice` tema başına seçilebilir), zemin (`--cream` tema yüz-karın).
  **Sabit:** `--ink` kontur/metin, beyaz balon zemini, `--pink` hata çubuğu (error.exe her temada pembe kalır, anlam taşıdığı için). Klasik tema = bugünkü görünüm birebir.
- Kontrast testleri UI için de (metin/zemin ≥ 4.5, başlık metni/başlık çubuğu ≥ 4.5, buton metni ≥ 4.5); geçmeyen tema UI'a uygulanmaz.
- Tema sayısı 5 -> **en az 14**: mevcut 5 + çilek, limon, okyanus, orman, şeftali, gri kedi (monokrom), kahve, gece yarısı (koyu, UI'da koyu mod), retro yeşil (eski monitör), pamuk şeker, karpuz.
  `ui.md` tema tablosu güncellenir (UI rolleri sütunlarıyla). Tasarımcı onayı bekliyor olarak işaretlenir.
- Koyu temalarda (gece yarısı) UI metin rengi açık olur; ui-kit bunu token'larla çözer (bileşen CSS'inde hex yok kuralı sürer).

## K6 Daha çok aksesuar
- Mevcut 6 + en az **14 yeni**: kovboy şapkası, korsan bandanası, aşçı şapkası, sihirbaz şapkası, pelerin (gövde), papyon, monokl, nerd gözlüğü, atkı,
  kedi kulakları, kurdele, çiçek (tüyün yanına), mezuniyet kepi, inşaat kaskı, doğum günü şapkası. (PM son listeyi en az 14 olarak sabitler; gerçek marka/logo yok.)
- Slotlar: `head`, `eyes`, `neck`, `body`, `side` (tüy yanı). Aynı slotta tek aksesuar; farklı slotlar birlikte giyilebilir (en fazla 3 parça).
- Açılma: mevcut + yeni tembel başarımlar; test modunda hepsi açık.

## K7 Sekme / pencere başlığı farkındalığı (cihazda)
- Öndeki pencerenin başlığı (tarayıcıda = aktif sekme adı) **sadece cihazda, bellekte** anahtar kelime eşlemesiyle kategoriye çevrilir; başlık **saklanmaz, loglanmaz, ağa gitmez, LLM'e gönderilmez**.
- Kategoriler ve trigger'lar (`site:*`): video, social, shopping, news, mail, code (repo/kod barındırma), ai_chat, docs (döküman/tablo), music, maps, learning (kurs/sözlük/ansiklopedi), game_store, search, adult/kumar -> **asla laf atma** (sessiz).
  Eşleme tablosu `content/context/sites.json` (anahtar kelimeler, TR+EN), testli. Marka adları sadece eşleme anahtarında; **laflarda marka adı yok** ("yine mi video", "sepete bir şey daha eklersen ben de eklerim").
- Havuz: her `site:*` için ≥10 TR + ≥10 EN laf. Öncelik: `site:*` > `app:*` > time > idle...
- Ayar: settings.exe "sekme adlarına bak: açık/kapalı" (varsayılan açık), yanında gizlilik notu ("başlığı okur, unutur. hiçbir yere göndermez"). about.txt gizlilik metni güncellenir; landing FAQ'yla çelişen nokta varsa REPORT'ta kullanıcıya belirtilir.
- Toplantı koruması aynen önceliklidir.

## K8 Soru anlama havuzunu genişlet + "tersine" cevap
- Sınıflayıcıya kelime öbekleri: **nereden/nerden, nereye/nere, kime, kimden, kimin, kimle, neyle, ne için, hangi, kaçıncı, nasılsın, naber, günaydın, iyi geceler, iyi akşamlar, tünaydın,
  teşekkürler/sağ ol, özür/pardon, görüşürüz/bay, seni seviyorum, sıkıldım, acıktım, yoruldum** (+ EN karşılıkları: from where, to where, to whom, whose, with whom, good morning, good night, thanks, sorry, bye, i love you, i'm bored, hungry, tired).
  Yazım hataları ve Türkçe ek varyantları (nerdesin, nereyeee, günaydınnn, gunaydin) toleranslı (ascii katlama + tekrar harf sıkıştırma).
- **Tersine cevap kuralı:** yön/zaman/selam tiplerinde cevap sorunun tersidir: "nereye" -> nereden cevabı ("geldiğin yerden"), "nereden" -> nereye ("oraya gidiyorum ama"), "kime" -> kimden,
  "günaydın" -> "iyi geceler. ben yatıyorum", "iyi geceler" -> "günaydın. erken kalktın", "görüşürüz" -> "merhaba" ... (tablo `content/pool/inverse.md`'de, testli).
- Havuz: yeni her tip için **≥25 TR + ≥25 EN**, mevcut 12 tip 15 -> **25**'e çıkar; street kuyruklu varyantlar oranı korunur. COVERAGE.md + pool:check güncellenir.
- Studio deneme panelinde soru yazınca tip + "ters" eşleşme gösterilir.

## K8b SPEC 08 boyut ayarı ile ilişki
SPEC 08 (5 kademe tam sayı ölçek) önce biter. Kullanıcı "ölçekle" dedi: settings.exe'de seçici **kaydırıcı (slider)** görünümünde olur ama tam sayı kademelere oturur (piksel keskinliği). Kostüm, osurma bulutu, balonlar ölçekle uyumlu.

## Doğrulama ve kabul
- Testler: K1 sınır/kayma testi, kostüm slot çakışmaları, fart tetik kuralları (saat/toplantı/sus enjekte), balon geometri, tema UI kontrastı, sites.json eşleme + "asla laf atma" kategorileri,
  sınıflayıcı yeni öbekler + ters tablo, pool:check yeni hedefler.
- Headless görüntüler: `fit-*`, `costume-*` (her kostüm idle/walk/sleep/peek sol-sağ), `fart-*`, `bubble-*` (4 kenar), `theme-ui-*` (her tema: dunno.exe home + ask.exe + toast), `site-*` örnek laflar tablosu.
- desktop + worker + studio testleri, tsc, `tauri build`, clippy temiz; yeni kurulum dosyası ana checkout'ta, raporda tam yol.
- `REPORT-spec09.md` (tasarımcı onayı bekleyenler: yeni temalar, kostümler, aksesuarlar, fart lafları, site lafları, ters cevaplar) + manuel test bölümü 16.

## Kapsam dışı
Ses, satın alma, ekran görüntüsü/OCR (sekme adı dışında içerik okuma YOK), başka uygulamaların içeriğini okuma.
