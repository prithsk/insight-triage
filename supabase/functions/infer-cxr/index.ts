import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireApprovedUser } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

// ── Input validation ──────────────────────────────────────────────────────────
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function isValidBase64(str: string): boolean {
  if (!str || str.length > 50 * 1024 * 1024) return false;
  return /^[A-Za-z0-9+/=]+$/.test(str);
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now >= entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type RiskBucket = 'CRITICAL' | 'REVIEW' | 'CLEAR';

interface MLResult {
  risk_score:    number;
  risk_bucket:   RiskBucket;
  confidence:    number;
  roi_heatmap:   string;   // base64 JSON: {"type":"gradcam","grid":[[...]],"shape":[14,14]}
  model_version: string;
  inference_ms:  number;
}

// ── Decision thresholds: ONE definition, sourced from the model's artifact ────
//
// These bands were previously written in three places that did not agree:
//
//   1. the Gemini system prompt below documented CLEAR <0.30 / REVIEW 0.30-0.64;
//   2. the bucketing in this file used 0.35 as the REVIEW floor;
//   3. services/ml-api/inference.py declared REVIEW_THRESHOLD = 0.35 and then
//      overrode it at the point of use with the ensemble's own
//      `optimal_threshold`, which the shipped artifact records as 0.50.
//
// So the prompt documented a contract the code did not implement, and neither
// matched the model that actually runs. The authoritative number is the one the
// ensemble was fitted with:
//
//   services/ml-api/ensemble_weights.json -> "optimal_threshold"
//
// `src/claims.test.ts` reads that artifact at test time and fails if the
// constant below drifts from it, and fails if inference.py's CRITICAL_THRESHOLD
// stops matching this file's. Retraining the model moves those assertions
// instead of breaking them — the same discipline the published-number rules use.
const REVIEW_THRESHOLD   = 0.50;   // ensemble_weights.json :: optimal_threshold
const CRITICAL_THRESHOLD = 0.65;   // product policy for the CRITICAL band, not a fitted quantity
const REVIEW_SPAN        = CRITICAL_THRESHOLD - REVIEW_THRESHOLD;

function bucketFor(score: number): RiskBucket {
  if (score >= CRITICAL_THRESHOLD) return 'CRITICAL';
  if (score >= REVIEW_THRESHOLD)   return 'REVIEW';
  return 'CLEAR';
}

/**
 * NOT a measured or calibrated quantity.
 *
 * A deterministic, monotone transform of how far the score sits from the
 * nearest decision boundary (and from the ends of the range). It carries no
 * information the score does not already carry, it is not a probability, and it
 * is not the model's certainty about anything. `services/ml-api/inference.py`
 * computes the identical function for the ensemble path against the same
 * thresholds, so "confidence" means one thing across both paths rather than two.
 *
 * It reaches a radiologist labelled "Confidence: NN%". That label claims more
 * than this number supports; see CLAUDE.md.
 */
function boundaryConfidence(score: number): number {
  const dist = Math.min(
    Math.abs(score - CRITICAL_THRESHOLD),
    Math.abs(score - REVIEW_THRESHOLD),
    score,
    1 - score,
  );
  return +Math.min(0.99, 0.70 + dist * 0.80).toFixed(4);
}

// ── No lab values ─────────────────────────────────────────────────────────────
//
// This function used to return a blood panel — CO2, pH, O2, WBC, CRP,
// procalcitonin — computed as a closed-form curve through the risk score. None
// of those can be derived from a radiograph and nothing here read the image for
// them; they were the score restated in clinical units, stored under
// `lab_results` and rendered beside a real patient's film. A label saying
// "Simulated" made them honest to read and changed nothing about what they were.
// Removed 2026-10-04. A real lab feed would arrive from the hospital's systems,
// not be manufactured here, so there is nothing to replace this with.


// ── Path A: the three-model ensemble (DenseNet121 / GoogLeNet / ResNet18) ─────
//
// COLD START. The service loads three torch models in a FastAPI `lifespan`
// handler, so uvicorn accepts no connections until all three are resident, and
// importing torch alone costs several seconds before that starts. On a Railway
// instance that has scaled to zero, the first request therefore waits for the
// whole container boot. A single 30 s attempt was under that: the first upload
// after any idle period timed out, and — correctly, but unhelpfully — produced
// an unscored study. For a demo that is every first upload.
//
// So: two attempts. The retry is the same call to the same model. It is not a
// second opinion, a degraded mode, or a substitute value — if both attempts
// fail the study stays unscored exactly as before. What the retry buys is that
// attempt 1 is what started the container, and attempt 2 arrives after it is up.
const ML_ATTEMPT_TIMEOUTS_MS = [25_000, 45_000];

/** Statuses that mean "the container is not ready", as opposed to "the service
 *  answered and refused". Railway's proxy returns these while an instance boots. */
const COLD_START_STATUSES = new Set([502, 503, 504]);

async function callMLService(imageBase64: string, mlApiUrl: string, mlApiKey: string): Promise<MLResult> {
  type Attempt =
    | { kind: 'ok'; value: MLResult }
    | { kind: 'cold'; error: Error }      // container not up: retry is worth it
    | { kind: 'fatal'; error: Error };    // service answered and refused: retry is not

  let lastError: Error = new Error('ML service unreachable');

  for (let attempt = 0; attempt < ML_ATTEMPT_TIMEOUTS_MS.length; attempt++) {
    const isLast = attempt === ML_ATTEMPT_TIMEOUTS_MS.length - 1;
    let outcome: Attempt;

    try {
      const res = await fetch(`${mlApiUrl}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(mlApiKey ? { Authorization: `Bearer ${mlApiKey}` } : {}),
        },
        body: JSON.stringify({ image_b64: imageBase64, use_tta: true }),
        signal: AbortSignal.timeout(ML_ATTEMPT_TIMEOUTS_MS[attempt]),
      });

      if (res.ok) {
        outcome = { kind: 'ok', value: await res.json() as MLResult };
      } else {
        const error = new Error(`ML service ${res.status}: ${await res.text()}`);
        // A 401 or a 422 means the service is up and this request is wrong.
        // Spending another 45 s to be told so again helps nobody.
        outcome = COLD_START_STATUSES.has(res.status)
          ? { kind: 'cold', error }
          : { kind: 'fatal', error };
      }
    } catch (err) {
      // fetch itself rejected: TimeoutError, DNS failure, connection refused, or
      // a truncated body. Every one of those is consistent with a container that
      // is still booting, so all are treated as cold.
      outcome = { kind: 'cold', error: err instanceof Error ? err : new Error(String(err)) };
    }

    if (outcome.kind === 'ok') return outcome.value;
    if (outcome.kind === 'fatal') throw outcome.error;

    lastError = outcome.error;
    if (isLast) throw lastError;
    console.log(
      `ML service attempt ${attempt + 1} failed (${outcome.error.name}: ${outcome.error.message}); ` +
      `container likely cold, retrying with a longer timeout`,
    );
  }

  throw lastError;
}

// ── Path B: Gemini vision ─────────────────────────────────────────────────────
//
// Returns a score and free-text findings ONLY.
//
// It returns no lab values: it was never asked for any, and could not derive a
// blood test from an image if it were. It also returns no localisation. The
// circle-based `buildLegacyHeatmap` that used to stand in for one was removed on
// 2026-09-25 — it invented anatomical regions by keyword-matching the findings
// text, jittered their coordinates with `Math.random()`, and the Reviewer drew
// them over a real patient's radiograph. CI already forbids exactly that shape
// in `src/pages/Reviewer.tsx`; it had simply moved server-side. The Reviewer
// says "No localization for this study" when nothing is returned, which is the
// true statement.
async function callGemini(
  imageBase64: string,
  apiKey: string,
): Promise<{ risk_score: number; findings: string[] }> {
  const systemPrompt = `You are an expert radiologist AI. Analyze this chest X-ray for pneumonia.

SCORING — these are the bands this service actually applies:
- score < ${REVIEW_THRESHOLD}: CLEAR — normal or near-normal
- score >= ${REVIEW_THRESHOLD} and < ${CRITICAL_THRESHOLD}: REVIEW — unilateral/mild abnormality
- score >= ${CRITICAL_THRESHOLD}: CRITICAL — significant consolidation / bilateral disease

OUTPUT FORMAT (JSON only, no markdown):
{
  "risk_score": <0.00-1.00>,
  "findings": ["finding 1", "finding 2"],
  "severity_rationale": "explanation"
}`;

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: [
          { type: 'text', text: 'Analyze this chest X-ray. Return ONLY valid JSON.' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ]},
      ],
      max_tokens: 800,
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? '';
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in Gemini response');
  const parsed = JSON.parse(match[0]);

  // A response with no parseable score is a failed inference, not a mid-band
  // one. This previously defaulted to 0.35, manufacturing a REVIEW score out of
  // a parse failure.
  const raw = parseFloat(parsed.risk_score);
  if (!Number.isFinite(raw)) throw new Error('Gemini returned no usable risk_score');

  return {
    risk_score: +Math.max(0, Math.min(1, raw)).toFixed(4),
    findings:   Array.isArray(parsed.findings) ? parsed.findings : [],
  };
}

// ── Supabase image fetcher ────────────────────────────────────────────────────
async function fetchImageFromStorage(studyId: string, supabaseUrl: string, serviceKey: string): Promise<string | null> {
  try {
    const sb = createClient(supabaseUrl, serviceKey);
    const { data: study } = await sb.from('studies').select('file_path').eq('id', studyId).single();
    if (!study?.file_path) return null;
    const { data: file, error } = await sb.storage.from('dicom-files').download(study.file_path);
    if (error || !file) return null;
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const allHeaders = { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' };

  try {
    const auth = await requireApprovedUser(req);
    if ('error' in auth) {
      return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: allHeaders });
    }

    if (!checkRateLimit(auth.user.id)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: allHeaders });
    }

    const body = await req.json();
    const { study_id, image_data } = body;

    if (!study_id) return new Response(JSON.stringify({ error: 'study_id is required' }), { status: 400, headers: allHeaders });
    if (!isValidUUID(study_id)) return new Response(JSON.stringify({ error: 'Invalid study_id format' }), { status: 400, headers: allHeaders });
    if (image_data && !isValidBase64(image_data)) return new Response(JSON.stringify({ error: 'Invalid image data' }), { status: 400, headers: allHeaders });

    // Trim whitespace and trailing slashes: a pasted secret with a stray space
    // or "/" produced an invalid URL or "…app//predict".
    const ML_API_URL            = (Deno.env.get('ML_API_URL') ?? '').trim().replace(/\/+$/, '');
    const ML_API_KEY            = (Deno.env.get('ML_API_KEY') ?? '').trim();
    const LOVABLE_API_KEY       = Deno.env.get('LOVABLE_API_KEY') ?? '';
    // Path B is OPT-IN. Set VISION_FALLBACK_ENABLED=true to allow it.
    //
    // Gemini is a general-purpose vision model. It is not the ensemble, it was
    // not trained on chest radiographs, and it has no validation behind it —
    // yet it writes into the same `triage_results.risk_score` column the
    // ensemble writes, and the worklist orders by that column either way. A
    // silent substitution means a queue can be ordered by a model nobody chose,
    // and the only disclosure is `model_version` in a side panel.
    //
    // Default off, so the failure mode is an honest unscored study rather than
    // a different model's guess. Turn it on deliberately when a scored-but-
    // caveated result is worth more than none — a demo with Railway down, say.
    const VISION_FALLBACK_ENABLED = (Deno.env.get('VISION_FALLBACK_ENABLED') ?? '').toLowerCase() === 'true';
    const SUPABASE_URL          = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Resolve image bytes
    let imageBase64: string | null = image_data ?? null;
    if (!imageBase64 && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      imageBase64 = await fetchImageFromStorage(study_id, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }

    // A missing image is a missing input, not a scoring condition. It used to
    // fall straight through to the random fallback.
    if (!imageBase64) {
      console.error(`infer-cxr: no readable image for study ${study_id}`);
      return new Response(JSON.stringify({
        scored:   false,
        code:     'image_unavailable',
        error:    'No readable image for this study, so it was not scored.',
        study_id,
      }), { status: 422, headers: allHeaders });
    }

    const t0 = Date.now();
    const failures: string[] = [];

    // ── Path A: the three-model ensemble ─────────────────────────────────────
    if (ML_API_URL) {
      try {
        const mlResult = await callMLService(imageBase64, ML_API_URL, ML_API_KEY);

        // Optionally enrich with Gemini findings text (non-blocking, best-effort).
        // Text only: the score, bucket, confidence and heatmap all stay the
        // ensemble's. Taking Gemini's lab curve here, as the previous version
        // did, described a score the panel was not showing.
        // Same flag as Path B: one switch for "is a general-purpose vision
        // model allowed to touch this study at all". The score, bucket,
        // confidence and heatmap are the ensemble's either way — this is only
        // the findings sentence — but it appears beside the ensemble's number,
        // so it is the ensemble's result a reader attributes it to.
        let findings: string[] = [];
        if (VISION_FALLBACK_ENABLED && LOVABLE_API_KEY) {
          try {
            findings = (await callGemini(imageBase64, LOVABLE_API_KEY)).findings;
          } catch (e) {
            console.error('Gemini findings enrichment failed; continuing without findings text:', e);
          }
        }

        return new Response(JSON.stringify({
          scored:            true,
          study_id,
          risk_score:        mlResult.risk_score,
          risk_bucket:       mlResult.risk_bucket,
          confidence:        mlResult.confidence,
          findings,
          roi_heatmap:       mlResult.roi_heatmap,          // gradcam base64 JSON
          model_version:     mlResult.model_version,
          inference_time_ms: Date.now() - t0,
          timestamp:         new Date().toISOString(),
        }), { headers: allHeaders });
      } catch (e) {
        failures.push(`ml-api: ${e instanceof Error ? e.message : String(e)}`);
        console.error('ML service failed, falling back to Gemini:', e);
      }
    } else {
      failures.push('ml-api: ML_API_URL is not configured');
    }

    // ── Path B: Gemini vision-only (ML service unavailable), opt-in ──────────
    if (!VISION_FALLBACK_ENABLED) {
      failures.push('gemini: disabled (VISION_FALLBACK_ENABLED is not true)');
    } else if (LOVABLE_API_KEY) {
      try {
        const gemini = await callGemini(imageBase64, LOVABLE_API_KEY);
        return new Response(JSON.stringify({
          scored:            true,
          study_id,
          risk_score:        gemini.risk_score,
          risk_bucket:       bucketFor(gemini.risk_score),
          confidence:        boundaryConfidence(gemini.risk_score),
          findings:          gemini.findings,
          roi_heatmap:       null,   // Gemini returns no localisation. Say so.
          model_version:     'gemini-2.5-flash-vision',
          inference_time_ms: Date.now() - t0,
          timestamp:         new Date().toISOString(),
        }), { headers: allHeaders });
      } catch (e) {
        failures.push(`gemini: ${e instanceof Error ? e.message : String(e)}`);
        console.error('Gemini failed:', e);
      }
    } else {
      failures.push('gemini: LOVABLE_API_KEY is not configured');
    }

    // ── No score. There is no Path C. ─────────────────────────────────────────
    //
    // There used to be. `syntheticFallback()` drew a risk score from
    // `Math.random()`, derived a bucket from it, attached a random confidence
    // and a simulated lab panel, and returned all of it with HTTP 200. The
    // client wrote that row to `triage_results` and the worklist ordered by it.
    // The only disclosure was `model_version: 'synthetic-fallback'` in a side
    // panel — not on the worklist row, which is where the ordering a
    // radiologist acts on actually happens. A real patient's radiograph could
    // be placed at the top of a reading queue, or at the bottom of one, on a
    // coin flip.
    //
    // Removed 2026-09-25 and deliberately NOT replaced. A failed inference has
    // exactly one honest outcome: the study is UNSCORED. It still exists and its
    // image is still readable; only the score is withheld. The worklist already
    // has a place for that state — `src/lib/worklistOrder.ts` pins unscored
    // studies last in both sort directions and `WorklistCard` shows
    // "awaiting triage · <elapsed>". Any substitute guess, however hedged,
    // re-enters a number into a clinical ordering that no model produced.
    console.error(`infer-cxr: no scoring path succeeded for study ${study_id}:`, failures.join('; '));
    return new Response(JSON.stringify({
      scored:   false,
      code:     'inference_unavailable',
      error:    'Inference unavailable — this study was not scored.',
      study_id,
    }), { status: 503, headers: allHeaders });

  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', scored: false }), { status: 500, headers: allHeaders });
  }
});
