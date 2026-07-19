"use client";

import { forwardRef } from "react";
import { type Card, isRed, rankLabel, suitSymbol } from "@/lib/cards";

type PlayingCardProps = {
  card: Card | null;
  /** Empty outline when no card has been dealt yet. */
  empty?: boolean;
  faceUp?: boolean;
  label?: string;
  highlight?: "correct" | "wrong" | null;
  /** Active step / future dimming for play hierarchy. */
  slotState?: "active" | "future" | "done" | null;
  winGlow?: boolean;
  className?: string;
};

export const PlayingCard = forwardRef<HTMLDivElement, PlayingCardProps>(
  function PlayingCard(
    {
      card,
      empty = false,
      faceUp = false,
      label,
      highlight = null,
      slotState = null,
      winGlow = false,
      className = "",
    },
    ref,
  ) {
    const red = card ? isRed(card.suit) : false;
    const symbol = card ? suitSymbol(card.suit) : "";
    const showCard = Boolean(card) && !empty;

    const slotClass = [
      "card-slot",
      slotState === "active" ? "is-active" : "",
      slotState === "future" ? "is-future" : "",
      winGlow ? "is-win-glow" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={slotClass}>
        {label ? <span className="card-slot-label">{label}</span> : null}
        <div
          ref={ref}
          className={`card-scene ${highlight === "correct" ? "card-glow-ok" : ""} ${highlight === "wrong" ? "card-glow-miss" : ""} ${empty || !showCard ? "is-empty" : ""}`}
        >
          {empty || !showCard ? (
            <div className="card-placeholder" aria-hidden />
          ) : (
            <div className={`card-flip ${faceUp ? "is-flipped" : ""}`}>
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
          )}
        </div>
      </div>
    );
  },
);
