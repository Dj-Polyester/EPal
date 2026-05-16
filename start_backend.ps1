#Requires -Version 7.0
# ---------------------------------------------------------------------------
# EPal — Backend Manual Setup Script (Windows PowerShell)
# ---------------------------------------------------------------------------

$Green  = "`e[32m"
$Yellow = "`e[33m"
$Red    = "`e[31m"
$Blue   = "`e[34m"
$Reset  = "`e[0m"

Write-Host "$Blue========================================$Reset"
Write-Host "$Blue  EPal — Starting Backend$Reset"
Write-Host "$Blue========================================$Reset"
Write-Host ""

# --- Prerequisites ---------------------------------------------------------

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "$Red Error: 'uv' is not installed.$Reset"
    Write-Host "Install it with: pip install uv"
    exit 1
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "$Red Error: python is not installed.$Reset"
    exit 1
}

# --- Backend setup ---------------------------------------------------------

Write-Host "$Green [1/4] Setting up backend...$Reset"
Set-Location backend

if (-not (Test-Path ".venv")) {
    Write-Host "  Creating uv venv..."
    uv venv
}

Write-Host "  Installing dependencies..."
uv pip install -e .

# Use venv executables for everything below
$Venv       = ".venv"
$Python     = "$Venv\Scripts\python.exe"
$Alembic    = "$Venv\Scripts\alembic.exe"
$Uvicorn    = "$Venv\Scripts\uvicorn.exe"

# --- Environment file ------------------------------------------------------

$EnvCreated = $false
if (-not (Test-Path ".env")) {
    Copy-Item ..\..\.env.manual .env
    $EnvCreated = $true
    Write-Host "$Yellow  Created backend/.env from .env.manual.$Reset"
} else {
    Write-Host "  backend/.env already exists, keeping existing file."
}

# --- Generate & inject secret key ----------------------------------------

$SecretKey = & $Python -c "import secrets; print(secrets.token_urlsafe(32))"

$EnvContent = Get-Content .env -Raw
if ($EnvContent -match "^SECRET_KEY=.*") {
    $EnvContent = $EnvContent -replace "^SECRET_KEY=.*", "SECRET_KEY=$SecretKey"
} else {
    $EnvContent += "`nSECRET_KEY=$SecretKey"
}
Set-Content .env $EnvContent

Write-Host "$Green [2/4] Generated fresh SECRET_KEY.$Reset"

# --- Migrations ------------------------------------------------------------

Write-Host "$Green [3/4] Running database migrations...$Reset"
& $Alembic upgrade head

# --- Start backend ---------------------------------------------------------

Write-Host "$Green [4/4] Starting backend server...$Reset"
Write-Host "$Blue========================================$Reset"
Write-Host ""
Write-Host "Backend is starting on $Yellow http://localhost:8000 $Reset"
Write-Host ""

if ($EnvCreated) {
    Write-Host "$Yellow Note:$Reset A new .env was created. Review it if needed:"
    Write-Host "  Get-Content backend/.env"
    Write-Host ""
}

Write-Host "$Yellow Make sure the following services are also running:$Reset"
Write-Host "  • PostgreSQL  on port 5432"
Write-Host "  • Redis       on port 6379"
Write-Host "  • vLLM        on port 8001  (.\serve_llm.ps1)"
Write-Host "  • ComfyUI     on port 8188  (.\start_comfyui.ps1)"
Write-Host ""
Write-Host "$Yellow Then start the frontend:$Reset"
Write-Host "  .\start_frontend.ps1"
Write-Host ""
Write-Host "$Blue========================================$Reset"
Write-Host ""

& $Uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
