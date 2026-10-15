# Backend Rehberi (Cloudflare Worker)

Kim okur: Backend mühendisi (zorunlu), PM (review sırasında).
Ne değildir: Görev listesi değil (o `specs/`). Bu dosya **nasıl** kod yazacağını anlatır.
Backend tek bir Worker'dır: masaüstü uygulamasının LLM proxy'si, günlük laf üretimi, sürüm/indirme uçları.
Landing page (`site/index.html` = kök `index.html`) statik dosyadır; backend onu değiştirmez.

## Stack
- Cloudflare Workers, TypeScript (strict), `worker/` altında. Framework yok: tek `fetch` handler + küçük router.
- Depolama: Cloudflare KV (`DUNNO_KV`). Veritabanı yok.
- LLM: OpenRouter üzerinden Kimi (model env'den). SDK yok, düz `fetch`.
- Test: vitest (saf `lib/` fonksiyonları + router'a sahte Request/Env ile). Yerel: `npx wrangler dev`.

## Dizin
```
worker/
  wrangler.toml          # KV binding, cron trigger, vars
  src/index.ts           # fetch + scheduled handler, router
  src/routes/ask.ts      # POST /v1/ask
  src/routes/lines.ts    # GET  /v1/lines
  src/routes/release.ts  # GET  /v1/release, GET /download
  src/lib/
    env.ts               # Env tipi
    http.ts              # json(), error(), CORS (sadece uygulama + site origin)
    validate.ts          # girdi doğrulama (soru, mod, dil, deviceId)
    prompt.ts            # karakter system prompt'u (sabit metin -> cache dostu)
    postprocess.ts       # temizlik; [K] KORUNUR
    pool.ts              # yedek cevap havuzu (tr/en, polite/street)
    ratelimit.ts         # cihaz başı günlük LLM kotası
    spend.ts             # günlük harcama sayacı, %80 alarm, %100 kesme
    llm.ts               # OpenRouter çağrısı (timeout'lu)
    lines.ts             # günlük laf üretimi + doğrulama
    platform.ts          # UA -> 'windows' | 'mac'
  test/*.test.ts
```
`lib/` saf fonksiyonlar içerir (Request/KV/fetch'i parametre olarak alır), böylece testlenir.

## API sözleşmesi (masaüstü buna güvenir, değiştirirsen PM'e bildir)
| Uç | İstek | Yanıt |
|---|---|---|
| `POST /v1/ask` | `{question, mode:'polite'\|'street', lang:'tr'\|'en', deviceId, kind?:'honest'\|'pool_hint', qtype?}` | `200 {answer, source:'llm'\|'pool', honest:boolean, charged:boolean, qtype}` · `429 {error}` |
| `GET /v1/lines?lang=tr\|en` | `If-None-Match` opsiyonel | `200 {date, lines:[laf]}` + `ETag` · `304` · set yoksa `200 {date:null, lines:[]}` · geçersiz lang `400 {error}` |
| `GET /v1/release` | | `{version, size, notes, urls:{windows, mac}}` (version v önekisiz, ör. `0.1.0`) |
| `GET /download` | | `302` platform URL'si |
- `answer` içinde `[K]` olduğu gibi döner; moda göre değiştirme masaüstünde yapılır. Havuz cevapları da (street) `[K]` içerir.
- `/v1/ask` doğrulama: `question` trim sonrası 1–200 karakter; `mode`, `lang` tam olarak enum değeri (küçük harf);
  `deviceId` `^[A-Za-z0-9_-]{8,64}$` (uygulamanın ürettiği rastgele UUID uyar). Geçersizse `400 {error}`:
  `invalid body` · `invalid question` · `empty question` · `question too long` · `invalid mode` · `invalid lang` · `invalid device id`.
- Hata metinleri marka sesinde (küçük harf, ünlemsiz). Beklenmeyen hata -> mümkünse `200` + havuz cevabı.
- **SPEC 06 Q3 (PM onaylı, 2026-10-03):** `kind` yoksa `'pool_hint'` (eski istemciler bozulmaz). `qtype` = istemcinin `classify()` sonucu
  (`who|where|when|why|how|how_many|what|yes_no|math|advice|greeting|insult|other`), geçersiz/yoksa `'other'`; sadece havuz yedeği ve prompt ipucu için.
  - `kind:'honest'`: `honest_snark` prompt. Başarılı LLM cevabı -> `{source:'llm', honest:true, charged:true}`; cihaz başı günlük honest sayacı +1 (sunucu sınırı `LLM_DAILY_PER_DEVICE`=3).
  - Yasak konu / gerçek kişi (model kaçamak işareti ya da sunucu kelime listesi) -> kaçamak cevap `{honest:false, charged:false}`.
  - Anahtar yok / harcama tavanı / hata / timeout -> tipine uygun havuz cevabı `{source:'pool', honest:false, charged:false}`.
  - Sunucu honest sınırı doluysa `429 {error}` (istemci zaten 3'te durur; 429 gelirse havuz modunda devam).
  - `kind:'pool_hint'`: eski istemciler için eski davranış (işe yaramaz cevap, eski sayaç kuralı aynen), `honest:false`, `charged = source==='llm'`.
    Yeni istemci hak bitince sunucuya gitmez, havuzu yerelde kullanır (Q4).
  - İstemci kalan hakkı **sadece `charged:true`** ise düşürür. Honest cevap ≤ ~120 karakter (postprocess sınırı), `[K]` kuralı aynen.
  - Uygulama ayrıntıları (Q3w): bilinmeyen `kind` -> `400 {error:"invalid kind"}` (kind yoksa pool_hint). Honest 429 metni `"that's enough honesty for today"`.
    Honest `max_tokens` 120, timeout 4 sn. Sayaçlar KV'de hash'li: `hn:<hash>:<gün>` (hak), `ha:<hash>:<gün>` (deneme; kaçamak/hata dahil,
    `HONEST_ATTEMPTS_PER_DAY`=10 dolunca LLM'e gitmeden havuz, 429 değil). Yasak kelime soruda -> LLM çağrılmadan `*omuz silker*`/`*shrugs*`;
    model kaçamağı `who` sorusunda `answer:who` havuzundan ("o kim" tonu), diğerlerinde düz omuz silkme; cevapta yasak kelime -> omuz silkme.
    Havuz yedeği `content/pool` `answer:<qtype>` > `answer:generic` (sunucu biçimi: polite `{K:}` silinir, street açılır, `***` -> `[K]`);
    tipsiz eski istemci (pool_hint + qtype other) eski `POOLS`'tan.

## Env ve sırlar
| Ad | Tür | Not |
|---|---|---|
| `OPENROUTER_API_KEY` | secret | yoksa LLM atlanır, havuz kullanılır |
| `DUNNO_MODEL` | var | Kimi model kimliği: `moonshotai/kimi-k2.6` (wrangler.toml; yoksa llm.ts varsayılanı aynı) |
| `RL_SALT` | secret | hash tuzu; kota anahtarı `rl:<sha256(tuz\|deviceId\|ip)>:<YYYY-MM-DD UTC>`, TTL 48 sa. Yoksa: `ENVIRONMENT=dev` ise yerel sabit tuz, canlıda kota + LLM kapanır (sadece havuz) |
| `ENVIRONMENT` | var | `wrangler.toml` üst seviye `"dev"` (yerel), `[env.production]` `"production"`. Sadece `dev` yerel tuz fallback'ine izin verir |
| `LLM_DAILY_PER_DEVICE` | var | varsayılan 3 |
| `DAILY_SPEND_CAP_REQUESTS` | var | günlük toplam LLM denemesi tavanı (KV `spend:<UTC gün>` = `{requests, tokens}`, TTL 48 sa). Bozuksa 200, `0` = LLM kapalı. Dolunca 200 + havuz (429 değil) |
| `ALERT_WEBHOOK` | secret | %80'de günde tek POST `{event:"spend_80", date, requests, tokens, cap}` (bayrak `spend-alert:<gün>`); yoksa atlanır, hata yutulur, `waitUntil` ile |
| `DUNNO_FAKE_LLM` | var (sadece yerel) | `1` iken cron sahte sabit laf seti yazar (anahtar/harcama yok). `wrangler.toml`'da **yok**; sadece `worker/.dev.vars` |
| `DUNNO_KV` | KV | sayaçlar, günlük laflar |
Yerelde `worker/.dev.vars` (git'te değil). Örnek: `worker/.dev.vars.example`, gerçek değer olmadan.

## Gizlilik (pazarlık yok)
- Soru metni hiçbir yerde loglanmaz, KV'ye yazılmaz, hata mesajına eklenmez.
- `deviceId` ve IP sadece tuzlu hash olarak sayaç anahtarında kullanılır.
- LLM isteğine kullanıcıyı tanımlayan bilgi eklenmez.

## LLM kuralları
- `max_tokens` ~60, thinking kapalı, 4 sn `AbortController`. System prompt her istekte aynı (önbellek için).
- Prompt iki mod (SPEC 06). `pool_hint` (eski davranış): her zaman yanlış/saçma ama tutarlı; ≤60 karakter; küçük harf; ünlemsiz; emojisiz; küfür yerine `[K]`; yasak konularda kaçamak shrug; istenen dilde.
- `honest_snark` (cihaz başı günde 3, sunucu tarafında da sayılır): kısa ve **doğru** bilgi + sonunda kinayeli kuyruk, ≤ ~120 karakter, küçük harf, ünlemsiz, `[K]` kuralı aynen.
  Emin değilse uydurmaz ("bilmiyorum, ben de şaşırdım"). Yasak konu / gerçek kişi -> kaçamak, **hak düşmez**. Anahtar yok / hata / timeout -> tipine uygun havuz cevabı, hak düşmez.
  Mod, system prompt'un sabit bir bölümüdür (önbellek dostu); seçim istekteki `kind` ile. İstek `kind: "honest" | "pool_hint"` + `qtype`, yanıt `{answer, source, honest}`;
  sözleşme tablosu Q3 teslimatında PM onayıyla güncellenir. `max_tokens` ve `postprocess` uzunluk sınırı honest için ~120 karaktere göre.
- Model çıktısına güvenme: `postprocess` her zaman çalışır (küçük harf, `!`/emoji temizliği, 60 karakter, boşsa havuz).
- Günlük laf üretimi (cron): çıktı JSON şemasıyla doğrulanır; uzunluk, yasak kelime listesi, `{K:...}` formatı geçmeyen laf atılır. Hepsi düşerse önceki gün kalır.

## Günlük laflar (cron `0 6 * * *`, `src/lib/lines.ts`)
- Dil başına ayrı LLM çağrısı (tr, en): aynı model, `max_tokens` 4000, thinking kapalı, 20 sn timeout, ~100 laf istenir.
  Her çağrı harcama sayacına girer; anahtar yoksa ya da tavan doluysa o dil atlanır.
- Laf nesnesi **tek dilli**: `{id, trigger, intent, <lang>: metin}`, ör.
  `{"id":"gen_tr_20261002_017","trigger":"app:excel","intent":"...","tr":"...{K:, ***}"}`. id'yi worker verir.
- İzinli trigger'lar (`LINE_TRIGGERS`): `app:excel|vscode|figma|spotify|browser|slack|word|terminal|game|powerpoint|photoshop|discord|mail|notion|file_explorer|settings`,
  `time:morning|noon|evening|night|late_night`, `idle:10|30|60`, `battery:low`,
  `interaction:click|spam_click|drag|limit_reached`, `random`. `app:zoom` / `app:teams` bilerek yok: toplantıda susulur.
- Doğrulama (geçmeyen laf atılır): `{K:...}` çıkarılmış hali 1–60, tam metin ≤90 karakter; küçük harf (dile göre);
  `!` ve emoji yok; tek satır; en fazla bir, dengeli, boş olmayan `{K:...}`; `[K]` yok; `{K:}` dışında `***` yok;
  yasak konu kelimesi yok (`FORBIDDEN_WORDS` = `content/pool/banned_*.txt`, test eşitliği kontrol eder; tr+en, iki liste de taranır; metin ve intent); görünür metinde tekrar yok; intent 1–160.
- 20'den az geçerli laf kalırsa yazılmaz, önceki set kalır.
- KV: `lines:<lang>:<YYYY-MM-DD>` = `{date, lines}` (TTL 7 gün), sonra `lines:<lang>:latest` = tarih.
- `GET /v1/lines`: gövde KV'deki metnin aynısı; `ETag` = içerik SHA-256'sının ilk 16 baytı; `Cache-Control: public, max-age=300`.
- Yerel deneme: `worker/.dev.vars` içine `DUNNO_FAKE_LLM=1`, `npx wrangler dev --test-scheduled`, sonra
  `curl "http://127.0.0.1:8787/__scheduled?cron=0+6+*+*+*"` ve `curl "http://127.0.0.1:8787/v1/lines?lang=tr"`.
- Windows notu: arka planda başlatılan `wrangler dev` durdurulunca alt süreçler (`workerd.exe`) kalabilir ve 8787'yi
  eski kodla tutar. Yeni oturumdan önce `netstat -ano | findstr :8787` ile boş olduğunu kontrol et.

## Testler (her teslimatta)
- postprocess, validate, pool, platform: kenar durumları.
- ratelimit: 3 izin, 4. red, gün değişimi (KV mock'u Map ile, saat enjekte edilir).
- spend: %80'de tek alarm, %100'de havuz.
- lines: geçerli/geçersiz üretim çıktısı, ETag/304.
- router: her uç için mutlu yol + hata.

## Komutlar (PowerShell)
```
cd worker; npm install
npx wrangler dev
npx vitest run
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke.ps1   # wrangler dev --test-scheduled açıkken, tüm uçlar PASS/FAIL
curl.exe -s -X POST http://127.0.0.1:8787/v1/ask -H "content-type: application/json" -d '{\"question\":\"hi\",\"mode\":\"polite\",\"lang\":\"en\",\"deviceId\":\"test-device-01\"}'
curl.exe -s "http://127.0.0.1:8787/__scheduled?cron=0+6+*+*+*"   # wrangler dev --test-scheduled ile
```

## Teslim kontrol listesi
- [ ] `npx vitest run` geçiyor, `npx tsc --noEmit` temiz
- [ ] Anahtar olmadan tüm uçlar çalışıyor
- [ ] API sözleşmesi değiştiyse bu dosya güncellendi ve PM'e bildirildi
- [ ] Soru metnini loglayan satır yok (`grep -rn "console" src`)
- [ ] `.dev.vars` git'te değil
- [ ] Commit atıldı, PM'e curl çıktılarıyla DONE

## Sürüm ve CORS
- Sürüm yükseltme = `desktop/src-tauri/tauri.conf.json` `version` + `worker/src/data/releases.json` **birlikte** (tek kaynak releases.json; test eşitliği kontrol eder). Windows URL'si Tauri NSIS adıyla biter: `Dunno_<version>_x64-setup.exe`.
- CORS izinli origin'ler (`http.ts` `ALLOWED_ORIGINS`): `tauri://localhost`, `http://tauri.localhost`, `http://localhost:1420` (dev), site (yer tutucu `https://example.com`). OPTIONS: izinli 204, diğer 403. `ETag` expose edilir.

## Hata yönetimi
- `fetch` üst seviyede try/catch'li: beklenmeyen hata `/v1/ask`'te `200` + havuz (en/polite), diğer uçlarda `500 {"error":"internal error"}`. Ayrıntı yanıta ve loga girmez.
- `scheduled` hatası yutulur; o gün laf yazılmaz, önceki set kalır.

## Canlıya çıkış kontrol listesi
- [ ] Deploy her zaman `npx wrangler deploy --env production` (üst seviye `dev` işaretli, canlıya gitmez).
- [ ] Secret'lar `--env production` ile tanımlı: `RL_SALT` (rastgele, ≥32 karakter), `OPENROUTER_API_KEY`, `ALERT_WEBHOOK`. `RL_SALT` yoksa kota ve LLM kapalı kalır (sadece havuz): deploy sonrası `/v1/ask` `source:"llm"` dönebiliyor mu bak.
- [ ] `[env.production]` KV namespace id'si gerçek namespace (yer tutucu `000...` değil).
- [ ] `ENVIRONMENT` canlıda `"production"`; asla `"dev"`.
- [ ] `DUNNO_FAKE_LLM` canlıda tanımlı değil.
- [ ] OpenRouter hesabında prompt loglama ve eğitim için kullanım kapalı; sağlayıcı yönlendirmesi veri saklamayanlarla sınırlı. Gizlilik metninde "LLM'e giden sorular sağlayıcıya iletilir, saklanmaz" ifadesi var.
- [ ] CORS: `http.ts` `ALLOWED_ORIGINS`'te site yer tutucusu (`https://example.com`) gerçek site origin'iyle değişti.
- [ ] Masaüstü `tauri.conf.json` CSP `connect-src` canlı worker origin'ini içeriyor; `api.ts` base URL canlı adres.
- [ ] Workers Logs / Logpush kapalı; açılacaksa istek başlıkları (IP) toplanmayacak şekilde, gövde asla.
- [ ] `releases.json` gerçek indirme URL'leri ve boyut; `npm run check:release` geçiyor.
- [ ] `DAILY_SPEND_CAP_REQUESTS` gerçek bütçeye göre; `ALERT_WEBHOOK`'a test POST'u ulaştı.
