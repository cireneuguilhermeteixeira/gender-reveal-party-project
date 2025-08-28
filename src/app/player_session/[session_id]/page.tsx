'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { http } from '@/lib/server/httpClient';
import { WebSocketClient, ws } from '@/lib/server/ws/wsClient';
import { Prisma, User } from '@prisma/client';

type SessionWithUsers = Prisma.SessionGetPayload<{
  include: { User: true; UserAnswer: true; currentQuestion: true }
}>;

export default function InitialPlayerPage() {
  const { session_id: sessionId } = useParams<{ session_id: string }>();

  const [name, setName] = useState('');
  const [session, setSession] = useState<SessionWithUsers>();
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sessionLink, setSessionLink] = useState('');
  const sockRef = useRef<ReturnType<WebSocketClient['connect']> | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('quiz-name') : null;
    if (saved) setName(saved);
  }, []);

  useEffect(() => {
    if (sessionId) {
      setSessionLink(`${window.location.origin}/player_session/${sessionId}`);
    }
  }, [sessionId]);
  
  const applySession = useCallback((s: SessionWithUsers) => {
  
    setSession(s);
    const player = s.User.find(u => u.id === localStorage.getItem('user_id')) || '';
    if (player && player.sessionId === sessionId) {

      if (s.phase !== 'WAITING_FOR_PLAYERS') {
        router.push(`/player_session/${sessionId}/quiz`);
        return;
      }

      setName(player.name);
      setJoined(true);
    } else {
      setErr('Você não está mais na sala. Tente entrar novamente.');
      setJoined(false);
    }
  }, [router, sessionId]);

  const fetchSession =  useCallback(async () => {
    if (!sessionId) return;
    try {
      setErr(null);
      const s = await http.get<SessionWithUsers>(`/session/${sessionId}`);
      applySession(s);
    } catch {
      setErr('Não foi possível carregar os jogadores. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, applySession]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);


  useEffect(() => {
    const userId = localStorage.getItem('user_id') || '';
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
        router.push(`/player_session/${sessionId}/quiz`);
        console.log('[ws] phase ->', phase);
      })
      .open();

    sockRef.current = sock;

    return () => sockRef.current?.close();
  }, [fetchSession, session?.User, sessionId, router]);
    
   

  const join = async () => {
    if (!sessionId || !name.trim() || joining) return;
    setJoining(true);
    setErr(null);

    try {
      const user = await http.post<User>('/user', { name: name.trim(), sessionId });
      // persistência local
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_id', user.id);
        localStorage.setItem('session_id', sessionId);
      }
      // adiciona otimistamente na UI (o polling consolida depois)
      setSession(prev =>
        prev
          ? prev.User.find(p => p.id === user.id)
            ? prev
            : { ...prev, User: [...prev.User, user] }
          : prev
      );
      setJoined(true);
    } catch {
      setErr('Não foi possível entrar na sala. Verifique o nome e tente novamente.');
    } finally {
      setJoining(false);
    }
  };


  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <header className="text-center">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Entrar no Quiz</h1>
          {!!sessionLink && (
            <p className="mt-1 text-xs text-neutral-400 break-all">Sala: {sessionLink}</p>
          )}
        </header>

        {err && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
            {err}
          </div>
        )}

        {/* Card principal */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-xl p-6 md:p-8">
          {!joined ? (
            <>
              <h2 className="text-lg font-semibold mb-3">Informe seu nome para participar</h2>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 border border-neutral-700 bg-neutral-950 rounded-lg px-3 py-2 text-sm"
                  placeholder="Seu nome"
                  maxLength={40}
                />
                <button
                  onClick={join}
                  disabled={!name.trim() || joining}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 px-5 py-2.5 font-semibold transition"
                >
                  {joining && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" d="M4 12a8 8 0 018-8v4" fill="currentColor"/>
                    </svg>
                  )}
                  Entrar
                </button>
              </div>

              <div className="mt-6">
                <h3 className="text-base font-semibold mb-2">Jogadores na sala</h3>
                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-9 bg-neutral-800 rounded" />
                    <div className="h-9 bg-neutral-800 rounded" />
                    <div className="h-9 bg-neutral-800 rounded" />
                  </div>
                ) : session?.User.length === 0 ? (
                  <p className="text-neutral-300 text-sm">Ainda não há jogadores…</p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {session?.User.map((u) => (
                      <li key={u.id} className="rounded-lg bg-neutral-950 border border-neutral-800 px-4 py-2 text-center">
                        {u.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mb-3">
                <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                  Aguardando o host iniciar…
                </span>
              </div>

              <h2 className="text-xl font-bold mb-4">Bem-vindo, {name}!</h2>

              <p className="text-neutral-300 text-sm mb-4">
                Assim que o host começar a partida, sua tela mudará automaticamente para as perguntas.
              </p>

              <h3 className="text-base font-semibold mb-2">Quem já está na sala</h3>
              {session?.User.length === 0 ? (
                <p className="text-neutral-300 text-sm">Você é o primeiro por aqui 😄</p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {session?.User.map((u) => (
                    <li key={u.id} className="rounded-lg bg-neutral-950 border border-neutral-800 px-4 py-2 text-center">
                      {u.name}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
