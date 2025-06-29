@echo off
REM Comprehensive Chrome Cookie Extractor for CodegenApp
REM Saves cookies to Desktop as 'codegenCookies.json'

echo.
echo 🍪 CodegenApp Cookie Extractor
echo ==============================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python from https://python.org
    echo.
    pause
    exit /b 1
)

REM Check and install required packages
echo 🔍 Checking required packages...
python -c "import win32crypt, Crypto.Cipher" >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing required packages...
    pip install pycryptodome pywin32
    if errorlevel 1 (
        echo ❌ Failed to install required packages
        echo Please run: pip install pycryptodome pywin32
        pause
        exit /b 1
    )
)

REM Check if Chrome is running
tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I /N "chrome.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo.
    echo ⚠️  WARNING: Chrome is currently running!
    echo For best results, please close Chrome before extracting cookies.
    echo.
    choice /C YN /M "Continue anyway? (Y/N)"
    if errorlevel 2 (
        echo Operation cancelled.
        pause
        exit /b 0
    )
)

echo.
echo 🔍 Scanning for Chrome profiles...
python codegenCookieExtractor.py --list-profiles

echo.
echo 📋 Choose your Chrome profile:
set /p profile_choice="Enter profile number (default: 0): "
if "%profile_choice%"=="" set profile_choice=0

echo.
echo 🚀 Extracting cookies for codegen.com...
python codegenCookieExtractor.py --profile %profile_choice%

if errorlevel 1 (
    echo.
    echo ❌ Cookie extraction failed!
    echo.
    echo 💡 Troubleshooting tips:
    echo 1. Make sure you're logged into codegen.com in Chrome
    echo 2. Close Chrome completely before running this script
    echo 3. Try a different Chrome profile
    echo 4. Run Chrome as the same user as this script
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Cookie extraction completed!
echo.
echo 📁 Output file: %USERPROFILE%\Desktop\codegenCookies.json
echo.
echo 📋 Next steps:
echo 1. Copy codegenCookies.json to your WSL2 environment
echo 2. Use it with codegenApp API calls
echo.
echo 💡 Example WSL2 usage:
echo curl -X POST http://localhost:3001/api/resume-agent-run \
echo   -H "Content-Type: application/json" \
echo   -d @codegenCookies.json
echo.

REM Ask if user wants to open the output file
choice /C YN /M "Open output file to view? (Y/N)"
if errorlevel 1 if not errorlevel 2 (
    notepad "%USERPROFILE%\Desktop\codegenCookies.json"
)

echo.
echo 🎉 Done! Check your Desktop for codegenCookies.json
pause

