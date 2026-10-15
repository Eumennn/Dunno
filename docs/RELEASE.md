# Yayın ve imzalı otomatik güncelleme (SPEC 10 CL1)

Dunno, Tauri updater ile imzalı güncelleme alır: uygulama günde bir kez (sessiz) GitHub Releases'teki `latest.json`'a bakar,
yeni sürüm varsa toast der ("yeni sürüm. kurmak zorunda değilsin. ama kur"); kurulum sadece about.txt > [ kur ] ile.
İndirilen kurulum dosyası public key ile doğrulanır; imzadaki sürüm `latest.json`'dakiyle aynı olmalı (`requireSignedVersion`).
Kontrol isteği düz bir GET'tir: cihaz kimliği, soru, pencere başlığı gitmez.

## 1. Anahtar çifti (bir kez, kendi bilgisayarında)
```
cd C:\Users\pc\Downloads\Dunnothebean\desktop
npm.cmd run tauri signer generate -- -w %USERPROFILE%\.tauri\dunno.key
```
- **Özel anahtar (`dunno.key`) ve şifresi repoya ASLA girmez.** `.gitignore` `*.key`'i dışlar ama dosyayı repo dışında tut (`%USERPROFILE%\.tauri\`). Yedekle: kaybolursa eski kurulumlar yeni sürümü kabul etmez.
- Public key (`dunno.key.pub` içeriği) gizli değil: `desktop/src-tauri/tauri.conf.json` > `plugins.updater.pubkey` alanına yapıştır (şu an `[UPDATER PUBKEY]`) ve commit et.

## 2. Sürüm numarası (tek kaynak)
Aynı sürüm: `desktop/src-tauri/tauri.conf.json`, `desktop/src-tauri/Cargo.toml`, `desktop/package.json`, `desktop/setup-tauri/tauri.conf.json` + `Cargo.toml` (kurulum programı), `worker/src/data/releases.json`
(`version`, `notes`, `urls.windows` = herkese açık uygulama reposunun indirme adresi `https://github.com/eumennn/dunno/releases/download/v<sürüm>/Dunno_<sürüm>_x64-setup.exe`).
`npm.cmd run check:release` hepsini denetler.

## 3. İmzalı build
PowerShell:
```
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -Raw "$env:USERPROFILE\.tauri\dunno.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<şifre>"
npm.cmd run release:build
npm.cmd run release:latest
npm.cmd run check:release -- --built --publish
```
- `release:build` = `tauri build` + `tauri.release.conf.json` (`createUpdaterArtifacts`): kurulumun yanında `.exe.sig` üretir.
  Düz `npm.cmd run tauri build` anahtar istemez (geliştirme ve test kurulumları için).
- `release:latest` → `desktop/release/latest.json` (gitignore'da): sürüm/not/URL `releases.json`'dan, imza `.sig`'den.

## 4. Yayınla (otomatik, `.github/workflows/release.yml`)
Yayın **herkese açık kullanıcı reposunda** (`eumennn/dunno`: landing + README + Releases; kaynak kod özel `dunno-dev`'de).
Bir kez, bu (özel) repoda Settings > Secrets and variables > Actions:
- `DUNNO_RELEASE_TOKEN`: GitHub > Settings > Developer settings > Fine-grained tokens > sadece `eumennn/dunno`, **Contents: Read and write**.
- `TAURI_SIGNING_PRIVATE_KEY` (dosyanın içeriği) ve `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (1. adımdaki anahtar). Yoksa yayın yine çıkar
  ama `latest.json` yazılmaz (otomatik güncelleme o sürümü görmez).

Her sürüm: 2. adımdaki dosyalarda sürümü yükselt, commit et, sonra
```
git tag v0.1.1
git push origin v0.1.1
```
İş akışı etiketi `tauri.conf.json` sürümüyle karşılaştırır, Windows ve Mac'i derler ve `eumennn/dunno`'da `v0.1.1` release'i açar:
- `Dunno-setup.exe`, `Dunno.dmg`: sabit adlar; landing düğmesi ve README `releases/latest/download/...` ile bunlara gider.
- `Dunno_<sürüm>_x64-setup.exe`, `Dunno_<sürüm>_universal.dmg`: sürümlü kopyalar (`releases.json` ve `latest.json` bunları gösterir).
- `Dunno_<sürüm>_universal.app.tar.gz` + `latest.json` (imza anahtarı varsa): Windows ve Mac (Apple Silicon + Intel) güncellemesi.
Uygulamanın uç noktası `https://github.com/eumennn/dunno/releases/latest/download/latest.json`.
Elle yayın (yedek): 3. adımın çıktılarını aynı adlarla release'e sürükle.
Repo bölme ve ihracat: `docs/REPO-SPLIT.md`. Sonra worker'ı deploy et (`/v1/release` aynı sürümü gösterir).

## Yerel deneme (gerçek yayın yok)
1. Eski sürümü kur (ör. 0.1.0).
2. Sürümü 0.1.1 yap (2. adımdaki dosyalar), imzalı build al (3. adım), `npm.cmd run update:serve -- --exe src-tauri\target\release\bundle\nsis\Dunno_0.1.1_x64-setup.exe`.
3. Sürümü 0.1.0'a geri al ve `npm.cmd run tauri dev -- --config src-tauri/tauri.update-test.conf.json` (uç nokta `http://127.0.0.1:8799/latest.json`, http sadece bu dev config'inde açık).
4. about.txt > güncellemeleri kontrol et → "yeni sürüm: 0.1.1" → [ kur ]. Ayrıntı: `orchestrator/notes/desktop-manual-test.md` bölüm 17.

## Pro lisansı (SPEC 15, isteğe bağlı)
Lisans sistemi derlemede gömülü açık anahtarla açılır; yoksa settings.exe "pro henüz satışta değil" der ve hiçbir anahtar geçmez.
1. Bir kez: `cd desktop; node scripts/license.mjs keygen` -> `DUNNO_LICENSE_PUBKEY=...` (açık) + özel anahtar PEM (**repoya koyma**, güvenli sakla).
2. Build öncesi ortamda: `$env:DUNNO_LICENSE_PUBKEY="..."` (PowerShell) ya da `export DUNNO_LICENSE_PUBKEY=...`; sonra `npm run release:build`.
3. Lisans üret: `$env:DUNNO_LICENSE_PRIVATE_KEY = Get-Content pro.pem -Raw; node scripts/license.mjs issue` -> `DUNNO1....`.
Lisans içeriği sadece rastgele kimlik + tür + tarih (kişisel veri yok); doğrulama çevrimdışı (ağ yok).

## Kod imzalama ve SmartScreen (kurulum "kaçak uygulama" gibi görünmesin)
İmzasız exe'de Windows "Windows bilgisayarınızı korudu / Bilinmeyen yayımcı" der. Kodla değil, kod imzalama sertifikasıyla çözülür
(kendi kurulum programımız da, içindeki NSIS de, dunno.exe de imzalanmalı). Durum (2026-10 araştırması):
1. **Azure Artifact Signing** (eski adı Trusted Signing, ~10 USD/ay): bireysel geliştirici sadece ABD ve Kanada; kuruluşlar AB, BK ve
   birkaç ülke. Türkiye'den şahıs olarak şu an uygun görünmüyor.
2. **OV kod imzalama sertifikası** (Certum, Sectigo, SSL.com; şahıs adına alınabilir, yılda yaklaşık 100-300 USD). 2023'ten beri anahtar
   USB token ya da bulut HSM'de olmak zorunda (Certum "SimplySign" bulut seçeneği CI için en kolayı).
3. **EV** artık uyarıyı hemen kaldırmıyor (Mart 2024'ten beri): EV de OV de itibar kazanır, uyarı imzalı dosyalar indirilip kullanıldıkça
   kaybolur. Bu yüzden EV'ye ekstra para vermeye gerek yok.
4. İmza gelince: `tauri.conf.json > bundle.windows.signCommand` (sertifika sağlayıcının CLI'ı, `%1` = dosya) ve aynı komut
   `release.yml`'de kurulum programına (`dunno-setup.exe`) da uygulanır. Yayıncı adı (`bundle.publisher`) sertifikadaki adla aynı olmalı.
   Doğrulama: exe'ye sağ tık -> Özellikler -> Dijital İmzalar.
5. O zamana kadar: README ve landing'de "daha fazla bilgi -> yine de çalıştır" notu.

## Workshop ve AI dünya üretici (SPEC 18)
- Worker sırları: `WORKSHOP_ADMIN_TOKEN` (en az 24 karakter, `wrangler secret put`), `PRO_PUBKEY` (= `DUNNO_LICENSE_PUBKEY`).
- Workshop moderasyonu (FB6): `https://<api>/admin/workshop` sayfası. Anahtar sayfaya elle girilir ve sadece o sekmede tutulur.
  Sayfada bekleyen paketlerin dosyaları görünür (metinler düz yazı, PNG'ler görsel). Düğmeler: onayla / onayla (pro) / reddet.
- Yükleme anahtarı: `WORKSHOP_UPLOADS` = `open` | `invite` (+ `WORKSHOP_INVITES=ad1,ad2`). Ayarlanmazsa yükleme **kapalı**.
  Launch'ta önerilen ayar `invite`: kuyruk tek kişilik, önce güvenilir yaratıcılar. Kapalıyken uygulama "paylaşım şimdilik davetle" der.
- Onay: `curl -H "Authorization: Bearer $TOKEN" $API/v1/workshop/pending` ve
  `curl -X POST -H "Authorization: Bearer $TOKEN" -d '{"id":"<paket>","status":"approved"}' $API/v1/workshop/moderate`.
- Kozmetik paket lisansı: `node scripts/license.mjs issue --tier packs --packs halloween` (Pro + paket: `--packs halloween,cyberpunk`).
- Canlı API alan adını `tauri.conf.json` CSP `connect-src`'ye ekle. `VITE_API_BASE=https://<api> npm run check:release -- --publish` eksikse FAIL verir (adres yoksa ya da https değilse de).

## Kendi kurulum programımız (FB9): dunno-setup.exe

İnsanların indirdiği `Dunno-setup.exe` artık Windows'un kurulum sihirbazı değil, sıfırdan yazılmış küçük bir Dunno uygulaması:
- arayüz `desktop/src/setup/` (dunno.exe ile aynı piksel pencere, canlı Dunno animasyonu, TR/EN), kabuk `desktop/setup-tauri/` (Tauri 2, kenarsız 640x440).
- akış: "dunno masaüstüne kurulsun mu?" `[ evet ]` / `[ dunno ]` (ikisi de kurar) -> kuruluyor (blok çubuk, Dunno yürür) -> kuruldu (Dunno dans eder,
  "dunno'yu şimdi aç") ya da hata (tekrar dene). Zaten kuruluysa "güncellensin mi?".
- dosyaları yine Tauri'nin NSIS kurulumu koyar: içine gömülü, geçici klasöre yazılıp sessiz (`/S`) çalıştırılır ve silinir. Bu yüzden kaldırma,
  başlat menüsü/masaüstü kısayolu ve otomatik güncelleme eskisiyle aynı kayıtları kullanır. Yönetici izni istemez.
- **Kaldırıcı (FB11):** aynı program `--uninstall` ile kaldırıcıdır. `release.yml` önce içi boş derlemesini `dunno-uninstall.exe` olarak
  çıkarır, `DUNNO_UNINSTALLER` ile NSIS kurulumuna koyar; Ayarlar > Uygulamalar > Kaldır onu açar. Kendini geçici klasöre kopyalayıp
  oradan çalışır, NSIS kaldırıcısını sessiz ve yerinde (`/S _?=<klasör>`, ayarlar da silinsin seçiliyse `/DATA`) çalıştırır, sonra kalan
  dosyaları ve boş klasörü siler. Değişken yoksa (yerel derleme) klasik NSIS kaldırıcısı.
- WebView2 olmayan eski Windows 10'da kendi penceresi açılamaz: klasik (aşağıdaki görünümlü) NSIS kurulumu açılır, WebView2'yi o kurar.
- Derleme: `release.yml` önce NSIS'i, sonra `npm run setup:ui` + `DUNNO_SETUP_PAYLOAD=<nsis exe> cargo build --release --manifest-path setup-tauri/Cargo.toml`.
  Yerelde ekran önizlemesi: `npm run setup:dev` -> `http://localhost:1421/setup.html?step=welcome|installing|done|failed&lang=tr|en&existing=1`.
  Görüntüler: `orchestrator/notes/ui-shots/fb9-setup-*.png`.

## Kurulum görünümü ve önizlemesi (FB6, klasik NSIS: yedek yol ve kaldırıcı)

- Kurulum `desktop/src-tauri/installer/installer.nsi` şablonuyla derlenir (`tauri.conf.json > bundle > windows > nsis > template`).
  Tauri'nin kendi şablonunun (tauri-bundler 2.10.1, CLI 2.12.x) kopyasıdır; Dunno değişiklikleri `DUNNO` işaretli bloklarda:
  palet renkleri, kalın başlıklar, marka dilinde TR/EN metinler, başlat menüsü sayfası atlanır, turuncu ilerleme çubuğu, kaldırıcı da aynı görünümde.
- Tauri CLI büyük sürüm atlarsa (`@tauri-apps/cli` 2.13+ şablon değişkenleri değişebilir) şablonu yenisiyle birleştir; `scripts/installer-art.test.ts` işaretleri denetler.
- Windows'a gerek kalmadan önizleme (Linux): `desktop/scripts/installer-preview/` (`render.mjs` şablonu doldurur, `makensis` derler,
  `shot.sh` Wine + Xvfb sanal ekranında açıp sayfa sayfa görüntü alır). Son görüntüler: `orchestrator/notes/ui-shots/fb6-installer.png`.
- Düğmeler Windows'un kendi düğmeleridir (eklenti olmadan boyanamaz); geri kalan her yüzey palette.

## Ödeme -> lisans (launch)

Sağlayıcı: Lemon Squeezy (vergiyi kendisi üstlenen satıcı). Hesap açmadan önce **Türkiye'den ödeme alıp alamadığını doğrula**.
Paddle'a geçilirse sadece `worker/src/lib/billing.ts` içindeki `parseLemon` ve imza doğrulaması değişir.

1. **Ürünler.** Lemon Squeezy'de açılacak ürünler:
   - Pro aylık ve/veya yıllık (abonelik);
   - kozmetik paketler (tek seferlik): halloween, cyberpunk.

   Her varyantın kimliği `LS_PRODUCTS` secret'ına yazılır:
   `{"<varyant>":{"tier":"pro","subscription":true},"<varyant>":{"tier":"packs","packs":["halloween"]}}`
2. **Webhook.** Adres: `https://<api>/v1/billing/lemonsqueezy`.
   - Olaylar: `order_created`, `order_refunded`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_resumed`, `subscription_expired`.
   - İmza sırrı → `LS_WEBHOOK_SECRET`.
3. **Lisans anahtarı.**
   - `node desktop/scripts/license.mjs keygen` çalıştır.
   - Açık anahtar iki yere gider: masaüstü derlemesindeki `DUNNO_LICENSE_PUBKEY` ve worker'daki `PRO_PUBKEY`.
   - Özel anahtar PEM'i `LICENSE_PRIVATE_KEY` secret'ına girer. **Repoya asla.**
4. **Kullanıcı akışı.**
   - Ödeme sonrası makbuz e-postasına şu not eklenir: "dunno.exe > settings.exe > pro: sipariş numarası + e-posta > lisansı getir".
   - Uygulama `/v1/license/claim` ile lisansı alır. Rust lisansı çevrimdışı doğrular ve kaydeder.
   - Abonelik lisansında `until` vardır (dönem sonu + 3 gün). Bitişe 10 gün kala uygulama `/v1/license/refresh` ile aynı kimlikte yenisini alır.
   - Abonelik biterse yenileme 410 döner ve Pro kapanır. Kimlik kaybolmaz; abonelik yeniden açılınca kendiliğinden geri gelir.
5. **Gizlilik.**
   - E-posta saklanmaz; sadece tuzlu SHA-256 karması saklanır (`RL_SALT`).
   - Lisansta kişisel veri yok.
   - Sipariş numarası tahminine karşı IP başına günde 10 deneme sınırı var.
6. **İade.** `order_refunded` gelince kayıt pasifleşir, lisans yeniden alınamaz. Zaten kurulmuş tek seferlik lisans çevrimdışı çalışmaya devam eder.
   Bu bilinçli bir tercih: çevrimdışı doğrulama ile anında iptal birlikte olmuyor. Abonelik lisansı ise kendi süresi dolunca kapanır.

## macOS sürümü (SPEC 19)

- **Derleme:** GitHub Actions > "desktop build" > Run workflow.
  - macOS işi universal (Apple Silicon + Intel) bir `.dmg` üretir; Windows işi `setup.exe` üretir.
  - İkisi de "artifacts" altından indirilir. Mac donanımı gerekmez.
- **Mac'te çalışanlar:**
  - saydam, her zaman üstte, tıklanabilir pet;
  - Dock'ta simge yok, sadece menü çubuğu;
  - tüm masaüstlerinde (Spaces) görünür;
  - öndeki uygulama paket kimliğinden tanınır (`MAC_BUNDLES`), tepkiler Windows'takiyle aynı;
  - boşta kalma süresi okunur;
  - zoom/teams/webex öndeyken toplantı koruması devreye girer.
- **Henüz yok (SPEC 19 M4):** sekme/pencere başlığı okuma. macOS bunun için Erişilebilirlik izni ister; açılırken izin akışıyla eklenecek.
- **İmza:** Apple Developer ID (yıllık 99 USD) + notarization olmadan Gatekeeper uyarır. İlk açılışta sağ tık > Aç gerekir.
  Hesap açılınca CI'a şu sırlar eklenir: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`.
  Tauri bunları görünce imzalar ve notarize eder.
- **Yerelde Linux'tan derleme denetimi:**
  `CC_aarch64_apple_darwin=clang CFLAGS_aarch64_apple_darwin="-target arm64-apple-macos11" cargo check --target aarch64-apple-darwin`
