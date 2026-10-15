# SPEC 19: macOS sürümü + performans

Durum: performans (P1-P3, P5'in bir kısmı) uygulandı. macOS: M1 (derleme: Linux'tan `cargo check`/`clippy` aarch64-apple-darwin temiz, CI'da dmg), M2 (Dock simgesi yok, Spaces, saydamlık), M3 (paket kimliği -> uygulama), M4 (başlık okuma, Erişilebilirlik izni: settings.exe > gizlilik "izin ver"; izin yoksa ya da ayar kapalıysa başlık okunmaz; toplantı sekmesi ipucu da), M5 (boşta kalma, pil IOKit, toplantı uygulaması) ve M7'nin bir kısmı (ayar adı) yapıldı. Kalan: M6 imza/notarization (Apple hesabı), M8 gerçek Mac'te manuel test, Mac'te müzik tepkisi (Windows'a özel sistem medya kontrolü; Mac'te genel API yok).
Neden: launch kitlesinin önemli kısmı (Reddit, HN, Product Hunt) Mac kullanıyor. "Pil yiyor" yorumu da masaüstü pet'lerde
kaldırılma sebebi olarak en başta geliyor.

## Kapsam dışı
- Linux sürümü. Sonra düşünülür; Wayland'da her zaman üstte duran saydam pencere sorunlu.
- Mobil.

---

## A. Performans (P)

Hedef (Windows, orta laptop, pet boşta, dunno.exe kapalı): ortalama CPU < %1, bellek < 120 MB (iki WebView2 süreci dahil),
uyanma sayısı saniyede ~15'in altında.

### P1. Pet kare döngüsü (yapıldı)
- `desktop/src/pet/frame-rate.ts`: Dunno dinlenirken saniyede ~12 kare çizilir (zamanlayıcıyla). Şu durumlarda ekran hızına
  (requestAnimationFrame) dönülür:
  - yürüyorsa, uçuyorsa, iniyorsa ya da sürükleniyorsa;
  - bekleyen bir tepki varsa;
  - fare üstündeyse;
  - dinlenme bitmek üzereyse.
- Fare basılınca ve hareket edince döngü hemen uyanır (`wake`). İlk temasta gecikme olmaz.
- Testler `frame-rate.test.ts` içinde. `PetController.busy` hangi durumların hızlı kare istediğini belirler.

### P2. dunno.exe kare döngüsü (yapıldı)
- Pencere gizliyken (kapat = gizle) saniyede bir uyanır.
- Görünürken sadece pet çizen sekmelerde (home, wardrobe, pet.txt) ~12 fps çizer.
- pet.txt kartı yarım saniyede bir yenilenmeye devam eder.

### P3. İmleç yoklaması (yapıldı)
- `window.rs::poll_delay`: imleç pet'in ve balonların 160 px çevresindeyse ya da sürükleme sürüyorsa yoklama 33 ms'de bir yapılır.
  Uzaktaysa 100 ms'de bir.
- Monitör değişimi kontrolü de buna bağlı olarak 1-3 saniyede bir yapılır.
- Test: `cursor_poll_slows_down_far_from_the_pet`.

### P4. Ölçüm (yapılacak, Windows)
- Görev Yöneticisi > Ayrıntılar: `dunno.exe` ve `msedgewebview2.exe` alt süreçleri. Şu durumların her birinde 5 dakika:
  - boşta;
  - yürürken;
  - dunno.exe açık (wardrobe sekmesi).
- Ölçümler: CPU ortalaması, çalışma kümesi (MB), GPU (Görev Yöneticisi GPU sütunu).
- 8 saat açık bırakma: bellek artışı < 30 MB olmalı (sızıntı kontrolü).
- Sonuçlar `orchestrator/notes/perf-<tarih>.md` dosyasına yazılır.

### P5. Sonraki adaylar (ölçüme göre)
- **(yapıldı)** dunno.exe penceresi ilk açılışta oluşturuluyor (`"create": false` + `open_app_window` içinde `from_config`).
  Windows ile başlatılıp hiç açılmazsa ikinci WebView2 hiç yüklenmez. Bu yaklaşık 30-50 MB demek.
  Komut async: Windows'ta senkron komuttan pencere oluşturmak kilitlenir.
- Laf havuzu (2 x 2385 laf) açılışta tek seferde ayrıştırılıyor. Dile göre tembel yükleme yapılabilir (~150 KB tasarruf).
- Kostüm ve aksesuar katmanı önbelleği: her kıyafet değişiminde sprite sayfası yeniden boyanmasın (renderer önbelleği).
- `watch.rs` 500 ms yoklama: başlık ve süreç okuma ön pencere değişince yapılsın (WinEvent hook `EVENT_SYSTEM_FOREGROUND`).
  Bu, süreki yoklama yerine olay odaklı çalışma demek.

---

## B. macOS sürümü (M)

Yığın aynı kalır: Tauri 2, macOS'ta WKWebView kullanır. TS katmanı platformdan bağımsız. Rust'taki Windows'a özel parçaların
macOS karşılığı yazılır (`#[cfg(target_os = "macos")]`). Şu an Windows dışı için boş yedekler var; Linux'ta derlenip test ediliyor.

| Windows parçası | macOS karşılığı | Not |
|---|---|---|
| Saydam, kenarsız, her zaman üstte pet penceresi | Tauri `transparent` + `macOSPrivateApi: true`, `alwaysOnTop`, `visibleOnAllWorkspaces` | Tam ekran uygulamaların üstünde görünmesi için pencere seviyesi `NSStatusWindowLevel` |
| Tıklama geçirgenliği (`set_ignore_cursor_events` + imleç yoklama) | Aynı Tauri API'si çalışıyor; imleç `NSEvent.mouseLocation` (objc2) | Koordinat sistemi alttan yukarı: `monitors.rs` dönüşümü test edilmeli |
| Görev çubuğu / çalışma alanı | `NSScreen.visibleFrame` (menü çubuğu + Dock hariç) | Tauri `Monitor::work_area` macOS'ta destekleniyor mu kontrol edilmeli |
| Ön uygulama (exe adı) | `NSWorkspace.frontmostApplication` bundle id (`com.microsoft.Excel`) | `content/context/sites.json` içine `bundles` alanı (exe'lere paralel) |
| Pencere başlığı (sekme adı) | Accessibility API (`AXUIElement`, `kAXTitleAttribute`) | **İzin ister** (Sistem Ayarları > Gizlilik > Erişilebilirlik). Varsayılan kapalı; açıkken izin akışı ve açıklama gösterilir. İzin yoksa sadece uygulama düzeyi |
| Boşta kalma süresi (`GetLastInputInfo`) | `CGEventSourceSecondsSinceLastEventType` | İzin istemez |
| Toplantı algılama (süreç listesi) | `NSWorkspace.runningApplications` + kamera/mikrofon kullanımı yok (izin ister, yapılmaz) | Sadece uygulama adı (zoom.us, Teams) |
| Pil | IOKit `IOPSCopyPowerSourcesInfo` | |
| Tray | Menü çubuğu simgesi (Tauri tray aynı API) | Şablon (template) simge: tek renk siyah, macOS koyu/açık temaya kendi uyar |
| Otomatik başlatma | `tauri-plugin-autostart` LaunchAgent | |
| Kurulum (NSIS) | `.dmg` (sürükle-bırak) | DMG arka planı Dunno görünümünde (`bundle.macOS.dmg.background`) |
| İmza (Trusted Signing) | Apple Developer ID imzası + **notarization** (`xcrun notarytool`) | Notarize edilmemiş uygulama Gatekeeper'da açılmaz. Yıllık 99 USD |
| Güncelleme | Aynı updater; `latest.json`'a `darwin-aarch64` ve `darwin-x86_64` | Universal binary (`--target universal-apple-darwin`) |
| Kart kaydet (Resimler/Dunno) | `picture_dir` aynı; `explorer /select` yerine `open -R` | |

### İş sırası
1. **M1. Derleme:** macOS'ta `cargo check`. Windows dışı yedekleri `cfg(target_os = "macos")` ile gerçek koda bağla. CI'a `macos-14` koşucusu ekle.
2. **M2. Pencere:**
   - saydam pet + tıklama geçirgenliği + her zaman üstte + tüm masaüstlerinde (Spaces) görünür;
   - Dock simgesi gizli (`LSUIElement` / `ActivationPolicy::Accessory`). Dunno sadece menü çubuğunda;
   - dunno.exe penceresi normal pencere olarak açılır.
3. **M3. Bağlam:** ön uygulamanın bundle id'si ile kategori eşlemesi. sites.json içine `bundles` alanı eklenir; TS/Rust ortak örnek tablosu (`sites.cases.json`) genişletilir.
4. **M4. Başlık okuma (izinli):** Accessibility izni akışı. settings.exe > gizlilik sekmesinde açıklama + "izin ver" düğmesi + iznin durumu. İzin yoksa başlık okunmaz; sadece uygulama tepkileri çalışır.
5. **M5. Boşta kalma, pil, toplantı:** CG ve IOKit karşılıkları.
6. **M6. Paketleme:**
   - `.dmg` arka planı (`gen-installer-art` macOS çıktısı);
   - Developer ID imzası ve notarization (`docs/RELEASE.md` Mac bölümü);
   - universal binary.
7. **M7. Metinler:** "windows ile başlat" → "mac açılınca başlat". "saatin yanındaki simge" yerine "menü çubuğundaki simge". Platforma göre metin seçimi (`i18n.ts` içinde `platform` anahtarı).
8. **M8. Manuel test listesi:**
   - Intel ve Apple Silicon;
   - Retina ve harici monitör;
   - Spaces / tam ekran uygulama;
   - koyu tema;
   - Erişilebilirlik izni ver/geri al.

### Riskler
- WKWebView'da saydam pencere ve `backdrop` farkları. Test edilmeli.
- Ses kilidi (ilk tıklamaya kadar ses yok) WKWebView'da daha katı olabilir.
- Accessibility izni kullanıcıyı ürkütebilir. Bu yüzden varsayılan kapalı kalır ve açılırken ne okunduğu dürüstçe yazılır (gizlilik kuralı).
- Apple hesabı, notarization ve Mac donanımı olmadan ilerlenemez (kullanıcı kararı/bütçe).

### Bitti sayılması için
- Apple Silicon ve Intel Mac'te `.dmg` kurulur, Gatekeeper uyarısı çıkmaz.
- Pet saydam, tıklanabilir ve sürüklenebilir; menü çubuğu simgesi var, Dock'ta simge yok.
- Ön uygulama tepkileri çalışır. Başlık okuma sadece izinle çalışır.
- Manuel liste geçer. Boşta CPU < %1.

---

## C. Seviye sistemi (FB6 kararı, belgede tek yer)

- Seviye XP ile atlanır. XP her etkileşimden gelir ama günlük tavanlıdır. Tavanlar `desktop/src/companion/progression.ts` içindeki `XP_TABLE`'da:

| Kaynak | XP | Günlük tavan |
|---|---|---|
| Soru sormak | +5 | 100 |
| Doğru cevap almak | +10 | 30 |
| Dürtmek, sürüklemek | +1 | 60 |
| Günün ilk açılışı | +15 | 15 |
| Dolapta giydirmek | +5 | 30 |
| Kenara göndermek | +2 | 10 |
| Başarım | +40 | yok |
| Gizli şey | +60 | yok |
| Olay zinciri | +50 | yok |
| Gizli dünya | +40 | yok |
| İlk adımlar | +16 (adım başına bir kez) | yok |

- Seviye için gereken toplam XP: `25 * (n-1)^1.6`. Seviye 3 = 76 XP, seviye 10 = 840 XP (olağan kullanımda yaklaşık bir hafta), seviye 25 = yaklaşık bir ay.
- Sekme kilitleri (beceri ağacının "os" dalı):
  - stats.txt 3. seviyede açılır;
  - workshop.exe 10. seviyede açılır;
  - Pro ve test modu beklemez.
- Kilitli sekme görünür kalır; üstünde seviyesi yazar. Tıklanınca kilit sayfası ve xp.txt (XP nereden gelir) gösterilir.
- İlk adımlar (ilk 10 dakika): soru sor, sürükle, dunno.exe'yi aç, giydir, ağaca bak. Toplam 80 XP; seviye 3'e çıkar ve stats.txt açılır.
