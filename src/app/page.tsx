'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Session } from '@prisma/client' // se quiser tipar pela lib
import { http } from '@/server/httpClient'


export default function Home() {
  const [creating, setCreating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const sessionLink = useMemo(() => {
    if (!sessionId) return ''
    return `${origin}/player_session/${sessionId}/quiz`
  }, [sessionId, origin])


  const startNewGame = async () => {
    try {
      setCreating(true);
      setCopied(false);
      const newSessionData : Session = await http.post<Session>('/api/session', {})

      setSessionId(newSessionData.id);
      // router.push(`/player_session/${data.id}/quiz`)
    } catch (e) {
      console.error(e)
      alert('Não foi possível criar a sessão. Tente novamente.')
    } finally {
      setCreating(false)
    }
  }

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


  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">Bem-vindo ao Jogo de Chá Revelação</h1>

      {!sessionId && <div className="flex gap-2 mt-4">
        <button
          onClick={startNewGame}
          disabled={creating}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {creating ? 'Criando...' : 'Começar Novo Jogo'}
        </button>
      </div>}

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
                onClick={() => router.push(`/player_session/${sessionId}/quiz`)}
                className="bg-indigo-600 text-white px-3 py-2 rounded"
              >
                Iniciar Jogo
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
