'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { io, type Socket } from 'socket.io-client'
import { useSearchParams } from 'next/navigation'

interface Question {
  question: string
  options: string[]
  correct: number
}

const QUESTIONS: Question[] = [
  {
    question: 'Qual é a cor do céu?',
    options: ['Azul', 'Verde', 'Vermelho', 'Amarelo'],
    correct: 0,
  },
  {
    question: 'Quantos dias tem uma semana?',
    options: ['Cinco', 'Sete', 'Nove', 'Onze'],
    correct: 1,
  },
  {
    question: 'Quanto é 2 + 2?',
    options: ['3', '4', '5', '6'],
    correct: 1,
  },
  {
    question: 'Qual é o oposto de quente?',
    options: ['Frio', 'Curto', 'Grande', 'Gelado'],
    correct: 0,
  },
  {
    question: 'Qual é a primeira letra do alfabeto?',
    options: ['B', 'C', 'A', 'D'],
    correct: 2,
  },
]

const TIME = 10

export default function Fase1() {
  const [index, setIndex] = useState(0)
  const [time, setTime] = useState(TIME)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [answerTime, setAnswerTime] = useState<number | null>(null)
  const [ranking, setRanking] = useState<{ name: string; points: number }[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const params = useSearchParams()
  const isHost = params.get('host') === '1'
  const name =
    typeof window !== 'undefined' ? localStorage.getItem('quiz-name') || '' : ''

  useEffect(() => {
    const s = io({ path: '/api/socket/io' })
    setSocket(s)
    s.on('question', (data: { index: number; time: number }) => {
      setIndex(data.index)
      setTime(data.time)
    })
    s.on('ranking', (data: { name: string; points: number }[]) => {
      setRanking(data)
    })
    return () => {
      s.disconnect()
    }
  }, [])

  const handleAnswer = useCallback((option: number) => {
    if (answered) return
    const elapsed = TIME - time
    setAnswered(true)
    setAnswerTime(elapsed)
    if (option === QUESTIONS[index].correct) {
      setScore(s => s + time)
    }
    socket?.emit('answer', {
      userId: name,
      sessionId: 'default',
      questionId: String(index),
      selectedIndex: option,
      timeTaken: elapsed,
    })
  }, [answered, index, time, socket, name])

  useEffect(() => {
    if (answered) return
    if (time === 0) {
      handleAnswer(-1)
      return
    }
    const id = setTimeout(() => setTime(t => t - 1), 1000)
    if (isHost && socket) {
      socket.emit('timer', time)
    }
    return () => clearTimeout(id)
  }, [time, answered, handleAnswer, isHost, socket])

  useEffect(() => {
    setTime(TIME)
    setAnswered(false)
    setAnswerTime(null)
    if (isHost && socket) {
      socket.emit('question', { index, time: TIME })
    }
  }, [index, isHost, socket])


  function next() {
    if (index + 1 < QUESTIONS.length) {
      setIndex(i => i + 1)
    } else {
      setIndex(i => i + 1)
    }
  }

  if (index >= QUESTIONS.length) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-bold">Fim da Fase 1</h1>
        <p className="text-lg">Pontuação final: {score}</p>
        <Link href="/" className="text-blue-600 underline">Voltar para o início</Link>
      </main>
    )
  }

  const q = QUESTIONS[index]

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-8">
      <h2 className="text-xl font-semibold">Pergunta {index + 1} de {QUESTIONS.length}</h2>
      <div className="text-2xl text-center max-w-md">{q.question}</div>
      <div className="text-lg">Tempo restante: {time}s</div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            className={`py-2 px-4 text-white rounded ${['bg-blue-500','bg-green-500','bg-red-500','bg-yellow-500'][i % 4]}`}
          >
            {opt}
          </button>
        ))}
      </div>

      {answered && (
        <div className="mt-6 w-full max-w-md border p-4 rounded flex flex-col items-center gap-2">
          <h3 className="font-bold">Pontuação</h3>
          <p>Você tem {score} pontos</p>
          {answerTime !== null && (
            <p>Tempo de resposta: {answerTime}s</p>
          )}
          {ranking.length > 0 && (
            <ul className="mt-2 text-left">
              {ranking.map(r => (
                <li key={r.name}>
                  {r.name}: {r.points}
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={next}
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
          >
            {index + 1 === QUESTIONS.length ? 'Ver resultado final' : 'Próxima pergunta'}
          </button>
        </div>
      )}
    </main>
  )
}
