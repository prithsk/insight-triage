# Kroix

AI triage for chest X-rays. A three-model ensemble (DenseNet121, GoogLeNet, ResNet18,
tanh-weighted fusion) scores studies and reorders the radiologist worklist.

React + TypeScript (Vite) · Supabase (Postgres, RLS, Storage) · ML API on Railway.

**This repository is public.** Nothing sensitive goes in it: no competitive analysis,
no regulatory exposure, no buyer research, no keys. Strategy artifacts live in
`~/.gstack/projects/prithsk-insight-triage/`.

---

## Verify before you assert

This is a clinical product. A wrong regulatory or safety claim is expensive in a way
a wrong styling choice is not.

**Regulatory, clinical, and safety claims require a primary source.** Cite the eCFR
section, the Federal Register order, the FDA guidance document and its revision date,
or the company's own FDA registration. Not a blog, not a summary, not recall.

**Do not treat AI-generated analysis as evidence.** This applies to output from any
model, including me and including anything the user pastes in from elsewhere. When
outside analysis arrives, split it: adopt the framing that survives checking, correct
what fails and show the citation that refutes it. If the failing claims all happen to
make the business easier, say so explicitly — that pattern is the finding.

**Established ground, so it is not relitigated from memory each session:**
- Kroix scores images and reorders a queue. That is the definition of CADt under
  **21 CFR 892.2080** — Class II, 510(k) required. Being non-diagnostic is what
  defines the category, not an exemption from it.
- The Cures Act §3060 CDS exclusion does not apply: its first criterion fails for any
  software that processes or analyzes a medical image.
- Validation is not deployment. Showing a radiologist ranked studies needs no
  clearance. Shipping into live clinical workflow does.
- Regulatory *opinions* come from a person with liability insurance. This file
  records what regulations say, not what they mean for us.

## Security

PHI-handling with RLS behind an approval gate. When touching `supabase/migrations/`:

- Postgres permissive policies are **OR-ed**. Adding a strict policy beside an open
  one changes nothing. Drop the open one.
- A policy with no `TO` clause applies to **every** role, including `anon`.
- `service_role` has `BYPASSRLS` and needs no policy. A "service role can manage"
  policy without `TO` is a hole, not documentation.
- An `UPDATE` policy with `USING` but no `WITH CHECK` reuses `USING` as the row
  check. Privilege columns on a self-updatable table need a trigger, not a predicate.
- Reason about the **cumulative** policy state across all migrations, never the diff
  alone.
- `storage.objects` is a PHI table. It holds the DICOM images themselves and is
  covered by `supabase/rls.test.ts` like any other — it was added to `PHI_TABLES`
  on 2026-09-25, having been absent since the suite was written, which is why the
  TO-clause rule silently skipped the image bucket. It is the schema-qualified
  outlier: rules that filter on `public.` will not see it. Check that when adding
  one.
- A policy is not safe because its predicate happens to deny. All seven
  `storage.objects` policies omitted `TO` and were still closed to `anon`, because
  `is_approved_user()` reads `profiles` for `auth.uid()`, which is NULL with no
  JWT. That is one line of defense, and this repo's P0 was two reasonable changes
  combining. `20260925120000_scope_storage_object_policies.sql` adds the second.
  Say "not currently exploitable" out loud rather than shipping a fix that reads
  as an incident.
- RLS being enabled on `storage.objects` is assumed, not asserted. Supabase owns
  that table and no migration here may `ALTER` it, so the "RLS enabled wherever
  policies exist" test scopes itself to `public.`. It is the one precondition in
  the suite nothing checks.

Never commit `.env`. Never put a secret in a `VITE_`-prefixed variable — Vite inlines
those into the public bundle.

## Public claims

The landing page is promotion for an uncleared Class II device. Three fabrications
shipped there and were removed on 2026-07-30; the pattern matters more than the
instances, because every one of them typechecked and looked convincing:

- a `Math.random()` "scans reviewed per hour, with vs. without Kroix" chart under a
  `LIVE · 7-DAY` badge — a head-to-head that has never been run;
- a testimonial block attributed to "Pilot deployment, regional imaging network" —
  no pilot and no network exist;
- "Clinical-grade accuracy" and a `VALIDATED` badge over a number that is 5-fold CV
  on `paultimothymooney/chest-xray-pneumonia` (Kermany et al., Cell 2018): a
  **public, pediatric, single-centre** dataset, **binary pneumonia vs normal**, with
  train/val/test **pooled before the split** (`services/ml-api/train.py`).

Rules, so this is not re-litigated:

- No performance number without its task, dataset, cohort, and method beside it.
- No "clinical", "validated", or "clinical-grade" until a clearance exists.
- No customer, pilot, logo, or quote until a real one has agreed in writing.
- No comparative or outcome claim without a study behind it. Illustrative UI is
  fine; illustrative UI wearing a `LIVE` badge is not.
- `Math.random()` must never feed anything a visitor could read as a measurement.

A fourth lived in `README.md` ("Currently in active pilot testing") and a fifth in
`useAnalytics.ts`, which synthesised the entire "without Kroix" comparison arm from
mock generators — even when `hasRealData` was true — and exported it to CSV. Both
removed 2026-08-10. `AnalyticsData` no longer has a `withoutKroix` field at all, so
the comparison cannot be reintroduced by accident; a real one requires the SLA
replay over historical data.

A **seventh** shipped on the landing page until 2026-09-25, and it is the first that
was not a phrase or a mock generator but a *number*:

- Headline model accuracy of **98.9%** — the accuracy ring in
  `SpeedAccuracyDuo.tsx`, and again as an "Ensemble agreement" tile in
  `AppTourDemo.tsx`. The artifact the model actually shipped with,
  `services/ml-api/ensemble_weights.json`, records
  `cv_results.mean_accuracy = 0.9771180957321854` — **97.7%**. 98.9% appears in no
  artifact anywhere in this repo. "Ensemble agreement" was wrong twice over: it is a
  different quantity from cross-validation accuracy, and nothing here measures
  inter-model agreement at all.
- Per-model fusion weights of **0.42 / 0.33 / 0.25**, published in
  `TraceSections.tsx`, `LabHeroes.tsx`, `ThreadedPages.tsx` and
  `WorklistReaderVariants.tsx` — the last of them under a comment reading "these are
  the real ones; do not invent new values here". The artifact records
  `normalised_weights = [1/3, 1/3, 1/3]`.
- **"tanh-weighted fusion" is numerically a plain mean.** `train.py` weights each
  model by `tanh(precision)+tanh(recall)+tanh(f1)+tanh(auc)`; all four metrics for
  all three models sit in [0.97, 1.0], where tanh is saturated at ~0.7616, so every
  raw weight is ~3.046 and normalisation yields exact thirds. The phrase describes
  the code correctly and the result misleadingly. Keep it where it names what the
  code does; never present it as producing distinct per-model weights, and never as
  a differentiator.

This one differs in kind from the first six, and the difference is the lesson: a
plausible number in an honest-looking sentence, with its task, dataset, cohort and
method correctly stated right beside it. Every rule in the list above was satisfied.
The only thing wrong with it was that it was not true. So two more rules, which are
about provenance rather than language:

- A number describing the model is copied from an artifact, or it does not ship.
  Name the artifact and the field in a comment beside it.
- Illustrative arithmetic on screen must actually hold. If the weights change,
  recompute the per-model values so the displayed contributions still sum to the
  displayed total. A panel whose numbers do not add up is the same defect wearing
  a different coat.

A **ninth** was removed on 2026-09-25, and it is the first that was not on the
marketing site at all. It was inside the clinical app, on the server:

- `supabase/functions/infer-cxr/index.ts` had a three-path chain. Path A was the
  ensemble; Path B was Gemini vision; **Path C — `syntheticFallback()` — was
  `Math.random()`**. It drew a `risk_score`, derived a `risk_bucket` from it,
  attached a random `confidence`, and answered **HTTP 200**. `useUploadDicom`
  could not distinguish it from a real score, wrote it to `triage_results`, and
  the worklist ordered a reading queue by it. A real patient's chest X-ray could
  be placed first, or last, on a coin flip. The only disclosure was
  `model_version: 'synthetic-fallback'` in a side panel — not on the worklist
  row, which is where the ordering acts.

The first eight were claims *about* the product. This one *was* the product, and
that is the new category worth naming: a fabricated value can live in the
clinical path, not only in promotion for it. The rules above are all about what
ships to a visitor and none of them reach it. So two more:

- **A failed inference produces an UNSCORED study, never a substitute number.**
  No fallback, no hedged guess, no "degraded mode" score. `infer-cxr` answers
  422 (`image_unavailable`) or 503 (`inference_unavailable`) with
  `scored: false`; the client writes no `triage_results` row and leaves
  `studies.status = 'PENDING'`; `worklistOrder` pins the study last in both sort
  directions and the row reads "awaiting triage".
- **A guard that scans `src/` only does not cover the clinical path.** Every
  claim rule scanned `src/`, which is precisely why none of them saw a random
  number generator sitting in an edge function. `src/claims.test.ts` now scans
  `supabase/functions/**` too; reintroducing Path C fails three of its tests
  (mutation-tested 2026-09-25).

Three smaller fabrications went with it, all reached from the same request:

- `buildLegacyHeatmap()` invented anatomical ROI circles by keyword-matching
  Gemini's findings text and jittered their coordinates with `Math.random()`;
  the Reviewer drew them over a real patient's radiograph. CI forbids exactly
  that shape in `src/pages/Reviewer.tsx` — it had simply moved server-side.
- a Gemini response with no parseable score defaulted to `0.35`, manufacturing a
  REVIEW score out of a parse failure.
- `useUploadDicom` wrote a hardcoded "normal" blood gas (CO2 40, pH 7.40, O2 97,
  WBC 7.5, CRP 1.5, PCT 0.05) into `lab_results` whenever the function returned
  none, stored as `source: 'ai_vision_analysis'`.

**Lab values: removed 2026-10-04.** `lab_results` was a closed-form function of the
risk score computed in `infer-cxr` — no model, no blood draw, nothing a radiograph
could supply. It was labelled "Simulated — not a real lab draw" on 2026-09-26, which
made it honest to read and changed nothing about what it was, then removed: the
panels in Reviewer and StudyPreview, `simulateLabValuesFromScore()` in `infer-cxr`,
the insert in `useUploadDicom`, the seed script, and `lab-flags.tsx`. The table
stays, unused. `src/design.test.ts` fails any clinical surface rendering lab figures
(including `labs?.x` and `labs['x']` — the first pattern missed optional chaining,
caught by mutation) and any code that computes or writes them. A real lab feed would
come from the hospital's systems; nothing here should manufacture one.

A **tenth** shape was found on 2026-09-26, in the same family as the ROI
circles and in the same place a demo would meet it:

- `StudyPreview.tsx` drew an "Area of Interest" chip over the patient's
  radiograph whenever `risk_bucket !== "CLEAR"`, with **no check that any
  localisation existed**. The Gemini path returns none at all. It drew no
  circles, so it read as lighter than `buildLegacyHeatmap()` — but it makes the
  same assertion, that something was localised, with nothing behind it. CI's
  rule for that shape watches `Reviewer.tsx` only, and the Reviewer was already
  correct: it says "No localization for this study". The chip is now gated on
  `roi_heatmap_path` and `design.test.ts` pins it.

The lesson repeats the one from the ninth: a claim rule scoped to the file
where the defect was last seen does not cover the defect.

**`confidence` is not a measurement, and since 2026-10-04 is not displayed as one.**
Both scoring paths compute it as a monotone function of distance to the nearest
decision boundary — the score restated, never calibrated against outcomes. The API
and `triage_results` still carry it; the Reviewer and StudyPreview no longer print
"Confidence: NN%", and `design.test.ts` fails any clinical surface that renders
`confidence * 100`. Calibrating it would need held-out outcomes; until then it does
not appear.

**How these keep surviving:** `npx tsc --noEmit` checked zero files (see Frontend),
so "typecheck passes" was meaningless, and none of them were covered by a test.
Every instance was found by reading, not by tooling.

## Frontend

- Colors: `kx-*` tokens only. Type: `font-display` (Inter Tight), `font-editorial`
  (Instrument Serif), `font-mono`. Not `font-grotesk`.
- `@import` must be the first rule in `src/index.css`. Below the `@tailwind`
  directives it is silently stripped from production builds.
- JS-driven motion must check `prefers-reduced-motion`. CSS cannot stop a `<video>`.
- Wrap `sessionStorage` / `localStorage` in try/catch. It throws in storage-blocked
  browsers and an unguarded throw in `useEffect` blanks the page.
- `noUnusedLocals` is `false`. Dead imports will not fail the build. Grep when
  deleting.
- Run `npm run typecheck` before claiming done. **Not `npx tsc --noEmit`** — the
  root `tsconfig.json` is a solution file (`"files": []`, only `"references"`),
  and tsc ignores references without `--build`, so that command compiles nothing
  and always exits 0. It was CI's typecheck step and this file's instruction for
  weeks while checking zero files.

## Verification

`npm test` — 330 tests, Vitest. CI runs typecheck, tests, build, and a set of shell
assertions on the build output (`.github/workflows/ci.yml`).

**What is covered:** the ranking statistics behind the validation sprint; the SLA
replay engine (including that it can return a *negative* result — a metric that
cannot fail is a sales prop, not a measurement); cumulative RLS policy invariants
read from `supabase/migrations/`; edge-function ordering (authorise before touching
the service role); the waitlist invariant that `anon` may INSERT and nothing else,
at both the policy and table-grant level; and the published-number rules, which
read `services/ml-api/ensemble_weights.json` **at test time** and fail any shipped
file whose model-accuracy percentage or per-model fusion weight disagrees with it,
plus an arithmetic check that the illustrative per-model votes in `TraceSections`
still fuse to the score that panel prints. Reading the artifact rather than a
constant means retraining the model moves the assertion instead of breaking it.
Since 2026-09-25 the claim rules also scan `supabase/functions/**`, not just
`src/`: no edge function may derive a clinical value from a random number, none
may call `Math.random()` at all, `infer-cxr` must carry no synthetic third path,
and the triage bands must agree across the edge function, `inference.py` and
`ensemble_weights.json` — read at test time, so retraining moves the assertion.
Since 2026-09-26, `src/auth.test.ts` pins the approval gate and
`src/design.test.ts` pins the clinical palette, the localisation chip and the
simulated-lab label. The palette and lab rules enumerate their files by reading
`components/dashboard` and `components/reviewer` at test time, so a component
added tomorrow is covered without anyone remembering to add it, and the lab rule
carries a guard on itself because an `it.each` over a filtered list passes
vacuously when the filter matches nothing.
Both P0s from the 2026-07-28 review, both waitlist mutations, all four of the
published-number rules, both the Path C and the threshold rules, and all five of
the 2026-09-26 rules were mutation-tested: reintroducing any of them fails the
suite.

**What is not covered:** no component tests, no E2E, no live-database tests. The RLS
and edge-function suites are static analysis of SQL and source text, not behaviour.
They catch the specific defect classes already seen here; they cannot catch a new
class on their own. The next real upgrades are a live-Supabase test asserting an
unapproved user reads nothing, and a behavioural test POSTing malformed payloads at
a locally-served function.

**`supabase/functions/` is type-checked by CI since 2026-10-04** (`deno check`,
one step per function). Until then nothing checked the clinical path — `npm run
typecheck` is `tsc --build` over `src/`, and the vitest suites read edge-function
files as text — the same shape as the `npx tsc --noEmit` problem in Frontend. Two
flags matter: `--node-modules-dir=none`, because the root `package.json` otherwise
puts Deno in node_modules mode and it refuses `npm:` imports (auth-email-hook), and
`--no-lock`, so it writes no `deno.lock` into the checkout.

**Read time is `studies.reviewed_at`**, set by trigger `trg_studies_reviewed_at` on
the first transition into REVIEWED, never changed afterwards, client-supplied values
ignored (migration `20261004120000`). Analytics has no fallback to `updated_at`;
rows reviewed before the column existed are counted as untimed, not timed by proxy.
The trigger was behaviour-tested in real Postgres (PGlite) outside the repo; the
in-repo test is static, like the rest of the migration suite.

**The approval gate had no test until 2026-09-26, and it was broken.**
`AuthContext` cleared `loading` before the profile fetch resolved, so every
approved radiologist saw "Awaiting approval" flash on each load, and a failed
lookup stranded them there permanently with no error and no retry — `approved`
starts `false`, and nothing distinguished "denied" from "could not find out".
Found by reading, like every other defect in this file. `auth.test.ts` now pins
both shapes.

Say this plainly rather than implying coverage. When claiming something works, name
what was actually checked. "Typecheck passes" is not "this works" — the font bug,
the public DEV routes, and the fabricated ROI overlay all typechecked cleanly.

Run `/preflight` before any push.

## Skills

- `/preflight` — pre-ship gate. Run before every push.
- `/rls-audit` — cumulative RLS policy audit. Run before any migration ships.
- `/edge-function` — write or review a Supabase function without opening a PHI hole.
- `/sla-replay` — replay Kroix's ranking over a department's historical worklist to
  count avoided read-time breaches. Answers "would anyone pay" without deployment or
  clearance. Run this before `/validation-sprint`.
- `/validation-sprint` — the ranked-list experiment. Measures whether Kroix ranks
  like a radiologist, which is necessary but not sufficient: it says nothing about
  whether reordering helps anyone.
- `/market-check` — competitor and regulatory research, primary sources only.
- `/section-variants` — build N design variants, gallery them, apply one, delete the rest.

## Docs

- `docs/ARCHITECTURE.md` — system shape, trust boundaries, where PHI lives.
- `docs/DECISIONS.md` — why things are the way they are, and what would reverse them.
  Add an entry when making a durable call; skip turn-level choices.
- `SECURITY.md` — private disclosure path.

## Compaction

@.claude/COMPACT.md
