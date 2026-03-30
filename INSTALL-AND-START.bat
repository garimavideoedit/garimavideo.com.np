@echo off
echo ==========================================
echo 🛠️  Checking Python and Installing Libraries...
echo ==========================================
echo.

:: Try python -m pip first, then py -m pip
python -m pip install flask google-api-python-client google-auth-oauthlib || py -m pip install flask google-api-python-client google-auth-oauthlib

echo.
echo ==========================================
echo 🚀 Starting Python Server...
echo ==========================================
echo Your website will open at: http://localhost:5001/photo-selection.html
echo.
echo Press Ctrl+C to stop the server
echo.

:: Try python app.py first, then py app.py
python app.py || py app.py

echo.
echo [!] Server stopped or failed to start.
pause
