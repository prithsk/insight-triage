"""
FastAPI service — 3-model ensemble pneumonia inference.

Endpoints:
  POST /predict   — base64 image → risk_score, bucket, Grad-CAM heatmap
  GET  /health    — liveness probe
  GET  /model-info

Environment variables:
  WEIGHTS_DIR   — directory containing densenet121.pth, googlenet.pth,
                  resnet18.pth, ensemble_weights.json (default: weights/)
  DEVICE        — "cuda" | "cpu" (auto-detected)
  HOST / PORT   — bind address / port (defaults: 0.0.0.0 / 8000)
  API_KEY       — bearer token for /predict (optional)
"""

import os
import hmac
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import torch

from model import load_ensemble, EnsembleDetector
from inference import predict_from_base64, CRITICAL_THRESHOLD, REVIEW_THRESHOLD

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

WEIGHTS_DIR   = os.getenv("WEIGHTS_DIR", "weights")
DEVICE        = os.getenv("DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
API_KEY       = os.getenv("API_KEY", "")
MODEL_VERSION = "ensemble-densenet121-googlenet-resnet18-v1.0"

_ensemble: EnsembleDetector | None = None


def _warmup():
    dummy = torch.zeros(1, 3, 224, 224, device=DEVICE)
    with torch.no_grad():
        for m in _ensemble.models:
            m(dummy)
    log.info("Warmup complete — models ready")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _ensemble
    log.info(f"Loading ensemble from {WEIGHTS_DIR} on {DEVICE}")
    try:
        _ensemble = load_ensemble(WEIGHTS_DIR, device=DEVICE)
        log.info("Ensemble loaded successfully")
        # Warmup runs in the background so it doesn't block startup / the
        # platform healthcheck — first real request just eats the latency
        # instead of blocking container readiness for several minutes.
        import threading
        threading.Thread(target=_warmup, daemon=True).start()
    except (FileNotFoundError, RuntimeError) as e:
        log.warning(f"Weights not found ({e}) — /predict will return 503")
    yield
    _ensemble = None


app = FastAPI(
    title="Kroix ML Inference API",
    description="DenseNet121 + GoogLeNet + ResNet18 ensemble pneumonia detection",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

bearer = HTTPBearer(auto_error=False)


def verify_api_key(creds: HTTPAuthorizationCredentials | None = Security(bearer)):
    # Fail CLOSED: if API_KEY isn't configured, refuse every request rather
    # than silently accepting all of them. A misconfigured deployment should
    # be unusable, not unauthenticated.
    if not API_KEY:
        raise HTTPException(status_code=503, detail="API_KEY not configured on server")
    if creds is None or not hmac.compare_digest(creds.credentials, API_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


MAX_IMAGE_B64_CHARS = 15_000_000  # ~11MB decoded, well above any real CXR export


class PredictRequest(BaseModel):
    image_b64: str  = Field(..., max_length=MAX_IMAGE_B64_CHARS, description="Base64-encoded image bytes")
    use_tta:   bool = Field(True,  description="Enable 3-pass test-time augmentation")


class PredictResponse(BaseModel):
    risk_score:    float
    risk_bucket:   str
    confidence:    float
    roi_heatmap:   str
    model_version: str
    inference_ms:  int


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_VERSION, "device": DEVICE, "ready": _ensemble is not None}


@app.get("/model-info")
def model_info():
    return {
        "model_version":      MODEL_VERSION,
        "models":             ["densenet121", "googlenet", "resnet18"],
        "critical_threshold": CRITICAL_THRESHOLD,
        "review_threshold":   REVIEW_THRESHOLD,
        "input_size":         224,
        "tta_passes":         3,
    }


@app.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest, _: None = Depends(verify_api_key)):
    if _ensemble is None:
        raise HTTPException(status_code=503, detail=f"Weights not loaded from {WEIGHTS_DIR}")
    try:
        result = predict_from_base64(body.image_b64, _ensemble, device=DEVICE, use_tta=body.use_tta)
    except Exception as exc:
        log.exception("Inference failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    log.info(f"predict | {result['risk_bucket']} score={result['risk_score']} ms={result['inference_ms']}")
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", "8000")))
