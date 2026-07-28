import { useEffect, useRef, useState } from "react";

/**
 * Tracks pointer position within a container for a crosshair/reticle follower.
 * Disabled on touch devices (no fine pointer) and under prefers-reduced-motion.
 */
export function useCursorReticle<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(hasFinePointer && !reducedMotion);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;

    const onMove = (e: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    const onLeave = () => setPos(null);

    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled]);

  return { ref, pos, enabled };
}
