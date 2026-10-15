@echo off
rem Ekibi kaldığı yerden açar (çift tıkla). Git Bash ile resume-team.sh çalıştırır.
cd /d "%~dp0.."
"C:\Program Files\Git\bin\bash.exe" -lc "./orchestrator/resume-team.sh %*"
echo.
echo Ekip arka planda calisiyor. Bu pencereyi kapatabilirsin.
timeout /t 15
