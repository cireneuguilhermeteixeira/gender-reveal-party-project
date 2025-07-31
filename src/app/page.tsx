'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">Bem-vindo ao Quiz</h1>
      <p className="max-w-md">
        Responda 5 perguntas o mais rápido possível. Quanto mais rápido você
        responder, mais pontos marca. Quando todos estiverem prontos, clique
        em “Começar”.
      </p>
      <Link href="/fase1" className="bg-blue-500 text-white px-4 py-2 rounded">
        Começar
      </Link>
    </main>
  )
}
