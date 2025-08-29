'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { stripAccents } from '@/lib/utils'
import { http } from '@/lib/server/httpClient'
import { ws, WebSocketClient } from '@/lib/server/ws/wsClient'
import { Phase, Prisma } from '@prisma/client'
import { useParams } from 'next/navigation'
import { isTermoAnswering, isTermoPreparing, isTermoResults } from '@/lib/sessionPhase'
import TermoExplanation from '@/components/TermoExplanation'
import Scoreboard from '@/components/ScoreBoard'
import StatusBadge from '@/components/StatusBadge'
import AppShellKids from '@/components/AppShellKids'
import LogoKid from '@/components/LogoKid'
import SparkleButton from '@/components/SparkleButton'
import FinalRevelation from '@/components/FinalRevelation'

// --- Types -----------------------------------------------------------------

type SessionWithUsers = Prisma.SessionGetPayload<{
  include: { User: true; UserAnswer: true; currentQuestion: true }
}>

type KeyboardKey = string | '{back}' | '{enter}'

// --- Constants --------------------------------------------------------------

const MAX_ATTEMPTS = 5
const TERM_TIMER_SECONDS = 60

const KB_ROWS: KeyboardKey[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç'],
  ['{back}', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '{enter}']
]

// localStorage key helper (isola por sessão e etapa)
const termoIndexKey = (sessionId: string, phase: Phase | undefined) =>
  `termo:lastIndex:${sessionId}:${phase ?? 'UNK'}`

// FINAL genérico, sem helper externo
const isFinalPhase = (phase?: Phase) =>
  phase != null && String(phase).toUpperCase().endsWith('FINAL')

// Pastéis para tiles/teclas
const TILE = {
  typing: 'bg-sky-200 text-slate-900 ring-1 ring-sky-300',
  correct: 'bg-emerald-200 text-slate-900 ring-1 ring-emerald-300',
  present: 'bg-amber-200 text-slate-900 ring-1 ring-amber-300',
  absent: 'bg-slate-200 text-slate-600 ring-1 ring-slate-300',
}

const KBD = {
  base: 'bg-white text-slate-800 border border-slate-200',
  correct: 'bg-emerald-200 text-slate-900 border-emerald-300',
  present: 'bg-amber-200 text-slate-900 border-amber-300',
  absent: 'bg-slate-200 text-slate-600 border-slate-300',
  action: 'bg-sky-100 text-slate-800 border-sky-200',
}

export default function TermoPage() {
  const [session, setSession] = useState<SessionWithUsers | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [word, setWord] = useState<string>('') // palavra atual (oculta ao usuário)
  const [wordIndex, setWordIndex] = useState<number | null>(null) // índice atual
  const [currentAttempt, setCurrentAttempt] = useState('')
  const [attempts, setAttempts] = useState<string[]>([])
  const [colorsByRow, setColorsByRow] = useState<string[][]>([])
  const [won, setWon] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TERM_TIMER_SECONDS)
  const [alertMsg, setAlertMsg] = useState<string | null>(null)
  const postingRef = useRef(false) // evita post duplo
  const sockRef = useRef<ReturnType<WebSocketClient['connect']> | null>(null)

  const userId = useMemo(
    () => (typeof window !== 'undefined' ? localStorage.getItem('user_id') ?? '' : ''),
    []
  )

  const { session_id: sessionId } = useParams<{ session_id: string }>()

  const fetchSession = useCallback(async () => {
    if (!sessionId) return
    try {
      setErr(null)
      const s = await http.get<SessionWithUsers>(`/session/${sessionId}`)
      setSession(s)
    } catch {
      setErr('Falha ao carregar sessão.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  // WS
  useEffect(() => {
    if (sockRef.current || !sessionId) return
    const user = session?.User.find(u => u.id === userId)
    const sock = ws
      .connect({ path: '/ws', sessionId, userId, name: user?.name || userId, role: 'player', autoReconnect: true })
      .on('open', () => console.log('[ws] open'))
      .on('error', (e) => console.warn('[ws] error', e))
      .on('welcome', ({ room }) => console.log('[ws] welcome snapshot', room))
      .on('user_joined', ({ user }) => {
        fetchSession()
        console.log('[ws] joined', user)
      })
      .on('user_left', ({ userId }) => {
        fetchSession()
        console.log('[ws] left', userId)
      })
      .on('phase_changed', ({ phase }) => {
        fetchSession()
        console.log('[ws] phase ->', phase)
      })
      .open()

    sockRef.current = sock
    return () => sockRef.current?.close()
     
  }, [fetchSession, session?.User, sessionId, userId])

  const requestNewWord = useCallback(
    async (phase: Phase | undefined) => {
      if (!sessionId) return
      try {
        setErr(null)
        const key = termoIndexKey(sessionId, phase)
        const lastIndexRaw =
          typeof window !== 'undefined' ? localStorage.getItem(key) : null
        const excludeIndex =
          lastIndexRaw != null && !Number.isNaN(Number(lastIndexRaw))
            ? Number(lastIndexRaw)
            : null

        const url =
          excludeIndex != null
            ? `/baby-word?excludeIndex=${excludeIndex}`
            : `/baby-word`
        const data = await http.get<{ word: string; index: number }>(url)

        setWord(data.word)
        setWordIndex(data.index)
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, String(data.index))
        }
        // reset da rodada
        setAttempts([])
        setColorsByRow([])
        setCurrentAttempt('')
        setWon(false)
        setTimeLeft(TERM_TIMER_SECONDS)
        setAlertMsg(null)
        postingRef.current = false
      } catch (e) {
        console.error('requestNewWord failed', e)
        setErr('Falha ao sortear palavra.')
      }
    },
    [sessionId]
  )

  useEffect(() => {
    if (!session) return
    if (isTermoAnswering(session.phase)) {
      requestNewWord(session.phase).catch(() => setErr('Falha ao sortear palavra.'))
    }
  }, [requestNewWord, session, session?.phase])

  // Timer TERMO
  useEffect(() => {
    if (!session || !isTermoAnswering(session.phase)) return
    if (won) return
    if (timeLeft <= 0) {
      setAlertMsg('Tempo esgotado! Aguarde o resultado.')
      submitIfNeeded(false)
      return
    }
    const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.phase, timeLeft, won])

  // letras (tipo Wordle)
  const letterColor = useCallback(
    (letter: string, index: number) => {
      const nlet = stripAccents(letter).toLowerCase()
      const nword = stripAccents(word).toLowerCase()
      if (!nword[index]) return 'gray'
      if (nlet === nword[index]) return 'green'
      if (nword.includes(nlet)) return 'yellow'
      return 'gray'
    },
    [word]
  )

  const disabled = useMemo(() => {
    if (!session) return true
    return !isTermoAnswering(session.phase) || won || attempts.length >= MAX_ATTEMPTS || timeLeft <= 0
  }, [session, won, attempts.length, timeLeft])

  const wordLen = useMemo(() => word.length || 5, [word])

  // status do teclado
  const letterStatuses = useMemo(() => {
    const status = new Map<string, 'correct' | 'present' | 'absent'>()
    attempts.forEach((att, rowIdx) => {
      for (let i = 0; i < att.length; i++) {
        const ch = stripAccents(att[i]).toUpperCase()
        const color = colorsByRow[rowIdx]?.[i] ?? ''
        // mapeia
        const rank =
          color === 'green' ? 3 :
          color === 'yellow' ? 2 :
          color === 'gray' ? 1 : 0
        const prev =
          status.get(ch) === 'correct' ? 3 :
          status.get(ch) === 'present' ? 2 :
          status.get(ch) === 'absent' ? 1 : 0
        if (rank > prev) {
          status.set(ch, rank === 3 ? 'correct' : rank === 2 ? 'present' : 'absent')
        }
      }
    })
    return status
  }, [attempts, colorsByRow])

  const submitIfNeeded = useCallback(
    async (justWon: boolean) => {
      if (postingRef.current) return
      postingRef.current = true

      try {
        if (!userId || !session || wordIndex == null) return
        const timeTaken = Math.max(0, TERM_TIMER_SECONDS - timeLeft)

        await http.post('/user-answers', {
          answerType: 'termo',
          userId,
          sessionId: session.id,
          timeTaken,
          termoWordIndex: wordIndex,
          justWon,
          attempts
        })
      } catch (e) {
        console.error('submit termo failed', e)
      }
    },
    [attempts, session, timeLeft, userId, wordIndex]
  )

  // tentativa
  const commitAttempt = useCallback(() => {
    if (disabled) return
    if (currentAttempt.length !== wordLen) return

    const guess = currentAttempt.toLowerCase()
    const colors = Array.from({ length: wordLen }, (_, i) => letterColor(guess[i] ?? '', i))

    const nextAttempts = [...attempts, guess]
    const nextColors = [...colorsByRow, colors]

    setAttempts(nextAttempts)
    setColorsByRow(nextColors)
    setCurrentAttempt('')

    const normalizedGuess = stripAccents(guess).toLowerCase()
    const normalizedWord = stripAccents(word).toLowerCase()

    if (normalizedGuess === normalizedWord) {
      setWon(true)
      setAlertMsg('Você acertou! 🎉 Aguarde os outros participantes.')
      submitIfNeeded(true)
      return
    }

    if (nextAttempts.length >= MAX_ATTEMPTS) {
      setAlertMsg('Acabaram as tentativas. Aguarde o resultado.')
      submitIfNeeded(false)
    }
  }, [attempts, colorsByRow, currentAttempt, disabled, letterColor, submitIfNeeded, word, wordLen])

  const handleKeyPress = useCallback(
    (key: KeyboardKey) => {
      if (disabled && key !== '{back}' && key !== '{enter}') return
      if (key === '{back}') {
        if (currentAttempt.length > 0) setCurrentAttempt(currentAttempt.slice(0, -1))
        return
      }
      if (key === '{enter}') {
        commitAttempt()
        return
      }
      const letter = String(key)
      if (/^[A-Za-zÀ-ÖØ-öø-ÿÇç]$/.test(letter) && currentAttempt.length < wordLen) {
        setCurrentAttempt(prev => (prev + letter).toLowerCase())
      }
    },
    [commitAttempt, currentAttempt, disabled, wordLen]
  )

  // palavra correta para mostrar no RESULTS
  const [revealedWord, setRevealedWord] = useState<string | null>(null)
  useEffect(() => {
    const run = async () => {
      if (!session || !isTermoResults(session.phase)) return
      const key = termoIndexKey(
        session.id,
        (session.phase as Phase).toString().replace('_RESULTS', '_ANSWERING') as Phase
      )
      const idxRaw =
        typeof window !== 'undefined' ? localStorage.getItem(key) : null
      const idx = idxRaw != null && !Number.isNaN(Number(idxRaw)) ? Number(idxRaw) : null
      if (idx == null) return
      const data = await http.post<{ index: number; word: string }>(
        '/baby-word/',
        {
          index: idx,
          sessionId: session.id,
          userId: userId
        }
      )
      setRevealedWord(data.word)
    }
    run().catch(() => setRevealedWord(null))
  }, [session, userId])


  if (loading) {
    return (
      <AppShellKids>
        <div className="w-full grid place-items-center">
          <div className="animate-pulse text-slate-600">Carregando…</div>
        </div>
      </AppShellKids>
    )
  }
  if (err) {
    return (
      <AppShellKids>
        <div className="w-full grid place-items-center">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
            {err}
          </div>
        </div>
      </AppShellKids>
    )
  }
  if (!session) return null

  // helpers visuais
  const tileClass = (kind: 'typing' | 'correct' | 'present' | 'absent') =>
    `w-12 h-12 sm:w-14 sm:h-14 grid place-items-center rounded-xl uppercase font-extrabold ${TILE[kind]}`

  const keyClass = (kind: 'base' | 'correct' | 'present' | 'absent' | 'action') =>
    `px-3 py-3 rounded-xl text-sm font-bold border shadow-sm ${KBD[kind]} ` +
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white'


  return (
    <AppShellKids>
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoKid />
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Termo</h1>
        </div>
        <StatusBadge phase={session.phase} />
      </header>

      {/* PREPARING */}
      {isTermoPreparing(session.phase) && <TermoExplanation />}

      {/* ANSWERING */}
      {isTermoAnswering(session.phase) && (
        <>
          {/* Timer */}
          <div className="mt-4 flex flex-col items-center">
            {timeLeft > 0 ? (
              <>
                <p className="text-5xl md:text-6xl font-extrabold text-rose-500 leading-none">
                  {timeLeft}s
                </p>
                <div className="mt-2 h-2 w-full max-w-xl rounded bg-slate-200 overflow-hidden">
                  <div
                    className="h-2 bg-rose-400 transition-[width] duration-1000"
                    style={{
                      width: `${((timeLeft ?? 0) / TERM_TIMER_SECONDS) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1">Tempo restante</p>
              </>
            ) : (
              <p className="text-lg md:text-xl font-extrabold text-amber-600">⏰ Tempo esgotado!</p>
            )}
          </div>

          {/* Grid de tentativas */}
          <div className="mt-6 grid gap-2">
            {Array.from({ length: MAX_ATTEMPTS }).map((_, row) => {
              const isRevealed = row < attempts.length
              const isCurrent = row === attempts.length && !disabled
              const attempt = isRevealed ? attempts[row] : isCurrent ? currentAttempt : ''
              const rowColors = isRevealed
                ? colorsByRow[row]
                : isCurrent
                ? Array.from({ length: attempt.length }, () => 'typing')
                : []

              return (
                <div
                  key={row}
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${wordLen}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: wordLen }).map((_, i) => {
                    const letter = attempt[i] || ''
                    const c = letter
                      ? (rowColors[i] as 'green' | 'yellow' | 'gray' | 'typing') ?? 'typing'
                      : null

                    let kind: 'typing' | 'correct' | 'present' | 'absent' = 'typing'
                    if (c === 'green') kind = 'correct'
                    else if (c === 'yellow') kind = 'present'
                    else if (c === 'gray') kind = 'absent'
                    else if (!c) kind = 'absent'

                    return (
                      <div key={i} className={letter ? tileClass(kind) : tileClass('absent')}>
                        <span>{letter}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Ações */}
          <div className="mt-4 flex items-center gap-3">
            <SparkleButton
              onClick={() => setCurrentAttempt('')}
              disabled={disabled || currentAttempt.length === 0}
            >
              Limpar
            </SparkleButton>
            <SparkleButton
              onClick={commitAttempt}
              disabled={disabled || currentAttempt.length !== wordLen}
            >
              Enviar
            </SparkleButton>
          </div>

          {/* Teclado */}
          <div className="mt-4 select-none">
            {KB_ROWS.map((row, idx) => (
              <div key={idx} className="flex justify-center gap-2 mb-2">
                {row.map((key) => {
                  const isAction = key === '{back}' || key === '{enter}'
                  const label = key === '{back}' ? '⌫' : key === '{enter}' ? '↵' : key
                  let cls = keyClass('base')

                  if (!isAction && letterStatuses.size) {
                    const status = letterStatuses.get(String(key).toUpperCase())
                    if (status === 'correct') cls = keyClass('correct')
                    else if (status === 'present') cls = keyClass('present')
                    else if (status === 'absent') cls = keyClass('absent')
                  }

                  if (isAction) cls = keyClass('action')

                  return (
                    <button
                      key={String(key)}
                      onClick={() => handleKeyPress(key)}
                      disabled={disabled && !isAction}
                      className={`${cls} ${isAction ? 'min-w-16' : 'min-w-9'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {alertMsg && (
            <p className="mt-2 text-center text-amber-700">{alertMsg}</p>
          )}
        </>
      )}

      {/* RESULTS / FINAL */}
      {(isTermoResults(session.phase) || isFinalPhase(session.phase)) && (
        <>
          {/* Palavra revelada da rodada */}
          <section className="w-full max-w-2xl mt-4 rounded-3xl border border-white/80 bg-white/80 backdrop-blur-md shadow-xl p-5 text-center">
            <p className="text-slate-800">
              {revealedWord ? (
                <>
                  A palavra desta rodada foi{' '}
                  <strong className="tracking-wider">{revealedWord.toUpperCase()}</strong>.
                </>
              ) : (
                'Aguardando palavra…'
              )}
            </p>
          </section>

          {/* Placar */}
          {isFinalPhase(session.phase) ? (
            <>
              <FinalRevelation/>
              <Scoreboard title="Placar final" session={session} highlightUserId={userId} />
            </>
          ) : (
            <Scoreboard title="Placar atual" session={session} highlightUserId={userId} />
          )}

         
        </>
      )}
    </AppShellKids>
  )
}
