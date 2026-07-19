"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Guess } from "@/lib/game";
import type { PublicRoomState, ServerMessage } from "@/lib/protocol";
import {
  loadName,
  loadSelfie,
  loadPlayerId,
  saveName,
  saveSelfie,
  savePlayerId,
  setRoomInUrl,
} from "@/lib/session";
import { connectWs } from "@/lib/ws";

export type ConnStatus = "connecting" | "open" | "closed";

export function useRoom(initialRoomId: string | null) {
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setNameState] = useState(() => loadName());
  const [selfie, setSelfieState] = useState<string | null>(() => loadSelfie());

  const sendRef = useRef<(msg: Parameters<ReturnType<typeof connectWs>["send"]>[0]) => void>(
    () => {},
  );
  const pendingJoin = useRef<{
    kind: "create" | "join" | "rejoin";
    roomId?: string;
    playerId?: string;
    name: string;
    selfie: string | null;
  } | null>(null);
  const roomRef = useRef<PublicRoomState | null>(null);
  const playerIdRef = useRef<string | null>(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  const handleMessage = useCallback((msg: ServerMessage) => {
    if (msg.type === "joined") {
      setPlayerId(msg.playerId);
      setRoom(msg.state);
      setError(null);
      savePlayerId(msg.roomId, msg.playerId);
      setRoomInUrl(msg.roomId);
      return;
    }
    if (msg.type === "state") {
      setRoom(msg.state);
      return;
    }
    if (msg.type === "chat") {
      setRoom((prev) =>
        prev
          ? { ...prev, chat: [...prev.chat, msg.message].slice(-100) }
          : prev,
      );
      return;
    }
    if (msg.type === "error") {
      setError(msg.message);
    }
  }, []);

  useEffect(() => {
    const conn = connectWs(handleMessage, setStatus);
    sendRef.current = conn.send;

    return () => conn.close();
  }, [handleMessage]);

  // Flush pending join once socket is open.
  useEffect(() => {
    if (status !== "open") return;
    const pending = pendingJoin.current;
    if (!pending) return;
    pendingJoin.current = null;

    if (pending.kind === "create") {
      sendRef.current({
        type: "create_room",
        name: pending.name,
        selfie: pending.selfie,
      });
    } else if (pending.kind === "join" && pending.roomId) {
      sendRef.current({
        type: "join_room",
        roomId: pending.roomId,
        name: pending.name,
        selfie: pending.selfie,
      });
    } else if (
      pending.kind === "rejoin" &&
      pending.roomId &&
      pending.playerId
    ) {
      sendRef.current({
        type: "rejoin",
        roomId: pending.roomId,
        playerId: pending.playerId,
        name: pending.name,
        selfie: pending.selfie,
      });
    }
  }, [status]);

  // Auto-rejoin from invite / refresh when we have a stored player id.
  useEffect(() => {
    if (status !== "open" || room || !initialRoomId) return;
    const storedName = loadName();
    if (!storedName) return;
    const storedSelfie = loadSelfie();

    const storedPlayer = loadPlayerId(initialRoomId);
    if (storedPlayer) {
      sendRef.current({
        type: "rejoin",
        roomId: initialRoomId,
        playerId: storedPlayer,
        name: storedName,
        selfie: storedSelfie,
      });
    }
  }, [status, room, initialRoomId]);

  const setName = useCallback((value: string) => {
    setNameState(value);
    saveName(value);
  }, []);

  const createRoom = useCallback(
    (playerName: string, playerSelfie: string | null) => {
      const clean = playerName.trim();
      if (!clean) {
        setError("Name is required.");
        return;
      }
      saveName(clean);
      saveSelfie(playerSelfie);
      setNameState(clean);
      setSelfieState(playerSelfie);
      setError(null);
      if (status === "open") {
        sendRef.current({
          type: "create_room",
          name: clean,
          selfie: playerSelfie,
        });
      } else {
        pendingJoin.current = {
          kind: "create",
          name: clean,
          selfie: playerSelfie,
        };
      }
    },
    [status],
  );

  const joinRoom = useCallback(
    (roomId: string, playerName: string, playerSelfie: string | null) => {
      const clean = playerName.trim();
      const code = roomId.trim().toUpperCase();
      if (!clean) {
        setError("Name is required.");
        return;
      }
      if (!code) {
        setError("Room code is required.");
        return;
      }
      saveName(clean);
      saveSelfie(playerSelfie);
      setNameState(clean);
      setSelfieState(playerSelfie);
      setError(null);

      const storedPlayer = loadPlayerId(code);
      if (storedPlayer) {
        const payload = {
          type: "rejoin" as const,
          roomId: code,
          playerId: storedPlayer,
          name: clean,
          selfie: playerSelfie,
        };
        if (status === "open") sendRef.current(payload);
        else {
          pendingJoin.current = {
            kind: "rejoin",
            roomId: code,
            playerId: storedPlayer,
            name: clean,
            selfie: playerSelfie,
          };
        }
        return;
      }

      if (status === "open") {
        sendRef.current({
          type: "join_room",
          roomId: code,
          name: clean,
          selfie: playerSelfie,
        });
      } else {
        pendingJoin.current = {
          kind: "join",
          roomId: code,
          name: clean,
          selfie: playerSelfie,
        };
      }
    },
    [status],
  );

  const setSelfie = useCallback((value: string | null) => {
    setSelfieState(value);
    saveSelfie(value);
  }, []);

  const startGame = useCallback(() => {
    sendRef.current({ type: "start_game" });
  }, []);

  const guess = useCallback((g: Guess) => {
    sendRef.current({ type: "guess", guess: g });
  }, []);

  const advance = useCallback(() => {
    sendRef.current({ type: "advance" });
  }, []);

  const restart = useCallback(() => {
    sendRef.current({ type: "restart" });
  }, []);

  const sendChat = useCallback((text: string) => {
    sendRef.current({ type: "chat", text });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    status,
    playerId,
    room,
    error,
    name,
    selfie,
    setName,
    setSelfie,
    createRoom,
    joinRoom,
    startGame,
    guess,
    advance,
    restart,
    sendChat,
    clearError,
  };
}
