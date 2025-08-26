'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { http } from '@/server/httpClient';
import { isQuizAnswering, isQuizPreparing, isQuizResults } from '@/lib/sessionPhase';

type SessionWithUsers = Prisma.SessionGetPayload<{
  include: { User: true; UserAnswer: true; currentQuestion: true }
}>;

type QuestionOptions = string[];

function parseOptions(options: Prisma.JsonValue | null | undefined): QuestionOptions {
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed.filter((o: unknown): o is string => typeof o === 'string') : [];
    } catch { return []; }
  }
  if (Array.isArray(options)) return options.filter((o: unknown): o is string => typeof o === 'string');
  return [];
}

export default function PlayerQuiz() {
  const { session_id: sessionId } = useParams<{ session_id: string }>();

  const [session, setSession] = useState<SessionWithUsers | null>(null);
  const [options, setOptions] = useState<QuestionOptions>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerReady = useRef(false);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const sendingRef = useRef(false);
  const router = useRouter();
  
  const userId = useMemo(
    () => (typeof window !== 'undefined' ? localStorage.getItem('user_id') ?? '' : ''),
    []
  );

  const applySession = useCallback((s: SessionWithUsers) => {
    if (s.phase.includes('TERMO')) {
      router.push(`/player_session/${sessionId}/termo`);
      return;
    }

    setSession(s);
    setOptions(parseOptions(s.currentQuestion?.options));
    setSelectedIndex(
      s.UserAnswer.find(ua => 
        ua.userId === userId && 
        ua.questionId === s.currentQuestion?.id
      )?.selectedIndex ?? null
    );
  }, [router, sessionId, userId]);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      setErr(null);
      const s = await http.get<SessionWithUsers>(`/session/${sessionId}`);
      applySession(s);
    } catch {
      setErr('Não foi possível atualizar a sessão agora.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, applySession]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!session) return;

    timerReady.current = false;

    if (isQuizAnswering(session.phase)) {

      setSubmitted(false);
      setSelectedIndex(null);

      const initial = session.currentQuestion?.timeLimit ?? 0;
      setTimeLeft(initial);
      let tick = initial;
      const id = setInterval(() => {
        tick -= 1;
        setTimeLeft(tick);
        if (!timerReady.current) timerReady.current = true;
        if (tick <= 0) clearInterval(id);
      }, 1000);
      return () => clearInterval(id);
    }
    setTimeLeft(null);
  }, [session?.phase, session?.currentQuestion.id, session]);

  const sendAnswer = useCallback(
    async (optionIndex: number | null, timeTaken: number) => {
      if (!sessionId || !session?.currentQuestion?.id || !userId || sendingRef.current) return;
      sendingRef.current = true;
      try {
        await http.post('/user-answers', {
          answerType: 'quiz',
          userId,
          sessionId,
          questionId: session.currentQuestion.id,
          selectedIndex: optionIndex,
          timeTaken,
        });
      } catch {
        setErr('Não foi possível enviar sua resposta.');
      } finally {
        sendingRef.current = false;
      }
    },
    [sessionId, session?.currentQuestion.id, userId]
  );

  const handleAnswer = useCallback(
    async (idx: number) => {
      if (!session || !isQuizAnswering(session.phase) || submitted) return;
      setSelectedIndex(idx);
      setSubmitted(true);
      const elapsed = (session.currentQuestion?.timeLimit ?? 0) - (timeLeft ?? 0);
      await sendAnswer(idx, Math.max(0, elapsed));
    },
    [session, submitted, timeLeft, sendAnswer]
  );


  useEffect(() => {
    if (!session) return;
    if (
      isQuizAnswering(session.phase) &&
      timerReady.current &&
      timeLeft === 0 &&
      !submitted
    ) {
      const elapsed = session.currentQuestion?.timeLimit ?? 0;
      setSubmitted(true);
      void sendAnswer(null, Math.max(0, elapsed));
    }
  }, [timeLeft, submitted, session, sendAnswer]);


  const baseBg = ['bg-red-600','bg-blue-600','bg-yellow-500','bg-green-600'] as const;
  const baseHover = ['hover:bg-red-500','hover:bg-blue-500','hover:bg-yellow-400','hover:bg-green-500'] as const;
  const baseDisabled = ['bg-red-700','bg-blue-700','bg-yellow-600','bg-green-700'] as const;
  const baseSelected = ['ring-2 ring-red-400','ring-2 ring-blue-400','ring-2 ring-yellow-300','ring-2 ring-green-400'] as const;

  const showResultColors = isQuizResults(session?.phase);
  const correctIdx = session?.currentQuestion?.correctIndex ?? -1;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Quiz — Jogador</h1>
          {session?.phase && (
            <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
              Fase: {session.phase.replaceAll('_', ' ')}
            </span>
          )}
        </header>

        {err && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
            {err}
          </div>
        )}

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-xl p-6 md:p-8">
          {loading || !session ? (
            <div className="animate-pulse">
              <div className="h-6 w-2/3 bg-neutral-800 rounded mb-4" />
              <div className="h-24 bg-neutral-800 rounded mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="h-12 bg-neutral-800 rounded" />
                <div className="h-12 bg-neutral-800 rounded" />
                <div className="h-12 bg-neutral-800 rounded" />
                <div className="h-12 bg-neutral-800 rounded" />
              </div>
            </div>
          ) : (
            <>
              {/* pergunta */}
              <h2 className="text-2xl font-bold mb-3 text-center">
                {session.currentQuestion?.text ?? '—'}
              </h2>

              {/* timer grande */}
              <div className="mb-5 flex flex-col items-center">
                {isQuizAnswering(session.phase) ? (
                  timeLeft !== null && timeLeft > 0 ? (
                    <>
                      <p className="text-5xl md:text-6xl font-extrabold text-red-500 animate-pulse leading-none">
                        {timeLeft}s
                      </p>
                      <div className="mt-2 h-2 w-full rounded bg-neutral-800 overflow-hidden">
                        <div
                          className="h-2 bg-red-500 transition-[width] duration-1000"
                          style={{
                            width: `${
                              ((timeLeft ?? 0) / (session.currentQuestion?.timeLimit ?? 1)) * 100
                            }%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">Tempo restante</p>
                    </>
                  ) : (
                    <p className="text-xl md:text-2xl font-bold text-amber-400">⏰ Tempo esgotado!</p>
                  )
                ) : isQuizPreparing(session.phase) ? (
                  <p className="text-neutral-300">Prepare-se… a pergunta vai começar!</p>
                ) : isQuizResults(session.phase) ? (
                  <>
                    {selectedIndex !== null ? (
                      <p className="font-semibold">
                        Você escolheu: {options[selectedIndex]}.
                      </p>
                    ) : (
                      <p className="text-yellow-400 font-semibold">Você não respondeu a tempo.</p>
                    )}
                    {correctIdx >= 0 && correctIdx < options.length && (
                      <p className={`font-semibold ${selectedIndex === correctIdx ? 'text-green-400' : 'text-red-400'}`}>
                        Resposta correta: {options[correctIdx]}.
                      </p>
                    )}
                  </>
                ) : null}
              </div>

              {/* opções com cores fixas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map((opt, i) => {
                  const isSelected = selectedIndex === i;
                  const disabled =
                    submitted ||
                    !isQuizAnswering(session.phase) ||
                    (timeLeft ?? 0) <= 0;

                  // estilos
                  const bg = disabled ? baseDisabled[i % 4] : baseBg[i % 4];
                  const hover = disabled ? '' : baseHover[i % 4];
                  const ring = isSelected ? baseSelected[i % 4] : '';

                  // em RESULTS: mantenha a cor fixa, mas destaque correta/errada com bordas
                  let resultRing = '';
                  if (showResultColors) {
                    if (i === correctIdx) resultRing = 'ring-2 ring-emerald-400';
                    else if (isSelected && i !== correctIdx) resultRing = 'ring-2 ring-red-400';
                  }

                  return (
                    <button
                      key={`${i}-${opt}`}
                      onClick={() => handleAnswer(i)}
                      disabled={disabled}
                      className={`px-4 py-3 rounded-xl text-white font-semibold text-left transition ${bg} ${hover} ${ring} ${resultRing}`}
                    >
                      <span className="mr-2 opacity-90">{i + 1})</span>{opt}
                    </button>
                  );
                })}
              </div>

              {/* rodapé */}
              <div className="mt-5 text-center text-sm text-neutral-400">
                {isQuizAnswering(session.phase) && submitted && (
                  <span>Sua resposta foi registrada. Aguarde…</span>
                )}
                {isQuizPreparing(session.phase) && <span>Aguardando início…</span>}
                {isQuizResults(session.phase) && <span>O host controla a próxima pergunta.</span>}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
