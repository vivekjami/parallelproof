@echo off
echo Starting ParallelProof Development Environment...
echo.

REM Start backend in a new window
echo Starting backend server...
start "ParallelProof Backend" cmd /k "cd /d %~dp0 && python -m uvicorn app.main:app --reload"

REM Wait a bit for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend in a new window
echo Starting frontend server...
start "ParallelProof Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ParallelProof is starting up!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit this window (servers will keep running)...
pause > nul
