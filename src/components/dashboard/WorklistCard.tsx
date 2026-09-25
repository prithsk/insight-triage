import { WorklistItem, RiskBucket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import {
  targetStateOf, formatTargetLabel, formatDuration, describeTarget, arrivedAtOf,
  type TargetTone,
} from "@/lib/worklistOrder";

/**
 * One worklist row.
 *
 * This was a card: `rounded-xl`, a coloured ring when selected, a drop shadow,
 * and `hover:-translate-y-0.5` so every row lifted under the cursor. That reads
 * as a consumer app rather than a tool someone sits in for eight hours, and the
 * lift actively hurts a dense list — rows nudge their neighbours as the pointer
 * travels down the page.
 *
 * It is now a table-style row, taking the design from the W4 "Clock" variant in
 * `WorklistVariants.tsx`: hairline separators, monospace and `tabular-nums` so
 * figures align down the column, severity as a 3px left rule instead of a badge
 * with an icon, and an elapsed-vs-target bar that shows *why* the row sits where
 * it does. Colour appears only at the two thresholds where colour means
 * something. A list where every row is coloured tells a radiologist nothing.
 *
 * ACCESSIBILITY, because this is clinical software:
 *  - the row is a real <button>, so it is tab-reachable and Enter/Space work,
 *    with a visible focus ring;
 *  - severity and breach are never signalled by colour alone — each carries text
 *    ("Critical", "18m over");
 *  - the progress bar has role="progressbar" with its value and a label;
 *  - `kx-critical` (3.7:1 on white) stays a fill only. Text uses
 *    `kx-critical-ink` (6.0:1) and `kx-warn` (5.0:1), which clear SC 1.4.3.
 */

interface WorklistCardProps {
  item: WorklistItem;
  isSelected: boolean;
  isChecked: boolean;
  isMinimized?: boolean;
  /**
   * Epoch ms from the page's single clock. Passed in rather than read here so
   * every row and the sort itself are computed from the same instant — a row
   * that disagrees with its own position in the list is worse than no row.
   * Falls back to `Date.now()` only so the component stays usable in isolation.
   */
  now?: number;
  onSelect: () => void;
  onCheck: (checked: boolean) => void;
}

/** Text colour for the time-to-target figure. Inside the window is plain muted. */
const toneText: Record<TargetTone, string> = {
  over:        "text-kx-critical-ink",
  approaching: "text-kx-warn",
  ok:          "text-kx-muted",
  none:        "text-kx-muted",
};

/** Bar fill. Neutral until the study is actually close to missing its target. */
const toneFill: Record<TargetTone, string> = {
  over:        "bg-kx-critical",
  approaching: "bg-kx-warn",
  ok:          "bg-kx-accent3",
  none:        "bg-kx-muted/40",
};

const bucketConfig: Record<RiskBucket, { label: string; rule: string; text: string }> = {
  CRITICAL: { label: "Critical", rule: "bg-kx-critical",  text: "text-kx-critical-ink" },
  REVIEW:   { label: "Review",   rule: "bg-kx-warn",      text: "text-kx-warn" },
  CLEAR:    { label: "Clear",    rule: "bg-kx-accent3",   text: "text-kx-muted" },
};

export function WorklistCard({
  item, isSelected, isChecked, isMinimized = false, now, onSelect, onCheck,
}: WorklistCardProps) {
  const bucket = item.triage?.risk_bucket;
  const config = bucket ? bucketConfig[bucket] : null;

  const at = now ?? Date.now();
  const target = targetStateOf(item, at);
  const targetTitle = describeTarget(target);
  const tone: TargetTone = target ? target.tone : "none";

  // Untriaged studies have no target, so show what IS known: how long they have
  // been waiting for the model. They sort below every scored study (see the
  // UNSCORED note in worklistOrder), and this is the row-level signal that the
  // position is deliberate rather than an accident.
  const arrivedAt = arrivedAtOf(item);
  const waitingLabel = Number.isFinite(arrivedAt)
    ? `awaiting triage · ${formatDuration(at - arrivedAt)}`
    : "awaiting triage";

  // Fraction of the target window consumed. Capped at 100 so an overdue study
  // renders a full bar rather than overflowing; the figure beside it carries
  // the actual overage.
  const consumed = target
    ? Math.min(100, (target.elapsed / target.target) * 100)
    : 0;

  const formatStudyTime = (timeStr: string) => {
    try {
      return format(parseISO(timeStr), "MMM d, HH:mm");
    } catch {
      return timeStr;
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-stretch border-b border-kx-border/70 last:border-b-0 transition-colors",
        isSelected ? "bg-kx-surface2" : "bg-white hover:bg-kx-surface/60"
      )}
    >
      {/* Severity as a left rule. Paired with the text label further right, so
          this is reinforcement rather than the only signal. */}
      <span
        aria-hidden
        className={cn("w-[3px] shrink-0", config ? config.rule : "bg-transparent")}
      />

      <div className="shrink-0 flex items-center pl-3" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isChecked}
          onCheckedChange={onCheck}
          aria-label={`Select study ${item.study.patient_hash}`}
          className="border-kx-muted data-[state=checked]:bg-kx-accent3 data-[state=checked]:border-kx-accent3"
        />
      </div>

      {/* A real button: tab-reachable, Enter/Space activate, visible focus. The
          old card was a div with onClick and was unreachable by keyboard. */}
      <button
        type="button"
        onClick={onSelect}
        aria-current={isSelected ? "true" : undefined}
        className="flex-1 min-w-0 flex items-center gap-4 px-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-kx-accent2 focus-visible:ring-inset"
      >
        {/* Study ID — collapses when the preview pane takes the width */}
        <span
          className={cn(
            "shrink-0 overflow-hidden transition-all duration-300 font-mono text-[12px] text-kx-muted whitespace-nowrap",
            isMinimized ? "w-0 opacity-0" : "w-[190px] opacity-100"
          )}
        >
          {item.study.id}
        </span>

        <span className="shrink-0 w-[112px] font-mono text-[13px] text-kx-ink truncate">
          {item.study.patient_hash}
        </span>

        <span
          className="shrink-0 w-[104px] font-mono text-[12px] text-kx-muted tabular-nums hidden md:block"
          title="Upload time. This is when the file reached Kroix, not the department's arrival time."
        >
          {formatStudyTime(item.study.study_time)}
        </span>

        <span className="shrink-0 w-[34px] font-mono text-[11px] text-kx-muted hidden sm:block">
          {item.study.modality ?? "—"}
        </span>

        {/* Time to read-time target — why this row sits where it does. The bar
            is the W4 signature: position in the queue made legible. */}
        <span className="flex-1 min-w-[132px] flex items-center gap-2.5" title={targetTitle}>
          <span className="flex-1 h-1 rounded-full bg-kx-surface2 overflow-hidden">
            <span
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(consumed)}
              aria-label={target ? `${Math.round(consumed)}% of read-time target elapsed` : "No read-time target"}
              className={cn("block h-full rounded-full transition-[width] duration-500", toneFill[tone])}
              style={{ width: target ? `${consumed}%` : "0%" }}
            />
          </span>
          <span
            className={cn(
              "shrink-0 font-mono text-[12px] tabular-nums text-right whitespace-nowrap",
              target ? "w-[72px]" : "w-auto",
              toneText[tone]
            )}
          >
            {target ? formatTargetLabel(target) : waitingLabel}
          </span>
        </span>

        {/* Severity, as text. Never colour alone. */}
        <span
          className={cn(
            "shrink-0 w-[56px] font-mono text-[11.5px] hidden lg:block",
            config ? config.text : "text-kx-muted"
          )}
        >
          {config ? config.label : "—"}
        </span>

        <span
          className={cn(
            "shrink-0 w-[42px] font-mono text-[13px] tabular-nums text-right",
            config ? config.text : "text-kx-muted"
          )}
        >
          {item.triage ? `${(item.triage.risk_score * 100).toFixed(0)}%` : "—"}
        </span>
      </button>
    </div>
  );
}
