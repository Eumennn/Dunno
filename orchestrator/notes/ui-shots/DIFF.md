# U3: landing ile yan yana fark listesi (PM)

Kaynak görüntüler bu klasörde. Her tur PM günceller; "kapalı" = düzeltildi ve yeni görüntüde doğrulandı.

## Tur 1 (2026-10-02 22:30, main 0431b2d)
| # | Yüzey | Fark | Durum |
|---|---|---|---|
| 1 | dunno.exe (TR) | lang=tr iken başlık/sekme/etiketlerin **hepsi** Segoe'ya düşüyor (`dunno.exe`, `home`, `today.txt` Türkçe harf içermiyor). Kural: sadece Türkçe harf (ı ş ğ İ ç ö ü) içeren öğe düşer, öğe bazında. | kapalı (1b3309b) |
| 2 | dunno.exe home | büyük Dunno kenarları yumuşak (ölçekleme pürüzsüz), tüy simetrik ilmek gibi görünüyor; `image-rendering: pixelated` / `imageSmoothingEnabled=false` ve doğru kare/yön kontrolü. | kapalı (1b3309b) |
| 3 | setup.exe | landing’de başlık çubuğunda `.ctl` (küçült/kapat), disket ikonu, alt açıklama satırı ("he'll take up one corner…"), noktalı ayraç var; uygulamada yok. En az `.ctl` + alt açıklama satırı + ayraç. | kapalı (1b3309b) |
| 4 | error.exe | landing’de `!` ikon kutusu, kalın başlık satırı ve `ok` butonu var; uygulamada sadece metin. İkon + kalın başlık + `[ ok ]`. | kapalı (1b3309b) |
| 5 | ask.exe | landing’de araç çubuğunda `polite | street ***` seçici var; uygulamada sadece kalpler. Seçiciyi ekle (ayarla aynı kaynak). Giriş alanı + `ask` butonu görüntüde görünmüyor: soru giriş hâli için ayrı görüntü. | kapalı (1b3309b) |
| 6 | studio | side.ts artık speechHtml + Bubble.setHtml + pet.css kullanıyor (c2bed34); bubble.css desktop’ta silinebilir. | kapalı |
| 7 | genel | Studio/kit/dunno.exe başlıkları, `.pbtn`, `.seg`, kalpler, toast, düşünme balonu landing ile aynı. | tamam |

Tur 1 sonucu (2026-10-02 22:45): 1–5 yeni görüntülerde doğrulandı (u2-surfaces.png, u2-surfaces-tr.png, ask-input.png, m1-app.png, m1-app-home-tr.png). Fark listesi kapandı.
Küçük notlar (açık fark değil): EN placeholder dar alanda kesiliyor ("ask away (i won't answ"); tüyün ilmek görünümü sprite'ın kendisi, tasarımcı Aseprite ayarına dahil.
