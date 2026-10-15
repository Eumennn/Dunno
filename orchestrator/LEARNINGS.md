# Öğrenilenler

Ajanlar burada sorun → kök neden → çözüm formatında kısa notlar bırakır. Aynı hatayı iki kez yapmamak için.

## Kurulum
- Gerçek tmux Windows'ta yok; yerine psmux kullanılıyor (tmux komut uyumlu, `tmux` adıyla da gelir). WSL kullanılmıyor.
- Orijinal orkestratör scriptleri macOS'a göreydi (`date -v`, `bc`, sabit `/Users/...` yolları, var olmayan `claude_control.py`). Git Bash'e uyarlandı.
- psmux `paste-buffer -t` hedefi YOK SAYIYOR, metni aktif pencereye yapıştırıyor. Mesajlar `send-keys -l` ile gönderiliyor, satır sonları boşluğa çevriliyor.
- psmux 3.3.8 test sonuçları (2026-10-01): `new-session -d -c`, `send-keys`, `capture-pane -p`, `display-message -p`,
  `list-windows -F`, `has-session`, `send-keys -l` (Türkçe karakter dahil) çalışıyor. `nohup` ile zamanlanmış mesaj Git Bash'ten çalışıyor.
- psmux'ta `new-window -t oturum:N` pencere OLUŞTURMUYOR (hata da vermiyor). `new-window -t oturum` kullan; indeksler sırayla gelir.
- Pencerelerdeki kabuk Windows PowerShell 5.1: `&&` yok, `;` kullan.

## Ajan izinleri
- Mühendisler heredoc / `{ "..." }` içeren Bash komutlarında "Contains brace with quote character" izin sorusuna takılıyor ve
  kullanıcı onaylayana kadar tamamen duruyor (2026-10-02, F1 ve B2 ikisi de). Çözüm: ajanları `--permission-mode auto` ile başlat
  ya da dosya yazmak için heredoc yerine Write/Edit aracını kullan. PM izin sorusuna asla tuş göndermez.

## PM
- Kullanıcı gece yokken (2026-10-02): görsel teslimatlar otomatik kontrollerle geçici kabul edilir, sabah listesi `desktop-manual-test.md` başında tutulur. Kullanım limiti dolarsa sıfırlanma + 5 dk'ya `schedule_with_note.sh` ile PM ve mühendisler uyandırılır.
- Claude Code prompt'undaki soluk (dim, `ESC[2m`) metin öneri/ghost text'tir; girdi boş sayılır. `capture-pane -e` ile kontrol edilir.

## Masaüstü
- Git Bash PATH'inde cargo yok: `export PATH="$HOME/.cargo/bin:$PATH"` (PowerShell'de `$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path`).
- Tıklama geçirme otomatik doğrulanabilir: `SetCursorPos` + `WindowFromPoint` + `WS_EX_TRANSPARENT` kontrolü. Gerçek fare aynı anda oynarsa sonuçlar kayar; ölçümden sonra `GetCursorPos` ile gerçek konumu raporla.
- PM: `git merge ... | tail -1 && git tag` zinciri çakışmada da tag atar (pipe'ın çıkış kodu tail'inki). Merge'ü pipe'sız çalıştır, başarılıysa tag at.
- Backend (Windows): TaskStop / Ctrl+C `wrangler dev` alt süreçlerini (workerd) her zaman kapatmıyor; 8787'de eski kodla zombi kalabiliyor. Yeni test öncesi `Get-Process workerd | Stop-Process` ile temizle.
- PM: wrangler dev'i kapatmak için workerd'yi öldürmek yetmez, ana node süreci yeniden başlatır. Port sahibini değil, `wrangler dev ... --port <p>` ana sürecini (komut satırında `wrangler` VE port geçen node.exe) kapat. `CommandLine -match "<port>"` gibi geniş desen kendi bash kabuklarını da öldürür; deseni daralt.
- Smoke testi geliştiricinin 8787'sine dokunmadan PM tarafından `--port 8788 --var DUNNO_FAKE_LLM:1` ile koşulabilir (`.dev.vars` gerekmez).
- PM: entegrasyon testinde worker dunno:3'te main/worker'dan PM tarafından açılır (`npx wrangler dev --test-scheduled --var DUNNO_FAKE_LLM:1`); masaüstü mühendisi worker/'a dokunmaz.
- OLAY (2026-10-02): `wrangler dev` çalışan pencereye yanlışlıkla tuş gidince wrangler kısayolu Cloudflare Tunnel açtı, yerel worker internete açıldı. Kök neden: interaktif kısayollar açık + pencere sahipliği belirsiz. Çözüm: wrangler her zaman `--ip 127.0.0.1 --show-interactive-dev-session=false` ile; dunno:3 sadece PM'in; mühendisler uzun süreçleri kendi arka plan süreçlerinde çalıştırır.
- Masaüstü probları SendInput/klavye ile yazı gönderiyorsa önce `GetForegroundWindow` kendi penceresi mi kontrol etmeli; aksi halde metin rastgele öndeki pencereye gider (2026-10-02 D4 testinde oldu).
- OLAY (2026-10-02 D4 çevrimdışı prob): sentetik tıklamalar pet yerine öndeki yabancı pencerelere gitti (görev çubuğu gizli simge menüsü; Riot Vanguard güvenlik penceresinde muhtemelen 'Vazgeç'). Kural: sentetik giriş sadece WindowFromPoint hedefi dunno penceresiyse; yabancı pencere üstteyse atla; mümkünse gerçek fare yerine dev-only komutla akış tetikle.
- NSIS (Tauri) sessiz kurulum/kaldırma aynı adla çalışan dunno.exe'yi öldürür; kurulum testini geliştirme süreçleri kapalıyken, koordineli yap.
- dunno:3 her zaman uygulama penceresi değil: içinde wrangler dev çalışırken gönderilen `npm run tauri dev` tuşları wrangler kısayolu olarak okundu ve bir Cloudflare Tunnel açtı (2026-10-02, D4). Paylaşılan panele tuş göndermeden önce `capture-pane` ile ne çalıştığına bak; kendi dev sürecini arka plan Bash'te çalıştır.
- Sentetik tıklama/tuş probu: tıklamadan önce hedef piksel `WindowFromPoint` ile dunno penceresi olmalı, yazmadan önce `GetForegroundWindow` dunno olmalı. Değilse atla; üstteki başka uygulamanın penceresine (ör. Vanguard diyaloğu) asla dokunma. Odak geri verildiğinde önceki pencere kendisi topmost ise pet'in üstüne çıkabilir.
- 2026-10-02: Gece 03:32'de kullanım limiti doldu, ekip 07:00 sıfırlamasında uyanmadı (zamanlanmış uyanışlar limit sırasında boşa gitti, oturum sonra kapandı). Sabah elle yeniden başlatmak gerekti.
- psmux sunucusunu bir Claude oturumunun içinden başlatınca CLAUDE_CODE_CHILD_SESSION / ANTHROPIC_BASE_URL gibi değişkenler ajanlara geçiyor: "Transcript saving is off", --continue bozuluyor. start-team.sh artık bunları temizliyor.
- Gece bir D3 testi SendInput ile gerçek ekrana tıkladı (Riot Vanguard penceresi) ve öndeki pencereye yazı yazdı. CLAUDE.md'ye "Test güvenliği" kuralı eklendi.
- Kullanıcının PowerShell'inde script çalıştırma kapalı: npm (npm.ps1) engelleniyor. Kullanıcıya verilen komutlarda npm.cmd kullan ya da .cmd başlatıcı ver (kökte Studio.cmd).
- 2026-10-03: tmux sunucusu bu Claude oturumunun alt süreci olarak başlatılınca oturum yeniden başlayınca ekip de kapandı (22:48). Artık ekip explorer.exe üzerinden orchestrator/ResumeTeam.cmd ile başlatılıyor (Claude süreç ağacından bağımsız, temiz ortam).
