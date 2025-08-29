'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { User } from '@prisma/client';
import { useParams, useRouter } from 'next/navigation';
import { http } from '@/lib/server/httpClient';
import { ws, WebSocketClient } from '@/lib/server/ws/wsClient';
import {
  getNextPhase,
  isQuizPreparing,
  isQuizAnswering,
  isQuizResults,
  isTermoPreparing,
  isTermoAnswering,
  isTermoResults,
  parseOptions,
  isFinalPhase,
  SessionWithUsers,
  QuestionOptions
} from '@/lib/sessionPhase';

import AppShellKids from '@/components/AppShellKids';
import LogoKid from '@/components/LogoKid';
import SparkleButton from '@/components/SparkleButton';

import TermoExplanation from '@/components/TermoExplanation';
import Scoreboard from '@/components/ScoreBoard';
import WaitingForPlayers from '@/components/WaitingForPlayers';
import StatusBadge from '@/components/StatusBadge';
import Loading from '@/components/Loading';
import FinalRevelation from '@/components/FinalRevelation';

export default function HostHome() {
  const { session_id: sessionId } = useParams<{ session_id: string }>()

  const [session, setSession] = useState<SessionWithUsers | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [options, setOptions] = useState<QuestionOptions>([])
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const sockRef = useRef<ReturnType<WebSocketClient['connect']> | null>(null)
  const advancingRef = useRef(false) // evita requisições duplicadas
  const router = useRouter();

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const sessionLink = useMemo(() => (!sessionId ? '' : `${origin}/player_session/${sessionId}`), [sessionId, origin])

  const copyToClipboard = async () => {
    if (!sessionLink) return
    try {
      await navigator.clipboard.writeText(sessionLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setErr('Falha ao copiar o link da sessão.')
    }
  }

  const applySession = useCallback((s: SessionWithUsers) => {
    setSession(s)
    setUsers(s.User ?? [])
    setOptions(parseOptions(s.currentQuestion?.options))
  }, [])

  const fetchSession = useCallback(async () => {
    if (!sessionId) return
    try {
      setLoading(true)
      setErr(null)
      const s = await http.get<SessionWithUsers>(`/session/${sessionId}`)
      applySession(s)
    } catch {
      setErr('Não foi possível carregar a sessão.');
      localStorage.clear();
      router.push('/');
    } finally {
      setLoading(false)
    }
  }, [sessionId, applySession, router])



  const goToNextPhase = useCallback(async () => {
    if (!sessionId || !session) return
    if (advancingRef.current) return
    advancingRef.current = true

    try {
      const nextPhase = getNextPhase(session)
      const payload = {
        phase: nextPhase.phase,
        currentQuestionIndex: nextPhase?.currentQuestionIndex,
        questions: nextPhase?.questions,
      }

      const updated = await http.put<SessionWithUsers>(`/session/${sessionId}`, payload)
      applySession(updated)
      sockRef.current?.sendPhaseChange(updated.phase)

      if (isQuizResults(updated.phase) || isTermoResults(updated.phase) || isFinalPhase(updated.phase)) {
        fetchSession()
      }
    } catch {
      setErr('Falha ao avançar de fase. Tente novamente.')
    } finally {
      advancingRef.current = false
    }
  }, [sessionId, session, applySession, fetchSession])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])




  useEffect(() => {
    if (sockRef.current) return;

    const sock = ws
      .connect({ path: '/ws', sessionId, userId: '0', name: 'HOST', role: 'host', autoReconnect: true })
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
      .on('phase_changed', ({ phase }) => console.log('[ws] phase ->', phase))
      .open();

    sockRef.current = sock;
    return () => sockRef.current?.close();
  }, [fetchSession, sessionId])

  // Timer do QUIZ (somente na fase ANSWERING)
  useEffect(() => {
    if (!session) return

    if (isQuizAnswering(session.phase)) {
      const initial = session.currentQuestion?.timeLimit ?? 0
      setTimeLeft(initial)

      let tick = initial
      const interval = setInterval(() => {
        tick -= 1
        setTimeLeft(tick)
        if (tick <= 0) {
          clearInterval(interval);
          goToNextPhase();
        }
      }, 1000)

      return () => clearInterval(interval)
    } else {
      setTimeLeft(null)
    }
  }, [session?.phase, session?.currentQuestion?.id, session, goToNextPhase])

  const quizStatus = () => {
    if (!session) return null

    if (isQuizPreparing(session.phase)) return null

    if (isQuizAnswering(session.phase)) {
      if (timeLeft !== null && timeLeft > 0) {
        return (
          <div className="mt-3 text-center">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-rose-100 text-rose-700 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <p className="text-base font-extrabold">{timeLeft}s</p>
            </div>
            <p className="text-xs text-slate-500 mt-1">Tempo restante</p>
          </div>
        )
      }
      return (
        <div className="mt-3 text-center">
          <p className="inline-flex items-center rounded-2xl bg-amber-100 text-amber-700 px-3 py-2 text-sm font-bold">
            ⏰ Tempo esgotado!
          </p>
        </div>
      )
    }

    if (isQuizResults(session.phase)) {
      const idx = session.currentQuestion?.correctIndex ?? -1
      const ans = idx >= 0 ? options[idx] : undefined
      return (
        <p className="mt-3 text-center">
          <span className="inline-flex items-center rounded-2xl bg-emerald-100 text-emerald-700 px-3 py-2 text-sm font-semibold">
            ✅ Resposta: {ans || '—'}
          </span>
        </p>
      )
    }

    return null
  }

  // Mensagem para TERMO (cada player tem palavra diferente)
  const termoAnsweringNotice = (
    <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
      Rodada do <strong>TERMO</strong> em andamento. Cada participante recebeu uma palavra diferente —
      acompanhe o tempo e o placar; acertos rápidos rendem mais pontos.
    </div>
  )

  return (
    <AppShellKids>
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoKid />
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Painel do Host</h1>
            <p className="text-slate-600 text-sm md:text-base">Operação Berço — O Caso do Pequeno Segredo</p>
          </div>
        </div>
      </header>

      {/* Alert de erro (tema claro) */}
      {err && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {err}
        </div>
      )}

      {/* Card principal */}
      <section className="mt-6 rounded-3xl border border-white/80 bg-white/80 backdrop-blur-md shadow-xl">
        {loading ? (
         <Loading/>
        ) : !session ? (
          <div className="p-8">Sessão não encontrada.</div>
        ) : (
          <div className="p-6 md:p-8">
            {session.phase === 'WAITING_FOR_PLAYERS' ? (
              <WaitingForPlayers
                advancingRef={advancingRef}
                copyToClipboard={copyToClipboard}
                copied={copied}
                goToNextPhase={goToNextPhase}
                sessionLink={sessionLink}
                users={users}
              />
            ) : (
              <>
                {/* status badge (seu componente atual) */}
                <div className="mb-3">
                  <StatusBadge phase={session.phase} />
                </div>

                {/* Conteúdo de QUIZ */}
                {session.phase.includes('QUIZ') ? (
                  <>
                    <h2 className="text-2xl font-bold mb-3">{session.currentQuestion?.text || '—'}</h2>

                    {!isQuizPreparing(session.phase) && (
                      <div className="space-y-3">
                        {options.map((opt, i) => (
                          <div
                            key={`${i}-${opt}`}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                          >
                            <p className="font-medium">
                              {i + 1}) <span className="font-semibold">{opt}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {quizStatus()}

                    {(isQuizResults(session.phase) || isFinalPhase(session.phase)) && (
                      <>
                        {isFinalPhase(session.phase) ? (
                          <div className="mt-6">
                            <Scoreboard title="Placar final" session={session} />
                          </div>
                        ) : (
                          <div className="mt-6">
                            <Scoreboard title="Parcial geral" session={session} />
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  /* Conteúdo de TERMO */
                  <>
                    {isTermoPreparing(session.phase) && <TermoExplanation />}

                    {isTermoAnswering(session.phase) && termoAnsweringNotice}

                    {(isTermoResults(session.phase) || isFinalPhase(session.phase)) && (
                      <>
                        {isFinalPhase(session.phase) ? (
                          <div className="mt-12">
                            <FinalRevelation isHost={true}/>
                            <Scoreboard title="Placar final" session={session} />
                          </div>
                        ) : (
                          <div className="mt-12">
                            <Scoreboard title="Parcial geral" session={session} />
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* Rodapé de ação */}
                <div className="mt-6 flex items-center justify-between gap-3">
                  <div className="text-sm text-slate-600">
                    {isTermoAnswering(session.phase) && 'Rodada em andamento…'}
                    {isTermoResults(session.phase) && 'Resultado da rodada exibido.'}
                    {isFinalPhase(session.phase) && 'Jogo encerrado.'}
                  </div>
                 {!isFinalPhase(session.phase) && <SparkleButton onClick={goToNextPhase} disabled={advancingRef.current}>
                    {advancingRef.current ? 'Avançando…' : 'Avançar'}
                  </SparkleButton>}
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </AppShellKids>
  )
}
