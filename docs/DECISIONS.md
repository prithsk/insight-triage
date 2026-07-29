# Decisions

Why things are the way they are. Solo project, so this is the only place the
reasoning survives.

One entry per durable decision: architecture, scope, vendor, regulatory, or a
reversal. Not turn-level choices. Newest first.

Format: **what was decided**, **why**, **what would reverse it**. That last field
matters most — a decision without a stated reversal condition becomes dogma.

---

## 2026-07-29 · Measure SLA compliance, not clinical outcome

**Decided.** Stop framing Kroix's value as "better patient outcomes." Frame it as
"fewer breached read-time targets."

**Why.** Founders Inc CEO feedback, via an analogy worth keeping: someone offers to
clean your floors and you say yes, but nobody can prove a visitor left *because of*
the floors. You cannot see what their eyes saw. Triage has the same shape — the
causal chain runs reorder → read earlier → clinician acts sooner → patient does
better, and every arrow after the first is confounded.

SLA breach rate escapes this. It is binary, countable, contractually tied to money
(teleradiology penalties), and attributable by construction: did the study get read
inside the window, yes or no. No counterfactual required, no patient-outcome
inference, no IRB.

**Reverses if.** A pilot department cares about outcomes and not SLAs, or a
regulatory path requires outcome evidence anyway (a 510(k) may).

---

## 2026-07-29 · The medium-band wedge and the attribution problem are the same fact

**Decided.** Treat "unclaimed" and "unprovable" as the same finding rather than two
separate ones, and price that into every plan.

**Why.** Critical-band attribution is easy: a missed pneumothorax is dramatic,
litigable, and has a clean metric (door-to-read). That is why every incumbent went
there. Medium-band attribution is hardest: a small effusion read four hours late
usually produces nothing measurable, occasionally escalates, and the effect is
statistical, low-frequency, high-consequence.

The medium band is unclaimed **because** it resists proof, not because nobody
thought of it. Any plan that treats the gap as free money is wrong.

**Reverses if.** The retrospective replay (below) produces a clean medium-band SLA
delta, which would mean the effect is measurable after all at the queue level even
if not at the patient level.

---

## 2026-07-29 · Value is a function of queue depth, not ranking quality

**Decided.** ICP is high-volume, backed-up departments. Deprioritise quiet
outpatient sites regardless of how well the model ranks.

**Why.** The JACR Aidoc study (11,252 CTPA exams, retrospective pre/post) found
turnaround time fell 68.9 → 46.7 min during work hours, a 32% reduction — but
off-hours savings were **2.8 minutes and not statistically significant (p=0.345)**.
Reordering an empty queue does nothing. Value exists only where demand exceeds
capacity.

**Reverses if.** Never, structurally — but the threshold queue depth where value
appears is unknown and worth measuring.

---

## 2026-07-29 · Retrospective replay before the radiologist ranking sprint

**Decided.** Build the replay harness first. The ranking sprint becomes a
follow-on that validates the replay's assumptions.

**Why.** The ranking sprint measures Spearman ρ against one radiologist's ordering.
That answers "does Kroix rank like a radiologist" and says nothing about whether
anyone would pay. The replay answers the business question directly, and needs a
CSV export rather than 30 minutes of a busy clinician's attention — a far smaller
ask that produces a far larger artifact.

If the replay shows no SLA improvement, ranking quality is moot.

**Reverses if.** No department will share even a de-identified worklist export, in
which case the ranking sprint is the only path left.

---

## 2026-07-29 · Do not pivot to diagnostic

**Decided.** Stay non-diagnostic. Reject the "diagnostic is oversaturated,
non-diagnostic isn't" framing.

**Why.** That framing is backwards on the facts. Non-diagnostic triage is the CADt
category, which has the largest installed base of any clinical AI in healthcare as
of 2026, with hundreds of cleared products (Aidoc, Viz.ai, Annalise, Lunit, Qure).
The uncrowded lane is not "non-diagnostic" — it is the medium-severity band, where
Kroix already sits. Diagnostic (CADe/CADx) carries a higher regulatory bar and a
worse competitive field.

**Reverses if.** Primary-source evidence contradicts the CADt saturation finding.

---

## 2026-07-29 · The patent is not treated as a moat

**Decided.** Record the patent as neutral, not as a strength, in any internal
planning.

**Why.** A workflow-method patent with no clearance, no users, and no revenue is a
lottery ticket. Incumbents carry freedom-to-operate counsel. It may have value
later; it defends nothing today.

**Reverses if.** Counsel gives a specific opinion that the claims block a named
competitor's shipped behaviour.

---

## 2026-07-28 · Kroix is a Class II device; stop looking for an exemption

**Decided.** Treat Kroix as regulated under 21 CFR 892.2080 (CADt, Class II,
510(k)). Approach C is reframed from "find an exemption" to "find the cheapest
compliant path."

**Why.** The CADt definition covers software that aids prioritisation "based on
computer aided image analysis" and that "only send[s] a notification or change[s]
queue order." That is a literal description of the product. Non-diagnostic is
what defines the category, not an exemption from it. The Cures Act §3060 CDS
exclusion fails on its first criterion for anything that processes a medical
image, and the Jan 2026 guidance revision tightened this. FDA also denied a 2025
petition (FDA-2025-P-5560) seeking exactly this exemption for radiology AI.
Independently: every cleared competitor (Aidoc, Viz.ai, Annalise, Lunit, Qure) is
non-diagnostic triage and every one of them holds a 510(k).

**Reverses if.** A regulatory attorney or FDA pre-sub says otherwise in writing.
Two LLM analyses claimed no burden; both were wrong and both were confident. This
gets answered by someone with liability insurance.

---

## 2026-07-28 · Multi-modal is roadmap, not capability

**Decided.** Do not pitch labs/vitals fusion as shipped. Current product is a
three-model chest X-ray ensemble.

**Why.** A `lab_results` table exists but does not feed the triage score. External
positioning material described multi-modal triage as if it were live.

**Reverses if.** Lab signals actually enter the ranking. Note the regulatory fork:
a **labs-only** prioritiser has a plausible non-device path, an **image-scoring**
one does not, and **fused** inherits the image burden.

---

## 2026-07-28 · Validate ranking before building anything else

**Decided.** A-then-C from the design doc. Ranked-list validation sprint first,
regulatory scoping in parallel, repositioning deferred.

**Why.** Zero radiologists have used the product. Every conversation predates the
build. Detection accuracy and ranking quality are different properties; a model
can score 95% on critical detection and be useless at ordering ambiguous studies.
The sprint costs days using assets that already exist.

**Reverses if.** The sprint returns ρ ≥ 0.6 on the medium band (proceed) or < 0.3
(the ensemble is a detector, not a ranker, and the wedge needs rethinking).

**Live caveat.** The harness exists at `/validation` but the fixture carries
placeholder scores and no radiologist call is booked. Building the harness before
sending the email was the comfortable order, not the useful one.

---

## 2026-07-28 · Enforce privilege columns with a trigger, not a policy

**Decided.** A `BEFORE UPDATE` trigger on `profiles` guards `approved` and `role`.
The tightened policy is secondary.

**Why.** Policy predicates cannot express "this column may not change" without
subquerying the same table under RLS. A trigger holds regardless of which policy
permitted the write, so a future permissive policy cannot silently reopen the
hole — which is exactly how the original escalation happened: a January
self-update policy plus a July privilege column, neither wrong alone.

**Reverses if.** Postgres gains column-level RLS that expresses this directly.

---

## 2026-07-28 · Migrate the app shell to `kx-*` in one pass

**Decided.** All 12 authenticated-app files moved off `landing-*` onto `kx-*`
rather than screen by screen.

**Why.** The palettes are visually distinct (warm sage vs cool neutral). A partial
migration puts a sage nav above a neutral screen and reads as broken. Either
migrate the shell or leave it consistent; there is no good middle.

**Reverses if.** Nothing foreseeable. `landing-*` is gone from `src/`.

---

## 2026-07-28 · Never render evidence the model did not produce

**Decided.** Removed the hardcoded "synthetic fallback" ROI circles from the
reviewer. Missing localization is stated in words.

**Why.** When no heatmap data existed, the viewer drew circles at fixed
coordinates labelled "Right Lung" / "Lower Lobes" over the real patient image. A
radiologist sees the model localizing a finding it never localized. In a clinical
tool that is a fabricated result, not a placeholder.

**Reverses if.** Never. Encoded in `CLAUDE.md` and `/preflight`.

---

## 2026-07-28 · Strategy artifacts stay out of the repo

**Decided.** Competitive analysis, regulatory exposure, and buyer research live in
`~/.gstack/projects/prithsk-insight-triage/`. The repo carries code and
engineering docs only.

**Why.** `prithsk/insight-triage` is public.

**Reverses if.** The repo goes private.

---

## 2026-07-28 · Stop tracking `.env`

**Decided.** `git rm --cached .env`; secrets live outside the repo
(`~/.gbrain/.env`, `~/.firecrawl/.env`).

**Why.** `.env` had been committed before the `.gitignore` rule existed, and
gitignore does not apply to already-tracked files. The three values in it were
`VITE_`-prefixed Supabase publishable values — public by design, so no rotation
needed — but the pattern meant any future secret added to that file would
auto-publish.

**Reverses if.** Never.

---

## Older

Decisions before 2026-07-28 were not recorded. Reconstructable from
`supabase/migrations/` and git history, with the reasoning lost.
