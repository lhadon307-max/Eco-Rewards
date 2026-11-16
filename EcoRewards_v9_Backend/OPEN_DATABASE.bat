@echo off
setlocal
cd /d "%~dp0"
title EcoRewards - XAMPP MySQL Database Explorer
where py >nul 2>nul
if errorlevel 1 (
 echo Python launcher not found.
 pause
 exit /b 1
)
py AUTO_SETUP_MYSQL.py
if errorlevel 1 (
 echo Database setup failed. Start XAMPP MySQL first.
 pause
 exit /b 1
)
py VIEW_DATABASE.py
if errorlevel 1 echo Could not open database viewer.
pause
