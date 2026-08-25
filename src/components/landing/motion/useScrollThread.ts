import { useEffect, useRef, useState } from "react";

/**
 * Scroll progress for a container, 0 → 1, sampled on rAF.
 *
 * WHY NOT GSAP. ScrollTrigger is ~50KB gzipped and the production bundle is
 * already 1.25MB. One scroll-linked motif does not justify that, and the whole
 * requirement here is a single scalar the motifs read.
 *
 * REDUCED MOTION IS NOT OPTIONAL. Every variant that uses this drives a
 * continuous, page-length animation — exactly the class of motion that causes
 * vestibular problems. When the user has asked for reduced motion the hook
 * returns a fixed value and never attaches a listener, so the page renders its
 * end state and stays still. CSS cannot save us here: these are JS-driven
 * transforms, so the check has to happen at the source.
 */
export function useScrollThread(reducedValue = 1) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);
  const frame = useRef<number>();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduced(true);
      setProgress(reducedValue);
      return;
    }

    const read = () => {
      frame.current = undefined;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      // 0 when the container's top hits the viewport top, 1 when its bottom does.
      const p = Math.min(1, Math.max(0, -rect.top / total));
      setProgress(p);
    };

    const onScroll = () => {
      if (frame.current !== undefined) return; // coalesce to one read per frame
      frame.current = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, [reducedValue]);

  return { ref, progress, reduced };
}

/** Map progress through a window, clamped 0-1. Lets a motif act over one stretch. */
export function segment(p: number, start: number, end: number) {
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (p - start) / (end - start)));
}
