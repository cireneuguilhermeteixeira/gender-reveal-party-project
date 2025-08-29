// server.js (CommonJS)
import next from 'next';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { URL, parse } from 'url';


const dev = false; // produção
const app = next({ dev });
const handle = app.getRequestHandler();

// --- estado de salas em memória ---
const ROOMS = new Map(); // sessionId -> Map(userId -> ws)
const META  = new Map(); // sessionId -> Map(userId -> { name, role, connectedAt })
const PHASE = new Map(); // sessionId -> phase

function getRoom(sessionId) {
  if (!ROOMS.has(sessionId)) ROOMS.set(sessionId, new Map());
  if (!META.has(sessionId))  META.set(sessionId,  new Map());
  return { sockets: ROOMS.get(sessionId), meta: META.get(sessionId) };
}

function snapshot(sessionId) {
  const { meta } = getRoom(sessionId);
  const users = Array.from(meta.entries()).map(([userId, m]) => ({
    userId, name: m.name, role: m.role, connectedAt: m.connectedAt,
  }));
  return { sessionId, phase: PHASE.get(sessionId), users };
}

function encode(m) { return JSON.stringify(m); }

function broadcast(sessionId, msg, exceptUserId) {
  const { sockets } = getRoom(sessionId);
  const payload = encode(msg);
  for (const [uid, ws] of sockets.entries()) {
    if (exceptUserId && uid === exceptUserId) continue;
    try { if (ws.readyState === 1) ws.send(payload); } catch {}
  }
}

function parseQuery(reqUrl) {
  const u = new URL(reqUrl || '/', 'http://localhost');
  return {
    pathname: u.pathname,
    sessionId: u.searchParams.get('sessionId') || '',
    userId:    u.searchParams.get('userId')    || '',
    name:      u.searchParams.get('name')      || '',
    role:      u.searchParams.get('role')      || 'player',
  };
}
// -----------------------------------

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url || '/', true));
  });

  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws, req) => {
    let currentSession = null;
    let currentUser = null;

    const q = parseQuery(req.url);
    if (q.sessionId && q.userId) {
      currentSession = q.sessionId;
      currentUser    = q.userId;
      doJoin(q.sessionId, q.userId, q.name, q.role, ws);
    }

    ws.on('message', (raw) => {
      let msg = null;
      try { msg = JSON.parse(raw.toString()); } catch {}
      if (!msg || typeof msg !== 'object') {
        try { ws.send(encode({ type: 'error', message: 'invalid_json' })); } catch {}
        return;
      }

      switch (msg.type) {
        case 'join': {
          if (!msg.sessionId || !msg.userId) return;
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
        const { sockets } = getRoom(currentSession);
        const alive = sockets.get(currentUser);
        if (alive === ws) doLeave(currentSession, currentUser);
      }
    });

    ws.on('error', (e) => {
      console.warn('[ws] error', e?.message || String(e));
    });
  });

  function doJoin(sessionId, userId, name, role, ws) {
    const { sockets, meta } = getRoom(sessionId);
    const now = Date.now();

    const prev = sockets.get(userId);
    if (prev && prev !== ws) { try { prev.close(4000, 'replaced_by_new_connection'); } catch {} }

    sockets.set(userId, ws);
    meta.set(userId, { name, role, connectedAt: now });

    try {
      ws.send(encode({
        type: 'welcome',
        sessionId,
        you: { userId, role, name },
        room: snapshot(sessionId),
      }));
    } catch {}

    broadcast(sessionId, {
      type: 'user_joined',
      sessionId,
      user: { userId, name, role, connectedAt: now },
    }, userId);
  }

  function doLeave(sessionId, userId) {
    const { sockets, meta } = getRoom(sessionId);
    sockets.delete(userId);
    meta.delete(userId);
    broadcast(sessionId, { type: 'user_left', sessionId, userId });
  }

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url || '/', true);

    // (opcional) suporte HMR em dev:
    // if (pathname === '/_next/webpack-hmr' && typeof app.getUpgradeHandler === 'function') {
    //   return app.getUpgradeHandler()(req, socket, head);
    // }

    if (pathname === '/api/ws') {
      wss.handleUpgrade(req, socket, head, (client) => wss.emit('connection', client, req));
    } else {
      socket.destroy();
    }
  });

  const port = Number(process.env.PORT || 3000);
  server.listen(port, () => console.log(`Ready on http://localhost:${port}`));
});
