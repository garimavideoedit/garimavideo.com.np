@echo off
echo Starting PHP Web Server...
echo.
echo Your website will open at: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.
cd /d "f:\my website\My New Website"
php -S localhost:8000
pause
