---
name: market-check
version: 1.0.0
description: Research a competitor or regulatory claim, verify it against primary sources, and write a dated analysis to the private project directory. (Kroix)
triggers:
  - research this competitor
  - competitive analysis
  - how are we different from
  - do we need FDA
  - is this regulated
  - check this claim
allowed-tools:
  - WebSearch
  - WebFetch
  - Read
  - Write
  - Edit
  - Bash
---

# Market and regulatory check

Kroix is a PHI-handling clinical product in a field where the wrong regulatory
assumption costs years. This skill exists because a specific failure keeps
happening: confident, well-formatted analysis that gives the commercially
convenient answer and cites nothing.

Use when researching a competitor, sizing a market, or answering "do we need FDA
clearance for X." Use also when the user brings an analysis from another source and
wants it evaluated.

---

## Rule 1: primary sources for anything load-bearing

A claim is load-bearing if a decision changes based on it. Regulatory status,
clearance class, funding, and what a competitor's product actually does are all
load-bearing.

For those, cite the primary source, not a summary of one:

| Claim type | Primary source |
|---|---|
| Device classification | eCFR (`21 CFR 892.*`), Federal Register classification orders |
| FDA guidance | fda.gov guidance PDF, with its revision date |
| Clearance exists | FDA 510(k) database, or the company's own FDA registration statement |
| What a product does | The company's own site and docs, fetched — not a press summary |
| Funding | The announcement or a filing, not an aggregator |

Trade press and aggregators are fine for discovery, not for the citation.

## Rule 2: an LLM saying it is not evidence

Twice in one session, LLM-generated analysis asserted that Kroix's workflow-only
prioritization carried little or no FDA burden. Both were confident, neither cited a
regulation, both were wrong: 21 CFR 892.2080 classifies computer-aided triage and
notification as Class II precisely *because* it is non-diagnostic queue reordering
driven by image analysis.

When the user brings outside analysis, do not adopt or reject it wholesale. Split it:

- **Adopt** the strategic framing that survives checking, and say so plainly.
- **Correct** the factual claims that fail, with the citation that refutes them.
- **Name the direction of the error.** If the wrong claims all happen to make the
  business easier, say that out loud. That pattern is the signal.

## Rule 3: separate what is true from what is built

When positioning material describes a capability, check whether it ships today. A
`lab_results` table existing in the schema is not multi-modal triage. Label roadmap
as roadmap. Do not let a strategy doc quietly promote an intention into a feature.

## Rule 4: write it down, privately

Output goes to:

```
~/.gstack/projects/prithsk-insight-triage/competitive-analysis-<YYYYMMDD>.md
```

**Never into the repo.** `prithsk/insight-triage` is public. Competitive positioning,
regulatory exposure, and buyer analysis do not belong in it.

Structure:
1. **Headline** — the one or two findings that change the plan, before any detail.
2. **The field** — per competitor: what it is, regulatory class, what it actually
   does, buyer, pricing if findable.
3. **Where the thesis holds and where it breaks** — argue against yourself here.
4. **Where we can capitalize** — ranked by defensibility, not by how good it sounds.
5. **Where we are structurally weak** — stated plainly. A doc without this is
   marketing.
6. **What this changes in the design doc** — a table mapping old claim to revision.
7. **Sources** — markdown links, every one used.

## Rule 5: hand regulatory questions to a human

This skill can establish what a regulation *says*. It cannot give a regulatory
opinion, and neither can the user's other AI tools. Anything that determines whether
the product can legally ship ends with: get a scoping call with an FDA regulatory
consultant or attorney. A classification opinion runs roughly $5k–25k; an FDA
pre-submission is free but queues ~70 days.

Say this every time. It does not get less true with repetition.

---

## Known ground (verified 2026-07-28, recheck before relying on it)

- **21 CFR 892.2080** — radiological computer-aided triage and notification (CADt)
  is **Class II**, 510(k) required. Covers software that aids prioritization "based
  on computer aided image analysis" and that "only send[s] a notification or change[s]
  queue order." Non-diagnostic is the category's definition, not an exemption.
- **Cures Act §3060** CDS exclusion requires all four criteria; the first fails for
  any software that acquires, processes, or analyzes a medical image. FDA reads
  "process or analyze" to include assessing clinical relevance of an image. The
  Jan 2026 revision (final Mar 2026) confirms AI/ML CDS on images is SaMD.
- **FDA-2025-P-5560** — petition to exempt radiology computer-aided software from
  Class II 510(k) was denied.
- **New Lantern** is registered **Class I** (image communications); their worklist
  orders on metadata (STAT, modality, assignment), not image scoring. That is why.
- Every cleared chest X-ray triage product targets time-critical or emergent
  findings: Annalise, Lunit, Qure.
