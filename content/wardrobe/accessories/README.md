# aksesuarlar

Her aksesuar iki dosya: `<id>.png` (görüntü) + `<id>.json` (nereye, nasıl oturur).
Masaüstü uygulaması aksesuarı her karede dunno'nun bağlantı noktasına (`content/art/dunno_anchors.json`) oturtur.

## kendi aksesuarını eklemek

1. **görüntü:** 32x32 PNG, saydam zemin. Sadece ana palet (docs/agents/ui.md): `#2B1E2F` kontur, `#F2A65A` `#D9774A` `#FFD29A` `#FFF1D6` turuncu/krem, `#E86A7A` pembe, `#6EC5E9` mavi, `#FFFFFF` beyaz. Yarı saydam piksel, gradyan, yumuşak kenar yok.
   Tema rengiyle boyanmaz: aksesuar her temada aynı renkte kalır.
2. **pivot:** görüntüde bağlantı noktasına oturacak piksel. Varsayılan ve önerilen `(16,16)`:
   - `head`: kafanın tepesi, tüyün dibi (şapka alt kenarı buraya oturur)
   - `eyes`: iki gözün ortası
   - `ears`: kafanın yan ortası, göz hizası (kulaklık bandının ortası)
   - `neck`: yüz ile karın arası, ortada (atkı, papyon, pelerin; SPEC 09 K6). Yatık uykuda yok.
3. **`<id>.json`:**
   ```json
   {
     "id": "my_hat",
     "name": { "tr": "şapkam", "en": "my hat" },
     "anchor": "head",
     "slot": "head",
     "pivot": { "x": 16, "y": 16 },
     "antenna": "through",
     "hiddenIn": ["sleep"],
     "image": "my_hat.png",
     "size": 32
   }
   ```
   - `id`: küçük harf snake_case, dosya adıyla aynı. `name`: küçük harf.
   - `anchor`: `head` | `eyes` | `ears` | `neck`.
   - `slot` (SPEC 09 K6): `head` | `eyes` | `neck` | `body` | `side` (tüy yanı). Aynı slotta tek parça, farklı slotlar birlikte, en fazla 3.
     Yoksa bağlantı noktasından (eyes -> eyes, neck -> neck, diğerleri head). Yeni id `desktop/src/wardrobe/wardrobe.ts` ACCESSORY_SLOTS'a da eklenir.
   - `overflow` (SPEC 09 K1): gövde konturu dışına izinli taşma `{ top, side, bottom }` (sprite px); `scripts/fit.test.ts` sınar.
   - `antenna` (tüy kararı): `through` = tüy deliğinden çıkar, tüy aksesuarın önünde çizilir; `behind` = tüy aksesuarın arkasında kalır.
   - `hiddenIn`: bu durumlarda çizilmez (`idle, shrug, walk, talk, sleep, run_away, sulk, peek, shh, dragged`).
     Bağlantı noktası bir karede gizliyse (ör. sulk'ta dunno arkasını döner, göz yok) zaten çizilmez.
     Şimdilik tüm şapka ve gözlükler `sleep`te gizli (yatık poz); dönük/uyku varyantı çizilirse bu kaldırılır.
4. **kontrol:** `cd desktop; npx vitest run src/wardrobe` aksesuarı ve bağlantı noktalarını doğrular.
5. Kilit açma koşulu (hangi başarım açar) `desktop/src/wardrobe/achievements.ts` içindedir; yeni id oraya eklenmeden dolapta görünmez.

## yerleşik yirmi aksesuar

SPEC 05: bere, taç, parti şapkası, gece başlığı, güneş gözlüğü, kulaklık.
SPEC 09 K6 (placeholder çizim, tasarımcı onayı bekliyor): kovboy şapkası, korsan bandanası, aşçı şapkası, sihirbaz şapkası, mezuniyet kepi,
inşaat kaskı, kedi kulakları (head) · monokl, nerd gözlüğü (eyes) · papyon, atkı (neck) · pelerin (body) · kurdele, çiçek (side).
Bunlar elle değil üreticiyle çizilir:
harita `desktop/scripts/sprites/accessories.mjs`, sonra `cd desktop; node scripts/gen-wardrobe.mjs` (png + json + bağlantı noktaları).
Bu dosyaları elle düzenleme; testler üreticiyle aynı olmalarını bekler. Önizleme: `node scripts/gen-wardrobe.mjs --preview <png>`.
Tüy kararı: bere, parti şapkası, gece başlığı, güneş gözlüğü, kulaklık `through` (tüy önde); taç `behind` (kıvrım taçın üstünde kalır).
Kural: tüy her karede görünür olmalı (test: en az 3 tüy pikseli); şapkan tüyü kapatıyorsa `through` yap ya da çizimi tüyün dışında bırak.

## kendi sprite sheet'in için bağlantı noktaları

`dunno_anchors.json` sheet'in her karesi (`dunno N.aseprite`, aynı sıra) için `head`, `antenna`, `eyes`, `ears` noktasını tutar.
Bir nokta karede görünmüyorsa koordinat yerine gerekçe yazılır: `{ "hidden": "back view" }`. Boş bırakmak hata sayılır.
Kare ekran kenarının arkasından bakıyorsa (peek) `"clipRight": 26`: o x ve sağı kenarın arkasıdır, aksesuar orada çizilmez.
Kendi sheet'ini çizersen: rol renklerini koru (`#F2A65A` gövde, `#D9774A` gölge, `#FFD29A` ışık, `#FFF1D6` yüz/karın) ki temalar boyayabilsin,
ve her kare için noktaları bu dosyaya gir (üretici yalnızca yerleşik sheet için yazar).

## kostümler (SPEC 09 K2)

`content/wardrobe/costumes/<id>.json` + parça görüntüleri `<id>.<parça>.png` + dolap simgesi `<id>.png`. Üretici: `desktop/scripts/sprites/costumes.mjs` -> `node scripts/gen-wardrobe.mjs`.
- `palette`: gövde rol renkleri (`body`, `shade`, `light`, `belly`); sadece ana palet ya da themes.json renkleri (test).
- `bands`: `{ anchor, rows, color }`: noktaya göre satırlarda gövde/gölge/ışık pikselleri tek renk (arı çizgileri, pizza kenarı).
- `parts`: aksesuar gibi noktaya oturan katmanlar (`anchor`, `pivot`, `hiddenIn`, isteğe bağlı `frames: "even" | "odd"`: kanat çırpma).
- `hidesTuft`: tüy çizilmez (antenler yerini alır). `blocks`: kapattığı aksesuar slotları (astronot kaskı -> head, eyes, side).
Kontrol: `cd desktop; npx vitest run scripts/costume-bounds.test.ts scripts/wardrobe-content.test.ts`. Önizleme: `fit.html?costume=<id>` (dev).
İlk set (placeholder, tasarımcı onayı bekliyor): böcek, sinek, arı, hayalet, dinozor, kurbağa, astronot, pizza dilimi.
