# SPEC 07: Kullanıcı geri bildirimi, 2. tur (2026-10-03 akşam)

GOAL: Kurulu 0.1.0 (18:14 build) üzerinde kullanıcının gördüğü sorunları kapatmak ve wardrobe'u test edebilmesini sağlamak.

> "kenarda durunca böyle bozulma var berede; diğer aksesuarları ve temaları bana erişime aç şuanlık görebilmem için; exe'nin içeriği genişletilebilir;
> toplantıdayım deyince yok oluyor sonra da geri gelmesi bir tık geç oluyor; thinking yapıyormuş gibi görünme olayını ekledin mi;
> konuşma balonları biraz daha uzun ekranda kalabilir, çok hızlı gidiyor"

## Teslimatlar

### FB1 Aksesuarlar kenar pozlarında (peek) bozuk — HIGH
Ekran görüntüsü (kullanıcı, `orchestrator/notes/ui-shots/user/fb1-beret-peek.png`): peek pozunda bere kafanın üstünde havada, sağa taşmış, duvar çizgisinin ötesine geçiyor; tüy beresiz kısımdan çıkıyor.
- peek (sol/sağ, aynalı), sleep, sulk, run_away, dragged dahil **her poz x her aksesuar** için anchor ve kırpma kontrolü.
- peek'te aksesuar duvar çizgisinin (ekran kenarı) ötesine taşmaz: duvar tarafı kırpılır ya da poza özel küçük varyant kullanılır.
- Aynalamada anchor da aynalanır (UP7 facingForEdge ile tutarlı).
- Görsel test: `wardrobe-edge-*.png` = 6 aksesuar x 5 tema(1 yeter) x {peek sol, peek sağ, sleep, walk sol/sağ}, headless. Ayrıca otomatik test: aksesuar pikselleri pet tuvali ve kenar tarafı sınırı dışına çıkmaz.

### FB2 Test için hepsini aç
- `settings.exe` altında gizli **"test modu"**: `about.txt`'te sürüm satırına 5 kez tıklayınca açılır (toast: "test modu. kimseye söyleme").
  Test modunda: tüm temalar ve aksesuarlar açık (başarım ilerlemesi silinmez, sadece kilit yok sayılır), başarımları tek tek tetikleme düğmeleri,
  günlük soru hakkını sıfırla, soru temposunu (cooldown) kapat, "toplantı başlat/bitir", "kenara gönder: sol/sağ/üst/alt/köşeler" (kenar pozlarını görmek için).
- Kapatınca normale döner. Bu bir geliştirici aracı; metinleri yine marka sesinde.

### FB3 dunno.exe içeriği genişlesin
- Pencere büyütülünce (ve maximize) içerik ızgarası genişler: home'da büyük Dunno alanı ve kartlar ölçeklenir (Dunno tam sayı ölçekte, 2x/3x/4x), wardrobe ızgarası daha çok sütun, stats/about okunaklı genişlikte ortalı.
- Maximize düğmesi (landing `.ctl` stilinde) eklenir; varsayılan boyut biraz daha büyük (ör. 900x620), minimum korunur. Boyut ve konum hatırlanır.

### FB4 "toplantıdayım" kapanınca hemen geri gel
- Elle anahtarda (tray veya home) kapatınca pet ≤ 300 ms içinde geri görünür (izleyici POLL'ünü beklemeden, doğrudan olay).
- Açarken: anında kaybolmak yerine kısa `shh` (≈1 sn) + sonra saklan; home'daki önizleme "toplantıda, saklanıyor" der.
- Otomatik algılamada (Zoom/Teams kapandı) geri dönüş ≤ 1.5 sn; ölçüm testi saat enjekte ederek.

### FB5 Konuşma balonları daha uzun kalsın
- `readingMs`: 4–12 sn (≈ 2 sn + karakter başına 110 ms), honest (uzun) cevaplarda üst sınır 14 sn.
- İmleç balonun üstündeyken balon kapanmaz (hover pause), ayrılınca 2 sn sonra kapanır. Balona tıklamak kapatır.
- Settings'e "balon süresi: kısa / normal / uzun" (0.75x / 1x / 1.5x).

### FB6 Sahte düşünme görünürlüğü
SPEC 06 Q5 18:14 build'inde var (1.2–3.5 sn, bazen 4–7 sn, %10 uyuyakalma, kesik çizgili "dunno düşünüyor" balonu). Kullanıcı fark etmediyse daha belirgin yap:
- Düşünürken pet'te görsel işaret: başının üstünde küçük piksel "…" ya da dönen kum saati (landing kum saati), tüy sallanması.
- Düşünme metni balonda en az bir kez değişsin (uzun düşünmede 2–3 kez).
- Manuel test listesine "ilk soruda düşünme görünüyor mu" maddesi.

## Kabul kriterleri
- FB1 görüntülerinde hiçbir aksesuar kenar/poz bozulması yok; otomatik sınır testi geçiyor.
- Test modu ile tüm tema/aksesuarlar ve kenar pozları kullanıcı tarafından görülebiliyor.
- desktop testleri, tsc, `tauri build`, clippy temiz; **yeni kurulum dosyası `desktop/src-tauri/target/release/bundle/nsis/` (ana checkout) ve raporda tam yol**.
- `REPORT-spec07.md` + manuel test bölümü 14.
