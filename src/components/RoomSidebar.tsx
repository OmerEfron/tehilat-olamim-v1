"use client";

import { useState } from "react";
import type { PublicRoomState } from "@/lib/protocol";
import { inviteUrl } from "@/lib/session";
import { useLocale } from "@/lib/locale";

type RoomSidebarProps = {
  room: PublicRoomState;
  playerId: string | null;
  onStart: () => void;
};

export function RoomSidebar({ room, playerId, onStart }: RoomSidebarProps) {
  const { copy } = useLocale();
  const [copied, setCopied] = useState(false);
  const isHost = playerId === room.hostId;
  const link = inviteUrl(room.roomId);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // fallback
      window.prompt(copy.copyInvite, link);
    }
  };

  return (
    <aside className="room-sidebar">
      <div className="room-code-block">
        <span className="room-label">{copy.roomCode}</span>
        <strong className="room-code">{room.roomId}</strong>
        <button type="button" className="secondary-btn" onClick={copyLink}>
          {copied ? copy.copied : copy.copyInvite}
        </button>
      </div>

      <div className="player-list">
        <h2>{copy.players}</h2>
        <ol>
          {room.players.map((p, i) => {
            const isTurn =
              room.status === "playing" && room.currentPlayerId === p.id;
            return (
              <li
                key={p.id}
                className={[
                  p.id === playerId ? "is-me" : "",
                  isTurn ? "is-turn" : "",
                  !p.connected ? "is-away" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="player-order">{i + 1}</span>
                <span className="player-name">
                  {p.name}
                  {p.id === room.hostId ? ` · ${copy.host}` : ""}
                  {!p.connected ? ` (${copy.away})` : ""}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {room.status === "lobby" && isHost ? (
        <>
          <button type="button" className="primary-btn" onClick={onStart}>
            {copy.startGame}
          </button>
          <p className="lobby-wait">{copy.startAloneHint}</p>
        </>
      ) : null}

      {room.status === "lobby" && !isHost ? (
        <p className="lobby-wait">{copy.waitForHost}</p>
      ) : null}
    </aside>
  );
}
