# SPEC 01: Dunno landing page (frontend + backend)

PROJECT: Dunno landing page ("Dunno OS")
GOAL: `dunno-handoff.md` ve `dunno-reference.dc.html` içindeki tasarımı birebir, çalışan, deploy edilebilir bir siteye dönüştürmek.
KAYNAK GERÇEK: `dunno-reference.dc.html` > `dunno-handoff.md` > bu spec. Metinler birebir.

## Stack (karar verildi, değiştirme)
- `web/` altında **Astro + TypeScript**, etkileşimli parçalar **React adası** (`client:visible` / `client:load`).
  Statik HTML çıktısı (SEO), JS sadece etkileşimli bileşenlerde.
- Stil: düz CSS (global token dosyası + bileşen CSS'i). Tailwind yok. Referanstaki CSS'i olduğu gibi taşı.
- Backend: **Cloudflare Pages Functions** (`web/functions/`), yerelde `wrangler pages dev`.
  Rate limit için Cloudflare KV. Test: `vitest`.
- Paket yöneticisi: npm. Node 22.
- Geliştirme yerel Windows'ta (PowerShell + Git Bash). Script'ler platformdan bağımsız olsun (`rm -rf` yerine npm araçları vb.).

## Dizin yapısı
```
web/
  astro.config.mjs
  src/
    styles/tokens.css       # palet, fontlar, .win/.bar/.ctl/.pbtn/.hl/.kick
    components/             # .astro (statik) ve .tsx (ada)
      sprites/              # piksel harita -> SVG üretici + tüm ikonlar
    data/                   # cevap havuzları, FAQ, reviews, metinler
    pages/index.astro
  functions/
    download.ts             # GET /download
    api/release.ts          # GET /api/release
    api/ask.ts              # POST /api/ask
    _lib/                   # prompt, postprocess, ratelimit (testli)
  public/releases.json      # sürüm metadata
```

## Teslimatlar

### Frontend (pencere 1)
- F1 İskelet: Astro + React + TS, `tokens.css`, Google Fonts (Silkscreen, Open Sans, IBM Plex Mono), `.desk` zoom kuralları, `overflow-x: clip`, reduced-motion.
- F2 Primitifler: `Win`, `Bar` (normal/err/idle/blue), piksel `Ctl` SVG'leri, `Pbtn` varyantları. Piksel harita string'inden SVG üreten tek bir yardımcı (ardışık aynı renkleri tek `<rect>`'e birleştirir). Dunno (uyanık/uyuyan, kollar aşağı/yukarı), avatar, kum saati, kalp, tüm 10x10 ikonlar (handoff §3 + referans).
- F3 Boot overlay (§4.0, scroll kilidi 3 yoldan kalkar) + header (§4.1).
- F4 Hero (§4.2): başlık, balon (aria-live), tıklanabilir Dunno + shrug döngüsü, yan kısayollar (≥1180px), görev çubuğu + tooltip + toast, hero Dunno davranışları (§5.3: tık sırası, dürtme, 30 sn boşta).
- F5 Demo (§4.3): `ask.exe` (§5.1), `nap.exe`, `productivity.exe` (§5.2). Eşit yükseklik.
- F6 Hikaye (§4.4): mektup satırları çizgilere oturur (32px ritim), RETIRED damgası.
- F7 Known issues (§4.5) + reviews (§4.6).
- F8 İndirme (§4.7): hayalet pencere izi, 3 durum, adım kartları. Sürüm/boyut `/api/release`'den (yoksa yer tutucu).
- F9 Pricing (§4.8), FAQ (§4.9), son CTA (§4.10), footer + karo "dunno" wordmark (§4.11).
- F10 Cila: responsive (§6), erişilebilirlik (§8), meta/OG/favicon yer tutucuları (§7.5), Lighthouse ≥ 90 (performance, a11y).
- F11 Entegrasyon: `ask.exe` `/api/ask`'i çağırır; hata / 429 / 3 sn timeout -> yerel havuzdan cevap. Akış (düşünme balonu, uyuyakalma) aynen kalır.

### Backend (pencere 2)
- B1 `wrangler` kurulumu, `web/functions/` iskeleti, `public/releases.json` (`version`, `size`, `notes`, `urls.windows`, `urls.mac`).
  `GET /download` -> User-Agent'a göre platform URL'sine 302 (URL'ler şimdilik yer tutucu). `GET /api/release` -> JSON.
- B2 `POST /api/ask {question, mode}` -> `{answer, source: "llm"|"pool"}`.
  - Girdi doğrulama (string, ≤200 karakter, mode `polite|street`).
  - LLM adaptörü: OpenRouter, model env'den (`DUNNO_MODEL`, varsayılan Kimi K2.x), `max_tokens` ~60, thinking kapalı, 4 sn timeout.
    Anahtar `OPENROUTER_API_KEY` (`.dev.vars`, commit edilmez). Anahtar yoksa havuzdan cevap.
  - Karakter promptu: her zaman yanlış/saçma ama tutarlı, ≤60 karakter, küçük harf, ünlemsiz, emojisiz, küfür yerine `[K]`.
    Yasak konular (CLAUDE.md) -> kaçamak shrug cevabı.
  - Son işlem: küçük harf, `!` ve emoji temizliği, 60 karaktere kırp, `[K]` -> street'te `***`, polite'ta sil.
  - **Soru içeriği hiçbir yerde loglanmaz.**
- B3 Rate limit: günde 3 soru. Anahtar = SHA-256(IP + User-Agent + gün + `RL_SALT`), KV TTL 24 saat. Aşılınca 429 `{error:"office hours are over"}`.
- B4 Testler (vitest): postprocess, `[K]` dönüşümü, doğrulama, rate limit (KV mock).

## Kısıtlar
- Palet dışı renk yok, yuvarlak köşe yok, blur gölge yok, gradyan zemin yok (noktalı desen hariç).
- Gerçek marka/OS logosu yok. Global `keydown` dinleyicisi yok.
- Her teslimat ayrı commit(ler). 30 dakikada bir commit.
- Yeni bağımlılık eklemeden önce PM'e gerekçe yaz.

## Kabul kriterleri (PM her teslimatta kontrol eder)
- `npm run build` hatasız, TypeScript hatasız.
- Bölüm metinleri handoff ile birebir (PM grep ile örnekler).
- `Dunno OS.html` ile yan yana bakıldığında düzen, renk, tipografi eşleşiyor.
- 375px, 768px, 1280px, 1920px genişlikte yatay scroll yok; görev çubuğu ilk ekranda görünüyor.
- Klavye ile tüm butonlara ulaşılıyor, focus görünür. `prefers-reduced-motion` animasyonları kapatıyor.
- Boot overlay her durumda scroll kilidini kaldırıyor.
- Backend testleri geçiyor; anahtar olmadan `/api/ask` havuzdan cevap dönüyor; 4. soruda 429.

## Kapsam dışı (bu spec'te yapma)
Masaüstü uygulaması (Tauri), günlük laf üretimi, harcama alarmı, gerçek release dosyaları, deploy. Bunlar sonraki spec'ler.

## Doldurulacak yer tutucular (tasarımcıya sorulacak, uydurma)
`[FILE SIZE]`, `[SOCIAL LINK 1]`, `[SOCIAL LINK 2]`, gerçek indirme URL'leri, OG görseli, favicon setleri.
