#Requires -Version 7.0

# Remember the project root before switching to script directory
$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $PSScriptRoot

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

# --- vLLM venv setup -------------------------------------------------------

if (-not (Test-Path ".venv")) {
    Write-Host "$Yellow No vllm venv found. Creating one...$Reset"
    uv venv
}

& .venv\Scripts\Activate.ps1

if (-not (Get-Command vllm -ErrorAction SilentlyContinue)) {
    Write-Host "$Yellow Installing vllm...$Reset"
    uv pip install vllm
}

# --- Load config from .env -------------------------------------------------

$ServedName = $env:VLLM_MODEL
$ModelPath = $env:VLLM_GGUF_PATH
$Port            = $env:VLLM_PORT
$MaxLen          = $env:VLLM_MAX_MODEL_LEN
$TensorParallel  = $env:VLLM_TENSOR_PARALLEL
$GpuUtil         = $env:VLLM_GPU_MEMORY_UTILIZATION

$EnvFiles = @("..\.env", "..\.env.docker")
foreach ($File in $EnvFiles) {
    if (Test-Path $File) {
        foreach ($Line in (Get-Content $File)) {
            if ($Line -match "^VLLM_MODEL=(.+)" )  { $ServedName     = $Matches[1] }
            if ($Line -match "^VLLM_GGUF_PATH=(.+)" )  { $ModelPath     = $Matches[1] }
            if ($Line -match "^VLLM_BASE_MODEL=(.+)" )  { $env:VLLM_BASE_MODEL = $Matches[1] }
            if ($Line -match "^VLLM_PORT=(.+)"  )  { $Port           = $Matches[1] }
            if ($Line -match "^VLLM_MAX_MODEL_LEN=(.+)" ) { $MaxLen = $Matches[1] }
            if ($Line -match "^VLLM_TENSOR_PARALLEL=(.+)" ) { $TensorParallel = $Matches[1] }
            if ($Line -match "^VLLM_GPU_MEMORY_UTILIZATION=(.+)" ) { $GpuUtil = $Matches[1] }
        }
        break
    }
}

# Fallback defaults
if (-not $ServedName)   { $ServedName    = "Qwen3-0.6B-GGUF" }
if (-not $ModelPath)    { $ModelPath     = "models\Qwen3-0.6B-Q4_K_M.gguf" }
if (-not $Port)         { $Port           = "8001" }
if (-not $MaxLen)       { $MaxLen         = "4096" }
if (-not $TensorParallel) { $TensorParallel = "1" }
if (-not $GpuUtil)      { $GpuUtil        = "0.25" }

# Resolve model path relative to project root only if it looks like a local file
# (has an extension). HuggingFace repo IDs are left as-is.
if (-not [System.IO.Path]::IsPathRooted($ModelPath)) {
    $Extension = [System.IO.Path]::GetExtension($ModelPath)
    if ($Extension -and $Extension -ne "") {
        if ($ModelPath -match "^vllm\\") {
            $ModelPath = Join-Path $ProjectRoot $ModelPath
        } else {
            $ModelPath = Join-Path $ProjectRoot "vllm\$ModelPath"
        }
    }
    # Otherwise no extension → HF repo ID, leave as-is
}

Write-Host "$Green Model:$Reset  $ServedName"
Write-Host "$Green Path:$Reset   $ModelPath"
Write-Host "$Green Port:$Reset   $Port"
Write-Host "$Green Max tokens:$Reset $MaxLen"
Write-Host "$Green Tensor parallelism:$Reset $TensorParallel"
Write-Host "$Green GPU memory util:$Reset $GpuUtil"
Write-Host ""
Write-Host "$Yellow Starting server...$Reset"
Write-Host ""

# Clear stale caches (e.g., after project rename)
$FlashinferCache = "$env:HOME\.cache\flashinfer"
if (Test-Path $FlashinferCache) {
    $StaleRefs = Get-ChildItem -Recurse $FlashinferCache | Select-String -Pattern "VirtualFriend" -Quiet
    if ($StaleRefs) {
        Write-Host "$Yellow Clearing stale flashinfer cache (old project path detected)...$Reset"
        Remove-Item -Recurse -Force $FlashinferCache
    }
}

if ($ModelPath -match "\.gguf$") {
    $BaseModel = $env:VLLM_BASE_MODEL
    if (-not $BaseModel) { $BaseModel = "Qwen/Qwen3-0.6B" }
    Write-Host "$Yellow Detected GGUF file. Using base model for config/tokenizer:$Reset $BaseModel"

    # vLLM expects config.json in the same directory as the GGUF file
    $GGUFDir = Split-Path -Parent $ModelPath
    $ConfigPath = Join-Path $GGUFDir "config.json"
    if (-not (Test-Path $ConfigPath)) {
        Write-Host "$Yellow Downloading config.json from $BaseModel...$Reset"
        python -c "
import os, sys
from huggingface_hub import hf_hub_download
try:
    path = hf_hub_download(repo_id='$BaseModel', filename='config.json', local_dir='$GGUFDir')
    print(f'Downloaded config.json to {path}')
except Exception as e:
    print(f'Failed to download config.json: {e}', file=sys.stderr)
    sys.exit(1)
"
    }

    vllm serve $ModelPath `
        --load-format gguf `
        --quantization gguf `
        --dtype float16 `
        --tokenizer $BaseModel `
        --served-model-name $ServedName `
        --host 0.0.0.0 `
        --port $Port `
        --max-model-len $MaxLen `
        --tensor-parallel-size $TensorParallel `
        --gpu-memory-utilization $GpuUtil
} else {
    vllm serve $ModelPath `
        --host 0.0.0.0 `
        --port $Port `
        --max-model-len $MaxLen `
        --tensor-parallel-size $TensorParallel `
        --gpu-memory-utilization $GpuUtil
}
