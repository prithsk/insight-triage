import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

interface AssistantRequest {
  query: string;
  studyContext?: {
    studyId: string;
    riskBucket: string;
    riskScore: number;
    patientHash: string;
  };
  conversationHistory?: Array<{ role: string; content: string }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, studyContext, conversationHistory = [] }: AssistantRequest = await req.json();

    // First, query RAG for relevant context
    const ragResponse = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": req.headers.get("Authorization") || "",
      },
      body: JSON.stringify({
        query,
        topK: 5,
        includeContext: true,
      }),
    });

    let ragContext = "";
    if (ragResponse.ok) {
      const ragData = await ragResponse.json();
      if (ragData.results && ragData.results.length > 0) {
        ragContext = ragData.results
          .map((r: { sourceType: string; content?: string; score: number }) => 
            `[${r.sourceType}] ${r.content || "No content"} (relevance: ${(r.score * 100).toFixed(1)}%)`
          )
          .join("\n\n");
      }
    }

    // Build context for the assistant
    let systemPrompt = `You are TriageAI Assistant, an AI-powered medical imaging triage assistant for radiologists. 
You help radiologists understand triage decisions, provide relevant medical context, and answer questions about chest X-ray findings.

IMPORTANT GUIDELINES:
- Always provide evidence-based information
- Cite relevant medical literature when available
- Clearly state when you are uncertain or when additional clinical context is needed
- Never provide definitive diagnoses - always frame as "findings suggest" or "may indicate"
- Emphasize that final interpretation is the responsibility of the qualified radiologist

`;

    if (ragContext) {
      systemPrompt += `\n\nRELEVANT CONTEXT FROM KNOWLEDGE BASE:\n${ragContext}\n`;
    }

    if (studyContext) {
      systemPrompt += `\n\nCURRENT STUDY CONTEXT:
- Study ID: ${studyContext.studyId}
- Risk Assessment: ${studyContext.riskBucket} (Score: ${studyContext.riskScore})
- Patient Hash: ${studyContext.patientHash}

Use this context when answering questions about this specific case.`;
    }

    // Call Lovable AI for response
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: query },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("RAG assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
