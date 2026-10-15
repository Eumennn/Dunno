# SPEC 15 raporu: Free / Başarım / Pro

> 2026-10-07. Manuel kontrol: `desktop-manual-test.md` bölüm 24. Spec ve tablo: `specs/15-free-pro.md`. Yayın: `docs/RELEASE.md` "Pro lisansı".

## Ne yapıldı
- **Katman** (`src/pro/entitlements.ts`, saf): Free / Pro kuralları. Hiçbir kostüm/tema/aksesuar satılmaz; Free tam Dunno. Pro: derin havuzlar
  (SPEC 13'ün 11-20. lafları + nadir laflar `pro: true`, 312 laf), 5 aksesuar yeri, kişilik (sakin/geveze/kaotik), gelişmiş modlar
  (kostüm/ses/davranış, 32 mod). Free'de mod bütünüyle kapanmaz, Pro türleri atlanır ve settings.exe'de not edilir.
- **Başarım ilerlemesi** (herkes): 3/6/10/15/20/25/32/40 başarımda balon stilleri (nane, gece, pamuk, mürekkep), ses tonları (minik, robot, kalın),
  canavar modu anahtarı. Sadece açılanlar görünür, sıradaki ödül yazılır.
- **Seçim yorgunluğu**: wardrobe.exe "başla" sekmesi (varsayılan): 6 hazır görünüm (tek tık, kilitliyse "x/y parça açık"), bitmeye en yakın 2 başarım,
  ilerleme; kostümler paket başlıklı.
- **Lisans** (`src-tauri/src/license.rs`): `DUNNO1.<json>.<imza>` Ed25519, çevrimdışı, açık anahtar derlemede (yoksa sistem kapalı), lisans dosyası
  app data'da, her açılışta yeniden doğrulanır. `scripts/license.mjs` keygen/issue (özel anahtar sadece ortam değişkeninden). Anahtar dunno.exe'den
  doğrudan Rust komutuna gider; pencereler arası olaya, store'a, ağa girmez. Lisansta kişisel veri yok.
- settings.exe: "pro" bölümü (durum, ne içerir, anahtar alanı ya da "satışta değil", kişilik), görünümde balon/ses stili, modlarda Free notu;
  test modunda "pro simülasyonu".

## Doğrulama
- desktop 1344 test (entitlements 11, mods katman 2, talker Pro süzgeci 1, ipc/pool yeni durumlar), pool:check (Free en az 10 / derin trigger, pro sadece
  derin), tsc + typecheck:node, vite build, studio 42, worker 143, cargo test 73 (lisans 4: geçerli, sahte/başka anahtar/bozuk, Node'la üretilen anahtar,
  anahtar yokken kapalı), Windows clippy temiz.
- Görüntüler: `ui-shots/spec15-start.png`, `spec15-packs.png`, `spec15-pro.png`.
- Yapılamayan: Windows'ta gerçek lisansla etkinleştirme (manuel 24; açık anahtarı build'e senin vermen gerekiyor).

## Kullanıcı kararı bekleyenler
Fiyat / satış kanalı (dunno-web), Pro kapsamı (özellikle derin havuzların Pro olması), ilerleme eşikleri, hazır görünümler ve paket adları (tasarımcı).
