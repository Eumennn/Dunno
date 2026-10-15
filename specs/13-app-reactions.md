# SPEC 13: Uygulamaya özel tepki derinliği

KAYNAK: Plan v2 SPEC13. ÖN KOŞUL: SPEC 12 bitti.

## Kapsam
- Derin havuzlar (dil başına 20, önceki 10): excel, tarayıcı, discord, spotify, vs code, figma, terminal, word, powerpoint, photoshop,
  video siteleri (youtube vb., `site:video`), kod siteleri (github vb., `site:code`).
- Yeni uygulama etiketleri (Rust exe tablosu, cihazda): `steam` (steam, steamwebhelper), `blender`, `ide` (visual studio, jetbrains, android studio,
  eclipse, sublime, notepad++), `study` (anki, obsidian, onenote, zotero, acrobat/reader, sumatra), `game` artık başlatıcılarla
  (epic, battle.net, riot, roblox, minecraft launcher). Her biri dil başına 20 laf.
- Nadir laflar: `rare: true` (easter egg tadında, kendine/dördüncü duvara göz kırpan). Seçilen grupta %10 olasılık; derin trigger başına dil başına en az 2.
- Uygulamaya geçince tepki: uygulamaya / site kategorisine geçip 25 sn kalınca, ziyaret başına tek zar (az %25 / normal %45 / çok %65),
  genel bekleme 6 dk, aynı uygulamaya 40 dk ("az"da iki kat). Sadece o uygulamanın lafı (random'a düşmez).
- Korunan: bugün sus, toplantı koruması, sessiz site, meşgulken konuşmama, son 20 tekrar etmeme, kendiliğinden laf sıklığı.
- Gizlilik: değişmez. Exe adı ve başlık cihazda etikete çevrilir; tepki modülüne sadece etiket gelir, hiçbir şey saklanmaz/gönderilmez.

## Kabul
pool:check (yeni hedefler + nadir sayısı), app-react saf testleri, motor nadir seçim testleri, talker entegrasyon testi, Rust exe tablosu testi,
studio testleri, PENDING-SPEC13.md, REPORT-spec13.md, manuel test bölümü 22.
