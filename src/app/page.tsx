'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@prisma/client'
import { http } from '@/lib/server/httpClient'

/* ========================= AppShell (reutilize em todas as páginas) ========================= */

function AppShellKids({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-rose-50 via-sky-50 to-emerald-50 text-slate-800">

      <div className="pointer-events-none absolute -top-24 -left-24 h-[28rem] w-[28rem] rounded-full bg-pink-300/30 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-[30rem] w-[30rem] rounded-full bg-sky-300/30 blur-3xl animate-pulse [animation-delay:400ms]" />
      <div className="pointer-events-none absolute top-1/3 -right-16 h-72 w-72 rounded-full bg-amber-200/50 blur-2xl animate-pulse [animation-delay:800ms]" />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'radial-gradient(#0ea5e9 0.8px, transparent 0.8px), radial-gradient(#f97316 0.8px, transparent 0.8px)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10">{children}</div>

      <footer className="relative mx-auto max-w-6xl px-4 pt-6 pb-10 text-sm text-slate-500">
        <div className="rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md px-4 py-3 shadow-sm">
          Operação Berço — O Caso do Pequeno Segredo · <span className="font-medium">v1.0</span>
        </div>
      </footer>

      <FloatingDoodles />
    </main>
  )
}

function FloatingDoodles() {
  return (
    <>
      <span className="pointer-events-none absolute left-8 top-24 select-none text-3xl animate-bounce">🧩</span>
      <span className="pointer-events-none absolute right-10 top-36 select-none text-3xl animate-bounce [animation-delay:300ms]">
        🥳
      </span>
      <span className="pointer-events-none absolute left-1/3 bottom-24 select-none text-3xl animate-bounce [animation-delay:600ms]">
        🍼
      </span>
    </>
  )
}


function LogoKid() {
  return (
    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-lg shadow-rose-200/80 border border-white">
      <svg width="30" height="30" viewBox="0 0 24 24" className="text-rose-400">
        <path
          fill="currentColor"
          d="M10 18a8 8 0 1 1 5.293-14.05l3.879 3.879a1 1 0 0 1 0 1.414l-.586.586l1.707 1.707a1 1 0 0 1-1.414 1.414l-1.707-1.707l-.586.586a1 1 0 0 1-1.414 0l-3.88-3.878A6 6 0 1 0 10 16a1 1 0 1 1 0 2Z"
        />
      </svg>
    </div>
  )
}

function SparkleButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      {...props}
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-400 via-amber-300 to-sky-400 px-5 py-3 font-semibold text-slate-800 shadow-lg shadow-rose-200/50 transition active:scale-[0.98] hover:brightness-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 ${className}`}
    >
      {/* Shine */}
      <span className="pointer-events-none absolute inset-0 rounded-xl bg-white/0 [mask-image:radial-gradient(60%_40%_at_30%_-20%,#000_20%,transparent_60%)]" />
      {children}
    </button>
  )
}

function FeatureCard({
  emoji,
  title,
  desc,
  accent = 'rose',
}: {
  emoji: string
  title: string
  desc: string
  accent?: 'rose' | 'sky' | 'emerald'
}) {
  const ring =
    accent === 'rose'
      ? 'ring-rose-200/80'
      : accent === 'sky'
      ? 'ring-sky-200/80'
      : 'ring-emerald-200/80'
  return (
    <li className={`rounded-2xl bg-white/80 backdrop-blur-md p-4 shadow-sm ring-1 ${ring}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <p className="font-semibold">{title}</p>
      </div>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
    </li>
  )
}


export default function Home() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const sessionIdAlreadyStarted =
      typeof window !== 'undefined' ? localStorage.getItem('session_id') : null
    if (sessionIdAlreadyStarted) {
      const userId = localStorage.getItem('user_id');
      if (userId) {
        router.push(`/player_session/${sessionIdAlreadyStarted}`);
        return;
      }
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
  return (
    <AppShellKids>
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
