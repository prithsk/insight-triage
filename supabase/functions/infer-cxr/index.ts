import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simulated ensemble model inference
// In production, this would call your actual PyTorch model service
function runInference(imageData: string): {
  risk_score: number;
  risk_bucket: 'CRITICAL' | 'REVIEW' | 'CLEAR';
  confidence: number;
  inference_time_ms: number;
} {
  const startTime = Date.now();
  
  // Simulate model inference with realistic distribution
  // In production: call your ML service with the actual model
  const random = Math.random();
  let risk_score: number;
  
  // Realistic distribution: ~60% clear, ~25% review, ~15% critical
  if (random < 0.60) {
    // Clear cases: low risk scores
    risk_score = Math.random() * 0.3;
  } else if (random < 0.85) {
    // Review cases: medium risk scores
    risk_score = 0.3 + Math.random() * 0.35;
  } else {
    // Critical cases: high risk scores
    risk_score = 0.65 + Math.random() * 0.35;
  }
  
  // Determine bucket based on thresholds
  let risk_bucket: 'CRITICAL' | 'REVIEW' | 'CLEAR';
  if (risk_score >= 0.65) {
    risk_bucket = 'CRITICAL';
  } else if (risk_score >= 0.3) {
    risk_bucket = 'REVIEW';
  } else {
    risk_bucket = 'CLEAR';
  }
  
  // Confidence correlates with how far from threshold boundaries
  const distanceFromBoundary = Math.min(
    Math.abs(risk_score - 0.3),
    Math.abs(risk_score - 0.65)
  );
  const confidence = 0.7 + (distanceFromBoundary * 0.5) + (Math.random() * 0.1);
  
  const inference_time_ms = Date.now() - startTime + Math.floor(Math.random() * 2000) + 500;
  
  return {
    risk_score: Math.round(risk_score * 1000) / 1000,
    risk_bucket,
    confidence: Math.min(0.99, Math.round(confidence * 1000) / 1000),
    inference_time_ms
  };
}

// Generate simulated ROI heatmap data
function generateROIHeatmap(): string {
  // In production: generate actual Grad-CAM or saliency map from model
  // Returns base64 encoded heatmap overlay
  const regions = [
    { x: 0.3, y: 0.2, intensity: Math.random() },
    { x: 0.5, y: 0.4, intensity: Math.random() },
    { x: 0.7, y: 0.3, intensity: Math.random() },
  ];
  return btoa(JSON.stringify(regions));
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { study_id, image_data } = await req.json();
    
    if (!study_id) {
      return new Response(
        JSON.stringify({ error: 'study_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Running inference for study: ${study_id}`);
    
    // Run the inference
    const result = runInference(image_data || '');
    const roi_heatmap = generateROIHeatmap();
    
    const response = {
      study_id,
      ...result,
      roi_heatmap,
      model_version: 'v0.1.0-ensemble',
      timestamp: new Date().toISOString()
    };

    console.log(`Inference complete: ${result.risk_bucket} (${result.risk_score})`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Inference error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Inference failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
