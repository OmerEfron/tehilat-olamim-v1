"use client";

import { forwardRef } from "react";
import { useLocale } from "@/lib/locale";

type DeckPileProps = {
  count: number;
};

export const DeckPile = forwardRef<HTMLDivElement, DeckPileProps>(
  function DeckPile({ count }, ref) {
    const { copy } = useLocale();
    const layers = Math.min(4, Math.max(1, Math.ceil(count / 13)));

    return (
      <div className="deck-pile">
        <span className="deck-label">{copy.deck}</span>
        <div
          className="deck-stack"
          ref={ref}
          aria-label={`${count} ${copy.deck}`}
        >
          {Array.from({ length: layers }, (_, i) => (
            <div
              key={i}
              className="deck-layer card-face card-back"
              style={{
                transform: `translate(${i * 2}px, ${-i * 2}px)`,
                zIndex: i,
              }}
            >
              <div className="card-back-pattern" />
            </div>
          ))}
        </div>
        <span className="deck-count">{count}</span>
      </div>
    );
  },
);
