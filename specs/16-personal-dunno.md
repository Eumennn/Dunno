# SPEC 16: Kişisel Dunno (opt-in)

KAYNAK: Plan v2 SPEC16 + ilke (kişiselleştirme != gözetim). ÖN KOŞUL: SPEC 15 bitti. Son SPEC.

## Kural
- Free genel havuzlarla takılır, kullanıcıyı kalıcı tanımaz. Kişisel Dunno **Pro + açık rıza**, varsayılan kapalı.
- Kaynak: sadece kullanıcının BİLEREK yazdıkları (ad, şakalar, konular, rutinler, tercihler) + cihazdaki uygulama etiketi.
- **Plan v2'den sapma:** "Dunno konuşmaları" kullanılmaz. CLAUDE.md gizlilik kuralı (soru içerikleri loglanmaz, saklanmaz) daha üstte.
- Pencere başlığı / sekme adı kişisel katmana hiç girmez (Rust kategoriye çevirir); sohbet/DM içerikleri taranmaz.
- Sır/kimlik (e-posta, link, uzun sayı, token, şifre kelimeleri) ve hassas konular (yasak listesi: sağlık, din, siyaset...) girdi olarak reddedilir.
- Sadece cihazda (store). Ağ, LLM, telemetri yok. Görüntüle / düzenle / sil; kapatmak = silmek.
- Kaydırıcılar: sakin↔kaotik (dolaşma), tatlı↔takılan, kibar↔giydiren, sessiz↔geveze (konuşma sıklığı), robotik↔absürt (şablon tonu).
- Tepki katmanı (Plan v2): temel kişilik -> durum -> uygulama -> zaman -> başarım -> easter egg -> **kişisel** -> son tepki
  (kendiliğinden lafların %25'i kişisel şablondan, dolabilen şablon yoksa normal laf).

## Kabul
profil süzgeci (sır, hassas, uzunluk, liste), rıza/sil, kaydırıcı davranışı, şablonlar (marka, ≤60), talker katmanı, ipc, gizlilik testleri,
PRIVACY.md, REPORT-spec16.md, manuel test bölümü 25.
