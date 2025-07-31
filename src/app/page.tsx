'use client'

import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function Home() {
  const [name, setName] = useState('')
  const [players, setPlayers] = useState<string[]>([])
  const [joined, setJoined] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isHost, setIsHost] = useState(false)
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const s = io({ path: '/api/socket/io' })
    setSocket(s)
    s.on('user-joined', (n: string) =>
      setPlayers(p => (p.includes(n) ? p : [...p, n]))
    )
    s.on('start-quiz', () => router.push('/fase1'))
    return () => {
      s.disconnect()
    }
  }, [router])

  useEffect(() => {
    setIsHost(params.get('host') === '1')
  }, [params])

  function join() {
    if (!socket || !name) return
    socket.emit('join', name)
    setPlayers(p => [...p, name])
    if (typeof window !== 'undefined') {
      localStorage.setItem('quiz-name', name)
    }
    setJoined(true)
  }

  function start() {
    socket?.emit('start-quiz')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">Bem-vindo ao Quiz</h1>
      {!joined ? (
        <div className="flex gap-2 mt-4">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="border p-2"
            placeholder="Seu nome"
          />
          <button
            onClick={join}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Entrar
          </button>
        </div>
      ) : (
        <>
          <ul className="my-4">
            {players.map(p => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          {isHost && (
            <button
              onClick={start}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Começar Quiz
            </button>
          )}
        </>
      )}
    </main>
  )
}
