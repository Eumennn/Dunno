# SPEC 18: Topluluk (Faz 2), Creator Platform (Faz 3), Gelir (Faz 4)

Kaynak: ürün stratejisi §10-16, §19. Kullanıcı isteği (2026-10-09): "Faz 2 Workshop, Faz 3 Creator Studio + AI world generator,
Faz 4 ödeme (Deep Memory, Custom Personality, Premium Worlds, Cosmetic Packs). Mevcut mod formatı (SPEC 12) Faz 3'ün temelidir."

## Yapılanlar
- **Workshop (worker `/v1/workshop*`)**: onaylı paket listesi (popüler/yeni, tür süzgeci), paket indirme (sayaç), cihaz başı tek beğeni,
  yaratıcı profili (takma ad), yükleme -> **moderasyon kuyruğu** (yönetici onaylamadan listede yok), yönetici onay/red (Bearer token).
  Paket = SPEC 12 veri modu. Sunucu yapısal denetler (yol, uzantı, boyut, PNG imzası, manifest, yasak konu/küfür, sadece JSON
  değerleri); masaüstü kurmadan önce tam mod doğrulaması yapar; Rust yazarken yeniden denetler ve atomik yazar.
- **workshop.exe sekmesi**: keşfet / paketler / yarat / paylaş.
- **Creator Studio (Free)**: onaylı paletlerden tema, tetikleyicili laf paketi -> kurulur, sonra paylaşılabilir.
- **AI World Generator (Pro)**: `/v1/create/world`; fikir -> LLM JSON -> sunucu doğrular ve paketi kendisi kurar (palet onaylı, laflar
  marka dilinde). Pro lisansı sunucuda Ed25519 ile doğrulanır. Günde 3, harcama tavanına bağlı.
- **Gelir**: Pro (Deep Memory = tam anı zaman çizelgesi, Custom Personality, evrim yolu seçimi, AI dünya, Premium Worlds: space, office);
  tek seferlik **kozmetik paketler** (halloween, cyberpunk) lisansta `packs` olarak; abonelikten bağımsız.

## Canlıya çıkış için gerekenler (kodla çözülmez)
- `WORKSHOP_ADMIN_TOKEN` (worker secret, ≥ 24 karakter) ve `PRO_PUBKEY` (= masaüstü `DUNNO_LICENSE_PUBKEY`).
- CSP `connect-src`'ye canlı API alan adı (tauri.conf.json).
- Ödeme sağlayıcısı (Lemon Squeezy / Paddle / Gumroad): satın alma sonrası `license.mjs issue` ile lisans üretip e-postayla gönderen
  küçük bir webhook (sunucu tarafı, özel anahtar sadece orada).
- Moderasyon için basit bir yönetici akışı (şimdilik `GET /v1/workshop/pending` + `POST /v1/workshop/moderate` curl ile).

## Yapılmayanlar (strateji §20: erken aşamada girilmemeli)
Gelir paylaşımı, yorumlar, takip, sosyal akış, büyük mağaza, sınırsız AI üretim.
