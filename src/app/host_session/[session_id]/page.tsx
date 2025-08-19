'use client'

import { useEffect, useMemo, useState, useCallback } from 'react';
import { User, Prisma } from '@prisma/client';
import { useParams, useRouter } from 'next/navigation'
import { http } from '@/server/httpClient';
import { getNextPhase, isQuizPreparing, isQuizAnswering, isQuizResults } from '@/lib/sessionPhase';

type SessionWithUsers = Prisma.SessionGetPayload<{
  include: { User: true; UserAnswer: true, currentQuestion: true }
}>



export default function HostHome() {
  const [session, setSession] = useState<SessionWithUsers | null>(null);
  const [copied, setCopied] = useState(false);
  const [ users, setUsers ] = useState<User[]>([]);
  const { session_id: sessionId } = useParams<{ session_id: string }>();
  const router = useRouter();
  const options: string[] = JSON.parse((session?.currentQuestion?.options as string) ?? "[]");

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

  const goToNextPhase = async () => {
    if (!sessionId || !session) return;

    if (session.phase === "TERMO_PREPARING") {
      router.push(`/host_session/${sessionId}/termo`);
      return;
    }
    const nextPhase = getNextPhase(session);
    const sessionUpdate = await http.put<SessionWithUsers>(`/session/${sessionId}`, {
      phase: nextPhase.phase,
      currentQuestionIndex: nextPhase?.currentQuestionIndex,
      questions: nextPhase?.questions
    });

    setSession(sessionUpdate);
  }

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);


  const showQuizStatus = () => {
    if (!session) return 'Carregando...';

    if (isQuizPreparing(session?.phase)) {
      return null;
    }
    if (isQuizAnswering(session?.phase)) {
      return `TEMPO: ${session.currentQuestion?.timeLimit || 0} segundos`;
    }
    if (isQuizResults(session?.phase)) {
      return `Resposta: ${options[session.currentQuestion?.correctIndex]}`;
    }
}


  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">Bem-vindo ao Jogo de Chá Revelação</h1>

      {sessionId && (
        <section className="w-full max-w-xl mt-6 p-4 border rounded-lg text-left">

         {session?.phase === "WAITING_FOR_PLAYERS" ? <>
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
                  onClick={goToNextPhase}
                  className="bg-indigo-600 text-white px-3 py-2 rounded"
                >
                  Iniciar Jogo
                </button>
              </div>
            </div>
          </>
           : <div>
              <h1>{session?.currentQuestion?.text}</h1>
              {options.map((option, i) => (
                <div key={i} className="p-2 border rounded mb-2">
                  <p className="font-bold"> {`${i + 1})`} {option}</p>
                </div>
              ))}
              <p>
                {showQuizStatus()}
              </p>

               <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={goToNextPhase}
                  className="bg-indigo-600 text-white px-3 py-2 rounded"
                >
                  Avançar para próxima fase
                </button>
              </div>
            </div>}

  
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
