# SPEC 05: Kişiselleştirme: renk temaları, aksesuarlar, tembel başarımlar (wardrobe.exe)

GOAL: Kullanıcı Dunno'nun rengini ve aksesuarını seçebilsin; yeni parçalar "tembel başarımlarla" açılsın. Tamamen cihazda, ücretsiz, satın alma yok.
ÖN KOŞUL: SPEC 04 bitmiş (özellikle UP7 kenara göre yön).
KAYNAKLAR: `docs/agents/desktop.md`, `docs/agents/ui.md`, sprite üretici `desktop/scripts/` (A1), `content/art/dunno_reference_poses.webp`.

## Kullanıcı kararları (2026-10-02)
- Açılma sistemi **var**. İlk set: 5 renk teması + 6 aksesuar (aşağıda). Tasarımcı son onayı verir; Aseprite'tan kendi çizimini koyabilmeli.

## Teslimatlar

### W1 Renk temaları (palet değişimi)
- Sprite haritalarındaki rol harfleri (gövde / gölge / ışık / yüz-karın) temaya göre renk alır; **kontur `#2B1E2F`, göz, yanak `#E86A7A` sabit** (karakter tanınır kalsın).
- Temalar (`content/wardrobe/themes.json`):
  | id | ad (tr / en) | gövde | gölge | ışık | yüz-karın |
  |---|---|---|---|---|---|
  | classic | klasik / classic | #F2A65A | #D9774A | #FFD29A | #FFF1D6 |
  | mint | nane / mint | aday | aday | aday | #FFF1D6 |
  | lavender | lavanta / lavender | aday | aday | aday | #FFF1D6 |
  | night | gece / night | aday | aday | aday | aday |
  | burnt_toast | yanmış tost / burnt toast | aday | aday | aday | #FFF1D6 |
  "aday" renkleri ekip önerir: her tema kendi içinde aynı açıklık ilişkisini korur (gölge < gövde < ışık), kontur ve yanakla kontrastı test edilir
  (WCAG göreli parlaklık farkı eşiği testte). **Yeni renkler `ui.md`'de "tema renkleri" başlığı altında tek yerde listelenir**; UI'da (pencereler) hâlâ sadece ana palet kullanılır.
- Uygulama: render sırasında palet değişimi (sheet'i tema başına üretmeye gerek yok). Tasarımcının gerçek sheet'i gelirse aynı rol renkleri üzerinden çalışmalı (renk eşleme tablosu).

### W2 Aksesuarlar (katman + bağlantı noktası)
- İlk set (`content/wardrobe/accessories/`): **bere, taç, parti şapkası, güneş gözlüğü, gece başlığı, kulaklık.**
  Her biri 32x32 tuvalde küçük piksel haritası, sadece ana palet + tema renkleri değil **kendi sabit renkleri** (ana paletten seçilir).
- **Bağlantı noktaları:** sprite üretici her kare için `head` (tüyün dibi), `eyes` (göz hattı ortası), `ears` (kafanın iki yanı) noktalarını çıkarır ve sheet JSON'una
  (Aseprite uyumlu kalacak şekilde, ör. frame `data` alanı veya ayrı `dunno_anchors.json`) yazar. Uyurken / peek / sulk gibi pozlarda nokta yoksa aksesuar gizlenir
  veya poza özel küçük varyant kullanılır (tabloyla).
- Çizim sırası: gövde < aksesuar < (gerekirse) ön kol. **Tüy imzası görünür kalır**: şapkalar tüyü deliğinden çıkarır ya da arkasında bırakır (her şapka için karar dosyada).
- Ayna (UP7) ve ölçek (2x) aksesuarlar için de doğru çalışır.
- Tasarımcı kendi aksesuarını ekleyebilmeli: `content/wardrobe/accessories/<id>.png` (32x32, Aseprite'tan dışa aktarım) + `<id>.json` (anchor türü, ofset, hangi pozlarda gizli). README ile.

### W3 Tembel başarımlar (açılma)
- Sadece cihazda (`tauri-plugin-store`), ağ yok. Mevcut stats sayaçları kullanılır (SPEC 03 M1), gerekirse yeni sayaç eklenir.
- Başlangıçta açık: `classic` tema + 1 aksesuar (bere). Diğerleri başarımla açılır. Öneri tablosu (ekip metinleri marka sesinde yazar, tasarımcı onaylar):
  | başarım (id) | koşul | açar |
  |---|---|---|
  | learned_nothing_7 | 7 farklı günde uygulama açık | taç |
  | poke_100 | toplam 100 dürtme | parti şapkası |
  | night_owl | 00:00–05:00 arası soru sorma | gece başlığı |
  | out_of_questions_5 | 5 farklı gün 3 hakkı bitirme | güneş gözlüğü |
  | drag_50 | 50 kez sürükleme | kulaklık |
  | meeting_survivor | toplantı korumasının 10 kez devreye girmesi | tema: gece |
  | spreadsheet_10 | excel öndeyken 10 laf | tema: yanmış tost |
  | idle_hour | 60 dk boşta kalma 3 kez | tema: lavanta |
  | street_mode_day | sokak modunda 1 tam gün | tema: nane |
- Açılınca: pet'ten kısa laf (`interaction:unlock` trigger'ı, havuza 10'ar TR/EN laf) + landing toast diliyle bildirim. Toplantıdayken/bugün susarken bildirim ertelenir.
- Başarım motoru saf fonksiyon: (sayaçlar, olay) -> yeni açılanlar. Tablo testleri; saat/gün enjekte edilir.

### W4 wardrobe.exe sekmesi
- `dunno.exe`'ye yeni sekme `wardrobe.exe` (landing pencere dili, ui-kit):
  sol: büyük önizleme (seçili durumda animasyon; durum seçici: idle / walk / sleep / peek), sağ: `themes` ve `accessories` ızgaraları.
  Kilitli parça: siluet + kilit ikonu + koşul metni ve ilerleme (`37 / 100 dürtme`). Seçince anında pet'e uygulanır, kalıcıdır.
- `achievements.txt` alt bölümü: tüm başarımlar, açılan/kilitli, açılma tarihi.
- Studio'ya (SPEC 03 B) önizleme: tema/aksesuar seçip "şu durumda ne der" panelinde Dunno'yu o kıyafetle göster (opsiyonel, zaman kalırsa).

### W5 Doğrulama
- Testler: palet değişimi (rol renkleri doğru eşleniyor, kontur/yanak sabit), anchor çıkarımı (her kare için nokta var veya bilinçli gizli), başarım motoru, store kalıcılığı.
- Görsel: `orchestrator/notes/ui-shots/wardrobe-*.png`: 5 tema x (idle, walk, sleep, peek sol/sağ) şeridi; 6 aksesuar x aynı pozlar; wardrobe.exe sekmesi (kilitli ve açık halleri). Headless, gerçek girdi yok.
- Manuel test listesine bölüm.

## Kabul kriterleri
- 5 tema ve 6 aksesuar tüm pozlarda doğru konumda (ekran görüntüleri), ayna ve 2x ölçekte bozulmuyor; tüy görünür.
- Başarımlar koşulunda açılıyor (testli), yeniden başlatınca kalıcı.
- desktop testleri, tsc, `tauri build`, clippy temiz; yeni kurulum dosyası.
- `REPORT-spec05.md`: tema renk önerileri ve başarım metinleri **tasarımcı onayı bekliyor** olarak listeli; kendi aksesuarını ekleme rehberi.

## Kapsam dışı
Satın alma, hesap/bulut senkronu, başka kullanıcılarla paylaşma, yeni animasyon durumları.
