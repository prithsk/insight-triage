#!/usr/bin/env node
/**
 * Seed the worklist with real chest radiographs, through the app's own upload
 * path, and report which ones the model actually scored.
 *
 *   KROIX_EMAIL=you@example.com KROIX_PASSWORD=... node scripts/seed-demo.mjs [folder]
 *
 * Folder defaults to ~/Downloads/kroix-test-xrays. Credentials come from the
 * environment only — never put them in this file; the repository is public.
 * The account must be APPROVED (profiles.approved = true), or infer-cxr
 * answers 403.
 *
 * WHAT IT DOES, per file — the same five steps as `useUploadDicom`:
 *   1. upload to the `dicom-files` bucket
 *   2. insert a `studies` row, status PROCESSING
 *   3. POST infer-cxr with the signed-in user's JWT
 *   4. scored   → insert `triage_results` (+ simulated labs), status QUEUED
 *      unscored → no triage row, status PENDING ("awaiting triage")
 *   5. print the outcome
 *
 * It uploads ONE file first and stops if that one does not score, with the
 * reason. Seeding sixteen unscored studies would fill the worklist with
 * "awaiting triage" rows and prove nothing.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: mark studies REVIEWED. Analytics measures
 * read time as upload → reviewed; flipping status in a script would record
 * sixteen reads of a few seconds each and a 100% "read inside target" that no
 * radiologist produced. Review a handful by hand in the Reviewer instead.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

function loadEnv() {
  const env = {};
  const p = join(process.cwd(), ".env");
  if (!existsSync(p)) return env;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = { ...loadEnv(), ...process.env };
const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EMAIL = env.KROIX_EMAIL;
const PASSWORD = env.KROIX_PASSWORD;
const DIR = process.argv[2] ?? join(homedir(), "Downloads", "kroix-test-xrays");

if (!URL || !KEY) die("VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not found — run from the repo root.");
if (!EMAIL || !PASSWORD) die("Set KROIX_EMAIL and KROIX_PASSWORD for an APPROVED account.");
if (!existsSync(DIR)) die(`No folder at ${DIR}`);

const TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".dcm": "application/dicom" };
const files = readdirSync(DIR).filter((f) => TYPES[extname(f).toLowerCase()]).sort();
if (files.length === 0) die(`No .jpg/.png/.dcm files in ${DIR}`);

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (authErr) die(`Sign-in failed: ${authErr.message}`);

const { data: profile } = await sb.from("profiles").select("approved, role").eq("user_id", auth.user.id).maybeSingle();
if (!profile?.approved) {
  die(
    `Signed in as ${EMAIL}, but the account is not approved, so infer-cxr will refuse it.\n` +
      `  Run in the Supabase SQL editor:\n` +
      `  UPDATE public.profiles SET approved = true, role = 'admin'\n` +
      `  WHERE user_id = (SELECT id FROM auth.users WHERE email = '${EMAIL}');`,
  );
}
console.log(`Signed in as ${EMAIL} (${profile.role}, approved). ${files.length} files in ${DIR}\n`);

async function seedOne(name) {
  const bytes = readFileSync(join(DIR, name));
  const safe = name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 100);
  const filePath = `uploads/${Date.now()}_${safe}`;

  const up = await sb.storage.from("dicom-files").upload(filePath, bytes, {
    contentType: TYPES[extname(name).toLowerCase()],
    upsert: false,
  });
  if (up.error) return { name, outcome: "error", detail: `upload: ${up.error.message}` };

  const { data: study, error: sErr } = await sb
    .from("studies")
    .insert({
      patient_hash: `PAT-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`,
      study_time: new Date().toISOString(),
      modality: "CXR",
      file_path: filePath,
      status: "PROCESSING",
      site_id: "pilot-1",
    })
    .select()
    .single();
  if (sErr) return { name, outcome: "error", detail: `study row: ${sErr.message}` };

  const t0 = Date.now();
  const res = await fetch(`${URL}/functions/v1/infer-cxr`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.session.access_token}` },
    body: JSON.stringify({ study_id: study.id }),
  });
  const ms = Date.now() - t0;
  const body = await res.json().catch(() => ({}));

  const scored =
    res.ok && body.scored !== false &&
    typeof body.risk_score === "number" && body.risk_score >= 0 && body.risk_score <= 1 &&
    ["CRITICAL", "REVIEW", "CLEAR"].includes(body.risk_bucket);

  if (!scored) {
    await sb.from("studies").update({ status: "PENDING" }).eq("id", study.id);
    return { name, outcome: "unscored", status: res.status, detail: body.code || body.error || "no usable score", ms };
  }

  const tr = await sb.from("triage_results").insert({
    study_id: study.id,
    risk_score: body.risk_score,
    risk_bucket: body.risk_bucket,
    confidence: body.confidence,
    roi_heatmap_path: body.roi_heatmap ?? null,
    model_version: body.model_version,
    inference_time_ms: body.inference_time_ms,
  });
  if (tr.error) {
    await sb.from("studies").update({ status: "PENDING" }).eq("id", study.id);
    return { name, outcome: "error", detail: `triage row: ${tr.error.message}` };
  }

  if (body.lab_values) {
    await sb.from("lab_results").insert({
      study_id: study.id, ...body.lab_values,
      source: "simulated_from_risk_score",
      timestamp: new Date().toISOString(),
    });
  }
  await sb.from("studies").update({ status: "QUEUED" }).eq("id", study.id);

  return { name, outcome: "scored", score: body.risk_score, bucket: body.risk_bucket, model: body.model_version, ms };
}

function print(r) {
  const tag = r.outcome === "scored" ? "SCORED  " : r.outcome === "unscored" ? "UNSCORED" : "ERROR   ";
  const what =
    r.outcome === "scored"
      ? `${r.score.toFixed(2)} ${r.bucket.padEnd(8)} ${r.model ?? ""}`
      : `${r.status ?? ""} ${r.detail}`;
  console.log(`${tag} ${String(r.ms ?? "").padStart(6)}ms  ${r.name.slice(0, 52).padEnd(52)} ${what}`);
}

function diagnose(r) {
  const d = String(r.detail);
  if (r.status === 503 || d.includes("inference_unavailable"))
    return "The ML service could not be reached. Check the Supabase secret ML_API_URL and that\n  Railway's /health returns {\"ready\": true}. A cold container can take ~45s — run again once.";
  if (r.status === 422 || d.includes("image_unavailable"))
    return "infer-cxr could not read the stored image. Check the dicom-files bucket and its RLS policies.";
  if (r.status === 403) return "Account not approved — see the SQL printed at sign-in.";
  if (r.status === 401) return "Session rejected. Sign out and in again, or check the account.";
  return "See the detail above.";
}

// ── 1. One upload first ────────────────────────────────────────────────────
console.log("Step 1 — one upload, to prove scoring works before seeding the rest:");
const first = await seedOne(files[0]);
print(first);
if (first.outcome !== "scored") {
  console.log(`\nStopped. The first upload did not score.\n  ${diagnose(first)}`);
  process.exit(1);
}

// ── 2. The rest ────────────────────────────────────────────────────────────
console.log("\nStep 2 — the rest:");
const results = [first];
for (const f of files.slice(1)) {
  const r = await seedOne(f);
  print(r);
  results.push(r);
}

const n = (o) => results.filter((r) => r.outcome === o).length;
console.log(
  `\n${n("scored")} scored · ${n("unscored")} unscored · ${n("error")} errors — of ${results.length}.` +
    `\nOpen /dashboard to see them. To populate Analytics, open a few in the Reviewer and mark them read.` +
    `\nThese are mostly ADULT films; the model was trained on paediatric ones, so scores are not an accuracy test.`,
);

function die(msg) {
  console.error(msg);
  process.exit(1);
}
