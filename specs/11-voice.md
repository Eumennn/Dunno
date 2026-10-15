# SPEC 11: Dunno Voice (gibberish)

KAYNAK: Plan v2 (`orchestrator/notes/Dunno-Orchestrator-Plan-v2.md`, SPEC11). ÖN KOŞUL: SPEC 10 + REPO-01 bitti.

## Ne
Her anlamlı tepkiye kısa, özgün, robotik/anlamsız bir karakter sesi (Animal Crossing / Undertale tarzı "bıdı bıdı" fikri; kod/ses alınmaz).
- TTS değil, mikrofon/STT yok. **Ses metni asla okumaz**: ses sadece tepki kategorisinden ve küçük bir varyasyon havuzundan üretilir; metnin içeriği ya da uzunluğu girdi değildir.
- Kategoriler farklı karakterde: selam/dürtme, cevap (havuz), doğru cevap (honest), surat asma (limit), çok hızlı, başarım, uyarı/hata, bağlam lafı (app/site/time).
  Her kategoride 5 varyasyon (deterministik, tohumlu).
- Senkron sıra: **tepki (poz) -> kısa düşünme -> balon açılır -> Dunno sesi -> daktilo metni**.
- Ses yok: toplantı koruması, "bugün sus", sessiz site kategorisi, fart (K3 kuralı: ses yok).
- Ses dosyası yok: Web Audio ile sentez (kare/üçgen dalga, kısa zarflar, perde kayması); özgün, telif yok.

## Ayarlar
settings.exe > görünüm: "dunno sesi" açık/kapalı (varsayılan **açık**) + ses düzeyi kısık / orta / yüksek (varsayılan **orta**, kademeli kaydırıcı).

## Kabul
- Saf: kategori eşlemesi, ses planı (heceler: frekans, süre, aralık, düzey, kayma), varyasyon havuzu, "metinden bağımsız" testi, düzey eşlemesi, sessiz durumlar.
- Senkron sıra testi (sahte saat/olay günlüğü).
- desktop testleri, tsc, clippy temiz; `REPORT-spec11.md`, manuel test bölümü 20.
