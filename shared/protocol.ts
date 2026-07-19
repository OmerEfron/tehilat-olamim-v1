import type { Card } from "./cards";
import type { Guess, Phase, Step } from "./game";

export type PlayerPublic = {
  id: string;
  name: string;
  connected: boolean;
};

export type ChatMessage = {
  id: string;
  playerId: string;
  name: string;
  text: string;
  at: number;
};

export type RoomStatus = "lobby" | "playing" | "finished";

/** Safe-to-broadcast room snapshot (no remaining deck order). */
export type PublicRoomState = {
  roomId: string;
  hostId: string;
  status: RoomStatus;
  players: PlayerPublic[];
  /** Index into `players` for whose turn it is. */
  turnIndex: number;
  currentPlayerId: string | null;
  table: (Card | null)[];
  step: Step;
  phase: Phase;
  lastResult: "correct" | "wrong" | null;
  lastGuess: Guess | null;
  missStep: Step | null;
  deckCount: number;
  /** Shared attempt counter across the table. */
  attempts: number;
  winnerId: string | null;
  chat: ChatMessage[];
};

export type ClientMessage =
  | { type: "create_room"; name: string }
  | { type: "join_room"; roomId: string; name: string }
  | { type: "rejoin"; roomId: string; playerId: string; name: string }
  | { type: "start_game" }
  | { type: "guess"; guess: Guess }
  | { type: "advance" }
  | { type: "restart" }
  | { type: "chat"; text: string };

export type ServerMessage =
  | {
      type: "joined";
      playerId: string;
      roomId: string;
      state: PublicRoomState;
    }
  | { type: "state"; state: PublicRoomState }
  | { type: "chat"; message: ChatMessage }
  | { type: "error"; message: string };
