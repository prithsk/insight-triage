import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { requireApprovedUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PINECONE_API_KEY = Deno.env.get("PINECONE_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface QueryRequest {
  query: string;
  topK?: number;
  filter?: {
    sourceTypes?: string[];
  };
  includeContext?: boolean;
}

interface RAGContext {
  id: string;
  score: number;
  sourceType: string;
  sourceId: string;
  content?: string;
  metadata: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireApprovedUser(req);
    if ("error" in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY not configured");
    }

    // deno-lint-ignore no-explicit-any
    const supabase: any = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { query, topK = 5, filter, includeContext = true }: QueryRequest = await req.json();

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Query Pinecone
    const results = await queryPinecone(queryEmbedding, topK, filter?.sourceTypes);

    // Optionally fetch full context from database
    let enrichedResults: RAGContext[] = results;
    if (includeContext) {
      enrichedResults = await enrichWithContext(supabase, results);
    }

    return new Response(
      JSON.stringify({
        query,
        results: enrichedResults,
        count: enrichedResults.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("RAG query error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text,
      model: "text-embedding-3-small",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding generation failed: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function queryPinecone(
  embedding: number[],
  topK: number,
  sourceTypes?: string[]
): Promise<RAGContext[]> {
  const PINECONE_HOST = Deno.env.get("PINECONE_HOST") || "https://triageai-index.svc.aped-4627-b74a.pinecone.io";

  const queryBody: Record<string, unknown> = {
    vector: embedding,
    topK,
    includeMetadata: true,
    namespace: "triageai",
  };

  // Add filter if source types specified
  if (sourceTypes && sourceTypes.length > 0) {
    queryBody.filter = {
      source_type: { "$in": sourceTypes },
    };
  }

  const response = await fetch(`${PINECONE_HOST}/query`, {
    method: "POST",
    headers: {
      "Api-Key": PINECONE_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(queryBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinecone query failed: ${error}`);
  }

  const data = await response.json();

  // deno-lint-ignore no-explicit-any
  return (data.matches || []).map((match: any) => ({
    id: match.id,
    score: match.score,
    sourceType: match.metadata?.source_type || "unknown",
    sourceId: match.metadata?.source_id || "",
    metadata: match.metadata || {},
  }));
}

// deno-lint-ignore no-explicit-any
async function enrichWithContext(
  supabase: any,
  results: RAGContext[]
): Promise<RAGContext[]> {
  const enriched: RAGContext[] = [];

  for (const result of results) {
    let content: string | undefined;

    switch (result.sourceType) {
      case "study_finding": {
        // Fetch triage result details
        const { data } = await supabase
          .from("triage_results")
          .select(`
            *,
            studies (
              patient_hash,
              modality,
              study_time
            )
          `)
          .eq("study_id", result.sourceId)
          .single();
        
        if (data) {
          content = `Risk: ${data.risk_bucket}, Score: ${data.risk_score}, Confidence: ${data.confidence}. ` +
                   `Patient: ${data.studies?.patient_hash}, Modality: ${data.studies?.modality}`;
        }
        break;
      }

      case "medical_literature": {
        const { data } = await supabase
          .from("medical_literature")
          .select("*")
          .eq("id", result.sourceId)
          .single();
        
        if (data) {
          content = `${data.title}: ${data.content}`;
        }
        break;
      }

      case "historical_decision": {
        const { data } = await supabase
          .from("feedback_events")
          .select(`
            *,
            studies (
              patient_hash,
              modality
            ),
            triage_results (
              risk_bucket,
              risk_score
            )
          `)
          .eq("id", result.sourceId)
          .single();
        
        if (data) {
          content = `Feedback: ${data.feedback_type}. Notes: ${data.notes || "None"}. ` +
                   `Original risk: ${data.triage_results?.risk_bucket}`;
        }
        break;
      }
    }

    enriched.push({ ...result, content });
  }

  return enriched;
}
