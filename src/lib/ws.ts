import type { ClientMessage, ServerMessage } from "@/lib/protocol";

export function wsUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL;
  if (fromEnv) return fromEnv;

  if (typeof window === "undefined") return "ws://localhost:3001/ws";

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  // Local Next on :3000 → server on :3001 by default.
  if (window.location.port === "3000") {
    return `${proto}//${window.location.hostname}:3001/ws`;
  }
  return `${proto}//${window.location.host}/ws`;
}

export function connectWs(
  onMessage: (msg: ServerMessage) => void,
  onStatus: (status: "connecting" | "open" | "closed") => void,
): { send: (msg: ClientMessage) => void; close: () => void } {
  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const open = () => {
    if (closed) return;
    onStatus("connecting");
    ws = new WebSocket(wsUrl());

    ws.onopen = () => {
      retry = 0;
      onStatus("open");
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as ServerMessage;
        onMessage(msg);
      } catch {
        // ignore malformed
      }
    };

    ws.onclose = () => {
      onStatus("closed");
      if (closed) return;
      const delay = Math.min(8_000, 500 * 2 ** retry);
      retry += 1;
      timer = setTimeout(open, delay);
    };

    ws.onerror = () => {
      ws?.close();
    };
  };

  open();

  return {
    send(msg) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    },
    close() {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    },
  };
}
