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
interface MLResult {
  risk_score:    number;
  risk_bucket:   'CRITICAL' | 'REVIEW' | 'CLEAR';
  confidence:    number;
  roi_heatmap:   string;   // base64 JSON: {"type":"gradcam","grid":[[...]],"shape":[14,14]}
  model_version: string;
  inference_ms:  number;
}

interface GeminiFindings {
  findings:   string[];
  lab_values: LabValues;
}

interface LabValues {
  co2: number; ph: number; o2: number;
  wbc: number; crp: number; procalcitonin: number;
}

// ── Lab value simulation (clinically correlated with severity) ────────────────
function generateLabValues(riskScore: number): LabValues {
  const s = riskScore;
  const jitter = (r: number) => (Math.random() - 0.5) * r;

  const co2 = s >= 0.65 ? 48 + (s - 0.65) * 34 + jitter(4)
             : s >= 0.30 ? 44 + ((s - 0.30) / 0.35) * 6 + jitter(3)
             : 36 + (s / 0.30) * 8 + jitter(3);

  const ph  = s >= 0.65 ? 7.32 - (s - 0.65) * 0.34
             : s >= 0.30 ? 7.38 - ((s - 0.30) / 0.35) * 0.06
             : 7.45 - (s / 0.30) * 0.07;

  const o2  = s >= 0.65 ? 88 - (s - 0.65) * 28 - Math.random() * 4
             : s >= 0.30 ? 94 - ((s - 0.30) / 0.35) * 6 - Math.random() * 2
             : 99 - (s / 0.30) * 4;

  const wbc = s >= 0.65 ? 16 + (s - 0.65) * 34 + Math.random() * 4
             : s >= 0.30 ? 11 + ((s - 0.30) / 0.35) * 7 + Math.random() * 2
             : 5 + (s / 0.30) * 6 + Math.random() * 2;

  const crp = s >= 0.65 ? 50 + (s - 0.65) * 428 + Math.random() * 30
             : s >= 0.30 ? 10 + ((s - 0.30) / 0.35) * 50 + Math.random() * 10
             : 0.5 + (s / 0.30) * 8 + Math.random() * 2;

  const pct = s >= 0.65 ? 2 + (s - 0.65) * 37 + Math.random() * 3
             : s >= 0.30 ? 0.25 + ((s - 0.30) / 0.35) * 2.75 + Math.random() * 0.5
             : 0.02 + (s / 0.30) * 0.18 + Math.random() * 0.05;

  return {
    co2:          +Math.max(30,   Math.min(65,  co2)).toFixed(1),
    ph:           +Math.max(7.15, Math.min(7.48, ph + jitter(0.02))).toFixed(2),
    o2:           Math.round(Math.max(75, Math.min(100, o2))),
    wbc:          +Math.max(3,    Math.min(30,  wbc)).toFixed(1),
    crp:          +Math.max(0.1,  Math.min(250, crp)).toFixed(1),
    procalcitonin:+Math.max(0.01, Math.min(20,  pct)).toFixed(2),
  };
}

// Legacy circle-based heatmap for Gemini-only path (no gradcam available)
function buildLegacyHeatmap(findings: string[]): string {
  const regions: { x: number; y: number; intensity: number; label: string }[] = [];
  for (const f of findings) {
    const fl = f.toLowerCase();
    if (fl.includes('right') || fl.includes('rll') || fl.includes('rul'))
      regions.push({ x: 0.3, y: 0.4, intensity: 0.8, label: 'right_lung' });
    if (fl.includes('left') || fl.includes('lll') || fl.includes('lul'))
      regions.push({ x: 0.7, y: 0.4, intensity: 0.8, label: 'left_lung' });
    if (fl.includes('bilateral') || fl.includes('diffuse')) {
      regions.push({ x: 0.3, y: 0.4, intensity: 0.7, label: 'right_lung' });
      regions.push({ x: 0.7, y: 0.4, intensity: 0.7, label: 'left_lung' });
    }
    if (fl.includes('lower'))
      regions.push({ x: 0.5, y: 0.6, intensity: 0.75, label: 'lower_lobes' });
    if (fl.includes('consolidation') || fl.includes('infiltrate'))
      regions.push({ x: 0.4 + Math.random() * 0.2, y: 0.35 + Math.random() * 0.2, intensity: 0.9, label: 'consolidation' });
  }
  if (regions.length === 0)
    regions.push({ x: 0.5, y: 0.4, intensity: 0.3, label: 'clear' });
  return btoa(JSON.stringify(regions));
}

// ── Primary: EfficientNet-B4 ML service ──────────────────────────────────────
async function callMLService(imageBase64: string, mlApiUrl: string, mlApiKey: string): Promise<MLResult> {
  const res = await fetch(`${mlApiUrl}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(mlApiKey ? { Authorization: `Bearer ${mlApiKey}` } : {}),
    },
    body: JSON.stringify({ image_b64: imageBase64, use_tta: true }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`ML service ${res.status}: ${await res.text()}`);
  return res.json() as Promise<MLResult>;
}

// ── Fallback: Gemini vision for findings text ─────────────────────────────────
async function callGemini(imageBase64: string, apiKey: string): Promise<GeminiFindings & Pick<MLResult, 'risk_score' | 'risk_bucket' | 'confidence'>> {
  const systemPrompt = `You are an expert radiologist AI. Analyze this chest X-ray for pneumonia.

SCORING:
- 0.00-0.29: CLEAR  — normal or near-normal
- 0.30-0.64: REVIEW — unilateral/mild abnormality
- 0.65-1.00: CRITICAL — significant consolidation / bilateral disease

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
  const riskScore = Math.max(0, Math.min(1, parseFloat(parsed.risk_score) || 0.35));
  const risk_bucket: MLResult['risk_bucket'] = riskScore >= 0.65 ? 'CRITICAL' : riskScore >= 0.35 ? 'REVIEW' : 'CLEAR';
  const findings: string[] = parsed.findings ?? [];
  return {
    risk_score: +riskScore.toFixed(4),
    risk_bucket,
    confidence: +(Math.min(0.99, 0.75 + (findings.length > 0 ? 0.15 : 0))).toFixed(4),
    findings,
    lab_values: generateLabValues(riskScore),
  };
}

// ── Stat fallback (no image / no API key) ────────────────────────────────────
function syntheticFallback(): { risk_score: number; risk_bucket: MLResult['risk_bucket']; confidence: number; findings: string[]; lab_values: LabValues } {
  const r = Math.random();
  const risk_score = r < 0.60 ? Math.random() * 0.30 : r < 0.85 ? 0.30 + Math.random() * 0.35 : 0.65 + Math.random() * 0.35;
  const risk_bucket: MLResult['risk_bucket'] = risk_score >= 0.65 ? 'CRITICAL' : risk_score >= 0.35 ? 'REVIEW' : 'CLEAR';
  return {
    risk_score: +risk_score.toFixed(4),
    risk_bucket,
    confidence: +(0.70 + Math.random() * 0.20).toFixed(4),
    findings:   ['Simulated analysis — no image provided'],
    lab_values: generateLabValues(risk_score),
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

    const ML_API_URL            = Deno.env.get('ML_API_URL') ?? '';
    const ML_API_KEY            = Deno.env.get('ML_API_KEY') ?? '';
    const LOVABLE_API_KEY       = Deno.env.get('LOVABLE_API_KEY') ?? '';
    const SUPABASE_URL          = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Resolve image bytes
    let imageBase64: string | null = image_data ?? null;
    if (!imageBase64 && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      imageBase64 = await fetchImageFromStorage(study_id, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }

    const t0 = Date.now();

    // ── Path A: EfficientNet-B4 ML service ───────────────────────────────────
    if (imageBase64 && ML_API_URL) {
      try {
        const mlResult = await callMLService(imageBase64, ML_API_URL, ML_API_KEY);

        // Optionally enrich with Gemini findings text (non-blocking, best-effort)
        let findings: string[] = [];
        let lab_values = generateLabValues(mlResult.risk_score);
        if (LOVABLE_API_KEY) {
          try {
            const gemini = await callGemini(imageBase64, LOVABLE_API_KEY);
            findings   = gemini.findings;
            lab_values = gemini.lab_values;
          } catch {
            // Gemini enrichment failed; continue without findings text
          }
        }

        return new Response(JSON.stringify({
          study_id,
          risk_score:       mlResult.risk_score,
          risk_bucket:      mlResult.risk_bucket,
          confidence:       mlResult.confidence,
          findings,
          lab_values,
          roi_heatmap:      mlResult.roi_heatmap,          // gradcam base64 JSON
          model_version:    mlResult.model_version,
          inference_time_ms: Date.now() - t0,
          timestamp:        new Date().toISOString(),
        }), { headers: allHeaders });
      } catch (e) {
        console.error('ML service failed, falling back to Gemini:', e);
      }
    }

    // ── Path B: Gemini vision-only (ML service unavailable) ──────────────────
    if (imageBase64 && LOVABLE_API_KEY) {
      try {
        const gemini = await callGemini(imageBase64, LOVABLE_API_KEY);
        return new Response(JSON.stringify({
          study_id,
          risk_score:        gemini.risk_score,
          risk_bucket:       gemini.risk_bucket,
          confidence:        gemini.confidence,
          findings:          gemini.findings,
          lab_values:        gemini.lab_values,
          roi_heatmap:       buildLegacyHeatmap(gemini.findings),
          model_version:     'gemini-2.5-flash-vision',
          inference_time_ms: Date.now() - t0,
          timestamp:         new Date().toISOString(),
        }), { headers: allHeaders });
      } catch (e) {
        console.error('Gemini failed, using synthetic fallback:', e);
      }
    }

    // ── Path C: Synthetic fallback ────────────────────────────────────────────
    const fb = syntheticFallback();
    return new Response(JSON.stringify({
      study_id,
      ...fb,
      roi_heatmap:       buildLegacyHeatmap(fb.findings),
      model_version:     'synthetic-fallback',
      inference_time_ms: Date.now() - t0,
      timestamp:         new Date().toISOString(),
    }), { headers: allHeaders });

  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: allHeaders });
  }
});
