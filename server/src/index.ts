import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { isGuess } from "../../shared/game.js";
import type { ClientMessage, ServerMessage } from "../../shared/protocol.js";
import {
  addPlayer,
  advanceAfterMiss,
  appendChat,
  applyPlayerGuess,
  createRoom,
  markDisconnected,
  rejoinPlayer,
  restartRoom,
  sanitizeName,
  startGame,
  toPublic,
  type Room,
} from "./room.js";

const PORT = Number(process.env.PORT ?? 3001);

type Client = {
  ws: WebSocket;
  playerId: string | null;
  roomId: string | null;
};

const rooms = new Map<string, Room>();
const clients = new Map<WebSocket, Client>();

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(msg));
}

function broadcastRoom(room: Room, msg: ServerMessage): void {
  const payload = JSON.stringify(msg);
  for (const client of clients.values()) {
    if (client.roomId === room.id && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function broadcastState(room: Room): void {
  broadcastRoom(room, { type: "state", state: toPublic(room) });
}

function getRoom(roomId: string): Room | null {
  return rooms.get(roomId.toUpperCase()) ?? null;
}

function parseMessage(raw: WebSocket.RawData): ClientMessage | null {
  try {
    const data = JSON.parse(String(raw)) as ClientMessage;
    if (!data || typeof data !== "object" || typeof data.type !== "string") {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function handleMessage(client: Client, msg: ClientMessage): void {
  switch (msg.type) {
    case "create_room": {
      const name = sanitizeName(msg.name);
      if (!name) {
        send(client.ws, { type: "error", message: "Name is required." });
        return;
      }
      const { room, playerId } = createRoom(name);
      rooms.set(room.id, room);
      client.playerId = playerId;
      client.roomId = room.id;
      send(client.ws, {
        type: "joined",
        playerId,
        roomId: room.id,
        state: toPublic(room),
      });
      return;
    }

    case "join_room": {
      const name = sanitizeName(msg.name);
      if (!name) {
        send(client.ws, { type: "error", message: "Name is required." });
        return;
      }
      const room = getRoom(msg.roomId);
      if (!room) {
        send(client.ws, { type: "error", message: "Room not found." });
        return;
      }
      const result = addPlayer(room, name);
      if ("error" in result) {
        send(client.ws, { type: "error", message: result.error });
        return;
      }
      client.playerId = result.playerId;
      client.roomId = room.id;
      send(client.ws, {
        type: "joined",
        playerId: result.playerId,
        roomId: room.id,
        state: toPublic(room),
      });
      broadcastState(room);
      return;
    }

    case "rejoin": {
      const name = sanitizeName(msg.name);
      if (!name) {
        send(client.ws, { type: "error", message: "Name is required." });
        return;
      }
      const room = getRoom(msg.roomId);
      if (!room) {
        send(client.ws, { type: "error", message: "Room not found." });
        return;
      }
      const result = rejoinPlayer(room, msg.playerId, name);
      if ("error" in result) {
        send(client.ws, { type: "error", message: result.error });
        return;
      }
      client.playerId = msg.playerId;
      client.roomId = room.id;
      send(client.ws, {
        type: "joined",
        playerId: msg.playerId,
        roomId: room.id,
        state: toPublic(room),
      });
      broadcastState(room);
      return;
    }

    case "start_game": {
      const room = client.roomId ? rooms.get(client.roomId) : null;
      if (!room || !client.playerId) {
        send(client.ws, { type: "error", message: "Not in a room." });
        return;
      }
      const err = startGame(room, client.playerId);
      if (err) {
        send(client.ws, { type: "error", message: err });
        return;
      }
      broadcastState(room);
      return;
    }

    case "guess": {
      const room = client.roomId ? rooms.get(client.roomId) : null;
      if (!room || !client.playerId) {
        send(client.ws, { type: "error", message: "Not in a room." });
        return;
      }
      if (!isGuess(msg.guess)) {
        send(client.ws, { type: "error", message: "Invalid guess." });
        return;
      }
      const err = applyPlayerGuess(room, client.playerId, msg.guess);
      if (err) {
        send(client.ws, { type: "error", message: err });
        return;
      }
      broadcastState(room);
      return;
    }

    case "advance": {
      const room = client.roomId ? rooms.get(client.roomId) : null;
      if (!room || !client.playerId) {
        send(client.ws, { type: "error", message: "Not in a room." });
        return;
      }
      const err = advanceAfterMiss(room, client.playerId);
      if (err) {
        send(client.ws, { type: "error", message: err });
        return;
      }
      broadcastState(room);
      return;
    }

    case "restart": {
      const room = client.roomId ? rooms.get(client.roomId) : null;
      if (!room || !client.playerId) {
        send(client.ws, { type: "error", message: "Not in a room." });
        return;
      }
      const err = restartRoom(room, client.playerId);
      if (err) {
        send(client.ws, { type: "error", message: err });
        return;
      }
      broadcastState(room);
      return;
    }

    case "chat": {
      const room = client.roomId ? rooms.get(client.roomId) : null;
      if (!room || !client.playerId) {
        send(client.ws, { type: "error", message: "Not in a room." });
        return;
      }
      const result = appendChat(room, client.playerId, msg.text);
      if ("error" in result) {
        send(client.ws, { type: "error", message: result.error });
        return;
      }
      broadcastRoom(room, { type: "chat", message: result });
      return;
    }

    default:
      send(client.ws, { type: "error", message: "Unknown message." });
  }
}

function health(_req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
  });
  res.end(
    JSON.stringify({
      ok: true,
      rooms: rooms.size,
      connections: clients.size,
    }),
  );
}

const server = createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    health(req, res);
    return;
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("Not found");
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  const client: Client = { ws, playerId: null, roomId: null };
  clients.set(ws, client);

  ws.on("message", (raw) => {
    const msg = parseMessage(raw);
    if (!msg) {
      send(ws, { type: "error", message: "Bad message." });
      return;
    }
    try {
      handleMessage(client, msg);
    } catch (err) {
      console.error(err);
      send(ws, { type: "error", message: "Server error." });
    }
  });

  ws.on("close", () => {
    const room = client.roomId ? rooms.get(client.roomId) : null;
    if (room && client.playerId) {
      markDisconnected(room, client.playerId);
      broadcastState(room);

      // Drop empty rooms after a short grace (everyone disconnected).
      if (room.players.every((p) => !p.connected)) {
        const id = room.id;
        setTimeout(() => {
          const current = rooms.get(id);
          if (current && current.players.every((p) => !p.connected)) {
            rooms.delete(id);
          }
        }, 60_000);
      }
    }
    clients.delete(ws);
  });

  ws.on("error", (err) => {
    console.error("ws error", err);
  });
});

server.listen(PORT, () => {
  console.log(`Tehilat Olamim server listening on :${PORT} (ws path /ws)`);
});
