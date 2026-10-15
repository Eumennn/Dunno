# Dunno: genel değerlendirme ve launch raporu (2026-10-10)

Durum: `claude/focused-galileo-ty4nlf`.
- Testler: masaüstü 1487, worker 152, studio 42, cargo test.
- Kontroller: tsc, vite build, pool:check temiz.
- **Önemli sınır:** bu oturumdaki her şey Linux konteynerde yazıldı ve test edildi. Gerçek Windows'ta `tauri build`, setup.exe, tray, pencere zıplaması ve exe/başlık algılama **hiç çalıştırılmadı**. Bunlar manuel listede (bölüm 29).

## 1. Ne var (kısa envanter)

| Alan | Durum |
|---|---|
| Pet (yürüme, uyku, uçuş, paraşüt, kenar, çoklu monitör) | var, FB5 düzeltmeleri dahil |
| Laf motoru | 2385 laf/dil; uygulama/oyun/site tepkileri; saat, boşta, etkileşim |
| ask.exe | günde 3 dürüst cevap (worker + LLM), sohbet niyetleri yerel, ton ve follow-up |
| Ses | mırıltı profilleri, kategori sesleri, ses düzeyi, quiet.exe anahtarı, tray "dunno sesi" |
| Animasyonlar | temel pozlar + wave, jump, dance, yawn, sneeze (+ osuruk, eskiden beri) |
| Companion | hafıza, ilişki, seviye/xp, evrim formları, olay zinciri, gizler, RPG beceri ağacı, paylaşım kartı |
| dunno.exe | home, pet, wardrobe, workshop, settings, stats, about; karanlık mod; klavye gezinme |
| Workshop | göz at, beğen, kur/kaldır, yaratıcı profili, yükleme + moderasyon kuyruğu |
| Creator Studio | paletten tema, tetikleyicili laf paketi, Pro AI dünya üretici |
| Para | Pro lisansı (Ed25519, çevrimdışı doğrulama), kozmetik paket lisansı, 2 kozmetik + 2 Pro dünya |
| Kurulum/güncelleme | markalı NSIS, imzalı güncelleme altyapısı (anahtar henüz yok) |
| Gizlilik | soru içeriği loglanmaz; telemetri varsayılan kapalı; kişisel veri yok |

## 2. Artılar

- **Kimlik çok net.** "Hiçbir şey öğretmeyen yapay zeka" fikri, kuru küçük harf dil ve piksel estetik tutarlı. Bu kategoride (masaüstü pet) bu kadar keskin bir ses nadir.
- **Tutunma (retention) döngüsü artık var.** Seviye, evrim, beceri ağacı, hafıza ve kart "yarın yine açayım" sebebi veriyor. Suçlama yok: uzun süre açmayınca ceza yok, sadece kuru bir "oh. you exist.".
- **Maliyet kontrollü.** LLM sadece günde 3 dürüst cevap ve Pro dünya üretici için çağrılıyor. Geri kalan her şey yerel havuz. Sunucu kapalı olsa da uygulama çalışıyor.
- **Gizlilik iyi bir satış argümanı.**
  - Pencere başlıkları cihazdan çıkmıyor; sadece kategori kullanılıyor.
  - Soru metni loglanmıyor.
  - Lisansta kişisel veri yok.
- **Mod güvenliği sağlam.**
  - Kod yok, sadece veri.
  - Yollar, uzantılar ve boyutlar hem sunucuda hem Rust'ta yeniden denetleniyor.
  - Kurulum atomik.
  - AI üreticide paketi model değil sunucu kuruyor.
- **Test kapsamı yüksek.** Saf fonksiyon ağırlıklı mimari sayesinde 1700'e yakın otomatik test var.

## 3. Eksiler ve kafama takılanlar

### Launch'u engelleyenler
1. **Kod imzası yok.** Markalı setup.exe "kaçak uygulama" hissini azaltıyor ama SmartScreen'in "bilinmeyen yayıncı" uyarısını kaldırmıyor.
   - Bunun tek çözümü imza: Azure Trusted Signing (en ucuz, kurumsal kimlik ister) ya da OV/EV sertifika. RELEASE.md'de anlatıldı.
   - Bu, indirme-kurulum dönüşümünü en çok etkileyecek tek madde.
2. **Ödeme akışı yok.** Lisanslar şu an elle üretiliyor (`scripts/license.mjs`).
   - Gerekli zincir: bir ödeme sağlayıcısı (Lemon Squeezy / Paddle gibi vergi yükünü alan "merchant of record") → webhook → worker lisans üretir → e-posta / uygulamada aktivasyon.
   - Sağlayıcının Türkiye'den ödeme çekişini önceden doğrulamak gerekiyor.
3. **Canlı ortam ayarları boş.** Hepsi `npm run check:release -- --publish` ile denetleniyor.
   - Güncelleme pubkey'i yer tutucu.
   - `VITE_API_BASE` ve CSP `connect-src`'de canlı API alan adı yok. Bugün eklenen kontrol, eksikse FAIL veriyor.
   - Worker sırları girilmedi: `PRO_PUBKEY`, `WORKSHOP_ADMIN_TOKEN`, LLM anahtarı, KV bağlantısı.
4. **Windows'ta gerçek test yapılmadı.** Bölüm 16-29 manuel listeler bir kez baştan sona koşulmalı. En riskli olanlar:
   - pencere zıplaması ve iniş (görev çubuğu, çoklu monitör, DPI);
   - exe adıyla oyun algılama;
   - tray senkronu;
   - kurulum ve güncelleme.

### Önemli ama engel değil
5. **Laflar çoğunlukla `placeholder`.** Tasarımcı / editör onayı yok.
   - Oyun ve site lafları oyun detaylarına dayanıyor (marka adı yok). Yine de bir oyuncu gözüyle okunmalı; yanlış detay "cringe" etkisi yapar.
6. **Moderasyon tek kişilik ve arayüzsüz.** Sadece admin uç noktası var.
   - Workshop açılınca kuyruk birikir.
   - Öneri: launch'ta Workshop'u "sadece onaylı/öne çıkan" modda aç; yükleme davetle olsun.
7. **Beğeni manipülasyonu.** Beğeni cihaz kimliği başına bir. Kimliği sıfırlayan biri şişirebilir. Küçük ölçekte sorun değil; büyürse hız sınırı ve anomali kontrolü gerekir.
8. **Ölçüm yok.** Telemetri varsayılan kapalı (doğru karar). Ama retention'ı hiç göremezsiniz.
   - Öneri: ilk hafta sonunda tek seferlik, açıkça soran bir opt-in ("anonim sayaç gönderilsin mi").
9. **Sadece Windows.** Reddit/HN kitlesinin büyük kısmı macOS. İlk yorumlar "mac?" olacak. Bunu dürüstçe "şimdilik windows" diye baştan söylemek gerekir.
10. **Özellik yoğunluğu.** 7 sekme, beceri ağacı, workshop, studio, paketler, lisans... Yeni kullanıcı için fazla.
    - Öneri: ilk gün sadece pet + ask.exe + wardrobe görünsün; diğer sekmeler seviye ile açılsın. Bu, beceri ağacı mantığıyla da uyumlu.
11. **AI dünya üretici maliyeti ve kalitesi.** Günlük 3 hak ve harcama tavanı var. Ama çıktı kalitesi gerçek modelle hiç denenmedi (testler sahte dünya ile).
12. **Pet penceresi CPU/GPU tüketimi ölçülmedi.** Masaüstü pet'ler için "pil yiyor" yorumu en hızlı uninstall sebebi.
    - Öneri: Windows'ta Görev Yöneticisi ile boşta %CPU ölçün; hedef < %1.

## 4. Önerilerim (öncelik sırasıyla)
1. İmza + ödeme + canlı ortam (madde 1-3). Bunlar olmadan launch yapmayın.
2. Windows manuel turu (bölüm 29'dan başlayarak). Çıkan hataları tek listede toplayın.
3. "İlk 10 dakika" akışı:
   - kurulum → karşılama → ilk soru → ilk seviye → ilk kostüm;
   - kronometreyle izleyin;
   - 3 arkadaşa izletin, hiç yardım etmeden.
4. Laf editörlüğü: en çok görülen 300 lafı (click, idle, browser, en popüler 5 oyun) insan gözüyle elden geçirin.
5. Paylaşılabilirlik:
   - kart PNG'si ve kısa GIF/video kayıt modu (pet'in kendi penceresi, ekranın tamamı değil);
   - TikTok/Shorts için en güçlü pazarlama aracı bu olur.
6. Fiyat testi: Pro için tek seferlik ve aylık seçeneklerini pre-launch anketiyle sorun. Kozmetik paket fiyatı düşük tutulsun (impulse alım).

## 5. Launch öncesi kontrol listesi
- [ ] Kod imzası (Trusted Signing / OV / EV); imzalı setup.exe SmartScreen'de denendi.
- [ ] `tauri signer generate` → pubkey `tauri.conf.json`'a; özel anahtar repo dışında, güvenli yerde.
- [ ] Canlı worker deploy; `VITE_API_BASE` + CSP `connect-src`; `check:release -- --publish` PASS.
- [ ] Worker sırları: LLM anahtarı, `PRO_PUBKEY`, `WORKSHOP_ADMIN_TOKEN`, KV namespace'leri, harcama tavanı.
- [ ] Ödeme sağlayıcı + webhook → lisans üretimi; iade ve lisans kaybı akışı (e-postayla yeniden gönderim).
- [ ] Lisans özel anahtarı sadece worker sırrında / çevrimdışı; repoda yok (secret-audit tekrar).
- [ ] REPO-01 R4: herkese açık uygulama reposu ve özel repolar ayrımı için kullanıcı onayı.
- [ ] Windows manuel listeler 16-29; en az 2 farklı makine (biri yüksek DPI, biri çift monitör).
- [ ] Antivirüs taraması (VirusTotal) imzalı exe ile; false positive varsa üreticilere bildirim.
- [ ] Gizlilik metni (PRIVACY.md) siteye; kullanım şartları + iade politikası (ödeme sağlayıcısı ister).
- [ ] Landing'de indirme düğmesi gerçek dosyaya, sürüm notları, "sadece windows 10/11" notu.
- [ ] Workshop: launch'ta yükleme kapalı ya da davetli; moderasyon kuralları sayfası.
- [ ] Destek kanalı: tek e-posta + Discord; hata bildirimi şablonu.
- [ ] Boşta CPU/RAM ölçümü; uzun süre (8 saat) açık bırakma testi (bellek sızıntısı).

## 6. Pre-launch topluluklar (kitle + geri bildirim)

Her topluluğun kendi tanıtım kuralı var. Paylaşmadan önce kuralları okuyun. Çoğu yerde "yaptım, geri bildirim istiyorum" dili ve gerçek katılım işe yarar, reklam dili yaramaz.

**Uluslararası (Reddit)**
- **r/SideProject, r/IndieDev, r/indiegames:** kendi projesini paylaşmaya açık. Devlog ve "ilk sürüm" postları için en güvenli yer.
- **r/pixelart:** sprite sayfası ve animasyon GIF'leri. Ürün değil sanat olarak paylaşılır; kostümler ve evrim formları iyi içerik.
- **r/desktops, r/Windows11, r/Windows:** masaüstü kurulumu ekran görüntüsü ya da videosu içinde Dunno. Bazıları tanıtıma katı, kurallara bakın.
- **r/InternetIsBeautiful:** genelde web siteleri için. Landing'in kendisi uygunsa düşünülebilir.
- **r/desktoppets, r/shimeji gibi küçük nişler** (varsa, aktiflik kontrol edilmeli): kitle tam hedef.
- **r/pcgaming, r/gaming:** tanıtıma çok katı. Ancak "oyun açınca yorum yapan pet" klibi organik paylaşılırsa tutabilir. Doğrudan reklam yapmayın.
- **Oyun subreddit'leri** (r/leagueoflegends, r/VALORANT, r/Minecraft...): oyuna özel laflar ilginç bir kanca. Ama çoğu self-promo yasaklıyor; sadece izin verilen günlerde ya da mizah postu olarak.

**Diğer uluslararası**
- **Product Hunt:** launch günü için. Önceden "coming soon" sayfası ve takipçi toplayın.
- **Hacker News (Show HN):** teknik hikaye öne çıkarılmalı:
  - Tauri + Rust;
  - gizlilik (başlıklar cihazdan çıkmıyor);
  - LLM maliyet kontrolü (günde 3 cevap).
  - Kitle mac ağırlıklı, Windows-only olduğunu baştan söyleyin.
- **itch.io:** "tool/desktop toy" olarak sayfa; indie kitlesi ve ücretsiz dağıtım.
- **Discord:**
  - kendi sunucunuz (beta testçiler, mod yapanlar);
  - pixel art ve indie dev sunucularında showcase kanalları.
- **TikTok / YouTube Shorts / Instagram Reels:**
  - Dunno'nun yanlış cevapları, oyun tepkileri, osuruk ve hapşırık animasyonları kısa klip formatına çok uygun;
  - haftada 3-4 kısa devlog;
  - büyük ihtimalle en verimli kanal.
- **X / Bluesky:** #pixelart, #indiedev, #screenshotsaturday etiketleri.

**Türkiye**
- **Ekşi Sözlük:** "dunno" başlığı. Kendi ürününüzü kendiniz tanıtmak orada hoş karşılanmaz; kullanıcıların açması daha değerli.
- **Technopat Sosyal, DonanımHaber forumu:** yazılım / proje paylaşım bölümleri, Türk Windows kullanıcı kitlesi.
- **r/Turkey, r/KGBTR, r/TurkeyJerky:** street modu ve Türkçe laflar burada iyi karşılanabilir. Kurallar ve tanıtım günleri kontrol edilmeli.
- **Türk indie dev Discord sunucuları ve Twitter/X'teki Türk oyun geliştirici topluluğu.**
- **Türk Twitch/YouTube yayıncıları:** yayında açık duran, oyuna laf atan pet doğal bir içerik. Küçük ve orta ölçekli yayıncılara ücretsiz Pro anahtarı verin.

**Geri bildirim toplama düzeni**
- Pre-launch beta: 50-100 kişi.
  - Discord'da kayıt;
  - Pro anahtarı teşekkür olarak;
  - 5 soruluk kısa form: ilk gün ne hissettin, ne rahatsız etti, kaldırdın mı, neden, ne kadar öderdin.
- Telemetri opt-in ile sadece anonim sayaçlar: günlük açılış, 7. gün dönüşü.

## 7. Bu turda kapatılan boşluklar
- Tray'e "dunno sesi" anahtarı eklendi: sesi menüden tek tıkla kapatma (6e9ba13).
- `check:release` artık `VITE_API_BASE`'i ve CSP `connect-src` uyumunu denetliyor. Canlı exe'nin sunucuya sessizce bağlanamaması riski kapandı.
- Manuel test bölüm 29 ve plan günlüğü güncellendi.

## 8. Açık kalanlar (benim yapamadıklarım)
- Gerçek Windows testi, imza, ödeme sağlayıcısı hesabı, canlı sırlar, tasarımcının laf/sprite onayı, REPO-01 R4 onayı.
- Bunların hepsi hesap, kimlik ya da fiziksel makine istiyor.

---

## 9. FB6 sonrası yeniden değerlendirme (2026-10-10)

### Bu turda kapananlar
| Konu | Durum |
|---|---|
| Sekme şeridi ezilip yazıların kaybolması (Windows) | düzeldi. Kök neden: overflow verilen flex öğesi küçülebiliyordu |
| Dolapta preview.txt kayması | düzeldi. Önizleme artık kaydırılan alanın içinde değil, oynayamaz |
| Beceri ağacı açıklamaları | düğüm balonu (fare + klavye): ne açar, hangi level, kaç level kaldı |
| Seviye sistemi belirsizdi | belgelendi (SPEC 19 §C) ve uygulamada xp.txt ile gösteriliyor. stats 3. seviyede, workshop 10. seviyede açılır; Pro beklemez |
| İlk 10 dakika | beş adım + ipuçları + 80 XP (seviye 3). Sağ tık dunno.exe'yi açar; Windows 11 tray simgesini saklasa da adım takılmaz |
| settings.exe karmaşası | 6 kategori + sol menü |
| Laf hataları | 105 TR + 79 EN hatalı laf düzeltildi: dilbilgisi, çeviri kokusu, soru tipine uymayan cevap, yanlış oyun detayı |
| Kart kalitesi | 1200x720, ekranda da keskin |
| Kurulum "kaçak" görünümü | kendi NSIS şablonumuz: palet, marka dili, sade akış, turuncu ilerleme, aynı görünümde kaldırıcı. Wine'da sayfa sayfa görüntülendi |
| Performans | pet boştayken ~12 fps; dunno.exe gizliyken saniyede bir uyanır; imleç uzaktayken yoklama 100 ms |
| Mac | SPEC 19'da plan (M1-M8) |

### Hâlâ eksik ya da kafama takılanlar
1. **Gerçek Windows testi yok.** Kurulum Wine'da görüldü, ama Windows 11'in kendi çizimi (düğmeler, DPI, koyu tema) farklı olabilir. `docs/WINDOWS-TOUR.md` bir kez koşulmalı.
2. **İmza yok.** Kurulum artık marka görünümünde, ama SmartScreen uyarısı sadece imzayla gider. En yüksek öncelik bu.
3. **Kurulum düğmeleri Windows'un kendi düğmeleri.** Eklentisiz boyanamıyor. Tam piksel düğme isteniyorsa iki yol var:
   - nsDialogs + bitmap düğme (bakımı zor);
   - kendi küçük Tauri "bootstrap" kurucusu (kurulumu da web arayüzüyle çizmek; en "uygulama gibi" sonuç ama ayrı bir proje).
   Şimdilik değmez bence.
4. **Laf incelemesini yapay zeka ajanları yaptı.** Bariz hatalar gitti. Ama mizahın yerine oturması, oyuncu jargonu ve sokak ağzı için insan editörü şart. Özellikle oyun kategorileri (648 laf).
5. **Ödeme, canlı sırlar, moderasyon arayüzü:** değişmedi (bölüm 3, madde 2-3, 6).
6. **Seviye hızı tahmin.** "seviye 10 = yaklaşık bir hafta" hesapla bulundu. Beta kullanıcılarıyla ölçülmeli. Telemetri opt-in olursa günlük XP dağılımına bakılabilir.
7. **macOS** donanım, Apple hesabı (99 USD/yıl) ve notarization ister. Bu karar sende.
8. **Performans** kodda iyileşti ama ölçülmedi. Hedef: boşta CPU < %1. Turun 6. adımı bunu ölçüyor.

### Artılar (güncel)
- İlk açılış artık yönlendiriyor: kullanıcı 10 dakikada soru sorar, sürükler, giydirir, ağacı görür ve level atlar.
  Retention için en kritik an buydu.
- Seviye ve kilit mantığı görünür ve dürüst: ne zaman açılacağı ve XP'nin nereden geldiği yazıyor. Tıklama spam'iyle level kasılmıyor.
- Kurulumdan kaldırmaya kadar her yüzey aynı marka dilinde.
- Arka planda daha az iş yapıyor (pil dostu).

### Sıradaki önerim
1. Windows turu (`docs/WINDOWS-TOUR.md`). Çıkan hataları bana tek mesajda gönder.
2. Kod imzası başvurusu. Kimlik doğrulaması günler sürebiliyor, erken başla.
3. Ödeme sağlayıcısı seçimi (Türkiye'ye ödeme: Paddle / Lemon Squeezy doğrula). Sonra lisans webhook'unu yazarım.
4. 20-30 kişilik kapalı beta (Discord). İlk 10 dakika akışı ve seviye hızı orada ölçülür.

## 10. Plan devamı (2026-10-10, ikinci tur)
- **Kapandı:**
  - Workshop moderasyon sayfası ve yükleme anahtarı (varsayılan kapalı, davetli mod);
  - haftalık sayaç izni;
  - ödeme → lisans: Lemon Squeezy webhook, sipariş + e-postayla lisans alma, abonelik lisansının kendini yenilemesi;
  - dunno.exe penceresi ilk açılışta oluşturuluyor.
- **Hâlâ senden bekleyenler:**
  - kod imzası;
  - Lemon Squeezy hesabı (Türkiye ödemesini doğrula), ürünler ve sırlar (`LS_WEBHOOK_SECRET`, `LS_PRODUCTS`, `LICENSE_PRIVATE_KEY`, `PRO_PUBKEY`);
  - canlı worker adresi (`VITE_API_BASE` + CSP);
  - Windows turu;
  - laf editörü;
  - Mac: imza + notarization (Apple Developer hesabı) ve gerçek Mac'te manuel tur (manuel 32).
- **Üçüncü tur (FB8):**
  - alarm/hatırlatıcı (ask.exe'den, yerel, hak yemez);
  - Mac: ön uygulama, boşta kalma, toplantı, pil, izinli sekme başlığı; Dock'suz menü çubuğu; CI'da universal .dmg;
  - müziğe tepki (Spotify dahil her oynatıcı, Windows medya kontrolünden; hesap bağlamadan, ad okumadan). Spotify hesabı
    bağlama (OAuth) bilerek yapılmadı: geliştirici kotası (25 kullanıcı, genişletme başvurusu), token saklama ve gizlilik yükü,
    sadece Spotify'ı kapsaması.
