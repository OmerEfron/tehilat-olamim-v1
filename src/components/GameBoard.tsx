"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { DeckPile } from "@/components/DeckPile";
import { FlyingCard } from "@/components/FlyingCard";
import { PlayingCard } from "@/components/PlayingCard";
import { GuessControls } from "@/components/GuessControls";
import type { Card } from "@/lib/cards";
import { hitTaunt, missTaunt } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { rangeTruth } from "@/lib/truth";
import {
  applyGuess,
  initialState,
  restartGame,
  startNextAttempt,
  type GameState,
  type Guess,
} from "@/lib/game";

type Action =
  | { type: "guess"; guess: Guess }
  | { type: "next" }
  | { type: "restart" };

type DealPhase = "fly" | "land" | "flip";

type DealVisual = {
  index: number;
  card: Card;
  phase: DealPhase;
};

type FlyRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  moving: boolean;
};

const DEAL_MS = 480;
const FLIP_MS = 420;

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "guess":
      return applyGuess(state, action.guess);
    case "next":
      return startNextAttempt(state);
    case "restart":
      return restartGame();
  }
}

function lastFilledIndex(table: (Card | null)[]): number {
  for (let i = table.length - 1; i >= 0; i -= 1) {
    if (table[i] !== null) return i;
  }
  return -1;
}

export function GameBoard() {
  const { locale, copy, toggleLocale } = useLocale();
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [busy, setBusy] = useState(false);
  const [deal, setDeal] = useState<DealVisual | null>(null);
  const [fly, setFly] = useState<FlyRect | null>(null);
  const [settled, setSettled] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);

  const deckRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pendingDealRef = useRef(false);

  const beginDeal = useCallback((index: number, card: Card) => {
    setBusy(true);
    setFly(null);
    setDeal({ index, card, phase: "fly" });
  }, []);

  useEffect(() => {
    if (!pendingDealRef.current) return;
    if (state.lastResult === null) return;

    const index = lastFilledIndex(state.table);
    const card = index >= 0 ? state.table[index] : null;
    if (!card) return;

    pendingDealRef.current = false;
    beginDeal(index, card);
  }, [state.table, state.lastResult, beginDeal]);

  useLayoutEffect(() => {
    if (!deal || deal.phase !== "fly") return;

    const deckEl = deckRef.current;
    const slotEl = slotRefs.current[deal.index];
    if (!deckEl || !slotEl) return;

    const from = deckEl.getBoundingClientRect();
    const to = slotEl.getBoundingClientRect();
    let frame2 = 0;

    setFly({
      x: from.left,
      y: from.top,
      width: from.width,
      height: from.height,
      moving: false,
    });

    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        setFly({
          x: to.left,
          y: to.top,
          width: to.width,
          height: to.height,
          moving: true,
        });
      });
    });

    const timer = window.setTimeout(() => {
      setFly(null);
      setDeal({ index: deal.index, card: deal.card, phase: "land" });
    }, DEAL_MS);

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      window.clearTimeout(timer);
    };
  }, [deal]);

  useEffect(() => {
    if (!deal || deal.phase !== "land") return;

    const timer = window.setTimeout(() => {
      setDeal({ index: deal.index, card: deal.card, phase: "flip" });
    }, 40);

    return () => window.clearTimeout(timer);
  }, [deal]);

  useEffect(() => {
    if (!deal || deal.phase !== "flip") return;

    const timer = window.setTimeout(() => {
      setSettled((prev) => {
        const next = [...prev];
        next[deal.index] = true;
        return next;
      });
      setDeal(null);
      setBusy(false);
    }, FLIP_MS);

    return () => window.clearTimeout(timer);
  }, [deal]);

  const onGuess = useCallback(
    (guess: Guess) => {
      if (busy || state.phase !== "playing" || deal) return;
      pendingDealRef.current = true;
      setBusy(true);
      dispatch({ type: "guess", guess });
    },
    [busy, state.phase, deal],
  );

  const onContinue = () => {
    pendingDealRef.current = false;
    setDeal(null);
    setFly(null);
    setSettled([false, false, false, false, false]);
    setBusy(false);
    dispatch({ type: "next" });
  };

  const onRestart = () => {
    pendingDealRef.current = false;
    setDeal(null);
    setFly(null);
    setSettled([false, false, false, false, false]);
    setBusy(false);
    dispatch({ type: "restart" });
  };

  const animating = Boolean(deal) || busy;
  const showWin = state.phase === "won" && !animating;
  const showMiss = state.phase === "missed" && !animating;
  const filled = lastFilledIndex(state.table);

  // Stable per outcome — re-rolls only when attempt / step / result / locale change.
  const feedbackKey = `${state.attempts}-${state.lastGuess?.step ?? "x"}-${state.lastResult}-${locale}`;

  const missText = useMemo(() => {
    if (state.lastResult !== "wrong" || !state.missStep) return null;

    if (state.missStep === 3) {
      const first = state.table[0];
      const second = state.table[1];
      const drawn = state.table[2];
      const guessedBorders =
        state.lastGuess?.step === 3 && state.lastGuess.value === "borders";
      const truth =
        first && second && drawn ? rangeTruth(first, second, drawn) : null;

      return missTaunt(locale, 3, { guessedBorders, truth });
    }

    return missTaunt(locale, state.missStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- feedbackKey pins the random pick
  }, [feedbackKey, state.lastResult, state.missStep, state.table]);

  const hitText = useMemo(() => {
    if (state.lastResult !== "correct" || !state.lastGuess) return null;
    if (state.phase === "won") return null;
    return hitTaunt(locale, state.lastGuess.step);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- feedbackKey pins the random pick
  }, [feedbackKey, state.lastResult, state.lastGuess?.step, state.phase]);

  return (
    <div className="board" lang={locale} dir={locale === "he" ? "rtl" : "ltr"}>
      <button
        type="button"
        className="locale-toggle"
        onClick={toggleLocale}
        aria-label={locale === "he" ? "Switch to English" : "עבור לעברית"}
      >
        {locale === "he" ? "EN" : "עב"}
      </button>

      <header className="board-header">
        <h1 className={locale === "he" ? "brand-he" : "brand-en"}>
          {copy.brand}
        </h1>
        {/* <p className="tagline">{copy.tagline}</p> */}
      </header>

      <div className="table-felt" aria-live="polite">
        <div className="table-meta">
          <span>{copy.attempt(state.attempts)}</span>
          <span>{copy.left(state.deck.length)}</span>
        </div>

        <div className="table-play" dir="ltr">
          <DeckPile ref={deckRef} count={state.deck.length} />

          <div className="card-row">
            {state.table.map((card, index) => {
              const isDealingHere = deal?.index === index;
              const landed =
                isDealingHere &&
                (deal.phase === "land" || deal.phase === "flip");
              const showInSlot =
                (Boolean(card) && settled[index] && !isDealingHere) || landed;
              const faceUp =
                (settled[index] && !isDealingHere) ||
                (isDealingHere && deal.phase === "flip");

              let highlight: "correct" | "wrong" | null = null;
              if (showWin && settled[index]) {
                highlight = "correct";
              } else if (
                faceUp &&
                index === filled &&
                state.lastResult === "correct" &&
                (!deal || deal.phase === "flip")
              ) {
                highlight = "correct";
              } else if (
                faceUp &&
                index === filled &&
                state.lastResult === "wrong" &&
                (!deal || deal.phase === "flip")
              ) {
                highlight = "wrong";
              }

              return (
                <PlayingCard
                  key={`slot-${index}`}
                  ref={(el) => {
                    slotRefs.current[index] = el;
                  }}
                  card={showInSlot ? card : null}
                  empty={!showInSlot}
                  faceUp={faceUp}
                  label={copy.steps[index]}
                  highlight={highlight}
                />
              );
            })}
          </div>
        </div>

        {state.phase === "playing" && hitText && !animating ? (
          <p className="hit-reaction" aria-live="polite">
            {hitText}
          </p>
        ) : null}

        {state.phase === "playing" ? (
          <GuessControls
            step={state.step}
            disabled={animating}
            onGuess={onGuess}
          />
        ) : null}

        {showMiss && missText ? (
          <div className="status-panel miss">
            <p className="status-title">{missText}</p>
            <button type="button" className="primary-btn" onClick={onContinue}>
              {copy.tryAgain}
            </button>
          </div>
        ) : null}

        {showWin ? (
          <div className="status-panel win">
            <p className={`status-title ${locale === "he" ? "is-he" : ""}`}>
              {copy.winTitle}
            </p>
            <p className="status-copy">{copy.winCopy}</p>
            <button type="button" className="primary-btn" onClick={onRestart}>
              {copy.playAgain}
            </button>
          </div>
        ) : null}
      </div>

      {fly ? (
        <FlyingCard
          x={fly.x}
          y={fly.y}
          width={fly.width}
          height={fly.height}
          moving={fly.moving}
        />
      ) : null}
    </div>
  );
}
