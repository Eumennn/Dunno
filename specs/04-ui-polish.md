# SPEC 04: Arayüz cilası (kullanıcı geri bildirimi, 2026-10-02 akşam)

GOAL: Kullanıcının kurulu 0.1.0'da gördüğü taşma ve kalite sorunlarını kapatmak. `.exe` pencere dili korunur (kullanıcı beğendi).
KAYNAKLAR: `docs/agents/ui.md` (landing ile uyum), `docs/agents/desktop.md`, kullanıcının sözleri aşağıda.

> "kenarlarda dururken üstüne bastığımızda çıkan kutucuk ekrandan taşıyor ... belki konuşma balonu olarak yapabilirsin. exe işini beğendim ...
> homedaki o bugün sus, toplantıdayım ve kalan detayları iyileştir, error exe boxı ekrandan taşıyor"

## Teslimatlar
- **UP1 Konumlandırma motoru (tek kaynak):** Pet'in yanında açılan her yüzey (ask.exe, error.exe, konuşma balonu, toast) için ortak
  `placePopover(petBox, popoverSize, workArea)`:
  pet hangi kenar/köşedeyse yüzey ekranın **içine** doğru açılır (sağ kenarda sola, alt kenarda yukarı, köşede çapraz); çalışma alanına (görev çubuğu hariç)
  her zaman tamamen sığar, 8px iç boşluk. Gerekirse pencere boyutu geçici büyür/konum kayar, pet görsel olarak yerinde kalır.
  Saf fonksiyon + tablo testleri: 4 kenar, 4 köşe, %100/%125/%150 ölçek, çoklu monitör ofseti, çok uzun metin.
- **UP2 ask.exe = konuşma balonu biçiminde:** Pencere görünümü (başlık çubuğu, kalpler, mod seçici) kalır ama pet'e bakan **piksel kuyruklu balon**
  gibi bağlanır; kuyruk UP1'in seçtiği yöne döner. Kompakt: varsayılan genişlik ≤ 280px mantıksal.
- **UP3 error.exe:** Aynı motorla yerleşir, asla taşmaz; kuyruklu balon varyantı. "tamam" ile kapanır, 6 sn sonra kendiliğinden kapanır.
- **UP4 home sekmesi cilası:** `bugün sus` ve `toplantıdayım` için açık/kapalı segmentleri yerine landing'deki gibi tek **piksel anahtar** (toggle) +
  altında küçük açıklama satırı (ne yapar, ne zamana kadar: "yarın sabaha kadar uyur", "toplantı bitene kadar saklanır").
  Durum değişince pet mini önizlemesi o duruma geçer (sleep / shh). today.txt kartında: kalan hak kalpleri, sıfırlanma saati ("yarın 00:00'da yenilenir"),
  bugün atılan laf sayısı. "dunno'yu çağır" butonunun yanında "kenara gönder". Boşlukları/hizaları landing kart ritmine getir; boş alan kalmasın.
- **UP5 Diğer detaylar:** settings.exe ve stats.txt'de aynı anahtar bileşeni; uzun Türkçe metinlerde satır kırılması; pencere minimum boyutu;
  klavye ile gezinme ve focus görünürlüğü; pencere yeniden açılınca son sekme hatırlanır.
- **UP6 Görsel doğrulama:** her yüzeyin 4 kenar + 4 köşe konumunda headless ekran görüntüsü (`orchestrator/notes/ui-shots/up-*.png`), taşma yok.
  Gerçek girdi yok (CLAUDE.md test güvenliği). Manuel test listesine yeni bölüm.

## Kabul kriterleri
- UP1 testleri geçiyor; hiçbir konumda yüzey çalışma alanından taşmıyor (ekran görüntüleri).
- `npm run tauri build`, vitest, clippy temiz; yeni kurulum dosyası.
- Kullanıcı manuel kontrolü listede.

## Kapsam dışı
Yeni özellik, deploy, macOS.

## Ek (kullanıcı bildirdi): UP7 Kenara göre yön
Sorun: `pet/controller.ts` kenarda (alt kenar dışı) `peek` durumuna geçiyor ama yön (facing) son yürüme yönünden geliyor; peek sprite'ında duvar hep sağda.
Sol kenarda duvar ters tarafta kalıyor, "bozuk" görünüyor.
- Her durum için kenara göre yön tablosu (`facingForEdge(state, edge, lastFacing)`), saf fonksiyon + tablo testi: sol kenar -> duvar solda (ayna), sağ kenar -> duvar sağda,
  üst kenar -> peek yerine idle/sleep (ya da yukarıdan sarkma pozu gelene kadar peek kullanılmaz), alt kenar -> yürüme yönü.
- Tek yönlü çizilmiş diğer pozlar da kontrol edilir: walk, run_away (hareket yönüne bakar), sleep (kenara sırtını verir), dragged/shrug/talk/shh (simetrik, ayna gerekmez).
- UP6 ekran görüntülerine her durumun sol ve sağ kenar hali eklenir.
