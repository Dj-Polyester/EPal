FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install system dependencies for ComfyScript and asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY pyproject.toml ./

# Create uv venv and install dependencies
RUN uv venv && uv pip install -e .

# Copy application code
COPY app/ ./app/
COPY alembic.ini ./
COPY alembic/ ./alembic/

# Copy start script
COPY start.sh ./
RUN chmod +x start.sh

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["./start.sh"]
