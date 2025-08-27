// ============================================================================
// Next.js WebSocket Client + Server (TypeScript)
// - Works with Next.js "app" router using a Route Handler at /api/ws (Edge)
// - Includes a client similar to your HttpClient, but for WebSockets
// - Keeps room state in-memory; users can re-enter and are re-added
// - Also ships a Node fallback for local/dev using pages/api (optional)
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// 1) lib/ws/messages.ts — shared message contracts + helpers
// ─────────────────────────────────────────────────────────────────────────────

export type Role = 'host' | 'player'

export type UserSummary = {
  userId: string
  name?: string
  role: Role
  connectedAt: number // epoch ms
}

export type RoomSnapshot = {
  sessionId: string
  phase?: string
  users: UserSummary[]
}

export type ClientToServer =
  | { type: 'join'; sessionId: string; userId: string; name?: string; role: Role }
  | { type: 'leave'; sessionId: string; userId: string }
  | { type: 'phase_change'; sessionId: string; userId: string; phase: string }
  | { type: 'ping'; sessionId?: string }

export type ServerToClient =
  | { type: 'welcome'; sessionId: string; you: { userId: string; role: Role; name?: string }; room: RoomSnapshot }
  | { type: 'user_joined'; sessionId: string; user: UserSummary }
  | { type: 'user_left'; sessionId: string; userId: string }
  | { type: 'phase_changed'; sessionId: string; phase: string; by: string }
  | { type: 'room_snapshot'; sessionId: string; room: RoomSnapshot }
  | { type: 'pong' }
  | { type: 'error'; message: string }

export function encode(msg: ClientToServer | ServerToClient): string {
  return JSON.stringify(msg)
}

export function safeParse<T = unknown>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
