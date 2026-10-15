# SPEC 08: Dunno'nun masaüstü boyutu ayarı

GOAL: Kullanıcı pet'in ekrandaki boyutunu seçebilsin. (Kullanıcı isteği, 2026-10-03 gece.)

## SZ1 Boyut ayarı
- `settings.exe`'ye "boyut" segmented seçici: **minik / küçük / normal / büyük / dev** = 32x32 sprite'ın **1x / 2x / 3x / 4x / 5x** tam sayı ölçeği
  (normal = şu anki 2x olarak kalsın istenirse: minik 1x, küçük 2x (varsayılan), orta 3x, büyük 4x, dev 5x — PM varsayılanı mevcut boyut olacak şekilde etiketler).
  Piksel keskinliği korunur (tam sayı ölçek, smoothing kapalı). DPI ölçeği ayrıca hesaba katılır (Windows %125/%150'de de keskin).
- Değişiklik anında uygulanır, uygulama yeniden başlamaz; pet bulunduğu kenarda kalır (yeni boyuta göre kenara yeniden oturur), ekran dışına taşmaz.
- Bağlı her şey ölçekle güncellenir: pencere boyutu, tıklama (dolu piksel) alanı, aksesuarlar ve anchor'lar, düşünme işareti, kenar yolu, yürüme hızı (görsel hız aynı hissettirsin: px/s ölçekle orantılı),
  UP1 yerleştirme motoru (balonlar pet boyutuna göre konumlanır).
- home'daki önizleme ve tray'den hızlı erişim yok (sadece settings.exe); test modunda (FB2) boyutlar arası hızlı geçiş düğmesi.

## SZ2 Doğrulama
- Saf testler: ölçek -> pencere boyutu, hit-rect, anchor, hız, kenara yeniden oturma.
- Headless görüntü: `size-*.png` her boyutta idle + peek sol/sağ + bir aksesuar + balon.
- desktop vitest, tsc, `tauri build`, clippy temiz; yeni kurulum dosyası ana checkout'ta, raporda tam yol. `REPORT-spec08.md`, manuel test bölümü 15.
