# Dunno modlama (SPEC 12 B)

Modlar **sadece veridir**: tema, aksesuar, kostüm, laf, ses profili, balon rengi, davranış çarpanı. Kod, betik, link, ağ erişimi yok.
Dunno modu okur, doğrular, geçerse ve sen settings.exe'den açtıysan yükler. Mod soru metnini, pencere başlıklarını, istatistikleri
göremez; zaten hiçbir şey çalıştıramaz.

## Kurulum
1. settings.exe > modlar > **klasörü aç** (`%APPDATA%\app.dunno.desktop\mods\`).
2. Mod klasörünü buraya koy: `mods\<klasör>\manifest.json`.
3. settings.exe'yi yeniden aç: mod listede, **kapalı** görünür. Aç, sonra **yeniden başlat** (modlar açılışta yüklenir).
4. Geçmeyen mod "yüklenmedi" olarak listelenir, altında ilk hatalar yazar. Yarım yükleme olmaz: tek hata, modun tamamını devre dışı bırakır.

Örnek: `content/mods/example_pastel/`. Kopyalayıp başla.

## Klasör
```
mods/
  pastel/
    manifest.json
    themes/pastel_sky.json
    accessories/pastel_bow.json
    accessories/pastel_bow.png
    reactions/tr.json
    reactions/en.json
    sounds.json
    bubbles.json
    behavior.json
    README.md          (isteğe bağlı)
```

## Güvenlik kuralları (hepsi zorunlu, hepsi testli)
| Kural | Sınır |
|---|---|
| Dosya türleri | sadece `.json .png .md .txt`. Başka bir dosya varsa (js, html, exe, dll, ps1, bat, svg...) mod reddedilir |
| Yol | göreli; `..`, mutlak yol, sürücü harfi, ters eğik çizgi, gizli dosya (`.x`) yok |
| Sembolik bağlantı | izlenmez; içinde sembolik bağlantı olan mod reddedilir |
| Boyut | dosya ≤ 256 KB, mod ≤ 2 MB, ≤ 64 dosya, klasör derinliği ≤ 4, en fazla 32 mod |
| Manifest | bilinen alanlar dışında alan yok (script, hook, url...) |
| Metin | hiçbir değer `http:`, `file:`, `javascript:`, `data:`, `<script`, `onclick=`, `eval(`, `import(`, `require(` içeremez |
| İzin | `contents` içindeki her tür `permissions` listesinde olmalı |
| Kimlik | içerik id'leri mod id'si ile başlar (`pastel_...`); yerleşik ya da başka modla çakışan id reddedilir |
| Varsayılan | yeni mod **kapalı** |

## manifest.json
```json
{
  "schema": 1,
  "id": "pastel",
  "name": { "tr": "pastel örnek", "en": "pastel example" },
  "version": "1.0.0",
  "author": "dunno",
  "description": { "tr": "...", "en": "..." },
  "permissions": ["themes", "accessories", "reactions", "sounds", "bubbles", "behavior"],
  "contents": {
    "themes": ["themes/pastel_sky.json"],
    "accessories": ["accessories/pastel_bow.json"],
    "costumes": [],
    "reactions": { "tr": "reactions/tr.json", "en": "reactions/en.json" },
    "sounds": "sounds.json",
    "bubbles": "bubbles.json",
    "behavior": "behavior.json"
  }
}
```
- `id`: snake_case, 2-32 karakter. `version`: `x.y.z`. `author` ≤ 40 karakter.
- En fazla 24 tema/aksesuar/kostüm (tür başına), toplam 200 laf.

## Tema
```json
{ "id": "pastel_sky", "name": { "tr": "pastel gök", "en": "pastel sky" },
  "colors": { "body": "#7FB2E5", "shade": "#5E92C8", "light": "#C4DCF5", "belly": "#FFF1D6" } }
```
Yerleşik temalarla aynı doğrulama (`content/wardrobe/themes.json` kuralları: kontur ve yanak sabit, okunurluk). Uygulama penceresi tokenları da temadan gelir.
Mod temaları kilitsizdir (kurduğun için açık).

## Aksesuar
Yerleşik aksesuar biçimi (`content/wardrobe/accessories/*.json`): `anchor` (head/antenna/eyes/ears/neck), `slot` (head/eyes/neck/body/side),
`pivot`, `antenna` (through/behind), `hiddenIn` (sprite durumları), `image`, `size` (32). PNG `size x size` olmalı, json ile aynı klasörde.

## Kostüm
Yerleşik kostüm biçimi (`content/wardrobe/costumes/*.json`): `palette`, `bands`, `parts` (her biri anchor + PNG), `hidesTuft`, `blocks`, `icon` (32x32).

## Laflar
Yerleşik havuzla aynı kurallar (`npm run pool:check` ile aynı denetim): `id`, `trigger` (izin listesindeki tetikler, örn. `app:excel`,
`interaction:click`), `intent`, dil alanı (`tr` ya da `en`). ≤ 60 karakter, küçük harf, ünlem ve emoji yok, yasak konular yok, küfür sadece
`{K:...}` içinde ve `***`. Mod lafları yerleşik havuza eklenir, yerine geçmez.

## Ses (`sounds.json`)
Kategori -> profil. Kategoriler: `greet answer honest sulk too_fast achievement warn context`. Sınırlar: `base` 80-1200 Hz, `syllables` 1-8,
`dur` 20-200 ms, `gap` 10-150 ms, `glide` 0.5-1.5, `contour` 0.5-2, `wave` square/triangle/sawtooth. Ses yine metinden üretilmez; ses ayarı,
toplantı ve "bugün sus" kuralları aynen geçerli.

## Balon (`bubbles.json`)
`{ "fill": "#F2F7FD", "ink": "#2B1E2F" }`. Kontrast ≥ 4.5 olmalı.

## Davranış (`behavior.json`)
`{ "chattiness": 1.2, "restScale": 1 }`. `chattiness` kendiliğinden konuşma sıklığı çarpanı, `restScale` dinlenme süresi çarpanı
(büyük = daha az yürür). İkisi de 0.5-2. Birden çok modda davranış/balon: son açılan mod kazanır; ses profilleri birleşir.

## Gelecek
Topluluk mod galerisi (dunno-web) ve imzalı modlar ayrı bir iş; şimdilik modu sen klasöre koyarsın.
