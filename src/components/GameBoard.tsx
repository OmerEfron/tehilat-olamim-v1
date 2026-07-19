"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
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
import type { Guess, Phase, Step } from "@/lib/game";

export type BoardState = {
  table: (Card | null)[];
  step: Step;
  phase: Phase;
  lastResult: "correct" | "wrong" | null;
  lastGuess: Guess | null;
  missStep: Step | null;
  deckCount: number;
  attempts: number;
};

type GameBoardProps = {
  state: BoardState;
  canGuess: boolean;
  canAdvance: boolean;
  canRestart: boolean;
  /** Only one connected player — miss continues as "try again". */
  solo: boolean;
  currentPlayerName: string | null;
  isMyTurn: boolean;
  onGuess: (guess: Guess) => void;
  onAdvance: () => void;
  onRestart: () => void;
};

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

function lastFilledIndex(table: (Card | null)[]): number {
  for (let i = table.length - 1; i >= 0; i -= 1) {
    if (table[i] !== null) return i;
  }
  return -1;
}

function tableSignature(table: (Card | null)[]): string {
  return table.map((c) => c?.id ?? "-").join("|");
}

export function GameBoard({
  state,
  canGuess,
  canAdvance,
  canRestart,
  solo,
  currentPlayerName,
  isMyTurn,
  onGuess,
  onAdvance,
  onRestart,
}: GameBoardProps) {
  const { locale, copy, toggleLocale } = useLocale();
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
  const prevSigRef = useRef(tableSignature(state.table));
  const prevAttemptsRef = useRef(state.attempts);

  const beginDeal = useCallback((index: number, card: Card) => {
    setBusy(true);
    setFly(null);
    setDeal({ index, card, phase: "fly" });
  }, []);

  // Reset settled cards when a new attempt / turn starts.
  useEffect(() => {
    if (state.attempts !== prevAttemptsRef.current) {
      prevAttemptsRef.current = state.attempts;
      setSettled([false, false, false, false, false]);
      setDeal(null);
      setFly(null);
      setBusy(false);
      prevSigRef.current = tableSignature(state.table);
    }
  }, [state.attempts, state.table]);

  // Animate newly revealed cards from remote state.
  useEffect(() => {
    const nextSig = tableSignature(state.table);
    if (nextSig === prevSigRef.current) return;

    const prevIds = prevSigRef.current.split("|");
    const nextIds = nextSig.split("|");
    prevSigRef.current = nextSig;

    let newIndex = -1;
    for (let i = 0; i < nextIds.length; i += 1) {
      if (nextIds[i] !== "-" && nextIds[i] !== prevIds[i]) {
        newIndex = i;
        break;
      }
    }

    if (newIndex < 0) return;
    const card = state.table[newIndex];
    if (!card) return;
    beginDeal(newIndex, card);
  }, [state.table, beginDeal]);

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

  const handleGuess = useCallback(
    (guess: Guess) => {
      if (busy || !canGuess || deal) return;
      setBusy(true);
      onGuess(guess);
    },
    [busy, canGuess, deal, onGuess],
  );

  const handleAdvance = () => {
    setDeal(null);
    setFly(null);
    setBusy(false);
    onAdvance();
  };

  const handleRestart = () => {
    setDeal(null);
    setFly(null);
    setSettled([false, false, false, false, false]);
    setBusy(false);
    onRestart();
  };

  const animating = Boolean(deal) || busy;
  const showWin = state.phase === "won" && !animating;
  const showMiss = state.phase === "missed" && !animating;
  const filled = lastFilledIndex(state.table);
  const activeIndex = state.phase === "playing" ? state.step - 1 : filled;

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

  const showHit =
    state.phase === "playing" && Boolean(hitText) && !animating;

  const feltTone = showWin
    ? "is-win"
    : showMiss
      ? "is-miss"
      : showHit
        ? "is-hit"
        : "";

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

      <header className="board-header is-compact">
        <h1 className={locale === "he" ? "brand-he" : "brand-en"}>
          {copy.brand}
        </h1>
      </header>

      <div className={`table-felt ${feltTone}`} aria-live="polite">
        <div className="table-meta">
          <span>{copy.attempt(state.attempts)}</span>
          <span>{copy.left(state.deckCount)}</span>
        </div>

        {currentPlayerName && state.phase !== "won" ? (
          <div
            className={`turn-pill ${isMyTurn ? "is-you" : ""}`}
            aria-live="polite"
          >
            {isMyTurn ? copy.yourTurn : copy.turnOf(currentPlayerName)}
          </div>
        ) : null}

        <div className="table-play" dir="ltr">
          <DeckPile ref={deckRef} count={state.deckCount} />

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

              let slotState: "active" | "future" | "done" | null = null;
              if (state.phase === "playing" || state.phase === "revealing") {
                if (index === activeIndex) slotState = "active";
                else if (index > activeIndex) slotState = "future";
                else slotState = "done";
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
                  slotState={slotState}
                  winGlow={showWin && settled[index]}
                />
              );
            })}
          </div>
        </div>

        <div className="feedback-stage">
          {state.phase === "playing" && hitText && !animating ? (
            <p className="hit-reaction" aria-live="polite">
              {hitText}
            </p>
          ) : null}

          {state.phase === "playing" && canGuess ? (
            <GuessControls
              step={state.step}
              disabled={animating}
              onGuess={handleGuess}
            />
          ) : null}

          {state.phase === "playing" && !canGuess && !animating ? (
            <p className="waiting-turn">{copy.waitingTurn}</p>
          ) : null}

          {showMiss && missText ? (
            <div className="status-panel miss">
              <p className="status-title">{missText}</p>
              {canAdvance ? (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleAdvance}
                >
                  {solo ? copy.tryAgain : copy.nextPlayer}
                </button>
              ) : (
                <p className="status-copy">{copy.waitingAdvance}</p>
              )}
            </div>
          ) : null}

          {showWin ? (
            <div className="status-panel win">
              <p className={`status-title ${locale === "he" ? "is-he" : ""}`}>
                {copy.winTitle}
              </p>
              <p className="status-copy">
                {currentPlayerName
                  ? copy.winBy(currentPlayerName)
                  : copy.winCopy}
              </p>
              {canRestart ? (
                <button
                  type="button"
                  className="primary-btn is-lg"
                  onClick={handleRestart}
                >
                  {copy.playAgain}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
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
