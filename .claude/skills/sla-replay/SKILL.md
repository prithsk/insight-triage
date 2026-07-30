---
name: sla-replay
version: 1.0.0
description: Replay Kroix's ranking against a department's historical worklist to compute avoided SLA breaches. Answers "why would anyone pay" without deployment or clearance. (Kroix)
triggers:
  - sla replay
  - retrospective replay
  - would this have helped
  - avoided breaches
  - worklist export
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# SLA replay

The experiment that answers the commercial question rather than the technical one.

`/validation-sprint` measures Spearman ρ against a radiologist's ranking. That
proves Kroix ranks *like a radiologist*. It does not prove that ranking differently
helps anyone, and "does it help" is what a buyer is actually asking.

This replays Kroix's ordering against what a department already lived through, and
counts the read-time targets that would not have been missed.

---

## Why this shape

**The attribution problem.** Kroix's causal chain is reorder → read earlier →
clinician acts sooner → patient does better. Every arrow after the first is
confounded, and you cannot run the counterfactual on a real patient. Any claim of
improved outcomes is unprovable at this stage.

**SLA breach escapes it.** Did the study get read inside the window — yes or no.
Binary, countable, contractually tied to money, attributable by construction. No
counterfactual, no outcome inference, no IRB.

**Queue depth is the hidden variable.** The JACR Aidoc study (11,252 CTPA exams)
found a 32% turnaround-time reduction during work hours and **2.8 minutes,
p=0.345 — not significant — off-hours**. Reordering an empty queue does nothing.
Always segment results by queue depth; a flat overall number hides the mechanism
and will mislead the reader in both directions.

---

## The ask

One CSV. No images, no clinician time, no deployment.

| Column | Meaning | Required |
|---|---|---|
| `study_id` | Any stable identifier, may be a hash | yes |
| `arrived_at` | ISO timestamp the study landed in the worklist | yes |
| `read_at` | ISO timestamp it was signed / first opened | yes |
| `priority` | Their own flag (STAT / routine / …) as recorded | yes |
| `modality` | CXR, CT, … — filter to the modality Kroix scores | yes |
| `finding` | Ground-truth or final-report label, if available | preferred |
| `expedited_at` | Timestamp of the first callback / STAT upgrade / wet-read request | **ask for this** |
| `site` / `shift` | For segmenting | optional |

`expedited_at` is the highest-value optional column, because it is the only
radiologist-facing metric in the export. Ask for it explicitly; many RIS systems
log it and nobody thinks to request it.

Prefer de-identified. **Do not solicit images.** If the department offers PHI,
route it through the existing approved-user gate and say so explicitly; the replay
does not need pixels to run if `finding` is present.

Without `finding`, the replay can still measure ordering against their own priority
flag, which is weaker but not useless — say which mode ran in the writeup.

---

## Getting scores without moving images

The replay needs a Kroix score per study. A department's worklist export has no
score in it, and the whole point of asking for a CSV is that no image moves. That
tension resolves the way medical AI pilots normally do: **they run inference, not
you.**

Three modes. Only one produces a number you may show anyone.

| Mode | How | Reportable |
|---|---|---|
| `--scores <file>` | They run inference inside their own network and send back `study_id,score` | **Yes** |
| `--proxy` | Score derived from the report's finding text | No |
| *(neither)* | Fixed constant per band | No |

**The sidecar ask.** Give them something that runs locally against their PACS or a
folder of studies and writes a two-column CSV. No images leave, no PHI transfers,
no BAA or IRB needed for the imaging itself — only study identifiers and a number
come back. Then:

```
npm run replay -- worklist.csv --scores scores.csv --stat 30 --medium 240
```

**`--proxy` is for the conversation before that.** It scores from the finding text,
so it demonstrates the replay mechanics on their own data with zero setup. State
plainly what it measures: how well a finding label predicts read urgency. That is a
property of their labels, not of Kroix. Never present a proxy number as a model
result — the CLI marks it `[NOT REPORTABLE]` for that reason.

**Partial score coverage excludes rows rather than defaulting them.** A study with
no score in the sidecar is reported and dropped. Filling in a default would let
unscored studies sort to an arbitrary queue position and quietly move the result.

## Method

**1. Reconstruct the queue.** For each moment a read completed, determine what was
waiting. This is the whole trick: the counterfactual is not "read everything
faster", it is "read the same studies in a different order with the same
throughput."

**2. Hold throughput fixed.** The replay must not assume the department reads more
studies or reads them faster. Same number of reads, same completion times, different
assignment of which study fills each slot. Anything else is fantasy and a buyer will
say so.

**3. Score and reorder.** Run the ensemble (or the stored score, if scored already)
over the waiting set, and fill each read slot with the highest-priority waiting
study instead of the one actually read.

**4. Define the target before computing.** Read-time targets must be stated up
front, ideally taken from their real SLA:
- STAT / critical: commonly 30 or 60 minutes
- Urgent: 4 hours
- Routine: 24 hours

If they have a contract, use its numbers. If they do not, state the assumption
prominently and run a sensitivity sweep across plausible windows — a result that
only holds at one arbitrary threshold is not a result.

**5. Count.** Breaches actual vs breaches replayed, per severity band, per queue
depth bucket.

---

## Pre-registered thresholds

Commit before running, same discipline as the validation sprint.

Primary metric: **avoided breaches on the medium band**, as a fraction of actual
medium-band breaches.

| Result | Reading |
|---|---|
| ≥ 25% avoided | Real effect. This is a sales asset. |
| 10–25% | Marginal. Segment by queue depth before concluding anything. |
| < 10% | Reordering is not moving the metric in this department. |
| Negative | Kroix's ordering is worse than theirs. The most valuable outcome available. |

Also required:
- **Beat FIFO**, which is the incumbent. Reordering that cannot beat arrival order
  has no product.
- **Segment by queue depth.** Report the depth at which the effect appears. If the
  effect is confined to the busiest decile, say so — that is the ICP, not a defect.
- **Report the null loudly if it is null.** A negative replay costs days and saves
  a year.

---

## The interruption argument — three steps, only two are yours

This is the only line of reasoning that reaches a radiologist personally rather
than their department, and it reaches diagnostic error without ever claiming a
patient outcome. Run it in this order and do not skip step 1.

**Step 1 — establish the mechanism in THEIR data.** `expediteMechanism()` compares
how long expedited studies waited against everything else.

- `ratio` above ~1.5 → calls concentrate on long-waiting studies. Waiting causes
  calling *here*, so reading sooner will prevent calls.
- `ratio` near or below 1.0 → calls are driven by something else in this
  department. **Stop. Do not make the interruption argument.** It does not hold
  and a reader will find that out faster than you will.

**Step 2 — count what the replay prevents.** `expediteAnalysis()` counts expedite
requests where the replay finished the study *before* the moment someone called.
The call had no reason to happen.

**Step 3 — cite, do not claim.** You do not measure error reduction. You cite it:

> On-call radiologists field roughly 72 calls in a 12-hour overnight shift.
> Balint et al. (Academic Radiology, 2014) found one additional call in the
> preceding hour associated with a 12% increase in the likelihood of a discrepant
> report. Interruption time nearly equals interpretation time (52% interpreting,
> 29% active interruptions, 18% passive).

Steps 1 and 2 are your measurements on their data. Step 3 is someone else's
published finding, attributed. Never blur that line — the whole value of this
structure is that each claim is traceable to whoever actually earned it.

## Honesty constraints

- **This is retrospective and single-centre.** It is evidence, not proof, and it
  cannot establish clinical benefit. Say that in the writeup, every time.
- **Do not extrapolate to patient outcomes.** The replay measures read timing. It
  says nothing about whether earlier reads changed care, and claiming otherwise
  reintroduces exactly the attribution problem this design exists to avoid.
- **Do not present avoided breaches as dollars** unless the department supplies its
  own penalty schedule. Inventing a per-breach figure turns a real finding into a
  fabricated one.
- **One department is one department.** Queue dynamics differ enormously; the
  off-hours null in the published literature is the proof.

---

## Output

A short report per department:

```
SLA REPLAY — <site>, <date range>
  Studies replayed ........ N (modality, filters applied)
  Target windows .......... STAT <x>min / urgent <y>h / routine <z>h  [their SLA | assumed]
  Throughput held fixed ... yes

  Breaches, actual vs replayed
    critical .............. A -> B
    medium ................ A -> B     <- primary
    routine ............... A -> B
  vs FIFO baseline ........ ...

  By queue depth
    top decile ............ ...
    median ................ ...
    bottom decile ......... ...

  VERDICT: <threshold band>, effect concentrated at <depth>
  LIMITS: retrospective, single-centre, timing only — not a clinical-benefit claim
```

Then the honest sentence to a buyer: *"On your data, last quarter, this ordering
would have brought N medium-severity studies inside your read-time target that
missed it."*

That is a claim you can defend line by line, which is the entire point.
