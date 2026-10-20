# RAGLab Backend Startup Script (PowerShell)
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Starting RAGLab FastAPI Backend Engine  " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\backend"

Write-Host "Current Directory: $(Get-Location)" -ForegroundColor Gray
Write-Host "Checking Python..." -ForegroundColor Gray
python --version

Write-Host "`nLaunching FastAPI Uvicorn Server on http://127.0.0.1:8000 ..." -ForegroundColor Magenta
Write-Host "Interactive OpenAPI Docs: http://127.0.0.1:8000/docs" -ForegroundColor Yellow

python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
