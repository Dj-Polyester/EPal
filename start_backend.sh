#!/usr/bin/env bash
set -e

# ---------------------------------------------------------------------------
# EPal — Backend Manual Setup Script (Linux/macOS)
# ---------------------------------------------------------------------------

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  EPal — Starting Backend${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# --- Prerequisites ---------------------------------------------------------

if ! command -v uv &> /dev/null; then
    echo -e "${RED}Error: 'uv' is not installed.${NC}"
    echo "Install it with: pip install uv"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 is not installed.${NC}"
    exit 1
fi

# --- Backend setup ---------------------------------------------------------

echo -e "${GREEN}[1/4] Setting up backend...${NC}"
cd backend

if [ ! -d ".venv" ]; then
    echo "  Creating uv venv..."
    uv venv --python 3.13
fi

echo "  Installing dependencies..."
uv pip install -e .

# Use venv executables for everything below
VENV="./.venv"
PYTHON="$VENV/bin/python"
ALEMBIC="$VENV/bin/alembic"
UVICORN="$VENV/bin/uvicorn"

# --- Environment file ------------------------------------------------------

ENV_CREATED=false
if [ ! -f ".env" ]; then
    cp ../.env.manual .env
    ENV_CREATED=true
    echo -e "${YELLOW}  Created backend/.env from .env.manual.${NC}"
else
    echo "  backend/.env already exists, keeping existing file."
fi

# --- Generate & inject secret key ------------------------------------------

SECRET_KEY=$($PYTHON -c "import secrets; print(secrets.token_urlsafe(32))")

if grep -q "^SECRET_KEY=" .env; then
    # Overwrite existing secret key
    sed -i "s|^SECRET_KEY=.*|SECRET_KEY=$SECRET_KEY|" .env
else
    # Append if missing
    echo "SECRET_KEY=$SECRET_KEY" >> .env
fi

echo -e "${GREEN}[2/4] Generated fresh SECRET_KEY.${NC}"

# --- Migrations ------------------------------------------------------------

echo -e "${GREEN}[3/4] Running database migrations...${NC}"
$ALEMBIC upgrade head

# --- Start backend ---------------------------------------------------------

echo -e "${GREEN}[4/4] Starting backend server...${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Backend is starting on ${YELLOW}http://localhost:8000${NC}"
echo ""

if [ "$ENV_CREATED" = true ]; then
    echo -e "${YELLOW}Note:${NC} A new .env was created. Review it if needed:"
    echo "  cat backend/.env"
    echo ""
fi

echo -e "${YELLOW}Make sure the following services are also running:${NC}"
echo "  • PostgreSQL  on port 5432"
echo "  • Redis       on port 6379"
echo "  • vLLM        on port 8001  (./serve_llm.sh)"
echo "  • ComfyUI     on port 8188  (./start_comfyui.sh)"
echo ""
echo -e "${YELLOW}Then start the frontend:${NC}"
echo "  ./start_frontend.sh"
echo ""
echo -e "${BLUE}========================================${NC}"
echo ""

$UVICORN app.main:app --host 0.0.0.0 --port 8000 --reload
