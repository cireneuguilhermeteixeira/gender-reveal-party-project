'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { stripAccents } from '@/lib/utils'
import { http } from '@/lib/server/httpClient'
import { ws } from '@/lib/server/ws/wsClient';
import { Phase, Prisma } from '@prisma/client'
import { useParams } from 'next/navigation'
import { isTermoAnswering, isTermoPreparing, isTermoResults } from '@/lib/sessionPhase'
import { WebSocketClient } from '@/lib/server/ws/wsClient';
import TermoExplanation from '@/components/TermoExplanation';
import Scoreboard from '@/components/ScoreBoard';

// --- Types -----------------------------------------------------------------

type SessionWithUsers = Prisma.SessionGetPayload<{
  include: { User: true; UserAnswer: true; currentQuestion: true }
}>

type KeyboardKey = string | '{back}' | '{enter}'


// --- Constants --------------------------------------------------------------

const MAX_ATTEMPTS = 5
const TYPING_COLOR = 'bg-blue-500'
const TERM_TIMER_SECONDS = 60

const KB_ROWS: KeyboardKey[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç'],
  ['{back}', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '{enter}']
]

// localStorage key helper (isola por sessão e etapa)
const termoIndexKey = (sessionId: string, phase: Phase | undefined) =>
  `termo:lastIndex:${sessionId}:${phase ?? 'UNK'}`

// Detecta fase FINAL de maneira resiliente (sem depender do helper externo)
const isFinalPhase = (phase?: Phase) =>
  phase != null && String(phase).toUpperCase().endsWith('FINAL')



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
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const postingRef = useRef(false) // evita post duplo
  const sockRef = useRef<ReturnType<WebSocketClient['connect']> | null>(null);

  const userId = useMemo(
    () => (typeof window !== 'undefined' ? localStorage.getItem('user_id') ?? '' : ''),
    []
  );

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

  useEffect(() => {
    const user = session?.User.find(u => u.id === userId);
    const sock = ws
      .connect({ path: '/ws', sessionId, userId, name: user?.name || userId, role: 'player', autoReconnect: true })
      .on('open', () => console.log('[ws] open'))
      .on('error', (e) => console.warn('[ws] error', e))
      .on('welcome', ({ room }) => console.log('[ws] welcome snapshot', room))
      .on('user_joined', ({ user }) => {
        fetchSession();
        console.log('[ws] joined', user);
      })
      .on('user_left', ({ userId }) => {
        fetchSession();
        console.log('[ws] left', userId);
      })
      .on('phase_changed', ({ phase }) => {
        fetchSession();
        console.log('[ws] phase ->', phase);
      })
      .open();

    sockRef.current = sock;

    return () => sockRef.current?.close();
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
        // console.log('new termo word', data)

        setWord(data.word)
        setWordIndex(data.index)
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, String(data.index))
        }
        // reset do estado de rodada
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


  useEffect(() => {
    if (!session || !isTermoAnswering(session.phase)) return
    if (won) return
    if (timeLeft <= 0) {
      setAlertMsg('Tempo esgotado! Aguarde o resultado.')
      submitIfNeeded(false) // força submissão por tempo
      return
    }
    const t = setTimeout(() => setTimeLeft((tl) => tl - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.phase, timeLeft, won])

  // cores das letras (tipo Wordle)
  const letterColor = useCallback(
    (letter: string, index: number) => {
      const nlet = stripAccents(letter).toLowerCase()
      const nword = stripAccents(word).toLowerCase()
      if (!nword[index]) return 'bg-gray-500'
      if (nlet === nword[index]) return 'bg-green-500'
      if (nword.includes(nlet)) return 'bg-yellow-500'
      return 'bg-gray-500'
    },
    [word]
  )

  const disabled = useMemo(() => {
    if (!session) return true
    return (
      !isTermoAnswering(session.phase) || won || attempts.length >= MAX_ATTEMPTS || timeLeft <= 0
    )
  }, [session, won, attempts.length, timeLeft])

  const wordLen = useMemo(() => word.length || 5, [word])

  // status do teclado
  const letterStatuses = useMemo(() => {
    const status = new Map<string, 'correct' | 'present' | 'absent'>()
    attempts.forEach((att, rowIdx) => {
      for (let i = 0; i < att.length; i++) {
        const ch = stripAccents(att[i]).toUpperCase()
        const color = colorsByRow[rowIdx]?.[i] ?? ''
        const rank = color.includes('green') ? 3 : color.includes('yellow') ? 2 : color.includes('gray') ? 1 : 0
        const prev = status.get(ch) === 'correct' ? 3 : status.get(ch) === 'present' ? 2 : status.get(ch) === 'absent' ? 1 : 0
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
    const colors = Array.from({ length: wordLen }, (_, i) =>
      letterColor(guess[i] ?? '', i)
    )

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

    // se acabou tentativas, submete derrota
    if (nextAttempts.length >= MAX_ATTEMPTS) {
      setAlertMsg('Acabaram as tentativas. Aguarde o resultado.')
      submitIfNeeded(false)
    }
  }, [attempts, colorsByRow, currentAttempt, disabled, letterColor, submitIfNeeded, word, wordLen])

  const handleKeyPress = useCallback(
    (key: KeyboardKey) => {
      if (disabled && key !== '{back}' && key !== '{enter}') return
      if (key === '{back}') {
        if (currentAttempt.length > 0)
          setCurrentAttempt(currentAttempt.slice(0, -1))
        return
      }
      if (key === '{enter}') {
        commitAttempt()
        return
      }
      const letter = String(key)
      if (/^[A-Za-zÀ-ÖØ-öø-ÿÇç]$/.test(letter) && currentAttempt.length < wordLen) {
        setCurrentAttempt((prev) => (prev + letter).toLowerCase())
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

  // --- UI -------------------------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="animate-pulse text-white/70">Carregando…</div>
      </main>
    )
  }
  if (err) {
    return (
      <main className="min-h-screen grid place-items-center text-red-400">
        {err}
      </main>
    )
  }
  if (!session) return null

  return (
    <main className="min-h-screen flex flex-col items-center gap-4 p-4">
      <header className="w-full max-w-2xl flex items-center justify-between">
        <h1 className="text-2xl font-bold">Termo</h1>
        <div className="text-sm text-white/70">
          Fase: <span className="font-mono">{String(session.phase)}</span>
        </div>
      </header>

      {isTermoPreparing(session.phase) && (
        <TermoExplanation/>
      )}

      {isTermoAnswering(session.phase) && (
        <>
          <div className="text-lg font-semibold">Tempo: {timeLeft}s</div>

          <div className="grid gap-2">
            {Array.from({ length: MAX_ATTEMPTS }).map((_, row) => {
              const isRevealed = row < attempts.length
              const isCurrent = row === attempts.length && !disabled
              const attempt = isRevealed ? attempts[row] : isCurrent ? currentAttempt : ''
              const rowColors = isRevealed
                ? colorsByRow[row]
                : isCurrent
                ? Array.from({ length: attempt.length }, () => TYPING_COLOR)
                : []

              return (
                <div
                  key={row}
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${wordLen}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: wordLen }).map((_, i) => {
                    const letter = attempt[i] || ''
                    const color = letter
                      ? rowColors[i] || TYPING_COLOR
                      : 'bg-gray-200 dark:bg-gray-800'
                    return (
                      <div
                        key={i}
                        className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border text-white font-bold uppercase ${color} rounded`}
                      >
                        {letter}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => setCurrentAttempt('')}
              disabled={disabled || currentAttempt.length === 0}
              className="bg-slate-500 text-white px-3 py-2 rounded disabled:opacity-50"
            >
              Limpar
            </button>
            <button
              onClick={commitAttempt}
              disabled={disabled || currentAttempt.length !== wordLen}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Enviar
            </button>
          </div>

          <div className="mt-2 select-none">
            {KB_ROWS.map((row, idx) => (
              <div key={idx} className="flex justify-center gap-1 mb-2">
                {row.map((key) => {
                  const isAction = key === '{back}' || key === '{enter}'
                  const label = key === '{back}' ? '⌫' : key === '{enter}' ? '↵' : key

                  let keyColor = 'bg-slate-300 dark:bg-slate-700 text-black dark:text-white'
                  if (!isAction && letterStatuses.size) {
                    const status = letterStatuses.get(String(key).toUpperCase())
                    if (status === 'correct') keyColor = 'bg-green-500 text-white'
                    else if (status === 'present') keyColor = 'bg-yellow-500 text-black'
                    else if (status === 'absent') keyColor = 'bg-gray-500 text-white'
                  }

                  return (
                    <button
                      key={String(key)}
                      onClick={() => handleKeyPress(key)}
                      disabled={disabled && key !== '{back}' && key !== '{enter}'}
                      className={`px-3 py-3 rounded font-semibold ${
                        isAction ? 'min-w-16' : 'min-w-9'
                      } ${keyColor} disabled:opacity-50`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {alertMsg && (
            <p className="mt-2 text-center text-amber-400">{alertMsg}</p>
          )}
        </>
      )}

      {(isTermoResults(session.phase) || isFinalPhase(session.phase)) && (
        <>
          <div className="w-full max-w-2xl p-4 border rounded-2xl bg-neutral-900/60">
            <p className="text-center">
              {revealedWord ? (
                <>
                  A palavra desta rodada foi{' '}
                  <strong className="tracking-wider">{revealedWord.toUpperCase()}</strong>.
                </>
              ) : (
                'Aguardando palavra…'
              )}
            </p>
            
          </div>

          {isFinalPhase(session.phase) ? (
            <Scoreboard
              title="Placar final"
              session={session}
              highlightUserId={userId}
            />
          ) : (
            <Scoreboard
              title="Placar atual"
              session={session}
              highlightUserId={userId}
            />
          )}
        </>
      )}
    </main>
  )
}
