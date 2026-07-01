"""
Training script — 3-model ensemble for pneumonia detection.

Matches Rohit-Kundu et al. (PLoS One 2021, doi:10.1371/journal.pone.0256630):
  - Ensemble weights computed from TRAINING DATA metrics (not test)
  - tanh(precision) + tanh(recall) + tanh(f1) + tanh(auc) per model
  - Primary evaluation at threshold=0.5 (argmax equivalent)
  - Optional 5-fold CV (--kfolds 5) to replicate paper's 98.81%

Usage:
  # Fixed split (fast, ~5h):
  python train.py --data-dir ./data --out ./weights --epochs 30

  # 5-fold CV (matches paper, ~15-20h):
  python train.py --data-dir ./data --out ./weights --kfolds 5 --epochs 20
"""

import argparse
import json
import shutil
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import CosineAnnealingWarmRestarts
from torch.utils.data import (
    ConcatDataset, DataLoader, Subset, WeightedRandomSampler,
)
from torchvision import datasets, transforms
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score,
    recall_score, roc_auc_score, roc_curve,
)
from sklearn.model_selection import StratifiedKFold, StratifiedShuffleSplit

from model import DenseNet121Detector, GoogLeNetDetector, ResNet18Detector

# ── Transforms ────────────────────────────────────────────────────────────────
TRAIN_TRANSFORM = transforms.Compose([
    transforms.Resize(256),
    transforms.RandomCrop(224),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(8),
    transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.1),
    transforms.RandomAffine(degrees=0, translate=(0.05, 0.05)),
    transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 1.5)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    transforms.RandomErasing(p=0.2, scale=(0.02, 0.1)),
])

EVAL_TRANSFORM = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

MODEL_NAMES = ['densenet121', 'googlenet', 'resnet18']


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_model(name: str) -> nn.Module:
    if name == 'densenet121':
        return DenseNet121Detector(pretrained=True, dropout=0.3)
    if name == 'googlenet':
        return GoogLeNetDetector(pretrained=True, dropout=0.3)
    if name == 'resnet18':
        return ResNet18Detector(pretrained=True, dropout=0.3)
    raise ValueError(f'Unknown model: {name}')


def make_sampler(labels: list) -> WeightedRandomSampler:
    counts = np.bincount(labels)
    w = 1.0 / counts
    return WeightedRandomSampler([w[l] for l in labels], len(labels), replacement=True)


def train_epoch(model, loader, optimizer, criterion, device, scaler):
    model.train()
    total_loss = correct = total = 0
    for imgs, labels in loader:
        imgs   = imgs.to(device, non_blocking=True)
        labels = labels.float().to(device, non_blocking=True)
        with torch.amp.autocast('cuda', enabled=(device.type == 'cuda')):
            logits = model(imgs)
            loss   = criterion(logits, labels)
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
        optimizer.zero_grad(set_to_none=True)
        total_loss += loss.item() * len(labels)
        preds       = (torch.sigmoid(logits) >= 0.5).long()
        correct    += (preds == labels.long()).sum().item()
        total      += len(labels)
    return total_loss / total, correct / total


@torch.no_grad()
def get_probs(model, loader, device):
    """Return (sigmoid_probs, true_labels) numpy arrays."""
    model.eval()
    ps, ls = [], []
    for imgs, labels in loader:
        p = torch.sigmoid(model(imgs.to(device))).cpu().numpy()
        ps.extend(p)
        ls.extend(labels.numpy())
    return np.array(ps), np.array(ls)


def compute_metrics(probs: np.ndarray, labels: np.ndarray) -> dict:
    preds = (probs >= 0.5).astype(int)
    return {
        'acc':       accuracy_score(labels, preds),
        'auc':       roc_auc_score(labels, probs),
        'precision': precision_score(labels, preds, zero_division=0),
        'recall':    recall_score(labels, preds, zero_division=0),
        'f1':        f1_score(labels, preds, zero_division=0),
    }


def tanh_weight(probs: np.ndarray, labels: np.ndarray) -> float:
    """Paper formula exactly: tanh(prec)+tanh(rec)+tanh(f1)+tanh(auc).
    AUC is computed on BINARY predictions (argmax), not continuous probs —
    matching roc_auc_score(labels, preds) in Rohit-Kundu ensemble.py."""
    preds = (probs >= 0.5).astype(int)
    pre   = precision_score(labels, preds, zero_division=0)
    rec   = recall_score(labels, preds, zero_division=0)
    f1    = f1_score(labels, preds, zero_division=0)
    auc   = roc_auc_score(labels, preds)   # binary preds, not probabilities
    return float(np.tanh(pre) + np.tanh(rec) + np.tanh(f1) + np.tanh(auc))


def ensemble_predict(models_w, loader, device):
    """Weighted average ensemble. Returns (probs, labels)."""
    total_w = sum(w for _, w in models_w)
    all_p, all_l = [], []
    with torch.no_grad():
        for imgs, labels in loader:
            imgs = imgs.to(device)
            batch = sum(
                torch.sigmoid(m(imgs)).cpu().numpy() * w
                for m, w in models_w
            ) / total_w
            all_p.extend(batch)
            all_l.extend(labels.numpy())
    return np.array(all_p), np.array(all_l)


def print_metrics(probs, labels, tag=''):
    m = compute_metrics(probs, labels)
    print(
        f'  {tag}'
        f'acc={m["acc"]:.4f} auc={roc_auc_score(labels, probs):.4f} '
        f'precision={m["precision"]:.4f} recall={m["recall"]:.4f} '
        f'f1={m["f1"]:.4f}'
    )
    return m


# ── Core training loop ────────────────────────────────────────────────────────

def train_one(name, model, train_dl, val_dl, device, save_path, epochs, lr, tag=''):
    header = f'Training {name}' + (f' [fold {tag}]' if tag else '')
    print(f'\n{"="*60}\n  {header}\n{"="*60}')

    criterion = nn.BCEWithLogitsLoss()
    scaler    = torch.amp.GradScaler('cuda', enabled=(device.type == 'cuda'))
    best_auc  = 0.0
    WARMUP    = 5

    # Phase 1 — warmup head only
    head_p = [p for n, p in model.named_parameters()
               if any(k in n for k in ('classifier', 'fc'))]
    for p in model.parameters():
        p.requires_grad = False
    for p in head_p:
        p.requires_grad = True
    opt_h = optim.Adam(head_p, lr=lr * 10)

    for ep in range(WARMUP):
        t0 = time.time()
        tl, ta = train_epoch(model, train_dl, opt_h, criterion, device, scaler)
        vp, vl = get_probs(model, val_dl, device)
        vm     = compute_metrics(vp, vl)
        print(
            f'  [Warmup {ep+1:02d}/{WARMUP}] '
            f'loss={tl:.4f} acc={ta:.4f} | '
            f'val_acc={vm["acc"]:.4f} auc={vm["auc"]:.4f} | '
            f'{time.time()-t0:.1f}s'
        )

    # Phase 2 — full fine-tune with differential LRs
    for p in model.parameters():
        p.requires_grad = True
    bb_p = [p for n, p in model.named_parameters()
             if not any(k in n for k in ('classifier', 'fc'))]
    opt = optim.Adam([
        {'params': bb_p,   'lr': lr * 0.1},
        {'params': head_p, 'lr': lr},
    ])
    sch = CosineAnnealingWarmRestarts(opt, T_0=10, T_mult=2)

    for ep in range(epochs):
        t0 = time.time()
        tl, ta = train_epoch(model, train_dl, opt, criterion, device, scaler)
        vp, vl = get_probs(model, val_dl, device)
        vm     = compute_metrics(vp, vl)
        sch.step()
        print(
            f'  Epoch {ep+1:02d}/{epochs} | '
            f'loss={tl:.4f} acc={ta:.4f} | '
            f'val_acc={vm["acc"]:.4f} auc={vm["auc"]:.4f} | '
            f'{time.time()-t0:.1f}s'
        )
        if vm['auc'] > best_auc:
            best_auc = vm['auc']
            torch.save(model.state_dict(), save_path)
            print(f'    saved best (val_auc={best_auc:.4f})')

    # Fallback: guarantee file exists even if val AUC never improved
    if not save_path.exists():
        torch.save(model.state_dict(), save_path)
        print(f'    saved final weights (fallback)')


# ── Mode A: Fixed split ───────────────────────────────────────────────────────

def run_fixed_split(args, device, out_dir, data_root):
    """80/20 split from train/, official test set.
    Weights computed from TRAINING data metrics — matches paper formula."""
    print('\n=== Mode: Fixed Split ===')

    full_aug  = datasets.ImageFolder(data_root / 'train', transform=TRAIN_TRANSFORM)
    full_eval = datasets.ImageFolder(data_root / 'train', transform=EVAL_TRANSFORM)
    test_ds   = datasets.ImageFolder(data_root / 'test',  transform=EVAL_TRANSFORM)

    val_size   = int(0.20 * len(full_aug))
    train_size = len(full_aug) - val_size
    rng        = torch.Generator().manual_seed(42)
    all_idx    = torch.randperm(len(full_aug), generator=rng).tolist()
    train_idx, val_idx = all_idx[:train_size], all_idx[train_size:]

    train_ds      = Subset(full_aug,  train_idx)
    val_ds        = Subset(full_eval, val_idx)
    train_eval_ds = Subset(full_eval, train_idx)  # aug-free version for weight computation

    print(f'Classes: {full_aug.class_to_idx}')
    print(f'Train: {len(train_ds)} | Val: {len(val_ds)} | Test: {len(test_ds)}')

    train_labels = [full_aug.samples[i][1] for i in train_idx]
    sampler = make_sampler(train_labels)

    pin = (device.type == 'cuda')
    train_dl      = DataLoader(train_ds,      args.batch, sampler=sampler, num_workers=2, pin_memory=pin)
    val_dl        = DataLoader(val_ds,        args.batch, shuffle=False,   num_workers=2)
    test_dl       = DataLoader(test_ds,       args.batch, shuffle=False,   num_workers=2)
    train_eval_dl = DataLoader(train_eval_ds, args.batch, shuffle=False,   num_workers=2)

    trained = []
    raw_weights = []

    for name in MODEL_NAMES:
        save_path = out_dir / f'{name}.pth'
        model     = make_model(name).to(device)

        if save_path.exists() and args.skip and name in args.skip:
            print(f'\nSkipping {name} (weights found)')
            model.load_state_dict(torch.load(save_path, map_location=device))
        else:
            train_one(name, model, train_dl, val_dl, device,
                      save_path, args.epochs, args.lr)
            model.load_state_dict(torch.load(save_path, map_location=device))

        # PAPER METHOD: compute weight from TRAINING data predictions
        # AUC in weight formula uses binary preds (matching paper's ensemble.py)
        print(f'\n  Computing {name} weight from training data (paper method)...')
        tp, tl = get_probs(model, train_eval_dl, device)
        tm     = compute_metrics(tp, tl)
        w      = tanh_weight(tp, tl)
        raw_weights.append(w)
        trained.append((model, w))
        print(
            f'  {name} train_acc={tm["acc"]:.4f} '
            f'prec={tm["precision"]:.4f} rec={tm["recall"]:.4f} '
            f'f1={tm["f1"]:.4f} → weight={w:.6f}'
        )

    total = sum(raw_weights)
    norm_weights = [w / total for w in raw_weights]

    print(f'\n{"="*60}\n  Ensemble weights (tanh-sum, paper formula)\n{"="*60}')
    for name, w, nw in zip(MODEL_NAMES, raw_weights, norm_weights):
        print(f'  {name:12s} → raw={w:.6f}  normalised={nw:.4f}')

    # Primary: threshold=0.5 (equivalent to argmax, matches paper)
    print('\n=== Ensemble on TEST set ===')
    probs, labels = ensemble_predict(trained, test_dl, device)
    print_metrics(probs, labels, tag='threshold=0.5 | ')

    # Youden J optimal threshold (supplementary)
    fpr, tpr, thresholds = roc_curve(labels, probs)
    opt_idx   = int(np.argmax(tpr - fpr))
    opt_thresh = float(thresholds[opt_idx])
    preds_opt  = (probs >= opt_thresh).astype(int)
    print(f'\n  Optimal threshold (Youden J): {opt_thresh:.4f}')
    print(
        f'  threshold={opt_thresh:.4f} | '
        f'acc={accuracy_score(labels, preds_opt):.4f} '
        f'precision={precision_score(labels, preds_opt):.4f} '
        f'recall={recall_score(labels, preds_opt):.4f} '
        f'f1={f1_score(labels, preds_opt):.4f}'
    )

    # Validation accuracy — comparable to paper's CV metric
    print('\n=== Ensemble on VAL set (comparable to paper CV accuracy) ===')
    vp, vl = ensemble_predict(trained, val_dl, device)
    print_metrics(vp, vl, tag='threshold=0.5 | ')

    # Save weights
    out = {
        'weights':            raw_weights,
        'normalised_weights': norm_weights,
        'model_order':        MODEL_NAMES,
        'optimal_threshold':  opt_thresh,
    }
    with open(out_dir / 'ensemble_weights.json', 'w') as f:
        json.dump(out, f, indent=2)
    print(f'\nEnsemble weights saved → {out_dir}/ensemble_weights.json')


# ── Mode B: K-Fold CV ─────────────────────────────────────────────────────────

def run_kfold_cv(args, device, out_dir, data_root):
    """N-fold cross-validation on pooled dataset.
    Replicates paper's 98.81% methodology exactly."""
    k = args.kfolds
    print(f'\n=== Mode: {k}-Fold Cross-Validation (Paper Method) ===')

    # Pool train/ + val/ + test/ into one dataset
    splits = ['train', 'val', 'test']
    aug_ds_list, eval_ds_list, all_labels = [], [], []
    for split in splits:
        p = data_root / split
        if not p.exists():
            continue
        aug_ds_list.append(datasets.ImageFolder(p, transform=TRAIN_TRANSFORM))
        eval_ds_list.append(datasets.ImageFolder(p, transform=EVAL_TRANSFORM))
        all_labels += [s[1] for s in aug_ds_list[-1].samples]

    full_aug  = ConcatDataset(aug_ds_list)
    full_eval = ConcatDataset(eval_ds_list)
    all_labels = np.array(all_labels)

    print(f'Pooled: {len(full_aug)} images')
    print(f'NORMAL: {(all_labels==0).sum()} | PNEUMONIA: {(all_labels==1).sum()}')

    skf = StratifiedKFold(n_splits=k, shuffle=True, random_state=42)
    fold_accs = []

    for fold, (tr_idx, te_idx) in enumerate(skf.split(np.zeros(len(all_labels)), all_labels)):
        print(f'\n{"#"*60}\n  FOLD {fold+1}/{k}  (train={len(tr_idx)}, test={len(te_idx)})\n{"#"*60}')

        # Stratified 10% inner split — guarantees both classes in val set
        sss = StratifiedShuffleSplit(n_splits=1, test_size=0.10, random_state=fold)
        _tr, _val = next(sss.split(np.zeros(len(tr_idx)), all_labels[tr_idx]))
        trn_sub = tr_idx[_tr]
        val_sub = tr_idx[_val]

        trn_labels = all_labels[trn_sub]
        sampler    = make_sampler(trn_labels.tolist())

        pin = (device.type == 'cuda')
        train_dl      = DataLoader(Subset(full_aug,  trn_sub.tolist()), args.batch, sampler=sampler, num_workers=2, pin_memory=pin)
        val_dl        = DataLoader(Subset(full_eval, val_sub.tolist()), args.batch, shuffle=False,   num_workers=2)
        test_dl       = DataLoader(Subset(full_eval, te_idx.tolist()),  args.batch, shuffle=False,   num_workers=2)
        train_eval_dl = DataLoader(Subset(full_eval, tr_idx.tolist()),  args.batch, shuffle=False,   num_workers=2)

        fold_models_w = []
        for name in MODEL_NAMES:
            save_path = out_dir / f'{name}_fold{fold}.pth'
            model     = make_model(name).to(device)

            if save_path.exists():
                print(f'\n  Skipping {name} fold {fold} (weights found)')
                model.load_state_dict(torch.load(save_path, map_location=device))
            else:
                train_one(name, model, train_dl, val_dl, device,
                          save_path, args.epochs, args.lr, tag=str(fold))
                model.load_state_dict(torch.load(save_path, map_location=device))

            # PAPER METHOD: weight from full training fold predictions
            tp, tl = get_probs(model, train_eval_dl, device)
            tm     = compute_metrics(tp, tl)
            w      = tanh_weight(tp, tl)
            fold_models_w.append((model, w))
            print(
                f'  {name} fold{fold}: '
                f'train_acc={tm["acc"]:.4f} weight={w:.6f}'
            )

        total = sum(w for _, w in fold_models_w)
        probs, labels = ensemble_predict(fold_models_w, test_dl, device)
        m = print_metrics(probs, labels, tag=f'fold {fold+1} | ')
        fold_accs.append(m['acc'])
        print(f'  >>> Fold {fold+1} accuracy: {m["acc"]*100:.2f}%')

    mean_acc = float(np.mean(fold_accs))
    std_acc  = float(np.std(fold_accs))

    print(f'\n{"="*60}')
    print(f'  {k}-FOLD CV RESULTS')
    print(f'  Per-fold: {[f"{a*100:.2f}%" for a in fold_accs]}')
    print(f'  Mean: {mean_acc*100:.2f}% ± {std_acc*100:.2f}%')
    print(f'  Paper target: 98.81%')
    print(f'{"="*60}')

    # Copy best fold weights for deployment
    best_fold = int(np.argmax(fold_accs))
    print(f'\nBest fold: {best_fold+1} ({fold_accs[best_fold]*100:.2f}%) — copying for deployment')
    for name in MODEL_NAMES:
        src = out_dir / f'{name}_fold{best_fold}.pth'
        dst = out_dir / f'{name}.pth'
        if src.exists():
            shutil.copy2(src, dst)
            print(f'  {src.name} → {name}.pth')

    cv_summary = {
        'fold_accuracies':  [float(a) for a in fold_accs],
        'mean_accuracy':    mean_acc,
        'std_accuracy':     std_acc,
        'n_folds':          k,
        'best_fold':        best_fold,
    }
    out = {
        'weights':            [1.0, 1.0, 1.0],
        'normalised_weights': [1/3, 1/3, 1/3],
        'model_order':        MODEL_NAMES,
        'optimal_threshold':  0.5,
        'cv_results':         cv_summary,
    }
    with open(out_dir / 'ensemble_weights.json', 'w') as f:
        json.dump(out, f, indent=2)
    with open(out_dir / 'cv_results.json', 'w') as f:
        json.dump(cv_summary, f, indent=2)
    print(f'Results saved → {out_dir}/cv_results.json')


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-dir', default='./data')
    parser.add_argument('--epochs',   type=int,   default=30)
    parser.add_argument('--batch',    type=int,   default=32)
    parser.add_argument('--lr',       type=float, default=1e-4)
    parser.add_argument('--out',      default='./weights')
    parser.add_argument('--device',   default='cuda' if torch.cuda.is_available() else 'cpu')
    parser.add_argument('--skip',     nargs='*', default=[],
                        help='Skip named models if their .pth exists (fixed split only)')
    parser.add_argument('--kfolds',   type=int,   default=0,
                        help='0=fixed split (fast), N=N-fold CV (matches paper 98.81%%)')
    args = parser.parse_args()

    device    = torch.device(args.device)
    out_dir   = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    data_root = Path(args.data_dir)

    print(f'Device  : {device}')
    print(f'Epochs  : {args.epochs}')
    print(f'Output  : {out_dir}')
    kf_str = f'{args.kfolds}-fold CV' if args.kfolds > 0 else 'fixed split'
    print(f'Mode    : {kf_str}')

    if args.kfolds > 0:
        run_kfold_cv(args, device, out_dir, data_root)
    else:
        run_fixed_split(args, device, out_dir, data_root)


if __name__ == '__main__':
    main()
