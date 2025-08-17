'use client'

import { useEffect, useMemo, useState, useCallback } from 'react';
import { User, Prisma } from '@prisma/client';
import { useParams } from 'next/navigation'
import { http } from '@/server/httpClient';

type SessionWithUsers = Prisma.SessionGetPayload<{
  include: { User: true; UserAnswer: true }
}>



export default function HostHome() {
  const [, setSession] = useState<SessionWithUsers | null>(null);
  const [copied, setCopied] = useState(false);
  const [ users, setUsers ] = useState<User[]>([]);
  const { session_id: sessionId } = useParams<{ session_id: string }>()

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const sessionLink = useMemo(() => {
    if (!sessionId) return ''
    return `${origin}/player_session/${sessionId}`
  }, [sessionId, origin])




  const copyToClipboard = async () => {
    if (!sessionLink) return
    try {
      await navigator.clipboard.writeText(sessionLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Falha ao copiar.')
    }
  }


  const fetchSession = useCallback(async () => {
    const sessionResponse = await http.get<SessionWithUsers>(`/session/${sessionId}`);
    setSession(sessionResponse);
    setUsers(sessionResponse.User);
  }, [sessionId]);

  const startGame = async () => {

  }

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);


  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">Bem-vindo ao Jogo de Chá Revelação</h1>

      {sessionId && (
        <section className="w-full max-w-xl mt-6 p-4 border rounded-lg text-left">
          <h2 className="text-xl font-semibold mb-3">Sessão criada ✅</h2>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-1">Link da sessão</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={sessionLink}
                  className="flex-1 border rounded px-2 py-2 text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="bg-slate-600 text-white px-3 py-2 rounded"
                >
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={startGame}
                className="bg-indigo-600 text-white px-3 py-2 rounded"
              >
                Iniciar Jogo
              </button>
            </div>
          </div>

  
          <div className="p-4 border rounded max-w-md mx-auto text-center">
            <h2 className="text-xl font-bold mb-4">Jogadores na sessão</h2>
            {users.length === 0 ? (
              <p>Nenhum jogador entrou ainda...</p>
            ) : (
              <ul className="space-y-2">
                {users.map(user => (
                  <li
                    key={user.id}
                    className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded"
                  >
                    {user.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

        </section>
      )}
    </main>
  )
}
