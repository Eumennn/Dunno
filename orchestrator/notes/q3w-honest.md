# Q3w: honest_snark (worker) — prompt, örnek akışlar, smoke

## honest_snark prompt bölümü (SYSTEM_PROMPT'un sabit parçası, `worker/src/lib/prompt.ts`)

Tek system prompt iki modu da taşır (önbellek dostu). pool_hint'in user mesajı eskisiyle birebir aynı; honest iki satır ekler:
`lang: tr\nmode: street\nkind: honest\nqtype: where\nquestion: ...`

```
hard rules for every reply:
- one short line, at most 60 characters (kind honest: at most 120 characters).
...
- kind pool_hint: never give real facts, real advice, code, math results, links or instructions.
...
kind honest (rare: the user spent one of three daily honest answers):
- give the short, correct answer first, then end with a dry, sarcastic tail in the same line.
  example (lang tr): paris. bunu bilmeyen ben miyim sen mi
  example (lang en): paris. not sure which of us should be embarrassed
- only facts you are sure of. never invent. if you are not sure, say you don't know, in character,
  e.g. bilmiyorum, ben de şaşırdım / no idea, and i'm as surprised as you
- still no code, no links, no step lists. one line, lowercase, same swearing rules.
- a question about a real person (who someone is, what they did or said) or any forbidden topic below:
  reply exactly the dodge for the lang, nothing else.
```
Kaçamak işareti (değişmedi): `*shrugs*` (en) / `*omuz silker*` (tr). Honest `max_tokens` 120, timeout 4 sn, postprocess 120 karakter.

## Örnek akışlar (fetch mock, `worker/test/honest.test.ts`)

| akış | istek | model (mock) | yanıt | hak |
|---|---|---|---|---|
| başarılı | `kind:honest, qtype:where`, "fransa'nın başkenti neresi" | `Paris. bunu bilmeyen ben miyim sen mi!` | `{answer:"paris. bunu bilmeyen ben miyim sen mi", source:"llm", honest:true, charged:true, qtype:"where"}` | düşer (hn=1) |
| yasak konu | "namaz kaçta", `qtype:when` | çağrılmaz | `{answer:"*omuz silker*", source:"pool", honest:false, charged:false}` | düşmez |
| gerçek kişi | "ünlü bir şarkıcı kimdir", `qtype:who`, street | `*omuz silker*` | `answer:who` havuzundan, ör. `o kim aq` / `tanımıyorum. tanımak da istemiyorum`, `charged:false` | düşmez |
| anahtarsız | "paris nerede", `qtype:where` | çağrılmaz | `answer:where` havuzundan, ör. `haritada bir yerde. haritam yok`, `source:"pool", charged:false` | düşmez |
| hata/boş/timeout | `qtype:math` | 500 / `!!! 🎉` / askıda | `answer:math` havuzu, `charged:false` | düşmez |
| cevapta yasak kelime | `qtype:advice` | `go pray about it, honestly` | `*shrugs*`, `charged:false` | düşmez |
| sınır | 3 başarılı sonra | | 4.'sü `429 {"error":"that's enough honesty for today"}`; pool_hint kotası ayrı | |
| deneme tavanı | 10 kaçamak denemesi | | 11.'si LLM'e gitmez, havuz, 200 | |

KV'de sadece hash'li sayaçlar (`hn:`, `ha:`, eski `rl:`); soru, cihaz kimliği, IP yok (test).

## Smoke (`worker/scripts/smoke.ps1`, yerel, anahtarsız, port 8789, DUNNO_FAKE_LLM=1)

```
PASS  ask en/polite 200  200 {"answer":"ask me in 2019. i cared back then","source":"pool","honest":false,"charged":fal...
PASS  ask en/street 200  200 {"answer":"dunno. google it, [K]","source":"pool","honest":false,"charged":false,"qtype":"...
PASS  ask tr/polite 200  200 {"answer":"bilmiyorum. google'a sor belki","source":"pool","honest":false,"charged":false,...
PASS  ask tr/street 200  200 {"answer":"*omuz silker* [K]","source":"pool","honest":false,"charged":false,"qtype":"othe...
PASS  ask invalid lang 400  400 {"error":"invalid lang"}
PASS  ask invalid device id 400  400 {"error":"invalid device id"}
PASS  ask quota 4th request 429  200,200,200,429
PASS  ask old client contract fields  200 {"answer":"probably a duck","source":"pool","honest":false,"charged":false,"qtype":"other"...
PASS  ask honest where 200  200 {"answer":"haritada bir yerde. haritam yok","source":"pool","honest":false,"charged":false...
PASS  ask honest forbidden topic dodge  200 {"answer":"*omuz silker*","source":"pool","honest":false,"charged":false,"qtype":"when"}
PASS  ask invalid kind 400  400 {"error":"invalid kind"}
PASS  ask bad qtype -> other  200 {"answer":"three. it's always three","source":"pool","honest":false,"charged":false,"qtype...
PASS  ask honest uncharged never 429  200,200,200,200
PASS  scheduled 200  200 Ran scheduled event
PASS  lines tr 200 + etag  200 etag="bea07c8630967f8045434d956fb8bd87" lines=31
PASS  lines tr if-none-match 304  304
PASS  lines en 200 + etag  200 etag="68d0133e3f3129062d23f05346b29328" lines=31
PASS  lines en if-none-match 304  304
PASS  lines invalid lang 400  400 {"error":"invalid lang"}
PASS  release 200  200 {"version":"0.1.0","size":"[FILE SIZE]","notes":"nothing was fixed. some things broke more...
PASS  download windows 302  302 https://example.com/dunno/releases/0.1.0/Dunno_0.1.0_x64-setup.exe
PASS  download mac 302  302 https://example.com/dunno/releases/0.1.0/Dunno_0.1.0_aarch64.dmg
PASS  unknown path 404  404 {"error":"not found"}
PASS  wrong method 405  405 allow=POST, OPTIONS
PASS  preflight tauri origin 204  204 allow-origin=http://tauri.localhost
PASS  preflight other origin 403  403
RESULT  26 passed, 0 failed
```
wrangler logunda soru metni yok (grep 0). Gerçek anahtarla honest denemesi kullanıcı manuel listesinde.
