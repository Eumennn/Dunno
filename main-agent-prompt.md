# MAIN AGENT — DUNNO CONTINUATION PROMPT

Sen bundan sonra Dunno reposunun TEK ana orchestrator/main agentısın.

## KRİTİK DEĞİŞİKLİK

**TMUX KULLANMA.**

- Mevcut tmux orchestrator/mühendis session'larını güvenli biçimde durdur.
- Yeni tmux session açma.
- Sürekli tmux tabanlı mühendis döngüsü çalıştırma.
- Bundan sonra ilerleme, görev dağıtımı, doğrulama, merge, tag, push ve plan güncellemesi main agent tarafından yönetilecek.

Önce git durumunu kontrol et; commitlenmemiş değerli işi kaybetmeden tmux'u kapat.

## TEK DURUM KAYNAĞI

Her uyanışta:

`orchestrator/notes/plan.md`

dosyasını oku.

Ardından:

- `git status`
- branchler
- son commitler
- tagler
- mevcut feature branch durumları

ile planı karşılaştır.

Agent'ın "DONE" demesi tek başına yeterli değildir. DONE işini sen doğrula.

## HEDEF

Sıra kesin:

### Aşama 1
SPEC 09'u tamamen bitir.

SPEC 09:

K1 → K4 + K3 → K5 → K2 + K6 → K7

K8 backend'de paralel.

SPEC 09 bitiş kriterlerini, testleri, headless görüntüleri, installer'ı, REPORT-spec09.md'yi ve manuel bölüm 16'yı doğrula.

### Aşama 2
SPEC 10'a geç.

Sıra:

CL3 + CL2 → CL4 → CL5 → CL1 → CL6

Bağımsız backend işleri uygun şekilde paralel yürütülebilir ama kontrol main agent'tadır.

## SPEC 10 KAPSAMI

Kaynak fikir:

Clicky (`farzaa/clicky`), MIT.

Kod doğrudan taşınmayacak. Dunno Tauri + TS + Rust + Windows'tur.

Birebir kod alınırsa THIRD_PARTY_NOTICES.md'ye MIT telif satırı ekle.

Clicky adı/logo/görseli kullanılmayacak.

### ALINMAYACAKLAR

- ScreenCaptureKit / ekran görüntüsü / ekran okuma
- mikrofon / STT / TTS
- CGEvent global keyboard hook
- cursor-follow tam ekran overlay

### CL1
Tauri updater + imzalı latest.json + GitHub Releases.

Private key:
- local üretilir
- repo'ya girmez
- .gitignore
- rehber

Günde 1 sessiz kontrol.

Toast:
"yeni sürüm. kurmak zorunda değilsin. ama kur"

about.txt:
"güncellemeleri kontrol et"

Worker /v1/release ile aynı sürüm kaynağı.
check:release genişlet.
Gerçek yayın yok; sahte latest.json ile E2E test.

### CL2
- ikinci dereceden Bezier yay
- smoothstep `3t²−2t³`
- 600–900 ms
- dragged pozu
- inişte 1–2 kare yaylanma
- tam sayı piksel offset
- ölçek yok
- saf geometri/süre/iniş fonksiyonları
- UP1 ile çalışma alanı dışına taşmama

EK:
Kullanıcı sürüklerken ortada bırakırsa Dunno havada kalmış gibi davranmalı.

Birincil komik fizik:
- mini paraşüt aç
- kısa havada kal
- yavaşça aşağı in
- hafif salınım
- son anda küçük yaylanma
- idle/sleep/edge pozuna dön

Alternatif varyant:
- hızlı düşüş
- küçük squash/impact
- 1–2 kare çarpma
- sonra normal poz

Gerçek ekran testi yok. Saf fonksiyonlarla test.

### CL3
- karakter karakter metin
- 25–40 ms/karakter
- noktalama sonrası kısa duraklama
- click → anında tamamla
- readingMs ancak metin tamamen bittikten sonra
- aria-live tam metni bir kez oku

### CL4
İlk setup sonrası:
- ortada görün
- peek
- kısa karşılama
- CL2 yayıyla köşeye uç
- uyu

Sadece ilk açılış.
about.txt'ten tekrar oynat.

### CL5
- multi-monitor
- sürükleyerek monitör değiştir
- yeni monitörün work area'sında yaşa
- monitör çıkarılırsa primary'ye dön
- UP1 monitor başına

Saf test:
- farklı DPI
- negatif x sol monitör
- monitör kaldırma

### CL6
telemetry.ts.

Varsayılan KAPALI.

Açık rıza ile:
- app_opened
- question_asked{source}
- achievement_unlocked{id}

Asla:
- soru metni
- pencere başlığı
- kişisel veri

Worker:
`/v1/event`
KV sayaç
cookie-free
third-party SDK yok

Kapalıyken ağ çağrısı kesinlikle sıfır ve testli.

## SEKME FARKINDALIĞI

SPEC 09 K7'nin bir parçası.

Aktif pencere/tarayıcı sekme adı:
- sadece cihazda
- bellekte kategoriye çevrilir
- saklanmaz
- loglanmaz
- ağa gitmez
- LLM'e gitmez

Kategori:
video, social, shopping, news, mail, code, ai_chat, docs, music, maps, learning, game_store, search, adult/kumar.

adult/kumar → sessiz.

Marka adı sadece sites.json eşleme anahtarında.
Dunno'nun lafında marka adı kullanma.

Öncelik:
site:* > app:* > time > idle

Her site kategorisi ≥10 TR + ≥10 EN.

Settings:
"sekme adlarına bak: açık/kapalı"

Varsayılan açık.

Gizlilik:
"başlığı okur, unutur. hiçbir yere göndermez"

Kullanıcı isteği:
Sekme adına göre bağlamsal laf atabilsin ama ham başlığı asla dışarı aktarma. Kategori bazlı konuş.

## TEST / KABUL

SPEC 09:
- desktop + worker + studio
- tsc
- pool:check
- tauri build
- cargo clippy -- -D warnings
- cargo test
- headless görüntüler
- installer
- REPORT-spec09
- manuel 16

SPEC 10:
- desktop + worker test
- tsc
- tauri build
- clippy
- installer
- REPORT-spec10
- manuel 17
- stable-CL* tagleri

Kod testlerinde gerçek ekrana dokunma.

## GİZLİLİK REVIEW

Her merge öncesi özellikle kontrol et:

- window title loglanıyor mu?
- window title saklanıyor mu?
- window title network'e gidiyor mu?
- window title LLM'e gidiyor mu?
- question text telemetry'ye gidiyor mu?
- kişisel veri gidiyor mu?
- telemetry kapalıyken network çağrısı var mı?
- updater private key commit edilmiş mi?
- API key commit edilmiş mi?

Bunlardan biri varsa DONE değildir.

## GIT

Tamamlanan iş:

1. diff review
2. test
3. merge main
4. stable-* tag
5. push

Genel:

`git push origin main feature/desktop feature/worker --tags`

Branch isimleri repo durumuna göre doğrulanır.

## KOMUT KURALI

Kullanıcıya verilen npm komutlarında:

`npm.cmd`

kullan.

"Overloaded":
2–3 dk bekle.

Limit:
sıfırlanma + 5 dk sonra main agent yeniden kontrol et.

Tempo:
10–15 dk.

## BİTİŞ

SPEC 10 CL1–CL6 tamamen main'de, stable-CL* tagli, GitHub'da, test/build/clippy temiz, installer + REPORT-spec10 + manuel 17 hazır olduğunda:

- son doğrulama
- plan.md güncelle
- final rapor
- döngüyü durdur.

SPEC 10 bitmeden bekleme ve kullanıcıya tekrar "devam edeyim mi?" diye sorma.
