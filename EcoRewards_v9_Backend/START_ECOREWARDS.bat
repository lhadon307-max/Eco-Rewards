@echo off
setlocal
cd /d "%~dp0"
title EcoRewards - XAMPP MySQL User App and Admin Dashboard
where py >nul 2>nul
if errorlevel 1 (
 echo Python launcher not found. Python is required.
 pause
 exit /b 1
)
echo Preparing local EcoRewards MySQL database...
py AUTO_SETUP_MYSQL.py
if errorlevel 1 (
 echo.
 echo Setup failed. Make sure XAMPP MySQL is running.
 echo Start XAMPP MySQL; install Python packages if required.
 pause
 exit /b 1
)
echo Starting EcoRewards...
py RUN_ECOREWARDS.py
if errorlevel 1 echo EcoRewards failed to start. Read the message above.
pause
