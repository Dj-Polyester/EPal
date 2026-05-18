import httpx
from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager

from app.db import engine, Base
from app.routers import auth, users, characters, chats
from app.websocket.chat_ws import chat_websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="EPal API",
    description="Backend for EPal - create and chat with AI characters",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(characters.router)
app.include_router(chats.router)


@app.websocket("/ws/chat/{chat_id}")
async def websocket_chat(websocket: WebSocket, chat_id: str, token: str = ""):
    await chat_websocket(websocket, chat_id, token)


@app.get("/media/proxy")
async def media_proxy(request: Request):
    """Proxy image requests to ComfyUI so the frontend can load them same-origin."""
    url = request.query_params.get("url")
    if not url:
        return {"error": "Missing url parameter"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        return StreamingResponse(
            content=resp.aiter_bytes(),
            status_code=resp.status_code,
            headers={"Content-Type": resp.headers.get("Content-Type", "image/png")},
        )


@app.get("/health")
async def health_check():
    return {"status": "ok"}
