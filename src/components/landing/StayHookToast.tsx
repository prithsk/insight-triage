import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";

const DELAY_MS = 10_000;
const DISMISS_KEY = "kx-stay-hook-dismissed";

/**
 * Bottom-right nudge that appears after a visitor has lingered on the landing
 * page for a while — a soft "you've read this far, go try it" hook rather than
 * an exit-intent popup. Shows once per session; a manual close suppresses it
 * for the rest of the visit.
 */
export function StayHookToast() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    const t = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setVisible(false);
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, "1");
  };

  if (!visible || dismissed) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[320px] kx-fadein"
      role="dialog"
      aria-label="Try Kroix"
    >
      <div className="relative rounded-2xl bg-white border border-kx-border shadow-[0_30px_70px_-24px_rgba(18,21,26,0.35)] p-5">
        <button
          onClick={close}
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-kx-muted hover:text-kx-ink transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-kx-accent3 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-kx-accent3 animate-pulse" />
          Still reading?
        </span>

        <p className="font-display text-[16px] font-medium text-kx-ink leading-snug mb-2">
          See a real queue reorder itself.
        </p>
        <p className="text-[13px] text-kx-muted leading-relaxed mb-4">
          The dashboard is live — open it and watch a critical study jump to the top the same way it
          would in production.
        </p>

        <Link to="/dashboard" onClick={close}>
          <button className="w-full px-4 py-2.5 bg-kx-ink text-white rounded-full text-[13.5px] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            Open the live dashboard
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}
