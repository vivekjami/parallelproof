# Start ParallelProof Development Environment

Write-Host "Starting ParallelProof Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Start backend
Write-Host "Starting backend server..." -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; python -m uvicorn app.main:app --reload"

# Wait for backend to start
Start-Sleep -Seconds 3

# Start frontend
Write-Host "Starting frontend server..." -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "ParallelProof is starting up!" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Servers are running in separate windows." -ForegroundColor Gray
