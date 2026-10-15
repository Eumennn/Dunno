# Windows manuel turu (yaklaşık 45 dakika)

Amaç: launch öncesi gerçek bir Windows makinede her şeyi bir kez baştan sona denemek. Bu tur, otomatik testlerin göremediği
pencere, imleç, kurulum, ses ve performans gibi işleri kapsar. Her adımın sonunda tabloya ✓ ya da kısa bir not yaz.
Bir şey bozuksa ekran görüntüsünü ve saatini not al. Ayrıntılı maddeler `orchestrator/notes/desktop-manual-test.md` 16-30. bölümlerde.

> Kural: test için bilgisayarda fare/klavye taklit eden betik çalıştırma. Her şeyi elle yap.

## 0. Hazırlık (5 dk)

```powershell
cd C:\Users\pc\Downloads\Dunnothebean
git pull origin claude/focused-galileo-ty4nlf
cd desktop
npm.cmd install
npm.cmd run tauri build
```

- Temiz kurulumu denemek için eski verini **silme, yeniden adlandır**: `%APPDATA%\app.dunno.desktop` → `app.dunno.desktop.yedek`.
  Tur bitince geri adlandırırsın.
- Görev Yöneticisi'ni açık tut. Performans adımında kullanılacak.

## 1. Kurulum (5 dk)
- `src-tauri\target\release\bundle\nsis\Dunno_0.1.0_x64-setup.exe`. SmartScreen uyarısı beklenir, çünkü kod imzası henüz yok.
- Sayfalar:
  - karşılama: krem zemin, solda Dunno, marka dilinde metin;
  - "nereye koyalım";
  - kuruluyor: turuncu ilerleme çubuğu;
  - "kuruldu. dunno masaüstünde".
- Başlat menüsü sayfası gelmemeli. Yazılar okunur olmalı, beyaz kutu ya da çizgi artığı olmamalı.
- Bitişte "dunno'yu şimdi uyandır" işaretliyse Dunno açılır.

## 2. İlk 10 dakika (10 dk)
- Karşılama: ortada laf eder, köşeye uçar, iner ve uyur.
- Yaklaşık 1 dakika sonra ilk ipucu gelir ("bana tıkla, bir şey sor..."). Sırayla şunları yap:
  1. soru sor;
  2. sürükle;
  3. Dunno'ya sağ tıkla ya da saatin yanındaki simgeye tıkla (dunno.exe açılır);
  4. wardrobe.exe'de bir şey giydir;
  5. pet.txt'ye bak.
- Her adımdan sonra Dunno sıradakini söylemeli. dunno.exe home'daki `ilk_adimlar.txt` kutuları dolmalı.
- Beşinci adımdan sonra "ilk adımlar bitti" lafı ve toast çıkmalı. Seviye 3 olmalı ve stats.txt kilidi açılmalı.
- Hiçbir şey yapmazsan ipucu en sık 3 dakikada bir gelmeli; boştayken hiç gelmemeli.

## 3. dunno.exe (10 dk)
- Sekme şeridi: yazılar hiçbir sekmede kaybolmamalı. Pencereyi daraltınca ".exe/.txt" uzantıları düşer ve sekme adları kesilmez.
- workshop.exe sekmesinde "lv 10" etiketi görünmeli. Tıklayınca kilit sayfası ve xp.txt açılmalı.
- pet.txt: beceri ağacında düğümlerin üstüne gel. Çıkan balonda ne açtığı, hangi seviyede açıldığı ve kaç seviye kaldığı yazmalı. Tab tuşuyla da çıkmalı.
- wardrobe.exe: aşağı kaydır. preview.txt **hiç oynamamalı**.
- settings.exe:
  - solda menü: genel / görünüm / ses / gizlilik / pro / modlar;
  - ok tuşlarıyla gezilebilmeli;
  - pencere kapatılıp açılınca seçili kategori hatırlanmalı.
- Karanlık mod açık / sistem: bütün sekmeler okunur olmalı.
- pet.txt > kartı kaydet: `Resimler\Dunno\dunno-card-*.png` **1200x720** olmalı ve keskin görünmeli.

## 4. Pet ve konuşma (8 dk)
- Ekranın kenarlarına ve alt köşelere sürükle. Görev çubuğunun altına inmemeli, balon kesilmemeli.
- Çoklu monitörde sürükleyerek diğer ekrana geçir.
- ask.exe'de şunları dene: "napıyon", "çok üzgünüm", ardından "neden?". Günde 3 doğru cevap hakkı.
- Test modu (about.txt > sürüm satırına 5 tık):
  - wave / jump / dance / yawn / sneeze;
  - osuruk;
  - kenar testleri.
- Tray > "dunno sesi": işareti kaldırınca mırıltılar susmalı, laflar sürmeli.

## 5. Uygulama ve oyun tepkileri (5 dk)
- Excel / VS Code / tarayıcıda YouTube, Twitch, Netflix: kategoriye uygun laf gelmeli (sıklık: çok).
- Yüklü bir oyunu aç (örnek: League, Valorant, Minecraft): oyuna özel laf gelmeli.
- Toplantı uygulaması açıkken susmalı.

## 6. Performans (5 dk + 8 saat)
- Dunno dinlenirken 5 dakika boyunca Görev Yöneticisi > Ayrıntılar'a bak: `dunno.exe` ve `msedgewebview2.exe` toplamı.
  - CPU %1'in altında olmalı;
  - bellek 120 MB'ın altında olmalı.
- Aynı ölçümü Dunno yürürken ve dunno.exe açıkken de yap.
- Bilgisayarı bir iş günü açık bırak. Bellek 30 MB'tan fazla artmamalı.

## 7. Kaldırma (2 dk)
- Ayarlar > Uygulamalar > Dunno > Kaldır. Kaldırıcı aynı görünümde olmalı ("dunno'yu kaldır").
- "uygulama verilerini sil" işaretlenmezse veriler kalmalı.
- Tur bitince `%APPDATA%\app.dunno.desktop.yedek` klasörünü geri adlandır.

## Sonuç tablosu

| Adım | Sonuç | Not |
|---|---|---|
| 1 Kurulum | | |
| 2 İlk 10 dakika | | |
| 3 dunno.exe | | |
| 4 Pet ve konuşma | | |
| 5 Tepkiler | | |
| 6 Performans (CPU / MB) | | |
| 7 Kaldırma | | |
