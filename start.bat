@echo off
echo Starting Local Web Server...
echo.
echo Your website will open at: http://localhost:8000
echo.
:: Check for python, python3, or py commands
python --version >nul 2>&1
if %errorlevel% == 0 (
    python -m http.server 8000
    goto end
)
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    python3 -m http.server 8000
    goto end
)
py --version >nul 2>&1
if %errorlevel% == 0 (
    py -m http.server 8000
    goto end
)
echo.
echo ERROR: Python not found! 
echo Please ensure Python is installed and "Add to PATH" was checked.
echo Or try running START-PHP-SERVER.bat if you have PHP.
echo.
pause
:end