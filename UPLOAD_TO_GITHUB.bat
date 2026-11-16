@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0UPLOAD_TO_GITHUB.ps1"
echo.
pause
