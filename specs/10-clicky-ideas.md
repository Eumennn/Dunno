# SPEC 10: Clicky açık kaynak kodundan alınan fikirler

KAYNAK: https://github.com/farzaa/clicky (MIT, macOS/Swift). Kod doğrudan taşınmaz (bizimki Tauri + TS + Rust, Windows); **fikirler** uyarlanır.
Lisans: MIT; birebir kod parçası alınırsa `THIRD_PARTY_NOTICES.md`'ye telif satırı eklenir. Clicky adı/logosu/görseli kullanılmaz.
ÖN KOŞUL: SPEC 09 bitmiş.

## Bilerek ALINMAYANLAR (Dunno'nun vaadine aykırı)
Ekran görüntüsü / ekran okuma (ScreenCaptureKit), mikrofon / sesli konuşma (STT/TTS), global klavye kısayolu dinleme (CGEvent tap), imleç peşinde gezen tam ekran katman.

## CL1 İmzalı otomatik güncelleme (Clicky: Sparkle + appcast.xml)
- Tauri updater plugin (`tauri-plugin-updater`) + imzalı `latest.json` (GitHub Releases'te). Anahtar çifti kullanıcının makinesinde üretilir, **özel anahtar repo'ya girmez** (`.gitignore`, rehber).
- Güncelleme sessiz kontrol (günde 1), bulunca landing toast diliyle "yeni sürüm. kurmak zorunda değilsin. ama kur" + `about.txt`'te "güncellemeleri kontrol et".
- Worker `/v1/release` ile tutarlı (aynı sürüm kaynağı, `check:release` genişler). Gerçek yayın yok: yerel sahte `latest.json` ile uçtan uca test.

## CL2 Yay (bezier) uçuşu ve yaylanma (Clicky: OverlayWindow bezier arc + spring)
- "dunno'yu çağır", "kenara gönder" ve sürükle-bırak sonrası kenara oturma: ışınlanma/düz çizgi yerine **ikinci dereceden bezier yay** + smoothstep (3t²−2t³) zamanlaması, yaklaşık 600–900 ms;
  uçarken `dragged` pozu, inişte 1–2 karelik "yaylanma" (sprite tam sayı piksel ofsetleri, ölçek değil).
- Saf fonksiyonlar (yay noktaları, süre, iniş) + testler; çalışma alanı dışına taşmama (UP1 ile).

## CL3 Daktilo balon metni (Clicky: karakter karakter balon)
- Konuşma/cevap balonu metni harf harf akar (yaklaşık 25–40 ms/karakter, noktalama sonrası kısa duraklama), sahte düşünmeden (Q5) sonra.
- Tıklayınca metin anında tamamlanır. `readingMs` (FB5) akış bittikten sonra başlar. Erişilebilirlik: `aria-live` tam metni bir kez okur.

## CL4 İlk açılış karşılama animasyonu (Clicky: welcome animation)
- setup.exe'den sonra Dunno ekranın ortasında belirir (peek pozuyla kenardan bakıp gelir), kısa karşılama lafı, sonra CL2 yayıyla seçtiği köşeye uçar ve uyur.
- Sadece ilk açılışta; about.txt'ten "karşılamayı tekrar oynat".

## CL5 Çoklu monitör
- Clicky'deki gibi ekran koordinat eşlemesi: pet sürüklenerek başka monitöre taşınabilir, o monitörün çalışma alanında yaşar; monitör çıkarılırsa birincil ekrana döner. Kenar yolu ve UP1 monitör başına.
- Saf testler: farklı DPI'lı iki monitör, negatif koordinatlı sol monitör, monitör kaldırma.

## CL6 Gizlilik dostu, isteğe bağlı kullanım istatistiği (Clicky: PostHog sarmalayıcı)
- Tek dosyalık olay sarmalayıcı (`telemetry.ts`), **varsayılan KAPALI**, settings.exe'de açık rıza; açıkken sadece sayısal/anonim olaylar (app_opened, question_asked{source}, achievement_unlocked{id}), soru metni / pencere başlığı / kişisel veri ASLA.
- Hedef: kendi Worker'ımızdaki `/v1/event` (KV sayaç, çerezsiz), üçüncü taraf SDK yok. Kapalıyken ağ çağrısı sıfır (testli).

## Kabul
- CL1–CL6 main'de, `stable-CL*` tag'li; desktop + worker testleri, tsc, `tauri build`, clippy temiz; yeni kurulum dosyası ana checkout'ta.
- `REPORT-spec10.md` + manuel test bölümü 17 (güncelleme akışı, yay uçuşu, daktilo, karşılama, iki monitör).
