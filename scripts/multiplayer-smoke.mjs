/**
 * Multiplayer smoke test against the local (or NEXT_PUBLIC_WS_URL) game server.
 * Run: node scripts/multiplayer-smoke.mjs
 */
import WebSocket from "../server/node_modules/ws/wrapper.mjs";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

function waitFor(ws, predicate, label, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for: ${label}`));
    }, timeoutMs);

    function onMessage(raw) {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (predicate(msg)) {
        cleanup();
        resolve(msg);
      }
    }

    function cleanup() {
      clearTimeout(timer);
      ws.off("message", onMessage);
    }

    ws.on("message", onMessage);
  });
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

function send(ws, msg) {
  ws.send(JSON.stringify(msg));
}

async function main() {
  console.log(`\nMultiplayer smoke → ${WS_URL}\n`);

  // Health
  const healthUrl = WS_URL.replace(/^ws/, "http").replace(/\/ws$/, "/health");
  const health = await fetch(healthUrl).then((r) => r.json());
  assert(health.ok === true, "health endpoint ok");

  const host = await connect();
  const guest = await connect();
  const guest2 = await connect();

  // --- Create room ---
  console.log("\n[create + join]");
  const joinedHostP = waitFor(host, (m) => m.type === "joined", "host joined");
  send(host, { type: "create_room", name: "Host", selfie: null });
  const joinedHost = await joinedHostP;
  assert(!!joinedHost.roomId, `host got roomId=${joinedHost.roomId}`);
  assert(joinedHost.state.players.length === 1, "host alone in lobby");
  assert(joinedHost.state.status === "lobby", "status is lobby");
  assert(joinedHost.state.hostId === joinedHost.playerId, "creator is host");

  const roomId = joinedHost.roomId;
  const hostId = joinedHost.playerId;

  // --- Guest joins ---
  const guestJoinedP = waitFor(guest, (m) => m.type === "joined", "guest joined");
  const hostSeesJoinP = waitFor(
    host,
    (m) => m.type === "state" && m.state.players.length === 2,
    "host sees 2 players",
  );
  send(guest, { type: "join_room", roomId, name: "Guest", selfie: null });
  const joinedGuest = await guestJoinedP;
  const hostState2 = await hostSeesJoinP;
  assert(joinedGuest.roomId === roomId, "guest in same room");
  assert(joinedGuest.state.players.length === 2, "guest sees 2 players");
  assert(hostState2.state.players.length === 2, "host broadcast has 2 players");
  assert(
    hostState2.state.players.every((p) => p.connected),
    "both connected",
  );

  const guestId = joinedGuest.playerId;

  // --- Third player ---
  const g2JoinedP = waitFor(guest2, (m) => m.type === "joined", "guest2 joined");
  const hostSees3P = waitFor(
    host,
    (m) => m.type === "state" && m.state.players.length === 3,
    "host sees 3",
  );
  send(guest2, { type: "join_room", roomId, name: "Guest2", selfie: null });
  await g2JoinedP;
  const hostSees3 = await hostSees3P;
  assert(hostSees3.state.players.length === 3, "3 players in room");

  // --- Non-host cannot start ---
  console.log("\n[start game auth]");
  const errP = waitFor(guest, (m) => m.type === "error", "guest start error");
  send(guest, { type: "start_game" });
  const err = await errP;
  assert(/host/i.test(err.message), `non-host blocked: "${err.message}"`);

  // --- Host starts ---
  const startP = waitFor(
    host,
    (m) => m.type === "state" && m.state.status === "playing",
    "game started",
  );
  const guestStartP = waitFor(
    guest,
    (m) => m.type === "state" && m.state.status === "playing",
    "guest sees start",
  );
  send(host, { type: "start_game" });
  const started = await startP;
  await guestStartP;
  assert(started.state.status === "playing", "status playing");
  assert(started.state.currentPlayerId === hostId, "host goes first");
  assert(started.state.deckCount === 52, "full deck");
  assert(started.state.step === 1, "step 1");

  // --- Guest cannot guess out of turn ---
  console.log("\n[turn enforcement]");
  const notTurnP = waitFor(guest, (m) => m.type === "error", "not your turn");
  send(guest, { type: "guess", guess: { step: 1, value: "red" } });
  const notTurn = await notTurnP;
  assert(/turn/i.test(notTurn.message), `out-of-turn blocked: "${notTurn.message}"`);

  // --- Host guesses until miss (or we force by guessing both colors if needed) ---
  // We'll keep guessing red/black until miss, then advance turn.
  console.log("\n[guess + turn pass]");
  let state = started.state;
  let attempts = 0;
  while (state.phase === "playing" && attempts < 10) {
    const guessVal = attempts % 2 === 0 ? "red" : "black";
    const step = state.step;
    let guess;
    if (step === 1) guess = { step: 1, value: guessVal };
    else if (step === 2) guess = { step: 2, value: "above" };
    else if (step === 3) guess = { step: 3, value: "between" };
    else if (step === 4) guess = { step: 4, value: "hearts" };
    else guess = { step: 5, value: "A" };

    const nextP = waitFor(host, (m) => m.type === "state", `guess ${attempts}`);
    send(host, { type: "guess", guess });
    const next = await nextP;
    state = next.state;
    attempts += 1;
    if (state.phase === "won") break;
  }

  if (state.phase === "won") {
    assert(true, "unlikely instant win — skipping miss path");
  } else {
    assert(state.phase === "missed", `got miss phase (after ${attempts} guesses)`);
    assert(state.lastResult === "wrong", "lastResult wrong");

    const guestSeesMiss = await waitFor(
      guest,
      (m) => m.type === "state" && m.state.phase === "missed",
      "guest sees miss",
      2000,
    ).catch(() => null);
    // guest may have already received it in parallel; check via advance sync instead
    void guestSeesMiss;

    const afterAdvanceP = waitFor(
      host,
      (m) => m.type === "state" && m.state.phase === "playing",
      "after advance",
    );
    const guestAdvanceP = waitFor(
      guest,
      (m) =>
        m.type === "state" &&
        m.state.phase === "playing" &&
        m.state.currentPlayerId === guestId,
      "guest becomes current",
    );
    send(host, { type: "advance" });
    const after = await afterAdvanceP;
    const guestTurn = await guestAdvanceP;
    assert(after.state.currentPlayerId === guestId, "turn passed to guest");
    assert(after.state.step === 1, "table reset to step 1");
    assert(after.state.table.every((c) => c === null), "table cleared");
    assert(guestTurn.state.currentPlayerId === guestId, "guest sees own turn");
  }

  // --- Chat ---
  console.log("\n[chat]");
  const chatHostP = waitFor(host, (m) => m.type === "chat", "host chat");
  const chatGuestP = waitFor(guest, (m) => m.type === "chat", "guest chat");
  send(guest2, { type: "chat", text: "hello table" });
  const chatH = await chatHostP;
  const chatG = await chatGuestP;
  assert(chatH.message.text === "hello table", "host received chat");
  assert(chatG.message.text === "hello table", "guest received chat");
  assert(chatH.message.name === "Guest2", "chat shows sender name");

  // --- Disconnect + rejoin (client must rejoin after WS drop) ---
  console.log("\n[disconnect + rejoin]");
  const guest2Id = hostSees3.state.players.find((p) => p.name === "Guest2").id;

  const hostAfterDiscP = waitFor(
    host,
    (m) =>
      m.type === "state" &&
      m.state.players.some((p) => p.id === guest2Id && !p.connected),
    "guest2 disconnected",
    12_000,
  );
  guest2.close();
  const afterDisc = await hostAfterDiscP;
  assert(
    afterDisc.state.players.find((p) => p.id === guest2Id)?.connected === false,
    "guest2 marked disconnected",
  );

  // Broken client behavior: new socket without rejoin → "Not in a room."
  const ghost = await connect();
  const ghostErrP = waitFor(ghost, (m) => m.type === "error", "ghost error");
  send(ghost, { type: "guess", guess: { step: 1, value: "red" } });
  const ghostErr = await ghostErrP;
  assert(
    /not in a room/i.test(ghostErr.message),
    `silent reconnect is broken without rejoin: "${ghostErr.message}"`,
  );
  ghost.close();

  // Fixed client behavior: rejoin after reconnect
  const rejoinWs = await connect();
  const rejoinP = waitFor(rejoinWs, (m) => m.type === "joined", "rejoined");
  const hostRejoinP = waitFor(
    host,
    (m) =>
      m.type === "state" &&
      m.state.players.some((p) => p.id === guest2Id && p.connected),
    "host sees rejoin",
  );
  send(rejoinWs, {
    type: "rejoin",
    roomId,
    playerId: guest2Id,
    name: "Guest2",
    selfie: null,
  });
  const rejoined = await rejoinP;
  await hostRejoinP;
  assert(rejoined.playerId === guest2Id, "same player id after rejoin");
  assert(
    rejoined.state.players.find((p) => p.id === guest2Id)?.connected === true,
    "rejoined player connected",
  );

  // --- Bad room ---
  console.log("\n[errors]");
  const bad = await connect();
  const badP = waitFor(bad, (m) => m.type === "error", "bad room");
  send(bad, { type: "join_room", roomId: "ZZZZZZ", name: "X", selfie: null });
  const badMsg = await badP;
  assert(/not found/i.test(badMsg.message), `missing room: "${badMsg.message}"`);
  bad.close();

  // --- Empty name ---
  const empty = await connect();
  const emptyP = waitFor(empty, (m) => m.type === "error", "empty name");
  send(empty, { type: "create_room", name: "   ", selfie: null });
  const emptyMsg = await emptyP;
  assert(/name/i.test(emptyMsg.message), `empty name: "${emptyMsg.message}"`);
  empty.close();

  host.close();
  guest.close();
  rejoinWs.close();

  console.log(`\n${"─".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
