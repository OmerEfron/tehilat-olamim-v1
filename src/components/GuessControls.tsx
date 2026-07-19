"use client";

import { RANKS, SUITS, rankLabel, suitSymbol, type Suit } from "@/lib/cards";
import type {
  ColorGuess,
  Guess,
  HighLowGuess,
  RangeGuess,
  RankGuess,
  Step,
  SuitGuess,
} from "@/lib/game";

type GuessControlsProps = {
  step: Step;
  disabled?: boolean;
  onGuess: (guess: Guess) => void;
};

function ChoiceButton({
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "red" | "black" | "hearts" | "diamonds" | "clubs" | "spades";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`guess-btn tone-${tone}`}
    >
      {children}
    </button>
  );
}

export function GuessControls({ step, disabled, onGuess }: GuessControlsProps) {
  if (step === 1) {
    const pick = (value: ColorGuess) => onGuess({ step: 1, value });
    return (
      <div className="guess-panel">
        <p className="guess-prompt">Guess the color</p>
        <div className="guess-row">
          <ChoiceButton tone="red" disabled={disabled} onClick={() => pick("red")}>
            Red
          </ChoiceButton>
          <ChoiceButton tone="black" disabled={disabled} onClick={() => pick("black")}>
            Black
          </ChoiceButton>
        </div>
      </div>
    );
  }

  if (step === 2) {
    const pick = (value: HighLowGuess) => onGuess({ step: 2, value });
    return (
      <div className="guess-panel">
        <p className="guess-prompt">Higher, lower, or borders?</p>
        <div className="guess-row">
          <ChoiceButton disabled={disabled} onClick={() => pick("above")}>
            Above
          </ChoiceButton>
          <ChoiceButton disabled={disabled} onClick={() => pick("below")}>
            Below
          </ChoiceButton>
          <ChoiceButton disabled={disabled} onClick={() => pick("borders")}>
            Borders
          </ChoiceButton>
        </div>
      </div>
    );
  }

  if (step === 3) {
    const pick = (value: RangeGuess) => onGuess({ step: 3, value });
    return (
      <div className="guess-panel">
        <p className="guess-prompt">Where is the next card?</p>
        <div className="guess-row wrap">
          <ChoiceButton disabled={disabled} onClick={() => pick("below")}>
            Below
          </ChoiceButton>
          <ChoiceButton disabled={disabled} onClick={() => pick("between")}>
            Between
          </ChoiceButton>
          <ChoiceButton disabled={disabled} onClick={() => pick("above")}>
            Above
          </ChoiceButton>
          <ChoiceButton disabled={disabled} onClick={() => pick("borders")}>
            Borders
          </ChoiceButton>
        </div>
      </div>
    );
  }

  if (step === 4) {
    const pick = (value: SuitGuess) => onGuess({ step: 4, value });
    const labels: Record<Suit, string> = {
      hearts: "Hearts",
      diamonds: "Diamonds",
      clubs: "Clubs",
      spades: "Spades",
    };
    return (
      <div className="guess-panel">
        <p className="guess-prompt">Guess the suit</p>
        <div className="guess-row wrap">
          {SUITS.map((suit) => (
            <ChoiceButton
              key={suit}
              tone={suit}
              disabled={disabled}
              onClick={() => pick(suit)}
            >
              <span className="suit-glyph">{suitSymbol(suit)}</span>
              {labels[suit]}
            </ChoiceButton>
          ))}
        </div>
      </div>
    );
  }

  const pick = (value: RankGuess) => onGuess({ step: 5, value });
  return (
    <div className="guess-panel">
      <p className="guess-prompt">Guess the rank</p>
      <div className="guess-row wrap ranks">
        {RANKS.map((rank) => (
          <ChoiceButton key={rank} disabled={disabled} onClick={() => pick(rank)}>
            {rankLabel(rank)}
          </ChoiceButton>
        ))}
      </div>
    </div>
  );
}
