@echo off
echo Starting Local Web Server...
echo.
echo Your website will open at: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.
cd /d "f:\my website\My New Website"
python -m http.server 8000
pause
