---
name: preflight
version: 1.0.0
description: Pre-ship gate for Kroix. Runs the checks that caught real bugs here, in the order that fails fastest. (Kroix)
triggers:
  - preflight
  - ready to ship
  - before I push
  - is this safe to deploy
  - ship check
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
---

# Preflight

Run before any push or deploy. Every check below exists because something got
through without it.

`tsc` passing is not the bar. The font bug, the public DEV routes, and the
fabricated ROI overlay all typechecked cleanly and all reached production or
nearly did.

Fail fast: stop at the first RED and fix before continuing.

---

## 1. Types and build

```bash
npm run typecheck && npx vite build
```

**Use the npm script, never `npx tsc --noEmit`.** The root `tsconfig.json` is a
solution file — `"files": []` with only `"references"` — and tsc ignores project
references unless given `--build`. `npx tsc --noEmit` therefore compiles nothing
and exits 0 no matter what is broken. It was the CI typecheck step and the
instruction in CLAUDE.md for weeks, and it never once checked a file.

RED on any error. A warning about chunk size is expected and not a failure.

## 2. Secrets

Nothing sensitive may enter the repo. It is public.

```bash
git status --short
git diff --cached --name-only | grep -iE '\.env|secret|credential|\.pem|\.key$' && echo "RED: secret-shaped file staged" || echo "ok"
grep -rnE '(sk-[A-Za-z0-9_-]{20,}|fc-[a-f0-9]{24,}|eyJ[A-Za-z0-9_-]{20,}\.)' src/ supabase/ public/ 2>/dev/null && echo "RED: key-shaped string in source" || echo "ok"
```

`VITE_`-prefixed variables are inlined into the public bundle by Vite. A secret
in one is published, not configured. Only the Supabase URL and publishable anon
key belong there.

## 3. Production bundle leaks

DEV-only surfaces must actually disappear. `import.meta.env.DEV` gates the JSX,
but whether the module is dropped depends on tree-shaking succeeding across the
whole import graph.

```bash
npx vite build >/dev/null 2>&1
for marker in "HeroBeforeAfter" "Sort these chest X-rays" "VS-01"; do
  if grep -ql "$marker" dist/assets/*.js 2>/dev/null; then
    echo "RED: '$marker' shipped to production"
  else
    echo "ok: '$marker' absent"
  fi
done
rm -rf dist
```

Add a marker string here whenever a new DEV-only route is created.

## 4. Fonts survive the build

The `@import` in `src/index.css` must be the first rule in the file. Below the
`@tailwind` directives, PostCSS strips it and every font token silently falls
back to system-ui. This shipped undetected.

```bash
head -1 src/index.css | grep -q '@import' && echo "ok: import is first" || echo "RED: @import not first in index.css"
npx vite build >/dev/null 2>&1
grep -qc "fonts.googleapis" dist/assets/*.css dist/index.html 2>/dev/null && echo "ok: fonts in build" || echo "RED: fonts stripped from build"
rm -rf dist
```

## 5. Database, if migrations changed

```bash
git diff --name-only origin/main...HEAD | grep -q '^supabase/' && echo "migrations touched — run /rls-audit" || echo "no db changes"
```

If touched, run `/rls-audit` in full. Do not shortcut it by reading the diff:
permissive policies combine with OR, so a migration that looks correct in
isolation can be a no-op against the cumulative state.

Migrations are written but **not applied** by any push. Applying is a separate,
deliberate act.

## 6. Clinical honesty

Kroix displays model output to clinicians. Two specific classes of error matter
more than any styling issue:

- **Invented evidence.** Never render a region, overlay, or localization the
  model did not produce. When data is missing, say so. A hardcoded "fallback"
  overlay on a patient image is a fabricated finding.
- **Unearned claims.** Performance figures shown in the product or on the
  marketing site must distinguish measured results from projections. Kroix is
  pre-clearance; anything framed as clinical outcome needs to be labelled as
  modelled.

```bash
grep -rn "synthetic fallback\|hardcoded\|placeholder" src/pages/Reviewer.tsx src/components/reviewer/ 2>/dev/null || echo "ok"
```

## 7. Accessibility and runtime safety on new UI

- JS-driven motion (`setInterval`, `setTimeout` loops, autoplaying `<video>`)
  must check `prefers-reduced-motion`. CSS cannot stop a `<video>`.
- `sessionStorage` / `localStorage` access must be wrapped in try/catch. It
  throws in storage-blocked browsers and an unguarded throw inside `useEffect`
  unmounts the page to a blank screen.

```bash
git diff origin/main...HEAD -- 'src/**/*.tsx' | grep -n '^\+.*\(setInterval\|autoPlay\|sessionStorage\|localStorage\)' || echo "ok: none added"
```

## 8. Dead code

`noUnusedLocals` is `false`, so orphaned imports and components will not fail
the build. They accumulate silently.

```bash
git diff --stat origin/main...HEAD | tail -1
```

If the diff deleted a component, grep for its name across `src/` and confirm no
importer or stale reference survives.

---

## Report

```
PREFLIGHT
  types + build ....... PASS / RED
  secrets ............. PASS / RED
  bundle leaks ........ PASS / RED
  fonts ............... PASS / RED
  database ............ PASS / RED / n/a
  clinical honesty .... PASS / RED
  a11y + runtime ...... PASS / RED
  dead code ........... PASS / RED

VERDICT: safe to push / blocked on <check>
```

State what is unverified rather than implying full coverage. There is no test
suite and no CI, so preflight is the only automated gate that exists. It checks
the failures already seen; it cannot catch a new class on its own.
