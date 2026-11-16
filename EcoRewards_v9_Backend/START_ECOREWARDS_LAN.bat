@echo off
setlocal
cd /d "%~dp0"
title EcoRewards API - PRIVATE WiFi only
set ECOREWARDS_BIND=0.0.0.0
echo ================================
echo  EcoRewards local-network server
echo ================================
echo Only use on trusted private Wi-Fi.
echo For iPhone: find this PC IPv4 with ipconfig.
echo Open http://YOUR-IP:5000/api/mobile/health on phone.
echo.
call START_ECOREWARDS.bat
