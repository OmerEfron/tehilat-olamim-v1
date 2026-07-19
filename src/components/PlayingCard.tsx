"use client";

import { type Card, isRed, rankLabel, suitSymbol } from "@/lib/cards";

type PlayingCardProps = {
  card: Card | null;
  faceUp?: boolean;
  label?: string;
  highlight?: "correct" | "wrong" | null;
  size?: "md" | "lg";
};

export function PlayingCard({
  card,
  faceUp = false,
  label,
  highlight = null,
  size = "lg",
}: PlayingCardProps) {
  const dim =
    size === "lg"
      ? "w-[6.4rem] h-[9rem] sm:w-[7.5rem] sm:h-[10.5rem]"
      : "w-[5.5rem] h-[7.7rem]";

  const red = card ? isRed(card.suit) : false;
  const symbol = card ? suitSymbol(card.suit) : "";

  return (
    <div className="flex flex-col items-center gap-2">
      {label ? (
        <span className="text-[0.7rem] uppercase tracking-[0.18em] text-[var(--felt-mist)]">
          {label}
        </span>
      ) : null}
      <div
        className={`card-scene ${dim} ${highlight === "correct" ? "card-glow-ok" : ""} ${highlight === "wrong" ? "card-glow-miss" : ""}`}
      >
        <div className={`card-flip ${faceUp && card ? "is-flipped" : ""}`}>
          <div className="card-face card-back" aria-hidden={faceUp}>
            <div className="card-back-pattern" />
          </div>
          <div
            className={`card-face card-front ${red ? "is-red" : "is-black"}`}
            aria-hidden={!faceUp}
          >
            {card ? (
              <>
                <div className="card-corner top">
                  <span className="card-rank">{card.rank}</span>
                  <span className="card-suit">{symbol}</span>
                </div>
                <div
                  className="card-center"
                  aria-label={`${rankLabel(card.rank)} of ${card.suit}`}
                >
                  <span className="card-center-suit">{symbol}</span>
                </div>
                <div className="card-corner bottom">
                  <span className="card-rank">{card.rank}</span>
                  <span className="card-suit">{symbol}</span>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
