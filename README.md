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
      → Path B: Gemini vision fallback              (if ML API unavailable)
      → neither succeeded: 422 / 503, scored:false, and NO triage row
  → triage_results + lab_results stored (only when a model produced a score)
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

Lab values (CO2, pH, O2, WBC, CRP, procalcitonin) shown alongside triage results are **simulated**
— a closed-form function of the risk score, computed in `infer-cxr` and stored with
`source = 'simulated_from_risk_score'`. No model and no blood draw is involved; none of these can be
derived from a radiograph. They are labeled "Simulated — not a real lab draw" in the Reviewer and in
StudyPreview, but **not** in PreviewPanel or the worklist `Labs` column — this README previously
claimed they were labeled everywhere, and they are not.

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

Without `ML_API_URL` set, `infer-cxr` falls back to Gemini vision. If that is unavailable too the
request returns 503 with `scored: false` and the study stays unscored — there is no synthetic tier.

## Design system

- **Palette**: warm green/paper identity (`tailwind.config.ts` → `landing.*` tokens) — `#2F6F5E`
  primary, cool light backgrounds, deep green/near-black bands for high-contrast sections.
- **Type**: Playfair Display (serif display), Inter (body/UI), IBM Plex Mono (data/metrics).
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
