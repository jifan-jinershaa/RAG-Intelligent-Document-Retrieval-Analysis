# RAGLab Frontend Startup Script (PowerShell)
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Starting RAGLab React + Vite Frontend  " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\frontend"

Write-Host "Current Directory: $(Get-Location)" -ForegroundColor Gray
Write-Host "Checking Node..." -ForegroundColor Gray
node --version

Write-Host "`nLaunching Vite Dev Server on http://localhost:5173 ..." -ForegroundColor Magenta
npm run dev
