# תהילת עולמים · Tehilat Olamim

Multiplayer card guessing game. Static UI + small WebSocket server.

## Architecture

| Piece | Role | Deploy |
| --- | --- | --- |
| Next.js (`output: "export"`) | UI | Cloudflare Pages (or any static host) |
| `server/` (Node + `ws`) | Rooms, turns, deck, chat | Docker (Render, Fly, VPS, …) |

The server is authoritative: clients never see the remaining deck order.

## Local development

```bash
# terminal 1 — game server
npm run server:install
npm run dev:server

# terminal 2 — UI
cp .env.example .env.local   # optional; defaults to ws://localhost:3001/ws
npm install
npm run dev
```

Open `http://localhost:3000`, create a room, share `?room=CODE`.

## Docker (server only)

```bash
docker compose up --build
```

Health: `curl http://localhost:3001/health`  
WebSocket: `ws://localhost:3001/ws`

Point the static UI at it with:

```bash
NEXT_PUBLIC_WS_URL=wss://your-server.example.com/ws
npm run build
```

Upload the `out/` folder to Cloudflare Pages.

## Multiplayer rules

- Create a room → invite link `?room=XXXXXX`
- Anyone can join while the game is running (appended last in turn order)
- Max 9 players
- Wrong guess → next connected player’s turn
- Correct through all 5 steps → Eternal Glory
- Chat is shared for the room

See [GAME_LOGIC.md](./GAME_LOGIC.md) for guess steps.
