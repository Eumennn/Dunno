# SPEC 14: Gizli dünyalar + canavar modu

KAYNAK: Plan v2 SPEC14. ÖN KOŞUL: SPEC 13 bitti.

## Karar: sayaç nerede
Plan v2 "landing Dunno click counter" diyor. Landing (`index.html`) CLAUDE.md gereği yeniden yazılmaz ve REPO-01'de ayrı web reposuna gidiyor
(paketlenmiş tek dosya). Bu yüzden sayaç **masaüstü Dunno'sunun dürtmeleri** (stats.txt toplamından başlar). Landing'de aynı eşiklerle bir
görsel easter egg, web reposunda landing değişikliği onaylanınca ayrı iş (dunno-web).

## Kapsam
- 100 dürtme: **kağıt dünya**. Karakalem Dunno (gri tonlar), dunno.exe'de defter çizgili zemin, kendine özel laflar (`egg:paper`).
- 1000 dürtme: **glitch dünya**. Bozuk renkler, tarama satırlı zemin, ara sıra geri geri yürür (alt kenarda yürüyüşlerin %35'i),
  gizli yaratık "glitch" dolapta açılır, kendine özel laflar (`egg:glitch`).
- **Canavar modu**: gizli hareket = 20 sn içinde 3 dürtme sağanağı (her biri 2 sn'de 4 dürtme; Dunno'yu fazla kızdırınca). Aynı hareket kapatır.
  Canavar kostümü (boynuz, kaş, diş, yürürken dikenler), koyu canavar teması, koyu balon, kalın hırıltılı ses (aynı kategoriler, testere dalga),
  canavar lafları (`egg:monster`, kendiliğinden lafların %60'ı).
- Zorlama yok: açılan dünya bir kez söylenir; settings.exe > gizli bölümünden seçilir / normale dönülür; canavar anahtarı bulunduktan sonra görünür.
- Görünüm önceliği: canavar > dünya > dolap seçimi. Dolap seçimi silinmez.
- Gizlilik: sayaç ve açılanlar sadece cihazda (store), telemetri olayı yok, ağ yok.

## Kabul
eggs saf testleri (eşikler, onarım, hareket, öncelik, ses, balon, ipc, gizlilik), dünya temaları UI kontrastı, gizli yaratık sınır + palet testi,
talker gizli havuz payı, controller geri yürüyüş, pool:check (egg:* hedefleri), REPORT-spec14.md, manuel test bölümü 23.
