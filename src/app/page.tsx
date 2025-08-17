'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Session } from '@prisma/client' // se quiser tipar pela lib


export default function Home() {
  const [creating, setCreating] = useState(false)
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const sessionLink = useMemo(() => {
    if (!createdSessionId) return ''
    return `${origin}/player_session/${createdSessionId}/quiz`
  }, [createdSessionId, origin])

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  const startNewGame = async () => {
    try {
      setCreating(true);
      setCopied(false);
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Falha ao criar sessão')
      const data: Session = await res.json()
      setCreatedSessionId(data.id);
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

  const shareOnWhatsApp = () => {
    if (!sessionLink) return
    const text = `Entre na sessão do jogo de Chá Revelação:\n${sessionLink}`
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const nativeShare = async () => {
    if (!sessionLink || !canNativeShare) return
    try {
      await navigator.share({
        title: 'Chá Revelação – Sessão',
        text: 'Entre na sessão do jogo:',
        url: sessionLink,
      })
    } catch {
      /* usuário cancelou ou não suportado */
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">Bem-vindo ao Jogo de Chá Revelação</h1>

      {!createdSessionId && <div className="flex gap-2 mt-4">
        <button
          onClick={startNewGame}
          disabled={creating}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {creating ? 'Criando...' : 'Começar Novo Jogo'}
        </button>
      </div>}

      {/* Bloco mostrado após criar a sessão */}
      {createdSessionId && (
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
                onClick={shareOnWhatsApp}
                className="bg-green-500 text-white px-3 py-2 rounded"
                aria-label="Compartilhar no WhatsApp"
              >
                Compartilhar no WhatsApp
              </button>

              {canNativeShare && (
                <button
                  onClick={nativeShare}
                  className="bg-indigo-600 text-white px-3 py-2 rounded"
                >
                  Compartilhar…
                </button>
              )}

              <button
                onClick={() => router.push(`/player_session/${createdSessionId}/quiz`)}
                className="ml-auto bg-blue-600 text-white px-3 py-2 rounded"
              >
                Ir para a sessão
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
