import {
  type Card,
  type Rank,
  type Suit,
  createShuffledDeck,
  isRed,
  rankValue,
} from "./cards";

export type Step = 1 | 2 | 3 | 4 | 5;

export type ColorGuess = "red" | "black";
export type HighLowGuess = "above" | "below" | "borders";
export type RangeGuess = "above" | "below" | "between" | "borders";
export type SuitGuess = Suit;
export type RankGuess = Rank;

export type Guess =
  | { step: 1; value: ColorGuess }
  | { step: 2; value: HighLowGuess }
  | { step: 3; value: RangeGuess }
  | { step: 4; value: SuitGuess }
  | { step: 5; value: RankGuess };

export type Phase = "playing" | "revealing" | "missed" | "won";

export type GameState = {
  deck: Card[];
  table: (Card | null)[];
  step: Step;
  phase: Phase;
  lastResult: "correct" | "wrong" | null;
  lastGuess: Guess | null;
  /** Step the player failed on (for miss taunts). */
  missStep: Step | null;
  attempts: number;
};

export const MAX_PLAYERS = 9;

export function initialState(): GameState {
  return {
    deck: createShuffledDeck(),
    table: [null, null, null, null, null],
    step: 1,
    phase: "playing",
    lastResult: null,
    lastGuess: null,
    missStep: null,
    attempts: 1,
  };
}

/**
 * Draw one card. If the deck is empty mid-round, keep table cards out
 * and reshuffle the remaining 52 − table cards.
 */
export function drawCard(state: GameState): { card: Card; deck: Card[] } {
  let deck = state.deck;

  if (deck.length === 0) {
    const keptIds = new Set(
      state.table.filter((c): c is Card => c !== null).map((c) => c.id),
    );
    deck = createShuffledDeck().filter((c) => !keptIds.has(c.id));
  }

  const card = deck[0];
  return { card, deck: deck.slice(1) };
}

export function checkGuess(
  guess: Guess,
  card: Card,
  table: (Card | null)[],
): boolean {
  switch (guess.step) {
    case 1: {
      const color = isRed(card.suit) ? "red" : "black";
      return guess.value === color;
    }
    case 2: {
      const first = table[0];
      if (!first) return false;
      const a = rankValue(first.rank);
      const b = rankValue(card.rank);
      if (guess.value === "borders") return a === b;
      if (guess.value === "above") return b > a;
      return b < a;
    }
    case 3: {
      const first = table[0];
      const second = table[1];
      if (!first || !second) return false;
      const lo = Math.min(rankValue(first.rank), rankValue(second.rank));
      const hi = Math.max(rankValue(first.rank), rankValue(second.rank));
      const v = rankValue(card.rank);
      if (guess.value === "borders") return v === lo || v === hi;
      if (guess.value === "below") return v < lo;
      if (guess.value === "above") return v > hi;
      return v > lo && v < hi;
    }
    case 4:
      return guess.value === card.suit;
    case 5:
      return guess.value === card.rank;
  }
}

export function applyGuess(state: GameState, guess: Guess): GameState {
  if (state.phase !== "playing" || guess.step !== state.step) {
    return state;
  }

  const { card, deck } = drawCard(state);
  const correct = checkGuess(guess, card, state.table);
  const table = [...state.table] as (Card | null)[];
  table[state.step - 1] = card;

  if (!correct) {
    return {
      ...state,
      deck,
      table,
      phase: "missed",
      lastResult: "wrong",
      lastGuess: guess,
      missStep: state.step,
    };
  }

  if (state.step === 5) {
    return {
      ...state,
      deck,
      table,
      phase: "won",
      lastResult: "correct",
      lastGuess: guess,
      missStep: null,
    };
  }

  return {
    ...state,
    deck,
    table,
    step: (state.step + 1) as Step,
    phase: "playing",
    lastResult: "correct",
    lastGuess: guess,
    missStep: null,
  };
}

/** After a miss: clear the table and continue with the remaining deck. */
export function startNextAttempt(state: GameState): GameState {
  return {
    ...state,
    table: [null, null, null, null, null],
    step: 1,
    phase: "playing",
    lastResult: null,
    lastGuess: null,
    missStep: null,
    attempts: state.attempts + 1,
  };
}

export function restartGame(): GameState {
  return initialState();
}

export function isGuess(value: unknown): value is Guess {
  if (!value || typeof value !== "object") return false;
  const g = value as { step?: unknown; value?: unknown };
  if (typeof g.step !== "number" || g.value == null) return false;

  switch (g.step) {
    case 1:
      return g.value === "red" || g.value === "black";
    case 2:
      return (
        g.value === "above" || g.value === "below" || g.value === "borders"
      );
    case 3:
      return (
        g.value === "above" ||
        g.value === "below" ||
        g.value === "between" ||
        g.value === "borders"
      );
    case 4:
      return (
        g.value === "hearts" ||
        g.value === "diamonds" ||
        g.value === "clubs" ||
        g.value === "spades"
      );
    case 5:
      return (
        typeof g.value === "string" &&
        [
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "J",
          "Q",
          "K",
          "A",
        ].includes(g.value)
      );
    default:
      return false;
  }
}
