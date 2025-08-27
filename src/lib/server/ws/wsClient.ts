// ─────────────────────────────────────────────────────────────────────────────
// 2) lib/ws/wsClient.ts — WebSocket client (similar to HttpClient)
// ─────────────────────────────────────────────────────────────────────────────

// lib/ws/wsClient.ts
import { encode, safeParse } from '@/lib/server/ws/messages';
import type { ClientToServer, ServerToClient, Role } from '@/lib/server/ws/messages';

export type WSConnectInit = {
  /** The WS path, e.g. '/ws' (baseUrl is prefixed). */
  path: string
  sessionId: string
  userId: string
  role: Role
  name: string
  /** When true, auto reconnects with exponential backoff. Default: true */
  autoReconnect?: boolean
  maxRetries?: number
  backoffBaseMs?: number
  /** Optional extra query params */
  query?: Record<string, string | number | boolean>
}

export type WSEventHandlers = {
  open: () => void
  close: (evt: CloseEvent | { code: number; reason: string }) => void
  error: (message: string) => void
  message: (msg: ServerToClient) => void
}

export class WebSocketClient {
  private baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  /** Connects to ws(s)://<origin><baseUrl><path>?params and returns a managed socket */
  connect(init: WSConnectInit) {
    return new ManagedSocket(this.baseUrl, init)
  }
}

export class ManagedSocket {
  private url: string
  private ws: WebSocket | null = null
  private opts: Required<Omit<WSConnectInit, 'path'>> & { path: string }
  private handlers: Partial<WSEventHandlers> = {}
  private retries = 0
  private heartbeatTimer: number | null = null

  constructor(baseUrl: string, init: WSConnectInit) {
    const { path, sessionId, userId, role, name, autoReconnect = true, maxRetries = 8, backoffBaseMs = 400, query = {} } = init

    const q = new URLSearchParams({
      sessionId,
      userId,
      role,
      ...(name ? { name } : {}),
      ...Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)]))
    })

    // Build ws/wss URL from current location (browser)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const httpUrl = origin + baseUrl + path
    const wsUrl = httpUrl.replace(/^http/, 'ws') + `?${q.toString()}`

    this.url = wsUrl
    this.opts = { path, sessionId, userId, role, name, autoReconnect, maxRetries, backoffBaseMs, query }
  }

  on<K extends keyof WSEventHandlers>(event: K, handler: WSEventHandlers[K]) {
    this.handlers[event] = handler
    return this
  }

  off<K extends keyof WSEventHandlers>(event: K) {
    delete this.handlers[event]
    return this
  }

  open() {
    this.cleanup()
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.retries = 0
      this.handlers.open?.()
      // Explicit join message (server also reads query — this is idempotent)
      this.send({ type: 'join', sessionId: this.opts.sessionId, userId: this.opts.userId, role: this.opts.role, name: this.opts.name })
      this.startHeartbeat()
    }

    this.ws.onmessage = (ev) => {
      const data = typeof ev.data === 'string' ? ev.data : ''
      const msg = safeParse<ServerToClient>(data)
      if (!msg) return
      this.handlers.message?.(msg)
    }

    this.ws.onerror = () => this.handlers.error?.('WebSocket error')

    this.ws.onclose = (evt) => {
      this.stopHeartbeat()
      this.handlers.close?.(evt)
      if (this.opts.autoReconnect && this.retries < this.opts.maxRetries) {
        const delay = this.backoffMs(this.retries++)
        setTimeout(() => this.open(), delay)
      }
    }

    return this
  }

  close(code?: number, reason?: string) {
    this.send({ type: 'leave', sessionId: this.opts.sessionId, userId: this.opts.userId })
    this.ws?.close(code, reason)
    this.cleanup()
  }

  // Convenience senders
  sendPhaseChange(phase: string) {
    this.send({ type: 'phase_change', sessionId: this.opts.sessionId, userId: this.opts.userId, phase })
  }

  send(raw: ClientToServer) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(encode(raw))
    }
  }

  // Heartbeat
  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      this.send({ type: 'ping', sessionId: this.opts.sessionId })
    }, 15_000)
  }
  private stopHeartbeat() {
    if (this.heartbeatTimer != null) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
  private cleanup() {
    this.stopHeartbeat()
    if (this.ws) this.ws.onopen = this.ws.onmessage = this.ws.onclose = this.ws.onerror = null
  }
  private backoffMs(n: number) {
    const jitter = Math.random() * 200
    return Math.min(10_000, this.opts.backoffBaseMs * 2 ** n + jitter)
  }
}

export const ws = new WebSocketClient('/api')
