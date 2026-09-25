import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

/**
 * Static analysis of the cumulative RLS policy state.
 *
 * Both P0 holes found in this codebase were invisible in the diff that
 * introduced them and only appear when migrations are read in order as one
 * accumulating state:
 *
 *   1. `embeddings` / `medical_literature` carried "Service role can manage"
 *      FOR ALL USING (true) with no TO clause. Permissive policies are OR-ed, so
 *      a strict approved-user SELECT policy added beside it was a no-op.
 *   2. `profiles` carried FOR UPDATE USING (auth.uid() = user_id) with no
 *      WITH CHECK. Six months later `approved` and `role` were added to that
 *      table, and any signup could PATCH themselves to admin.
 *
 * These tests do not connect to a database. They read the SQL and assert the
 * invariants that, if violated again, reopen those holes. That is deliberately
 * cheap so it runs on every commit.
 *
 * A third case, not a hole but the same shape: all seven policies on
 * `storage.objects` carried no TO clause, so they applied to `anon` as well as
 * `authenticated`. They denied `anon` anyway, because every predicate ends in
 * `public.is_approved_user()` / `is_admin_user()` and those read `profiles` for
 * `auth.uid()`, which is NULL with no JWT. The rules here never noticed because
 * `storage.objects` was absent from PHI_TABLES — so the bucket holding the DICOM
 * images was the one PHI surface the TO-clause rule did not cover.
 * 20260925120000 scoped all seven to `authenticated`; the list below now
 * includes the table, and the first test asserts the list actually resolves.
 *
 * A live-database test asserting an unapproved user actually reads nothing is
 * strictly better and is the next thing to add. This is the version that exists
 * today rather than the version that requires a running Supabase.
 */

const MIGRATIONS_DIR = path.resolve(__dirname, "migrations");

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // timestamp-prefixed, so lexical sort is chronological
}

function allSql(): string {
  return migrationFiles()
    .map((f) => readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

/** Policy names created but never dropped by a later migration. */
function livePolicies(): { name: string; table: string; body: string }[] {
  const sql = allSql();

  const dropped = new Set<string>();
  for (const m of sql.matchAll(/DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"([^"]+)"\s+ON\s+([\w.]+)/gi)) {
    dropped.add(`${m[1]}::${m[2].toLowerCase()}`);
  }

  const live: { name: string; table: string; body: string }[] = [];
  for (const m of sql.matchAll(
    /CREATE\s+POLICY\s+"([^"]+)"\s*\n?\s*ON\s+([\w.]+)([\s\S]*?);/gi
  )) {
    const [, name, table, body] = m;
    const key = `${name}::${table.toLowerCase()}`;
    // A policy dropped and then recreated is live; we only care that the final
    // CREATE for a given name survives, which the last-write-wins scan gives us.
    live.push({ name, table: table.toLowerCase(), body });
    if (dropped.has(key)) {
      // keep it — recreation after a drop is the normal idempotent pattern
    }
  }

  // Collapse to the final definition per (name, table)
  const finalByKey = new Map<string, { name: string; table: string; body: string }>();
  for (const p of live) finalByKey.set(`${p.name}::${p.table}`, p);

  return [...finalByKey.values()].filter((p) => {
    const key = `${p.name}::${p.table}`;
    const lastCreate = sql.lastIndexOf(`CREATE POLICY "${p.name}"`);
    const lastDrop = Math.max(
      sql.lastIndexOf(`DROP POLICY IF EXISTS "${p.name}"`),
      sql.lastIndexOf(`DROP POLICY "${p.name}"`)
    );
    void key;
    return lastCreate > lastDrop;
  });
}

/**
 * Every table a policy failure would expose patient data through.
 *
 * `storage.objects` belongs here and was missing until 2026-09-25, which is why
 * the TO-clause rule below never covered the image bucket even though all seven
 * of its policies omitted one. It is the schema-qualified outlier in a list of
 * `public.*` tables, and it is also the most sensitive entry: it holds the DICOM
 * chest X-rays themselves.
 *
 * Note what this list does *not* buy for `storage.objects`. The "RLS enabled
 * wherever policies exist" test below filters to `public.*`, because
 * `storage.objects` is owned by Supabase and no migration here may ALTER it.
 * So RLS being on for that table is assumed, not asserted — it is the one
 * precondition in this file that nothing checks.
 */
const PHI_TABLES = [
  "public.studies",
  "public.triage_results",
  "public.lab_results",
  "public.feedback_events",
  "public.documents",
  "public.embeddings",
  "public.medical_literature",
  "storage.objects",
  // Added 2026-09-25 alongside 20260925130000_scope_profile_policies.sql. Not a
  // PHI table itself, but every PHI policy in the schema delegates to
  // is_approved_user()/is_admin_user(), which read it — so a policy failure here
  // exposes patient data through all seven of the others at once. It also held
  // four unscoped policies until that migration.
  "public.profiles",
];

describe("RLS: no permissive policy grants blanket access", () => {
  it("resolves policies on every PHI table, so the rules below cannot pass vacuously", () => {
    // `livePolicies()` reads the table out of `ON <table>` with [\w.]+ and keys
    // everything lowercased, so `storage.objects` resolves the same way
    // `public.studies` does. This asserts that rather than assuming it: a rule
    // that filters on a name nothing matches is a green test covering nothing,
    // which is how storage.objects went uncovered in the first place.
    const byTable = new Map<string, number>();
    for (const p of livePolicies()) byTable.set(p.table, (byTable.get(p.table) ?? 0) + 1);

    const uncovered = PHI_TABLES.filter((t) => !byTable.has(t));
    expect(
      uncovered,
      `No live policy resolved for these PHI tables. Either they lost RLS ` +
        `entirely or livePolicies() stopped matching their name:\n${uncovered.join("\n")}`
    ).toEqual([]);

    // The seven storage policies (3 dicom-files + 4 documents) are the ones this
    // list was extended to reach.
    expect(byTable.get("storage.objects")).toBe(7);
  });

  it("no live policy on a PHI table uses USING (true)", () => {
    const offenders = livePolicies()
      .filter((p) => PHI_TABLES.includes(p.table))
      .filter((p) => /USING\s*\(\s*true\s*\)/i.test(p.body))
      .map((p) => `${p.table} :: "${p.name}"`);

    expect(
      offenders,
      `Permissive policies are OR-ed together, so USING (true) grants access ` +
        `regardless of any stricter policy beside it:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("no live policy on a PHI table omits its TO clause", () => {
    // Without TO, a policy applies to every role including anon.
    const offenders = livePolicies()
      .filter((p) => PHI_TABLES.includes(p.table))
      .filter((p) => !/\bTO\s+(authenticated|service_role|anon)\b/i.test(p.body))
      .map((p) => `${p.table} :: "${p.name}"`);

    expect(
      offenders,
      `A policy with no TO clause applies to every role, anon included:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("does not create service_role policies, which are unnecessary and dangerous", () => {
    // service_role has BYPASSRLS. A "service role can manage" policy grants it
    // nothing it lacks, while granting everyone else everything if TO is omitted.
    const offenders = livePolicies()
      .filter((p) => /service\s*role/i.test(p.name))
      .map((p) => `${p.table} :: "${p.name}"`);

    expect(offenders).toEqual([]);
  });
});

describe("RLS: privilege columns cannot be self-granted", () => {
  it("every update policy on profiles carries a WITH CHECK", () => {
    // USING without WITH CHECK reuses USING as the row check, so only the key
    // column is protected and every other column is writable. That is how the
    // escalation happened.
    //
    // This used to exempt the admin policy, on the reasoning that USING
    // (is_admin_user()) tests the caller rather than the row and that the
    // trigger is the real enforcement. Both remain true — but an UPDATE policy
    // with no WITH CHECK is the exact shape of this repo's P0, and leaving one
    // in place meant the rule could not catch a recurrence on the very table it
    // was written for. 20260925130000 gave the admin policy its WITH CHECK, so
    // the exemption is gone and this now covers EVERY update policy on profiles.
    const offenders = livePolicies()
      .filter((p) => p.table === "public.profiles")
      .filter((p) => /FOR\s+UPDATE/i.test(p.body))
      .filter((p) => !/WITH\s+CHECK/i.test(p.body))
      .map((p) => `"${p.name}"`);

    expect(
      offenders,
      `Self-update policy on profiles without WITH CHECK:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("a trigger guards approved and role", () => {
    // Enforcement must not live only in a policy predicate: a trigger holds
    // regardless of which policy permitted the write.
    const sql = allSql();
    expect(sql).toMatch(/CREATE\s+TRIGGER\s+\w*privilege\w*/i);
    expect(sql).toMatch(/NEW\.approved\s+IS\s+(NOT\s+)?DISTINCT\s+FROM\s+OLD\.approved/i);
    expect(sql).toMatch(/NEW\.role\s+IS\s+(NOT\s+)?DISTINCT\s+FROM\s+OLD\.role/i);
  });

  it("profiles has no DELETE policy, closing the delete-then-reinsert path", () => {
    // The INSERT policy allows a self-row with any column values. It is only safe
    // because user_id is UNIQUE and the row already exists. A DELETE policy would
    // let a user drop and recreate themselves as approved.
    const deletes = livePolicies().filter(
      (p) => p.table === "public.profiles" && /FOR\s+DELETE/i.test(p.body)
    );
    expect(deletes).toEqual([]);
  });
});

describe("RLS: enabled wherever policies exist", () => {
  it("every table with a policy also has RLS turned on", () => {
    const sql = allSql();
    const enabled = new Set(
      [...sql.matchAll(/ALTER\s+TABLE\s+([\w.]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi)].map((m) =>
        m[1].toLowerCase()
      )
    );

    const policied = new Set(
      livePolicies()
        .map((p) => p.table)
        .filter((t) => t.startsWith("public."))
    );

    const missing = [...policied].filter((t) => !enabled.has(t));
    expect(
      missing,
      `Policies without RLS enabled are decorative; the table is wide open:\n${missing.join("\n")}`
    ).toEqual([]);
  });
});

describe("RLS: the public waitlist is write-only for anon", () => {
  // waitlist_signups is the ONLY table an unauthenticated visitor may write to.
  // The asymmetry is the whole design: anon INSERTs, anon never reads. A signup
  // list is names, work emails, and institutions — an anon-readable one publishes
  // the pipeline to anyone who finds the REST endpoint, and it would look
  // completely normal in the app.
  const waitlistPolicies = () =>
    livePolicies().filter((p) => p.table.toLowerCase().endsWith("waitlist_signups"));

  it("exists at all, so the rest of this block cannot pass vacuously", () => {
    expect(waitlistPolicies().length).toBeGreaterThan(0);
  });

  it("grants anon nothing except INSERT", () => {
    const offenders = waitlistPolicies()
      .filter((p) => /\bTO\b[^)]*?\banon\b/i.test(p.body))
      .filter((p) => !/FOR\s+INSERT/i.test(p.body))
      .map((p) => `${p.table}: "${p.name}"`);

    expect(
      offenders,
      `anon may only INSERT into the waitlist. These policies give it more:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("has no policy missing a TO clause, which would silently include anon", () => {
    const offenders = waitlistPolicies()
      .filter((p) => !/\bTO\s+/i.test(p.body))
      .map((p) => `${p.table}: "${p.name}"`);

    expect(
      offenders,
      `A policy with no TO clause applies to every role including anon:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  it("gates every SELECT behind is_admin_user()", () => {
    const selects = waitlistPolicies().filter((p) => /FOR\s+SELECT/i.test(p.body));
    expect(selects.length).toBeGreaterThan(0);
    for (const p of selects) {
      expect(p.body, `"${p.name}" must gate reads on is_admin_user()`).toMatch(
        /is_admin_user\s*\(\s*\)/i
      );
    }
  });

  it("does not GRANT anon anything beyond INSERT at the table level", () => {
    // RLS filters rows; table grants decide whether the verb may be attempted at
    // all. Both have to be narrow or the other one is decorative.
    const sql = allSql();
    const grants = [
      ...sql.matchAll(/GRANT\s+([\w\s,]+?)\s+ON\s+([\w.]*waitlist_signups)\s+TO\s+([\w\s,]+?);/gi),
    ];
    expect(grants.length).toBeGreaterThan(0);

    for (const [, verbs, , roles] of grants) {
      if (!/\banon\b/i.test(roles)) continue;
      const granted = verbs
        .split(",")
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean);
      expect(granted, `anon was granted more than INSERT: ${granted.join(", ")}`).toEqual([
        "INSERT",
      ]);
    }
  });
});

describe("RLS: security definer helpers are hardened", () => {
  it("every SECURITY DEFINER function pins search_path", () => {
    const sql = allSql();
    const fns = [
      ...sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION[\s\S]*?SECURITY\s+DEFINER([\s\S]*?)(?:AS\s+\$\$|LANGUAGE)/gi),
    ];
    expect(fns.length).toBeGreaterThan(0);
    for (const [, tail] of fns) {
      expect(tail).toMatch(/SET\s+search_path\s*=/i);
    }
  });
});
