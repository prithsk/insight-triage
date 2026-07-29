import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";

/**
 * Edge functions build a service-role client, which has BYPASSRLS. Every policy
 * protecting patient data is inert inside them, so the function IS the security
 * boundary for the duration of the request.
 *
 * `rag-embed` shipped with authentication but no input validation: it built the
 * service-role client and then interpolated caller-supplied `sourceId` straight
 * into a Pinecone vector id and an `embeddings` row.
 *
 * These tests assert the ordering invariant across every function, by source
 * analysis. They do not execute Deno. A behavioural test that POSTs malformed
 * payloads at a locally-served function is strictly better and is the next thing
 * to add; this is the version that runs without a Deno runtime in CI.
 */

// this file lives at supabase/functions/rag-embed/, so one level up is functions/
const FUNCTIONS_DIR = path.resolve(__dirname, "..");

/** Functions that legitimately need no auth: no PHI, rate-limited. */
const PUBLIC_BY_DESIGN = new Set(["send-contact-email", "validate-email"]);

function functionDirs(): string[] {
  return readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);
}

function sourceOf(fn: string): string | null {
  const p = path.join(FUNCTIONS_DIR, fn, "index.ts");
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

describe("edge functions: auth precedes the service-role client", () => {
  const dirs = functionDirs();

  it("finds the functions to check", () => {
    expect(dirs.length).toBeGreaterThan(0);
  });

  for (const fn of functionDirs()) {
    const src = sourceOf(fn);
    if (!src) continue;

    const usesServiceRole = /SUPABASE_SERVICE_ROLE_KEY/.test(src);
    if (!usesServiceRole) continue;

    it(`${fn}: authorises before using the service role in the handler`, () => {
      if (PUBLIC_BY_DESIGN.has(fn)) return;

      // Only ordering *inside the request handler* matters. Reading env vars
      // into module-level constants at the top of the file is fine; what must
      // not happen is touching the service role before the caller is checked.
      const handlerAt = src.search(/serve\s*\(/);
      expect(handlerAt, `${fn}: expected a serve() handler`).toBeGreaterThan(-1);
      const handler = src.slice(handlerAt);

      const authAt = handler.search(/requireApprovedUser\s*\(/);
      // Any route to RLS bypass: building a client, or handing the key onward.
      const useAt = handler.search(
        /createClient\s*\(|SUPABASE_SERVICE_ROLE_KEY|serviceKey|SERVICE_ROLE_KEY/
      );

      expect(authAt, `${fn} uses the service role but never authorises`).toBeGreaterThan(-1);
      expect(useAt, `${fn}: expected service-role usage in the handler`).toBeGreaterThan(-1);
      expect(
        authAt,
        `${fn}: requireApprovedUser must run before anything touches the service role`
      ).toBeLessThan(useAt);
    });
  }
});

describe("rag-embed: validates before it can write", () => {
  const src = sourceOf("rag-embed");

  it("has a source file", () => {
    expect(src).not.toBeNull();
  });

  it("validates the payload before constructing the service-role client", () => {
    const validateAt = src!.search(/validateEmbedRequest\s*\(/);
    const clientAt = src!.search(/createClient\s*\([^)]*SERVICE_ROLE/);
    expect(validateAt).toBeGreaterThan(-1);
    expect(
      validateAt,
      "a malformed or hostile payload must never reach an RLS-bypassing connection"
    ).toBeLessThan(clientAt);
  });

  it("constrains action to an explicit allowlist rather than trusting the cast", () => {
    expect(src!).toMatch(/VALID_ACTIONS/);
    expect(src!).toMatch(/VALID_ACTIONS\.includes\(/);
  });

  it("requires sourceId to be a UUID, since it is interpolated into an external key", () => {
    expect(src!).toMatch(/UUID_RE/);
    expect(src!).toMatch(/UUID_RE\.test\(/);
  });

  it("caps unbounded caller input", () => {
    // Unbounded content becomes an unbounded bill at an embedding endpoint.
    expect(src!).toMatch(/MAX_CONTENT_CHARS/);
    expect(src!).toMatch(/MAX_METADATA_KEYS/);
  });

  it("rejects malformed JSON as 400 rather than throwing a 500", () => {
    expect(src!).toMatch(/Invalid JSON body/);
  });
});

describe("client callers send the session JWT, not the anon key", () => {
  const HOOKS = path.resolve(__dirname, "..", "..", "..", "src", "hooks");

  it("no hook sends the publishable key as a bearer token", () => {
    // The anon key authenticates as nobody. getUser() rejects it, so the call
    // 401s for every user — this silently broke DICOM inference.
    const offenders: string[] = [];
    for (const f of readdirSync(HOOKS).filter((f) => f.endsWith(".ts"))) {
      const src = readFileSync(path.join(HOOKS, f), "utf8");
      if (/Bearer\s*\$\{\s*import\.meta\.env\.VITE_SUPABASE_PUBLISHABLE_KEY\s*\}/.test(src)) {
        offenders.push(f);
      }
    }
    expect(
      offenders,
      `these send the anon key where a session JWT belongs:\n${offenders.join("\n")}`
    ).toEqual([]);
  });
});
