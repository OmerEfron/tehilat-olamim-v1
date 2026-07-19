const NAME_KEY = "to-name";
const SELFIE_KEY = "to-selfie";
const PLAYER_KEY = "to-player";

export function loadName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function saveName(name: string): void {
  localStorage.setItem(NAME_KEY, name);
}

export function loadSelfie(): string | null {
  if (typeof window === "undefined") return null;
  const selfie = localStorage.getItem(SELFIE_KEY);
  return selfie && selfie.startsWith("data:image/") ? selfie : null;
}

export function saveSelfie(selfie: string | null): void {
  if (selfie) localStorage.setItem(SELFIE_KEY, selfie);
  else localStorage.removeItem(SELFIE_KEY);
}

export function loadPlayerId(roomId: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(`${PLAYER_KEY}:${roomId}`) ?? null;
}

export function savePlayerId(roomId: string, playerId: string): void {
  sessionStorage.setItem(`${PLAYER_KEY}:${roomId}`, playerId);
}

export function roomFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const room = params.get("room");
  return room ? room.toUpperCase() : null;
}

export function setRoomInUrl(roomId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  window.history.replaceState({}, "", url.toString());
}

export function inviteUrl(roomId: string): string {
  if (typeof window === "undefined") return `?room=${roomId}`;
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  return url.toString();
}
