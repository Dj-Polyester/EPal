#!/usr/bin/env bash
set -e

# Switch to the script's directory regardless of where it was invoked from
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

# Activate backend venv so vllm is on PATH
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
else
    echo -e "${RED}Error: backend venv not found.${NC}"
    echo "Run ./start.sh first to create the venv."
    exit 1
fi

if ! command -v vllm &> /dev/null; then
    echo -e "${RED}Error: 'vllm' is not installed in the backend venv.${NC}"
    echo "Run ./start.sh first (vllm was added to pyproject.toml)."
    exit 1
fi

# Load model config from .env.docker or .env if present
MODEL="${VLLM_MODEL:-Qwen/Qwen2.5-1.5B-Instruct}"
PORT="${VLLM_PORT:-8001}"
MAX_LEN="${VLLM_MAX_MODEL_LEN:-8192}"
TENSOR_PARALLEL="${VLLM_TENSOR_PARALLEL:-1}"
GPU_UTIL="${VLLM_GPU_MEMORY_UTILIZATION:-0.25}"

if [ -f "../.env" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in
            VLLM_MODEL=*) MODEL="${line#*=}" ;;
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
            VLLM_PORT=*) PORT="${line#*=}" ;;
            VLLM_MAX_MODEL_LEN=*) MAX_LEN="${line#*=}" ;;
            VLLM_TENSOR_PARALLEL=*) TENSOR_PARALLEL="${line#*=}" ;;
            VLLM_GPU_MEMORY_UTILIZATION=*) GPU_UTIL="${line#*=}" ;;
        esac
    done < "../.env.docker"
fi

# Resolve local model paths relative to project root
PROJECT_ROOT="$(cd .. && pwd)"
if [[ "$MODEL" == ./* ]] || [[ "$MODEL" == ../* ]]; then
    MODEL="$PROJECT_ROOT/$MODEL"
elif [[ "$MODEL" != /* ]] && [[ -e "$PROJECT_ROOT/$MODEL" ]]; then
    MODEL="$PROJECT_ROOT/$MODEL"
fi

echo -e "${GREEN}Model:${NC}  $MODEL"
echo -e "${GREEN}Port:${NC}   $PORT"
echo -e "${GREEN}Max tokens:${NC} $MAX_LEN"
echo -e "${GREEN}Tensor parallelism:${NC} $TENSOR_PARALLEL"
echo -e "${GREEN}GPU memory util:${NC} $GPU_UTIL"
echo ""
echo -e "${YELLOW}Starting server...${NC}"
echo ""

vllm serve "$MODEL" \
    --host 0.0.0.0 \
    --port "$PORT" \
    --max-model-len "$MAX_LEN" \
    --tensor-parallel-size "$TENSOR_PARALLEL" \
    --gpu-memory-utilization "$GPU_UTIL"
