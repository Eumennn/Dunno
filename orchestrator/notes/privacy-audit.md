# Gizlilik + güvenlik denetimi (R1)

- Kapsam: `main` @ `245520b` (D10a merge sonrası), worker + desktop (TS + Rust). Salt okuma, kod değişikliği yok.
- Yöntem: grep + kod okuma (akış izi), git geçmişi taraması, release/debug binary string taraması.
- Not: soru kutusu (D4) henüz main'de yok; soru akışının masaüstü ucu D4 merge'ünden sonra tekrar bakılacak.

## Özet

| Önem | Adet |
|---|---|
| Yüksek | 1 (işlevsel, gizlilik sızıntısı değil) |
| Orta | 2 |
| Düşük | 5 |
| Bilgi | 3 |

Kritik gizlilik sızıntısı yok: soru metni, pencere başlığı ve exe yolu hiçbir log/KV/store/olay/ağ isteğine girmiyor.

## Bulgular

| # | Önem | Alan | Dosya:satır | Bulgu | Öneri |
|---|---|---|---|---|---|
| 1 | Yüksek (işlevsel) | Desktop ağ / CSP | `desktop/src-tauri/tauri.conf.json:33` | `connect-src 'self' ipc: http://ipc.localhost`. Worker adresi (`http://127.0.0.1:8787`, `desktop/src/api.ts:6`) CSP'de yok. Webview `/v1/ask` ve `/v1/lines` isteklerini engeller; uygulama hep havuza düşer. | `connect-src`'a yerel worker'ı (`http://127.0.0.1:8787`) ve canlı worker origin'ini (belli olunca) ekle. Sadece bu iki origin; joker yok. D4 bağlamadan önce. |
| 2 | Orta | Yetkiler | `desktop/src-tauri/capabilities/default.json:6` | `autostart:default` webview'a `enable/disable/is_enabled` verir. Autostart Rust'ta tray tıklamasıyla yönetiliyor (`tray.rs:358-360`); JS'in Run kaydı yazabilmesi gerekmiyor. "Run kaydı sadece kullanıcı açınca" kuralını yetki düzeyinde garanti etmiyor. | `autostart:default` yerine sadece `autostart:allow-is-enabled` (ya da hiç). TS'te `@tauri-apps/plugin-autostart` kullanılmıyor. |
| 3 | Orta | Gizlilik sözü / 3. taraf | `worker/src/lib/llm.ts:38` | LLM'e giden sorularda soru metni OpenRouter'a ve sağlayıcıya (Moonshot) gider. Bizde loglanmıyor ama 3. tarafın saklama/eğitim ayarı hesaba bağlı. "Soru içerikleri loglanmaz, saklanmaz" sözü bu ayar yapılmadan tam doğru değil. | OpenRouter hesabında prompt loglama ve eğitim için kullanımı kapat, sağlayıcıyı buna uyanlarla sınırla. Gizlilik metninde "LLM'e giden sorular sağlayıcıya iletilir" ifadesi olsun. |
| 4 | Düşük | Maliyet / erişilebilirlik | `worker/src/routes/ask.ts:28-34` | Kota `deviceId + IP` hash'i. İstemci her istekte yeni `deviceId` üretirse kotayı atlar ve günlük harcama tavanını tüketebilir. Tavan maliyeti sınırlıyor; sonuç herkes için havuz cevabı olur. | İleride IP-tek hash'li ikinci, daha geniş günlük kota (ör. 20). Şimdilik tavan yeterli. |
| 5 | Düşük | Hash tuzu | `worker/src/lib/ratelimit.ts:24` | `RL_SALT` secret'ı canlıda unutulursa repodaki `LOCAL_SALT` kullanılır. Ham değer saklanmıyor, `deviceId` rastgele; risk düşük. | Deploy kontrol listesine "RL_SALT secret tanımlı" maddesi. |
| 6 | Düşük | Hata yanıtları | `worker/src/index.ts:35-36` | `fetch` handler'ında üst düzey try/catch yok. Beklenmeyen istisnada Cloudflare kendi 1101 hata sayfasını döner. Canlıda yığın izi dışarı gitmez, ama yanıt JSON/marka sesinde değil. Bütün route hata metinleri sabit; iç ayrıntı (e.message, stack) yanıta hiç girmiyor. | `route()` çağrısını try/catch ile sar, `500 {error}` sabit metin. |
| 7 | Düşük | CORS | `worker/src/lib/http.ts:21` | Site origin'i yer tutucu `https://example.com` izin listesinde. | Gerçek site domaini belli olunca değiştir, deploy öncesi kontrol listesine ekle. |
| 8 | Düşük | Yetkiler | `desktop/src-tauri/capabilities/default.json:6` | `core:default`; app, event, image, menu, path, resources, tray, webview ve window varsayılanlarını açar. Webview JS menü/tray oluşturabilir, yol bilgisi okuyabilir. Sadece yerel içerik yüklendiği ve HTML enjeksiyon noktası olmadığı için (bkz. temiz 8) risk düşük. | Kullanılanlara daralt: `core:event:default`, `core:window:default` (ve gerekirse `core:app:default`). Menü/tray/path JS'ten kullanılmıyor. |
| 9 | Bilgi | Yerel log | `desktop/src/settings.ts:158` | Store okunamazsa hata nesnesi webview konsoluna yazılır; dosya yolu (kullanıcı profil yolu) içerebilir. Yerel, ağa gitmez, soru içermez. | İsteğe bağlı: sadece `DEV`'de logla. |
| 10 | Bilgi | Worker gözlemlenebilirlik | `worker/wrangler.toml` | `observability` ayarı yok. Cloudflare panelinden Workers Logs açılırsa istek URL/başlıkları (IP dahil) Cloudflare'de tutulur; gövde (soru) tutulmaz, kodda `console` yok. | Panelde logları açarken gizlilik metniyle uyumunu kontrol et; açılacaksa başlık örneklemesi düşük tutulmalı. |
| 11 | Bilgi | Git geçmişi | `ec8518e` `web/.dev.vars.example` | `RL_SALT=dev-only-change-me` örnek dosyada. Gerçek sır değil, canlıda kullanılmıyor. | Yok. |

## Temiz çıkan kontroller (kanıt)

1. **Soru metni (worker):**
   - `src` altında hiç `console` yok.
   - `validate.ts` hata metinlerinde soru yok; birim testi `never puts the question into the error message`.
   - KV'ye sadece hash'li kota anahtarı, sayaç ve laf setleri yazılıyor; route testi `keeps raw device id and ip out of kv`.
   - Alarm gövdesi `{event, date, requests, tokens, cap}`; testli.
   - LLM isteğine `deviceId`/IP eklenmiyor; testli.
   - Soru sadece POST gövdesinde, URL'de değil.
2. **Soru metni (desktop):**
   - `api.ts` soruyu sadece `askLLM` gövdesinde gönderiyor; loglanmıyor (testli), saklanmıyor.
   - `settings.ts` store alanları: lang, mode, frequency, deviceId, autostart, muteUntil, firstRunDone. Soru yok.
   - `src` altındaki `console` kullanımı: `main.ts:76` (sadece `DEV`, `main.ts:127`), `main.ts:84` (sadece `DEV`) ve `settings.ts:158` (bulgu 9). Hiçbiri soru içermiyor.
3. **Pencere başlığı:**
   - Sadece `context/windows.rs:174-191` (`meeting_title_hint`) içinde yığında okunuyor.
   - `title_suggests_meeting(&str) -> bool`'a gidiyor, dışarı sadece `bool` çıkıyor.
   - Tarayıcı önde değilse hiç okunmuyor.
   - SPEC 09 K7b (2026-10-06): `context/windows.rs` `foreground_site` -> `context/sites.rs` `site_match(&str)`; başlık o çağrının
     yığınında kategoriye çevrilip düşüyor, dışarı sadece `site: Option<String>` (kategori, ör. "video") + `site_silent: bool` çıkıyor.
     settings.exe "sekme adlarına bak" kapalıyken (ve webview ayarı bildirene kadar) başlık hiç okunmuyor (`TAB_TITLES`, varsayılan false).
     Olay yükü JSON şekli testli (`watch.rs site_category_only_never_title`). Kategori de saklanmıyor/gönderilmiyor (sadece laf seçimi).
4. **Exe yolu:**
   - `QueryFullProcessImageNameW` sonucu `process_exe` içinde `exe_stem`'e indirgeniyor; tablo eşlemesinden sonra sadece app etiketi kalıyor.
   - Olay yükleri (`context://changed`, `meeting://state`, `tray://action`) sadece etiket, trigger ve bool taşıyor; JSON şekilleri testli.
5. **Rust çıktı:** `println!`/`eprintln!`/`dbg!`/`log::` yok.
6. **Debug prob:**
   - `watch.rs:175,200` `#[cfg(debug_assertions)]` altında.
   - Release `dunno.exe`'de `DUNNO_WATCH_PROBE`, `context app=` ve `meeting in_meeting` dizgileri bulunmadı (0); debug exe'de var (1).
   - Prob dosyasına zaten sadece etiket + bool yazılıyor.
7. **`DUNNO_FAKE_LLM`:**
   - `wrangler.toml`'da yok, sadece `.dev.vars.example`'da belgeli.
   - Kod yolu (`lines.ts:238`) canlıda değişken tanımlı değilse etkisiz; sadece cron laf üretimini etkiler, soru akışına dokunmaz.
8. **HTML enjeksiyonu:**
   - Desktop'ta `innerHTML`/`insertAdjacentHTML`/`eval`/`new Function` yok.
   - Balon metni `textContent` ile basılıyor (`ui/bubble.ts:68`), LLM çıktısı script çalıştıramaz.
9. **Autostart:**
   - Run kaydı Rust'ta sadece tray tıklamasıyla yazılıyor (`tray.rs:358-360`); açılışta sadece okunuyor (`tray.rs:333`).
   - `update_tray_state` sadece işareti değiştiriyor, kayıt yazmıyor.
   - D9 canlı testinde açıp kapatma doğrulandı, Run anahtarı temiz.
   - JS yetkisi için bkz. bulgu 2.
10. **Sırlar:**
    - Git geçmişinde (`git log --all`) hiç `.dev.vars`/`.env` dosyası commit edilmemiş.
    - Anahtar desenleri (`sk-or-v1-…`, dolu `OPENROUTER_API_KEY=`, dolu `ALERT_WEBHOOK=`) bulunmadı.
    - `worker/.dev.vars` `.gitignore`'da.
11. **CORS:**
    - Sadece listedeki origin'lere `access-control-allow-origin` dönüyor; diğerleri preflight'ta 403.
    - Origin yansıtma liste dışına çıkmıyor; testli.

## Sonraki tur (D4 merge sonrası)
- Soru kutusu: soru metni DOM'da tutuluyorsa gönderimden sonra temizleniyor mu; store/konsol/olaylara girmiyor mu.
- Bulgu 1 düzeltildi mi (CSP), bulgu 2 ve 8 daraltıldı mı.
- `api.ts` canlı base URL'i nereden geliyor (sabit/ayar), sadece worker origin'i mi.

## SPEC 10 ekleri (2026-10-06)
- **CL1 güncelleme:** günde bir `GET` GitHub Releases `latest.json` (Rust, tauri-plugin-updater; dev'de yok). Gövde/kimlik/soru gitmez.
  İndirilen kurulum public key ile doğrulanır, `requireSignedVersion` açık. Özel anahtar repoda yok (`.gitignore *.key`, docs/RELEASE.md).
- **CL6 kullanım istatistiği:** varsayılan KAPALI (`settings.telemetry=false`), settings.exe açık rıza. Kapalıyken ağ çağrısı sıfır (testli:
  `desktop/src/telemetry.test.ts`). Açıkken sadece `app_opened`, `question_asked{source: llm|pool|local}`, `achievement_unlocked{id}`;
  istemci izinli alan dışında hiçbir şeyi gövdeye koymaz, worker `/v1/event` fazladan alanı 400 ile reddeder, başlık/IP okumaz/saklamaz,
  KV'de sadece `ev:<gün>:<olay>[:<alan>]` sayacı (400 gün TTL), çerez yok. Olay listesi istemci ve worker'da eşitlik testli.
- **CL5 çoklu monitör:** imleç konumu sadece Rust'ta, hangi monitörde olduğuna bakmak için; webview'e yalnızca sürükleme sırasında
  yeni monitöre geçildiğinde o monitöre göre mantıksal konum gider (pet'i imlecin altına koymak için). Saklanmaz.

