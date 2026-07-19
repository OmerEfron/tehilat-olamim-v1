export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
};

export const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
export const RANKS: Rank[] = [
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
];

/** Ace is biggest (14), 2 is smallest (2). */
export function rankValue(rank: Rank): number {
  switch (rank) {
    case "J":
      return 11;
    case "Q":
      return 12;
    case "K":
      return 13;
    case "A":
      return 14;
    default:
      return Number(rank);
  }
}

export function isRed(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}

export function suitSymbol(suit: Suit): string {
  switch (suit) {
    case "hearts":
      return "♥";
    case "diamonds":
      return "♦";
    case "clubs":
      return "♣";
    case "spades":
      return "♠";
  }
}

export function rankLabel(rank: Rank, hebrew = false): string {
  if (!hebrew) {
    switch (rank) {
      case "A":
        return "Ace";
      case "J":
        return "Jack";
      case "Q":
        return "Queen";
      case "K":
        return "King";
      default:
        return rank;
    }
  }

  switch (rank) {
    case "A":
      return "אס";
    case "J":
      return "נסיך";
    case "Q":
      return "מלכה";
    case "K":
      return "מלך";
    default:
      return rank;
  }
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}-${suit}`, suit, rank });
    }
  }
  return deck;
}

/** Fisher–Yates shuffle (in place, returns same array). */
export function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function createShuffledDeck(): Card[] {
  return shuffle(createDeck());
}
