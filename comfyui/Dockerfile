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

# Clone ComfyUI
RUN git clone https://github.com/comfyanonymous/ComfyUI.git /app/ComfyUI
WORKDIR /app/ComfyUI

# Install ComfyUI dependencies with uv into the system Python
RUN uv pip install --system -r requirements.txt

# Install ComfyScript as a custom node for workflow execution support
RUN mkdir -p custom_nodes && \
    git clone https://github.com/Chaoses-Ib/ComfyScript.git custom_nodes/ComfyScript && \
    cd custom_nodes/ComfyScript && \
    uv pip install --system -e ".[default]"

# Create model directories
RUN mkdir -p models/checkpoints models/vae models/loras models/embeddings models/controlnet models/clip models/clip_vision

ENV PYTHONPATH=/app/ComfyUI

EXPOSE 8188

CMD ["python", "main.py", "--listen", "0.0.0.0", "--port", "8188"]
