#Requires -Version 7.0

# Switch to the script's directory regardless of where it was invoked from
Set-Location $PSScriptRoot

# ---------------------------------------------------------------------------
# EPal — ComfyUI Server Launch Script (Windows PowerShell)
# ---------------------------------------------------------------------------
#
# Defaults to $env:USERPROFILE\comfy\ComfyUI unless COMFYUI_PATH env var is set.
# If the directory does not exist, ComfyUI is cloned from GitHub automatically.
# Uses the .venv inside the ComfyUI directory, creating one if needed.
#

$Green  = "`e[32m"
$Yellow = "`e[33m"
$Red    = "`e[31m"
$Blue   = "`e[34m"
$Reset  = "`e[0m"

Write-Host "$Blue========================================$Reset"
Write-Host "$Blue  EPal — Starting ComfyUI$Reset"
Write-Host "$Blue========================================$Reset"
Write-Host ""

# --- Resolve ComfyUI path --------------------------------------------------

$ComfyPath = $env:COMFYUI_PATH
if (-not $ComfyPath) {
    $ComfyPath = Join-Path $env:USERPROFILE "comfy\ComfyUI"
}

if (-not (Test-Path "$ComfyPath\main.py")) {
    Write-Host "$Yellow ComfyUI not found at $ComfyPath $Reset"
    Write-Host "$Yellow Cloning from GitHub...$Reset"
    $Parent = Split-Path $ComfyPath -Parent
    if (-not (Test-Path $Parent)) {
        New-Item -ItemType Directory -Path $Parent -Force | Out-Null
    }
    git clone https://github.com/comfyanonymous/ComfyUI.git "$ComfyPath"
    Write-Host "$Green ComfyUI cloned successfully.$Reset"
}

$ComfyPath = (Resolve-Path $ComfyPath).Path

# --- Activate or create ComfyUI venv ---------------------------------------

$VenvActivate = "$ComfyPath\.venv\Scripts\Activate.ps1"

if (-not (Test-Path $VenvActivate)) {
    Write-Host "$Yellow No .venv found in $ComfyPath. Creating one...$Reset"
    Set-Location $ComfyPath
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        uv venv
    } else {
        python -m venv .venv
    }
    Write-Host "$Green Created .venv in $ComfyPath$Reset"
}

& $VenvActivate

# --- Install ComfyUI requirements if needed ------------------------------

$ReqInstalled = "$ComfyPath\.venv\.requirements-installed"
if ((Test-Path "$ComfyPath\requirements.txt") -and -not (Test-Path $ReqInstalled)) {
    Write-Host "$Yellow Installing ComfyUI dependencies...$Reset"
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        uv pip install -r "$ComfyPath\requirements.txt"
    } else {
        pip install -r "$ComfyPath\requirements.txt"
    }
    New-Item -ItemType File -Path $ReqInstalled | Out-Null
    Write-Host "$Green Dependencies installed.$Reset"
}

# --- Start ComfyUI ---------------------------------------------------------

$Port = $env:COMFYUI_PORT
if (-not $Port) { $Port = "8188" }

Write-Host "$Green ComfyUI path:$Reset $ComfyPath"
Write-Host "$Green Venv:$Reset       $ComfyPath\.venv"
Write-Host "$Green Port:$Reset       $Port"
Write-Host ""
Write-Host "$Yellow Starting ComfyUI server...$Reset"
Write-Host ""

Set-Location $ComfyPath
python main.py --listen 0.0.0.0 --port $Port
