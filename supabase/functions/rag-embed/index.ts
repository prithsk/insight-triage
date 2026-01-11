import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PINECONE_API_KEY = Deno.env.get("PINECONE_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface EmbedRequest {
  action: "embed" | "index_study" | "index_literature" | "index_decision";
  content?: string;
  sourceType?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY not configured");
    }

    // deno-lint-ignore no-explicit-any
    const supabase: any = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { action, content, sourceId, metadata }: EmbedRequest = await req.json();

    switch (action) {
      case "embed": {
        const embedding = await generateEmbedding(content!);
        return new Response(
          JSON.stringify({ embedding }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "index_study": {
        const studyResult = await indexStudyFinding(supabase, sourceId!, content!, metadata);
        return new Response(
          JSON.stringify(studyResult),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "index_literature": {
        const litResult = await indexMedicalLiterature(supabase, sourceId!, content!, metadata);
        return new Response(
          JSON.stringify(litResult),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "index_decision": {
        const decResult = await indexHistoricalDecision(supabase, sourceId!, content!, metadata);
        return new Response(
          JSON.stringify(decResult),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("RAG embed error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateEmbedding(text: string): Promise<number[]> {
  // Use Lovable AI to generate embeddings via text-embedding model
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

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function upsertToPinecone(
  pineconeId: string,
  embedding: number[],
  metadata: Record<string, unknown>
) {
  // Note: You'll need to set your Pinecone index host
  const PINECONE_HOST = Deno.env.get("PINECONE_HOST") || "https://triageai-index.svc.aped-4627-b74a.pinecone.io";

  const response = await fetch(`${PINECONE_HOST}/vectors/upsert`, {
    method: "POST",
    headers: {
      "Api-Key": PINECONE_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vectors: [{
        id: pineconeId,
        values: embedding,
        metadata,
      }],
      namespace: "triageai",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinecone upsert failed: ${error}`);
  }

  return response.json();
}

// deno-lint-ignore no-explicit-any
async function indexStudyFinding(
  supabase: any,
  studyId: string,
  content: string,
  metadata?: Record<string, unknown>
) {
  const contentHash = await hashContent(content);
  const pineconeId = `study_${studyId}`;

  // Check if already indexed
  const { data: existing } = await supabase
    .from("embeddings")
    .select("id")
    .eq("pinecone_id", pineconeId)
    .eq("content_hash", contentHash)
    .single();

  if (existing) {
    return { success: true, message: "Already indexed", pineconeId };
  }

  // Generate embedding
  const embedding = await generateEmbedding(content);

  // Upsert to Pinecone
  await upsertToPinecone(pineconeId, embedding, {
    source_type: "study_finding",
    source_id: studyId,
    ...metadata,
  });

  // Record in database
  await supabase.from("embeddings").upsert({
    source_type: "study_finding",
    source_id: studyId,
    content_hash: contentHash,
    pinecone_id: pineconeId,
    metadata: metadata || {},
  }, { onConflict: "pinecone_id" });

  return { success: true, message: "Indexed successfully", pineconeId };
}

// deno-lint-ignore no-explicit-any
async function indexMedicalLiterature(
  supabase: any,
  literatureId: string,
  content: string,
  metadata?: Record<string, unknown>
) {
  const contentHash = await hashContent(content);
  const pineconeId = `literature_${literatureId}`;

  const { data: existing } = await supabase
    .from("embeddings")
    .select("id")
    .eq("pinecone_id", pineconeId)
    .eq("content_hash", contentHash)
    .single();

  if (existing) {
    return { success: true, message: "Already indexed", pineconeId };
  }

  const embedding = await generateEmbedding(content);

  await upsertToPinecone(pineconeId, embedding, {
    source_type: "medical_literature",
    source_id: literatureId,
    ...metadata,
  });

  await supabase.from("embeddings").upsert({
    source_type: "medical_literature",
    source_id: literatureId,
    content_hash: contentHash,
    pinecone_id: pineconeId,
    metadata: metadata || {},
  }, { onConflict: "pinecone_id" });

  return { success: true, message: "Indexed successfully", pineconeId };
}

// deno-lint-ignore no-explicit-any
async function indexHistoricalDecision(
  supabase: any,
  feedbackId: string,
  content: string,
  metadata?: Record<string, unknown>
) {
  const contentHash = await hashContent(content);
  const pineconeId = `decision_${feedbackId}`;

  const { data: existing } = await supabase
    .from("embeddings")
    .select("id")
    .eq("pinecone_id", pineconeId)
    .eq("content_hash", contentHash)
    .single();

  if (existing) {
    return { success: true, message: "Already indexed", pineconeId };
  }

  const embedding = await generateEmbedding(content);

  await upsertToPinecone(pineconeId, embedding, {
    source_type: "historical_decision",
    source_id: feedbackId,
    ...metadata,
  });

  await supabase.from("embeddings").upsert({
    source_type: "historical_decision",
    source_id: feedbackId,
    content_hash: contentHash,
    pinecone_id: pineconeId,
    metadata: metadata || {},
  }, { onConflict: "pinecone_id" });

  return { success: true, message: "Indexed successfully", pineconeId };
}
