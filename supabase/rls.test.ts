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

const PHI_TABLES = [
  "public.studies",
  "public.triage_results",
  "public.lab_results",
  "public.feedback_events",
  "public.documents",
  "public.embeddings",
  "public.medical_literature",
];

describe("RLS: no permissive policy grants blanket access", () => {
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
  it("every SELF-update policy on profiles carries a WITH CHECK", () => {
    // USING without WITH CHECK reuses USING as the row check, so only the key
    // column is protected and every other column is writable. That is how the
    // escalation happened.
    //
    // Scoped to self-update policies (those keyed on auth.uid()). The admin
    // policy is USING (is_admin_user()) — a property of the caller, not the row —
    // and admins are *supposed* to change approved/role in order to approve
    // people. What stops an admin policy being abused is the trigger, asserted
    // separately below.
    const offenders = livePolicies()
      .filter((p) => p.table === "public.profiles")
      .filter((p) => /FOR\s+UPDATE/i.test(p.body))
      .filter((p) => /auth\.uid\(\)/i.test(p.body))
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
