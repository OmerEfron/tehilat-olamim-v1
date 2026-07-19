"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { PlayingCard } from "@/components/PlayingCard";
import { GuessControls } from "@/components/GuessControls";
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

function lastFilledIndex(table: (unknown | null)[]): number {
  for (let i = table.length - 1; i >= 0; i -= 1) {
    if (table[i] !== null) return i;
  }
  return -1;
}

const STEP_LABELS = ["Color", "High / Low", "Range", "Suit", "Rank"];

export function GameBoard() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const onGuess = useCallback(
    (guess: Guess) => {
      if (busy || state.phase !== "playing") return;
      setBusy(true);
      dispatch({ type: "guess", guess });

      clearTimer();
      timerRef.current = window.setTimeout(() => {
        setBusy(false);
        timerRef.current = null;
      }, 420);
    },
    [busy, state.phase],
  );

  const onContinue = () => {
    clearTimer();
    setBusy(false);
    dispatch({ type: "next" });
  };

  const onRestart = () => {
    clearTimer();
    setBusy(false);
    dispatch({ type: "restart" });
  };

  const showWin = state.phase === "won";
  const showMiss = state.phase === "missed";
  const filled = lastFilledIndex(state.table);

  return (
    <div className="board">
      <header className="board-header">
        <p className="brand-he" lang="he">
          תהילת עולמים
        </p>
        <h1 className="brand-en">Tehilat Olamim</h1>
        <p className="tagline">Five correct guesses. One eternal glory.</p>
      </header>

      <div className="table-felt" aria-live="polite">
        <div className="table-meta">
          <span>Attempt {state.attempts}</span>
          <span>{state.deck.length} in deck</span>
        </div>

        <div className="card-row">
          {state.table.map((card, index) => {
            const faceUp = card !== null;
            let highlight: "correct" | "wrong" | null = null;

            if (showWin && faceUp) {
              highlight = "correct";
            } else if (faceUp && index === filled && state.lastResult === "correct") {
              highlight = "correct";
            } else if (faceUp && index === filled && state.lastResult === "wrong") {
              highlight = "wrong";
            }

            return (
              <PlayingCard
                key={`slot-${index}`}
                card={card}
                faceUp={faceUp}
                label={STEP_LABELS[index]}
                highlight={highlight}
                size="lg"
              />
            );
          })}
        </div>

        {!showWin && !showMiss ? (
          <GuessControls step={state.step} disabled={busy} onGuess={onGuess} />
        ) : null}

        {showMiss ? (
          <div className="status-panel miss">
            <p className="status-title">Missed</p>
            <p className="status-copy">Wrong guess. Start again from card one.</p>
            <button type="button" className="primary-btn" onClick={onContinue}>
              Try again
            </button>
          </div>
        ) : null}

        {showWin ? (
          <div className="status-panel win">
            <p className="status-title" lang="he">
              תהילת עולמים
            </p>
            <p className="status-copy">Eternal Glory — five in a row.</p>
            <button type="button" className="primary-btn" onClick={onRestart}>
              Play again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
