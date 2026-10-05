# Kroix

AI-powered triage for clinical radiology. Kroix reorders a FIFO chest X-ray worklist by clinical
urgency using a 3-model ensemble (DenseNet121 + GoogLeNet + ResNet18), so radiologists read the
most critical scans first instead of working strictly in upload order.

**Non-diagnostic workflow tool.** Kroix does not replace a radiologist's read — it reorders the
queue. All diagnostic decisions remain with the physician.

## How it works

```
Upload (DICOM / JPG / PNG)
  → Supabase Storage
  → studies row created (status: PROCESSING)
  → infer-cxr edge function
      → Path A: Kroix ML API (3-model ensemble)   ← primary
      → Path B: Gemini vision fallback              (OPT-IN: VISION_FALLBACK_ENABLED=true)
      → neither succeeded: 422 / 503, scored:false, and NO triage row
  → triage_results stored (only when a model produced a score)
  → study status → QUEUED, or back to PENDING and "awaiting triage" if unscored
  → worklist re-sorts in real time (CRITICAL → REVIEW → CLEAR)
```

The ML ensemble (`services/ml-api/`) runs DenseNet121, GoogLeNet, and ResNet18 in parallel, fuses
their outputs with a tanh-weighted average, and returns a risk score, a CRITICAL / REVIEW / CLEAR
bucket, a confidence value, and a Grad-CAM heatmap. Trained via 5-fold cross-validation on the
Kermany chest X-ray pneumonia dataset (see `services/ml-api/train_colab.ipynb`).

There is no third path. A study that no model scored stays **unscored**: the image is stored and
readable, no `triage_results` row is written, and the worklist pins it last in both sort directions
with an "awaiting triage" chip. See `CLAUDE.md` → Public claims for why.

**There are no lab values.** Kroix used to show a blood panel (CO2, pH, O2, WBC, CRP,
procalcitonin) beside each study. It was a closed-form function of the risk score computed in
`infer-cxr` — no model, no blood draw, nothing a radiograph could supply — labelled "Simulated" from
2026-09-26 and removed on 2026-10-04. `src/design.test.ts` fails any clinical surface that renders lab
figures and any code that computes or writes them. The `lab_results` table remains, unused, holding
only the old simulated rows.

**There is no confidence figure** in the UI either. The API still returns `confidence`, but it is a
monotone function of distance to the decision boundary — the score restated, never calibrated — so it
is not shown as one.

## Project structure

```
src/                      Frontend — React + TypeScript + Vite + Tailwind
  pages/                  Route-level pages (Landing, Login, Dashboard, Reviewer, Analytics, ...)
  components/
    landing/              Landing-page-only components (motion, trace viz, FAQ, case study)
    dashboard/             Worklist card/table, upload, preview panel
    reviewer/               Grad-CAM heatmap overlay
    ui/                     shadcn/ui primitives + custom (reveal, bucket-badge, risk-score, ...)
  hooks/                    Data hooks (useStudies, useAnalytics, ...) + motion hooks
  integrations/supabase/    Generated Supabase client + types
  lib/                      Types, mock data, security helpers

supabase/
  functions/                 Deno edge functions
    infer-cxr/                Routes an uploaded image to the ML API (or fallback)
    analytics-aggregate/      Aggregates MTTR / throughput / feedback for Analytics page
    rag-assistant/, rag-embed/, rag-query/   Assistant page RAG pipeline
    send-contact-email/, validate-email/     Contact form
  migrations/                 Postgres schema

services/ml-api/            Python FastAPI ML inference service
  model.py                   DenseNet121Detector, GoogLeNetDetector, ResNet18Detector, EnsembleDetector
  inference.py                Prediction pipeline, TTA, Grad-CAM
  main.py                     FastAPI app (/predict, /health, /model-info)
  train.py / train_colab.ipynb  5-fold CV training pipeline (Colab-ready)
  weights/                    Trained .pth weights (baked into the Docker image at build time)
  Dockerfile                  Root-level Dockerfile (services/ml-api/Dockerfile) — Railway deploy target
```

## Local development

Requires Node.js & npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
git clone <YOUR_GIT_URL>
cd insight-triage
npm i
npm run dev
```

Runs at `http://localhost:8080`. Requires a `.env` with:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

## Deploying the ML API

The ML inference service (`services/ml-api/`) deploys separately from the frontend, typically to
Railway:

1. Trained weights (`densenet121.pth`, `googlenet.pth`, `resnet18.pth`, `ensemble_weights.json`)
   live in `services/ml-api/weights/` and are baked into the Docker image at build time via the
   root-level `Dockerfile` (see `railway.json` for build config).
2. Set Railway env vars: `WEIGHTS_DIR=weights`, `API_KEY=<your-key>`, `DEVICE=cpu`.
3. Once deployed, set matching Supabase Edge Function secrets so `infer-cxr` can reach it:
   ```
   ML_API_URL=https://<your-railway-app>.railway.app
   ML_API_KEY=<same key as Railway's API_KEY>
   ```
4. Verify with `GET /health` — should return `{"ready": true}` once weights load.

Without `ML_API_URL` set, the ensemble cannot score. The Gemini vision fallback is **opt-in** and
off by default: set the Supabase secret `VISION_FALLBACK_ENABLED=true` to allow it. Gemini is a
general-purpose model with no validation on chest radiographs, and it writes into the same
`risk_score` column the ensemble writes — so a silent substitution would mean a queue ordered by a
model nobody chose. With the flag off, or with both paths unavailable, the request returns 503 with
`scored: false` and the study stays unscored. There is no synthetic tier.

## Design system

- **Palette**: one namespace, `kx-*`, shared by the public site and the clinical app —
  `#FFFFFF` canvas, `#F6F7F9` surface, `#12151A` ink, `#6B7280` muted, `#3B5BFF` and
  `#0F9D6E` accents, `#E8503A` critical (a fill only — `#B03A28` `kx-critical-ink` for
  severity text, since `#E8503A` is 3.7:1 on white and fails SC 1.4.3). The `landing.*`
  warm green/paper block in `tailwind.config.ts` is **dead**: zero uses in `src/`. This
  section previously described it as the live identity; it never shipped.
- **Type**: Inter Tight (`font-display`), Instrument Serif (`font-editorial`), IBM Plex Mono
  (`font-mono`). Playfair Display is configured as `font-serif` and is **not used anywhere**.
  `font-editorial` appears in 7 landing components and 1 clinical file — that asymmetry is
  most of why the inner app reads as a different product from the landing page, and it is a
  composition gap, not a palette one.
- **Motion** (landing/marketing pages only — deliberately absent from the clinical worklist):
  scroll-triggered reveals (`components/ui/reveal.tsx`), a scroll-pinned word-highlight statement
  (`components/landing/ScrollHighlightText.tsx`), sticky stacking cards
  (`components/landing/StackingCards.tsx`), magnetic-hover CTAs (`hooks/useMagneticHover.ts`).
- **Inner app** (dashboard, reviewer, analytics): same design tokens, no scroll/motion effects —
  optimized for fast, dense, low-distraction clinical use.

## What technologies are used

- **Frontend**: Vite, TypeScript, React, React Router, TanStack Query, shadcn/ui, Tailwind CSS, Recharts
- **Backend**: Supabase (Postgres, Auth, Storage, Realtime, Edge Functions on Deno)
- **ML**: PyTorch, torchvision (DenseNet121, GoogLeNet, ResNet18), FastAPI, deployed on Railway
- **AI fallback**: Gemini 2.5 Flash (vision) via Lovable AI Gateway

## Editing this project

This repo is connected to [Lovable](https://lovable.dev) — changes pushed here sync to the Lovable
project and vice versa. You can also edit locally in any IDE, via GitHub directly, or in GitHub
Codespaces; all paths push to the same `main` branch.

## Regulatory and compliance status

Kroix is **pre-clearance and not deployed**. There is no pilot, no customer, and no
clinical use. It has never run against a live worklist.

Scoring images and reordering a queue is the definition of computer-assisted triage
under **21 CFR 892.2080** — Class II, 510(k) required. Being non-diagnostic is what
places software in that category, not what exempts it from it. The Cures Act §3060
clinical-decision-support exclusion does not apply, because its first criterion fails
for any software that processes or analyzes a medical image.

Validation is not deployment. Showing a radiologist a ranked list, or replaying a
ranking against a historical worklist, needs no clearance. Shipping into live clinical
workflow does.

Model performance to date is 5-fold cross-validation on a public dataset
(`paultimothymooney/chest-xray-pneumonia`, Kermany et al., *Cell* 2018) — pediatric,
single-centre, binary pneumonia vs. normal, with train/val/test pooled before the
split. That is not clinical validation and should not be described as such.

Production use with real PHI would additionally require BAA-covered infrastructure for
every service in the pipeline (hosting, Supabase, ML API). Not in place.
