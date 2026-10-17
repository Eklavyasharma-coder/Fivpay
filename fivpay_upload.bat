@echo off
setlocal
title Fivpay - GitHub One-Click Upload

cd /d "%~dp0"

echo.
echo ==========================================
echo       FIVPAY - GITHUB AUTO UPLOAD
echo ==========================================
echo.

REM Check Git installation
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed or not in PATH.
    goto error
)

REM Check Git repository
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ERROR: This folder is not a Git repository.
    goto error
)

REM Get current branch
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"

if not defined BRANCH (
    echo ERROR: Could not detect the current branch.
    goto error
)

echo Branch: %BRANCH%
echo Adding changed files...
git add -A
if errorlevel 1 goto error

REM Check for staged changes
git diff --cached --quiet
if not errorlevel 1 (
    echo.
    echo No new changes to commit.
    echo Checking GitHub for pending commits...
    git push
    if errorlevel 1 goto error
    echo.
    echo GitHub is up to date!
    goto success
)

REM Create timestamped commit
for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set "STAMP=%%T"

git commit -m "Fivpay update %STAMP%"
if errorlevel 1 goto error

echo.
echo Uploading to GitHub...
git push
if errorlevel 1 goto error

:success
echo.
echo ==========================================
echo       UPLOAD COMPLETED SUCCESSFULLY!
echo ==========================================
echo.
pause
exit /b 0

:error
echo.
echo ==========================================
echo       UPLOAD FAILED!
echo ==========================================
echo Check the error message above.
echo.
pause
exit /b 1