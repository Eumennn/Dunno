# SPEC 16 raporu: Kişisel Dunno (opt-in)

> 2026-10-07. Manuel kontrol: `desktop-manual-test.md` bölüm 25. Spec: `specs/16-personal-dunno.md`. Gizlilik metni: `orchestrator/repo-split/public-app/PRIVACY.md`.

## Ne yapıldı
- `desktop/src/personal/profile.ts` (saf): profil (ad, şakalar, konular, rutinler, tercihler, 5 kaydırıcı), girdi süzgeci (sır/kimlik ve hassas konu
  reddi, uzunluk, en fazla 8 madde), rıza (`consentAt`), sil (= kapat), kaydırıcı -> davranış, şablon seçimi (ton ağırlıklı) + doldurma, 60 karakter sınırı.
- `content/personal/templates.json`: 24 şablon (TR + EN), `{name}` `{app}` `{joke}` `{topic}` `{workflow}` `{pref}`; plan örneği
  "nabıyon{K: lan} {name}, yine {app}'de kayıp".
- Pet penceresi: Pro + açıksa kendiliğinden lafların %25'i kişisel (easter egg katmanından sonra); konuşma/dolaşma kaydırıcılardan. Uygulama adı sadece
  `app:` etiketinden.
- settings.exe > kişisel dunno: ne kullanıp ne kullanmadığı her zaman yazılı; Free'de "pro" notu; rıza kutusu işaretlenmeden "aç" basılmaz; açıkken form
  (ad + 4 liste + 5 kaydırıcı), reddedilen girdinin nedeni, "hepsini sil ve kapat".
- PRIVACY.md: modlar, kişisel dunno, pro lisansı eklendi.

## Plan v2'den sapma (bilinçli)
"Pro, açık rızayla Dunno konuşmalarını kullanabilir" maddesi uygulanmadı: CLAUDE.md "soru içerikleri loglanmaz, saklanmaz" kuralı üstte.
Profil sadece bilerek yazılanlardan.

## Doğrulama
- desktop 1355 test (profile 10, talker kişisel katman 1), pool:check, tsc + typecheck:node, vite build, studio 42, worker 143, cargo test 73,
  Windows clippy temiz, check:release PASS (updater pubkey uyarısı, beklenen).
- Görüntüler: `ui-shots/spec16-consent.png`, `spec16-profile.png`.

## Tasarımcı / kullanıcı onayı bekleyenler
Şablon metinleri (24 x 2), kişisel pay (%25), açıklama metinleri.
