'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { stripAccents } from '@/lib/utils'
import { http } from '@/server/httpClient'
import { Phase, Prisma } from '@prisma/client'
import { useParams } from 'next/navigation'
import { isTermoAnswering, isTermoPreparing, isTermoResults } from '@/lib/sessionPhase'

type SessionWithUsers = Prisma.SessionGetPayload<{
  include: { User: true; UserAnswer: true, currentQuestion: true }
}>

type KeyboardKey = string | '{back}' | '{enter}'

const MAX_ATTEMPTS = 5
const TYPING_COLOR = 'bg-blue-500'
const TERM_TIMER_SECONDS = 60

const KB_ROWS: KeyboardKey[][] = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L','Ç'],
  ['{back}','Z','X','C','V','B','N','M','{enter}'],
]

// localStorage key helper (isola por sessão e etapa)
const termoIndexKey = (sessionId: string, phase: Phase | undefined) => `termo:lastIndex:${sessionId}:${phase ?? 'UNK'}`

export default function TermoPage() {
  const [session, setSession] = useState<SessionWithUsers | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [word, setWord] = useState<string>('')         // palavra atual (oculta ao usuário)
  const [wordIndex, setWordIndex] = useState<number | null>(null) // índice atual
  const [currentAttempt, setCurrentAttempt] = useState('')
  const [attempts, setAttempts] = useState<string[]>([])
  const [colorsByRow, setColorsByRow] = useState<string[][]>([])
  const [won, setWon] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TERM_TIMER_SECONDS)
  const [alertMsg, setAlertMsg] = useState<string | null>(null)

  const [userId, setUserId] = useState<string | null>(null)

  const postingRef = useRef(false) // evita post duplo

  const { session_id: sessionId } = useParams<{ session_id: string }>();


  // pega userId do localStorage (foi salvo quando usuário entrou)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserId(localStorage.getItem('user_id'))
    }
  }, [])


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
    fetchSession();
  }, [fetchSession])


  const requestNewWord = useCallback(async (phase: Phase | undefined) => {
    if (!sessionId) return
    try {
      setErr(null)
      const key = termoIndexKey(sessionId, phase)
      const lastIndexRaw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
      const excludeIndex = lastIndexRaw != null && !Number.isNaN(Number(lastIndexRaw)) ? Number(lastIndexRaw) : null

      const url = excludeIndex != null ? `/baby-word?excludeIndex=${excludeIndex}` : `/baby-word`
      const data = await http.get<{ word: string, index: number }>(url);
      console.log('new termo word', data);
      // const data = {word: "", index:0};
      

      setWord(data.word);
      setWordIndex(data.index);
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
  }, [sessionId])


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
    const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.phase, timeLeft, won])

  // cores das letras (tipo Wordle)
  const letterColor = useCallback((letter: string, index: number) => {
    const nlet = stripAccents(letter).toLowerCase()
    const nword = stripAccents(word).toLowerCase()
    if (!nword[index]) return 'bg-gray-500'
    if (nlet === nword[index]) return 'bg-green-500'
    if (nword.includes(nlet)) return 'bg-yellow-500'
    return 'bg-gray-500'
  }, [word])

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
        const rank =
          color.includes('green') ? 3 :
          color.includes('yellow') ? 2 :
          color.includes('gray') ? 1 : 0
        const prev =
          status.get(ch) === 'correct' ? 3 :
          status.get(ch) === 'present' ? 2 :
          status.get(ch) === 'absent' ? 1 : 0
        if (rank > prev) {
          status.set(
            ch,
            rank === 3 ? 'correct' : rank === 2 ? 'present' : 'absent'
          )
        }
      }
    })
    return status
  }, [attempts, colorsByRow])


  const submitIfNeeded = useCallback(async (justWon: boolean) => {
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
          attempts,
      })
    } catch (e) {
      console.error('submit termo failed', e)
    }
  }, [attempts, session, timeLeft, userId, wordIndex])

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
    const normalizedWord  = stripAccents(word).toLowerCase()

    if (normalizedGuess === normalizedWord) {
      setWon(true);
      setAlertMsg('Você acertou! 🎉');
      submitIfNeeded(true);
      return;
    }

    // se acabou tentativas, submete derrota
    if (nextAttempts.length >= MAX_ATTEMPTS) {
      setAlertMsg('Acabaram as tentativas. Aguarde o resultado.');
      submitIfNeeded(false);
    }
  }, [attempts, colorsByRow, currentAttempt, disabled, letterColor, submitIfNeeded, word, wordLen])

  const handleKeyPress = useCallback((key: KeyboardKey) => {
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
  }, [commitAttempt, currentAttempt, disabled, wordLen])

  // palavra correta para mostrar no RESULTS
  const [revealedWord, setRevealedWord] = useState<string | null>(null)
  useEffect(() => {
    const run = async () => {
      if (!session || !isTermoResults(session.phase)) return
      const key = termoIndexKey(session.id, session.phase.replace('_RESULTS','_ANSWERING') as Phase)
      const idxRaw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
      const idx = idxRaw != null && !Number.isNaN(Number(idxRaw)) ? Number(idxRaw) : null
      if (idx == null) return
      const res = await fetch(`/api/baby-word/by-index?index=${idx}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json() as { index: number, word: string }
        setRevealedWord(data.word)
      }
    }
    run().catch(() => setRevealedWord(null))
  }, [session])

  // UI
  if (loading) {
    return <main className="min-h-screen flex items-center justify-center">Carregando...</main>
  }
  if (err) {
    return <main className="min-h-screen flex items-center justify-center text-red-600">{err}</main>
  }
  if (!session) return null

  return (
    <main className="min-h-screen flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold">Termo</h1>

      {isTermoPreparing(session.phase) && (
        <div className="max-w-xl text-center p-4 border rounded bg-neutral-900/60">
          <p className="mb-2 font-semibold">Como funciona:</p>
          <ul className="list-disc text-left pl-6 space-y-1">
            <li>Você terá 60 segundos para adivinhar uma palavra de {wordLen || 5} letras.</li>
            <li>As cores indicam: <span className="text-green-600 font-semibold">verde</span> (letra certa no lugar certo), <span className="text-yellow-600 font-semibold">amarelo</span> (letra existe, lugar errado) e <span className="text-gray-600 font-semibold">cinza</span> (letra não existe).</li>
            <li>Sua pontuação aumenta quanto mais rápido você acertar.</li>
          </ul>
          <p className="mt-3 text-sm text-gray-600">Aguarde o host iniciar.</p>
        </div>
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
                <div key={row} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${wordLen}, minmax(0, 1fr))` }}>
                  {Array.from({ length: wordLen }).map((_, i) => {
                    const letter = attempt[i] || ''
                    const color = letter
                      ? (rowColors[i] || TYPING_COLOR)
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
                      className={`px-3 py-3 rounded font-semibold ${isAction ? 'min-w-16' : 'min-w-9'} ${keyColor} disabled:opacity-50`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {alertMsg && <p className="mt-2 text-center text-amber-700">{alertMsg}</p>}
        </>
      )}

      {isTermoResults(session.phase) && (
        <div className="mt-4 p-4 border rounded bg-slate-50">
          <p className="text-center">
            {revealedWord ? <>A palavra era <strong>{revealedWord.toUpperCase()}</strong>.</> : 'Aguardando palavra...'}
          </p>
        </div>
      )}
    </main>
  )
}
