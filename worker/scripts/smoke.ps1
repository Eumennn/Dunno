# Dunno worker smoke test (PowerShell 5.1 uyumlu, curl.exe kullanir).
# Once baska bir pencerede:  cd worker; npx wrangler dev --test-scheduled
# (laf seti dolu gelsin istersen worker/.dev.vars icinde DUNNO_FAKE_LLM=1)
# Sonra:  powershell -NoProfile -ExecutionPolicy Bypass -File worker/scripts/smoke.ps1
# Her kontrol PASS/FAIL yazar; bir FAIL varsa cikis kodu 1.
param([string]$Base = "http://127.0.0.1:8787")

$ErrorActionPreference = "Stop"
$script:Passed = 0
$script:Failed = 0
$utf8 = New-Object System.Text.UTF8Encoding $false
$tmp = Join-Path $env:TEMP ("dunno-smoke-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null
$bodyFile = Join-Path $tmp "body.txt"
$headFile = Join-Path $tmp "head.txt"
$reqFile = Join-Path $tmp "req.json"

$WinUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
$MacUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"

function Report([string]$Name, [bool]$Ok, [string]$Detail) {
    if ($Ok) { Write-Output ("PASS  " + $Name + "  " + $Detail); $script:Passed++ }
    else { Write-Output ("FAIL  " + $Name + "  " + $Detail); $script:Failed++ }
}

function Invoke-Curl([string[]]$CurlArgs) {
    Remove-Item $bodyFile, $headFile -ErrorAction SilentlyContinue
    $code = & curl.exe -s -m 15 -o $bodyFile -D $headFile -w "%{http_code}" @CurlArgs
    $text = ""
    if (Test-Path $bodyFile) { $text = [IO.File]::ReadAllText($bodyFile, $utf8) }
    $headers = ""
    if (Test-Path $headFile) { $headers = [IO.File]::ReadAllText($headFile) }
    return @{ Code = [string]$code; Body = $text; Headers = $headers }
}

function Get-Header($Res, [string]$Name) {
    foreach ($line in ($Res.Headers -split "`r?`n")) {
        if ($line -match ("^" + $Name + ":\s*(.+)$")) { return $Matches[1].Trim() }
    }
    return ""
}

function Short([string]$Text) {
    $t = $Text.Trim()
    if ($t.Length -gt 90) { return $t.Substring(0, 90) + "..." }
    return $t
}

function New-Device { return "smoke-" + [guid]::NewGuid().ToString("N").Substring(0, 16) }

function Invoke-Ask([string]$Question, [string]$Mode, [string]$Lang, [string]$Device) {
    $json = @{ question = $Question; mode = $Mode; lang = $Lang; deviceId = $Device } | ConvertTo-Json -Compress
    [IO.File]::WriteAllText($reqFile, $json, $utf8)
    return Invoke-Curl @("-X", "POST", "-H", "content-type: application/json", "--data-binary", ("@" + $reqFile), ($Base + "/v1/ask"))
}

Write-Output ("dunno smoke -> " + $Base)

# sunucu ayakta mi
$r = Invoke-Curl @(($Base + "/v1/release"))
if ($r.Code -ne "200") {
    Write-Output ("FAIL  server  " + $Base + " cevap vermiyor (" + $r.Code + "). once: npx wrangler dev --test-scheduled")
    Remove-Item $tmp -Recurse -ErrorAction SilentlyContinue
    exit 1
}

# /v1/ask: dil x mod
foreach ($case in @(@("en", "polite"), @("en", "street"), @("tr", "polite"), @("tr", "street"))) {
    $r = Invoke-Ask "what is the capital of france" $case[1] $case[0] (New-Device)
    $ok = ($r.Code -eq "200") -and ($r.Body -match '"source":"(pool|llm)"') -and ($r.Body -match '"answer":"')
    Report ("ask " + $case[0] + "/" + $case[1] + " 200") $ok ($r.Code + " " + (Short $r.Body))
}

# /v1/ask: gecersiz istekler 400
$r = Invoke-Ask "hi" "polite" "de" (New-Device)
Report "ask invalid lang 400" (($r.Code -eq "400") -and ($r.Body -match "invalid lang")) ($r.Code + " " + (Short $r.Body))
$r = Invoke-Ask "hi" "polite" "en" "x"
Report "ask invalid device id 400" (($r.Code -eq "400") -and ($r.Body -match "invalid device id")) ($r.Code + " " + (Short $r.Body))

# /v1/ask: ayni cihazla 4. istek 429
$device = New-Device
$codes = @()
for ($i = 1; $i -le 4; $i++) { $codes += (Invoke-Ask "hi" "street" "tr" $device).Code }
$joined = $codes -join ","
Report "ask quota 4th request 429" ($joined -eq "200,200,200,429") $joined

# /v1/ask SPEC 06 Q3: kind honest + qtype (yerelde anahtar yok: havuz, hak dusmez)
function Invoke-AskKind([string]$Question, [string]$Lang, [string]$Device, [string]$Kind, [string]$QType) {
    $json = @{ question = $Question; mode = "street"; lang = $Lang; deviceId = $Device; kind = $Kind; qtype = $QType } | ConvertTo-Json -Compress
    [IO.File]::WriteAllText($reqFile, $json, $utf8)
    return Invoke-Curl @("-X", "POST", "-H", "content-type: application/json", "--data-binary", ("@" + $reqFile), ($Base + "/v1/ask"))
}
$r = Invoke-Ask "hi" "polite" "en" (New-Device)
$ok = ($r.Code -eq "200") -and ($r.Body -match '"honest":false') -and ($r.Body -match '"charged":(true|false)') -and ($r.Body -match '"qtype":"other"')
Report "ask old client contract fields" $ok ($r.Code + " " + (Short $r.Body))
$r = Invoke-AskKind "paris nerede" "tr" (New-Device) "honest" "where"
$ok = ($r.Code -eq "200") -and ($r.Body -match '"qtype":"where"') -and ($r.Body -match '"charged":(true|false)')
if ($r.Body -match '"source":"pool"') { $ok = $ok -and ($r.Body -match '"honest":false') -and ($r.Body -match '"charged":false') }
Report "ask honest where 200" $ok ($r.Code + " " + (Short $r.Body))
$r = Invoke-AskKind "namaz kacta" "tr" (New-Device) "honest" "when"
$ok = ($r.Code -eq "200") -and ($r.Body -match "omuz silker") -and ($r.Body -match '"charged":false')
Report "ask honest forbidden topic dodge" $ok ($r.Code + " " + (Short $r.Body))
$r = Invoke-AskKind "hi" "en" (New-Device) "nope" "who"
Report "ask invalid kind 400" (($r.Code -eq "400") -and ($r.Body -match "invalid kind")) ($r.Code + " " + (Short $r.Body))
$r = Invoke-AskKind "hi" "en" (New-Device) "honest" "nonsense"
Report "ask bad qtype -> other" (($r.Code -eq "200") -and ($r.Body -match '"qtype":"other"')) ($r.Code + " " + (Short $r.Body))
$device = New-Device
$codes = @()
for ($i = 1; $i -le 4; $i++) { $codes += (Invoke-AskKind "2+2" "en" $device "honest" "math").Code }
$joined = $codes -join ","
Report "ask honest uncharged never 429" ($joined -eq "200,200,200,200") $joined

# cron
$r = Invoke-Curl @(($Base + "/__scheduled?cron=0+6+*+*+*"))
Report "scheduled 200" ($r.Code -eq "200") ($r.Code + " " + (Short $r.Body))

# /v1/lines: 200 + ETag, ayni ETag ile 304
foreach ($lang in @("tr", "en")) {
    $r = Invoke-Curl @(($Base + "/v1/lines?lang=" + $lang))
    $etag = Get-Header $r "etag"
    $count = ([regex]::Matches($r.Body, '"id":')).Count
    Report ("lines " + $lang + " 200 + etag") (($r.Code -eq "200") -and ($etag -ne "")) ($r.Code + " etag=" + $etag + " lines=" + $count)
    # PS 5.1 yerel programa giden argumandaki cift tirnaklari siler; ETag tirnakli oldugu icin header dosyadan verilir
    $hdrFile = Join-Path $tmp "inm.txt"
    [IO.File]::WriteAllText($hdrFile, ("If-None-Match: " + $etag), $utf8)
    $r2 = Invoke-Curl @("-H", ("@" + $hdrFile), ($Base + "/v1/lines?lang=" + $lang))
    Report ("lines " + $lang + " if-none-match 304") ($r2.Code -eq "304") $r2.Code
}
$r = Invoke-Curl @(($Base + "/v1/lines?lang=xx"))
Report "lines invalid lang 400" ($r.Code -eq "400") ($r.Code + " " + (Short $r.Body))

# /v1/release
$r = Invoke-Curl @(($Base + "/v1/release"))
$ok = ($r.Code -eq "200") -and ($r.Body -match '"version":"\d+\.\d+\.\d+"') -and ($r.Body -match '"windows":"') -and ($r.Body -match '"mac":"')
Report "release 200" $ok ($r.Code + " " + (Short $r.Body))

# /download
$r = Invoke-Curl @("-A", $WinUA, ($Base + "/download"))
$loc = Get-Header $r "location"
Report "download windows 302" (($r.Code -eq "302") -and ($loc -match "_x64-setup\.exe$")) ($r.Code + " " + $loc)
$r = Invoke-Curl @("-A", $MacUA, ($Base + "/download"))
$loc = Get-Header $r "location"
Report "download mac 302" (($r.Code -eq "302") -and ($loc -match "\.dmg$")) ($r.Code + " " + $loc)

# router hatalari
$r = Invoke-Curl @(($Base + "/nope"))
Report "unknown path 404" (($r.Code -eq "404") -and ($r.Body -match "not found")) ($r.Code + " " + (Short $r.Body))
$r = Invoke-Curl @(($Base + "/v1/ask"))
Report "wrong method 405" (($r.Code -eq "405") -and ((Get-Header $r "allow") -eq "POST, OPTIONS")) ($r.Code + " allow=" + (Get-Header $r "allow"))

# CORS preflight
$r = Invoke-Curl @("-X", "OPTIONS", "-H", "Origin: http://tauri.localhost", "-H", "Access-Control-Request-Method: POST", ($Base + "/v1/ask"))
$acao = Get-Header $r "access-control-allow-origin"
Report "preflight tauri origin 204" (($r.Code -eq "204") -and ($acao -eq "http://tauri.localhost")) ($r.Code + " allow-origin=" + $acao)
$r = Invoke-Curl @("-X", "OPTIONS", "-H", "Origin: https://evil.example", "-H", "Access-Control-Request-Method: POST", ($Base + "/v1/ask"))
Report "preflight other origin 403" ($r.Code -eq "403") $r.Code

Remove-Item $tmp -Recurse -ErrorAction SilentlyContinue
Write-Output ("RESULT  " + $script:Passed + " passed, " + $script:Failed + " failed")
if ($script:Failed -gt 0) { exit 1 }
exit 0
