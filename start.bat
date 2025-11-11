@echo off
echo ========================================
echo       ParallelProof Full Stack
echo ========================================
echo.

REM Kill any existing processes
echo Stopping existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do taskkill /F /PID %%a > nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174') do taskkill /F /PID %%a > nul 2>&1
timeout /t 2 /nobreak > nul

echo.
echo Starting Backend Server...
start "ParallelProof Backend" cmd /k "cd /d %~dp0 && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Starting Frontend Server...
start "ParallelProof Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo ✅ Both servers starting!
echo.
echo 🌐 Frontend: http://localhost:5174
echo 🔌 Backend:  http://localhost:8000
echo 📚 API Docs: http://localhost:8000/docs
echo ========================================
echo.
echo Press any key to exit (servers will keep running)...
pause > nul
