import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Guards on the approval gate.
 *
 * WHAT THIS IS: static analysis of source text, in the same idiom as
 * `supabase/rls.test.ts` and `src/claims.test.ts`. There is no DOM environment
 * in this project (`vitest.config.ts` sets `environment: "node"`), so none of
 * this renders a component or observes a real auth callback. It cannot prove the
 * gate behaves correctly. It pins the specific defect shapes described below so
 * they cannot return silently.
 *
 * WHAT IT WOULD TAKE TO DO BETTER: jsdom + @testing-library/react, and a test
 * that mounts ProtectedRoute against a stubbed Supabase client with a delayed
 * and a rejecting `profiles` response. That is the real upgrade; this is the
 * floor.
 *
 * THE DEFECT, as found on 2026-09-26:
 *
 * `AuthContext` cleared `loading` synchronously while deferring the profile
 * fetch through `setTimeout(..., 0)`. That produced at least one committed
 * render with `loading === false`, `user` set, and `approved` still at its
 * initial `false` — precisely the state `ProtectedRoute` reads as "signed in but
 * not approved". Every approved radiologist saw the "Awaiting approval" screen
 * flash on each load, for as long as the profile query took.
 *
 * The same code destructured only `data` from the query, discarding `error`. A
 * failed lookup was therefore indistinguishable from a refusal: `approved`
 * stayed `false`, no further render corrected it, and the user was stranded on
 * "Awaiting approval" with no error text and no retry. That is a wrong reason,
 * stated confidently, for being locked out of a clinical tool.
 */

const read = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf8");

const AUTH_CONTEXT = "src/contexts/AuthContext.tsx";
const PROTECTED_ROUTE = "src/components/ProtectedRoute.tsx";

describe("AuthContext: loading must not clear before approval is known", () => {
  const src = read(AUTH_CONTEXT);

  it("clears loading inside the profile fetch's completion handler", () => {
    // `loading` is the flag ProtectedRoute waits on. It has to be released by
    // whatever resolves the profile, not by the code that schedules it.
    expect(src).toMatch(/\.finally\(\s*\(\)\s*=>\s*\{[^}]*setLoading\(false\)/s);
  });

  it("does not clear loading on the signed-in path before the fetch is scheduled", () => {
    // Slice the signed-in branch: from where the user id is taken to where the
    // deferred fetch is scheduled. A `setLoading(false)` in that window is the
    // original bug exactly.
    const start = src.indexOf("const userId = nextSession.user.id");
    const end = src.indexOf("setTimeout", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(src.slice(start, end)).not.toMatch(/setLoading\(\s*false\s*\)/);
  });

  it("guards stale writes with a sequence check", () => {
    // Without this, a slow profile response for a signed-out session can
    // overwrite a newer signed-in one, or vice versa.
    expect(src).toMatch(/seq\s*!==\s*seqRef\.current/);
  });
});

describe("AuthContext: a failed profile lookup is not a refusal", () => {
  const src = read(AUTH_CONTEXT);

  it("destructures error from the profiles query, not only data", () => {
    const query = src.slice(src.indexOf("const loadProfile"), src.indexOf("useEffect("));
    expect(query).toMatch(/const\s*\{\s*data\s*,\s*error\s*\}/);
  });

  it("records the error rather than falling through to approved = false", () => {
    expect(src).toMatch(/setProfileError\(\s*error\./);
  });

  it("exposes profileError and a retry on the context", () => {
    expect(src).toMatch(/profileError:\s*string\s*\|\s*null/);
    expect(src).toMatch(/refreshProfile/);
    // Present in the provider value, not merely in the type.
    const value = src.slice(src.indexOf("<AuthContext.Provider"));
    expect(value).toMatch(/profileError/);
    expect(value).toMatch(/refreshProfile/);
  });

  it("clears the error on a successful read, so a retry can recover", () => {
    expect(src).toMatch(/setProfileError\(\s*null\s*\)/);
  });
});

describe("ProtectedRoute: three distinct negative answers", () => {
  const src = read(PROTECTED_ROUTE);

  it("checks profileError before it checks approved", () => {
    const errorCheck = src.indexOf("if (profileError)");
    const approvedCheck = src.indexOf("if (!approved)");
    expect(errorCheck).toBeGreaterThan(-1);
    expect(approvedCheck).toBeGreaterThan(-1);
    // Order is the whole assertion: reversed, an unreachable server renders
    // "Awaiting approval" again.
    expect(errorCheck).toBeLessThan(approvedCheck);
  });

  it("still waits on loading before deciding anything", () => {
    const loadingCheck = src.indexOf("if (loading)");
    expect(loadingCheck).toBeGreaterThan(-1);
    expect(loadingCheck).toBeLessThan(src.indexOf("if (!user)"));
  });

  it("offers a retry from the error state", () => {
    expect(src).toMatch(/refreshProfile\(\)/);
  });

  it("does not render PendingApproval as the error state", () => {
    const errorBlock = src.slice(src.indexOf("if (profileError)"), src.indexOf("if (!approved)"));
    expect(errorBlock).not.toMatch(/PendingApproval/);
  });
});
