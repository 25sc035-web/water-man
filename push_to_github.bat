@echo off
title Push Textile Water Optimizer to GitHub
cd /d "%~dp0"

echo =======================================================
echo  Pushing Textile Water Optimizer to GitHub
echo  Repository: https://github.com/25sc035-web/water-man
echo =======================================================
echo.

set "GIT_EXE=C:\Users\Pranesh\.gemini\antigravity\scratch\mingit\cmd\git.exe"

if not exist "%GIT_EXE%" (
    echo [ERROR] Portable Git not found. Checking system git...
    where git >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERROR] Git is not installed. Please install Git from https://git-scm.com
        pause
        exit /b 1
    )
    set "GIT_EXE=git"
)

echo [1/3] Verifying commit status...
"%GIT_EXE%" status

echo.
echo [2/3] Setting remote origin...
"%GIT_EXE%" branch -M main
"%GIT_EXE%" remote remove origin 2>nul
"%GIT_EXE%" remote add origin https://github.com/25sc035-web/water-man.git

echo.
echo [3/3] Ready to push to GitHub!
echo -------------------------------------------------------
echo Note: GitHub requires a Personal Access Token (PAT).
echo If you have a GitHub token:
echo 1. Go to https://github.com/settings/tokens (classic)
echo 2. Check the 'repo' scope and generate token.
echo -------------------------------------------------------
set /p TOKEN="Enter your GitHub Personal Access Token (or press Enter to try default): "

if "%TOKEN%"=="" (
    "%GIT_EXE%" push -u origin main
) else (
    echo Pushing with provided token...
    "%GIT_EXE%" push -u https://%TOKEN%@github.com/25sc035-web/water-man.git main
)

echo.
if %errorlevel% equ 0 (
    echo =======================================================
    echo  SUCCESS! Successfully pushed to:
    echo  https://github.com/25sc035-web/water-man
    echo =======================================================
) else (
    echo =======================================================
    echo  [NOTICE] Push failed or authentication was canceled.
    echo  Ensure you used a Personal Access Token with repo scope.
    echo =======================================================
)

pause
