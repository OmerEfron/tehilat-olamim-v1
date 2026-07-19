"use client";

import type { PlayerPublic } from "@/lib/protocol";
import { useLocale } from "@/lib/locale";

type PlayerStripProps = {
  players: PlayerPublic[];
  playerId: string | null;
  currentPlayerId: string | null;
  showTurn?: boolean;
};

function initial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export function PlayerStrip({
  players,
  playerId,
  currentPlayerId,
  showTurn = true,
}: PlayerStripProps) {
  const { copy } = useLocale();
  if (players.length === 0) return null;

  return (
    <div className="player-strip" aria-label={copy.players}>
      {players.map((p) => {
        const isTurn = showTurn && currentPlayerId === p.id;
        return (
          <div
            key={p.id}
            className={[
              "player-chip",
              p.id === playerId ? "is-me" : "",
              isTurn ? "is-turn" : "",
              !p.connected ? "is-away" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="player-avatar" aria-hidden>
              {initial(p.name)}
            </span>
            <span className="player-chip-name">{p.name}</span>
          </div>
        );
      })}
    </div>
  );
}
