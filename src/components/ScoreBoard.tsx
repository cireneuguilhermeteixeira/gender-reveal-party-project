'use client';

import { SessionWithUsers } from '@/lib/sessionPhase';
import React, { useMemo } from 'react';


type ScoreboardProps = {
  title: string;
  session?: SessionWithUsers | null;
  highlightUserId?: string | null;
};

type AvatarProps = {
  name: string;
  src?: string | null;
};

const medalForRank = (idx: number) =>
  idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('') || 'U';

// tema pastel estável por nome (mesma ideia do WaitingForPlayers)
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

const Avatar = ({ name, src }: AvatarProps) => {
  const safeName = name || 'Jogador';
  const theme = pickAvatarTheme(safeName);

  if (src) {
    return (
      <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={safeName} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`w-9 h-9 rounded-full grid place-items-center ${theme.bg} ${theme.text} ring-2 ${theme.ring} font-bold`}
    >
      <span className="text-[10px]">{initials(safeName)}</span>
    </div>
  );
};

const Scoreboard = ({ title, session, highlightUserId }: ScoreboardProps) => {
  const data = useMemo(() => {
    if (!session) return [];
    return session.User.map((user) => ({
      userId: user.id,
      name: user.name || 'Jogador',
      score: user.points ?? 0,
    }));
  }, [session]);

  const sorted = useMemo(() => (data ? [...data].sort((a, b) => b.score - a.score) : []), [data]);
  const maxScore = sorted[0]?.score ?? 0;

  return (
    <div className="w-full max-w-2xl mt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-extrabold tracking-tight text-slate-800">{title}</h2>
        {sorted.length > 0 && (
          <span className="text-xs text-slate-600 rounded-full border border-slate-200 bg-white px-3 py-1">
            {sorted.length} participante{sorted.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/80 backdrop-blur-md shadow-xl">
        <ul className="divide-y divide-slate-200">
          {sorted.length === 0 && (
            <li className="p-4 text-center text-slate-600">Sem dados ainda…</li>
          )}

          {sorted.map((u, idx) => {
            const isMe = !!highlightUserId && u.userId === highlightUserId;
            const pct =
              maxScore > 0 ? Math.max(0, Math.min(100, Math.round((u.score / maxScore) * 100))) : 0;

            const rankColor =
              idx === 0
                ? 'text-amber-500'
                : idx === 1
                ? 'text-slate-500'
                : idx === 2
                ? 'text-amber-700'
                : 'text-slate-500';

            return (
              <li
                key={u.userId}
                className={`relative flex items-center gap-3 p-3 sm:p-4 transition hover:bg-white
                ${isMe ? 'bg-sky-50 ring-1 ring-sky-200' : ''}`}
              >
                {/* medal / posição */}
                <div className="w-10 shrink-0 text-center">
                  <span className={`${idx < 3 ? 'text-2xl' : 'text-base'} ${rankColor}`}>
                    {medalForRank(idx)}
                  </span>
                </div>

                {/* avatar + info */}
                <Avatar name={u.name} />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-slate-800">
                    {idx === 0 ? '👑 ' : ''}
                    {u.name}
                  </p>
                  <p className="text-xs text-slate-500">ID: {u.userId}</p>

                  {/* progress por pontuação */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-300 via-amber-300 to-sky-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* pontos */}
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums text-slate-800">{u.score}</p>
                  <p className="text-xs text-slate-500">pontos</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Scoreboard;
