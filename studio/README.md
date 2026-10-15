# Dunno Studio

Ekip ve tasarımcı için iç araç (son kullanıcıya dağıtılmaz): laf havuzunu listeler, düzenler, "şu durumda ne der" diye dener.

## Açmak

```
cd studio
npm install        # ilk sefer
npm run studio     # http://127.0.0.1:5180
```

- Sadece `127.0.0.1:5180`'e bağlanır (başka arayüz/host yok). Port sabit (`strictPort`): zaten açık bir studio varsa ikinci başlatma hata verir, önce onu kapat.
- Soru denemesi (ask.exe, "llm") yerel worker'a gider. Varsayılan `http://127.0.0.1:8787`. Başka port için:
  - PowerShell: `$env:STUDIO_WORKER_BASE = "http://127.0.0.1:8789"; npm run studio`
  - Git Bash: `STUDIO_WORKER_BASE=http://127.0.0.1:8789 npm run studio`
- Worker kapalıysa studio yine çalışır; ask.exe "worker kapalı" yazar. Worker anahtarsızsa (yerelde normal) cevap worker'ın kendi havuzundan gelir ve bu açıkça yazılır.

## Pencereler

- **pool.exe**: kategori > trigger ağacı (dil başına sayı/hedef, hedefin altındakiler pembe), tr/en sekmesi, arama, her lafta polite ve street önizleme.
- **edit.exe**: yeni / düzenle / çoğalt. Her tuşta doğrulama (`desktop/src/lines/pool-check.ts`), hatalar editörde ve satırda.
- **try.exe**: öndeki uygulama, saat, boşta kalma, pil, etkileşim, ağız modu, dil -> masaüstünün gerçek laf motoruyla kazanan trigger, adaylar, 10 çekiliş. Sprite ve balon masaüstündekiyle aynı bileşen.
- **ask.exe**: önce yerel havuz cevabı, soru tipine göre (yazarken `tip: who` gibi gösterilir; `answer:<tip>`, yoksa `answer:generic`), "llm" ile worker'ın `/v1/ask`'i.
- Başlık çubuğundaki x: edit.exe'de düzenlemeyi kapatır, diğerlerinde pencereyi katlar.

## Kayıt davranışı

- "kaydet" ve "sil" o dilin dosyasını **hemen** yazar: `content/pool/pool_<dil>.json` (tek kaynak).
- Kural hatası varsa **hiçbir şey yazılmaz**; hatalar ilgili satırda gösterilir. Kapsam açığı (hedefin altında kalmak) kaydı engellemez.
- Biçim korunur: satır başına bir laf, trigger değişince boş satır; git diff okunur kalır.
- Her başarılı kayıtta `content/pool/COVERAGE.md` yenilenir ve dosya `desktop/assets/`'e kopyalanır.
- Yeni laf aynı trigger'ın son lafının arkasına eklenir; id otomatik önerilir (`tr_excel_11` gibi).
- Değişiklikler git'e kendiliğinden girmez: kaydettikten sonra `cd desktop; npm run pool:check` ile kontrol edip commit et.

## Geliştirme

```
npm test           # vitest: sunucu (geçici dizinde, gerçek dosyalara yazmaz), model, görünüm, deneme paneli
npm run typecheck
npm run shots      # studio açıkken: headless ekran görüntüleri -> orchestrator/notes/ui-shots/studio-*.png
```

`shots` görünmez bir tarayıcı kullanır, ekrana/fareye/klavyeye dokunmaz ve hiçbir şeyi kaydetmez.
