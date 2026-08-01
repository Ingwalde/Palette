@echo off
title Palette v4.0 Launcher

echo Starting Palette v4.0 (Docker Compose)...
echo.

cd /d "%~dp0"

if not exist "backend\.env" (
  echo ERROR: backend\.env is missing.
  echo Copy backend\.env.example to backend\.env and set a real SECRET_KEY first.
  pause
  exit /b 1
)

docker compose up --build -d
if errorlevel 1 (
  echo.
  echo ERROR: docker compose failed. Is Docker Desktop running?
  pause
  exit /b 1
)

timeout /t 4 /nobreak > nul

start http://localhost:5500
start http://localhost:8000/docs

echo.
echo Palette v4.0 started.
echo Frontend:     http://localhost:5500
echo Backend docs: http://localhost:8000/docs
echo.
echo Stop with: docker compose down
pause
