@echo off
setlocal
set "SCRIPT=%~dp0Executar.ps1"
if not exist "%SCRIPT%" (
  echo Erro: não foi possível iniciar o Executar.ps1 do Meminify.
  exit /b 1
)
powershell.exe -NoProfile -File "%SCRIPT%"
exit /b %ERRORLEVEL%
