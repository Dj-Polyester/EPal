#!/usr/bin/env bash
set -e

# ---------------------------------------------------------------------------
# EPal — ComfyUI Docker Startup Script
# ---------------------------------------------------------------------------
# Mounts the host's ComfyUI installation into the container.
# Installs requirements from the mounted ComfyUI using system Python.
#

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  EPal — Starting ComfyUI (Docker)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

COMFYUI_PATH="${COMFYUI_PATH:-/app/ComfyUI}"

if [ ! -f "$COMFYUI_PATH/main.py" ]; then
    echo -e "${RED}Error: ComfyUI not found at $COMFYUI_PATH${NC}"
    echo -e "${YELLOW}Make sure your host ComfyUI is mounted to this path.${NC}"
    echo -e "${YELLOW}Default host path: $HOME/comfy/ComfyUI${NC}"
    echo -e "${YELLOW}Override with COMFYUI_PATH env var.${NC}"
    exit 1
fi

# --- Install ComfyUI requirements if needed ------------------------------

if [ -f "$COMFYUI_PATH/requirements.txt" ]; then
    echo -e "${YELLOW}Installing ComfyUI dependencies...${NC}"
    uv pip install --system -r "$COMFYUI_PATH/requirements.txt"
    echo -e "${GREEN}Dependencies installed.${NC}"
fi

# --- Start ComfyUI ---------------------------------------------------------

PORT="${COMFYUI_PORT:-8188}"

echo -e "${GREEN}ComfyUI path:${NC} $COMFYUI_PATH"
echo -e "${GREEN}Port:${NC}       $PORT"
echo ""
echo -e "${YELLOW}Starting ComfyUI server...${NC}"
echo ""

cd "$COMFYUI_PATH"
python main.py --listen 0.0.0.0 --port "$PORT"
