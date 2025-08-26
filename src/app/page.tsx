'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Session } from '@prisma/client' // se quiser tipar pela lib
import { http } from '@/lib/server/httpClient'


export default function Home() {
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const startNewGame = async () => {
    try {
      setCreating(true);
      const newSessionData : Session = await http.post<Session>('/session', {});
      localStorage.setItem("session_id", newSessionData.id);
      router.push(`/host_session/${newSessionData.id}`);
    } catch (e) {
      console.error(e)
      alert('Não foi possível criar a sessão. Tente novamente.')
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    const sessionIdAlreadyStarted = localStorage.getItem("session_id");
    if (sessionIdAlreadyStarted) {
      router.push(`/host_session/${sessionIdAlreadyStarted}`);
    }
  }, [router])

 
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">Bem-vindo ao Jogo de Chá Revelação</h1>

      <div className="flex gap-2 mt-4">
        <button
          onClick={startNewGame}
          disabled={creating}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {creating ? 'Criando...' : 'Começar Novo Jogo'}
        </button>
      </div>

    </main>
  )
}
