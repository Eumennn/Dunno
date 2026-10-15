# Dunno — Proje Özeti

## Ürün
Dunno, masaüstünde yaşayan, ekranın köşe ve kenarlarında gezinen, neredeyse hiçbir soruya doğru cevap vermeyen (günde 3 doğru ama kinayeli cevap hariç, SPEC 06), tamamen eğlence amaçlı piksel art bir AI pet. Clicky'nin (heyclicky.com, imleç yanında yaşayan AI öğretmen) bilerek tersi.
Tagline: "The AI that teaches you nothing."
Karakter: Tükenmiş, emekli bir verimlilik asistanı. Tembel, alaycı, umursamaz ama kırıcı değil; gizliden şefkatli (gece 3'te "uyu artık" der).

## Temel özellikler (MVP)
- Şeffaf, her zaman üstte, tıklamayı arkaya geçiren pencere; pet ekran köşe/kenarlarında yürür, imleçten kaçar, sürüklenebilir
- Pet'e tıklayınca soru kutusu açılır; günlük soru limiti 3 (dolunca `sulk` animasyonu, sırtını döner)
- Cevaplar: çoğu hazır laf havuzundan, her 3-4 sorudan biri LLM'den (soruya özel saçmalık, asla doğru bilgi değil)
- Kendi kendine rastgele laf atma: tamamen havuzdan, sıfır API maliyeti
- Bağlam algılama (cihazda, veri dışarı gitmez): öndeki uygulama (Excel, VS Code, Figma, Spotify, tarayıcı, Zoom/Teams/Meet vb.), saat, boşta kalma süresi (10/30/60 dk), pil, tıklama sayısı. Ekran görüntüsü YOK, klavye takibi YOK
- Ağız modu (ilk açılışta seçilir): "terbiyeli" / "sokak ağzı" (sansürlü ***, opsiyonel bip sesi). Sansürsüz mod yok
- Toplantı koruması (zorunlu): Zoom/Teams/Meet öne gelince veya ekran paylaşımı başlayınca otomatik terbiyeli mod veya saklanma + `shh` animasyonu
- Menü çubuğu/tepsi menüsü: mod değiştir, "bugün sus" (ertesi güne kadar uyur), konuşma sıklığı, çıkış
- Sadece yazı balonu; ses (TTS/STT) yok
- Diller: TR + EN

## Teknik yapı
- Masaüstü: Tauri (Mac + Windows)
- LLM: Kimi K2.6 (OpenRouter veya Moonshot API). Thinking kapalı, max_tokens ~60, system prompt cache'li
- LLM küfür kontrolü: model küfür yerine `[K]` yazar, uygulama moda göre `***` veya boş ile değiştirir
- Proxy: Cloudflare Workers (API anahtarı saklama, cihaz başı rate limit, harcama tavanı + alarm)
- Günlük merkezi laf üretimi: Worker'da zamanlanmış görev günde 1 kez ~200 taze laf üretir, tüm kullanıcılar çeker
- Animasyon oynatıcı: Aseprite'tan dışa aktarılan sprite sheet + JSON (etiketler = durumlar). Nearest-neighbor ölçekleme (yumuşatma kapalı), 48x48 sprite ekranda 2-3x. Sola dönüş kodda yatay ayna

## Laf havuzu formatı
```json
{
  "id": "excel_003",
  "trigger": "app:excel",
  "intent": "Kullanıcının Excel dosyasını küçümser",
  "tr": "Normalde böyle dosya mı yapılır ya{K:, senin yapacağın dosyanın ***}",
  "en": "Is this how people make spreadsheets now{K:, what the ***}"
}
```
- `{K: ...}` kısmı yalnızca sokak modunda gösterilir
- Kategoriler: app:*, time:*, idle:*, battery:low, interaction:* (click, spam_click, drag, limit_reached), answer:*, random
- Dosyalar: pool_tr.json, pool_en.json (diller birebir eşleşmek zorunda değil)

## Animasyon durumları (sözleşme)
Gardırop (SPEC 05/09): renk temaları, aksesuarlar (slotlar: head, eyes, neck, body, side; slot başına bir, en fazla 3 parça) ve kostümler
(tüm gövde: rol renkleri + noktalara oturan parçalar; `hidesTuft`, `blocks` ile kapattığı slotlar). Bağlantı noktaları: head, antenna, eyes, ears, neck.
Hepsi tembel başarımlarla açılır, test modunda hepsi açık. Biçim: `content/wardrobe/accessories/README.md`.

MVP: idle (4), shrug (4, imza hareket), walk (6), talk (2-3), sleep (4), run_away (4), sulk (2), peek (4), shh (3), dragged (2), fart (6, tek seferlik, SPEC 09 K3: çömelme + arkadan piksel bulut + utangaç yüz; ayna uyumlu); SPEC 17 eğlenceli animasyonlar (tek seferlik, sesli): wave (4, selam), jump (4, pencere havalanır), dance (8, dans perk'i), yawn (5, uyku öncesi / gece), sneeze (6, nadiren)
Sonra: surprised, fall/land, yawn, sit_on_button
Önden: idle, talk, shrug, shh. 3/4 sağa: walk, run_away.

## Varlıklar (assets/)
dunno_sheet.png + dunno_sheet.json, palette.gpl, logo_main.svg, logo_icon_1024.png, logo_icon_256.png, logo_menubar_16.png, logo_menubar_22.png, ui_bubble.png (9-slice), ui_hearts.png, pool_tr.json, pool_en.json
Adlandırma: küçük harf, alt çizgi, boyut sonda.
Asset'ler gelene kadar renkli kutularla placeholder kullanılır.

## Marka
Palet: #2B1E2F kontur/metin, #F2A65A ana, #D9774A gölge, #FFD29A ışık, #FFF1D6 krem, #E86A7A yanak, #6EC5E9 vurgu, #FFFFFF balon
Font: Silkscreen (piksel, başlıklar), Inter (gövde). Balon fontu Türkçe karakterleri desteklemeli.
Ses: kısa (≤60 karakter), ünlemsiz, emojisiz, küçük harf.
Günlük 3 honest cevap (SPEC 06, kullanıcı kararı 2026-10-03): kısa ve doğru bilgi + kinayeli kuyruk ("paris. bunu bilmeyen ben miyim sen mi"), ≤ ~120 karakter;
emin olunmayan şeyde uydurma yok ("bilmiyorum, ben de şaşırdım"); yasak konu ve gerçek kişi -> kaçamak, hak düşmez.
Kalan sorular: soru tipine uygun, işe yaramaz havuz cevabı (`answer:<qtype>`). Hiçbir cevap anında gelmez (sahte düşünme). Tagline ve landing aynı kalır.
Yasaklı konular: din, ırk, cinsiyet/yönelim, beden, siyaset, gerçek kişiler, sağlık, intihar/kendine zarar.

## Landing page yönü
"Dunno OS": 90'lar sonu tarzında yorgun, yarı çökmüş bir masaüstü (Clicky'nin cilalı Mac sitesinin tersi). Pencereler bizim paletle. İndirme penceresi [Evet] [Bilmiyorum]. Gerçek OS logoları/marka öğeleri yok, uydurma kullanıcı yorumu yok.

## Maliyet hedefi
1.000 kullanıcıya kadar ~$10-40/ay LLM. Apple Developer $99/yıl (ilk betada atlanabilir, imzasız dağıtım). Cloudflare Workers ücretsiz katman.

## Ekip
- Tasarımcı: avatar, animasyonlar (Aseprite), logo, UI parçaları, laf havuzu, pazarlama görselleri
- Geliştirici (ajan ekibi): Tauri uygulaması, animasyon oynatıcı, tetikleyiciler, mod sistemi, proxy, LLM, build/dağıtım

## Roadmap (~8-10 hafta)
0. Hazırlık: isim/domain, karakter, sözleşmeler
1. Tarayıcı vibe prototipi (köşe gezinme + havuzdan cevap)
2. Masaüstü MVP: şeffaf pencere, animasyonlar, soru kutusu, limit, mod seçimi, uygulama algılama, toplantı koruması
3. LLM: proxy, Kimi, [K] yer tutucu, rate limit, günlük laf üretimi, harcama alarmı
4. Kapalı beta (30-50 kişi)
5. Lansman: imzalama, Windows build, landing page, Product Hunt/X
6. Sonrası: yeni skinler, gün temaları, pet'ler arası etkileşim

## Riskler
- Şeffaf, tıklama geçiren pencere Mac/Windows'ta farklı davranır, ilk çözülecek iş
- Can sıkıcılık: sıklık ayarı ve "bugün sus" şart
- Toplantı koruması çalışmazsa ciddi itibar riski
- "Dunno" adı Rus çocuk edebiyatındaki Neznayka karakterinin İngilizce adı; marka araması yapılmalı
