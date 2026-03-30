@echo off
echo Starting Python (Flask) Server...
echo.
echo Your website will open at: http://localhost:5001/photo-selection.html
echo.
echo NOTE: Make sure you have installed the requirements:
echo py -m pip install -r requirements.txt
echo.
echo Press Ctrl+C to stop the server
echo.
cd /d "f:\my website\My New Website"
py app.py
pause
