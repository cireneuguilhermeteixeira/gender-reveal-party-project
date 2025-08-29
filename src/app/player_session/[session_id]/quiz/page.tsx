'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { http } from '@/lib/server/httpClient';
import { ws, WebSocketClient } from '@/lib/server/ws/wsClient';
import {
  isQuizAnswering,
  isQuizPreparing,
  isQuizResults,
  parseOptions,
  QuestionOptions,
  SessionWithUsers,
} from '@/lib/sessionPhase';
import StatusBadge from '@/components/StatusBadge';

// Tema kids
import AppShellKids from '@/components/AppShellKids';
import LogoKid from '@/components/LogoKid';
import Loading from '@/components/Loading';
import QuestionComponent from '@/components/QuestionsComponent';

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
  const sockRef = useRef<ReturnType<WebSocketClient['connect']> | null>(null);
  const router = useRouter();
  const userId = useMemo(
    () => (typeof window !== 'undefined' ? localStorage.getItem('user_id') ?? '' : ''),
    []
  );

  const applySession = useCallback(
    (s: SessionWithUsers) => {
      if (s.phase.includes('TERMO')) {
        router.push(`/player_session/${sessionId}/termo`);
        return;
      }

      setSession(s);
      setOptions(parseOptions(s.currentQuestion?.options));
      setSelectedIndex(
        s.UserAnswer.find(
          (ua) => ua.userId === userId && ua.questionId === s.currentQuestion?.id
        )?.selectedIndex ?? null
      );
    },
    [router, sessionId, userId]
  );

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      setErr(null);
      const s = await http.get<SessionWithUsers>(`/session/${sessionId}`);
      applySession(s);

      const user = s?.User.find((u) => u.id === userId);
      if (!user) {
        setErr('Você não está mais na sala. Tente entrar novamente.');
        setSession(null);
        router.push(`/player_session/${sessionId}`);
        return;
      }

      if (sockRef.current) return;

      const sock = ws
        .connect({
          path: '/ws',
          sessionId,
          userId,
          name: user?.name || userId,
          role: 'player',
          autoReconnect: true,
        })
        .on('open', () => console.log('[ws] open'))
        .on('error', (e) => console.warn('[ws] error', e))
        .on('welcome', ({ room }) => console.log('[ws] welcome snapshot', room))
        .on('user_joined', ({ user }) => console.log('[ws] joined', user))
        .on('user_left', ({ userId }) => console.log('[ws] left', userId))
        .on('phase_changed', ({ phase }) => {
          fetchSession();
          console.log('[ws] phase ->', phase);
        })
        .open();

      sockRef.current = sock;
    } catch {
      setErr('Não foi possível atualizar a sessão agora.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, applySession, userId, router]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    return () => sockRef.current?.close();
  }, []);



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
  }, [session?.phase, session?.currentQuestion?.id, session]);

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
    [sessionId, session?.currentQuestion?.id, userId]
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
    if (isQuizAnswering(session.phase) && timerReady.current && timeLeft === 0 && !submitted) {
      const elapsed = session.currentQuestion?.timeLimit ?? 0;
      setSubmitted(true);
      void sendAnswer(null, Math.max(0, elapsed));
    }
  }, [timeLeft, submitted, session, sendAnswer]);


  const showResultColors = isQuizResults(session?.phase);
  const correctIdx = session?.currentQuestion?.correctIndex ?? -1;

  return (
    <AppShellKids>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoKid />
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Quiz</h1>
            <p className="text-slate-600 text-sm md:text-base">Operação Berço — O Caso do Pequeno Segredo</p>
          </div>
        </div>
        {session?.phase && <StatusBadge phase={session.phase} />}
      </header>

      {err && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {err}
        </div>
      )}

      <section className="mt-6 rounded-3xl border border-white/80 bg-white/80 backdrop-blur-md shadow-xl p-6 md:p-8">
        {loading || !session ? (
         <Loading />
        ) : (
          <>
            {/* pergunta */}
            <h2 className="text-2xl font-bold mb-3 text-center text-slate-800">
              {session.currentQuestion?.text ?? '—'}
            </h2>

            {/* timer grande (pastel) */}
            <div className="mb-5 flex flex-col items-center">
              {isQuizAnswering(session.phase) ? (
                timeLeft !== null && timeLeft > 0 ? (
                  <>
                    <p className="text-5xl md:text-6xl font-extrabold text-rose-500 leading-none animate-pulse">
                      {timeLeft}s
                    </p>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-300 via-amber-300 to-sky-300 transition-[width] duration-1000"
                        style={{
                          width: `${((timeLeft ?? 0) / (session.currentQuestion?.timeLimit ?? 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Tempo restante</p>
                  </>
                ) : (
                  <p className="text-xl md:text-2xl font-bold text-amber-600">⏰ Tempo esgotado!</p>
                )
              ) : isQuizPreparing(session.phase) ? (
                <p className="text-slate-600">Prepare-se… a contagem vai começar!</p>
              ) : isQuizResults(session.phase) ? (
                <>
                  {selectedIndex !== null ? (
                    <p className="font-semibold text-slate-700">
                      Você escolheu: <span className="text-slate-900">{options[selectedIndex]}</span>.
                    </p>
                  ) : (
                    <p className="text-amber-600 font-semibold">Você não respondeu a tempo.</p>
                  )}
                  {correctIdx >= 0 && correctIdx < options.length && (
                    <p
                      className={`font-semibold ${
                        selectedIndex === correctIdx ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      Resposta correta: {options[correctIdx]}.
                    </p>
                  )}
                </>
              ) : null}
            </div>

            {/* opções (4 cores suaves) */}
            {!isQuizPreparing(session.phase) && (
              <QuestionComponent
                options={options}
                selectedIndex={selectedIndex}
                handleAnswer={handleAnswer}
                submitted={submitted}
                correctIdx={correctIdx}
                showResultColors={showResultColors}
                session={session}
                timeLeft={timeLeft}
              />
            )}

            {/* rodapé */}
            <div className="mt-5 text-center text-sm text-slate-600">
              {isQuizAnswering(session.phase) && submitted && (
                <span>Sua resposta foi registrada. Aguarde…</span>
              )}
              {isQuizPreparing(session.phase) && <span>Aguardando início…</span>}
              {isQuizResults(session.phase) && <span>O host controla a próxima pergunta.</span>}
            </div>
          </>
        )}
      </section>
    </AppShellKids>
  );
}
