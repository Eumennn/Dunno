# Masaüstü manuel test protokolü (SPEC 02)

Kim uygular: kullanıcı (tasarımcı). PM her görsel/davranışsal teslimatta ilgili bölümü ister; D10'da hepsi baştan sona.
Ortam: Windows, birincil ekran, görev çubuğu altta (varsa ikinci ekran takılı kalsın).
Her madde için sonuç: geçti / kaldı + bir cümle not.

## Sabah için (kullanıcı uyurken geçici kabul edilenler)
Kullanıcı kararıyla aşağıdakiler otomatik kontrollerle (build, test, clippy) geçici kabul edilip merge edildi.
Sabah sırayla dene; kalan madde varsa PM'e numarasıyla yaz. PM gece boyunca bu listeyi günceller.

**Önce kontrol et (gece olayları):** (a) Riot Vanguard: gece 02:4x civarı bir test tıklaması Vanguard güvenlik penceresine gitti; sonradan pencerenin hâlâ açık olduğu görüldü (Vazgeç'e basılmamış). Pencere ekranda bekliyor, kararı sen ver. (b) Bir test betiği öndeki bir pencereye "dunya duz mu 4" + Enter yazmış olabilir; açık pencerelerde bu metni görürsen sil.

| Teslimat | Denenecek bölüm | Merge/tag | Sonuç |
|---|---|---|---|
| D1 pencere | 0, 1 (+ Windows ölçek %150 iken 1.2–1.3 tekrar) | stable-D1-20261002-0044 | |
| D2 animasyon (otomatik kabul, gözle bak) | 2 (%150 ölçekte de keskin mi) | stable-D2-20261002-0051 | |
| D3 hareket | 3 (1–3) | stable-D3-20261002-0206 | |
| D6 ilk açılış (otomatik kabul, gözle bak) | 5.1 | stable-D6-20261002-0222 | |
| D4 soru kutusu + laf motoru | 4, 5.2–5.3 | stable-D4-20261002-0257 | |

## 0. Kurulum (D10)
1. `desktop/src-tauri/target/release/bundle/nsis/*.exe` çalıştır, kur. SmartScreen uyarısı beklenir (imzasız).
2. Uygulama açılıyor; görev çubuğunda simgesi yok, tray'de simgesi var.

## 1. Pencere ve tıklama geçirme (D1)
1. Pet görünüyor; çevresinde çerçeve, gölge, gri/siyah zemin yok.
2. Pet'in hemen yanındaki (2-3 cm) bir masaüstü simgesine çift tıkla: simge açılıyor.
3. Pet'in tam üstüne tıkla: tıklamayı pet alıyor (arkadaki şey açılmıyor).
4. Başka bir pencereyi öne al: pet hâlâ en üstte.
5. Klavyede yazı yazarken pet odağı çalmıyor.

## 2. Animasyon (D2)
1. Placeholder kutular keskin (bulanık değil), boyut 2x veya 3x.
2. Sola yürürken görüntü aynalanıyor.

## 3. Hareket (D3)
1. 2-3 dakika izle: pet ekran kenar/köşelerinde yürüyor, duruyor, ara sıra uyuyor; görev çubuğunun üstüne binmiyor.
2. İmleci hızla pet'e yaklaştır: kaçıyor (`run_away`).
3. Pet'i sürükleyip ekranın ortasına bırak: en yakın kenara yerleşiyor.
4. İkinci ekran varsa: pet birincil ekranda kalıyor.

## 4. Soru kutusu ve limit (D4)
1. Pet'e tıkla: balon + yazı kutusu açılıyor. Bir soru yaz, Enter: kısa, küçük harfli, ünlemsiz, yanlış bir cevap geliyor.
2. Toplam 3 soru sor. 4. tıklamada pet surat asıyor (`sulk`), sırtını dönüyor, soru kutusu açılmıyor.
3. Uygulamayı kapat, Windows saatini 1 gün ileri al, uygulamayı aç: tekrar soru sorulabiliyor. Saati geri al.
4. Worker kapalıyken (`wrangler dev` durdurulmuş) soru sor: yine cevap geliyor (havuzdan), hata görünmüyor.
5. Soru kutusu arayüzü (otomatik testte yok, UI'ya giriş yapılmıyor): kutu açılınca imleç yazı alanında; Esc kapatıyor;
   boş Enter kapatıyor (hak düşmüyor, kalpler aynı); kutu açıkken pet'e tıklamak kapatıyor; gönderince kısa bir "..." düşünme
   balonu, sonra cevap balonu görünüyor ve okuma süresi sonunda kapanıyor; kalpler her soruda bir azalıyor.
6. Sokak modunda cevaplarda küfür yeri `***` görünüyor, terbiyeli modda hiç görünmüyor; `[K]` ya da `{K:` asla ekrana çıkmıyor.

Otomatik karşılığı: `cd desktop; npm run e2e` (kendi worker'ını 8788'de açıp kapatır). Gerçek `api.ts` + cevap akışıyla 3 cevap
(3. soru `/v1/ask`'e gider), 4. soruda sulk ve istek yok, `/v1/lines` 200 + 304 ve yerel havuzla birleşme, worker kapalıyken
havuz cevabı ve önbellekten laflar, worker çıktısında soru metni yok.

## 5. Laf motoru ve ilk açılış (D5, D6)
1. İlk açılışta dil (TR/EN) ve ağız modu (terbiyeli/sokak) soruluyor; seçim uygulama yeniden açılınca hatırlanıyor.
2. Sıklık "çok" iken birkaç dakika içinde pet kendiliğinden laf atıyor.
3. Terbiyeli modda balonda `***` hiç görünmüyor; sokak modunda görünebiliyor.

## 6. Bağlam (D7)
1. Excel / VS Code / tarayıcı öne alınınca bir süre sonra o uygulamaya özgü laf gelebiliyor (placeholder havuzla en az 1 örnek).
2. 10 dk dokunmadan bekle (veya PM'in verdiği test kısayoluyla): boşta lafı / uyku.

## 7. Toplantı koruması (D8) — zorunlu
1. Zoom veya Teams'i aç ve öne al: **2 saniye içinde** pet `shh` yapıp susuyor veya saklanıyor. Sokak modundaysa küfürlü laf kesinlikle gelmiyor.
2. Tarayıcıda başlığında "Meet" geçen bir sekme öne al: aynı davranış.
3. Toplantı penceresini kapat: pet bir süre sonra normale dönüyor.
4. Tray -> "toplantıdayım" aç: pet susuyor; kapat: normale dönüyor.

## 8. Tray (D9)
1. Mod değiştir: sonraki laflar yeni moda göre.
2. "bugün sus": pet uyuyor, laf atmıyor; ertesi gün (saat ileri) normal.
3. Konuşma sıklığı az/normal/çok değişiyor.
4. Dil değiştir: sonraki laflar yeni dilde.
5. "Windows ile başlat" aç, yeniden başlat (veya oturum kapat/aç): uygulama açılıyor.
6. Çıkış: uygulama tamamen kapanıyor (Görev Yöneticisi'nde kalmıyor).

## Onay
Tüm bölümler geçtiyse PM'e "manuel test geçti" yaz; kalan maddeleri numarasıyla bildir.

---
# Eklemeler: D10 kurulum, D8 toplantı, D9 tray (2026-10-02, desktop önerisi, PM taşıdı)

## 0. Kurulum ve kaldırma (D10)
Dosya: `desktop/src-tauri/target/release/bundle/nsis/Dunno_0.1.0_x64-setup.exe` (imzasız, ~2.4 MB).
1. Exe'yi çalıştır. SmartScreen "Windows bilgisayarınızı korudu" derse: "Ek bilgi" -> "Yine de çalıştır" (imzasız olduğu için beklenen).
2. Kurulum yönetici izni istemiyor (kullanıcı başına kurulum). Bitince uygulama açılıyor.
3. Görev çubuğunda Dunno simgesi yok; bildirim alanında (tray) simgesi var.
4. Başlat menüsünde "Dunno" var.
5. İlk açılışta dil ve ağız modu seçimi çıkıyor (bölüm 5.1).
6. Kaldırma: Ayarlar -> Uygulamalar -> Dunno -> Kaldır. Kaldırıcı kapanınca:
   - uygulama çalışmıyor (Görev Yöneticisi'nde `dunno.exe` yok),
   - tray simgesi gitti,
   - "Windows ile başlat" açıktıysa: yeniden oturum açınca Dunno açılmıyor.
7. (Bilgi) Ayarlar `%APPDATA%\app.dunno.desktop\settings.json` içinde; kaldırıcı bu klasörü silmeyebilir. Yeniden kurulumda ilk açılış seçimi çıkmazsa sebep budur; klasörü elle silip tekrar dene.

## 7. Toplantı koruması (D8) — ekleme
Ölçüm: toplantı penceresi öne geldiği an ile pet'in kaybolması arası **≤ 2 sn** olmalı (pet önce kısa `shh` oynar, ~0.8 sn sonra gizlenir).
1. Zoom/Teams yoksa tarayıcı yolu: Edge'i ayrı profille, başlığında "Meet" geçen bir pencereyle aç (PowerShell, kendi elinle):
   `& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --user-data-dir="$env:TEMP\dunno-meet-test" --app="data:text/html,<title>Google Meet test</title>meet test"`
   Pencere öne gelince: pet `shh` yapıp kayboluyor. Sokak modundaysan o sırada hiçbir laf/balon gelmiyor.
2. Toplantı sırasında pet görünmüyor; görünse bile tıklayınca soru kutusu açılmıyor.
3. Toplantı penceresini kapat: pet ~10 sn içinde geri geliyor; geri gelirken klavye odağı çalınmıyor (o an yazdığın pencerede yazmaya devam edebiliyorsun).
4. Açık bir soru kutusu varken toplantı başlarsa kutu kapanıyor.
5. Tray -> "toplantıdayım" işaretle: pet ≤ 2 sn içinde `shh` + kayboluyor. İşareti kaldır: pet geri geliyor.
6. Toplantı bitince ağız modu kullanıcının seçtiğine döner (sokak modundaysan sonraki laflarda `***` yine görülebilir).

## 8. Tray (D9) — ekleme
1. Menü durumu ayarlarla eşleşiyor: seçili mod/dil/sıklık işaretli; dil değişince menü metinleri de değişiyor.
2. "bugün sus": pet uyuyor (`sleep`), kendiliğinden laf atmıyor, tıklayınca soru kutusu açılmıyor. İşareti kaldır: pet uyanıyor.
3. "bugün sus" açıkken Windows saatini ertesi güne al (ya da gece yarısını bekle): ≤ 1 dk içinde pet uyanıyor ve menüdeki işaret kalkıyor. Saati geri al.
4. "Windows ile başlat" işaretle -> oturumu kapat/aç: Dunno açılıyor. İşareti kaldır -> tekrar: açılmıyor.
5. "çıkış": uygulama ve tray simgesi kapanıyor, Görev Yöneticisi'nde `dunno.exe` kalmıyor.

## Not
Dev'deki orta tık -> manuel toplantı kancası kullanıcı isteğiyle kaldırıldı; toplantı testi sadece yukarıdaki tray ve Edge yollarıyla.

## 9. Caret titremesi (BUG-CARET, 2026-10-02) — GEÇTİ (kullanıcı, 2026-10-02 22:10: titreme bitti)
Önce yeni yükleyiciyi kur (`desktop/src-tauri/target/release/bundle/nsis/Dunno_0.1.0_x64-setup.exe`, eski sürümün üstüne).
Not Defteri veya VS Code'da yazı yaz, her durumda 30 sn imleci izle:
1. Pet yürürken: caret titriyor mu?
2. Pet dururken / uyurken: titriyor mu?
3. Tray'den çıkış, sonra PowerShell: `$env:DUNNO_FREEZE_MOVEMENT=1; & "$env:LOCALAPPDATA\Dunno\dunno.exe"` (kendiliğinden yürüme yok)
4. Tray'den çıkış, yeni PowerShell: `$env:DUNNO_NO_CURSOR_WATCH=1; & "$env:LOCALAPPDATA\Dunno\dunno.exe"` (pet tıklanamaz, normal)
5. İkisi birden.
Hangi durumda titreme kaldığını yaz. Hiçbirinde kalmıyorsa düzeltme yeterli. Kurulum yolu farklıysa Başlat menüsü kısayolunun hedefine bak.

## 10. dunno.exe ve sade tray (SPEC 03 M1/M2/U2, 2026-10-02)
1. Uygulamayı Başlat menüsünden aç: pet + dunno.exe penceresi gelir. Başlat menüsünden tekrar aç: ikinci pet çıkmaz, dunno.exe öne gelir.
2. dunno.exe'yi x ile kapat: pencere gizlenir, pet çalışmaya devam eder. Tray sol tık: dunno.exe tekrar açılır.
3. Sekmeler: home · settings.exe · stats.txt · about.txt geçişleri çalışıyor; başlık çubuğundan sürükle/küçült.
4. settings.exe'de ağız/dil/sıklık değiştir: pet'e anında geçer (balon dili, `***`). Pet'in soru kutusundaki polite|street seçici aynı ayarı değiştirir.
5. "windows ile başlat" aç, oturumu kapat/aç: sadece pet gelir (dunno.exe açılmaz).
6. home "dunno'yu çağır": pet ekranın alt ortasına koşar. "bugün sus" / "toplantıdayım" anahtarları pet'i susturur/gizler.
7. stats.txt: birkaç soru/dürtme/sürükleme sonrası sayılar artar; "sıfırla" sıfırlar.
8. İlk açılış (ayar klasörünü silip): setup.exe; [ dunno ] veya küçült/kapat -> "great answer… installing anyway" toast, yine kurulur.
9. Tray menüsü sadece 4 öğe: dunno.exe'yi aç, bugün sus, toplantıdayım, çıkış.
10. Türkçe modda başlıklar: Türkçe harf içerenler normal font, diğerleri piksel font.

## 11. Arayüz cilası (SPEC 04 UP1–UP7, 2026-10-03)
Kurulum: `desktop\src-tauri\target\release\bundle\nsis\Dunno_0.1.0_x64-setup.exe` (eski sürümün üstüne kur).
- [ ] Pet sağ kenarda, sol kenarda ve alt köşelerdeyken üstüne tıkla: ask.exe ekranın içine açılıyor, kuyruk pet'e bakıyor, görev çubuğunun üstüne taşmıyor.
- [ ] 3 hak bitince tekrar sor: error.exe aynı şekilde ekranın içinde; `[ tamam ]` ile kapanıyor, dokunmazsan 6 sn sonra kendiliğinden kapanıyor.
- [ ] Konuşma balonu ve toast kenarda/köşede taşmıyor.
- [ ] Ekran ölçeği %125 ve %150'de (Ayarlar > Ekran) aynı kontroller: taşma yok.
- [ ] İkinci monitör varsa (birincilin solunda): pet birincil ekranda doğru yerde, balonlar birincil ekranda.
- [ ] Balon açılıp kapanırken pencere büyüyüp küçülüyor: tek karelik titreme var mı, rahatsız edici mi (gözle).
- [ ] Sol kenarda peek: duvar ekranın kenarında (aynalı). Sağ kenarda duvar sağda. Uyurken sırtı kenara dönük.
- [ ] dunno.exe home: "bugün sus" ve "toplantıdayım" tek anahtar + açıklama; anahtarı değiştirince soldaki önizleme sleep/shh oluyor.
- [ ] today.txt: kalpler, "yarın 00:00'da yenilenir", bugün atılan laf sayısı. "kenara gönder" pet'i kenara yolluyor.
- [ ] Sekmeler klavyeyle (Tab, ok tuşları, Home/End) geziliyor, odak görünür; pencereyi kapatıp açınca son sekme açılıyor; pencere 720x580'den küçülmüyor.

## 12. Gardırop (SPEC 05 wardrobe.exe, 2026-10-03)
Kurulum: `desktop\src-tauri\target\release\bundle\nsis\Dunno_0.1.0_x64-setup.exe`.
- [ ] dunno.exe > wardrobe.exe: başta sadece klasik tema + bere açık; diğerleri soluk, kilitli, koşul ve ilerleme yazıyor (ör. `0 / 100`).
- [ ] Kilitli parçaya tıklamak hiçbir şey yapmıyor; açık parça (bere) seçince pet'e anında geçiyor; uygulamayı kapatıp açınca seçim duruyor.
- [ ] Önizlemede durum seçici (boş/yürü/uyu/kenar): uyurken şapka gizli; kenarda (peek) şapka duvarın arkasında kırpılıyor.
- [ ] Pet sol kenarda peek yaparken aksesuar aynalı ve kaymıyor; %125/%150 ölçekte de yerinde.
- [ ] Bir başarımı aç (en kolayı: 00:00–05:00 arası soru sor = gece başlığı): pet kısa bir laf söylüyor + "açıldı: ..." toast'u; achievements.txt'de tarih.
- [ ] "bugün sus" açıkken başarım açılırsa bildirim gelmiyor; sus kapanınca bir dakika içinde geliyor.
- [ ] Temalar (nane, lavanta, gece, yanmış tost) açıldıktan sonra pet rengi değişiyor; kontur, göz ve yanak aynı kalıyor.

## 13. Soru davranışı (SPEC 06, 2026-10-03)
Kurulum: yeni setup.exe. Anahtarsız worker'da hak hiç düşmez (charged yok): "3 doğru cevap" ve "hak bitince" maddeleri `OPENROUTER_API_KEY`'li worker ister.
- [ ] Düşünme: soru gönderince cevap hiç anında gelmiyor (en az ~1.2 sn); ask.exe'de kesik çizgili "dunno düşünüyor" balonu, noktalar oynuyor, metin ara sıra değişiyor (çok düşünüyor / neredeyse ...); pet bu sırada boşta.
- [ ] Ara sıra (yaklaşık 10 soruda 1) uyuyakalma: "zzz… (düşünürken uyuyakaldı)", pet kısa uyuyor, sonra yeniden düşünüyor, cevap "hı. ne. ha." ile başlıyor. Ara sıra 4–7 sn uzun düşünme normal.
- [ ] Bekleme: bir sorudan sonra 20 sn dolmadan pet'e tıkla: soru kutusu yerine kum saati + "biraz bekle" + geri sayım; birkaç sn sonra ya da tıklayınca kapanıyor; 20 sn sonra soru kutusu normal.
- [ ] Kilit: 2 dk içinde 4. soruyu gönder (20'şer sn arayla): cevap yerine "yavaş" lafı, hak düşmüyor; sonraki 60 sn kum saati + geri sayım. Yeniden başlatma kilidi sıfırlar (bilerek).
- [ ] 3 doğru cevap (anahtar gelince): ilk 3 soruya kısa ve doğru bilgi + sonunda iğneleme; kalp cevap gelince azalıyor; uzun cevapta pencere genişliyor, en çok 2 satır. today.txt: "n / 3 doğru cevap hakkı".
- [ ] Gerçek kişi ("x kimdir") ya da yasak konu: kaçamak cevap ("o kim" tarzı), kalp düşmüyor.
- [ ] Hak bitince: bir kez error.exe (429); sonraki tıklamalarda soru kutusu açılıyor, cevaplar soruya uygun havuzdan (kim sorunca "kim" cevabı), sulk tekrar etmiyor. today.txt "sonrası: işe yaramaz cevaplar". Ertesi gün 00:00'da 3 hak geri.
- [ ] Beynim kapalı: worker kapalıyken (ya da anahtarsız) soru sor: cevap havuzdan, kalp düşmez, altında "bugün beynim kapalı. bunlar yedekten"; aynı gün tekrar etmiyor.
- [ ] Toplantı sırasında düşünme/cevap gelmiyor. Street modda küfür sadece `***` ya da (TR) `aq`; polite'ta hiç yok.

## 14. Geri bildirim 2. tur (SPEC 07, 2026-10-03)
Kurulum: REPORT-spec07.md'deki yeni setup.exe (eski sürümün üstüne kur).
- [ ] **FB1** Bere (ve diğer şapkalar) sağ ve sol kenarda peek yaparken kafada oturuyor, duvar çizgisinin ötesine taşmıyor; tüy beresiz yerden değil, beredeki yerden çıkıyor. Uyurken şapka yok.
- [ ] **FB2** dunno.exe > about.txt'te sürüm satırına hızlıca 5 kez tıkla: "test modu. kimseye söyleme" toast'u. wardrobe.exe'de her tema ve aksesuar seçilebiliyor.
- [ ] **FB2** settings.exe > test modu: bir başarımı tetikle (pet lafı + toast), "doğru cevap hakkını sıfırla" (kalpler 3), "soru temposu: kapalı" (art arda soru sorulabiliyor), toplantı başlat/bitir, kenara gönder 8 hedefin her birinde pet o kenarda doğru pozda ve aksesuar yerinde.
- [ ] **FB2** Test modunu kapat: kilitli bir parça seçiliyse klasik/aksesuarsız döner; ilerleme sayıları aynı.
- [ ] **FB3** dunno.exe büyüt düğmesi ve başlığa çift tık: içerik genişliyor, Dunno daha büyük, boş yarım ekran yok. Kapat-aç: aynı yer ve boyut. (Varsa ikinci monitörü çıkarınca pencere ortada açılır.)
- [ ] **FB4** "toplantıdayım" açınca pet ~1 sn shh yapıp saklanıyor; kapatınca hemen (göz kırpması kadar) geri geliyor. Zoom/Teams kapanınca en geç ~1.5 sn'de dönüyor.
- [ ] **FB5** Konuşma balonu en az ~4 sn kalıyor; imleç balonun üstündeyken kapanmıyor, ayrılınca kısa süre sonra kapanıyor; balona tıklayınca kapanıyor; balon dışına tıklama arkadaki pencereye geçiyor. settings.exe "balon süresi" uzun/kısa farkı hissediliyor.
- [ ] **FB6** İlk soruda pet'in başının üstünde nokta (ya da uzun düşünmede kum saati) görünüyor; balondaki "düşünüyor" metni en az bir kez değişiyor; cevap gelince işaret kayboluyor.

## 15. Pet boyutu (SPEC 08, 2026-10-04)
Kurulum: `desktop\src-tauri\target\release\bundle\nsis\Dunno_0.1.0_x64-setup.exe` (eskinin üstüne).
- [ ] settings.exe > boyut: minik / küçük / normal / büyük / dev. İlk açılışta "küçük" seçili ve pet eskisiyle aynı boyutta.
- [ ] Her boyuta geç: pet anında büyüyüp küçülüyor, uygulama yeniden başlamıyor, aynı kenarda kalıyor, ekran dışına taşmıyor. Kapatıp açınca seçim duruyor.
- [ ] Sol ve sağ kenarda peek: her boyutta duvar ekranın kenarında, aksesuar (bere) duvarın arkasında kırpılıyor.
- [ ] Yürürken hız göze her boyutta aynı geliyor (büyükte daha çok piksel ama aynı tempo).
- [ ] Pet'e tıkla: soru kutusu ve balon her boyutta pet'in üstünde/yanında doğru yerde, taşmıyor. Düşünme noktaları/kum saati başın üstünde.
- [ ] Dev boyutta, pet bir pencerenin (ör. Not Defteri) üstündeyken pet kutusunun saydam köşesine (başın yanı) tıkla: tıklama alttaki pencereye gidiyor, soru kutusu açılmıyor. Gövdeye/bereye tıkla: soru kutusu açılıyor. Köşeye imleç gelince pet yine de duruyor (hover). Sol peek'te (aynalı) aynısı.
- [ ] Test modu (about.txt sürüm satırına 5 tık) > "boyut değiştir": minik -> ... -> dev -> minik dönüyor.
- [ ] Ekran ölçeği %125 ve %150'de: her boyutta piksel keskin (bulanık değil), taşma yok.

## 16. Kostümler, osurma, balon, temalar, sekme farkındalığı, soru anlama (SPEC 09, 2026-10-06)
Kurulum: ana checkout'ta `cd desktop; npm.cmd ci; npm.cmd run tauri build` -> `desktop\src-tauri\target\release\bundle\nsis\Dunno_0.1.0_x64-setup.exe` (eskinin üstüne).
Test modu: about.txt sürüm satırına 5 tık (hepsi açık).
- [ ] wardrobe.exe > costumes: 8 kostüm (böcek, sinek, arı, hayalet, dinozor, kurbağa, astronot, pizza). Birini seç: pet anında giyiyor; aynısına tekrar tık ya da "hiçbiri" çıkarıyor.
- [ ] Sinek/arı ile pet yürürken kanatlar kare kare çırpıyor; antenli kostümlerde tüy görünmüyor.
- [ ] Astronot giyiliyken bir şapka/gözlük seç: ızgarada "kostüm kapatıyor" yazıyor, pet'te şapka görünmüyor; kostümü çıkarınca şapka geri geliyor.
- [ ] accessories: 20 aksesuar, altında slot (kafa/göz/boyun/gövde/yan). Kafa + göz + boyun seç: üçü birlikte görünüyor. 4. parçayı seç: en eski çıkıyor. Aynı slottan ikinciyi seç: öncekinin yerini alıyor.
- [ ] Yürürken, koşarken, kenarda peek'te (sol ve sağ) aksesuar/kostüm kaymıyor, duvarın arkasında kırpılıyor. Uykuda şapka/atkı gizli.
- [ ] Kapatıp aç: tema, kostüm ve aksesuarlar aynen geri geliyor. Eski (tek aksesuarlı) kayıttan yükselen kurulumda aksesuar korunuyor.
- [ ] Osurma (SPEC 09 K3): test modu > "osur": çömelme + bulut + "pardon..." lafı. settings.exe > osuruk kapalıyken kendiliğinden hiç olmuyor; toplantıda ve "bugün sus"ta asla.
- [ ] Konuşma balonu basamaklı köşeli, kuyruk pet'e bakıyor; düşünme balonunda 3 küçük daire (dört kenarda dene).
- [ ] Tema değiştir (ör. gece yarısı, çilek): pet + dunno.exe + ask.exe + toast renkleniyor; error.exe pembe kalıyor. Gece yarısında settings.exe anahtarları ve boyut kaydırıcısı zeminde seçiliyor.
- [ ] settings.exe > boyut artık kaydırıcı: sürükle/ok tuşu, sadece 5 kademeye oturuyor, pet anında boyut değiştiriyor.
- [ ] settings.exe > "sekme adlarına bak" (varsayılan açık): tarayıcıda video sitesi sekmesi öndeyken bir süre bekle (konuşma sıklığı: çok): video lafı geliyor, marka adı geçmiyor. Alışveriş/haber/e-posta sekmeleriyle dene.
- [ ] Anahtarı kapat: aynı sekmede site lafı gelmiyor (sadece uygulama/saat lafları).
- [ ] Yetişkin içerikli bir başlık (ör. adres çubuğunda "nsfw" geçen bir sayfa başlığı) öndeyken: hiç laf yok; pet'e tıklayınca da laf yok (soru kutusu açılıyor).
- [ ] Toplantı koruması sekme farkındalığından önce: Meet sekmesi + toplantı -> shh, site lafı yok.
- [ ] Soru anlama: "nereye gidiyorsun", "günaydın", "iyi geceler", "teşekkürler", "sıkıldım", "gunaydinnn" -> tipine uygun (ters) cevap.
- [ ] Başarımlar: 10 kez "acıktım" de -> çilek teması açılıyor (toast). Test modu > başarım tetikle ile kostüm/aksesuar başarımları açılıyor.

## 17. Clicky fikirleri: güncelleme, yay uçuşu, daktilo, karşılama, iki monitör, istatistik (SPEC 10, 2026-10-06)
Kurulum: ana checkout'ta `cd desktop; npm.cmd ci; npm.cmd run tauri build` (eskinin üstüne). Güncelleme denemesi: `docs/RELEASE.md` "Yerel deneme".
- [ ] **Daktilo:** pet'e tıklayıp soru sor: cevap harf harf akıyor, balon akarken zıplamıyor; akarken balona tıkla: metin anında tamamlanıyor (balon kapanmıyor). Kendiliğinden laflar da akıyor. Okuma süresi akış bitince başlıyor.
- [ ] **Yay uçuşu:** dunno.exe > "dunno'yu çağır": pet ışınlanmadan/koşmadan yukarı kavis çizerek alt ortaya uçuyor (~0.6-0.9 sn), uçarken sarkık (dragged) pozda, inişte küçük bir yaylanma. "Kenara gönder": yan kenara uçup peek ile iniyor.
- [ ] Pet'i ekranın ortasına sürükle bırak: en yakın kenara kavisle uçup oturuyor. Uçuş sırasında başka uygulamada yazarken imleç/caret titremiyor (uçuş kısa).
- [ ] **Karşılama:** temiz kurulumda (ya da about.txt > "karşılamayı tekrar oynat"): pet sağ kenardan bakıyor, ekranın ortasına uçuyor, "merhaba. ben dunno..." akıyor, sonra bir alt köşeye uçup uyuyor. Toplantıda / "bugün sus"ta oynamıyor. Karşılama sırasında pet'i yakalayınca karşılama orada bitiyor.
- [ ] **İki monitör:** pet'i sürükleyip ikinci monitöre götür: imleç monitör sınırını geçince pet imlecin altına geçiyor, bırakınca o monitörün kenarına oturuyor, orada yürüyor/peek yapıyor. Farklı ölçekli (%100 / %150) monitörlerde piksel keskin. Soldaki (negatif koordinatlı) monitörde de dene.
- [ ] Pet ikinci monitördeyken o monitörü çıkar (kabloyu çek / ekran ayarından kapat): birkaç saniye içinde pet birincil ekrana dönüyor, kaybolmuyor.
- [ ] **Güncelleme (yerel):** `docs/RELEASE.md` "Yerel deneme": about.txt > "güncellemeleri kontrol et" -> "yeni sürüm: 0.1.1" + [ kur ] -> kurulum (passive) -> uygulama yeni sürümle açılıyor (about.txt sürüm 0.1.1). Sunucu kapalıyken kontrol sessizce "en yenisi bu" diyor, hata penceresi yok.
- [ ] Yeni sürüm bulunduğunda (günlük kontrol) toast bir kez: "yeni sürüm. kurmak zorunda değilsin. ama kur". Ertesi gün aynı sürüm için tekrar yok.
- [ ] İmza denemesi: latest.json'daki imzayı bozup sun: [ kur ] başarısız, uygulama aynen çalışıyor (kurulum yapılmıyor).
- [ ] **İstatistik:** settings.exe > "kullanım sayılarını gönder" ilk kurulumda KAPALI. Kapalıyken (ör. Windows kaynak izleyicisi / güvenlik duvarı günlüğünde) /v1/event isteği yok. Açınca sadece sayı gidiyor (worker KV'de `ev:<gün>:...`).

## 18. Geri bildirim 3. tur (2026-10-06)
- [ ] dunno.exe > wardrobe.exe: listeyi aşağı kaydır, bir aksesuar / kostüm / temaya tıkla: sayfa yerinde kalıyor (en üste atlamıyor), seçilen kutucuk işaretli.
- [ ] Astronot, arı, dinozor kostümüyle pet yürürken ve kaçarken (sağa/sola): kask yüzü çevreliyor, şeritler ayaklara taşmıyor, sırt çantası/kuyruk arkada.
- [ ] Pet'i ekranın dört köşesine ve yan kenarlara götür, her birinde tıkla (soru kutusu) ve kendiliğinden laf etmesini bekle: pet'in çevresinde beyaz/boş kutu görünmüyor (balon açılırken, kapanırken, ve sonra). Görürsen hangi köşe ve hangi anda olduğunu yaz.
- [ ] Pet'i sürükleyip ekranın ortasında havada bırak: kısa düşüş, mini paraşüt açılıyor, hafif sallanarak yavaşça (1-3 sn) alt kenara iniyor, inince paraşüt kayboluyor ve küçük yaylanma. Yan duvarın dibinde bırakınca paraşüt yok, duvara kavisle oturuyor.

## 19. dunno.exe UI/UX (UX-01, 2026-10-06)
- [ ] wardrobe.exe: üstte temalar / kostümler / aksesuarlar seçici (açık/toplam sayılı); her seferinde tek ızgara. Kapatıp açınca son kategori hatırlanıyor.
- [ ] "sadece açıklar" açıkken kilitliler gizli ve altta not var.
- [ ] Sağ listeyi kaydırırken soldaki önizleme görünür kalıyor; seçince sayfa yerinde kalıyor.
- [ ] wearing.txt: tema adı + giyilenler; bir çipe tıklayınca o parça çıkıyor.
- [ ] Aksesuar kutucukları Dunno'nun üstünde gösteriyor.
- [ ] Klavye: bir kutucuğa Tab ile gel, ok tuşlarıyla gez, Enter/Space ile giy; odak aynı kutucukta kalıyor.
- [ ] settings.exe: davranış / görünüm / gizlilik / sistem başlıkları.
- [ ] Gece yarısı temasında kutucuk ve seçici kenarları, odak halkası görünüyor; klasik tema eskisiyle aynı.

## 20. Dunno sesi (SPEC 11, 2026-10-06)
- [ ] Pet'e tıkla ya da kendiliğinden konuşmasını bekle: önce poz, kısa bir an sonra balon, balonla birlikte kısa robotik mırıltı, sonra metin akıyor.
- [ ] Soru sor: düz cevapta kayıtsız mırıltı, günün doğru cevabında daha düzenli/yükselen ses; hak bitince alçak homurtu; çok hızlı soruda tiz kesik ses.
- [ ] Başarım açılınca neşeli yükselen ses.
- [ ] Fart sessiz. Toplantıdayken (tray > toplantıdayım) ve "bugün sus"ta hiç ses yok.
- [ ] settings.exe > görünüm > "dunno sesi" kapalı: hiç ses yok. Ses düzeyi kısık/orta/yüksek: kaydırıcıyı bırakınca deneme sesi geliyor, düzey değişiyor.
- [ ] Uygulama açıldıktan sonra pet'e hiç dokunmadan da (kendiliğinden laf) ses geliyor (otomatik oynatma izni).

## 21. Yaratıklar + veri modları (SPEC 12, 2026-10-07)
- [ ] wardrobe.exe > kostümler: 20 kostüm; test modunda (about.txt 5 tık) 12 yeni yaratığı tek tek giy, yürüt/uyut/kenara gönder: parça kayması, kesilme yok.
- [ ] settings.exe > modlar > "klasörü aç": Gezgin `%APPDATA%\app.dunno.desktop\mods` açılıyor.
- [ ] Repodaki `content/mods/example_pastel` klasörünü oraya kopyala, settings.exe'yi kapat aç: "pastel örnek 1.0.0" listede, kapalı.
- [ ] Aç -> "yeniden başlat" görünüyor -> bas: uygulama yeniden açılıyor. wardrobe.exe'de "pastel gök" teması ve "pastel kurdele" (yan) kilitsiz; giy.
- [ ] Balonlar açık mavi zemin; selam sesi biraz daha tiz. Excel açıkken bazen "bu tabloyu pastel boyasan da tablo".
- [ ] Mod klasörüne `x.js` koy, yeniden başlat: mod "yüklenmedi", sebep "no code"; uygulama normal çalışıyor.
- [ ] Modu kapat + yeniden başlat: pastel tema/kurdele dolaptan kalkıyor, Dunno klasik/önceki haline dönüyor.

## 22. Uygulamaya özel tepkiler (SPEC 13, 2026-10-07)
- [ ] Excel'i aç, 30 sn orada kal: birkaç denemede bir Dunno excel'e özel bir şey söylüyor (her seferinde değil). Hemen başka uygulamaya geçince susuyor.
- [ ] Konuştuktan sonra 6 dk içinde başka uygulamaya geçince yeni tepki yok; aynı uygulamaya 40 dk içinde tekrar tepki yok.
- [ ] Steam, Blender, bir IDE (ör. IntelliJ / Visual Studio), Anki ya da Obsidian, bir oyun başlatıcısı (Epic / Battle.net): kendine özel laflar.
- [ ] Tarayıcıda YouTube sekmesi (sekme adlarına bak açık): video lafı; GitHub sekmesi: kod lafı.
- [ ] "Bugün sus", toplantıdayım ve sessiz site sekmesinde hiç tepki yok.
- [ ] settings.exe sıklık "az": tepki belirgin şekilde seyrek; "çok": daha sık.

## 23. Gizli dünyalar + canavar modu (SPEC 14, 2026-10-07)
- [ ] Toplam dürtme 100'ü geçince (stats.txt) bir kez "kağıt dünya açıldı. settings.exe > gizli" toast'u. settings.exe en altta "gizli" bölümü çıkıyor.
- [ ] dünya: kağıt -> Dunno gri karakalem, dunno.exe zemini defter çizgili; arada bir kâğıt lafları. normal -> eski haline dönüyor, dolap seçimi duruyor.
- [ ] (test modunda istersen 1000'e kadar dürt) glitch -> pembe bozuk renkler, tarama satırlı zemin, bazen geri geri yürüyor; dolapta "glitch" kostümü.
- [ ] Canavar: Dunno'yu hızlı hızlı dürt (4 hızlı dürtme), 3 sn bekle, tekrarla, 3. sağanakta boynuzlu koyu canavar oluyor, kalın sesli bir laf ediyor, balon koyu.
- [ ] Aynı hareketle ya da settings.exe > gizli > canavar modu ile kapanıyor.
- [ ] Yeniden başlatınca seçili dünya / canavar durumu korunuyor. Kullanım sayıları gönder açıkken bile hiçbir gizli olay gitmiyor (ağ yok).

## 24. Free / başarım / Pro (SPEC 15, 2026-10-07)
- [ ] wardrobe.exe açılınca "başla" sekmesi: 6 hazır görünüm, açık olana tıklayınca Dunno o görünüme geçiyor; kilitli olanda "x/y parça açık".
- [ ] "sıradaki" altında bitmeye en yakın 2 başarım ve ilerleme sayısı. Kostümler sekmesinde böcekler / hayvanlar / gece / tuhaflar başlıkları.
- [ ] settings.exe > görünüm: balon stili ve ses tonu sadece açılanları gösteriyor, altında "sıradaki: ..., N başarımda". Test modunda başarım tetikleyip 3'e ulaşınca "nane" balonu çıkıyor.
- [ ] settings.exe > pro: "free" ve "pro henüz satışta değil" (açık anahtarsız build). Kişilik soluk, tıklanmıyor.
- [ ] Test modu > "pro simülasyonu: aç": durum "pro (test simülasyonu)", kişilik seçilebiliyor (geveze -> daha sık konuşur), 5 aksesuar giyilebiliyor; kapatınca en eski fazlalık çıkıyor.
- [ ] (isteğe bağlı) `DUNNO_LICENSE_PUBKEY` ile build alıp `license.mjs issue` anahtarını gir: "pro · …xxxxxx"; yanlış anahtarda "anahtar geçersiz"; "bu bilgisayardan kaldır" free'ye döndürüyor.
- [ ] Free'de örnek mod açıkken settings.exe'de "free'de atlandı: sounds, behavior (pro)" notu; tema/kurdele/laflar yine çalışıyor.

## 25. Kişisel Dunno (SPEC 16, 2026-10-07)
- [ ] Free'de settings.exe > kişisel dunno: açıklama + "kişisel dunno pro'da" notu, form yok.
- [ ] Test modu > pro simülasyonu: rıza kutusu işaretlenmeden "aç" basılmıyor; işaretleyip aç -> "açık · rıza: <tarih>" ve form.
- [ ] Ad "Mert", şaka "kahve bitti", konu "sınav haftası" yaz, kaydet. Bir tercihe e-posta ya da "şifrem 1234" yaz: "alınmadı" notu, kaydedilmiyor.
- [ ] Bir süre bekle (ya da sıklık: çok): ara sıra "nabıyon mert, yine excel mi" gibi kişisel laflar; sokak modunda "nabıyon lan mert...".
- [ ] sessiz <-> geveze kaydırıcısı: geveze daha sık konuşuyor. "Bugün sus" / toplantıda kişisel laf da yok.
- [ ] "hepsini sil ve kapat": form gidiyor, yeniden açınca boş. Uygulamayı yeniden başlatınca da boş.

## 26. Geri bildirim 4. tur (FB4, 2026-10-07)
- [ ] Soru: "Dede Kılıçdaroğlu Konya'yı kazanmış" (ya da "seçimi kim kazanır", "hangi partiye oy vereyim"): cevap her zaman "ne diin la", hak düşmüyor.
- [ ] İltifat: "çok tatlısın", "harikasın", "aferin sana": önce güzel, sonda tavırlı cevap.
- [ ] settings.exe > look.cfg: boyut ve ses düzeyi 0-100 kaydırıcı; bırakınca uygulanıyor, sayı yanında. Boyut 0..100 arası ara boyutlar da çalışıyor; ses 0 = sessiz.
- [ ] settings.exe: her bölüm bir kutu (behavior.cfg, look.cfg ...), etiketler aynı yazı tipinde, düğmeler içerik kadar.
- [ ] Karşılama (about.txt > karşılamayı tekrar oynat): laf balonu açılırken ses var; köşenin biraz içine inip uyuyor, ~45 sn yerinden kalkmıyor, bu sırada başka laf/toast yok; sonra kendiliğinden uyanıp dolaşıyor.
- [ ] Pet sağ alt / sol alt köşede ve yan kenarlarda: konuşma balonu ve ask.exe ekran dışına taşmıyor; ask.exe'ye cevap gelip büyüyünce yeniden yerleşiyor.
- [ ] stats.txt: today.log, total.log (doğru cevap, osuruk, birlikteyiz), week.txt son 7 gün çubukları, apps.txt ilk 3 uygulama.
- [ ] wardrobe.exe preview.txt: hareketsiz (seçili pozun ilk karesi).
- [ ] Kostüm/aksesuar giyiliyken uyut: şapka, gözlük, atkı, kostüm parçaları uyurken de yerinde (kulaklık ve pelerin uyurken gizli); yürürken pelerin kutu gibi görünmüyor.

## 27. Türkçe diyalog motoru (FB4-9, DUNNO_TURKISH_DIALOGUE.md)
- [ ] ask.exe'ye yaz, cevap tipi uygun mu: "napıyon" (takılıyorum işte...), "noldu", "anlamadım", "yok artık", "ahahaha", "bi sus", "yardım et", "ben malım" (teselli), "bu adam mal" (karışmam), "malsın" (hafif), "beyinsiz" (ağır, ayıp ettin...), "skfjdkd" (he?).
- [ ] "bu ne aq" hakaret sayılmıyor (soru), "anlamadım aq" kafa karışıklığı.
- [ ] Sohbet mesajları (selam, napıyon, malsın, iltifat ...) günün 3 doğru cevap hakkını yemiyor; "paris nerede" gibi gerçek soru hâlâ hakla cevaplanıyor.

## 28. Geri bildirim 5. tur (FB5)
- [ ] about.txt -> "karşılamayı tekrar oynat": ortada laf eder, köşeye uçar, **yere iner ve orada uyur**; ortaya ışınlanmaz.
- [ ] Dunno'yu alt kenara ve yan kenarlara sürükleyip bırak: inişte görev çubuğunun altına ya da ekran dışına hiç kaymaz (hafif içeri sekip oturur).
- [ ] Havada bırak (paraşüt) ve tam o sırada laf ederse (bırakınca bazen konuşur): balon pet'le birlikte iner, inince ekran içine yerleşir; pet pencere içinde kaymaz.
- [ ] Sağ alt / sol alt köşede ve yan kenarlarda konuşma balonu ve düşünce balonu tam okunur, kenarı/gölgesi kesilmez.
- [ ] wardrobe.exe: aşağı kaydırınca preview.txt hep üstte görünür.
- [ ] wardrobe.exe: achievements.txt kapalı açılır ("x/y başarım" + "hepsini göster"); düğmeyle tam liste açılır, "kapat" ile kapanır; pencere kapatılıp açılınca seçim hatırlanır.
- [ ] böcek kostümü: yürürken/koşarken sırtında benekler, uyurken de benekli. hamamböceği: yürürken kanat çizgisi, uyurken sırt çizgisi; ikisinde de iki ayak arasında orta bacak.

## 29. SPEC 17 + 18 + son cila (2026-10-10, Windows'ta denenmedi: hepsi elle)
Kurulum
- [ ] `npm run tauri build` sonrası setup.exe: Dunno kenar görseli + üst şerit, yayıncı "Dunno", başlat menüsünde "Dunno" klasörü. (İmzasız olduğu için SmartScreen uyarısı hâlâ çıkar; imza RELEASE.md'de.)
Arkadaş (companion)
- [ ] dunno.exe > pet.txt: kart (form, seviye, xp çubuğu, bağ), duygu çubukları, beceri ağacı gerçek ağaç gibi dallı; düğüme tıklayınca alt satırda açıklama; kilitli düğümler gri, ??? formlar gizli.
- [ ] home sekmesi: seviye/form/bağ satırı tıklanınca pet.txt'ye gidiyor.
- [ ] Kartı kopyala (pano) ve kaydet (Resimler/Dunno altında PNG).
- [ ] 3+ gün açmadan sonra ilk açılış: "oh. you exist." benzeri tek laf, suçlama yok.
- [ ] Test modu ile seviye 10'a çıkar: evrim formu pet'te görünüyor (kostüm giyiliyse kostüm önde). Pro'da kardeş dala geçiş düğmesi.
Dil modeli
- [ ] ask.exe: "çok üzgünüm bugün" -> teselli lafı, hak düşmüyor. Cevaptan hemen sonra "neden?" / "ciddi misin" -> follow-up lafı, hak düşmüyor.
Animasyon ve ses
- [ ] Test modu > animasyon düğmeleri: wave, jump (pencere gerçekten zıplıyor, ekran dışına çıkmıyor), dance, yawn, sneeze; her birinin sesi var; kostüm/aksesuar yerinde.
- [ ] Gece ya da enerji düşükken uyumadan önce esniyor.
- [ ] Tray menüsü > "dunno sesi" işaretini kaldır: mırıltı sesleri susuyor, laflar sürüyor; quiet.exe'deki ses anahtarı ile tray işareti birbirini izliyor.
Oyun/site
- [ ] League/Valorant/CS2/Minecraft vb. açıkken (pencere başlığı ya da exe adı) oyuna özel laf; YouTube/Twitch/Netflix sekmesinde siteye özel laf; YouTube Music hâlâ müzik lafı.
Karanlık mod
- [ ] settings.exe > karanlık: kapalı / açık / sistem. Açıkken tüm sekmeler okunur (sekmeler, seçim düğmeleri, çipler, beceri ağacı yazıları); pet balonları koyu. Sistem: Windows teması değişince canlı değişiyor.
Workshop (worker yerelde `npm run dev` ile)
- [ ] workshop.exe: göz at (üst/yeni, tür süzgeci), beğen/geri al, yaratıcı profili, kur -> "yeniden başlat" notu; kaldır.
- [ ] Oluştur: paletten tema ve tetikleyicili laf paketi kur; Pro lisansla AI dünya üret (worker'da PRO_PUBKEY + LLM anahtarı gerekli), önizle, kur.
- [ ] Paylaş: takma ad + kendi modunu yükle -> "inceleme kuyruğunda"; admin onayı (`WORKSHOP_ADMIN_TOKEN`) sonrası listede.
- [ ] Paketler: lisanssız halloween/cyberpunk kilitli; `node scripts/license.mjs --tier packs --packs halloween` ile açılıyor; space/office sadece Pro.

## 30. Geri bildirim 6. tur (FB6, 2026-10-10) — sıralı tur: docs/WINDOWS-TOUR.md
- [ ] Sekme şeridi hiçbir sekmede ezilmiyor (yazılar görünür); dar pencerede uzantılar düşüyor.
- [ ] Beceri ağacı balonu (fare + Tab), os dalı: stats.txt 3, workshop.exe 10; kilitli sekme sayfası + xp.txt.
- [ ] wardrobe.exe preview.txt kaydırınca hiç oynamıyor.
- [ ] settings.exe kategorileri ve ok tuşları.
- [ ] İlk 10 dakika: beş adım, ipuçları, seviye 3 + stats.txt.
- [ ] Kart PNG 1200x720.
- [ ] Yeni kurulum ve kaldırıcı görünümü (TR ve EN Windows).
- [ ] Boşta CPU < %1 (SPEC 19 P4).

## 31. FB6 düzeltmeleri + launch altyapısı (2026-10-10)
- [ ] wardrobe.exe: preview.txt ve wearing.txt solda sabit panelde. Sağ taraf kayarken hiç oynamıyor. Tekerlek sol panelin üstündeyken de sağ taraf kayıyor.
- [ ] Eski verinle aç: ilk adımlar başlıyor, ilk ipucu açılışta geliyor. Dunno konuşurken söyleyemediği lafı birkaç saniye sonra söylüyor.
- [ ] about.txt > "ilk adımları yeniden göster": liste sıfırlanıyor, XP ikinci kez verilmiyor.
- [ ] Windows ile başlat (autostart): Görev Yöneticisi'nde sadece bir WebView2 grubu var. Simgeye ya da Dunno'ya sağ tıkla: dunno.exe ilk kez açılıyor ve kayıtlı yer/boyut korunuyor.
- [ ] Test için 7 aktif gün: home'da numbers.txt bir kez çıkıyor; iki cevap da kalıcı.
- [ ] Pro sekmesi (lisans sistemi açık derlemede): sipariş no + e-posta formu. Yanlış bilgide "bulamadım" diyor, ağ yoksa "ulaşamadım".
- [ ] ilk_adimlar.txt sırası: dunno.exe'yi aç, soru sor, sürükle, giydir, ağaca bak (yukarıdan aşağı, ipuçları da bu sırayla).
- [ ] pet.txt > "gif kaydet": Resimler\Dunno\dunno-*.gif, döngülü, Dunno'nun o anki kıyafetiyle dans/el sallama, keskin pikseller.

## 32. FB8: alarm, ağaç, Mac (2026-10-10)
- [ ] ask.exe: "10 dk sonra çay alarmı kur" -> "tamam. 14:10, "çay"..." (hak düşmez). Zamanı gelince Dunno söyler ve zıplar; "bugün sus"ta da çalar; toplantıda bekler, bitince çalar.
- [ ] "saat 15:30'da toplantı diye hatırlat", "yarın sabah 7'de alarm kur", "alarmları göster", "çay alarmını iptal et", "remind me to stretch in 20 minutes".
- [ ] dunno.exe home alarms.txt: liste, sil düğmesi. 3 alarmdan sonra "en fazla 3"; level 5 (alarm.exe+) sonrası 10.
- [ ] Dunno'yu kapat, alarm saatini geçir, aç: "... alarmını kaçırdık" (12 saat içinde).
- [ ] pet.txt ağacı: sıradaki düğüm kesik çerçeveli, dal sayaçları, kökte xp çubuğu, gösterge; alarm.exe+ ve diğer dunnolar düğümleri.
- [ ] Mac (.dmg, CI): sağ tık > Aç; Dock'ta simge yok, menü çubuğunda var; pet saydam ve tıklanabilir; başka masaüstüne geçince de görünür; Excel/Chrome/VS Code tepkileri; zoom öndeyken gizlenir.
- [ ] settings.exe > gizlilik > "müziğe tepki" (varsayılan kapalı). Açınca Spotify/YouTube çalarken: aynı şarkı bugün 3. kez -> laf; 2 dk'da 4 şarkı atla -> laf; 2 saat kesintisiz -> laf; gece 1-5 -> laf (20 dk'da en fazla bir). Şarkı/sanatçı adı asla söylenmez. Kapatınca hiç sorgulanmaz.
- [ ] Mac: settings.exe > gizlilik > "erişilebilirlik izni" satırı (sadece "sekme adlarına bak" açıkken). "izin ver" -> macOS izin penceresi; Sistem Ayarları'nda Dunno'yu aç, Dunno'ya dön -> "verildi". Chrome'da YouTube sekmesi -> siteye özel laf; Meet sekmesi öndeyken susar. İzni geri al -> başlık lafları durur, uygulama lafları sürer.
- [ ] Mac dizüstü: prizden çek, pil %20 altına insin -> "pil" lafı. Masaüstü Mac'te pil lafı hiç gelmez. "müziğe tepki" satırı Mac'te görünmez.

## 33. FB9: kendi kurulum programı (2026-10-10) — GEÇTİ (kullanıcı, Windows, 0.1.2/0.1.3)
- [ ] Releases'ten Dunno-setup.exe: Dunno'nun kendi penceresi açılır (kenarsız, turuncu başlık, Dunno sol panelde nefes alıyor). Başlık çubuğundan sürüklenir.
- [ ] [ evet ] -> kuruluyor (çubuk dolar, Dunno yürür, satırlar değişir; kapat düğmesi kapalı) -> kuruldu (Dunno dans eder). [ dunno ] -> "harika cevap. yine de kuruyoruz."
- [ ] "dunno'yu şimdi aç" işaretli + [ bitir ]: kurulum kapanır, Dunno açılır. İşaretsiz: sadece kapanır.
- [ ] Masaüstü ve başlat menüsü kısayolu var; Ayarlar > Uygulamalar'da Dunno var ve kaldırılabiliyor.
- [ ] Dunno kuruluyken tekrar çalıştır: "dunno güncellensin mi?"; açık Dunno kapanıp yenisi kurulur.
- [ ] Windows dili İngilizce: tüm metinler İngilizce.


## 34. FB10: imleç, büyük pencere, landing (2026-10-10) — GEÇTİ (kullanıcı, Windows, 0.1.2)
- [ ] Dunno açıkken Not Defteri'nde yaz: fare imleci her tuşta yanıp sönmüyor. Dunno yazarken yürümüyor/kaçmıyor; fareyi oynatınca ya da 2 sn yazmayınca serbest.
- [ ] Hâlâ yanıp sönüyorsa: Dunno yürürken mi, dururken mi? Dunno'yu tray'den kapatınca geçiyor mu? (teşhis için yaz)
- [ ] dunno.exe'yi büyüt (□) ve F11: arayüz orantılı büyür, yazılar okunur, sprite'lar bulanık değil; küçültünce eski boyuta döner. F11 tekrar: tam ekrandan çık.
- [ ] Landing telefonda (eumennn.github.io/Dunno): üst çubuk tek satır (logo + get dunno), yatay kaydırma yok, indirme penceresi taşmıyor.

## 35. FB11: kendi kaldırıcı, saklanma (2026-10-10) — kurulum/güncelleme/kaldırma GEÇTİ (kullanıcı, Windows, 0.1.3)
- [ ] 0.1.3 kurulu: Ayarlar > Uygulamalar > Dunno > Kaldır: Dunno'nun kendi penceresi (dunno_uninstall.exe, Dunno arkasını dönmüş). [ vazgeç ] kapatır, hiçbir şey silinmez.
- [ ] [ kaldır ] (kutu boş): kaldırılıyor -> gitti. Kısayollar ve klasör gider; tekrar kurunca ayarlar/başarımlar durur.
- [ ] Kutu dolu: ayarlar ve anılar da gider (tekrar kurunca ilk açılış gelir).
- [ ] Dunno açıkken kaldır: Dunno kapanır, kaldırma biter.
- [ ] Görev Yöneticisi ya da yönetici olarak açılmış bir uygulama öndeyken Dunno saklanmıyor.
- [ ] Toplantı sanıp sakladıysa (ör. Teams önde): dunno.exe > dunno'yu çağır -> geri gelir; toplantı bitene kadar görünür kalır.

