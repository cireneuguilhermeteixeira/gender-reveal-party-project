import { Prisma } from '@prisma/client';
import React, { useMemo } from 'react';

type SessionWithUsers = Prisma.SessionGetPayload<{
  include: { User: true; UserAnswer: true; currentQuestion: true }
}>


type ScoreboardProps = {
  title: string;
  session?: SessionWithUsers | null;
  highlightUserId?: string | null
};


type AvatarProps = {
  name: string;
  src?: string | null;
};

const medalForRank = (idx: number) => (idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`)


const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('') || 'U';


const Avatar = ({ name, src }: AvatarProps) => {
  if (src) {
    return (
      <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-slate-700 text-white grid place-items-center ring-2 ring-white/10">
      <span className="text-[10px] font-bold">{initials(name)}</span>
    </div>
  )
}

const Scoreboard = ({
  title,
  session,
  highlightUserId
}: ScoreboardProps) =>{
  const data = useMemo(() => {
    if (!session) return []
    return session.User.map((user) => {
      return {
        userId: user.id,
        name: user.name,
        score: user.points ?? 0
      }
    })
  }, [session])

  const sorted = useMemo(
    () => (data ? [...data].sort((a, b) => b.score - a.score) : []),
    [data]
  )

  return (
    <div className="w-full max-w-2xl mt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        {sorted.length > 0 && (
          <span className="text-sm text-white/60">
            {sorted.length} participante{sorted.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 shadow">
        <ul className="divide-y divide-white/5">
          {sorted.length === 0 && (
            <li className="p-4 text-center text-white/60">Sem dados ainda…</li>
          )}

          {sorted.map((u, idx) => {
            const isMe = highlightUserId && u.userId === highlightUserId
            return (
              <li
                key={u.userId}
                className={`flex items-center gap-3 p-3 sm:p-4 ${
                  isMe ? 'bg-indigo-500/10 ring-1 ring-indigo-500/30' : ''
                }`}
              >
                <div className="w-10 shrink-0 text-center text-lg">
                  <span className={idx < 3 ? 'text-2xl' : 'text-base opacity-80'}>
                    {medalForRank(idx)}
                  </span>
                </div>

                <Avatar name={u.name} />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{u.name}</p>
                  <p className="text-sm text-white/60">ID: {u.userId}</p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums">{u.score}</p>
                  <p className="text-xs text-white/60">pontos</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
    );
};

export default Scoreboard;