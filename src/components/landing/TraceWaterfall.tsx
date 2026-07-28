import { Reveal } from "@/components/ui/reveal";

interface TraceRow {
  label: string;
  detail: string;
  ms: number;
  colorClass: string;
}

const ROWS: TraceRow[] = [
  { label: "densenet121.forward", detail: "224×224 · pretrained", ms: 380, colorClass: "bg-kx-critical" },
  { label: "googlenet.forward", detail: "224×224 · aux_logits off", ms: 260, colorClass: "bg-kx-accent2" },
  { label: "resnet18.forward", detail: "224×224 · pretrained", ms: 190, colorClass: "bg-kx-accent3" },
  { label: "tanh_weighted_fusion", detail: "ensemble.weights.json", ms: 40, colorClass: "bg-amber-400" },
  { label: "gradcam.overlay", detail: "14×14 grid", ms: 90, colorClass: "bg-white/40" },
];

const TOTAL_MS = ROWS.reduce((sum, r) => sum + r.ms, 0);

/** A dark terminal-style panel, distinct from the light bordered cards elsewhere on the page. */
export function TraceWaterfall() {
  return (
    <div className="rounded-2xl bg-kx-ink overflow-hidden shadow-[0_30px_70px_-24px_rgba(18,21,26,0.35)]">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/20">
        <span className="font-mono text-[12px] text-white/50">study_7f2a91c4 · chest_xray.dcm</span>
        <span className="font-mono text-[12px] text-emerald-400 font-medium">{(TOTAL_MS / 1000).toFixed(2)}s · {ROWS.length} spans</span>
      </div>

      {/* Waterfall */}
      <div className="p-5 space-y-3">
        {ROWS.map((row, i) => {
          const widthPct = (row.ms / TOTAL_MS) * 100;
          return (
            <Reveal key={row.label} delayMs={i * 90} direction="none">
              <div className="flex items-center gap-4">
                <div className="w-40 flex-shrink-0">
                  <p className="font-mono text-[12px] text-white truncate">{row.label}</p>
                  <p className="text-[11px] text-white/40">{row.detail}</p>
                </div>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${row.colorClass} transition-all duration-700 ease-out`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="font-mono text-[12px] text-white/40 w-12 text-right flex-shrink-0">
                  {row.ms}ms
                </span>
              </div>
            </Reveal>
          );
        })}
      </div>

      <div className="px-5 py-3 border-t border-white/10 bg-black/20 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[12px] text-white/50">Representative timing: the actual pipeline stages your ensemble runs, illustrated.</span>
      </div>
    </div>
  );
}
