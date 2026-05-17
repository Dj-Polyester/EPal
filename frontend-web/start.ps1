#Requires -Version 7.0

# Switch to the script's directory regardless of where it was invoked from
Set-Location $PSScriptRoot

# ---------------------------------------------------------------------------
# EPal — Frontend Dev Server Launch Script (Windows PowerShell)
# ---------------------------------------------------------------------------

$Green  = "`e[32m"
$Yellow = "`e[33m"
$Red    = "`e[31m"
$Blue   = "`e[34m"
$Reset  = "`e[0m"

Write-Host "$Blue========================================$Reset"
Write-Host "$Blue  EPal — Starting Web Frontend$Reset"
Write-Host "$Blue========================================$Reset"
Write-Host ""

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "$Red Error: 'npm' is not installed.$Reset"
    Write-Host "Install Node.js 20+ from https://nodejs.org"
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "$Green Installing npm dependencies...$Reset"
    npm install
}

Write-Host "$Yellow Starting Vite dev server...$Reset"
Write-Host ""
Write-Host "Open $Green http://localhost:3000 $Reset in your browser"
Write-Host ""

npm run dev
