---
name: section-variants
version: 1.0.0
description: Generate N design variants of a landing/app section, put them in a comparison gallery, then apply the chosen one and delete the rest. (Kroix)
triggers:
  - give me variants
  - new variants
  - variant gallery
  - design options for this section
  - show me a few versions
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Section variants

The loop this repo uses for visual design: build several real, working versions of
one section, view them stacked on a throwaway route, pick one, ship it, delete the
losers. Ran five times in one session (heroes, about, info, metric, trace) before
this was written down.

Use when the user asks for options rather than an implementation: "give me 5
variants", "show me a few versions of this section", "I don't like this, what else
could it look like".

Do NOT use for a single known change. Going straight to the edit is faster.

---

## Step 1: Agree on the count and the reference material

Default to 5 unless told otherwise. Fewer than 3 is not a gallery; more than 7 is
unreviewable in one sitting.

If the user pasted screenshots of other products, name what you are actually taking
from each one before you build. "Rivet's browser-chrome mockup on faint grid lines"
is a usable instruction. "Rivet-inspired" is not, and produces five variants that
all look the same.

## Step 2: Build the variants

**Where they go.** One file exporting all variants of a section:
`src/components/landing/<Thing>Sections.tsx` exporting `<Thing>Bento`,
`<Thing>DarkStage`, etc. Heroes are the exception — one file each under
`src/components/landing/heroes/`, because they are large.

**Share the data, vary the presentation.** Put the facts in module-level consts at
the top of the file and have every variant read them. When the user compares, the
only variable should be the design. See `TraceSections.tsx`: `MODELS`, `FUSED`,
`AUDIT`, `STUDY` are declared once and all five variants render the same study.

**House style, non-negotiable:**
- Colors: `kx-*` tokens only (`kx-canvas`, `kx-surface`, `kx-surface2`, `kx-ink`,
  `kx-muted`, `kx-border`, `kx-critical`, `kx-accent2`, `kx-accent3`, `kx-tint2`,
  `kx-tint3`). Never raw hex in class names. Inline hex is fine for SVG fills and
  gradients where Tailwind cannot reach.
- Type: `font-display` (Inter Tight) for headings, `font-editorial` (Instrument
  Serif) for the occasional statement line, `font-mono` for data and labels. Do not
  reintroduce `font-grotesk` (Space Grotesk) — the user rejected it as looking
  "vibe-coded".
- Motion: wrap entrances in `<Reveal>` from `@/components/ui/reveal`. It takes
  `delayMs`, `direction`, `className`, and `style`.
- Rotate section backgrounds. Consecutive sections must not both be `bg-kx-canvas`.
  Cycle canvas -> surface -> tint2 -> tint3. The user's words: uniform white
  everywhere reads as unfinished.

**Any new animation must honor reduced motion.** CSS animations are covered by the
`@media (prefers-reduced-motion: reduce)` block already in `src/index.css`. Anything
driven by JS — `setInterval`, `setTimeout` chains, autoplaying `<video>` — must check
it explicitly. A `<video>` cannot be stopped from CSS; see the
`usePrefersReducedMotion` hook in `HeroVideoBackdrop.tsx`.

**Guard browser storage.** `sessionStorage` / `localStorage` throw a SecurityError
in storage-blocked browsers (Safari tracking prevention, locked-down hospital
machines). An unguarded throw inside `useEffect` unmounts the whole page to a blank
screen. Wrap in try/catch and fail open.

## Step 3: Build the gallery page

`src/pages/<Thing>Variants.tsx`, following the shape of the existing ones:

- A `VARIANTS` array of `{ n, name, note, C }` — `n` is a short code (T1, T2), `note`
  is one sentence on what makes this one different and what it borrows from.
- A sticky dark header (`bg-kx-ink`) with cross-links to the other galleries, so the
  user can move between them without going back to the address bar.
- Each variant rendered under a labeled bar showing `n`, name, and note.

## Step 4: Register the route — inside the DEV gate

In `src/App.tsx`, the variant routes live inside the `{import.meta.env.DEV && (...)}`
block. They are internal tooling; they must not be publicly reachable in production.

Verify tree-shaking actually drops them:
```bash
npx vite build && grep -l "HeroBeforeAfter" dist/assets/*.js && echo SHIPPED || echo dropped
```

## Step 5: Tell the user the URL

Give the literal link (`http://localhost:8080/trace-variants`) and one line per
variant on what to look for. Do not make them hunt.

Then stop. Picking is the user's job.

## Step 6: Apply the winner, delete the losers

When a variant is chosen:

1. Import it into `src/pages/Landing.tsx` and place it in the section slot. Most
   variants render their own `<section>` with heading and padding, so they replace
   the whole block rather than slotting inside one.
2. **Delete the losing variants and the gallery page.** They are dead weight the
   moment a decision is made. A gallery left behind becomes stale scaffolding — one
   of ours still carried instructional copy referring to a component deleted weeks
   earlier.
3. Remove the route and the now-unused imports from `App.tsx`.
4. Sweep for orphans: components, data consts, image imports, and hooks that only
   the deleted code used. `tsconfig` has `noUnusedLocals: false`, so dead imports
   will NOT fail the build. Grep for each removed symbol.

## Step 7: Verify

```bash
npx tsc --noEmit
```

Must be clean. If the section had motion or storage access, load the page once and
confirm it does not blank.

---

## Notes

- Two variants that differ only in spacing are one variant. If you cannot write a
  distinct one-sentence `note` for each, the set is too narrow — go back to Step 1.
- Uncommitted galleries accumulate fast. Five gallery pages and ~22 hero components
  reached one commit before anyone noticed. Delete on decision, not "later".
