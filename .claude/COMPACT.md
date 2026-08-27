# Compaction

What a summary of this project must carry forward. Use these exact headers so a
later session — and the person testing whether this file is honored at all — can
tell at a glance whether the spec was applied.

## STATE
Current branch, what is pushed vs local, and whether `main` and the working
branch have diverged. This project has had a real merge break because both sides
edited a generated file, so branch state is load-bearing, not bookkeeping.

## VERIFIED vs REPORTED
Split these. "Lovable said the trigger installed" and "the trigger was confirmed
by querying `pg_trigger`" are different facts, and the gap between them is where
this project's worst bugs have lived. Carry the evidence, not the conclusion:
name the command or query that established each claim. A conclusion with no
method behind it should be re-derived rather than inherited.

## OPEN
Work that is blocked on the user, each with what unblocks it. These persist for
weeks and are the actual critical path — the repo has repeatedly been further
along than the business. Do not drop an item because it has appeared in every
prior summary; that recurrence is the signal.

## CLAIMS
Any performance, clinical, or customer claim discovered in the code, and whether
it survived checking. Six fabrications shipped here; each was found by reading,
none by tooling. If a summary drops the list, the next session re-finds them from
zero. `src/claims.test.ts` now gates the known shapes — note when a new shape is
found that the gate would not catch.

## DECISIONS
Durable calls and what would reverse them. Skip turn-level choices. If a decision
is already recorded in `docs/DECISIONS.md` or `CLAUDE.md`, cite the file rather
than restating it.

## Not worth carrying

- Design variants that were built and rejected. The gallery is gone or the
  decision is in the code; a list of discarded options is noise.
- Tool output that has been superseded. Keep the current state, not the path to it.
- Content already durable in `CLAUDE.md`, `docs/ARCHITECTURE.md`, or
  `docs/DECISIONS.md`. Those files are re-read from disk after compaction.
