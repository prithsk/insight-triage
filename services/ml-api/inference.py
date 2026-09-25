"""
Inference pipeline for the 3-model ensemble.

Risk score   = tanh-weighted average of the three model probabilities
Grad-CAM     = per-model 14×14 maps averaged → single heatmap
TTA          = 3 augmented passes averaged per model (9 total forward passes)
"""

import io
import base64
import time
import json
from typing import Optional

import numpy as np
import torch
from PIL import Image
from torchvision import transforms

from model import (
    DenseNet121Detector, GoogLeNetDetector, ResNet18Detector,
    EnsembleDetector, load_ensemble,
)

# ── Constants ──────────────────────────────────────────────────────────────────
HEATMAP_GRID       = 14

# Product policy for the CRITICAL band, not a fitted quantity. It is mirrored by
# CRITICAL_THRESHOLD in supabase/functions/infer-cxr/index.ts, which buckets the
# Gemini fallback path; src/claims.test.ts fails if the two drift apart, because
# two paths writing the same `risk_bucket` column with different boundaries is
# not a fallback, it is two different products.
CRITICAL_THRESHOLD = 0.65

# LAST-RESORT default only. The REVIEW floor that actually runs is the
# ensemble's own `optimal_threshold`, loaded from
# services/ml-api/ensemble_weights.json (currently 0.50) by model.load_ensemble.
#
# This constant used to be named REVIEW_THRESHOLD and read as the documented
# band edge while being overridden at every point of use, so the README, the
# edge function's prompt and this module all advertised a REVIEW band of
# 0.35-0.65 that the service never applied. Renamed so that reading it cannot
# mislead: it is the value used only when an ensemble carries no threshold of
# its own, and it matches model.EnsembleDetector's own default.
FALLBACK_REVIEW_THRESHOLD = 0.35

# Guard against decompression-bomb images (e.g. a crafted PNG that expands to
# billions of pixels) before any decode work happens.
Image.MAX_IMAGE_PIXELS = 64_000_000  # ~8000x8000, well above any real CXR export

PREPROCESS = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

TTA_TRANSFORMS = [
    PREPROCESS,
    transforms.Compose([
        transforms.Resize(256), transforms.CenterCrop(224),
        transforms.RandomHorizontalFlip(p=1.0),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ]),
    transforms.Compose([
        transforms.Resize(256), transforms.CenterCrop(224),
        transforms.RandomRotation(degrees=(5, 5)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ]),
]


# ── Grad-CAM ──────────────────────────────────────────────────────────────────

class GradCAM:
    def __init__(self, model: torch.nn.Module):
        self.model       = model
        self._activations: Optional[torch.Tensor] = None
        self._gradients:   Optional[torch.Tensor] = None

        target = model.get_gradcam_layer()
        self._fwd = target.register_forward_hook(self._save_act)
        self._bwd = target.register_full_backward_hook(self._save_grad)

    def _save_act(self, _, __, out):
        self._activations = out.detach()

    def _save_grad(self, _, __, grad_out):
        self._gradients = grad_out[0].detach()

    def __call__(self, tensor: torch.Tensor) -> np.ndarray:
        self.model.zero_grad()
        logit = self.model(tensor)
        logit.backward()

        weights = self._gradients.mean(dim=(2, 3), keepdim=True)
        cam     = (weights * self._activations).sum(dim=1)
        cam     = torch.relu(cam[0]).cpu().numpy()

        cam_max = cam.max()
        if cam_max > 0:
            cam = cam / cam_max
        return cam

    def remove(self):
        self._fwd.remove()
        self._bwd.remove()


def review_threshold_of(ensemble: EnsembleDetector) -> float:
    """
    The REVIEW floor this ensemble actually applies.

    One accessor, called once per request, so bucketing and `confidence` cannot
    end up measured against different boundaries — which is exactly what
    happened: the bucket used the ensemble's `optimal_threshold` while
    `confidence` used the module constant, so a score sitting precisely on the
    real decision boundary could be reported as highly confident.
    """
    return float(getattr(ensemble, "optimal_threshold", FALLBACK_REVIEW_THRESHOLD))


def _cam_to_grid(cam: np.ndarray, grid: int = HEATMAP_GRID) -> list:
    pil = Image.fromarray((cam * 255).astype(np.uint8))
    pil = pil.resize((grid, grid), Image.BILINEAR)
    return (np.array(pil, dtype=np.float32) / 255.0).tolist()


# ── Main inference ─────────────────────────────────────────────────────────────

def predict(
    image_bytes: bytes,
    ensemble: EnsembleDetector,
    device: str = "cpu",
    use_tta: bool = True,
) -> dict:
    """
    Returns:
      risk_score   : float [0,1]   — ensemble pneumonia probability
      risk_bucket  : str           — CRITICAL | REVIEW | CLEAR
      confidence   : float [0,1]
      roi_heatmap  : str           — base64 JSON Grad-CAM grid (14×14)
      model_version: str
      inference_ms : int
    """
    t0  = time.time()
    pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    aug_list    = TTA_TRANSFORMS if use_tta else [PREPROCESS]
    model_probs: list[list[float]] = []   # [model_idx][tta_idx]

    # ── TTA per base model ────────────────────────────────────────────────────
    for base_model in ensemble.models:
        base_model.eval()
        aug_probs = []
        with torch.no_grad():
            for tfm in aug_list:
                t   = tfm(pil).unsqueeze(0).to(device)
                aug_probs.append(torch.sigmoid(base_model(t)).item())
        model_probs.append(aug_probs)

    # Per-model average over TTA augmentations
    per_model_mean = [float(np.mean(p)) for p in model_probs]

    # Tanh-weighted ensemble
    weights     = ensemble.weights
    total_w     = sum(weights)
    risk_score  = float(sum(p * w for p, w in zip(per_model_mean, weights)) / total_w)

    # ── Grad-CAM: one map per model, then average ─────────────────────────────
    #
    # THE MODELS STAY IN eval(). This loop used to call `base_model.train()`
    # with the comment "enable grad tracking", which is not what train() does —
    # it does not touch autograd at all. What builds the graph is being outside
    # `torch.no_grad()` (the TTA block above has exited) plus an input that
    # requires grad, which is the `canonical.requires_grad_(True)` below.
    #
    # What train() did do, on all three backbones, was:
    #
    #   * switch every BatchNorm layer to batch statistics computed from a batch
    #     of ONE image — a different function from the one that produced
    #     `risk_score` moments earlier, so the heatmap explained a score the
    #     service never reported; and
    #   * update each BatchNorm's running_mean / running_var in place (that is
    #     what training mode does on a forward pass). Those buffers persist for
    #     the lifetime of the process, so every Grad-CAM pass permanently
    #     nudged the model toward one patient's image and the scores drifted
    #     across subsequent requests; and
    #   * re-enable Dropout(p=0.3) in the classifier heads, making the
    #     backward pass — and therefore the map — non-deterministic run to run.
    #
    # Gradients w.r.t. the target layer's activations are all Grad-CAM needs,
    # and eval() does not prevent them.
    canonical = PREPROCESS(pil).unsqueeze(0).to(device)
    canonical.requires_grad_(True)
    cams      = []
    for base_model in ensemble.models:
        base_model.eval()
        cam_engine = GradCAM(base_model)
        cams.append(cam_engine(canonical))
        cam_engine.remove()

    # Resize all maps to the same shape before averaging
    target_h, target_w = cams[0].shape
    resized = []
    for c in cams:
        if c.shape != (target_h, target_w):
            pil_c   = Image.fromarray((c * 255).astype(np.uint8))
            pil_c   = pil_c.resize((target_w, target_h), Image.BILINEAR)
            c       = np.array(pil_c, dtype=np.float32) / 255.0
        resized.append(c)

    avg_cam = np.mean(resized, axis=0)
    cam_max = avg_cam.max()
    if cam_max > 0:
        avg_cam = avg_cam / cam_max

    heatmap = _cam_to_grid(avg_cam)

    # ── Risk bucket ───────────────────────────────────────────────────────────
    review_thresh = review_threshold_of(ensemble)
    if risk_score >= CRITICAL_THRESHOLD:
        risk_bucket = "CRITICAL"
    elif risk_score >= review_thresh:
        risk_bucket = "REVIEW"
    else:
        risk_bucket = "CLEAR"

    # `confidence` IS NOT A MEASURED OR CALIBRATED QUANTITY.
    #
    # It is a deterministic, monotone transform of how far the score sits from
    # the nearest decision boundary and from the ends of the range. It carries
    # no information `risk_score` does not already carry, it is not a
    # probability, and it is not the model's certainty about this image. Nothing
    # here was fitted against held-out outcomes, so it cannot be.
    #
    # The distance is taken against `review_thresh` — the boundary the bucket
    # above actually used. It previously used the module constant while the
    # bucketing used the ensemble's own threshold, so with the shipped artifact
    # (0.50 vs 0.35) a score of exactly 0.50 — sitting precisely on the real
    # decision boundary, the least decidable point there is — was reported at
    # 0.82 confidence.
    #
    # It reaches a radiologist labelled "Confidence: NN%". That label claims
    # more than this number supports; see CLAUDE.md.
    dist = min(
        abs(risk_score - CRITICAL_THRESHOLD),
        abs(risk_score - review_thresh),
        risk_score,
        1.0 - risk_score,
    )
    confidence = min(0.99, 0.70 + dist * 0.80)

    # ── Serialise heatmap ─────────────────────────────────────────────────────
    heatmap_payload = {
        "type":    "gradcam",
        "grid":    heatmap,
        "shape":   [HEATMAP_GRID, HEATMAP_GRID],
        "version": "ensemble-densenet121-googlenet-resnet18-v1",
    }
    roi_heatmap_b64 = base64.b64encode(
        json.dumps(heatmap_payload).encode()
    ).decode()

    return {
        "risk_score":    round(risk_score, 4),
        "risk_bucket":   risk_bucket,
        "confidence":    round(confidence, 4),
        "roi_heatmap":   roi_heatmap_b64,
        "model_version": "ensemble-densenet121-googlenet-resnet18-v1.0",
        "inference_ms":  int((time.time() - t0) * 1000),
    }


def predict_from_base64(b64: str, ensemble: EnsembleDetector, **kwargs) -> dict:
    return predict(base64.b64decode(b64), ensemble, **kwargs)
