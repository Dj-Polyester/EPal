#!/usr/bin/env bash
set -e

# Remember the project root before switching to script directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$(dirname "$0")"

# ---------------------------------------------------------------------------
# EPal — vLLM Server Launch Script (Linux/macOS)
# ---------------------------------------------------------------------------

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  EPal — Starting vLLM Server${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# --- vLLM venv setup -------------------------------------------------------

if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}No vllm venv found. Creating one...${NC}"
    uv venv --python 3.13
fi

source .venv/bin/activate

if ! command -v vllm &> /dev/null; then
    echo -e "${YELLOW}Installing vllm...${NC}"
    uv pip install vllm
fi

# --- Load config from .env -------------------------------------------------

MODEL="${VLLM_MODEL:-Qwen3-4B-GGUF}"
GGUF_PATH="${VLLM_GGUF_PATH:-}"
TOKENIZER="${VLLM_TOKENIZER:-Qwen/Qwen3-4B}"
PORT="${VLLM_PORT:-8001}"
MAX_LEN="${VLLM_MAX_MODEL_LEN:-4096}"
TENSOR_PARALLEL="${VLLM_TENSOR_PARALLEL:-1}"
GPU_UTIL="${VLLM_GPU_MEMORY_UTILIZATION:-0.25}"

if [ -f "../.env" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in
            VLLM_MODEL=*) MODEL="${line#*=}" ;;
            VLLM_GGUF_PATH=*) GGUF_PATH="${line#*=}" ;;
            VLLM_BASE_MODEL=*) VLLM_BASE_MODEL="${line#*=}" ;;
            VLLM_TOKENIZER=*) TOKENIZER="${line#*=}" ;;
            VLLM_PORT=*) PORT="${line#*=}" ;;
            VLLM_MAX_MODEL_LEN=*) MAX_LEN="${line#*=}" ;;
            VLLM_TENSOR_PARALLEL=*) TENSOR_PARALLEL="${line#*=}" ;;
            VLLM_GPU_MEMORY_UTILIZATION=*) GPU_UTIL="${line#*=}" ;;
        esac
    done < "../.env"
elif [ -f "../.env.docker" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in
            VLLM_MODEL=*) MODEL="${line#*=}" ;;
            VLLM_GGUF_PATH=*) GGUF_PATH="${line#*=}" ;;
            VLLM_BASE_MODEL=*) VLLM_BASE_MODEL="${line#*=}" ;;
            VLLM_TOKENIZER=*) TOKENIZER="${line#*=}" ;;
            VLLM_PORT=*) PORT="${line#*=}" ;;
            VLLM_MAX_MODEL_LEN=*) MAX_LEN="${line#*=}" ;;
            VLLM_TENSOR_PARALLEL=*) TENSOR_PARALLEL="${line#*=}" ;;
            VLLM_GPU_MEMORY_UTILIZATION=*) GPU_UTIL="${line#*=}" ;;
        esac
    done < "../.env.docker"
fi

# Use GGUF_PATH as the actual model file if provided; otherwise fall back to MODEL
if [ -n "$GGUF_PATH" ]; then
    MODEL_PATH="$GGUF_PATH"
else
    MODEL_PATH="$MODEL"
fi

# Resolve model path relative to project root if it's a local file path.
# HuggingFace repo IDs (e.g. "Qwen/Qwen2.5-1.5B-Instruct") are left as-is.
if [[ "$MODEL_PATH" != /* ]] && [[ "$MODEL_PATH" != http* ]]; then
    # If it has a file extension, it's a local file → resolve under vllm/
    if [[ "$MODEL_PATH" =~ \.[a-zA-Z0-9]+$ ]]; then
        if [[ "$MODEL_PATH" == vllm/* ]]; then
            MODEL_PATH="$PROJECT_ROOT/$MODEL_PATH"
        else
            MODEL_PATH="$PROJECT_ROOT/vllm/$MODEL_PATH"
        fi
    fi
    # Otherwise (no extension) it's a HF repo ID → leave as-is
fi

echo -e "${GREEN}Model:${NC}  $MODEL"
echo -e "${GREEN}Path:${NC}  $MODEL_PATH"
echo -e "${GREEN}Port:${NC}   $PORT"
echo -e "${GREEN}Max tokens:${NC} $MAX_LEN"
echo -e "${GREEN}Tensor parallelism:${NC} $TENSOR_PARALLEL"
echo -e "${GREEN}GPU memory util:${NC} $GPU_UTIL"
echo ""
echo -e "${YELLOW}Starting server...${NC}"
echo ""

# --- Clear stale caches (e.g., after project rename) -------------------------

# If flashinfer cache references an old project path, nuke it
if [ -d "$HOME/.cache/flashinfer" ]; then
    if grep -qr "VirtualFriend" "$HOME/.cache/flashinfer" 2>/dev/null; then
        echo -e "${YELLOW}Clearing stale flashinfer cache (old project path detected)...${NC}"
        rm -rf "$HOME/.cache/flashinfer"
    fi
fi

# Local GGUF files need extra flags so vLLM knows how to load them
if [[ "$MODEL_PATH" == *.gguf ]]; then
    BASE_MODEL="${VLLM_BASE_MODEL:-Qwen/Qwen3-4B}"
    echo -e "${YELLOW}Detected GGUF file. Using base model for config/tokenizer:${NC} $BASE_MODEL"

    # vLLM expects config.json in the same directory as the GGUF file
    GGUF_DIR="$(cd "$(dirname "$MODEL_PATH")" && pwd)"
    if [ ! -f "$GGUF_DIR/config.json" ]; then
        echo -e "${YELLOW}Downloading config.json from $BASE_MODEL...${NC}"
        python3 -c "
import os, sys
from huggingface_hub import hf_hub_download
try:
    path = hf_hub_download(repo_id='$BASE_MODEL', filename='config.json', local_dir='$GGUF_DIR')
    print(f'Downloaded config.json to {path}')
except Exception as e:
    print(f'Failed to download config.json: {e}', file=sys.stderr)
    sys.exit(1)
"
    fi

    vllm serve "$MODEL_PATH" \
        --load-format gguf \
        --quantization gguf \
        --dtype float16 \
        --tokenizer "$BASE_MODEL" \
        --served-model-name "$MODEL" \
        --host 0.0.0.0 \
        --port "$PORT" \
        --max-model-len "$MAX_LEN" \
        --tensor-parallel-size "$TENSOR_PARALLEL" \
        --gpu-memory-utilization "$GPU_UTIL" \
        --max-num-seqs 256 \
        --enable-prefix-caching
else
    # HuggingFace model ID or local directory
    vllm serve "$MODEL_PATH" \
        --tokenizer "$TOKENIZER" \
        --host 0.0.0.0 \
        --port "$PORT" \
        --max-model-len "$MAX_LEN" \
        --tensor-parallel-size "$TENSOR_PARALLEL" \
        --gpu-memory-utilization "$GPU_UTIL"
fi
