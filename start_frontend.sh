#!/usr/bin/env bash
set -e

# ---------------------------------------------------------------------------
# EPal — Frontend Dev Server Launch Script (Linux/macOS)
# ---------------------------------------------------------------------------

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  EPal — Starting Web Frontend${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: 'npm' is not installed.${NC}"
    echo "Install Node.js 20+ from https://nodejs.org"
    exit 1
fi

cd frontend-web

if [ ! -d "node_modules" ]; then
    echo -e "${GREEN}Installing npm dependencies...${NC}"
    npm install
fi

echo -e "${YELLOW}Starting Vite dev server...${NC}"
echo ""
echo -e "Open ${GREEN}http://localhost:3000${NC} in your browser"
echo ""

npm run dev
