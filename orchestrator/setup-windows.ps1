# Windows'ta bir kez çalıştır: psmux (tmux), PowerShell 7, Node 22 ve Claude Code'u kurar.
# Kullanım (proje kökünde): powershell -ExecutionPolicy Bypass -File orchestrator\setup-windows.ps1

$ErrorActionPreference = 'Stop'

function Has($name) { [bool](Get-Command $name -ErrorAction SilentlyContinue) }

Write-Host '>> PowerShell 7'
if (-not (Has 'pwsh')) { winget install --id Microsoft.PowerShell -e --accept-source-agreements --accept-package-agreements }

Write-Host '>> psmux (tmux)'
if (-not (Has 'psmux')) { winget install psmux --accept-source-agreements --accept-package-agreements }

Write-Host '>> Node.js'
if (-not (Has 'node')) { winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements }
node -v

Write-Host '>> Claude Code'
if (-not (Has 'claude')) { Invoke-RestMethod https://claude.ai/install.ps1 | Invoke-Expression }

Write-Host '>> tmux ayarı'
$conf = Join-Path $HOME '.tmux.conf'
if (-not (Test-Path $conf)) {
    @'
set -g mouse on
set -g history-limit 50000
set -g base-index 0
set -g renumber-windows off
'@ | Out-File -Encoding ascii $conf
}

Write-Host ''
Write-Host 'Kurulum bitti. Yeni bir terminal aç (PATH yenilensin), sonra:'
Write-Host '  1) cd C:\Users\pc\Downloads\Dunnothebean ; claude   -> giriş yap, klasöre güven, /exit'
Write-Host '  2) Git Bash içinde: ./orchestrator/start-team.sh'
