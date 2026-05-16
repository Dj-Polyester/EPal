#Requires -Version 7.0
# ---------------------------------------------------------------------------
# EPal — vLLM Server Launch Script (Windows PowerShell)
# ---------------------------------------------------------------------------

$Green  = "`e[32m"
$Yellow = "`e[33m"
$Red    = "`e[31m"
$Blue   = "`e[34m"
$Reset  = "`e[0m"

Write-Host "$Blue========================================$Reset"
Write-Host "$Blue  EPal — Starting vLLM Server$Reset"
Write-Host "$Blue========================================$Reset"
Write-Host ""

# Activate backend venv so vllm is on PATH
$VenvActivate = "backend/.venv/Scripts/Activate.ps1"
if (-not (Test-Path $VenvActivate)) {
    $VenvActivate = "./.venv/Scripts/Activate.ps1"
}
if (Test-Path $VenvActivate) {
    & $VenvActivate
} else {
    Write-Host "$Red Error: backend venv not found.$Reset"
    Write-Host "Run .\start_backend.ps1 first to create the venv."
    exit 1
}

if (-not (Get-Command vllm -ErrorAction SilentlyContinue)) {
    Write-Host "$Red Error: 'vllm' is not installed in the backend venv.$Reset"
    Write-Host "Run .\start_backend.ps1 first (vllm was added to pyproject.toml)."
    exit 1
}

# Default config
$Model           = $env:VLLM_MODEL
$Port            = $env:VLLM_PORT
$MaxLen          = $env:VLLM_MAX_MODEL_LEN
$TensorParallel  = $env:VLLM_TENSOR_PARALLEL

# Load from .env or .env.docker
$EnvFiles = @(".env", ".env.docker")
foreach ($File in $EnvFiles) {
    if (Test-Path $File) {
        foreach ($Line in (Get-Content $File)) {
            if ($Line -match "^VLLM_MODEL=(.+)")  { $Model          = $Matches[1] }
            if ($Line -match "^VLLM_PORT=(.+)")  { $Port           = $Matches[1] }
            if ($Line -match "^VLLM_MAX_MODEL_LEN=(.+)") { $MaxLen = $Matches[1] }
            if ($Line -match "^VLLM_TENSOR_PARALLEL=(.+)") { $TensorParallel = $Matches[1] }
        }
        break
    }
}

# Fallback defaults
if (-not $Model)          { $Model          = "Qwen/Qwen2.5-1.5B-Instruct" }
if (-not $Port)           { $Port           = "8001" }
if (-not $MaxLen)         { $MaxLen         = "8192" }
if (-not $TensorParallel) { $TensorParallel = "1" }

Write-Host "$Green Model:$Reset  $Model"
Write-Host "$Green Port:$Reset   $Port"
Write-Host "$Green Max tokens:$Reset $MaxLen"
Write-Host "$Green Tensor parallelism:$Reset $TensorParallel"
Write-Host ""
Write-Host "$Yellow Starting server...$Reset"
Write-Host ""

vllm serve $Model `
    --host 0.0.0.0 `
    --port $Port `
    --max-model-len $MaxLen `
    --tensor-parallel-size $TensorParallel
