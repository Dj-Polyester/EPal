#!/usr/bin/env bash
set -e

# ---------------------------------------------------------------------------
# EPal — ComfyUI Server Launch Script (Linux/macOS)
# ---------------------------------------------------------------------------
#
# Defaults to $HOME/comfy/ComfyUI unless COMFYUI_PATH env var is set.
# If the directory does not exist, ComfyUI is cloned from GitHub automatically.
# Uses the .venv inside the ComfyUI directory, creating one if needed.
#

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  EPal — Starting ComfyUI${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# --- Resolve ComfyUI path --------------------------------------------------

COMFYUI_PATH="${COMFYUI_PATH:-$HOME/comfy/ComfyUI}"

if [ ! -f "$COMFYUI_PATH/main.py" ]; then
    echo -e "${YELLOW}ComfyUI not found at $COMFYUI_PATH${NC}"
    echo -e "${YELLOW}Cloning from GitHub...${NC}"
    mkdir -p "$(dirname "$COMFYUI_PATH")"
    git clone https://github.com/comfyanonymous/ComfyUI.git "$COMFYUI_PATH"
    echo -e "${GREEN}ComfyUI cloned successfully.${NC}"
fi

COMFYUI_PATH=$(cd "$COMFYUI_PATH" && pwd)

# --- Activate or create ComfyUI venv ---------------------------------------

VENV_ACTIVATE="$COMFYUI_PATH/.venv/bin/activate"

if [ ! -f "$VENV_ACTIVATE" ]; then
    echo -e "${YELLOW}No .venv found in $COMFYUI_PATH. Creating one...${NC}"
    cd "$COMFYUI_PATH"
    if command -v uv &> /dev/null; then
        uv venv
    else
        python3 -m venv .venv
    fi
    echo -e "${GREEN}Created .venv in $COMFYUI_PATH${NC}"
fi

source "$VENV_ACTIVATE"

# --- Install ComfyUI requirements if needed ------------------------------

if [ -f "$COMFYUI_PATH/requirements.txt" ] && [ ! -f "$COMFYUI_PATH/.venv/.requirements-installed" ]; then
    echo -e "${YELLOW}Installing ComfyUI dependencies...${NC}"
    if command -v uv &> /dev/null; then
        uv pip install -r "$COMFYUI_PATH/requirements.txt"
    else
        pip install -r "$COMFYUI_PATH/requirements.txt"
    fi
    touch "$COMFYUI_PATH/.venv/.requirements-installed"
    echo -e "${GREEN}Dependencies installed.${NC}"
fi

# --- Start ComfyUI ---------------------------------------------------------

PORT="${COMFYUI_PORT:-8188}"

echo -e "${GREEN}ComfyUI path:${NC} $COMFYUI_PATH"
echo -e "${GREEN}Venv:${NC}       $COMFYUI_PATH/.venv"
echo -e "${GREEN}Port:${NC}       $PORT"
echo ""
echo -e "${YELLOW}Starting ComfyUI server...${NC}"
echo ""

cd "$COMFYUI_PATH"
python main.py --listen 0.0.0.0 --port "$PORT"
