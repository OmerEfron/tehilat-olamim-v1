"use client";

import { RANKS, SUITS, suitSymbol, type Suit } from "@/lib/cards";
import { rankLabel, SUIT_LABEL } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
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
  const { locale, copy } = useLocale();

  if (step === 1) {
    const pick = (value: ColorGuess) => onGuess({ step: 1, value });
    return (
      <div className="guess-panel">
        <p className="guess-prompt">{copy.prompts[1]}</p>
        <div className="guess-row">
          <ChoiceButton tone="red" disabled={disabled} onClick={() => pick("red")}>
            {copy.red}
          </ChoiceButton>
          <ChoiceButton
            tone="black"
            disabled={disabled}
            onClick={() => pick("black")}
          >
            {copy.black}
          </ChoiceButton>
        </div>
      </div>
    );
  }

  if (step === 2) {
    const pick = (value: HighLowGuess) => onGuess({ step: 2, value });
    return (
      <div className="guess-panel">
        <p className="guess-prompt">{copy.prompts[2]}</p>
        <div className="guess-row">
          <ChoiceButton disabled={disabled} onClick={() => pick("above")}>
            {copy.above}
          </ChoiceButton>
          <ChoiceButton disabled={disabled} onClick={() => pick("below")}>
            {copy.below}
          </ChoiceButton>
          <ChoiceButton disabled={disabled} onClick={() => pick("borders")}>
            {copy.borders}
          </ChoiceButton>
        </div>
      </div>
    );
  }

  if (step === 3) {
    const pick = (value: RangeGuess) => onGuess({ step: 3, value });
    return (
      <div className="guess-panel">
        <p className="guess-prompt">{copy.prompts[3]}</p>
        <div className="guess-row wrap">
          <ChoiceButton disabled={disabled} onClick={() => pick("below")}>
            {copy.below}
          </ChoiceButton>
          <ChoiceButton disabled={disabled} onClick={() => pick("between")}>
            {copy.between}
          </ChoiceButton>
          <ChoiceButton disabled={disabled} onClick={() => pick("above")}>
            {copy.above}
          </ChoiceButton>
          <ChoiceButton disabled={disabled} onClick={() => pick("borders")}>
            {copy.borders}
          </ChoiceButton>
        </div>
      </div>
    );
  }

  if (step === 4) {
    const pick = (value: SuitGuess) => onGuess({ step: 4, value });
    return (
      <div className="guess-panel">
        <p className="guess-prompt">{copy.prompts[4]}</p>
        <div className="guess-row wrap">
          {SUITS.map((suit: Suit) => (
            <ChoiceButton
              key={suit}
              tone={suit}
              disabled={disabled}
              onClick={() => pick(suit)}
            >
              <span className="suit-glyph">{suitSymbol(suit)}</span>
              {SUIT_LABEL[locale][suit]}
            </ChoiceButton>
          ))}
        </div>
      </div>
    );
  }

  const pick = (value: RankGuess) => onGuess({ step: 5, value });
  return (
    <div className="guess-panel">
      <p className="guess-prompt">{copy.prompts[5]}</p>
      <div className="guess-row ranks">
        {RANKS.map((rank) => (
          <ChoiceButton key={rank} disabled={disabled} onClick={() => pick(rank)}>
            {rankLabel(rank, locale)}
          </ChoiceButton>
        ))}
      </div>
    </div>
  );
}
