---
name: validation-sprint
version: 1.0.0
description: Run the ranked-list validation sprint — does Kroix's ordering match a radiologist's judgment? Protocol, PHI-safe data, pre-registered thresholds. (Kroix)
triggers:
  - validation sprint
  - test the ranking
  - does the model actually rank
  - ranked list harness
  - show a radiologist
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Validation sprint

The one experiment that gates everything else: **given real studies, does Kroix put
them in the order a radiologist would?**

Zero radiologists have used the product. The ensemble is trained and tested, but
detection accuracy and ranking quality are different properties — a model can score
95% on critical detection and be useless at ordering six ambiguous studies against
each other.

Source of truth: `~/.gstack/projects/prithsk-insight-triage/rkris-gstack-setup-design-20260728-154247.md`.

---

## Gate: book the human first

**Do not build the harness until the radiologist call is on the calendar.**

The harness is worthless without someone scheduled to look at it, and building it
first is the comfortable way to avoid the uncomfortable email. Scheduling a clinician
takes 2-4 weeks of calendar latency; the code takes a day. Start the slow thing first.

If asked to build the harness with no call booked, say so and ask.

---

## Data, and why this is the hard part

A founder cannot lawfully receive identifiable patient images without a BAA or DUA,
and for research use likely IRB review. The persuasive version of this exercise —
their own department's cases — is the legally hardest.

| Source | Status | Use |
|---|---|---|
| **NIH ChestX-ray14** | No credentialing | **Default. Start here so nothing blocks.** |
| **MIMIC-CXR** | PhysioNet credentialing + DUA + CITI cert, 1-2 weeks | Start the application day one, in parallel |
| **Departmental cases** | BAA/DUA, likely IRB | Only if the institution initiates. Do not solicit. |

Never route real PHI through a public URL. If real studies are ever used, they sit
behind the existing approved-user RLS gate.

## Pre-step: preprocessing sanity check

Before any human sees anything, reproduce held-out test-set performance on the exact
study source being used. Running the ensemble against a new source (public PNGs vs
departmental DICOM, different windowing or normalization) can silently degrade output,
which then gets misread as "the model cannot rank."

If performance on the new source does not match the original test set, stop. The
sprint measures nothing until it does.

---

## Protocol

Each rule here exists because skipping it makes the result meaningless.

### Study selection — never by model score

20 studies chosen by **ground-truth label**, weighted toward the medium band, plus a
few clear normals and clear criticals as anchors.

**Medium band** = clinically actionable but non-emergent: small pleural effusion,
early or patchy consolidation, nodule under 1cm, mild cardiomegaly, subtle
interstitial change. Defined by label, never by score.

Selecting studies by running the ensemble and taking mid-range scores lets the model
choose its own exam. The agreement figure that comes out is circular and worthless.
**Selection happens before inference runs.**

### Blinding

The radiologist ranks first, from a randomized, score-free presentation. Kroix's
ordering is revealed only in the debrief. Showing the model's order or its scores
first anchors the rater and destroys the measurement.

### Elicitation

Full ordinal ranking of 20 images is cognitively brutal and unreliable at the tails.
Instead: sort into **3 urgency buckets** (read first / routine / can wait), then force
a ranking **within the top bucket only**. About 30 minutes.

### Baselines and ceiling

- Compare against **random** ordering and against **FIFO** (arrival order), which is
  the actual incumbent. A model that cannot beat FIFO has no product.
- If at all possible, get a **second radiologist** to rank the same 20. Radiologists
  disagree substantially on ambiguous studies. If inter-rater agreement is 0.5, a
  model at 0.5 is at the human ceiling, and scoring that as failure would be wrong.

---

## Pre-registered thresholds

Commit to these **before** seeing results. Otherwise the sprint succeeds merely by
producing a number.

Primary metric: Spearman rank correlation on the medium-band subset.

| Result | Reading | Action |
|---|---|---|
| **ρ ≥ 0.6** | The ensemble ranks | Proceed to repositioning |
| **0.3 ≤ ρ < 0.6** | Gray zone, inconclusive | Retune ranking, re-run. Do not proceed. |
| **ρ < 0.3** | It is a detector, not a ranker | The medium-band product is invalid as built |

Also required:
- Beats both random and FIFO. Beating FIFO is the minimum bar for existing.
- At least one specific disagreement the radiologist can explain. Disagreements are
  more informative than agreements.
- **Independent of Kroix's output**, the radiologist confirms or refutes that the
  medium band is where their delay risk actually lives. Kroix could match perfectly
  and that premise still be false.

**Statistical honesty.** At n=20 with one rater, the confidence interval on a rank
correlation is roughly ±0.4. This is a **smoke test, not a validation study**. It
detects the extremes and cannot resolve the middle. Say so in any writeup. The gray
zone exists precisely because a mid-range result means "get more data," not "partial
success."

Failure is a valid outcome and arrives in days rather than after a dashboard rebuild.

---

## The harness

One screen, read-only, throwaway.

**Done means:**
- Renders 20 study cards from a local JSON file
- Thumbnail, study ID, score per card
- Existing `kx-*` tokens and existing card patterns only
- Zero new design tokens, zero new shared components
- Lives at a `validation/` route inside the `import.meta.env.DEV` gate
- Not publicly routable

**Tripwires:**
1. Not started until the call is booked.
2. Hard stop at end of day one. Ship whatever exists.
3. Any diff touching the dashboard or `src/components/landing/**` means the budget is
   blown.

This is not the product dashboard. "The UI can't be slop" is a real constraint and
also the exact sentence that turns one day into two months.

---

## Writing up

Report the number, the baselines, the ceiling if measured, and the disagreements
verbatim. State the confidence interval. Do not describe a gray-zone result as
partial success, and do not describe a single-rater n=20 result as validation.

If it fails, that is the most valuable finding available and it cost days.
