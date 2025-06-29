@echo off
REM Chrome Cookie Extractor for Windows -> WSL2
REM This script extracts Chrome cookies and prepares them for WSL2 transfer

echo 🍪 Chrome Cookie Extractor for codegenApp
echo ==========================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

REM Check if Chrome is running and warn user
tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I /N "chrome.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ⚠️  WARNING: Chrome is currently running!
    echo For best results, please close Chrome before extracting cookies.
    echo.
    choice /C YN /M "Continue anyway? (Y/N)"
    if errorlevel 2 exit /b 0
)

echo.
echo 🔍 Listing available Chrome profiles...
python extract_chrome_cookies.py --list-profiles

echo.
echo 📋 Choose extraction options:
echo.

REM Get profile choice
set /p profile_choice="Enter profile number (default: 0): "
if "%profile_choice%"=="" set profile_choice=0

REM Get domain choice
set /p domain_choice="Enter domain (default: codegen.com): "
if "%domain_choice%"=="" set domain_choice=codegen.com

REM Get output file choice
set /p output_choice="Enter output filename (default: codegen_auth.json): "
if "%output_choice%"=="" set output_choice=codegen_auth.json

echo.
echo 🚀 Extracting cookies...
python extract_chrome_cookies.py --profile %profile_choice% --domain %domain_choice% --output %output_choice% --format codegen_auth

if errorlevel 1 (
    echo.
    echo ❌ Cookie extraction failed!
    pause
    exit /b 1
)

echo.
echo ✅ Cookie extraction completed!
echo.
echo 📁 Output file: %output_choice%
echo.
echo 📋 Next steps:
echo 1. Copy %output_choice% to your WSL2 environment
echo 2. Use it with codegenApp API calls
echo.
echo 💡 Example WSL2 usage:
echo curl -X POST http://localhost:3001/api/resume-agent-run \
echo   -H "Content-Type: application/json" \
echo   -d @%output_choice%
echo.

REM Ask if user wants to open the output file
choice /C YN /M "Open output file to view? (Y/N)"
if errorlevel 1 if not errorlevel 2 (
    notepad %output_choice%
)

echo.
echo 🎉 Done! You can now transfer the file to WSL2.
pause

