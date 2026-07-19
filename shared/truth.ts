import { type Card, rankValue } from "./cards";
import type { HighLowGuess, RangeGuess } from "./game";

export function highLowTruth(first: Card, drawn: Card): HighLowGuess {
  const a = rankValue(first.rank);
  const b = rankValue(drawn.rank);
  if (a === b) return "borders";
  if (b > a) return "above";
  return "below";
}

export function rangeTruth(
  first: Card,
  second: Card,
  drawn: Card,
): RangeGuess {
  const lo = Math.min(rankValue(first.rank), rankValue(second.rank));
  const hi = Math.max(rankValue(first.rank), rankValue(second.rank));
  const v = rankValue(drawn.rank);
  if (v === lo || v === hi) return "borders";
  if (v < lo) return "below";
  if (v > hi) return "above";
  return "between";
}
