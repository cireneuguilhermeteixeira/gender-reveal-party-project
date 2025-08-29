'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@prisma/client'
import { http } from '@/lib/server/httpClient'
import InfoInitialModal from '@/components/InfoInitialModal'
import AppShellKids from '@/components/AppShellKids'
import LogoKid from '@/components/LogoKid'
import FeatureCard from '@/components/FeatureCard'
import SparkleButton from '@/components/SparkleButton'


export default function Home() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [showIntro, setShowIntro] = useState(false)

  // abre modal ao carregar (se ainda não marcado "não mostrar")
  useEffect(() => {
    const seen = typeof window !== 'undefined' ? localStorage.getItem('intro_seen_v1') : '1'
    if (!seen) setShowIntro(true)
  }, [])

  // se já existe sessão do host neste navegador, redireciona
  useEffect(() => {
    const sessionIdAlreadyStarted =
      typeof window !== 'undefined' ? localStorage.getItem('session_id') : null
    if (sessionIdAlreadyStarted) {
      router.push(`/host_session/${sessionIdAlreadyStarted}`)
    }
  }, [router])

  const startNewGame = async () => {
    try {
      setCreating(true)
      const newSessionData = await http.post<Session>('/session', {})
      localStorage.setItem('session_id', newSessionData.id)
      router.push(`/host_session/${newSessionData.id}`)
    } catch (e) {
      console.error(e)
      alert('Não foi possível criar a sessão. Tente novamente.')
    } finally {
      setCreating(false)
    }
  }

  const handleCloseIntro = (dontShowAgain: boolean) => {
    if (dontShowAgain) localStorage.setItem('intro_seen_v1', '1')
    setShowIntro(false)
  }

  return (
    <AppShellKids>
      <InfoInitialModal open={showIntro} onClose={handleCloseIntro} />

      {/* Header */}
      <header className="flex items-center gap-4">
        <LogoKid />
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Operação Berço</h1>
          <p className="text-slate-600 text-sm md:text-base">O Caso do Pequeno Segredo</p>
        </div>
      </header>

      {/* Hero */}
      <section className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Texto + Ações */}
        <div className="lg:col-span-7">
          <h2 className="text-3xl md:text-5xl font-black leading-tight">
            Cada resposta é uma <span className="text-rose-500">pista</span>.{' '}
            <br className="hidden md:block" />
            Cada risada, um <span className="text-sky-500">sinal</span>.
          </h2>

          <p className="mt-4 text-slate-700 max-w-prose">
            São <strong>10 pistas</strong> (quiz) + <strong>3 codenomes</strong> (termo) para
            destravar o cofre e descobrir <em>quem está chegando</em>.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <SparkleButton onClick={startNewGame} disabled={creating}>
              {creating ? 'Criando…' : 'Abrir sessão'}
            </SparkleButton>
          </div>

          {/* Como funciona */}
          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FeatureCard
              emoji="🔎"
              title="10 Pistas"
              desc="Perguntas rápidas que viram evidências no quadro."
              accent="rose"
            />
            <FeatureCard
              emoji="🔤"
              title="3 Codenomes"
              desc="Palavras do universo bebê que dão a combinação."
              accent="sky"
            />
            <FeatureCard
              emoji="🎉"
              title="Revelação"
              desc="A cor final entrega o segredo — respira e vem!"
              accent="emerald"
            />
          </ul>
        </div>

        {/* Cartão visual lateral */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl bg-white/80 backdrop-blur-md border border-white/80 p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm text-slate-600">Lobby online</span>
              </div>
              <span className="text-xs font-mono text-slate-500">Dossiê #2025</span>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-rose-50 to-sky-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🧠</span>
                  <div>
                    <p className="text-sm font-semibold">Modo brincadeira séria</p>
                    <p className="text-xs text-slate-600">
                      Vale palpite, vale carinho — só não vale brigar com a placa-mãe.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-emerald-50 to-amber-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🧸</span>
                  <div>
                    <p className="text-sm font-semibold">Mapa de Afetos</p>
                    <p className="text-xs text-slate-600">
                      Seu placar fofinho: cada ponto acende um LED de amor.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500 text-center">
              *Guarde as cores de revelação para o final: rosa-quartzo ou azul-brisa.*
            </p>
          </div>
        </div>
      </section>
    </AppShellKids>
  )
}
