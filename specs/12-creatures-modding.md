# SPEC 12: Yaratıklar + güvenli modlama

KAYNAK: Plan v2 SPEC12. ÖN KOŞUL: SPEC 11 bitti.

## A. Yaratıklar
Mevcut 8 kostüme (böcek, sinek, arı, hayalet, dinozor, kurbağa, astronot, pizza) ek 12 yaratık: hamamböceği, kedi, köpek, slime, mantar,
robot, uzaylı, balık, ördek, iskelet, vampir, mini canavar (toplam 20). Aynı kostüm sistemi (palet + şerit + parça, hidesTuft, blocks).
Placeholder çizim, tasarımcı onayı bekler. Her biri bir tembel başarımla açılır (test modunda hepsi açık).

## B. Veriyle modlama (kod yok)
Mod = klasör: `manifest.json` + varlıklar. Desteklenen türler (izin listesi): themes, accessories, costumes, reactions (laf), sounds (ses profili),
bubbles (balon renk tokenları), behavior (davranış profili: konuşma sıklığı çarpanı, dinlenme/yürüme çarpanı, sınırlı aralıkta).
- `manifest.json`: id, name {tr,en}, version, author, `permissions`: kullanacağı türler (beyan edilmeyen tür yüklenmez), `contents`.
- **Kod yok:** .js/.html/.exe/.dll/.ps1/... dosyası olan mod reddedilir; manifest'te script/url/hook alanı yok; dosya yolu klasör dışına çıkamaz
  (`..`, mutlak yol, sürücü harfi), sembolik bağlantı izlenmez; dosya sayısı ve boyut sınırı; PNG sadece 32x32 (parçalar) / sınırlı boyut.
- **Ağ/dosya/kullanıcı verisi erişimi yok:** modlar sadece veri; uygulama okur, doğrular, birleştirir. Mod soru metni, başlık, istatistik göremez.
- Laflar marka kurallarından geçer (≤60 karakter, yasak konular, küfür sadece `***`, trigger izin listesi).
- Modlar varsayılan **kapalı**; settings.exe > modlar: tek tek aç/kapat, hata nedenleri görünür.
- Mod klasörü: `%APPDATA%\app.dunno.desktop\mods\<id>\`. Gelecek: topluluk mod galerisi (dunno-web).

## Kabul
Yaratık testleri (kostüm sınırları, üretici, başarım), mod doğrulayıcı testleri (kötü mod örnekleri reddedilir), Rust güvenli okuyucu testleri,
birleştirme testleri, örnek mod (`content/mods/example_pastel`), `docs/MODDING.md`, `REPORT-spec12.md`, manuel test bölümü 21.
