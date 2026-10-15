# SPEC 11 raporu: Dunno Voice (gibberish)

> 2026-10-06. Manuel kontrol: `desktop-manual-test.md` bölüm 20. Spec: `specs/11-voice.md` (Plan v2'den).

## Ne yapıldı
- `desktop/src/voice/voice.ts` (saf): 8 kategori (selam/dürtme, cevap, doğru cevap, surat asma, çok hızlı, başarım, uyarı, bağlam), her biri kendi
  perde aralığı, hece sayısı/süresi, dalga biçimi, perde kayması ve cümle eğilimiyle; kategori başına 5 deterministik varyasyon (tohumlu).
  **Ses metni okumaz:** plan sadece `(kategori, varyasyon)` alır; metin içeriği ve uzunluğu girdi değil (testli).
- `desktop/src/voice/player.ts`: Web Audio sentez (osilatör + kısa atak/bırakma zarfı, tık sesi yok). Ses dosyası yok, mikrofon/STT/TTS yok.
- Sıra (talker): **tepki pozu -> kısa düşünme (240 ms) -> balon açılır -> ses -> daktilo**. Kendiliğinden laflar, başarım lafı + toast,
  ask.exe cevabı (doğru cevapta "honest" sesi), çok hızlı, hak bitti (error.exe) seslendi.
- Ses yok: toplantı koruması, "bugün sus", sessiz site kategorisi, fart (K3 kuralı), ayar kapalı.
- settings.exe > görünüm: "dunno sesi" (varsayılan açık) + ses düzeyi kısık/orta/yüksek (varsayılan orta, kademeli kaydırıcı); düzey değişince kısa deneme sesi.
- WebView2 otomatik oynatma: iki pencerede aynı `additionalBrowserArgs` (Tauri varsayılanları + `--autoplay-policy=no-user-gesture-required`);
  ayrıca ilk dokunuşta AudioContext sürdürülür.

## Doğrulama
- desktop 1244 test (voice 6, talker-voice 3), tsc + typecheck:node, Windows clippy temiz.
- Örnek: `orchestrator/notes/ui-shots/voice-samples.wav` (her kategoriden 2 varyasyon, sırası: greet, answer, honest, sulk, too_fast, achievement, warn, context).
- Yapılamayan: gerçek Windows'ta dinleme (manuel 20).

## Tasarımcı onayı bekleyenler
Ses karakterleri (perde, hız, dalga), düzey değerleri, settings metinleri ("dunno sesi", açıklama, düzey adları).
