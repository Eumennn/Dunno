@echo off
rem Dunno Studio'yu açar: çift tıkla. (PowerShell script kısıtına takılmamak için npm.cmd kullanılır.)
cd /d "%~dp0studio"
if not exist node_modules (
  echo bagimliliklar kuruluyor...
  call npm.cmd ci
)
start "" http://127.0.0.1:5180
call npm.cmd run studio
