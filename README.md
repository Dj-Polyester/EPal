# EPal

A cross-platform web application where users can create virtual AI characters and chat with them. Characters remember past conversations, reflect their unique personalities, and can generate images (and potentially video/audio) on request.

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

Edit `.env` if needed. The defaults work out of the box for local development.

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

```bash
cd frontend-web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Manual Setup (without Docker)

Instead of typing each command by hand, use the provided start scripts. They create the virtual environment, install dependencies, copy the correct `.env` file, run migrations, and launch the backend.

### Prerequisites

The backend requires **PostgreSQL** and **Redis**. The easiest way is to keep them running via Docker while developing the backend locally:

```bash
docker compose up -d postgres redis
```

> If you prefer running everything natively, install PostgreSQL 15+ and Redis 7+ on your system and update `.env.manual` with the correct connection URLs before copying it.

### 1. Start the backend

**Linux / macOS:**
```bash
./start_backend.sh
```

**Windows (PowerShell):**
```powershell
.\start_backend.ps1
```

What the script does:
1. Checks that `uv` and `python3` / `python` are installed
2. Creates a uv venv inside `backend/` (if it doesn't exist)
3. Installs Python dependencies with `uv pip install -e .`
4. Copies `.env.manual` → `backend/.env` (only if `.env` is missing)
5. **Generates a random `SECRET_KEY` and writes it into `backend/.env`**
6. Runs `alembic upgrade head` for database migrations
7. Starts the FastAPI dev server on port `8000`

### 2. Start vLLM (in a separate terminal)

> **Prerequisite:** You must run `./start_backend.sh` (or `.\start_backend.ps1`) first so the backend venv is created and `vllm` is installed.

**Linux / macOS:**
```bash
./serve_llm.sh
```

**Windows (PowerShell):**
```powershell
.\serve_llm.ps1
```

These scripts automatically activate the backend venv, then read `VLLM_MODEL`, `VLLM_PORT`, `VLLM_MAX_MODEL_LEN`, and `VLLM_TENSOR_PARALLEL` from `.env` (or `.env.docker` as fallback). The defaults are:

| Setting | Default |
|---|---|
| Model | `Qwen/Qwen2.5-1.5B-Instruct` |
| Port | `8001` |
| Max model length | `8192` |
| Tensor parallelism | `1` |

### 3. Start ComfyUI (in a separate terminal)

**Linux / macOS:**
```bash
./start_comfyui.sh
```

**Windows (PowerShell):**
```powershell
.\start_comfyui.ps1
```

The script defaults to `$HOME/comfy/ComfyUI` (Linux/macOS) or `%USERPROFILE%\comfy\ComfyUI` (Windows). If ComfyUI is not found there, it is **automatically cloned from GitHub**. You can override the path by setting the `COMFYUI_PATH` environment variable before running the script:

```bash
export COMFYUI_PATH=/custom/path/to/ComfyUI
./start_comfyui.sh
```

### 4. Start the web frontend (in a separate terminal)

**Linux / macOS:**
```bash
./start_frontend.sh
```

**Windows (PowerShell):**
```powershell
.\start_frontend.ps1
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
| `SECRET_KEY` | — | JWT signing secret (change in production!) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | JWT access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | JWT refresh token lifetime |
| `VLLM_MODEL` | `Qwen/Qwen2.5-1.5B-Instruct` | Model served by vLLM |
| `VLLM_TENSOR_PARALLEL` | `1` | Tensor parallelism for vLLM |
| `VLLM_MAX_MODEL_LEN` | `8192` | Max sequence length for vLLM |

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
└── frontend-web/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── App.tsx
        ├── api/client.ts       # Axios client with interceptors
        ├── contexts/
        │   └── AuthContext.tsx
        └── components/
            ├── Auth/
            ├── Onboarding/
            ├── CharacterCreate/
            ├── Dashboard/
            └── Chat/
```

---

## Scalability Notes

- **Backend**: Stateless (JWT auth, no server sessions). Scale horizontally with multiple replicas behind a load balancer.
- **WebSocket**: Uses Redis pub/sub architecture-ready. For multiple backend replicas, add Redis-backed message broadcasting so any replica can push to connected clients.
- **vLLM**: Scale vertically with `--tensor-parallel-size` and `--pipeline-parallel-size`. Scale horizontally by running multiple vLLM instances behind a load balancer.
- **ComfyUI**: For high throughput, run multiple ComfyUI instances behind a queue worker system (e.g., Celery + Redis).
- **Database**: PostgreSQL can be replaced with a managed service (AWS RDS, Google Cloud SQL, etc.) and read replicas can be added for scaling reads.

---

### Prerequisites for Media Generation to Actually Work

1. **Download a Stable Diffusion checkpoint** into ComfyUI's `models/checkpoints/` directory.  
   Popular sources:
   - [CivitAI](https://civitai.com) (community models, requires free account)
   - [Hugging Face](https://huggingface.co) (official checkpoints like `stabilityai/stable-diffusion-xl-base-1.0`)
   - Direct links from model authors (e.g., `anything-v5.safetensors`)

2. **Place the model in the ComfyUI container**. The Docker Compose volume `comfyui_models` persists models across restarts.

   **Option A — Copy into the running container:**
   ```bash
   # Download a checkpoint (example: Anything V5)
   wget https://example.com/anything-v5.safetensors -O anything-v5.safetensors

   # Copy it into the container
   docker cp anything-v5.safetensors vf_comfyui:/app/ComfyUI/models/checkpoints/
   ```

   **Option B — Mount a local folder (recommended for large collections):**  
   Edit `docker-compose.yml` under the `comfyui` service:
   ```yaml
   volumes:
     - comfyui_models:/app/ComfyUI/models
     - /path/to/your/local_models:/app/ComfyUI/models/checkpoints
   ```
   Then restart:
   ```bash
   docker compose down && docker compose up -d
   ```

> **Note:** The app gracefully handles missing models. If a checkpoint is not installed, the character will politely tell the user it cannot generate that media type yet.

---

## Media Generation Setup

ComfyUI requires you to download model checkpoints into its `models/` directory. The Docker Compose volume `comfyui_models` persists these across restarts.

### Where to place models

With Docker, the easiest way is to copy checkpoints directly into the running container's volume:

```bash
# Example: Download an SDXL checkpoint and place it in ComfyUI
docker cp sdxl_base.safetensors vf_comfyui:/app/ComfyUI/models/checkpoints/
```

Or mount a local models folder by editing `docker-compose.yml`:

```yaml
volumes:
  - comfyui_models:/app/ComfyUI/models
  - /path/to/your/local_models:/app/ComfyUI/models/checkpoints  # optional local mount
```

### Supported media types

| Type | Required Model | Typical Location |
|------|---------------|------------------|
| **Images** | Stable Diffusion checkpoint (e.g., `sdxl_base.safetensors`, `anything-v5.safetensors`) | `models/checkpoints/` |
| **Video** | Video diffusion model (e.g., Wan 2.1, LTX-Video) | `models/checkpoints/` or `models/diffusion_models/` |
| **Audio** | Stable Audio Open or similar | `models/audio/` |

> **Note:** The app gracefully handles missing models. If a checkpoint is not installed, the character will politely tell the user it cannot generate that media type yet.

---

## License

MIT
