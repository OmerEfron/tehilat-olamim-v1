import { randomBytes, randomUUID } from "node:crypto";
import {
  applyGuess,
  initialState,
  isGuess,
  MAX_PLAYERS,
  restartGame,
  startNextAttempt,
  type GameState,
  type Guess,
} from "../../shared/game.js";
import type {
  ChatMessage,
  PublicRoomState,
  RoomStatus,
} from "../../shared/protocol.js";

export type Player = {
  id: string;
  name: string;
  connected: boolean;
  selfie: string | null;
};

export type Room = {
  id: string;
  hostId: string;
  status: RoomStatus;
  players: Player[];
  turnIndex: number;
  game: GameState | null;
  winnerId: string | null;
  chat: ChatMessage[];
  createdAt: number;
};

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_CHAT = 100;
const MAX_NAME = 24;
const MAX_CHAT_TEXT = 280;
const MAX_SELFIE_BYTES = 200_000;
const MAX_SELFIE_BASE64_LEN = Math.ceil(MAX_SELFIE_BYTES * 1.37);

export function createRoomCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += ROOM_CODE_ALPHABET[bytes[i]! % ROOM_CODE_ALPHABET.length];
  }
  return code;
}

export function sanitizeName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ").slice(0, MAX_NAME);
  return name.length > 0 ? name : null;
}

export function sanitizeChat(raw: string): string | null {
  const text = raw.trim().replace(/\s+/g, " ").slice(0, MAX_CHAT_TEXT);
  return text.length > 0 ? text : null;
}

export function sanitizeSelfie(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const selfie = raw.trim();
  if (!selfie) return null;
  if (!selfie.startsWith("data:image/")) return null;
  if (selfie.length > MAX_SELFIE_BASE64_LEN) return null;
  return selfie;
}

export function createRoom(
  hostName: string,
  selfie: string | null,
): { room: Room; playerId: string } {
  const playerId = randomUUID();
  const room: Room = {
    id: createRoomCode(),
    hostId: playerId,
    status: "lobby",
    players: [{ id: playerId, name: hostName, connected: true, selfie }],
    turnIndex: 0,
    game: null,
    winnerId: null,
    chat: [],
    createdAt: Date.now(),
  };
  return { room, playerId };
}

export function toPublic(room: Room): PublicRoomState {
  const current = room.players[room.turnIndex] ?? null;
  const game = room.game;

  return {
    roomId: room.id,
    hostId: room.hostId,
    status: room.status,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      selfie: p.selfie,
    })),
    turnIndex: room.turnIndex,
    currentPlayerId: current?.id ?? null,
    table: game?.table ?? [null, null, null, null, null],
    step: game?.step ?? 1,
    phase: game?.phase ?? "playing",
    lastResult: game?.lastResult ?? null,
    lastGuess: game?.lastGuess ?? null,
    missStep: game?.missStep ?? null,
    deckCount: game?.deck.length ?? 52,
    attempts: game?.attempts ?? 1,
    winnerId: room.winnerId,
    chat: room.chat,
  };
}

function connectedPlayers(room: Room): Player[] {
  return room.players.filter((p) => p.connected);
}

function nextConnectedTurnIndex(room: Room, fromIndex: number): number {
  const n = room.players.length;
  if (n === 0) return 0;
  for (let i = 1; i <= n; i += 1) {
    const idx = (fromIndex + i) % n;
    if (room.players[idx]?.connected) return idx;
  }
  return fromIndex % n;
}

export function addPlayer(
  room: Room,
  name: string,
  selfie: string | null,
): { playerId: string } | { error: string } {
  if (room.players.length >= MAX_PLAYERS) {
    return { error: "Room is full (max 9 players)." };
  }

  const playerId = randomUUID();
  room.players.push({ id: playerId, name, connected: true, selfie });
  // Late join: always appended — already last in order.
  return { playerId };
}

export function rejoinPlayer(
  room: Room,
  playerId: string,
  name: string,
  selfie: string | null,
): { ok: true } | { error: string } {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    return { error: "Player not found in this room." };
  }
  player.connected = true;
  player.name = name;
  player.selfie = selfie;
  return { ok: true };
}

export function markDisconnected(room: Room, playerId: string): void {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return;
  player.connected = false;

  if (room.hostId === playerId) {
    const nextHost = connectedPlayers(room)[0];
    if (nextHost) room.hostId = nextHost.id;
  }

  if (
    room.status === "playing" &&
    room.game?.phase === "playing" &&
    room.players[room.turnIndex]?.id === playerId
  ) {
    // Skip disconnected active player so the table does not stall.
    room.turnIndex = nextConnectedTurnIndex(room, room.turnIndex);
    if (room.game) {
      room.game = {
        ...room.game,
        table: [null, null, null, null, null],
        step: 1,
        phase: "playing",
        lastResult: null,
        lastGuess: null,
        missStep: null,
      };
    }
  }
}

export function startGame(room: Room, requesterId: string): string | null {
  if (room.hostId !== requesterId) return "Only the host can start.";
  if (room.status === "playing") return "Game already running.";
  // Solo is allowed — others may join mid-game and are appended last.
  if (connectedPlayers(room).length < 1) return "Need at least one player.";

  room.game = initialState();
  room.status = "playing";
  room.winnerId = null;
  room.turnIndex = room.players.findIndex((p) => p.connected);
  if (room.turnIndex < 0) room.turnIndex = 0;
  return null;
}

export function applyPlayerGuess(
  room: Room,
  playerId: string,
  guess: Guess,
): string | null {
  if (room.status !== "playing" || !room.game) return "Game is not running.";
  if (room.game.phase !== "playing") return "Wait for the current reveal.";
  if (room.players[room.turnIndex]?.id !== playerId) {
    return "Not your turn.";
  }
  if (!isGuess(guess)) return "Invalid guess.";

  room.game = applyGuess(room.game, guess);

  if (room.game.phase === "won") {
    room.status = "finished";
    room.winnerId = playerId;
  }

  return null;
}

/** After a miss is shown: clear table and pass turn to next connected player. */
export function advanceAfterMiss(
  room: Room,
  _requesterId: string,
): string | null {
  if (room.status !== "playing" || !room.game) return "Game is not running.";
  if (room.game.phase !== "missed") return "Nothing to advance.";

  room.game = startNextAttempt(room.game);
  room.turnIndex = nextConnectedTurnIndex(room, room.turnIndex);
  return null;
}

export function restartRoom(room: Room, requesterId: string): string | null {
  if (room.hostId !== requesterId) return "Only the host can restart.";

  room.game = restartGame();
  room.status = "playing";
  room.winnerId = null;
  room.turnIndex = room.players.findIndex((p) => p.connected);
  if (room.turnIndex < 0) room.turnIndex = 0;
  return null;
}

export function appendChat(
  room: Room,
  playerId: string,
  text: string,
): ChatMessage | { error: string } {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { error: "Not in room." };

  const clean = sanitizeChat(text);
  if (!clean) return { error: "Empty message." };

  const message: ChatMessage = {
    id: randomUUID(),
    playerId,
    name: player.name,
    text: clean,
    at: Date.now(),
  };

  room.chat.push(message);
  if (room.chat.length > MAX_CHAT) {
    room.chat = room.chat.slice(-MAX_CHAT);
  }

  return message;
}
