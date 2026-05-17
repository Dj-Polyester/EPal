# EPal

A cross-platform web application where users can create virtual AI characters and chat with them. Characters remember past conversations, reflect their unique personalities, and can generate images (and potentially video/audio) on request.

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
  - [Estimated Disk Space](#estimated-disk-space)
  - [Prerequisites for Media Generation to Actually Work](#prerequisites-for-media-generation-to-actually-work)
- [Quick Start (Docker)](#quick-start-docker)
  - [1. Clone and enter the project](#1-clone-and-enter-the-project)
  - [2. Configure environment variables](#2-configure-environment-variables)
  - [3. Start all services](#3-start-all-services)
  - [4. Run the web frontend](#4-run-the-web-frontend)
- [Manual Setup (without Docker)](#manual-setup-without-docker)
  - [1. Start the backend](#1-start-the-backend)
  - [2. Start vLLM](#2-start-vllm)
  - [3. Start ComfyUI](#3-start-comfyui)
  - [4. Start the web frontend](#4-start-the-web-frontend)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
  - [Auth](#auth)
  - [Users](#users)
  - [Characters](#characters)
  - [Chats](#chats)
  - [WebSocket](#websocket)
- [Project Structure](#project-structure)
- [Scalability Notes](#scalability-notes)
- [Media Generation Setup](#media-generation-setup)
  - [Where to place models](#where-to-place-models)
  - [Supported media types](#supported-media-types)

## Architecture

- **Backend**: Python 3.12, FastAPI, Async SQLAlchemy 2.0, PostgreSQL, Redis
- **AI LLM**: vLLM (OpenAI-compatible API server)
- **AI Media**: ComfyUI + ComfyScript (image/video/audio generation)
- **Frontend Web**: React 18 + TypeScript + Vite + Tailwind CSS
- **Frontend Mobile**: Expo (React Native) — planned for future release
- **Infra**: Docker Compose for local development, designed for horizontal scaling

---

## Features

- **Account & Auth**: JWT-based authentication with access/refresh tokens
- **Skippable Onboarding**: New users can share info about themselves; characters remember it
- **Character Creation**: Prompt-based personality definition with a "Randomize" feature
- **Persistent Memory**: Sliding context window + automatic summarization for long-term memory
- **Personality-Driven Chat**: Characters speak and act according to their defined traits
- **Media Generation**: Characters detect requests for image/video/audio in natural language and generate media via ComfyUI
- **Multiple Chats**: Create many characters, each with their own ongoing conversation
- **Real-time Chat**: WebSocket streaming for live message exchange

---

## Prerequisites

- **Docker** and **Docker Compose**
- **NVIDIA Container Toolkit** (for GPU-accelerated vLLM and ComfyUI)
- **Node.js 20+** (only if running frontend outside Docker)
- **Python 3.12+** (only if running backend outside Docker)
- **uv** (only if running backend outside Docker): `pip install uv`

The backend requires **PostgreSQL** and **Redis**. The easiest way is to keep them running via Docker while developing the backend locally:

```bash
docker compose up -d postgres redis
```
Note that this command is unnecessary if using Docker as the compose command already runs these services. 

> If you prefer running everything natively, install PostgreSQL 15+ and Redis 7+ on your system, then copy `.env.manual` → `.env` at the workspace root and edit it with the correct connection URLs. 

### Estimated Disk Space

| Service | Image + Model Data (approx.) |
|---------|------------------------------|
| PostgreSQL 15 | ~200 MB |
| Redis 7 | ~30 MB |
| vLLM (CUDA runtime + model) | **~6–10 GB** total (base image ~4–6 GB + `Qwen2.5-1.5B-Instruct` ~3 GB) |
| ComfyUI (CUDA runtime + checkpoints) | **~8–15 GB** total (base image ~5–8 GB + Stable Diffusion checkpoints ~2–5 GB) |
| Backend (FastAPI + uv venv) | ~500 MB–1 GB |
| **Total** | **~15–27 GB** |

> **Note:** The two AI services (vLLM and ComfyUI) consume the vast majority of space due to CUDA runtimes and downloaded models. The first `docker compose up` will download models automatically; ensure you have sufficient free disk space and a stable internet connection.

### Prerequisites for Media Generation to Actually Work

1. **Download a Stable Diffusion checkpoint** into ComfyUI's `models/checkpoints/` directory.  
   Popular sources:
   - [CivitAI](https://civitai.com) (community models, requires free account)
   - [Hugging Face](https://huggingface.co) (official checkpoints like `stabilityai/stable-diffusion-xl-base-1.0`)
   - Direct links from model authors (e.g., `anything-v5.safetensors`)

2. **Place the model in your host ComfyUI installation**. The Docker Compose setup automatically mounts your existing ComfyUI installation into the container — no copying needed.

   By default, Docker mounts `$HOME/comfy/ComfyUI` from your host. If your ComfyUI lives elsewhere, edit `.env` after copying it and set `COMFYUI_PATH`:

   ```bash
   cp .env.docker .env
   # Edit .env and change COMFYUI_PATH if needed
   ```

   Your models, custom nodes, and workflows from the host ComfyUI are immediately available inside the container.

> **Note:** The app gracefully handles missing models. If a checkpoint is not installed, the character will politely tell the user it cannot generate that media type yet.

---

## Quick Start (Docker)

The fastest way to get everything running is with Docker Compose.

### 1. Clone and enter the project

```bash
cd /home/polyester/Desktop/Projects/misc/EPal  # or your clone path
```

### 2. Configure environment variables

```bash
cp .env.docker .env
```

Edit `.env` (your local copy — not `.env.docker`) if needed. The defaults work out of the box for local development.

### 3. Start all services

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **vLLM** on port `8001` (downloads `Qwen/Qwen2.5-1.5B-Instruct` on first run)
- **ComfyUI** on port `8188`
- **Backend API** on port `8000`

> **Note**: vLLM will download the model on first startup, which may take several minutes depending on your internet connection and GPU.

### 4. Run the web frontend

**Linux / macOS:**
```bash
./frontend-web/start.sh
```

**Windows (PowerShell):**
```powershell
.\frontend-web\start.ps1
```
The script installs `node_modules` automatically if they don't exist, then launches the Vite dev server on `http://localhost:3000`. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Manual Setup (without Docker)

Instead of typing each command by hand, use the provided start scripts. They create the virtual environment, install dependencies, copy the correct `.env` file, run migrations, and launch the backend.

> **Note:** Each of the steps below should be run in a **separate terminal** so the services run concurrently.

### 1. Start the backend

**Linux / macOS:**
```bash
./backend/start.sh
```

**Windows (PowerShell):**
```powershell
.\backend\start.ps1
```

What the script does:
1. Checks that `uv` and `python3` / `python` are installed
2. Creates a uv venv inside `backend/` (if it doesn't exist)
3. Installs Python dependencies with `uv pip install -e .`
4. Copies `.env.manual` → `.env` at the workspace root (only if `.env` is missing)
5. **Generates a random `SECRET_KEY` and writes it into `.env` at the workspace root**
6. Runs `alembic upgrade head` for database migrations
7. Starts the FastAPI dev server on port `8000`

### 2. Start vLLM

> **Prerequisite:** You must run `./backend/start.sh` (or `.\backend\start.ps1`) first so the backend venv is created and `vllm` is installed.

**Linux / macOS:**
```bash
./backend/serve_llm.sh
```

**Windows (PowerShell):**
```powershell
.\backend\serve_llm.ps1
```

These scripts automatically activate the backend venv, then read `VLLM_MODEL`, `VLLM_PORT`, `VLLM_MAX_MODEL_LEN`, and `VLLM_TENSOR_PARALLEL` from `.env` (or `.env.docker` as fallback). The defaults are:

| Setting | Default |
|---|---|
| Model | `Qwen/Qwen2.5-1.5B-Instruct` |
| Port | `8001` |
| Max model length | `8192` |
| Tensor parallelism | `1` |
| GPU memory utilization | `0.25` |

**Using a local GGUF model:**
1. Download the `.gguf` file to `vllm/models/`
2. Edit `.env` and set both the file path and the base model (for tokenizer/config):
```bash
VLLM_MODEL=vllm/models/your-model.gguf
VLLM_BASE_MODEL=Qwen/Qwen2.5-1.5B-Instruct  # matching non-quantized model on HuggingFace
```
The start script will automatically download `config.json` from the base model if it's not present in the same directory as the GGUF file.

For Docker, use the container path:
```bash
VLLM_MODEL=/models/your-model.gguf
```

### 3. Start ComfyUI

**Linux / macOS:**
```bash
./comfyui/start.sh
```

**Windows (PowerShell):**
```powershell
.\comfyui\start.ps1
```

The script defaults to `$HOME/comfy/ComfyUI` (Linux/macOS) or `%USERPROFILE%\comfy\ComfyUI` (Windows). If ComfyUI is not found there, it is **automatically cloned from GitHub**. You can override the path by setting the `COMFYUI_PATH` environment variable before running the script:

```bash
export COMFYUI_PATH=/custom/path/to/ComfyUI
./comfyui/start.sh
```

### 4. Start the web frontend

**Linux / macOS:**
```bash
./frontend-web/start.sh
```

**Windows (PowerShell):**
```powershell
.\frontend-web\start.ps1
```

The script installs `node_modules` automatically if they don't exist, then launches the Vite dev server on `http://localhost:3000`.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://...` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection string |
| `VLLM_BASE_URL` | `http://localhost:8001/v1` | vLLM OpenAI-compatible API URL |
| `COMFYUI_URL` | `http://localhost:8188` | ComfyUI server URL |
| `COMFYUI_PATH` | `$HOME/comfy/ComfyUI` | Host ComfyUI path to mount into Docker |
| `SECRET_KEY` | — | JWT signing secret (change in production!) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | JWT access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | JWT refresh token lifetime |
| `VLLM_MODEL` | `Qwen/Qwen2.5-1.5B-Instruct` | HF model ID or local path (e.g., `vllm/models/model.gguf`) |
| `VLLM_BASE_MODEL` | — | For GGUF files: the matching non-quantized HF model ID |
| `VLLM_TENSOR_PARALLEL` | `1` | Tensor parallelism for vLLM |
| `VLLM_MAX_MODEL_LEN` | `8192` | Max sequence length for vLLM |
| `VLLM_GPU_MEMORY_UTILIZATION` | `0.25` | Fraction of GPU memory vLLM may use (lower if desktop uses GPU) |

---

## API Endpoints

### Auth
- `POST /auth/register` — Register new user
- `POST /auth/login` — Login
- `POST /auth/refresh` — Refresh access token
- `GET /auth/me` — Get current user

### Users
- `POST /users/onboarding` — Save bio and complete onboarding
- `POST /users/onboarding/skip` — Skip onboarding

### Characters
- `GET /characters/prompts/random` — Get a random personality prompt
- `POST /characters` — Create a character (auto-generates avatar + chat)
- `GET /characters` — List user's characters
- `GET /characters/{id}` — Get a specific character

### Chats
- `GET /chats` — List user's active chats
- `GET /chats/{id}/messages` — Get chat message history

### WebSocket
- `WS /ws/chat/{chat_id}?token={jwt}` — Real-time chat connection

---

## Project Structure

```
EPal/
├── docker-compose.yml          # Full stack orchestration
├── .env.docker                 # Environment template for Docker Compose
├── .env.manual                 # Environment template for manual setup
├── backend/
│   ├── Dockerfile
│   ├── start.sh                # Backend start script (Linux/macOS)
│   ├── start.ps1               # Backend start script (Windows)
│   ├── serve_llm.sh            # vLLM start script (Linux/macOS)
│   ├── serve_llm.ps1           # vLLM start script (Windows)
│   ├── pyproject.toml          # uv project + Python deps
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   └── app/
│       ├── main.py             # FastAPI entry point
│       ├── config.py           # Pydantic settings
│       ├── db.py               # Async SQLAlchemy setup
│       ├── dependencies.py     # Auth & current user deps
│       ├── models/             # SQLAlchemy models
│       ├── routers/            # REST API routes
│       ├── services/           # vLLM, ComfyScript, Memory
│       └── websocket/          # WebSocket chat handler
├── comfyui/
│   ├── Dockerfile
│   ├── start.sh                # ComfyUI start script (Linux/macOS)
│   ├── start.ps1               # ComfyUI start script (Windows)
│   └── workflows/              # ComfyUI workflow exports
├── frontend-web/
│   ├── package.json
│   ├── start.sh                # Frontend start script (Linux/macOS)
│   ├── start.ps1               # Frontend start script (Windows)
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx
│       ├── api/client.ts       # Axios client with interceptors
│       ├── contexts/
│       │   └── AuthContext.tsx
│       └── components/
│           ├── Auth/
│           ├── Onboarding/
│           ├── CharacterCreate/
│           ├── Dashboard/
│           └── Chat/
```

---

## Scalability Notes

- **Backend**: Stateless (JWT auth, no server sessions). Scale horizontally with multiple replicas behind a load balancer.
- **WebSocket**: Uses Redis pub/sub architecture-ready. For multiple backend replicas, add Redis-backed message broadcasting so any replica can push to connected clients.
- **vLLM**: Scale vertically with `--tensor-parallel-size` and `--pipeline-parallel-size`. Scale horizontally by running multiple vLLM instances behind a load balancer.
- **ComfyUI**: For high throughput, run multiple ComfyUI instances behind a queue worker system (e.g., Celery + Redis).
- **Database**: PostgreSQL can be replaced with a managed service (AWS RDS, Google Cloud SQL, etc.) and read replicas can be added for scaling reads.

---

## Media Generation Setup

ComfyUI requires you to download model checkpoints into its `models/` directory.

### Where to place models

**With Docker:** The container mounts your existing host ComfyUI installation (default `$HOME/comfy/ComfyUI`). Simply place your models in your host ComfyUI's `models/checkpoints/` folder — they will be available inside the container automatically. No copying or editing `docker-compose.yml` required.

**Without Docker (manual setup):** Place checkpoints in your local ComfyUI installation under `models/checkpoints/`.

### Supported media types

| Type | Required Model | Typical Location |
|------|---------------|------------------|
| **Images** | Stable Diffusion checkpoint (e.g., `sdxl_base.safetensors`, `anything-v5.safetensors`) | `models/checkpoints/` |
| **Video** | Video diffusion model (e.g., Wan 2.1, LTX-Video) | `models/checkpoints/` or `models/diffusion_models/` |
| **Audio** | Stable Audio Open or similar | `models/audio/` |

> **Note:** The app gracefully handles missing models. If a checkpoint is not installed, the character will politely tell the user it cannot generate that media type yet.

---
