import { ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  /** "up" (default) slides content in from 24px below; "none" fades only. */
  direction?: "up" | "none";
}

export function Reveal({ children, className, delayMs = 0, direction = "up" }: RevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn("transition-all ease-out", className)}
      style={{
        transitionDuration: "700ms",
        transitionDelay: `${delayMs}ms`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : direction === "up" ? "translateY(24px)" : "none",
      }}
    >
      {children}
    </div>
  );
}
