"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useLocale } from "@/lib/locale";
import type { ConnStatus } from "@/hooks/useRoom";

type LobbyProps = {
  name: string;
  selfie: string | null;
  setName: (name: string) => void;
  setSelfie: (selfie: string | null) => void;
  initialRoomId: string | null;
  status: ConnStatus;
  error: string | null;
  onCreate: (name: string, selfie: string | null) => void;
  onJoin: (roomId: string, name: string, selfie: string | null) => void;
};

export function Lobby({
  name,
  selfie,
  setName,
  setSelfie,
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
  const fileRef = useRef<HTMLInputElement>(null);

  const readSelfie = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 200_000) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setSelfie(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

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

        <div className="field">
          <span>{locale === "he" ? "סלפי (אופציונלי)" : "Selfie (optional)"}</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={readSelfie}
            className="selfie-input"
          />
          <div className="selfie-row">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => fileRef.current?.click()}
            >
              {selfie
                ? locale === "he"
                  ? "החלף סלפי"
                  : "Replace selfie"
                : locale === "he"
                  ? "צלם / העלה סלפי"
                  : "Take / upload selfie"}
            </button>
            {selfie ? (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setSelfie(null)}
              >
                {locale === "he" ? "הסר" : "Remove"}
              </button>
            ) : null}
            {selfie ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selfie}
                alt={locale === "he" ? "תצוגת סלפי" : "Selfie preview"}
                className="selfie-preview"
              />
            ) : (
              <span className="selfie-empty">
                {locale === "he"
                  ? "ללא סלפי"
                  : "No selfie yet"}
              </span>
            )}
          </div>
        </div>

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
            if (mode === "create") onCreate(name, selfie);
            else onJoin(roomCode, name, selfie);
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
