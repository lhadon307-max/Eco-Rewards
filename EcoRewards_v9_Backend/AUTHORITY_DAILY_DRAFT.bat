@echo off
cd /d "%~dp0"
py backend\scheduled_authority.py daily
pause
