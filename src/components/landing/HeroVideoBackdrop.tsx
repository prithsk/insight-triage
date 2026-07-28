import { useEffect, useRef, useState } from "react";

/**
 * Tracks the user's reduced-motion preference, including mid-session changes.
 * The rest of this page's motion honors it via the `@media (prefers-reduced-motion)`
 * block in index.css, but a <video> element can't be stopped from CSS.
 */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

interface HeroVideoBackdropProps {
  /** Drop an .mp4 in /public and pass e.g. "/hero.mp4". Falls back gracefully. */
  src?: string;
  poster?: string;
  /** 0–1. How much dark scrim sits over the footage so text stays readable. */
  scrim?: number;
  className?: string;
  /** false = a clean hard cut into the next section (Legora/Harvey style), no bottom gradient. */
  fadeBottom?: boolean;
}

/**
 * Full-bleed ambient background for cinematic heroes, in the Harvey/Legora mould.
 *
 * If `src` is supplied and the file plays, you get muted autoplay footage under a
 * scrim. If there's no file yet (or the browser blocks autoplay), it degrades to a
 * generated ambient field — slow drifting light and a faint scan grid — so the
 * hero never renders as a flat empty box while the asset is still being shot.
 */
export function HeroVideoBackdrop({
  src,
  poster,
  scrim = 0.62,
  className = "",
  fadeBottom = true,
}: HeroVideoBackdropProps) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      {/* Generated ambient field — always rendered, hidden once real footage plays */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{ opacity: playing ? 0 : 1, background: "#0B0E11" }}
      >
        <div
          className="absolute inset-0 kx-drift"
          style={{
            background:
              "radial-gradient(900px circle at 22% 28%, rgba(59,91,255,0.30), transparent 58%)," +
              "radial-gradient(760px circle at 78% 66%, rgba(232,80,58,0.22), transparent 60%)," +
              "radial-gradient(680px circle at 55% 12%, rgba(15,157,110,0.18), transparent 62%)",
          }}
        />
        {/* faint scan grid, a nod to the imaging surface without being literal */}
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(circle at 50% 45%, black, transparent 72%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 45%, black, transparent 72%)",
          }}
        />
      </div>

      {/* Reduced-motion users fall through to the static ambient field above.
          A looping autoplay video is continuous motion with no pause control
          (WCAG 2.2.2), and CSS alone cannot stop a <video>. */}
      {src && !reducedMotion && (
        <video
          ref={ref}
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onPlaying={() => setPlaying(true)}
          onError={() => setPlaying(false)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
          style={{ opacity: playing ? 1 : 0 }}
        />
      )}

      {/* scrim, plus an optional soft fade into the page below it */}
      <div className="absolute inset-0" style={{ background: `rgba(8,10,13,${scrim})` }} />
      {fadeBottom && (
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-kx-canvas to-transparent" />
      )}
    </div>
  );
}
