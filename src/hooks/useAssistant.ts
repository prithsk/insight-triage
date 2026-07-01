import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface StudyContext {
  studyId: string;
  riskBucket: string;
  riskScore: number;
  patientHash: string;
}

export function useAssistant() {
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [isStreaming, setStreaming]  = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const abortRef                    = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    query: string,
    studyContext?: StudyContext,
  ) => {
    if (!query.trim() || isStreaming) return;

    setError(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: query.trim(),
      timestamp: new Date(),
    };

    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    abortRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const history = messages.map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ query: query.trim(), studyContext, conversationHistory: history }),
          signal: abortRef.current.signal,
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? "Assistant unavailable");
      }

      const reader  = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response stream");

      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const raw of chunk.split("\n")) {
          const line = raw.trim();
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const delta = JSON.parse(data)?.choices?.[0]?.delta?.content ?? "";
            accumulated += delta;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, content: accumulated } : m
              )
            );
          } catch { /* skip malformed chunks */ }
        }
      }

    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `Unable to get a response. ${msg}`, isStreaming: false }
            : m
        )
      );
    } finally {
      setMessages(prev =>
        prev.map(m => (m.id === assistantId ? { ...m, isStreaming: false } : m))
      );
      setStreaming(false);
    }
  }, [messages, isStreaming]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, error, sendMessage, stopStreaming, clearMessages };
}
