import { useRef, useState, useEffect } from "react";

interface ScrollHighlightTextProps {
  text: string;
  /** How tall the scroll track is, in viewport heights. More = slower reveal. */
  heightVh?: number;
  /** Background applied to the pinned viewport panel. */
  bgClass?: string;
}

/**
 * A pinned section: the text sits centered and holds while you scroll past it,
 * lighting up word-by-word (dim → full) as scroll progresses, then releases.
 */
export function ScrollHighlightText({ text, heightVh = 160, bgClass = "" }: ScrollHighlightTextProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const words = text.split(" ");

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setProgress(total > 0 ? scrolled / total : 0);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Finish lighting all words by 92% of the scroll track, then hold fully-lit
  // for the short final stretch so the section never releases mid-word.
  const litCount = Math.min(progress / 0.92, 1) * words.length;

  return (
    <div ref={trackRef} style={{ height: `${heightVh}vh` }} className="relative">
      <div className={`sticky top-0 h-screen flex items-center justify-center px-8 ${bgClass}`}>
        <p className="font-serif text-[32px] md:text-[48px] lg:text-[56px] leading-[1.25] tracking-[-0.01em] max-w-4xl text-center">
          {words.map((word, i) => {
            // Smooth per-word transition: fully lit once litCount passes it,
            // partial as the wavefront crosses it.
            const t = Math.min(Math.max(litCount - i, 0), 1);
            return (
              <span
                key={i}
                style={{ color: `rgba(27, 31, 29, ${0.15 + t * 0.85})` }}
                className="transition-colors duration-100"
              >
                {word}{" "}
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
}
