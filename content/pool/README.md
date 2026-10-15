# content/pool: laf havuzu (tek kaynak)

- `pool_tr.json`, `pool_en.json`: laflar. Diller ayrı yazılır (çeviri değil), her dosyada sadece kendi dili.
  Biçim: `{ "id": "excel_001", "trigger": "app:excel", "intent": "ne yaptığı, tek cümle", "tr": "metin{K:, sokak eki ***}" }`.
- `banned_tr.txt`, `banned_en.txt`: yasak kelimeler (`kök*` önek, diğerleri tam kelime). Worker'ın listesiyle aynı tutulur.
- `COVERAGE.md`: trigger başına hedef / mevcut sayı (üretilir, elle düzenleme).

Kurallar (otomatik kontrol): küçük harf, ünlem ve emoji yok, tek satır, render sonrası terbiyeli ve sokak ayrı ayrı ≤ 60 karakter,
en fazla bir `{K:...}` (sadece sokak modunda görünür, içinde küfür yerine `***` ya da `aq` kısaltması; açık küfür hiçbir yerde yok), `[K]` yok, `{K:}` dışında `***`/`aq` yok,
yasak kelime yok, aynı görünür metin iki kez yok, `intent` dolu ve `placeholder` değil. Toplantı uygulamalarına (zoom, teams, webex) laf yok.

Komutlar (`desktop/` içinde):
- `npm run pool:check`: kurallar + kapsam hedefleri + kopya güncelliği; her şey tamamsa geçer.
- `npm run pool:coverage`: `COVERAGE.md`'yi yeniden yazar.
- `npm run pool:sync`: dosyaları `desktop/assets/`'e kopyalar (`dev`, `build`, `test` öncesi kendiliğinden çalışır).
- `npm test`: CI'da aynı kuralları ve kapsamı zorlar (COVERAGE.md ve kopya güncelliği `pool:check`'te).

Soru tipleri ve ters cevaplar (SPEC 09 K8): `answer:<tip>` havuzları `desktop/src/talk/classify.ts` tiplerine göre (hedef 25, üçte biri `{K:}` kuyruklu).
Yön/selam tiplerinde cevap karşıt havuzdan gelir; tablo ve yazım kuralı `inverse.md`. Onay bekleyen K8 lafları: `PENDING-K8.md`.
