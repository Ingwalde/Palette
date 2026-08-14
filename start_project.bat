@echo off
title Palette Launcher

echo Starting Palette (Docker Compose)...
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

echo.
echo Palette started.
echo Frontend:     http://localhost:5500
echo Backend:      http://localhost:8000/api/v1/palettes
echo.
echo Swagger is at /api/docs and only when ENABLE_API_DOCS=true, so it is not opened here.
echo.
echo Stop with: docker compose down
pause
