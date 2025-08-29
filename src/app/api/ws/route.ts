import type { WebSocket } from 'ws';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';




console.log('[ws] route loaded');


// Mensagens tipadas (resumo)
type Role = 'host' | 'player';
type ClientToServer =
  | { type: 'join'; sessionId: string; userId: string; name?: string; role: Role }
  | { type: 'leave'; sessionId: string; userId: string }
  | { type: 'phase_change'; sessionId: string; userId: string; phase: string }
  | { type: 'ping'; sessionId?: string };

type ServerToClient =
  | { type: 'welcome'; sessionId: string; you: { userId: string; role: Role; name?: string }; room: RoomSnapshot }
  | { type: 'user_joined'; sessionId: string; user: UserSummary }
  | { type: 'user_left'; sessionId: string; userId: string }
  | { type: 'phase_changed'; sessionId: string; phase: string; by: string }
  | { type: 'room_snapshot'; sessionId: string; room: RoomSnapshot }
  | { type: 'ack' }
  | { type: 'error'; message: string };

type UserSummary = { userId: string; name?: string; role: Role; connectedAt: number };
type RoomSnapshot = { sessionId: string; phase?: string; users: UserSummary[] };

const ROOMS = new Map<string, Map<string, WebSocket>>();        // sessionId -> (userId -> ws)
const META  = new Map<string, Map<string, { name?: string; role: Role; connectedAt: number }>>();
const PHASE = new Map<string, string>();                         // sessionId -> phase

function encode(m: ServerToClient) { return JSON.stringify(m); }
function parse<T>(raw: unknown): T | null {
  try {
    const txt = typeof raw === 'string' ? raw : Buffer.isBuffer(raw) ? raw.toString('utf8') : '';
    return txt ? (JSON.parse(txt) as T) : null;
  } catch { return null; }
}
function getRoom(sessionId: string) {
  if (!ROOMS.has(sessionId)) ROOMS.set(sessionId, new Map());
  if (!META.has(sessionId))  META.set(sessionId,  new Map());
  return { sockets: ROOMS.get(sessionId)!, meta: META.get(sessionId)! };
}
function snapshot(sessionId: string): RoomSnapshot {
  const { meta } = getRoom(sessionId);
  const users: UserSummary[] = Array.from(meta.entries()).map(([userId, m]) => ({
    userId, name: m.name, role: m.role, connectedAt: m.connectedAt,
  }));
  return { sessionId, phase: PHASE.get(sessionId), users };
}
function broadcast(sessionId: string, msg: ServerToClient, exceptUserId?: string) {
  const { sockets } = getRoom(sessionId);
  const payload = encode(msg);
  for (const [uid, ws] of sockets.entries()) {
    if (exceptUserId && uid === exceptUserId) continue;
    try { ws.send(payload); } catch {}
  }
}

// *** next-ws v2: export function UPGRADE(...) { ... }
// *** next-ws v1: export function SOCKET(...) { ... }
export function SOCKET(
  client: import("ws").WebSocket,
  // request: import("http").IncomingMessage,
  // server: import("ws").WebSocketServer
){ 

  console.log('[ws] client connected');

  let currentSession: string | null = null;
  let currentUser: string | null = null;

  client.on('message', (raw) => {
    const msg = parse<ClientToServer>(raw);
    if (!msg) {
      try { client.send(encode({ type: 'error', message: 'invalid_json' })); } catch {}
      return;
    }

    switch (msg.type) {
      case 'join': {
        const { sockets, meta } = getRoom(msg.sessionId);
        const now = Date.now();

        // permitir rejoin: substitui conexão antiga
        const prev = sockets.get(msg.userId);
        if (prev && prev !== client) { try { prev.close(4000, 'replaced_by_new_connection'); } catch {} }

        sockets.set(msg.userId, client);
        meta.set(msg.userId, { name: msg.name, role: msg.role, connectedAt: now });

        currentSession = msg.sessionId;
        currentUser = msg.userId;

        // manda welcome + snapshot para o novo
        try {
          client.send(encode({
            type: 'welcome',
            sessionId: msg.sessionId,
            you: { userId: msg.userId, role: msg.role, name: msg.name },
            room: snapshot(msg.sessionId),
          }));
        } catch {}

        // avisa os demais
        broadcast(msg.sessionId, {
          type: 'user_joined',
          sessionId: msg.sessionId,
          user: { userId: msg.userId, name: msg.name, role: msg.role, connectedAt: now },
        }, msg.userId);
        break;
      }

      case 'leave': {
        const { sockets, meta } = getRoom(msg.sessionId);
        sockets.delete(msg.userId);
        meta.delete(msg.userId);
        broadcast(msg.sessionId, { type: 'user_left', sessionId: msg.sessionId, userId: msg.userId });
        try { client.close(1000, 'client_left'); } catch {}
        break;
      }

      case 'phase_change': {
        PHASE.set(msg.sessionId, msg.phase);
        broadcast(msg.sessionId, { type: 'phase_changed', sessionId: msg.sessionId, phase: msg.phase, by: msg.userId });
        break;
      }

      case 'ping': {
        try { client.send(encode({ type: 'ack' })); } catch {}
        break;
      }
    }
  });

  client.on('close', () => {
    if (!currentSession || !currentUser) return;
    const { sockets, meta } = getRoom(currentSession);
    if (sockets.has(currentUser)) {
      sockets.delete(currentUser);
      meta.delete(currentUser);
      broadcast(currentSession, { type: 'user_left', sessionId: currentSession, userId: currentUser });
    }
  });

  client.on('error', (err) => {
    // opcional: logar/monitorar
    console.error('WS error', err);
  });
}
