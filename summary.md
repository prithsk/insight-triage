# Kroix — Project Architecture & Codebase Summary

> **Kroix** is a medical imaging AI triage platform for chest X-rays (CXR). It helps radiologists prioritize their worklist by automatically scoring uploaded DICOM/image files for pneumonia risk using an AI vision model, fusing image findings with correlated lab biomarkers, and providing a clinician-facing reviewer workflow. The product is currently in **PILOT** mode.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Architecture Overview](#architecture-overview)
4. [Database Schema](#database-schema)
5. [Frontend — Pages & Routes](#frontend--pages--routes)
6. [Frontend — Components](#frontend--components)
7. [Frontend — Custom Hooks](#frontend--custom-hooks)
8. [Backend — Edge Functions](#backend--edge-functions)
9. [Core Features & Functionalities](#core-features--functionalities)
10. [Data Flow](#data-flow)
11. [Security Model](#security-model)
12. [External Integrations](#external-integrations)
13. [Configuration Files](#configuration-files)

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend framework** | React 18 + TypeScript |
| **Build tool** | Vite 5 (`@vitejs/plugin-react-swc`) |
| **Styling** | Tailwind CSS 3, tailwind-merge, tailwindcss-animate |
| **UI components** | shadcn/ui (Radix UI primitives), lucide-react icons |
| **Routing** | React Router DOM v6 |
| **Server state / data fetching** | TanStack React Query v5 |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts (Line, Area, Bar charts) |
| **Backend / DB** | Supabase (Postgres + Auth + Storage + Realtime) |
| **Edge functions** | Deno (TypeScript), hosted on Supabase |
| **AI inference** | Lovable AI Gateway → Google Gemini 2.5 Flash (vision) |
| **AI chat / RAG** | Google Gemini 3 Flash Preview (streaming SSE) |
| **Vector search** | Pinecone (embedding index + similarity search) |
| **Toast notifications** | Sonner |
| **Date utilities** | date-fns |
| **Package manager** | npm / bun |

---

## Project Structure

```
insight-triage/
├── public/                        # Static assets
├── src/
│   ├── assets/landing/            # Landing page images
│   ├── components/
│   │   ├── dashboard/             # Worklist & preview components
│   │   ├── layout/                # App shell layouts
│   │   └── ui/                    # shadcn/ui primitives + custom UI atoms
│   ├── contexts/                  # React contexts (AuthContext)
│   ├── hooks/                     # Data-fetching and mutation hooks
│   ├── integrations/supabase/     # Auto-generated Supabase client + DB types
│   ├── lib/                       # Types, constants, security utilities, mock data
│   ├── pages/                     # Route-level page components
│   ├── App.tsx                    # Router + providers
│   ├── main.tsx                   # React entry point
│   └── index.css / App.css        # Tailwind + custom design tokens
├── supabase/
│   ├── functions/                 # Deno-based edge functions (serverless backend)
│   └── migrations/                # Postgres schema migrations (7 files)
├── .env                           # Supabase URL, anon key, project ID
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Architecture Overview

### Frontend Architecture

- **Feature-based page components** under `src/pages/`, with shared layout shells (`DashboardLayout`, `AppLayout`).
- **Custom hooks** encapsulate all Supabase interactions and business logic via TanStack Query mutations/queries. Pages are thin consumers; hooks own the data layer.
- **Context + hook** pattern for authentication state (`AuthContext` + `useAuth()`).
- **Optimistic UI + cache invalidation** via `queryClient.invalidateQueries` after every mutation.
- **Protected routes** via a `<ProtectedRoute>` wrapper that gates all authenticated pages.

### Backend Architecture

- **Serverless, stateless** Deno functions triggered by HTTP POST from the frontend.
- **Defence-in-depth security** on every edge function: input validation, UUID format checks, SQL/XSS/prompt-injection detection, in-memory rate limiting per function instance, and security response headers.
- **RAG pipeline** composed of three chained functions:
  - `rag-embed` → index documents into Pinecone
  - `rag-query` → retrieve relevant context
  - `rag-assistant` → generate a streaming SSE response

### Database

- PostgreSQL (via Supabase) with **Row Level Security (RLS)** enforced on every table — only the `authenticated` role can read or write.
- **Realtime subscriptions** on `studies`, `triage_results`, and `lab_results` tables, consumed by `useRealTimeStudies` to push live updates to the worklist.

---

## Database Schema

| Table | Purpose |
|---|---|
| `studies` | Core imaging study record (patient hash, modality, file path, status) |
| `triage_results` | AI inference output per study (risk_score, risk_bucket, confidence, ROI heatmap, model version) |
| `lab_results` | Correlated biomarkers (CO2, pH, O2, WBC, CRP, procalcitonin) |
| `feedback_events` | Radiologist feedback on triage decisions (correct / false alarm / missed urgency) |
| `documents` | Clinical documents uploaded for RAG indexing (SOPs, guidelines, lab references) |
| `embeddings` | Pinecone vector ID mapping + metadata for RAG retrieval |

All tables are governed by Supabase RLS; no row is accessible without a valid JWT.

---

## Frontend — Pages & Routes

| Page | Route | Purpose |
|---|---|---|
| `Landing.tsx` | `/` | Marketing/product landing page with live demo charts |
| `Login.tsx` | `/login` | Supabase email/password sign-in |
| `Signup.tsx` | `/signup` | New account creation |
| `ForgotPassword.tsx` | `/forgot-password` | Send password reset email |
| `ResetPassword.tsx` | `/reset-password` | Set new password via magic token |
| `Index.tsx` | `/dashboard` | **Triage Command Center** — real-time worklist with filtering, sorting, multi-select |
| `Reviewer.tsx` | `/reviewer/:studyId` | **Single-study deep review** — image viewer, ROI overlay, lab values, AI feedback capture |
| `Analytics.tsx` | `/analytics` | Charts comparing MTTR/throughput/override rates with vs. without Kroix |
| `About.tsx` | `/about` | Company and product information |
| `Contact.tsx` | `/contact` | Contact form (validated + sent via `send-contact-email` edge function) |
| `NotFound.tsx` | `*` | 404 fallback |

---

## Frontend — Components

### Dashboard Components (`src/components/dashboard/`)

| Component | Role |
|---|---|
| `WorklistCard.tsx` | Individual study card — risk badge, score, labs preview, selection checkbox |
| `WorklistTable.tsx` | Table view alternative for the worklist |
| `StudyPreview.tsx` | Slide-in panel showing study thumbnail, triage result, and quick actions |
| `PreviewPanel.tsx` | Container for the slide-in preview experience |
| `UploadButton.tsx` | DICOM/image file upload with drag-and-drop support |

### Layout Components (`src/components/layout/`)

- **`DashboardLayout.tsx`** — Fixed top navigation (Kroix logo, Dashboard / Reviewer / Analytics links, user email, sign-out), main content area.
- **`AppLayout.tsx`** — Simpler layout shell for auth and marketing pages.

### UI Primitives (`src/components/ui/`)

shadcn/ui component library including: Button, Card, Dialog, Badge, Input, Select, Table, Tabs, Tooltip, Sheet, Progress, Separator, Avatar, Skeleton, Toast, and more.

---

## Frontend — Custom Hooks

| Hook | Responsibility |
|---|---|
| `useStudies` | List all studies with nested triage & lab results; single study fetch; create/delete/run-inference/submit-feedback mutations |
| `useRealTimeStudies` | Wraps `useStudies` + Supabase Realtime subscriptions; transforms DB rows → `WorklistItem[]`; sorts by CRITICAL → REVIEW → CLEAR; computes `QueueState` |
| `useUploadDicom` | File validation → Supabase Storage upload → create `studies` record → call `infer-cxr` edge function → store `triage_results` + `lab_results` |
| `useUploadDocument` | Upload clinical documents (PDF/DOCX) to Supabase Storage + create `documents` record for RAG indexing |
| `useDicomImage` | Generates a signed 1-hour Supabase Storage URL for a given file path |
| `use-toast` | Toaster state management (shadcn/ui) |
| `use-mobile` | Responsive breakpoint detection |

---

## Backend — Edge Functions

All edge functions are written in TypeScript/Deno and deployed on Supabase.

| Function | Trigger | Purpose |
|---|---|---|
| `infer-cxr` | POST (study_id) | Core AI pipeline: fetch image → base64 encode → call Gemini 2.5 Flash vision → parse risk score/findings → generate lab values + ROI heatmap → store results |
| `rag-embed` | POST (content, metadata) | Embed a document chunk and upsert into Pinecone; track in `embeddings` table |
| `rag-query` | POST (query, topK) | Embed the query → similarity search in Pinecone → enrich with Supabase content → return ranked results |
| `rag-assistant` | POST (query, studyContext?) | Full RAG cycle with streaming SSE: query → retrieve → generate via Gemini 3 Flash; includes prompt injection detection |
| `send-contact-email` | POST (name, email, message) | Validate and forward contact form submissions |

### Common Edge Function Patterns

- UUID format validation on all IDs before DB lookup.
- SQL injection detection (`DROP`, `INSERT`, `--`, etc.) and XSS pattern detection.
- Prompt injection detection on all AI inputs and conversation history.
- In-memory rate limiting per function instance (configurable per-function limits).
- CORS + security response headers (`X-Content-Type-Options`, `X-Frame-Options`, etc.) on all responses.
- A **fallback inference path** exists in `infer-cxr` — if the AI gateway is unavailable, a clinically plausible random risk score is generated (60% CLEAR / 25% REVIEW / 15% CRITICAL distribution).

---

## Core Features & Functionalities

### 1. AI Triage Pipeline

The platform's central feature — automated pneumonia risk scoring for chest X-rays.

**Steps:**
1. User uploads a DICOM or image file via the `UploadButton`.
2. `useUploadDicom` validates the file (type whitelist, 50 MB size cap, double-extension attack prevention, client-side rate limit of 10 uploads/min).
3. File is uploaded to the `dicom-files` Supabase Storage bucket; a `studies` record is created with `status = PROCESSING`.
4. The `infer-cxr` edge function is invoked with the `study_id`.
5. The edge function fetches the image from storage, converts it to base64, and sends it to **Google Gemini 2.5 Flash** (via the Lovable AI Gateway) with a detailed radiologist-style system prompt.
6. The AI returns a JSON payload containing `risk_score` (0–1), `findings[]`, and `severity_rationale`.
7. The score is categorised into three **risk buckets**:
   - `CRITICAL` — score ≥ 0.65
   - `REVIEW` — score 0.30–0.64
   - `CLEAR` — score < 0.30
8. **Correlated lab values** (CO2, pH, O2, WBC, CRP, procalcitonin) are algorithmically derived from the risk score to simulate blood-gas and inflammatory markers consistent with the pneumonia severity.
9. An **ROI heatmap** (base64-encoded JSON array of lung region coordinates) is generated, indicating areas of AI interest.
10. Results are stored in `triage_results` and `lab_results`; the study status advances to `QUEUED`.
11. The worklist updates in real time via Supabase Realtime.

---

### 2. Worklist (Dashboard — `/dashboard`)

- Real-time updates via Postgres `postgres_changes` subscriptions.
- Filter by risk bucket: ALL / CRITICAL / REVIEW / CLEAR.
- Sort by priority, risk score, time, or study ID (ascending/descending toggle).
- Search by study ID or patient hash.
- Multi-select + bulk delete with confirmation dialog.
- Slide-in `StudyPreview` panel on card selection; click-through to full Reviewer.

---

### 3. Reviewer (`/reviewer/:studyId`)

- Full image viewer with zoom, rotation, and ROI overlay (opacity-adjustable).
- Parsed ROI regions rendered with anatomical labels (right lung, left lung, lower lobes, consolidation, etc.).
- Lab values panel with threshold-based flagging.
- **Radiologist feedback capture**: three feedback types — `CORRECT_PRIORITY`, `FALSE_ALARM`, `MISSED_URGENCY` — with optional free-text notes. Stored as `feedback_events` for model improvement.

---

### 4. RAG / AI Assistant

A retrieval-augmented generation system for clinical knowledge queries.

- **`rag-embed`**: Indexes study findings, medical literature, and clinical decisions into Pinecone as vector embeddings. Also tracks embedding metadata in the Supabase `embeddings` table.
- **`rag-query`**: Takes a natural language query, embeds it, queries Pinecone for top-K results, and enriches results with full content from Supabase.
- **`rag-assistant`**: Orchestrates the full RAG cycle — query → retrieve → generate. Uses Gemini 3 Flash Preview with **streaming SSE**. Accepts optional `studyContext` to answer case-specific questions. Prompt injection detection runs on both the query and conversation history.

---

### 5. Analytics (`/analytics`)

- Charts comparing MTTR (mean time to review), scan throughput, and radiologist override rates.
- Toggle between "With Kroix" and "Without Kroix" to visualise platform impact.
- Currently powered by **mock-generated data** from `src/lib/mock-data.ts`.

---

### 6. Authentication

- Supabase Auth (email + password) with persistent JWT sessions in `localStorage`.
- `AuthProvider` context listens to `onAuthStateChange` for live session updates.
- `<ProtectedRoute>` component gates `/dashboard`, `/reviewer`, and `/analytics`.
- Password reset via Supabase magic-link emails.

---

### 7. Document Management

- `useUploadDocument` supports PDF, DOCX, DOC, and TXT upload to the `documents` Supabase Storage bucket.
- Document type is auto-inferred from filename (SOP, guideline, lab reference, report).
- Documents feed into the RAG knowledge base for the AI assistant.

---

## Data Flow

```
User uploads image
       │
       ▼
useUploadDicom (hook)
  ├─ Validates file (type, size, extension)
  ├─ Checks client-side rate limit (10/min)
  ├─ Uploads to Supabase Storage (dicom-files bucket)
  ├─ Inserts studies row (status = PROCESSING)
  ├─ POST → /functions/v1/infer-cxr
  │     ├─ Fetches image from storage → base64
  │     ├─ Calls Gemini 2.5 Flash (vision) via Lovable AI Gateway
  │     ├─ Parses JSON: risk_score, findings[]
  │     ├─ Categorises into CRITICAL / REVIEW / CLEAR bucket
  │     ├─ Generates correlated lab values (algorithmic)
  │     ├─ Generates ROI heatmap (base64 JSON)
  │     └─ Returns ClinicalFindings object
  ├─ Inserts triage_results row
  ├─ Inserts lab_results row (source = 'ai_vision_analysis')
  └─ Updates studies status → QUEUED

Supabase Realtime (postgres_changes on studies / triage_results / lab_results)
       │
       ▼
useRealTimeStudies
  ├─ Invalidates React Query cache → refetches
  ├─ Transforms DB rows → WorklistItem[]
  ├─ Sorts: CRITICAL → REVIEW → CLEAR → pending
  └─ Computes QueueState (pendingCount, status)

Dashboard page renders WorklistCard list
       │
  User selects a card
       │
  StudyPreview panel appears (signed image URL via useDicomImage)
       │
  User clicks "Open Reviewer"
       │
  Reviewer page loads → full image viewer + ROI overlay + labs + feedback form
       │
  Radiologist submits feedback → inserts feedback_events row
```

---

## Security Model

| Layer | Controls |
|---|---|
| **Network / transport** | HTTPS enforced by Supabase; CORS + security response headers on all edge functions |
| **Authentication** | Supabase JWT sessions; all DB queries scoped to the authenticated user via RLS |
| **Database** | Row Level Security on every table; only `authenticated` role has read/write |
| **Input validation** | Zod schemas on all forms; regex-based SQL injection (`DROP`, `INSERT`, `--`) and XSS pattern detection in edge functions |
| **AI prompt safety** | Prompt injection detection on all AI inputs and conversation history before forwarding to LLM |
| **File upload** | Extension whitelist, double-extension attack prevention, 50 MB size cap, filename sanitization |
| **Rate limiting** | Client-side in-memory maps (10 uploads/min, 20 AI queries/min); mirrored rate limiting inside each edge function |
| **Regulatory compliance** | `FORBIDDEN_WORDS` constant + `LANGUAGE` dictionary enforce non-diagnostic wording — all outputs labeled "for workflow prioritization only, not a diagnostic tool" |

---

## External Integrations

| Service | Usage |
|---|---|
| **Supabase** | Postgres DB, Auth, Storage (DICOM + document buckets), Realtime subscriptions, Edge Function hosting |
| **Lovable AI Gateway** (`ai.gateway.lovable.dev`) | Unified proxy to Google Gemini models |
| **Google Gemini 2.5 Flash** | Multimodal vision inference — chest X-ray analysis |
| **Google Gemini 3 Flash Preview** | Streaming chat/RAG assistant responses |
| **Pinecone** | Vector database for RAG embedding storage and similarity search |

---

## Configuration Files

| File | Purpose |
|---|---|
| `.env` | Supabase project URL, anon/publishable key, project ID |
| `vite.config.ts` | Dev server port (8080), `@` path alias → `./src`, `lovable-tagger` dev plugin |
| `tailwind.config.ts` | Custom colors (`landing-primary`, `landing-bg`, `landing-heading`, etc.), custom fonts, animation keyframes |
| `tsconfig.json` / `tsconfig.app.json` | TypeScript strict mode, path alias configuration |
| `components.json` | shadcn/ui configuration (component style, Tailwind config paths) |
| `postcss.config.js` | PostCSS with Tailwind CSS + autoprefixer |
| `eslint.config.js` | ESLint with react-hooks and react-refresh plugins |
| `supabase/config.toml` | Supabase project ID reference |

---

*This summary was auto-generated from static codebase analysis. Last updated: March 2026.*
