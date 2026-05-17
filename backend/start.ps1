#Requires -Version 7.0

# Switch to the script's directory regardless of where it was invoked from
Set-Location $PSScriptRoot

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

# Detect stale venv (e.g., moved project folder)
if (Test-Path ".venv") {
    $PythonExe = ".venv\Scripts\python.exe"
    if (-not (Test-Path $PythonExe)) {
        Write-Host "$Yellow  Stale venv detected (interpreter missing). Recreating...$Reset"
        Remove-Item -Recurse -Force ".venv"
    }
}

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

# --- Environment file (workspace root) ------------------------------------

$EnvCreated = $false
if (-not (Test-Path "..\.env")) {
    if (Test-Path "..\.env.manual") {
        Copy-Item ..\.env.manual ..\.env
        $EnvCreated = $true
        Write-Host "$Yellow  Created .env at workspace root from .env.manual.$Reset"
    } else {
        Write-Host "$Yellow  .env.manual not found at workspace root; skipping .env creation (Docker?).$Reset"
    }
} else {
    Write-Host "  .env already exists at workspace root, keeping existing file."
}

# --- Generate & inject secret key ----------------------------------------

if (Test-Path "..\.env") {
    $SecretKey = & $Python -c "import secrets; print(secrets.token_urlsafe(32))"

    $EnvContent = Get-Content ..\.env -Raw
    if ($EnvContent -match "^SECRET_KEY=.*") {
        $EnvContent = $EnvContent -replace "^SECRET_KEY=.*", "SECRET_KEY=$SecretKey"
    } else {
        $EnvContent += "`nSECRET_KEY=$SecretKey"
    }
    Set-Content ..\.env $EnvContent
    Write-Host "$Green [2/4] Generated fresh SECRET_KEY.$Reset"
} else {
    Write-Host "$Yellow [2/4] No .env found; skipping SECRET_KEY injection (Docker?).$Reset"
}

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
    Write-Host "$Yellow Note:$Reset A new .env was created at workspace root. Review it if needed:"
    Write-Host "  Get-Content .\.env"
    Write-Host ""
}

Write-Host "$Yellow Make sure the following services are also running:$Reset"
Write-Host "  • PostgreSQL  on port 5432"
Write-Host "  • Redis       on port 6379"
Write-Host "  • vLLM        on port 8001  (.\serve_llm.ps1)"
Write-Host "  • ComfyUI     on port 8188  (..\comfyui\start.ps1)"
Write-Host ""
Write-Host "$Yellow Then start the frontend:$Reset"
Write-Host "  ..\frontend-web\start.ps1"
Write-Host ""
Write-Host "$Blue========================================$Reset"
Write-Host ""

& $Uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
