"use client";

import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { GameBoard } from "@/components/GameBoard";
import { Lobby } from "@/components/Lobby";
import { PlayerStrip } from "@/components/PlayerStrip";
import { RoomSidebar } from "@/components/RoomSidebar";
import { useRoom } from "@/hooks/useRoom";
import { roomFromLocation } from "@/lib/session";
import { useLocale } from "@/lib/locale";

export function RoomApp() {
  const [initialRoomId, setInitialRoomId] = useState<string | null>(null);
  const { copy } = useLocale();
  const roomApi = useRoom(initialRoomId);

  useEffect(() => {
    setInitialRoomId(roomFromLocation());
  }, []);

  const { room, playerId, status, error, name, setName } = roomApi;
  const inPlay = Boolean(
    room && (room.status === "playing" || room.status === "finished"),
  );

  if (!room) {
    return (
      <Lobby
        name={name}
        setName={setName}
        initialRoomId={initialRoomId}
        status={status}
        error={error}
        onCreate={roomApi.createRoom}
        onJoin={roomApi.joinRoom}
      />
    );
  }

  const isMyTurn = room.currentPlayerId === playerId;
  const isHost = room.hostId === playerId;
  const current = room.players.find((p) => p.id === room.currentPlayerId);
  const winner = room.players.find((p) => p.id === room.winnerId);
  const connectedCount = room.players.filter((p) => p.connected).length;
  const solo = connectedCount <= 1;

  return (
    <div
      className={`room-layout ${inPlay ? "is-playing" : "is-lobby"}`}
      lang={copy.locale}
      dir={copy.locale === "he" ? "rtl" : "ltr"}
    >
      <div className="room-main">
        {inPlay ? (
          <>
            <div className="play-social">
              <PlayerStrip
                players={room.players}
                playerId={playerId}
                currentPlayerId={
                  room.status === "finished"
                    ? room.winnerId
                    : room.currentPlayerId
                }
                showTurn={room.status === "playing"}
              />
            </div>
            <GameBoard
              state={{
                table: room.table,
                step: room.step,
                phase: room.phase,
                lastResult: room.lastResult,
                lastGuess: room.lastGuess,
                missStep: room.missStep,
                deckCount: room.deckCount,
                attempts: room.attempts,
              }}
              canGuess={
                room.status === "playing" &&
                room.phase === "playing" &&
                isMyTurn
              }
              canAdvance={room.phase === "missed"}
              canRestart={room.status === "finished" && isHost}
              solo={solo}
              currentPlayerName={
                room.status === "finished"
                  ? (winner?.name ?? null)
                  : (current?.name ?? null)
              }
              isMyTurn={isMyTurn}
              onGuess={roomApi.guess}
              onAdvance={roomApi.advance}
              onRestart={roomApi.restart}
            />
          </>
        ) : (
          <div className="lobby-gather">
            <header className="board-header">
              <h1
                className={
                  copy.locale === "he" ? "brand-he" : "brand-en"
                }
              >
                {copy.brand}
              </h1>
              <p className="tagline">{copy.lobbyReady}</p>
            </header>

            <div className="lobby-gather-table">
              <PlayerStrip
                players={room.players}
                playerId={playerId}
                currentPlayerId={null}
                showTurn={false}
              />

              <div className="lobby-gather-actions">
                {isHost ? (
                  <>
                    <button
                      type="button"
                      className="primary-btn is-lg"
                      onClick={roomApi.startGame}
                    >
                      {copy.startGame}
                    </button>
                    <p className="lobby-wait">{copy.startAloneHint}</p>
                  </>
                ) : (
                  <p className="lobby-wait">{copy.waitForHost}</p>
                )}
              </div>
            </div>
          </div>
        )}
        {error ? <p className="room-error">{error}</p> : null}
        {status === "closed" ? (
          <p className="room-banner">{copy.reconnecting}</p>
        ) : null}
      </div>

      <div className="room-rail">
        <div className="rail-sidebar-desktop">
          <RoomSidebar
            room={room}
            playerId={playerId}
            onStart={roomApi.startGame}
            hideStart={room.status === "lobby"}
          />
        </div>
        {inPlay ? (
          <details className="rail-players-fold">
            <summary>{copy.players}</summary>
            <RoomSidebar
              room={room}
              playerId={playerId}
              onStart={roomApi.startGame}
              hideStart
            />
          </details>
        ) : null}
        <ChatPanel
          messages={room.chat}
          playerId={playerId}
          onSend={roomApi.sendChat}
          compact={inPlay}
        />
      </div>
    </div>
  );
}
