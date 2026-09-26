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

/**
 * Decides whether — and when — the hero footage is worth fetching.
 *
 * `public/hero.mp4` is 22 MB. With `autoPlay` set, the browser starts pulling it
 * the moment the element mounts, contending with the entry chunk and the
 * stylesheet for the same connection: roughly 18 s of the download on a 10 Mbps
 * link, during which the page that is already painted feels like it is still
 * loading. Nothing here needs the video to be present for the hero to look
 * finished — the generated ambient field below is the designed fallback, not a
 * placeholder — so the footage is treated as an enhancement that arrives late.
 *
 * Returns false until the page has finished its own load, and stays false for
 * viewers who have asked for less data or are on a connection that cannot
 * absorb it. Re-encoding the asset is still the real fix; this stops it being
 * on the critical path.
 */
function useDeferredHeroVideo(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // `connection` is not in the standard DOM lib and is absent on Safari.
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;

    if (connection?.saveData) return;
    if (connection?.effectiveType && /(^|-)(slow-)?2g$|^3g$/.test(connection.effectiveType)) return;

    let cancelled = false;
    const start = () => {
      if (!cancelled) setReady(true);
    };

    // After the load event, so the video queues behind the JS, CSS and fonts
    // rather than beside them. requestIdleCallback where available; Safari has
    // no such thing, hence the timeout.
    const schedule = () => {
      const ric = (window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback;
      if (ric) ric(start, { timeout: 3000 });
      else window.setTimeout(start, 600);
    };

    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
    };
  }, []);

  return ready;
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
  const videoReady = useDeferredHeroVideo();

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
      {/* `preload` is moot once `autoPlay` is set — the `videoReady` gate is what
          actually defers the fetch. It stays "none" so a browser that ignores
          autoplay does not pull 22 MB for footage it will never play. */}
      {src && !reducedMotion && videoReady && (
        <video
          ref={ref}
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
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
