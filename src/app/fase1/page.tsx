'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

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

  const handleAnswer = useCallback((option: number) => {
    if (answered) return
    const elapsed = TIME - time
    setAnswered(true)
    setAnswerTime(elapsed)
    if (option === QUESTIONS[index].correct) {
      setScore(s => s + time)
    }
  }, [answered, index, time])

  useEffect(() => {
    if (answered) return
    if (time === 0) {
      handleAnswer(-1)
      return
    }
    const id = setTimeout(() => setTime(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [time, answered, handleAnswer])

  useEffect(() => {
    setTime(TIME)
    setAnswered(false)
    setAnswerTime(null)
  }, [index])


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
