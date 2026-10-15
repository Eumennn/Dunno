# SPEC 13 raporu: uygulamaya özel tepki derinliği

> 2026-10-07. Manuel kontrol: `desktop-manual-test.md` bölüm 22. Spec: `specs/13-app-reactions.md`. Onay listesi: `content/pool/PENDING-SPEC13.md`.

## Ne yapıldı
- **Havuz**: 392 yeni laf (196 TR + 196 EN, ayrı yazıldı). 10 uygulama + 2 site kategorisi 20'ye çıktı; steam, blender, ide, study yeni (20'şer).
  Toplam havuz dil başına 1654 laf. Tümü marka kurallarından geçti (≤60 karakter, küçük harf, ünlem/emoji yok, yasak kelime yok, küfür `{K:}` içinde `***`).
- **Nadir laflar** (`rare: true`): derin trigger başına dil başına 2 (toplam 64), kendine ya da dördüncü duvara göz kırpan easter egg tadında
  ("kütüphanede 'dunno' adında bir oyun yok. henüz"). Motor seçilen grupta %10 olasılıkla nadirden seçer; grupta nadir yoksa ek zar yok
  (eski seçimler birebir aynı). pool:check en az 2 nadiri zorunlu tutar.
- **Rust exe tablosu**: steam, blender, ide (9 IDE + sublime + notepad++), study (7 uygulama), game (6 başlatıcı). Exe adı cihazda kalır.
- **Uygulama tepkisi** (`talk/app-react.ts`, saf): geçip 25 sn kalınca ziyaret başına tek zar, genel 6 dk / uygulama 40 dk bekleme
  ("az" sıklıkta iki kat), site kategorisi uygulamadan önce. Sadece o uygulamanın lafı (`pickExact`, random yedeği yok); konuşunca kendiliğinden
  laf zamanlayıcısı yeniden kurulur (üst üste konuşmaz). Bugün sus / toplantı / sessiz site / meşgulken zar atılmaz.
- Dunno Studio ağacında yeni etiketler ve hedefler görünür.

## Doğrulama
- desktop 1310 test (app-react 6, talker-app-react 3, engine nadir 4, pool-check nadir 1), pool:check 0 hata 0 açık, COVERAGE.md güncel,
  tsc + typecheck:node, vite build, studio 42, worker 143, Rust cargo test 69 (exe tablosu), Windows clippy temiz.
- Yapılamayan: gerçek Windows'ta uygulama geçişi (manuel 22).

## Tasarımcı onayı bekleyenler
392 laf (`PENDING-SPEC13.md`), nadir oranı (%10), tepki zamanlaması (25 sn / 6 dk / 40 dk).
