"use client";

import { useState } from "react";
import { useLocale } from "@/lib/locale";
import type { ConnStatus } from "@/hooks/useRoom";

type LobbyProps = {
  name: string;
  setName: (name: string) => void;
  initialRoomId: string | null;
  status: ConnStatus;
  error: string | null;
  onCreate: (name: string) => void;
  onJoin: (roomId: string, name: string) => void;
};

export function Lobby({
  name,
  setName,
  initialRoomId,
  status,
  error,
  onCreate,
  onJoin,
}: LobbyProps) {
  const { locale, copy, toggleLocale } = useLocale();
  const [roomCode, setRoomCode] = useState(initialRoomId ?? "");
  const [mode, setMode] = useState<"create" | "join">(
    initialRoomId ? "join" : "create",
  );

  return (
    <div className="lobby" lang={locale} dir={locale === "he" ? "rtl" : "ltr"}>
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
        <p className="tagline">{copy.tagline}</p>
      </header>

      <div className="lobby-panel">
        <label className="field">
          <span>{copy.yourName}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoComplete="nickname"
            placeholder={copy.namePlaceholder}
          />
        </label>

        <div className="lobby-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "create"}
            className={mode === "create" ? "is-active" : undefined}
            onClick={() => setMode("create")}
          >
            {copy.createRoom}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "join"}
            className={mode === "join" ? "is-active" : undefined}
            onClick={() => setMode("join")}
          >
            {copy.joinRoom}
          </button>
        </div>

        {mode === "join" ? (
          <label className="field">
            <span>{copy.roomCode}</span>
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={8}
              autoCapitalize="characters"
              placeholder="ABC123"
            />
          </label>
        ) : null}

        <button
          type="button"
          className="primary-btn lobby-go"
          disabled={status === "connecting"}
          onClick={() => {
            if (mode === "create") onCreate(name);
            else onJoin(roomCode, name);
          }}
        >
          {mode === "create" ? copy.createRoom : copy.joinRoom}
        </button>

        <p className="lobby-status" aria-live="polite">
          {status === "connecting"
            ? copy.connecting
            : status === "closed"
              ? copy.reconnecting
              : copy.connected}
        </p>

        {error ? <p className="lobby-error">{error}</p> : null}
      </div>
    </div>
  );
}
