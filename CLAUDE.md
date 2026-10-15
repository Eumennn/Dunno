# Dunno — Ajan Bilgi Tabanı

Bu repo **Dunno** projesidir: masaüstünde yaşayan, neredeyse hiçbir soruya doğru cevap vermeyen piksel art bir AI pet
(SPEC 06: günde sadece 3 soruya doğru ama sonu kinayeli cevap verir).
Tagline: "the ai that teaches you nothing." Bu dosyayı okuyan her ajan aşağıdaki kurallara uymak zorundadır.

## Kaynaklar (önce bunları oku)
- `docs/PROJECT.md`: ürün sözleşmesi (masaüstü uygulaması, LLM, proxy, laf havuzu formatı, animasyon durumları, roadmap). **Şu anki iş: backend + masaüstü uygulaması.**
- `index.html` (kök, eski adı DunnoOS.html): **hazır landing page.** Yeniden yazılmaz, olduğu gibi `site/index.html` olarak yayınlanır.
- `dunno-handoff.md`, `dunno-reference.dc.html`: landing tasarım kaynakları. Sadece marka dili (renk, piksel haritalar, ses) için referans.
- `specs/`: aktif görev spec'leri (**ne** yapılacak). Kapsam dışına çıkma.
- `docs/agents/`: rol rehberleri (**nasıl** yapılacak). Kendi rolünün rehberini görev başında oku, DONE demeden önce sonundaki kontrol listesini uygula.
  - `desktop.md`: Tauri 2 mimarisi, pencere/animasyon/laf motoru kuralları, gizlilik, testler
  - `backend.md`: Cloudflare Worker yapısı, API sözleşmesi, env/sırlar, gizlilik, LLM kuralları, testler
  - `ui.md`: token'lar, değişmez görsel kurallar, bileşenler, **landing ile uyum**, görsel doğrulama
- `orchestrator/notes/plan.md`: PM'in canlı planı (teslimat durumu).

## Ekip ve iletişim (hub-and-spoke)
tmux oturumu `dunno`:

| Pencere | Rol | Çalışma dizini | Branch |
|---|---|---|---|
| 0 | PM (proje yöneticisi) | repo kökü | `main` |
| 1 | Masaüstü mühendisi | `.worktrees/desktop` | `feature/desktop` |
| 2 | Backend mühendisi | `.worktrees/backend` | `feature/worker` |
| 3 | Uygulama / dev çalıştırma | `.worktrees/desktop` | (yok) |
| 4 | Shell | repo kökü | (yok) |

- Mühendisler **sadece PM'e** rapor verir. Mühendisler arası iletişim PM üzerinden.
- Mesaj göndermek için **her zaman** `orchestrator/send-claude-message.sh <hedef> "<mesaj>"` kullan. Elle `tmux send-keys` kullanma.
- Başka pencereyi okumak: `tmux capture-pane -t dunno:<n> -p | tail -50`
- Kendine hatırlatma: `orchestrator/schedule_with_note.sh <dakika> "<not>" dunno:<kendi pencere numaran>`
- Takıldıysan 10 dakikadan fazla bekleme; PM'e `BLOCKED:` önekiyle yaz. 3 yaklaşım başarısız olduysa web araştırması yap.
- Gevezelik yok. Görev aldığında `ACK TASK-<id>` yaz.

### Mesaj şablonları
```
STATUS <rol> <saat>
done: ...
now: ...
blocked: ...
```
```
TASK-<id>: <başlık>
to: <rol>
goal: ...
done when: ...
priority: HIGH|MED|LOW
```

## Git disiplini (zorunlu)
- Her ajan kendi worktree'sinde ve kendi branch'inde çalışır. **Başka worktree'deki dosyaları düzenleme.**
- En geç 30 dakikada bir commit: `git add -A && git commit -m "<ne yapıldı, net>"`. Bitmemişse `WIP: ...`.
- Görev değiştirmeden önce commit.
- `main`'e sadece PM merge eder; merge öncesi build ve kontrol listesi geçmeli.
- `git push --force`, `git reset --hard`, branch silme: PM'in açık onayı olmadan yasak.
- Commit mesajları anlamlı olsun ("fix" değil, "add boot overlay with scroll lock and fail-safe").

## Marka kuralları (sitedeki/uygulamadaki tüm metinler)
- Küçük harf, kuru, alaycı, kısa. Ünlem yok (tek istisna hikayedeki "eskiden" balonu). Emoji yok.
- Dunno cevapları ≤ ~60 karakter.
- İstisna (SPEC 06, kullanıcı kararı 2026-10-03): günde 3 "honest" cevap: **kısa ve doğru** bilgi + sonunda kinayeli/alaycı kuyruk, ≤ ~120 karakter.
  Diğer tüm cevaplar yine işe yaramaz (soru tipine uygun havuz). Yasak konular ve gerçek kişiler honest modda da kaçamak shrug, hak düşmez.
- Yasak konular: din, ırk, etnik köken, cinsiyet/yönelim, beden, siyaset, gerçek kişiler, sağlık, ölüm, intihar/kendine zarar.
- Ağız modları: `polite` ve `street` (küfür sadece `***`). Sansürsüz mod yok.
  Tek istisna (SPEC 06, kullanıcının kendi örneği "o kim aq"): `{K:}` içinde (yani sadece street'te) `aq` kısaltması kullanılabilir; başka açık küfür yok, polite'ta hiç yok.
- Gerçek OS/marka logosu yok. Uydurma kullanıcı yorumu yok (yorumların hepsini dunno yazmıştır ve açıkça belirtilir).
- Palet dışı renk yok (ui.md). Yuvarlak köşe, blur gölge, gradyan zemin yok.
- Laf ve arayüz metinlerini uydurma: tasarımcının havuzu gelene kadar `placeholder` işaretli az sayıda örnek kullan.

## Test güvenliği (zorunlu)
Bu makine kullanıcının kişisel bilgisayarı. **Gerçek ekrana, fareye veya klavyeye dokunan test/betik yasak:**
`SendInput`, `mouse_event`, `keybd_event`, `SetCursorPos`, sentetik tıklama/yazı, başka uygulamaların pencerelerine mesaj/tuş göndermek, masaüstünün tamamını ekran görüntüsü almak.
Doğrulama yolları: saf fonksiyon testleri, `WindowFromPoint` gibi salt okunur sorgular, uygulamanın **kendi** penceresinin görüntüsü, kullanıcıya manuel test listesi.
Emin değilsen yapma, manuel listeye yaz.

## Gizlilik
Soru içerikleri loglanmaz, saklanmaz. Rate limit için sadece anonim sayaç. Çerezsiz analytics.

## Ortam notları
- Her şey **yerel Windows**'ta çalışır. Repo: `C:\Users\pc\Downloads\Dunnothebean` (Git Bash'te `/c/Users/pc/Downloads/Dunnothebean`).
- tmux = **psmux** (Windows'a özel, tmux komut uyumlu; `tmux` adıyla çağrılır). Pencerelerdeki kabuk PowerShell'dir.
- Claude Code'un Bash aracı Git Bash'tir; `orchestrator/*.sh` scriptleri oradan çalışır.
- PowerShell 5.1'de `&&` yok; pencerelere komut gönderirken `;` kullan.
- Gizli anahtarları (API key) asla commit etme. `.dev.vars` / `.env` git'e girmez.
