FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    wget \
    curl \
    libgl1-mesa-glx \
    libglib2.0-0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install uv standalone binary
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Download and install a modern Python 3.11 manually (bypassing uv's "managed" check)
RUN wget -qO /tmp/python.tar.gz \
    "https://github.com/indygreg/python-build-standalone/releases/download/20241016/cpython-3.11.10+20241016-x86_64-unknown-linux-gnu-install_only.tar.gz" && \
    tar -xzf /tmp/python.tar.gz -C /usr/local --strip-components=0 && \
    rm /tmp/python.tar.gz && \
    ln -sf /usr/local/python/bin/python3.11 /usr/local/bin/python3.11 && \
    ln -sf /usr/local/python/bin/python3.11 /usr/local/bin/python3 && \
    ln -sf /usr/local/python/bin/python3.11 /usr/local/bin/python && \
    ln -sf /usr/local/python/bin/pip3 /usr/local/bin/pip3 && \
    ln -sf /usr/local/python/bin/pip3 /usr/local/bin/pip

# ComfyUI is mounted from the host at runtime.
# The startup script installs requirements from the mounted ComfyUI.

ENV PYTHONPATH=/app/ComfyUI
ENV COMFYUI_PATH=/app/ComfyUI

# Create model directories as fallbacks (host mount will overlay these)
RUN mkdir -p /app/ComfyUI/models/checkpoints /app/ComfyUI/models/vae \
    /app/ComfyUI/models/loras /app/ComfyUI/models/embeddings \
    /app/ComfyUI/models/controlnet /app/ComfyUI/models/clip \
    /app/ComfyUI/models/clip_vision /app/ComfyUI/output \
    /app/ComfyUI/input /app/ComfyUI/workflows

# Copy startup script
COPY start-docker.sh /app/start-docker.sh
RUN chmod +x /app/start-docker.sh

EXPOSE 8188

CMD ["/app/start-docker.sh"]
