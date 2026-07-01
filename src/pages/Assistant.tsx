import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAssistant, StudyContext } from "@/hooks/useAssistant";
import { useDocuments, useUploadDocument } from "@/hooks/useUploadDocument";
import { useStudy } from "@/hooks/useStudies";
import {
  Send, Square, BrainCircuit, FileText, Upload,
  Sparkles, ChevronRight, X, Loader2, FileUp,
  MessageSquare, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Streaming cursor ───────────────────────────────────────────────────────
function StreamCursor() {
  return (
    <span
      className="inline-block w-[2px] h-[1em] bg-landing-primary align-middle ml-0.5 animate-blink"
      aria-hidden
    />
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: { id: string; role: string; content: string; isStreaming?: boolean } }) {
  const isUser = msg.role === "user";

  return (
    <div className={cn("flex gap-3 animate-fade-up", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5",
        isUser
          ? "bg-landing-primary/15 text-landing-primary"
          : "bg-landing-dark/8 text-landing-primary"
      )}>
        {isUser ? "You" : <BrainCircuit className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm",
        isUser
          ? "bg-landing-primary text-white rounded-tr-sm"
          : "bg-white border border-[rgba(0,0,0,0.06)] text-landing-heading rounded-tl-sm"
      )}>
        {msg.content || (msg.isStreaming && <StreamCursor />)}
        {msg.content && msg.isStreaming && <StreamCursor />}
      </div>
    </div>
  );
}

// ── Document row ───────────────────────────────────────────────────────────
const DOC_TYPE_LABELS: Record<string, string> = {
  sop: "SOP", guideline: "Guideline", lab_pdf: "Lab PDF", report: "Report",
};

function DocRow({ doc }: { doc: { id: string; name: string; doc_type: string; status: string | null; created_at: string } }) {
  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors group">
      <FileText className="w-4 h-4 text-landing-primary/70 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-white/80 font-medium truncate">{doc.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-white/40 uppercase tracking-wide">
            {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
          </span>
          {doc.status && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full",
              doc.status === "READY" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"
            )}>
              {doc.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Drop zone ──────────────────────────────────────────────────────────────
function DocUploadZone({ onFile }: { onFile: (f: File) => void }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "border border-dashed rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all",
        over ? "border-landing-primary/60 bg-landing-primary/10" : "border-white/20 hover:border-white/40"
      )}
    >
      <FileUp className="w-5 h-5 text-white/40" />
      <p className="text-[12px] text-white/50 text-center">Drop PDF, DOCX, or TXT</p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
    </div>
  );
}

// ── Study context chip ─────────────────────────────────────────────────────
function StudyContextChip({ context, onClear }: { context: StudyContext; onClear: () => void }) {
  const colorMap: Record<string, string> = {
    CRITICAL: "bg-red-500/20 text-red-300 border-red-500/30",
    REVIEW:   "bg-amber-500/20 text-amber-300 border-amber-500/30",
    CLEAR:    "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  };
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-medium",
      colorMap[context.riskBucket] ?? "bg-white/10 text-white/60 border-white/20"
    )}>
      <Sparkles className="w-3 h-3" />
      <span>Study {context.studyId.slice(0,8)}… · {context.riskBucket}</span>
      <button onClick={onClear} className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Assistant() {
  const [searchParams] = useSearchParams();
  const studyIdParam   = searchParams.get("studyId");
  const { data: studyData } = useStudy(studyIdParam ?? undefined);

  const [studyContext, setStudyContext] = useState<StudyContext | null>(null);
  const [inputText,    setInputText]    = useState("");
  const [isDragOver,   setDragOver]     = useState(false);

  const { messages, isStreaming, error, sendMessage, stopStreaming, clearMessages } = useAssistant();
  const { data: docs, isLoading: docsLoading } = useDocuments();
  const uploadDoc = useUploadDocument();

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // Auto-inject study context from URL param
  useEffect(() => {
    if (studyData?.triage_results?.[0]) {
      const tr = studyData.triage_results[0];
      setStudyContext({
        studyId:     studyData.id,
        riskBucket:  tr.risk_bucket,
        riskScore:   Number(tr.risk_score),
        patientHash: studyData.patient_hash,
      });
    }
  }, [studyData]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const q = inputText.trim();
    if (!q || isStreaming) return;
    setInputText("");
    sendMessage(q, studyContext ?? undefined);
  }, [inputText, isStreaming, sendMessage, studyContext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleDocUpload = async (file: File) => {
    await uploadDoc.mutateAsync(file);
  };

  const SUGGESTIONS = [
    "What imaging findings correlate with high pneumonia risk scores?",
    "Explain the significance of elevated CRP and procalcitonin in respiratory cases.",
    "What are the CURB-65 criteria for pneumonia severity?",
    "How should I prioritize a CRITICAL score with normal lab values?",
  ];

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-72px)] flex overflow-hidden">

        {/* ── Left Sidebar ────────────────────────────────────────────────── */}
        <aside className="w-[280px] shrink-0 bg-landing-dark flex flex-col border-r border-white/8">

          {/* Header */}
          <div className="px-5 pt-6 pb-4 border-b border-white/8">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-7 h-7 rounded-lg bg-landing-primary/20 flex items-center justify-center">
                <BrainCircuit className="w-4 h-4 text-landing-primary" />
              </div>
              <h2 className="text-[14px] font-semibold text-white">TriageAI Assistant</h2>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed">
              Evidence-based clinical knowledge. Non-diagnostic — for workflow support only.
            </p>
          </div>

          {/* Study context */}
          <div className="px-4 pt-4">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Study Context</p>
            {studyContext ? (
              <StudyContextChip context={studyContext} onClear={() => setStudyContext(null)} />
            ) : (
              <p className="text-[12px] text-white/30 italic">
                No study linked. Open Assistant from the Reviewer to add context.
              </p>
            )}
          </div>

          {/* Knowledge Base */}
          <div className="px-4 pt-5 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Knowledge Base</p>
              {docsLoading && <Loader2 className="w-3 h-3 text-white/30 animate-spin" />}
            </div>

            <div className="flex-1 overflow-y-auto space-y-0.5 mb-3 scrollbar-thin scrollbar-thumb-white/10">
              {docs && docs.length > 0 ? (
                docs.map(doc => <DocRow key={doc.id} doc={doc} />)
              ) : (
                <p className="text-[12px] text-white/25 italic px-3 py-2">
                  No documents uploaded yet. Add guidelines or SOPs to improve responses.
                </p>
              )}
            </div>

            <DocUploadZone onFile={handleDocUpload} />
            {uploadDoc.isPending && (
              <div className="flex items-center gap-2 mt-2 px-3">
                <Loader2 className="w-3.5 h-3.5 text-landing-primary animate-spin" />
                <span className="text-[11px] text-white/40">Uploading & embedding…</span>
              </div>
            )}
          </div>

          {/* Clear chat */}
          {messages.length > 0 && (
            <div className="px-4 pb-4 pt-2 border-t border-white/8">
              <button
                onClick={clearMessages}
                className="w-full text-[12px] text-white/30 hover:text-white/60 transition-colors py-2 text-center"
              >
                Clear conversation
              </button>
            </div>
          )}
        </aside>

        {/* ── Chat Area ───────────────────────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col"
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleDocUpload(f); }}
        >
          {isDragOver && (
            <div className="absolute inset-0 z-50 bg-landing-primary/10 border-2 border-dashed border-landing-primary/40 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-landing-primary">
                <Upload className="w-10 h-10" />
                <p className="text-[16px] font-medium">Drop to add to Knowledge Base</p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-6 max-w-lg mx-auto text-center">
                <div className="w-14 h-14 rounded-2xl bg-landing-primary/10 flex items-center justify-center">
                  <BrainCircuit className="w-7 h-7 text-landing-primary" />
                </div>
                <div>
                  <h2 className="font-serif text-[24px] text-landing-heading">TriageAI Assistant</h2>
                  <p className="text-[14px] text-landing-body mt-2">
                    Ask evidence-based questions about chest X-ray findings, triage decisions, and clinical protocols.
                  </p>
                </div>

                {/* Suggestions */}
                <div className="grid grid-cols-1 gap-2 w-full">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setInputText(s)}
                      className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-white border border-[rgba(0,0,0,0.06)] hover:border-landing-primary/30 hover:bg-landing-primary/5 transition-all text-left group"
                    >
                      <Sparkles className="w-4 h-4 text-landing-primary/50 group-hover:text-landing-primary shrink-0 transition-colors" />
                      <span className="text-[13px] text-landing-body group-hover:text-landing-heading transition-colors">{s}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-landing-muted ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-landing-muted">
                  Non-diagnostic. For workflow prioritization only. Always rely on qualified radiologist interpretation.
                </p>
              </div>
            ) : (
              <>
                {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Input Bar ───────────────────────────────────────────────── */}
          <div className="px-6 pb-5 pt-3 border-t border-[rgba(0,0,0,0.06)] bg-white/60 backdrop-blur-sm">
            {studyContext && (
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-landing-primary/60" />
                <span className="text-[12px] text-landing-muted">Asking about study {studyContext.studyId.slice(0,8)}… ({studyContext.riskBucket})</span>
              </div>
            )}
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isStreaming}
                  placeholder="Ask about chest X-ray findings, protocols, or this study…"
                  rows={1}
                  className="w-full resize-none bg-white border border-[rgba(0,0,0,0.08)] rounded-[14px] px-4 py-3 text-[14px] text-landing-heading placeholder:text-landing-muted focus:outline-none focus:border-landing-primary/40 focus:ring-2 focus:ring-landing-primary/10 transition-all max-h-[140px] overflow-y-auto disabled:opacity-50 shadow-sm"
                  style={{ lineHeight: "1.5" }}
                  onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 140) + "px";
                  }}
                />
              </div>

              {isStreaming ? (
                <button
                  onClick={stopStreaming}
                  className="w-11 h-11 flex items-center justify-center rounded-[12px] bg-red-100 text-red-600 hover:bg-red-200 transition-colors shrink-0"
                  title="Stop"
                >
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="w-11 h-11 flex items-center justify-center rounded-[12px] bg-landing-primary text-white hover:bg-[#265A4C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  title="Send (Enter)"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-landing-muted mt-2 text-center">
              Powered by RAG + Gemini. Non-diagnostic — for workflow support only.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
