/**
 * Room utility helpers (shared between client & server).
 * Pure functions — no side-effects.
 */

/** Generate a short, URL-safe room ID */
export function generateRoomId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/** Build the shareable URL for a room */
export function getRoomShareUrl(roomId) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/room/${roomId}`;
  }
  return `/room/${roomId}`;
}

/** Broadcast event types sent over Supabase Realtime */
export const ROOM_EVENTS = {
  PLAY: "room:play",
  PAUSE: "room:pause",
  SEEK: "room:seek",
  CHANGE_SONG: "room:change_song",
  SYNC_STATE: "room:sync_state",
  SYNC_TICK: "room:sync_tick",
  SKIP_NEXT: "room:skip_next",
  SKIP_PREV: "room:skip_prev",
  QUEUE_UPDATE: "room:queue_update",
  USER_JOINED: "room:user_joined",
  USER_LEFT: "room:user_left",
  PERMISSION_UPDATE: "room:permission_update",
  ROOM_DESTROYED: "room:destroyed",
  REQUEST_SYNC: "room:request_sync",
};
