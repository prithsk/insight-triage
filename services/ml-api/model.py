"""
Ensemble Pneumonia Detector
Three base learners combined via tanh-weighted average (patented approach).

Architecture:
  - DenseNet121  → pretrained ImageNet → custom head
  - GoogLeNet    → pretrained ImageNet → custom head
  - ResNet18     → pretrained ImageNet → custom head

Ensemble:
  weight_i = sum(tanh(metric) for metric in [precision, recall, f1, auc])
  p_ensemble = (w0*p0 + w1*p1 + w2*p2) / (w0 + w1 + w2)

Grad-CAM target layers:
  DenseNet121 → features.denseblock4
  GoogLeNet   → inception5b
  ResNet18    → layer4
"""

import torch
import torch.nn as nn
from torchvision import models


# ── Base learners ──────────────────────────────────────────────────────────────

class DenseNet121Detector(nn.Module):
    def __init__(self, pretrained: bool = True, dropout: float = 0.3):
        super().__init__()
        weights = models.DenseNet121_Weights.IMAGENET1K_V1 if pretrained else None
        base = models.densenet121(weights=weights)
        self.features    = base.features            # output (B, 1024, H, W)
        self.relu        = nn.ReLU(inplace=True)
        self.avgpool     = nn.AdaptiveAvgPool2d((1, 1))
        self.classifier  = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(1024, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = self.relu(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        return self.classifier(x).squeeze(-1)

    def get_gradcam_layer(self):
        return self.features.denseblock4


class GoogLeNetDetector(nn.Module):
    def __init__(self, pretrained: bool = True, dropout: float = 0.3):
        super().__init__()
        weights = models.GoogLeNet_Weights.IMAGENET1K_V1 if pretrained else None
        if pretrained:
            base = models.googlenet(weights=weights)
            base.aux_logits = False
        else:
            base = models.googlenet(weights=None, aux_logits=False)
        self.pre    = nn.Sequential(
            base.conv1, base.maxpool1,
            base.conv2, base.conv3, base.maxpool2,
            base.inception3a, base.inception3b, base.maxpool3,
            base.inception4a, base.inception4b, base.inception4c,
            base.inception4d, base.inception4e, base.maxpool4,
            base.inception5a,
        )
        self.inception5b = base.inception5b
        self.avgpool     = base.avgpool
        self.dropout     = nn.Dropout(p=dropout)
        self.fc          = nn.Linear(1024, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.pre(x)
        x = self.inception5b(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.dropout(x)
        return self.fc(x).squeeze(-1)

    def get_gradcam_layer(self):
        return self.inception5b


class ResNet18Detector(nn.Module):
    def __init__(self, pretrained: bool = True, dropout: float = 0.3):
        super().__init__()
        weights = models.ResNet18_Weights.IMAGENET1K_V1 if pretrained else None
        base = models.resnet18(weights=weights)
        self.backbone   = nn.Sequential(
            base.conv1, base.bn1, base.relu, base.maxpool,
            base.layer1, base.layer2, base.layer3,
        )
        self.layer4     = base.layer4
        self.avgpool    = base.avgpool
        self.classifier = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(512, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.backbone(x)
        x = self.layer4(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        return self.classifier(x).squeeze(-1)

    def get_gradcam_layer(self):
        return self.layer4


# ── Ensemble wrapper ───────────────────────────────────────────────────────────

class EnsembleDetector:
    """
    Runtime ensemble of the three trained base learners.
    Weights are computed from validation metrics using the patented
    tanh-sum formula and stored in weights.json alongside the .pth files.
    """

    def __init__(
        self,
        densenet: DenseNet121Detector,
        googlenet: GoogLeNetDetector,
        resnet: ResNet18Detector,
        weights: list[float] | None = None,
        optimal_threshold: float = 0.35,
    ):
        self.models            = [densenet, googlenet, resnet]
        self.weights           = weights if weights is not None else [1.0, 1.0, 1.0]
        self.optimal_threshold = optimal_threshold

    def eval(self):
        for m in self.models:
            m.eval()
        return self

    def to(self, device):
        for m in self.models:
            m.to(device)
        return self

    def parameters(self):
        """Yield parameters from all three models (used for device detection)."""
        for m in self.models:
            yield from m.parameters()

    def __call__(self, tensor: torch.Tensor) -> torch.Tensor:
        """Return weighted-average sigmoid probability (scalar per sample)."""
        probs = []
        with torch.no_grad():
            for m, w in zip(self.models, self.weights):
                p = torch.sigmoid(m(tensor))
                probs.append(p * w)
        total_weight = sum(self.weights)
        return sum(probs) / total_weight


# ── Persistence helpers ────────────────────────────────────────────────────────

def load_base_models(weights_dir: str, device: str = "cpu") -> tuple:
    """Load all three .pth files from weights_dir."""
    import os
    densenet  = DenseNet121Detector(pretrained=False)
    googlenet = GoogLeNetDetector(pretrained=False)
    resnet    = ResNet18Detector(pretrained=False)

    for model, name in [
        (densenet,  "densenet121.pth"),
        (googlenet, "googlenet.pth"),
        (resnet,    "resnet18.pth"),
    ]:
        path = os.path.join(weights_dir, name)
        model.load_state_dict(torch.load(path, map_location=device))
        model.eval()
        model.to(device)

    return densenet, googlenet, resnet


def load_ensemble(weights_dir: str, device: str = "cpu") -> EnsembleDetector:
    """Load all models + ensemble weights from weights_dir."""
    import os, json
    densenet, googlenet, resnet = load_base_models(weights_dir, device)
    weights_path      = os.path.join(weights_dir, "ensemble_weights.json")
    weights           = [1.0, 1.0, 1.0]
    optimal_threshold = 0.35
    if os.path.exists(weights_path):
        with open(weights_path) as f:
            cfg               = json.load(f)
            weights           = cfg["weights"]
            optimal_threshold = cfg.get("optimal_threshold", 0.35)
    return EnsembleDetector(densenet, googlenet, resnet, weights=weights,
                            optimal_threshold=optimal_threshold)
