@echo off
echo ========================================
echo ShelfWise Backend Startup Script
echo ========================================
echo.

cd /d "%~dp0backend"

echo [1/3] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo [2/3] Installing/updating dependencies...
pip install -r requirements.txt --quiet

echo.
echo [3/3] Starting backend server...
echo.
echo Backend will be available at: http://127.0.0.1:8000
echo API Documentation at: http://127.0.0.1:8000/docs
echo.
echo Press CTRL+C to stop the server
echo ========================================
echo.

uvicorn app.main:app --reload
