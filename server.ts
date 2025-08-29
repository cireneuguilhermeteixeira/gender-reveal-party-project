// server.ts
import { parse as parseUrl, URL as NodeURL } from 'node:url';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import next from 'next';
import { WebSocket, WebSocketServer, RawData } from 'ws';

/** ========= Tipos do seu protocolo ========= */

type Role = 'host' | 'player';

type ClientToServer =
  | { type: 'join'; sessionId: string; userId: string; name?: string; role: Role }
  | { type: 'leave'; sessionId: string; userId: string }
  | { type: 'phase_change'; sessionId: string; userId: string; phase: string }
  | { type: 'ping'; sessionId?: string };

type UserSummary = { userId: string; name?: string; role: Role; connectedAt: number };
type RoomSnapshot = { sessionId: string; phase?: string; users: UserSummary[] };

type ServerToClient =
  | { type: 'welcome'; sessionId: string; you: { userId: string; role: Role; name?: string }; room: RoomSnapshot }
  | { type: 'user_joined'; sessionId: string; user: UserSummary }
  | { type: 'user_left'; sessionId: string; userId: string }
  | { type: 'phase_changed'; sessionId: string; phase: string; by: string }
  | { type: 'room_snapshot'; sessionId: string; room: RoomSnapshot }
  | { type: 'ack' }
  | { type: 'error'; message: string };

/** ========= Estado em memória ========= */

const ROOMS = new Map<string, Map<string, WebSocket>>(); // sessionId -> (userId -> ws)
const META  = new Map<string, Map<string, { name?: string; role: Role; connectedAt: number }>>();
const PHASE = new Map<string, string>();                 // sessionId -> phase

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

function encode(m: ServerToClient) { return JSON.stringify(m); }
function parseJSON<T>(raw: RawData): T | null {
  try {
    const txt = typeof raw === 'string' ? raw : Buffer.isBuffer(raw) ? raw.toString('utf8') : '';
    return txt ? (JSON.parse(txt) as T) : null;
  } catch { return null; }
}

function broadcast(sessionId: string, msg: ServerToClient, exceptUserId?: string) {
  const { sockets } = getRoom(sessionId);
  const payload = encode(msg);
  for (const [uid, ws] of sockets.entries()) {
    if (exceptUserId && uid === exceptUserId) continue;
    try { if (ws.readyState === WebSocket.OPEN) ws.send(payload); } catch {}
  }
}

/** ========= Helpers ========= */

function parseQuery(reqUrl: string | undefined) {
  const u = new NodeURL(reqUrl ?? '/', 'http://localhost');
  return {
    pathname: u.pathname,
    sessionId: u.searchParams.get('sessionId') || '',
    userId:    u.searchParams.get('userId')    || '',
    name:      u.searchParams.get('name')      || '',
    role:     (u.searchParams.get('role') as Role) || 'player',
  };
}

function doJoin(sessionId: string, userId: string, name: string | undefined, role: Role, ws: WebSocket) {
  const { sockets, meta } = getRoom(sessionId);
  const now = Date.now();

  // rejoin: derruba socket antigo, se existir
  const prev = sockets.get(userId);
  if (prev && prev !== ws) {
    try { prev.close(4000, 'replaced_by_new_connection'); } catch {}
  }

  sockets.set(userId, ws);
  meta.set(userId, { name, role, connectedAt: now });

  // welcome para o novo
  try {
    ws.send(encode({
      type: 'welcome',
      sessionId,
      you: { userId, role, name },
      room: snapshot(sessionId),
    }));
  } catch {}

  // notify outros
  broadcast(sessionId, {
    type: 'user_joined',
    sessionId,
    user: { userId, name, role, connectedAt: now },
  }, userId);
}

function doLeave(sessionId: string, userId: string) {
  const { sockets, meta } = getRoom(sessionId);
  sockets.delete(userId);
  meta.delete(userId);
  broadcast(sessionId, { type: 'user_left', sessionId, userId });
}

/** ========= Next + WS server ========= */

const nextApp = next({ dev: process.env.NODE_ENV !== 'production' });
const handle  = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
    // (parsedUrl é opcional nas versões recentes, mas manteremos por compat)
    handle(req, res, parseUrl(req.url || '/', true));
  });

  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // estado por conexão
    let currentSession: string | null = null;
    let currentUser:    string | null = null;

    // auto-join se querystring vier preenchida
    const q = parseQuery(req.url);
    if (q.sessionId && q.userId) {
      currentSession = q.sessionId;
      currentUser    = q.userId;
      doJoin(q.sessionId, q.userId, q.name, q.role, ws);
    }

    ws.on('message', (raw, isBinary) => {
      // ignore binário (se quiser)
      if (isBinary) return;
      const msg = parseJSON<ClientToServer>(raw);
      if (!msg) {
        try { ws.send(encode({ type: 'error', message: 'invalid_json' })); } catch {}
        return;
      }

      switch (msg.type) {
        case 'join': {
          if (!msg.sessionId || !msg.userId) {
            try { ws.send(encode({ type: 'error', message: 'missing_session_or_user' })); } catch {}
            return;
          }
          currentSession = msg.sessionId;
          currentUser    = msg.userId;
          doJoin(msg.sessionId, msg.userId, msg.name, msg.role, ws);
          break;
        }
        case 'leave': {
          if (!msg.sessionId || !msg.userId) return;
          doLeave(msg.sessionId, msg.userId);
          try { ws.close(1000, 'client_left'); } catch {}
          break;
        }
        case 'phase_change': {
          if (!msg.sessionId || !msg.userId || !msg.phase) return;
          PHASE.set(msg.sessionId, msg.phase);
          broadcast(msg.sessionId, {
            type: 'phase_changed',
            sessionId: msg.sessionId,
            phase: msg.phase,
            by: msg.userId
          });
          break;
        }
        case 'ping': {
          try { ws.send(encode({ type: 'ack' })); } catch {}
          break;
        }
      }
    });

    ws.on('close', () => {
      if (currentSession && currentUser) {
        // só tira da sala se este socket ainda é o registrado
        const { sockets } = getRoom(currentSession);
        const alive = sockets.get(currentUser);
        if (alive === ws) doLeave(currentSession, currentUser);
      }
    });

    ws.on('error', (e) => {
      // logging opcional
      console.warn('[ws] error', (e)?.message || String(e));
    });
  });

  server.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const { pathname } = parseUrl(req.url || '/', true);

    // Dev HMR (apenas em dev; guarda compat)
    if (pathname === '/_next/webpack-hmr' && typeof (nextApp).getUpgradeHandler === 'function') {
      return (nextApp).getUpgradeHandler()(req, socket, head);
    }

    if (pathname === '/api/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  const port = Number(process.env.PORT || 3000);
  server.listen(port, () => {
    console.log(`Ready on http://localhost:${port}`);
  });
});
