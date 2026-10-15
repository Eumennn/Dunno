# UI / Tasarım Sistemi Rehberi (masaüstü uygulaması)

Kim okur: Masaüstü mühendisi (zorunlu), PM (her görsel teslimatta).
Kaynak: `docs/PROJECT.md` (Marka), `dunno-handoff.md` §2–3 (aynı marka dili, landing'den). Landing page'e (kök `index.html`) dokunulmaz.
Tasarımcı karar vermeden yeni görsel öğe icat edilmez; eksikse yer tutucu kullan ve PM'e bildir.

## Token'lar (`desktop/src/styles/tokens.css`)
```css
:root{
  --ink:#2B1E2F;      /* kontur, metin, gölge. saf siyah yok */
  --main:#F2A65A;     /* ana turuncu */
  --shade:#D9774A;    /* gölge */
  --light:#FFD29A;    /* ışık, butonlar */
  --cream:#FFF1D6;    /* krem zemin */
  --pink:#E86A7A;     /* yanak, kalp, uyarı */
  --ice:#6EC5E9;      /* vurgu, seçim. karakterde yok */
  --paper:#FFFFFF;    /* konuşma balonu, input */
  --ink-2:#5C4560;    /* ikincil metin */
  --font-pixel:'Silkscreen',monospace;   /* başlık, küçük etiket */
  --font-body:'Inter',system-ui,sans-serif; /* balon metni; Türkçe karakter desteği şart */
}
```
- Renkler sadece bu değişkenlerle. Bileşen CSS'inde hex yasak (tek istisna tokens.css).
- Fontlar uygulamaya gömülür (çevrimdışı çalışmalı); Google Fonts'tan çalışma anında çekilmez.

## Değişmez görsel kurallar
- Sert offset gölge (`3px 3px 0 var(--ink)`), blur yok. `border-radius` yok. Gradyan yok.
  - **İstisna (SPEC 09 K4): sadece konuşma ve düşünce balonları** (`.speech-bubble`, `.thought-bubble`) basamaklı piksel "yuvarlak" köşe kullanır: `border-radius` değil, `ui-kit/bubble.ts` clip-path çokgeni (2 px basamak, köşe profili [3, 2, 1]); gölge kapta `filter: drop-shadow(3px 3px 0 var(--ink))` (bulanıksız, balon + kuyruk şeklini izler). Kuyruk 12x12 basamaklı piksel üçgen (--ink kontur + beyaz iç, balon konturuna kaynaşır); düşünce balonunda 3 küçülen piksel daire (8/6/4 px, 1 px kontur, 3 px ara, diyagonal). ask.exe / error.exe / pencereler köşeli kalır.
- **Uygulama geneli tema (SPEC 09 K5):** seçili tema `--main --light --shade --ice --cream --text` (ve koyu temada `--text-2 --surface`) token'larını `src/wardrobe/ui-theme.ts` ile root'a yazar; kontrastı geçmeyen tema UI'a uygulanmaz. Metin rengi `--text` (kontur/gölge `--ink` sabit). Sabit zeminlerde sabit metin: `--paper` (balon, input, toast, segment) üstünde `--ink`; `--ink` (seçili segment, `.kick`, koyu buton) üstünde `--on-ink`. İçerik zemini `--surface` (beyaz; koyu temada tema zemini). `--pink` (error.exe) sabit.
- 2px `--ink` kontur. Piksel hissi: animasyonlar `steps()`, ölçekler tam sayı.
- Emoji yok, ünlem yok, metinler küçük harf (marka sesi CLAUDE.md'de).

## Bileşenler
| Bileşen | Not |
|---|---|
| Konuşma balonu | `--paper` zemin, `--ink` kontur, pet'e bakan piksel kuyruk. `ui_bubble.png` (9-slice) gelince onunla değişir. Maks genişlik ~220px, metin ≤60 karakter. |
| Soru kutusu | Balon içinde input + gönder. Placeholder TR/EN. Enter gönderir, Esc kapatır. |
| Kalpler | Günlük 3 hak, 7x6 piksel kalp (handoff §3). `ui_hearts.png` gelince değişir. |
| İlk açılış | Dil ve ağız modu seçimi; iki büyük piksel buton, pencere stili (`--main` başlık çubuğu, Silkscreen). |
| Tray menüsü | Sistem menüsü (Tauri tray), stil yok; metinler marka sesinde. |
| Kademeli kaydırıcı (SPEC 09 K8b) | `stepSliderHtml` (ui-kit): native range, step 1, sadece tam kademe; altında kademe adları. Ray ve kare başparmak `--text` (klasikte `--ink`, koyu temada açık), yuvarlak köşe yok. settings.exe boyut. |
| Anahtar (pswitch) | Dış kontur ve gölge `--text` (SPEC 09: gece yarısında `--ink` kontur zeminde kayboluyordu); topuz konturu `--ink`. |

## Sprite
- Aseprite sheet (48x48, frameTags = durum) -> canvas, smoothing kapalı, 2-3x. Detay `docs/agents/desktop.md`.
- Gerçek sheet gelene kadar placeholder; handoff §3'teki piksel haritalarla (uyanık/uyuyan gövde) basit bir statik sprite da kullanılabilir.

## Tema renkleri (SPEC 05 W1 sprite, SPEC 09 K5 uygulama geneli)
Ana palet dışındaki renkler **sadece burada ve `content/wardrobe/themes.json`'da** yaşar. Tema hem Dunno'nun sprite'ını hem tüm .exe pencerelerini
(dunno.exe, ask.exe, error.exe, setup.exe, toast, balon kuyruğu) renklendirir. Doğrulayıcı: `desktop/src/wardrobe/themes.ts` (+ testler).
Tablo themes.json'dan üretilir; elle düzenleme yerine önce themes.json, sonra bu tablo. **Klasik dışındaki tüm temalar tasarımcı onayı bekliyor.**

### Sprite renkleri
| tema (id) | ad tr / en | gövde | gölge | ışık | yüz-karın | durum |
|---|---|---|---|---|---|---|
| classic | klasik / classic | #F2A65A | #D9774A | #FFD29A | #FFF1D6 | onaylı (ana palet) |
| mint | nane / mint | #7FCFA8 | #55AE86 | #BDEBD2 | #FFF1D6 | aday, tasarımcı onayı bekliyor |
| lavender | lavanta / lavender | #B49AE0 | #9478C9 | #DCCEF6 | #FFF1D6 | aday, tasarımcı onayı bekliyor |
| night | gece / night | #6475B0 | #4E5D94 | #94A4D8 | #D9E0F6 | aday, tasarımcı onayı bekliyor |
| burnt_toast | yanmış tost / burnt toast | #B5713F | #8E5330 | #DDA470 | #FFF1D6 | aday, tasarımcı onayı bekliyor |
| strawberry | çilek / strawberry | #F4838F | #D9576A | #FFC2C8 | #FFF1F0 | aday, tasarımcı onayı bekliyor |
| lemon | limon / lemon | #F2D54E | #D1AE2A | #FFF0A0 | #FFFBE0 | aday, tasarımcı onayı bekliyor |
| ocean | okyanus / ocean | #5FB3D9 | #3E8FB8 | #A8DCF0 | #E8F6FB | aday, tasarımcı onayı bekliyor |
| forest | orman / forest | #7DB36A | #5A9148 | #B9DCA6 | #F1F7E8 | aday, tasarımcı onayı bekliyor |
| peach | şeftali / peach | #F7A982 | #E08560 | #FFD3BC | #FFF3EA | aday, tasarımcı onayı bekliyor |
| gray_cat | gri kedi / gray cat | #A9A9A9 | #888888 | #D2D2D2 | #F2F2F2 | aday, tasarımcı onayı bekliyor |
| coffee | kahve / coffee | #CFA070 | #A8754A | #ECD0AE | #F7EBDD | aday, tasarımcı onayı bekliyor |
| midnight | gece yarısı / midnight | #6676C2 | #4C5AA4 | #A5B0E6 | #E4E8FA | aday, tasarımcı onayı bekliyor |
| retro_green | retro yeşil / retro green | #66CC66 | #3F9E45 | #A8F0A0 | #EAFBE6 | aday, tasarımcı onayı bekliyor |
| cotton_candy | pamuk şeker / cotton candy | #F4A6D7 | #DB7FBA | #FFD1EC | #FFF2FA | aday, tasarımcı onayı bekliyor |
| watermelon | karpuz / watermelon | #74C26A | #4F9A4A | #B6E6A8 | #FFF0EE | aday, tasarımcı onayı bekliyor |

- **Sabit:** kontur `#2B1E2F`, yanak `#E86A7A` (göz kontur rengiyle çizilir). Temalar bunları değiştirmez; karakter tanınır kalır.
- **Kurallar (testte, WCAG 2 kontrast oranı):** açıklık sırası gölge < gövde < ışık, her basamak ≥ 1.25;
  gövde/kontur ≥ 3; gölge/kontur ≥ 2.2; ışık/kontur ≥ 4.5; yüz-karın/kontur ≥ 4.5; yanak/gövde ≥ 1.2; yanak/yüz-karın ≥ 2.

### UI rolleri (SPEC 09 K5)
Rol -> ui-kit token'ı: başlık çubuğu `--main`, buton `--light`, buton gölgesi `--shade`, vurgu `--ice`, zemin `--cream`, metin `--text` (`uiTokens()`).
Varsayılan türetme: başlık = gövde, buton = ışık, buton gölgesi = gölge, zemin = yüz-karın, vurgu = `#6EC5E9`, metin = `#2B1E2F`.
**Kalın** değerler temanın `ui` alanındaki bilinçli seçim (türetilen renk kontrastı geçmediği için ya da tema vurgusu).
**Sabit (her temada):** `--ink` kontur, `--paper` beyaz balon zemini, `--pink` hata çubuğu (error.exe her temada pembe).

| tema | başlık | buton | buton gölgesi | vurgu | zemin | metin | mod | en düşük metin kontrastı |
|---|---|---|---|---|---|---|---|---|
| classic | #F2A65A | #FFD29A | #D9774A | #6EC5E9 | #FFF1D6 | #2B1E2F | açık | 7.8 |
| mint | #7FCFA8 | #BDEBD2 | #55AE86 | **#FFB37A** | #FFF1D6 | #2B1E2F | açık | 8.6 |
| lavender | #B49AE0 | #DCCEF6 | #9478C9 | **#F7C66B** | #FFF1D6 | #2B1E2F | açık | 6.5 |
| night | **#94A4D8** | **#C4CEF0** | **#6475B0** | **#F2C46B** | #D9E0F6 | #2B1E2F | açık | 6.4 |
| burnt_toast | **#DDA470** | **#F0CBA0** | **#B5713F** | #6EC5E9 | #FFF1D6 | #2B1E2F | açık | 7.2 |
| strawberry | #F4838F | #FFC2C8 | #D9576A | **#8FD18F** | #FFF1F0 | #2B1E2F | açık | 6.4 |
| lemon | #F2D54E | #FFF0A0 | #D1AE2A | **#8FCF6A** | #FFFBE0 | #2B1E2F | açık | 8.5 |
| ocean | #5FB3D9 | #A8DCF0 | #3E8FB8 | **#FFC46B** | #E8F6FB | #2B1E2F | açık | 6.7 |
| forest | #7DB36A | #B9DCA6 | #5A9148 | **#E8B04E** | #F1F7E8 | #2B1E2F | açık | 6.4 |
| peach | #F7A982 | #FFD3BC | #E08560 | **#7FC4D9** | #FFF3EA | #2B1E2F | açık | 8.1 |
| gray_cat | #A9A9A9 | #D2D2D2 | #888888 | **#CFCFCF** | #F2F2F2 | #2B1E2F | açık | 6.7 |
| coffee | #CFA070 | #ECD0AE | #A8754A | **#8FC1D4** | #F7EBDD | #2B1E2F | açık | 6.7 |
| midnight | **#3A4378** | **#4A5694** | **#2A3160** | **#2F6E8C** | **#1F2340** | **#F3EEFF** | koyu | 5.0 |
| retro_green | #66CC66 | #A8F0A0 | #3F9E45 | **#FFD24D** | #EAFBE6 | #2B1E2F | açık | 7.8 |
| cotton_candy | #F4A6D7 | #FFD1EC | #DB7FBA | **#9AD8F2** | #FFF2FA | #2B1E2F | açık | 8.5 |
| watermelon | #74C26A | #B6E6A8 | #4F9A4A | **#F2727F** | #FFF0EE | #2B1E2F | açık | 5.6 |

- **UI kuralı (testte):** metin/zemin, metin/başlık çubuğu, metin/buton, metin/vurgu ≥ 4.5. Geçmeyen temanın sprite'ı boyanır ama UI'a uygulanmaz (`uiForTheme` null, klasik kalır).
- **Koyu tema** (`midnight`): metin açık (`--text`), `color-scheme: dark`. ui-kit bileşenleri metinde `--ink` yerine `--text` kullanmalı (açık temalarda ikisi aynı); bileşen CSS'inde hex yok kuralı sürer.
- Klasik temanın UI rolleri bugünkü token'larla birebir aynı (test: `desktop/scripts/themes-tokens.test.ts`).
- Yeni tema ya da renk değişikliği: önce `themes.json`, sonra bu tablo; testler geçmeden merge yok.

## Görsel doğrulama (PM)
1. `npm run tauri dev` ile aç, açık ve koyu duvar kağıdında, %100 ve %150 ölçeklemede bak.
2. Kenarlar keskin mi (bulanık ölçekleme yok), renkler palette mi, Türkçe karakterler doğru mu.
3. Farkları numaralı liste halinde geri gönder.

## Landing ile uyum (SPEC 03'ten itibaren zorunlu)
Masaüstü uygulaması ve Dunno Studio, kök `index.html` ile **aynı görsel dili** kullanır. Kaynak: `dunno-reference.dc.html` `<style>` bloğu.
- Ortak kit `ui-kit/`: `.win`, `.bar` (+`-err/-idle/-blue`), `.ctl`, `.pbtn` (+`-dark/-blue/-sm`), `.kick`, `.hl`, segmented seçici, piksel kalp,
  düşünme balonu, toast. Değerler referanstan birebir kopyalanır, hex yerine token kullanılır. Bileşenler kendi CSS'inde bu sınıfları yeniden yazmaz.
- Eşleme: soru kutusu = landing `ask.exe`; ilk açılış = landing `setup.exe` indirme penceresi; limit/bugün sus = landing hata kutuları;
  ayarlar = `settings.exe` penceresi; bildirim = landing görev çubuğu toast'u.
- Pencere başlıkları `.exe` adlarıyla ve küçük harf (`ask.exe`, `settings.exe`). Metinler marka sesinde.
- Gövde fontu landing'deki gibi `'Segoe UI Variable Text','Segoe UI',system-ui` (uygulamada Inter yedek). Silkscreen sadece başlık çubuğu/etiket; Türkçe harf varsa Segoe'ya düşer.
- Doğrulama: uygulamanın kendi penceresinin görüntüsü + landing'deki karşılığının kırpımı yan yana, `orchestrator/notes/ui-shots/`.
