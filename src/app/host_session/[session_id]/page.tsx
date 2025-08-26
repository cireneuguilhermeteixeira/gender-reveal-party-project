'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { User, Prisma } from '@prisma/client';
import { useParams } from 'next/navigation';
import { http } from '@/server/httpClient';
import { getNextPhase, isQuizPreparing, isQuizAnswering, isQuizResults, isTermoPreparing } from '@/lib/sessionPhase';

type SessionWithUsers = Prisma.SessionGetPayload<{
  include: { User: true; UserAnswer: true; currentQuestion: true }
}>;

type QuestionOptions = string[];

// ---- helpers ---------------------------------------------------------------

function parseOptions(options: Prisma.JsonValue | null | undefined): QuestionOptions {
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed.filter((o: unknown): o is string => typeof o === 'string') : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(options)) {
    return options.filter((o: unknown): o is string => typeof o === 'string');
  }
  return [];
}

// ----------------------------------------------------------------------------

export default function HostHome() {
  const { session_id: sessionId } = useParams<{ session_id: string }>();
  const [session, setSession] = useState<SessionWithUsers | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [options, setOptions] = useState<QuestionOptions>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const advancingRef = useRef(false); // evita requisições duplicadas

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const sessionLink = useMemo(() => {
    if (!sessionId) return '';
    return `${origin}/player_session/${sessionId}`;
  }, [sessionId, origin]);

  const copyToClipboard = async () => {
    if (!sessionLink) return;
    try {
      await navigator.clipboard.writeText(sessionLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setErr('Falha ao copiar o link da sessão.');
    }
  };

  const applySession = useCallback((s: SessionWithUsers) => {
    setSession(s);
    setUsers(s.User ?? []);
    setOptions(parseOptions(s.currentQuestion?.options));
  }, []);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setErr(null);
      const s = await http.get<SessionWithUsers>(`/session/${sessionId}`);
      applySession(s);
    } catch {
      setErr('Não foi possível carregar a sessão.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, applySession]);

  const goToNextPhase = useCallback(async () => {
    if (!sessionId || !session) return;
    if (advancingRef.current) return;      // trava contra toques rápidos
    advancingRef.current = true;

    try {     

      const nextPhase = getNextPhase(session);
      const payload = {
        phase: nextPhase.phase,
        currentQuestionIndex: nextPhase?.currentQuestionIndex,
        questions: nextPhase?.questions
      };

      const updated = await http.put<SessionWithUsers>(`/session/${sessionId}`, payload);
      applySession(updated);
    } catch {
      setErr('Falha ao avançar de fase. Tente novamente.');
    } finally {
      advancingRef.current = false;
    }
  }, [sessionId, session, applySession]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);


  const quizStatus = () => {
    if (!session) return null;

    if (isQuizPreparing(session.phase)) return null;

    if (isQuizAnswering(session.phase)) {
      if (timeLeft !== null && timeLeft > 0) {
        return (
          <div className="mt-4 text-center">
            <p className="text-4xl font-extrabold text-red-500 animate-pulse">
              {timeLeft}s
            </p>
            <p className="text-sm text-neutral-400">Tempo restante</p>
          </div>
        );
      }
      return (
        <div className="mt-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">⏰ Tempo esgotado!</p>
        </div>
      );
    }

    if (isQuizResults(session.phase)) {
      const idx = session.currentQuestion?.correctIndex ?? -1;
      const ans = idx >= 0 ? options[idx] : undefined;
      return (
        <p className="mt-4 text-lg font-semibold text-green-400">
          Resposta: {ans || '—'}
        </p>
      );
    }

    return null;
};



  useEffect(() => {
  if (!session) return;

  // só inicializa timer se estiver na fase "ANSWERING"
  if (isQuizAnswering(session.phase)) {
    const initial = session.currentQuestion?.timeLimit ?? 0;
    setTimeLeft(initial);

    let tick = initial;
    const interval = setInterval(() => {
      tick -= 1;
      setTimeLeft(tick);
      if (tick <= 0) {
        clearInterval(interval)
        // goToNextPhase();
      };
    }, 1000);

    return () => clearInterval(interval);
  } else {
    // em qualquer outra fase reseta
    setTimeLeft(null);
  }
}, [session?.phase, session?.currentQuestion.id, session]);


  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Painel do Host — Jogo de Chá Revelação
          </h1>
          
        </header>

        {/* Alert */}
        {err && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
            {err}
          </div>
        )}

        {/* Card principal */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-xl">
          {loading ? (
            <div className="p-8 animate-pulse">
              <div className="h-6 w-2/3 bg-neutral-800 rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-10 bg-neutral-800 rounded"></div>
                <div className="h-10 bg-neutral-800 rounded"></div>
                <div className="h-10 bg-neutral-800 rounded"></div>
                <div className="h-10 bg-neutral-800 rounded"></div>
              </div>
              <div className="h-4 w-1/3 bg-neutral-800 rounded mt-6"></div>
            </div>
          ) : !session ? (
            <div className="p-8">Sessão não encontrada.</div>
          ) : (
            <div className="p-6 md:p-8">
              {session.phase === 'WAITING_FOR_PLAYERS' ? (
                <>
                  <h2 className="text-xl font-semibold mb-2">Sessão criada ✅</h2>
                  <p className="text-sm text-neutral-300 mb-4">
                    Compartilhe o link com os participantes para eles entrarem:
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      readOnly
                      value={sessionLink}
                      className="flex-1 border border-neutral-700 bg-neutral-950 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm font-medium transition"
                    >
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={goToNextPhase}
                      disabled={advancingRef.current}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 px-5 py-3 font-semibold transition"
                    >
                      {advancingRef.current && (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" d="M4 12a8 8 0 018-8v4" fill="currentColor"/>
                        </svg>
                      )}
                      Iniciar Jogo
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* status badge */}
                  <div className="mb-3">
                    <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
                      Fase: {session.phase.replaceAll('_', ' ')}
                    </span>
                  </div>


               {session.phase.includes('QUIZ') ? <>
                  <h2 className="text-2xl font-bold mb-4">
                    {session.currentQuestion?.text || '—'}
                  </h2>


                  <div className="space-y-3">
                    {options.map((opt, i) => (
                      <div
                        key={`${i}-${opt}`}
                        className="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3"
                      >
                        <p className="font-medium">
                          {i + 1}) <span className="font-semibold">{opt}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </> : 
                <>
                  {isTermoPreparing(session.phase) && (
                    <div className="max-w-xl text-center p-4 border rounded bg-neutral-900/60">
                      <p className="mb-2 font-semibold">Como funciona:</p>
                      <ul className="list-disc text-left pl-6 space-y-1">
                        <li>Você terá 60 segundos para adivinhar uma palavra de 5 letras.</li>
                        <li>As cores indicam: <span className="text-green-600 font-semibold">verde</span> (letra certa no lugar certo), <span className="text-yellow-600 font-semibold">amarelo</span> (letra existe, lugar errado) e <span className="text-gray-600 font-semibold">cinza</span> (letra não existe).</li>
                        <li>Sua pontuação aumenta quanto mais rápido você acertar.</li>
                      </ul>
                      <p className="mt-3 text-sm text-gray-600">Aguarde o host iniciar.</p>
                    </div>
                  )}
                
                </>}

                  {/* rodapé pergunta */}
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div className="text-sm text-neutral-300">{quizStatus()}</div>
                    <button
                      onClick={goToNextPhase}
                      disabled={advancingRef.current}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 px-5 py-3 font-semibold transition"
                    >
                      {advancingRef.current && (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" d="M4 12a8 8 0 018-8v4" fill="currentColor"/>
                        </svg>
                      )}
                      Avançar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {/* jogadores */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-xl p-6 md:p-8">
          <h3 className="text-xl font-bold mb-4">Jogadores na sessão</h3>
          {!users.length ? (
            <p className="text-neutral-300">Nenhum jogador entrou ainda…</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="rounded-lg bg-neutral-950 border border-neutral-800 px-4 py-2 text-center"
                >
                  {u.name}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
