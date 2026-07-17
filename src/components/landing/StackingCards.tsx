import { ReactNode } from "react";

export interface StackCard {
  step: string;
  title: string;
  body: string;
  accent?: ReactNode;
}

interface StackingCardsProps {
  cards: StackCard[];
}

/**
 * Sticky stacking cards: each card pins near the top as you scroll, and the
 * next card scrolls up and settles just below it — building a physical stack
 * instead of scrolling content off-screen.
 */
export function StackingCards({ cards }: StackingCardsProps) {
  return (
    <div className="relative">
      {cards.map((card, i) => (
        <div
          key={card.step}
          className="sticky"
          style={{ top: `${120 + i * 28}px`, zIndex: i + 1 }}
        >
          <div
            className="group rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-8 md:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] mb-8 transition-shadow duration-300 hover:shadow-[0_20px_60px_-16px_rgba(47,111,94,0.28)]"
            style={{ marginTop: i === 0 ? 0 : "2rem" }}
          >
            <div className="flex items-start gap-6">
              <span className="font-mono text-[13px] font-semibold text-white bg-landing-primary rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0">
                {card.step}
              </span>
              <div className="flex-1">
                <h3 className="font-serif text-2xl md:text-[28px] text-landing-heading mb-3 tracking-[-0.01em]">
                  {card.title}
                </h3>
                <p className="text-[16px] md:text-[17px] text-landing-body leading-relaxed max-w-2xl">
                  {card.body}
                </p>
                {card.accent && <div className="mt-6">{card.accent}</div>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
