# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM python:3.11-slim AS base

WORKDIR /app

# System deps for Pillow / torch
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# CPU-only torch to keep image size manageable (~800 MB vs ~3 GB with CUDA)
RUN pip install --no-cache-dir torch==2.3.1+cpu torchvision==0.18.1+cpu \
        --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# ── Stage 2: app ──────────────────────────────────────────────────────────────
FROM base AS app

COPY model.py inference.py main.py ./
# Mount the 4 weight files at runtime:
#   docker run -v /host/weights:/app/weights kroix-ml:latest
# Expected files: densenet121.pth  googlenet.pth  resnet18.pth  ensemble_weights.json
VOLUME ["/app/weights"]

ENV WEIGHTS_DIR=/app/weights
ENV DEVICE=cpu
ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
