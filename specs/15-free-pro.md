# SPEC 15: Free / Başarım / Pro

KAYNAK: Plan v2 SPEC15 + ilkeler (Pro karakteri kilitlemez, sınırsız seçim iyi UX değildir). ÖN KOŞUL: SPEC 14 bitti.

| | Free | Başarım (herkes) | Pro |
|---|---|---|---|
| Karakter | tam Dunno, tüm animasyonlar, ses, sorular, gizli dünyalar | 20 kostüm, 16 tema, 20 aksesuar (54 başarım) | kostüm/tema/aksesuar **satılmaz** |
| Laflar | temel havuz (uygulama başına 10, tüm cevap/etkileşim havuzları) | | derin uygulama havuzları (20) + nadir laflar |
| Görünüm | 3 aksesuar yeri | balon stilleri (4), ses tonları (3), canavar modu anahtarı (ilerlemeyle) | 5 aksesuar yeri (tüm slotlar) |
| Davranış | dengeli | | kişilik: sakin / geveze / kaotik |
| Modlar | tema, aksesuar, laf, balon; en fazla 3 mod | | + kostüm, ses, davranış; 32 mod |
| Kişisel Dunno | yok | | SPEC 16 (ayrıca açık rıza) |

Seçim yorgunluğuna karşı: wardrobe.exe "başla" sekmesi (6 hazır görünüm, bitmeye en yakın 2 başarım, ilerleme), kostümler paket başlıklı
(böcekler / hayvanlar / gece / tuhaflar), balon/ses stillerinde sadece açılanlar görünür + sıradaki ödül, tüm ızgaralar "gelişmiş" yerinde (kategoriler).

Lisans: çevrimdışı Ed25519 (`license.rs`), açık anahtar derlemede (`DUNNO_LICENSE_PUBKEY`), özel anahtar repoda yok. Anahtar sadece Rust komutuna gider
(olayla, store'la, ağla taşınmaz). Satış/ödeme akışı bu repoda değil (dunno-web). Test modunda "pro simülasyonu".

## Kabul
entitlements/presets/voice-styles testleri, Free mod katmanı, talker Pro süzgeci, pool:check (Free en az 10, pro sadece derin), Rust lisans testleri
(geçerli, sahte, başka anahtar, bozuk içerik, Node'la üretilen anahtar), REPORT-spec15.md, manuel test bölümü 24.
