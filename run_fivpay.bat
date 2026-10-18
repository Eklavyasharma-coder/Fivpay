@echo off
setlocal
title FivPay - Full-Stack Fintech Platform Launcher

cd /d "%~dp0"

echo ========================================================
echo                 FIVPAY FULL-STACK LAUNCHER
echo ========================================================
echo.
echo [1/3] Starting Flask REST API Backend on Port 5000...
start "FivPay Backend API (Port 5000)" cmd /k "python backend/run.py"

echo [2/3] Starting Frontend Web Server on Port 4000...
start "FivPay Frontend (Port 4000)" cmd /k "python -m http.server 4000 --directory frontend"

timeout /t 2 >nul

echo [3/3] Opening FivPay in your default web browser...
start http://localhost:4000

echo.
echo ========================================================
echo  All services launched!
echo  - Frontend: http://localhost:4000
echo  - Backend:  http://localhost:5000/api/health
echo ========================================================
pause
