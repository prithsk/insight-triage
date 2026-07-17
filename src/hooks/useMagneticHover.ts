import { useRef } from "react";

/** Cursor-reactive "magnetic" pull on hover — element leans toward the pointer. */
export function useMagneticHover<T extends HTMLElement>(strength = 0.25) {
  const ref = useRef<T | null>(null);

  const onMouseMove = (e: React.MouseEvent<T>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    node.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };

  const onMouseLeave = () => {
    const node = ref.current;
    if (!node) return;
    node.style.transform = "translate(0, 0)";
  };

  return { ref, onMouseMove, onMouseLeave };
}
