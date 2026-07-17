import { useEffect, useState } from "react";

/** Returns 0 at the top of the page, ramping to 1 by `distance` px of scroll. */
export function useScrollProgress(distance = 120) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const p = Math.min(1, window.scrollY / distance);
      setProgress(p);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [distance]);

  return progress;
}
