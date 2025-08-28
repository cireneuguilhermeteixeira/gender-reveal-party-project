export type Role = 'host' | 'player'

export type UserSummary = {
  userId: string
  name?: string
  role: Role
  connectedAt: number
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
  | { type: 'ack' }
  | { type: 'error'; message: string }

const encode = (msg: ClientToServer | ServerToClient) => JSON.stringify(msg)
const safeParse = <T = unknown>(raw: string): T | null => {
  try { return JSON.parse(raw) as T } catch { return null }
}

// ---------------- Client public API ----------------
export type WSConnectInit = {
  path: string // e.g. '/ws' (baseUrl is prefixed)
  sessionId: string
  userId: string
  role: Role
  name: string
  autoReconnect?: boolean
  maxRetries?: number
  backoffBaseMs?: number
  query?: Record<string, string | number | boolean>
}

export type WSEventHandlers = {
  // lifecycle
  open: () => void
  close: (evt: CloseEvent | { code: number; reason: string }) => void
  error: (message: string) => void

  // typed events from server
  welcome: (m: Extract<ServerToClient, { type: 'welcome' }>) => void
  user_joined: (m: Extract<ServerToClient, { type: 'user_joined' }>) => void
  user_left: (m: Extract<ServerToClient, { type: 'user_left' }>) => void
  phase_changed: (m: Extract<ServerToClient, { type: 'phase_changed' }>) => void
  room_snapshot: (m: Extract<ServerToClient, { type: 'room_snapshot' }>) => void
  ack: () => void
  // fallback for any valid message
  message: (m: ServerToClient) => void
  // optional raw text handler (non‑JSON)
  text?: (raw: string) => void
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
  private handlers: Partial<WSEventHandlers> = {}
  private retries = 0
  private heartbeatTimer: number | null = null
  private manuallyClosed = false
  private opts: Required<Omit<WSConnectInit, 'path'>> & { path: string }

  constructor(baseUrl: string, init: WSConnectInit) {
    const {
      path, sessionId, userId, role, name,
      autoReconnect = true,
      maxRetries = 8,
      backoffBaseMs = 400,
      query = {},
    } = init

    const q = new URLSearchParams({
      sessionId,
      userId,
      role,
      ...(name ? { name } : {}),
      ...Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)])),
    })

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const httpUrl = origin + baseUrl + path
    const wsUrl = httpUrl.replace(/^http/, 'ws') + `?${q.toString()}`

    this.url = wsUrl
    this.opts = { path, sessionId, userId, role, name, autoReconnect, maxRetries, backoffBaseMs, query }
  }

  // event management
  on<K extends keyof WSEventHandlers>(event: K, handler: WSEventHandlers[K]) { this.handlers[event] = handler; return this }
  off<K extends keyof WSEventHandlers>(event: K) { delete this.handlers[event]; return this }

  // lifecycle
  open() {
    this.cleanup()
    this.manuallyClosed = false
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.retries = 0
      this.handlers.open?.()
      // ensure server state (idempotent): JOIN on open
      this.send({ type: 'join', sessionId: this.opts.sessionId, userId: this.opts.userId, role: this.opts.role, name: this.opts.name })
      this.startHeartbeat()
    }

    this.ws.onmessage = async (ev) => {
      let text: string | null = null
      if (typeof ev.data === 'string') text = ev.data
      else if (ev.data instanceof Blob) text = await ev.data.text()
      else if (ev.data instanceof ArrayBuffer) text = new TextDecoder().decode(ev.data)
      if (!text) return

      const msg = safeParse<ServerToClient>(text)
      if (!msg) { this.handlers.text?.(text); return }

      switch (msg.type) {
        case 'welcome': this.handlers.welcome?.(msg); break
        case 'user_joined': this.handlers.user_joined?.(msg); break
        case 'user_left': this.handlers.user_left?.(msg); break
        case 'phase_changed': this.handlers.phase_changed?.(msg); break
        case 'room_snapshot': this.handlers.room_snapshot?.(msg); break
        case 'ack': this.handlers.ack?.(); break
        case 'error': this.handlers.error?.(msg.message); break
      }
      this.handlers.message?.(msg)
    }

    this.ws.onerror = () => this.handlers.error?.('WebSocket error')

    this.ws.onclose = (evt) => {
      this.stopHeartbeat()
      this.handlers.close?.(evt)
      if (!this.manuallyClosed && this.opts.autoReconnect && this.retries < this.opts.maxRetries) {
        const delay = this.backoffMs(this.retries++)
        setTimeout(() => this.open(), delay)
      }
    }

    return this
  }

  close(code?: number, reason?: string) {
    this.manuallyClosed = true
    this.send({ type: 'leave', sessionId: this.opts.sessionId, userId: this.opts.userId })
    this.ws?.close(code, reason)
    this.cleanup()
  }

  isOpen() { return this.ws?.readyState === WebSocket.OPEN }

  // convenience senders
  sendPhaseChange(phase: string) {
    this.send({ type: 'phase_change', sessionId: this.opts.sessionId, userId: this.opts.userId, phase })
  }

  send(raw: ClientToServer) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(encode(raw))
  }

  // internals
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
// Factory with your base URL, like your HttpClient('/api')
export const ws = new WebSocketClient('/api')

/* ------------------------ Usage (Host example) ------------------------------
import { useEffect, useRef } from 'react'
import { gameWS } from '@/lib/ws/GameWebSocketClient'

export function HostSocket({ sessionId, userId, name }: { sessionId: string; userId: string; name?: string }) {
  const sockRef = useRef<ReturnType<typeof gameWS.connect> | null>(null)

  useEffect(() => {
    const sock = gameWS
      .connect({ path: '/ws', sessionId, userId, role: 'host', name, autoReconnect: true })
      .on('open', () => console.log('[ws] open'))
      .on('error', (e) => console.warn('[ws] error', e))
      .on('welcome', ({ room }) => console.log('[ws] welcome snapshot', room))
      .on('user_joined', ({ user }) => console.log('[ws] joined', user))
      .on('user_left', ({ userId }) => console.log('[ws] left', userId))
      .on('phase_changed', ({ phase }) => console.log('[ws] phase ->', phase))
      .open()

    sockRef.current = sock
    return () => sockRef.current?.close()
  }, [sessionId, userId, name])

  return (
    <button onClick={() => sockRef.current?.sendPhaseChange('QUIZ_ANSWERING')} className="rounded bg-indigo-600 text-white px-3 py-2">
      Mudar fase para QUIZ_ANSWERING
    </button>
  )
}
*/

/* ------------------------ Usage (Player example) ----------------------------
import { useEffect } from 'react'
import { gameWS } from '@/lib/ws/GameWebSocketClient'

export function PlayerSocket({ sessionId, userId, name }: { sessionId: string; userId: string; name?: string }) {
  useEffect(() => {
    const sock = gameWS
      .connect({ path: '/ws', sessionId, userId, role: 'player', name, autoReconnect: true })
      .on('open', () => console.log('[ws] open'))
      .on('phase_changed', ({ phase }) => console.log('[ws] phase ->', phase))
      .on('user_joined', ({ user }) => console.log('[ws] joined', user))
      .on('user_left', ({ userId }) => console.log('[ws] left', userId))
      .open()

    return () => sock.close()
  }, [sessionId, userId, name])

  return null
}
*/
