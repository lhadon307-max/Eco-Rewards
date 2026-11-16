@echo off
setlocal
cd /d "%~dp0"
title EcoRewards v12 - Mobile
where npm >nul 2>&1 || (echo Please install stable Node.js LTS. & pause & exit /b 1)
if not exist node_modules (
 echo Installing EcoRewards mobile dependencies...
 call npm install
 if errorlevel 1 (echo Installation failed. Copy the error message. & pause & exit /b 1)
)
echo Checking Expo package compatibility...
call npx expo install --check
if errorlevel 1 echo If dependency versions differ run: npx expo install --fix
call npx expo start --clear
pause
