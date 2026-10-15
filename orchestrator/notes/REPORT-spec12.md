# SPEC 12 raporu: yaratıklar + güvenli veri modları

> 2026-10-07. Manuel kontrol: `desktop-manual-test.md` bölüm 21. Spec: `specs/12-creatures-modding.md`. Mod rehberi: `docs/MODDING.md`.

## A. Yaratıklar (220f8e9)
- 12 yeni kostüm (hamamböceği, kedi, köpek, slime, mantar, robot, uzaylı, balık, ördek, iskelet, vampir, mini canavar), toplam 20.
  Aynı kostüm sistemi (palet + şerit + parça, hidesTuft, blocks), placeholder çizim. Her biri bir tembel başarımla açılır, test modunda hepsi açık.
- K9 başarım metinleri dolaba bağlandı (eskiden id görünüyordu).

## B. Veri modları
- **Rust (`src-tauri/src/mods.rs`)**: `%APPDATA%\app.dunno.desktop\mods\` altını ham okur. Sembolik bağlantı izlenmez (işaretlenir, TS reddeder),
  derinlik ≤ 4, dosya ≤ 64, dosya ≤ 256 KB, en fazla 32 mod; içerik sadece json/md/txt (metin) ve png (base64) için okunur. Komutlar:
  `list_mods`, `mods_dir`, `open_mods_dir` (sadece bu klasör), `restart_app`.
- **Doğrulama (`src/mods/mods.ts`, saf)**: uzantı izin listesi (kod dosyası = ret), güvenli yol, boyut, manifest alan izin listesi, permissions,
  link/kod belirtisi taraması, içerik id öneki + çakışma, tema/aksesuar/kostüm yerleşik doğrulayıcılarla, laflar `pool:check` kurallarıyla,
  ses profili sınırları, balon kontrastı ≥ 4.5, davranış 0.5-2. Tek hata = mod yüklenmez (yarım yükleme yok).
- **Uygulama (`src/mods/load.ts`)**: pet penceresi açılışta okur, doğrular, sadece ayarda açık modları uygular: dolap kaydı (kilitsiz),
  renderer (data: URL görüntüler, ağ yok), tema listesi, laf havuzuna ek, ses profilleri, balon renkleri (`--bubble-fill/--bubble-ink`),
  konuşma sıklığı ve dinlenme çarpanı. Ayar `mods` varsayılan `{}` = **hepsi kapalı**.
- **settings.exe > modlar**: mod başına aç/kapa, geçersiz modda sebep, "klasörü aç", değişiklik varsa "yeniden başlat".
  wardrobe.exe mod parçalarını adı ve simgesiyle gösterir.
- Örnek mod: `content/mods/example_pastel` (tema, kurdele, 2+2 laf, ses, balon, davranış), üretici `desktop/scripts/gen-example-mod.mjs`.

## Doğrulama
- desktop 1296 test (mods 13: örnek geçer, kötü örnekler reddedilir, birleştirme, ayar -> yükleme -> dolap -> settings.exe -> ipc),
  settings (mods varsayılan/onarım), Rust cargo test 69 (mods 4: okuma, sınırlar, sembolik bağlantı, klasör dışı), tsc + typecheck:node,
  vite build, pool:check, Windows clippy temiz.
- Görüntüler: `ui-shots/spec12-mods-settings.png`, `ui-shots/spec12-mods-wardrobe.png` (geliştirme önizlemesi `app.html?mods=example`:
  pastel gök teması + pastel kurdele giyili).
- Yapılamayan: gerçek Windows'ta klasör aç / yeniden başlat / mod yükleme (manuel 21).

## Gizlilik / güvenlik
Mod kod çalıştıramaz, ağ/dosya/kullanıcı verisine erişemez; soru metni, pencere başlığı, istatistik moda verilmez (mod sadece veri, uygulama okur).
Plan v2 modlama kuralları değiştirilmedi.

## Tasarımcı onayı bekleyenler
12 yaratık çizimi, örnek mod renkleri, settings metinleri ("modlar", açıklama, düğmeler).
