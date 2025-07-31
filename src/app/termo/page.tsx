'use client'

import { useState } from 'react'

const WORD = 'parto'
const MAX_ATTEMPTS = 5

function getLetterColor(letter: string, index: number) {
  if (letter === WORD[index]) return 'bg-green-500'
  if (WORD.includes(letter)) return 'bg-yellow-500'
  return 'bg-gray-500'
}

export default function TermoPage() {
  const [attempts, setAttempts] = useState<string[]>([])
  const [guess, setGuess] = useState('')
  const [won, setWon] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (guess.length !== WORD.length || won || attempts.length >= MAX_ATTEMPTS) return
    const g = guess.toLowerCase()
    setAttempts([...attempts, g])
    setGuess('')
    if (g === WORD) setWon(true)
  }

  const disabled = won || attempts.length >= MAX_ATTEMPTS

  return (
    <main className="min-h-screen flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold">Termo</h1>
      <div className="grid gap-2">
        {Array.from({ length: MAX_ATTEMPTS }).map((_, row) => {
          const attempt = attempts[row] || ''
          return (
            <div key={row} className="grid grid-cols-5 gap-1">
              {Array.from({ length: WORD.length }).map((_, i) => {
                const letter = attempt[i] || ''
                const color = attempt
                  ? getLetterColor(letter, i)
                  : 'bg-gray-200 dark:bg-gray-800'
                return (
                  <div
                    key={i}
                    className={`w-10 h-10 flex items-center justify-center border text-white font-bold uppercase ${color}`}
                  >
                    {letter}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
        <input
          type="text"
          value={guess}
          onChange={e => setGuess(e.target.value)}
          maxLength={WORD.length}
          disabled={disabled}
          className="border p-2 text-center uppercase"
        />
        <button
          type="submit"
          disabled={disabled}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
      {disabled && (
        <p className="mt-2">
          {won ? 'Parabéns! Você acertou.' : `A palavra era "${WORD}".`}
        </p>
      )}
    </main>
  )
}
