@echo off
title Palette v3.0 Launcher

echo Starting Palette v3.0...

echo.
echo Starting backend...
start "Palette Backend" cmd /k "cd /d "%~dp0backend" && if not exist .venv py -m venv .venv && call .venv\Scripts\activate.bat && py -m pip install -r requirements.txt && py -m uvicorn app.main:app --reload"

timeout /t 4 /nobreak > nul

echo.
echo Starting frontend...
start "Palette Frontend" cmd /k "cd /d "%~dp0frontend" && py -m http.server 5500"

timeout /t 2 /nobreak > nul

echo.
echo Opening project in browser...
start http://localhost:5500
start http://localhost:8000/docs

echo.
echo Palette v3.0 started.
echo Frontend: http://localhost:5500
echo Backend docs: http://localhost:8000/docs

pause