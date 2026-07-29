# Architecture

How Kroix is put together, where PHI lives, and which boundaries are load-bearing.

Written so a session does not have to re-derive it by grepping. If something here
contradicts the code, the code is right and this file is stale — fix it.

---

## Shape

```
Browser (React + Vite)
  │
  │  supabase-js, session JWT
  ▼
Supabase ──────────────────────────────────────────────
  │  Postgres + RLS          ← the actual access control
  │  Auth                    ← open signup, approval-gated
  │  Storage                 ← dicom-files, documents (private)
  │  Edge Functions (Deno)   ← service-role, RLS BYPASSED
  ▼
External
  Railway    ML inference (3-model CXR ensemble)
  Pinecone   vector store for the assistant
  OpenAI     embeddings
```

Two planes worth separating in your head:

- **Client plane.** The browser talks to Postgres directly through `supabase-js`.
  Every query is filtered by RLS as the signed-in user. A bug here leaks only what
  policy allows.
- **Service plane.** Edge functions construct a service-role client with
  `BYPASSRLS`. Policy does nothing inside them. A bug here leaks everything.

Most security reasoning reduces to: *which plane is this code on?*

---

## Access control

Signup is open to anyone. Being authenticated grants nothing.

```
auth.users ──1:1──> public.profiles
                      ├─ approved  BOOLEAN  DEFAULT false
                      └─ role      TEXT     'admin' | 'radiologist'
```

Two `SECURITY DEFINER` helpers, both with `SET search_path = public`:

- `is_approved_user()` — approved is true
- `is_admin_user()` — approved is true AND role is admin

**Every PHI policy delegates to `is_approved_user()`.** That makes `profiles` the
root of trust: whoever can write `approved` can read everything.

A `BEFORE UPDATE` trigger on `profiles`
(`20260728130000_prevent_profile_privilege_escalation.sql`) rejects changes to
`approved` or `role` unless the caller is `service_role`, an existing approved
admin, or a direct DB session. Enforcement is in the trigger, not the policy, so
it survives a future permissive policy being added beside it.

New signups land at `PendingApproval` until an admin flips the flag.

### RLS invariants

Load-bearing and easy to break. Full detail in `/rls-audit`.

- Permissive policies combine with **OR**. A strict policy beside an open one
  grants the union. Drop the open one.
- A policy with no `TO` clause applies to **every** role, `anon` included.
- `service_role` has `BYPASSRLS` and needs no policy. A "service role can manage"
  policy without `TO` is a hole, not documentation.
- `UPDATE` with `USING` but no `WITH CHECK` reuses `USING` as the row check —
  only the key column is protected.
- Always reason about the **cumulative** state across all migrations, never one
  diff.

---

## Data

| Table | Contains | Gate |
|---|---|---|
| `studies` | Imaging metadata, storage paths, `patient_hash` | `is_approved_user()`; delete is admin |
| `triage_results` | Risk score, bucket, confidence, heatmap, model version, latency | same |
| `lab_results` | Blood gas, WBC, CRP, procalcitonin | same |
| `feedback_events` | Clinician confirm / over-call / under-call | same |
| `documents` | Uploaded clinical documents | same |
| `embeddings` | Vector metadata; `source_type` includes `study_finding`, `historical_decision` — **patient-derived** | `is_approved_user()` since `20260728120000` |
| `medical_literature` | Reference content (ACR guidelines etc.) | same |
| `profiles` | Identity, approval, role | Self read/write; admins read/write all; trigger guards privilege columns |

Storage buckets `dicom-files` and `documents` are `public = false`, MIME- and
size-restricted, and carry policies mirroring the table gate.

`patient_hash` is a pseudonymous identifier, not an anonymiser. Treat everything
in these tables as PHI.

---

## Request paths

**Upload and inference** — `useUploadDicom`
1. File to `dicom-files` storage (RLS as the user)
2. Row into `studies`
3. `POST /functions/v1/infer-cxr` with the **session JWT**
4. Function authorises, calls the Railway model, writes `triage_results`
5. `useRealTimeStudies` picks up the change over Supabase realtime

The JWT in step 3 matters. The publishable anon key authenticates as nobody and
`getUser()` rejects it, so the call 401s for every user.

**Review** — `Reviewer.tsx` reads the study, renders the image with an optional
Grad-CAM overlay, and records the clinician's call into `feedback_events`. When
the model returned no localization, the UI says so; it must never draw a region
the model did not produce.

**Assistant** — `rag-query` / `rag-assistant` embed the question, search Pinecone,
and answer with retrieved context. `rag-embed` writes into that index, which is
why its input validation is a PHI concern rather than a hygiene one.

---

## Frontend

- **Vite + React + TypeScript**, TanStack Query for server state, React Router.
- **Two palettes existed** until the `kx-*` migration; `landing-*` is now gone.
  Tokens: `kx-canvas`, `kx-surface`, `kx-surface2`, `kx-ink`, `kx-muted`,
  `kx-border`, `kx-critical`, `kx-accent2`, `kx-accent3`, `kx-tint2`, `kx-tint3`.
- **Type**: `font-display` (Inter Tight), `font-editorial` (Instrument Serif),
  `font-mono`. Not Space Grotesk.
- The Google Fonts `@import` **must be the first rule** in `src/index.css`.
  Below the `@tailwind` directives, PostCSS strips it from production builds.
- `noUnusedLocals` is `false`. Dead imports do not fail the build.

Route protection lives in `ProtectedRoute` (checks user, then approval).
Design-variant galleries and `/validation` sit inside an `import.meta.env.DEV`
gate and are verified absent from production bundles by `/preflight`.

---

## Verification

**There is no test suite and no CI.** Zero test files, no test script, no
workflows directory. The only automated gates are `tsc --noEmit`, `vite build`,
and the `/preflight` checklist.

This is the largest structural gap in the project. Two P0 security defects were
found by manual review in a single session; nothing in the repo would catch
either recurring.

If tests get added, the first three worth writing:
1. RLS policy tests against a local Supabase — assert an unapproved user reads nothing.
2. Edge-function input validation — assert malformed payloads 400 before reaching service-role.
3. The ranking statistics in `src/validation/stats.ts` — pure functions, trivially testable, and a wrong ρ silently invalidates the validation sprint.

---

## Regulatory position

Kroix analyses a medical image and reorders a worklist. That is the definition of
computer-aided triage and notification under **21 CFR 892.2080** — Class II,
510(k) required. Non-diagnostic is what defines the category, not an exemption
from it. The Cures Act §3060 CDS exclusion does not apply: its first criterion
fails for any software that processes a medical image.

Validation is not deployment. Showing a radiologist ranked studies needs no
clearance; shipping into live clinical workflow does.

Detail in `~/.gstack/projects/prithsk-insight-triage/competitive-analysis-20260728.md`.
