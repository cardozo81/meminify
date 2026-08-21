@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\release\publicar.ps1" %*
exit /b %ERRORLEVEL%
