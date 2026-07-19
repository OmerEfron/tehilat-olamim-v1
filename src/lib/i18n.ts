import type { Rank, Suit } from "./cards";
import { rankLabel as rankLabelBase } from "./cards";
import type { HighLowGuess, RangeGuess, Step } from "./game";

export type Locale = "he" | "en";

export const RANGE_LABEL: Record<
  Locale,
  Record<RangeGuess | HighLowGuess, string>
> = {
  he: {
    above: "מעל",
    below: "מתחת",
    between: "בין לבין",
    borders: "גבולות",
  },
  en: {
    above: "Above",
    below: "Below",
    between: "Between",
    borders: "Borders",
  },
};

export const SUIT_LABEL: Record<Locale, Record<Suit, string>> = {
  he: {
    hearts: "לבבות",
    diamonds: "יהלומים",
    clubs: "תלתן",
    spades: "עלה",
  },
  en: {
    hearts: "Hearts",
    diamonds: "Diamonds",
    clubs: "Clubs",
    spades: "Spades",
  },
};

export function rankLabel(rank: Rank, locale: Locale): string {
  return rankLabelBase(rank, locale === "he");
}

/**
 * Add / edit reaction lines here.
 * One is picked at random each time that step is wrong or right.
 *
 * Step 3 wrong has two special buckets (see below).
 */
export const REACTIONS = {
  wrong: {
    1: {
      he: ["כל כך חלש", "ברצינות?", "אפילו את הצבע?", "חחחחח שמע אתה לא משחק"],
      en: ["So Weak!", "Really?", "Not even the color?", "Hahaha you don't even play"],
    },
    2: {
      he: ["אין לך מושג", "רחוק רחוק", "נסה לחשוב הפעם", "אתה לא מקשיב לי זה הבעיה שלך"],
      en: ["You don't know!", "Not even close", "Try thinking this time", "You don't listen to me this is your problem"],
    },
    /** Used when they did NOT guess borders. */
    3: {
      he: ["זה תמיד גבולות!", "גבולות. תמיד גבולות.", "שמע אני לא יודע כמה פעמים עוד אפשר להגיד לך"],
      en: ["It's always Borders!", "Borders. Always borders.", "Listen I don't know how many times I can tell you"],
    },
    4: {
      he: ["לא הצורה!", "פספסת את הצורה"],
      en: ["Wrong suit!", "Missed the suit"],
    },
    5: {
      he: ["כמעט!", "כל כך קרוב"],
      en: ["Close!", "So close"],
    },
  },
  /**
   * Step 3 only — when they guessed borders but were wrong.
   * Use `{truth}` for the real answer (מעל / מתחת / …).
   */
  wrongBorders: {
    he: ["לפעמים זה {truth}, נכון.", "הפעם זה {truth}."],
    en: [
      "Oh sometimes it's {truth}, right.",
      "This time it's {truth}.",
    ],
  },
  right: {
    1: {
      he: ["יפה", "בכיוון", "מתחילים טוב"],
      en: ["Nice", "Good start", "On track"],
    },
    2: {
      he: ["יופי", "יש כיוון", "ממשיכים"],
      en: ["Nice", "Looking good", "Keep going"],
    },
    3: {
      he: ["חזק", "יודע מה קורה", "עוד שניים"],
      en: ["Strong", "You know the game", "Two more"],
    },
    4: {
      he: ["כמעט שם", "עוד אחד", "על הסף"],
      en: ["Almost there", "One more", "On the edge"],
    },
    5: {
      he: ["תהילת עולמים!", "לא ייאמן"],
      en: ["Eternal Glory!", "Unbelievable"],
    },
  },
} as const;

function pickOne(options: readonly string[]): string {
  return options[Math.floor(Math.random() * options.length)] ?? options[0];
}

function fillTruth(template: string, truthLabel: string): string {
  return template.replaceAll("{truth}", truthLabel);
}

export function t(locale: Locale) {
  const he = locale === "he";

  return {
    locale,
    tagline: he
      ? "חמש ניחושים נכונים. תהילת עולמים אחת."
      : "Five correct guesses. One eternal glory.",
    attempt: (n: number) => (he ? `ניסיון ${n}` : `Attempt ${n}`),
    left: (n: number) => (he ? `${n} נותרו` : `${n} left`),
    deck: he ? "חפיסה" : "Deck",
    steps: he
      ? (["צבע", "מעל / מתחת", "טווח", "צורה", "מספר"] as const)
      : (["Color", "High / Low", "Range", "Suit", "Rank"] as const),
    prompts: {
      1: he ? "צבע" : "Guess the color",
      2: he ? "מעל, מתחת, או גבולות?" : "Higher, lower, or borders?",
      3: he ? "מעל, מתחת, בין לבין או גבולות?" : "Where is the next card?",
      4: he ? "צורה" : "Guess the suit",
      5: he ? "קלף מדויק" : "Guess the rank",
    },
    red: he ? "אדום" : "Red",
    black: he ? "שחור" : "Black",
    above: RANGE_LABEL[locale].above,
    below: RANGE_LABEL[locale].below,
    between: RANGE_LABEL[locale].between,
    borders: RANGE_LABEL[locale].borders,
    tryAgain: he ? "נסה שוב" : "Try again",
    playAgain: he ? "שחק שוב" : "Play again",
    brand: he ? "תהילת עולמים" : "Tehilat Olamim",
    winTitle: he ? "תהילת עולמים" : "Eternal Glory",
    winCopy: he
      ? "חמישה ניחושים נכונים ברצף."
      : "Five correct guesses in a row.",
    missFallbackTitle: he ? "פספסת" : "Missed",
    missFallbackCopy: he
      ? "ניחוש שגוי. מתחילים שוב מהקלף הראשון."
      : "Wrong guess. Start again from card one.",
  };
}

/** Random wrong-reaction for a step (one language). */
export function missTaunt(
  locale: Locale,
  step: Step,
  opts: {
    guessedBorders?: boolean;
    truth?: RangeGuess | HighLowGuess | null;
  } = {},
): string {
  if (step === 3 && opts.guessedBorders) {
    const truth = opts.truth ?? "between";
    const label =
      locale === "en"
        ? RANGE_LABEL.en[truth].toLowerCase()
        : RANGE_LABEL.he[truth];
    return fillTruth(pickOne(REACTIONS.wrongBorders[locale]), label);
  }

  return pickOne(REACTIONS.wrong[step][locale]);
}

/** Random right-reaction for a step (one language). */
export function hitTaunt(locale: Locale, step: Step): string {
  return pickOne(REACTIONS.right[step][locale]);
}
