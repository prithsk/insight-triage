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

Never commit `.env`. Never put a secret in a `VITE_`-prefixed variable — Vite inlines
those into the public bundle.

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
- Run `npx tsc --noEmit` before claiming done.

## Verification

`npm test` — 106 tests, Vitest. CI runs typecheck, tests, build, and a set of shell
assertions on the build output (`.github/workflows/ci.yml`).

**What is covered:** the ranking statistics behind the validation sprint; the SLA
replay engine (including that it can return a *negative* result — a metric that
cannot fail is a sales prop, not a measurement); cumulative RLS policy invariants
read from `supabase/migrations/`; edge-function ordering (authorise before touching
the service role). Both P0s from the 2026-07-28 review were mutation-tested:
reintroducing either one fails the suite.

**What is not covered:** no component tests, no E2E, no live-database tests. The RLS
and edge-function suites are static analysis of SQL and source text, not behaviour.
They catch the specific defect classes already seen here; they cannot catch a new
class on their own. The next real upgrades are a live-Supabase test asserting an
unapproved user reads nothing, and a behavioural test POSTing malformed payloads at
a locally-served function.

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
