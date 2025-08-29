'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { http } from '@/lib/server/httpClient';
import { WebSocketClient, ws } from '@/lib/server/ws/wsClient';
import { Prisma, User } from '@prisma/client';
import Loading from '@/components/Loading';

// Tema kids
import AppShellKids from '@/components/AppShellKids';
import LogoKid from '@/components/LogoKid';
import SparkleButton from '@/components/SparkleButton';

type SessionWithUsers = Prisma.SessionGetPayload<{
  include: { User: true; UserAnswer: true; currentQuestion: true }
}>;

// helpers de avatar (mesmos usados nos outros componentes kids)
function initials(name?: string | null) {
  const n = (name || '').trim();
  if (!n) return '👤';
  return n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '👤';
}
function pickAvatarTheme(seed?: string | null) {
  const themes = [
    { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-200' },
    { bg: 'bg-sky-100', text: 'text-sky-700', ring: 'ring-sky-200' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200' },
    { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200' },
    { bg: 'bg-violet-100', text: 'text-violet-700', ring: 'ring-violet-200' },
  ] as const;
  let h = 0;
  const s = seed || 'seed';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return themes[h % themes.length];
}

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
    if (sessionId && typeof window !== 'undefined') {
      setSessionLink(`${window.location.origin}/player_session/${sessionId}`);
    }
  }, [sessionId]);

  const applySession = useCallback(
    (s: SessionWithUsers) => {
      setSession(s);
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : '';
      const player = s.User.find((u) => u.id === userId) || null;

      if (player && player.sessionId === sessionId) {
        if (s.phase !== 'WAITING_FOR_PLAYERS') {
          router.push(`/player_session/${sessionId}/quiz`);
          return;
        }
        setName(player.name || '');
        setJoined(true);
      } else {
        setErr('Você não está mais na sala. Tente entrar novamente.');
        setJoined(false);
      }
    },
    [router, sessionId]
  );

  const fetchSession = useCallback(async () => {
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
    return () => sockRef.current?.close();
  }, []);

  const join = async () => {
    if (!sessionId || !name.trim() || joining) return;
    setJoining(true);
    setErr(null);

    try {
      const user = await http.post<User>('/user', { name: name.trim(), sessionId });
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_id', user.id);
        localStorage.setItem('session_id', sessionId);
        localStorage.setItem('quiz-name', user.name || '');
        fetchSession();

        const sock = ws
          .connect({
            path: '/ws',
            sessionId,
            userId: user.id,
            name: user.name,
            role: 'player',
            autoReconnect: true,
          })
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
            router.push(`/player_session/${sessionId}/quiz`);
            console.log('[ws] phase ->', phase);
          })
          .open();
        sockRef.current = sock;
      }

      // adiciona otimista
      setSession((prev) =>
        prev
          ? prev.User.find((p) => p.id === user.id)
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
    <AppShellKids>
      {/* Header com branding kids */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoKid />
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Entrar no Quiz</h1>
            {!!sessionLink && (
              <p className="mt-1 text-xs text-slate-600 break-all">Sala: {sessionLink}</p>
            )}
          </div>
        </div>
      </header>

      {/* Alert de erro pastel */}
      {err && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {err}
        </div>
      )}

      {/* Card principal claro */}
      <section className="mt-6 rounded-3xl border border-white/80 bg-white/80 backdrop-blur-md shadow-xl p-6 md:p-8">
        {!joined ? (
          <>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-800 mb-3">
              Informe seu nome para participar
            </h2>

            <div className="flex flex-col sm:flex-row gap-2">
              <label className="sr-only" htmlFor="player-name">
                Seu nome
              </label>
              <input
                id="player-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('quiz-name', e.target.value);
                  }
                }}
                className="flex-1 rounded-xl border border-white/80 bg-white/80 backdrop-blur px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                placeholder="Seu nome"
                maxLength={40}
              />
              <SparkleButton onClick={join} disabled={!name.trim() || joining}>
                {joining ? 'Entrando…' : 'Entrar'}
              </SparkleButton>
            </div>

            <div className="mt-6">
              <h3 className="text-base font-extrabold tracking-tight text-slate-800 mb-2">
                Jogadores na sala
              </h3>
              {loading ? (
                <Loading />
              ) : session?.User.length === 0 ? (
                <p className="text-slate-600 text-sm">Ainda não há jogadores…</p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {session?.User.map((u) => {
                    const theme = pickAvatarTheme(u.name);
                    return (
                      <li
                        key={u.id}
                        className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow transition"
                      >
                        <div
                          className={`h-10 w-10 grid place-items-center rounded-full ${theme.bg} ${theme.text} ring-2 ${theme.ring} font-bold`}
                        >
                          <span className="text-[11px]">{initials(u.name)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-800">{u.name || 'Jogador'}</p>
                          <p className="text-xs text-slate-500 group-hover:text-slate-600">Conectado</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mb-3">
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                Aguardando o host iniciar…
              </span>
            </div>

            <h2 className="text-xl font-extrabold tracking-tight text-slate-800 mb-2">
              Bem-vindo, {name}!
            </h2>

            <p className="text-slate-600 text-sm mb-4">
              Assim que o host começar a partida, sua tela mudará automaticamente para as perguntas.
            </p>

            <h3 className="text-base font-extrabold tracking-tight text-slate-800 mb-2">
              Quem já está na sala
            </h3>
            {loading ? (
              <Loading />
            ) : session?.User.length === 0 ? (
              <p className="text-slate-600 text-sm">Você é o primeiro por aqui 😄</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {session?.User.map((u) => {
                  const theme = pickAvatarTheme(u.name);
                  return (
                    <li
                      key={u.id}
                      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow transition"
                    >
                      <div
                        className={`h-10 w-10 grid place-items-center rounded-full ${theme.bg} ${theme.text} ring-2 ${theme.ring} font-bold`}
                      >
                        <span className="text-[11px]">{initials(u.name)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-800">{u.name || 'Jogador'}</p>
                        <p className="text-xs text-slate-500 group-hover:text-slate-600">Conectado</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>
    </AppShellKids>
  );
}
