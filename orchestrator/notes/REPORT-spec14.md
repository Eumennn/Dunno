# SPEC 14 raporu: gizli dünyalar + canavar modu

> 2026-10-07. Manuel kontrol: `desktop-manual-test.md` bölüm 23. Spec: `specs/14-easter-eggs.md`. Onay listesi: `content/pool/PENDING-SPEC14.md`.

## Ne yapıldı
- `desktop/src/eggs/eggs.ts` (saf): ömür boyu dürtme sayacı (stats.txt toplamından geri kalmaz), 100 -> kağıt dünya, 1000 -> glitch dünya,
  canavar hareketi (20 sn içinde 3 sağanak, her sağanak 2 sn'de 4 dürtme), seçim/kilit kuralları, görünüm önceliği (canavar > dünya > dolap).
- Görünüm: `content/eggs/worlds.json` (3 tema, UI kontrastı geçer), `content/eggs/costumes` (canavar + glitch, aynı üretici, dolap klasörü dışında).
  dunno.exe'de kağıt dünyada defter çizgili, glitch'te tarama satırlı zemin (düz çizgi SVG deseni, gradyan yok).
- Davranış: glitch dünyasında alt kenardaki yürüyüşlerin %35'i geri geri (controller `moonwalk`).
- Laflar: 100 yeni (egg:paper 15, egg:glitch 15, egg:monster 20; TR + EN), sadece o dünyadayken kendiliğinden lafın bir kısmı (dünya %40, canavar %60).
- Canavar: kostüm, koyu tema, koyu balon (#2B1E2F / #FFF1D6), kalın ses profilleri (mod sınırları içinde), açılınca bir canavar lafı.
- settings.exe > gizli: dünya seçici (sadece açılanlar) + canavar anahtarı (bulunduysa). Hiçbir şey açılmadıysa bölüm görünmez.
- **Landing sayacı yapılmadı** (karar spec'te): landing CLAUDE.md gereği değişmez, ayrı web reposunda; sayaç masaüstü Dunno'da.

## Gizlilik
Sayaç ve açılanlar sadece store'da; telemetri olay listesi değişmedi (test), eggs modülleri ağ/IPC kullanmaz (test).

## Doğrulama
- desktop 1329 test (eggs 11, controller geri yürüyüş 1, talker gizli havuz 1, kostüm sınır + palet 3), pool:check temiz, tsc + typecheck:node,
  vite build, studio 42, worker 143, Windows clippy temiz.
- Görüntüler: `ui-shots/spec14-paper.png`, `spec14-glitch.png`, `spec14-monster.png`, `spec14-settings.png`, `spec14-hidden-creatures.png`
  (geliştirme önizlemesi `app.html?eggs=paper|glitch|monster`).

## Tasarımcı onayı bekleyenler
Canavar ve glitch çizimleri (placeholder), dünya renkleri, 100 laf, eşikler (100 / 1000), canavar hareketi.
