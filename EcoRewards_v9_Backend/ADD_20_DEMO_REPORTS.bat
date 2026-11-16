@echo off
cd /d "%~dp0"
echo EcoRewards Demo Reports: 20 clearly marked fictional reports.
echo 10 will be published as DEMO EcoTasks for testing only.
echo Your existing records will not be deleted or replaced.
echo.
choice /C YN /M "Import fictional demonstration data now"
if errorlevel 2 exit /b
py SEED_20_DEMO_REPORTS.py
if errorlevel 1 (echo Error: check XAMPP MySQL and backend settings.)
pause
