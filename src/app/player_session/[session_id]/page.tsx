'use client'

import { useState } from 'react'
// import { io, type Socket } from 'socket.io-client'
import { useParams } from 'next/navigation'
import { http } from '@/server/httpClient'
import { User } from '@prisma/client'


export default function InitialPlayerPage() {
  const [name, setName] = useState('');
  const [players, setPlayers] = useState<string[]>([]);
  const [, setPlayerSigned] = useState<User| null>(null);
  const [joined, setJoined] = useState(false);
  // const [socket, setSocket] = useState<Socket | null>(null)
  // const router = useRouter();
  const { session_id: sessionId } = useParams<{ session_id: string }>()

  
  
  // useEffect(() => {
  //   const s = io({ path: '/api/socket/io' })
  //   setSocket(s)
  //   s.on('user-joined', (n: string) =>
  //     setPlayers(p => (p.includes(n) ? p : [...p, n]))
  //   )
  //   s.on('start-quiz', () => router.push('/quiz'))
  //   return () => {
  //     s.disconnect()
  //   }
  // }, [router])



  const join = async () => {

    const userResponse = await http.post<User>('/user', {
      name,
      sessionId,
    });
    setPlayerSigned(userResponse);

    localStorage.setItem("user_id", userResponse.id);
    setPlayers(p => [...p, name])
    if (typeof window !== 'undefined') {
      localStorage.setItem('quiz-name', name)
    }
    setJoined(true)
  }

  // function start() {
  //   // socket?.emit('start-quiz')
  //   router.push('/quiz')
  // }



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
        
        </>
      )}
    </main>
  )
}
