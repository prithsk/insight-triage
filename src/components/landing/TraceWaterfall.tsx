import { Reveal } from "@/components/ui/reveal";

interface TraceRow {
  label: string;
  detail: string;
  ms: number;
  colorClass: string;
}

const ROWS: TraceRow[] = [
  { label: "densenet121.forward", detail: "224×224 · pretrained", ms: 380, colorClass: "bg-landing-primary" },
  { label: "googlenet.forward", detail: "224×224 · aux_logits off", ms: 260, colorClass: "bg-landing-secondary" },
  { label: "resnet18.forward", detail: "224×224 · pretrained", ms: 190, colorClass: "bg-landing-primary/70" },
  { label: "tanh_weighted_fusion", detail: "ensemble.weights.json", ms: 40, colorClass: "bg-landing-accent" },
  { label: "gradcam.overlay", detail: "14×14 grid", ms: 90, colorClass: "bg-landing-muted" },
];

const TOTAL_MS = ROWS.reduce((sum, r) => sum + r.ms, 0);

export function TraceWaterfall() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white overflow-hidden shadow-[0_20px_70px_-20px_rgba(0,0,0,0.6)]">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(0,0,0,0.06)] bg-landing-bg/60">
        <span className="font-mono text-[12px] text-landing-muted">study_7f2a91c4 · chest_xray.dcm</span>
        <span className="font-mono text-[12px] text-landing-primary font-medium">{(TOTAL_MS / 1000).toFixed(2)}s · {ROWS.length} spans</span>
      </div>

      {/* Waterfall */}
      <div className="p-5 space-y-3">
        {ROWS.map((row, i) => {
          const widthPct = (row.ms / TOTAL_MS) * 100;
          return (
            <Reveal key={row.label} delayMs={i * 90} direction="none">
              <div className="flex items-center gap-4">
                <div className="w-40 flex-shrink-0">
                  <p className="font-mono text-[12px] text-landing-heading truncate">{row.label}</p>
                  <p className="text-[11px] text-landing-muted">{row.detail}</p>
                </div>
                <div className="flex-1 h-2 bg-landing-bg rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${row.colorClass} transition-all duration-700 ease-out`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="font-mono text-[12px] text-landing-muted w-12 text-right flex-shrink-0">
                  {row.ms}ms
                </span>
              </div>
            </Reveal>
          );
        })}
      </div>

      <div className="px-5 py-3 border-t border-[rgba(0,0,0,0.06)] bg-landing-bg/40 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-landing-primary animate-pulse" />
        <span className="text-[12px] text-landing-body">Representative timing — the actual pipeline stages your ensemble runs, illustrated.</span>
      </div>
    </div>
  );
}
