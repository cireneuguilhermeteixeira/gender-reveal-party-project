'use client'

import { useMemo, useState } from 'react'
import { stripAccents } from '@/lib/utils'

const WORD = 'parto'
const NORMALIZED_WORD = stripAccents(WORD)
const MAX_ATTEMPTS = 5
const TYPING_COLOR = 'bg-blue-500' // cor enquanto digita a linha atual

function getLetterColor(letter: string, index: number) {
  const normalizedLetter = stripAccents(letter)
  if (normalizedLetter === NORMALIZED_WORD[index]) return 'bg-green-500'
  if (NORMALIZED_WORD.includes(normalizedLetter)) return 'bg-yellow-500'
  return 'bg-gray-500'
}

type KeyboardKey = string | '{back}' | '{enter}'

const KB_ROWS: KeyboardKey[][] = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L','Ç'],
  ['{back}','Z','X','C','V','B','N','M','{enter}'],
]

export default function TermoPage() {
  const [attempts, setAttempts] = useState<string[]>([]);
  const [colorsByRow, setColorsByRow] = useState<string[][]>([]);
  const [currentAttempt, setCurrentAttempt] = useState('');
  const [won, setWon] = useState(false);

  const disabled = won || attempts.length >= MAX_ATTEMPTS
  const wordLen = WORD.length

  const letterStatuses = useMemo(() => {
    const status = new Map<string, 'correct' | 'present' | 'absent'>()
    attempts.forEach((att, rowIdx) => {
      for (let i = 0; i < att.length; i++) {
        const ch = stripAccents(att[i]).toUpperCase()
        const color = colorsByRow[rowIdx]?.[i] ?? ''
        const rank =
          color.includes('green') ? 3 :
          color.includes('yellow') ? 2 :
          color.includes('gray') ? 1 : 0
        const prev =
          status.get(ch) === 'correct' ? 3 :
          status.get(ch) === 'present' ? 2 :
          status.get(ch) === 'absent' ? 1 : 0
        if (rank > prev) {
          status.set(
            ch,
            rank === 3 ? 'correct' : rank === 2 ? 'present' : 'absent'
          )
        }
      }
    })
    return status
  }, [attempts, colorsByRow])

  function commitAttempt() {
    if (disabled) return
    if (currentAttempt.length !== wordLen) return

    const g = currentAttempt.toLowerCase()
    const revealedColors: string[] = Array.from({ length: wordLen }, (_, i) =>
      getLetterColor(g[i] ?? '', i)
    )

    const nextAttempts = [...attempts, g]
    const nextColors = [...colorsByRow, revealedColors]

    setAttempts(nextAttempts)
    setColorsByRow(nextColors)
    setCurrentAttempt('')

    if (stripAccents(g) === NORMALIZED_WORD) setWon(true)
  }

  function handleKeyPress(key: KeyboardKey) {
    if (disabled) return

    if (key === '{back}') {
      if (currentAttempt.length > 0) {
        setCurrentAttempt(currentAttempt.slice(0, -1))
      }
      return
    }
    if (key === '{enter}') {
      commitAttempt()
      return
    }

    const letter = String(key)
    if (/^[A-Za-zÀ-ÖØ-öø-ÿÇç]$/.test(letter) && currentAttempt.length < wordLen) {
      setCurrentAttempt(prev => (prev + letter).toLowerCase())
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold">Termo</h1>

      <div className="grid gap-2">
        {Array.from({ length: MAX_ATTEMPTS }).map((_, row) => {
          const isRevealed = row < attempts.length
          const isCurrent = row === attempts.length && !disabled
          const attempt = isRevealed ? attempts[row] : isCurrent ? currentAttempt : ''
          const rowColors = isRevealed
            ? colorsByRow[row]
            : isCurrent
              ? Array.from({ length: attempt.length }, () => TYPING_COLOR)
              : []

          return (
            <div key={row} className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${wordLen}, minmax(0, 1fr))` }}>
              {Array.from({ length: wordLen }).map((_, i) => {
                const letter = attempt[i] || ''
                const color = letter
                  ? (rowColors[i] || TYPING_COLOR)
                  : 'bg-gray-200 dark:bg-gray-800'
                return (
                  <div
                    key={i}
                    className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border text-white font-bold uppercase ${color} rounded`}
                  >
                    {letter}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={() => setCurrentAttempt('')}
          disabled={disabled || currentAttempt.length === 0}
          className="bg-slate-500 text-white px-3 py-2 rounded disabled:opacity-50"
        >
          Limpar
        </button>
        <button
          onClick={commitAttempt}
          disabled={disabled || currentAttempt.length !== wordLen}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Enviar
        </button>
      </div>

      <div className="mt-2 select-none">
        {KB_ROWS.map((row, idx) => (
          <div key={idx} className="flex justify-center gap-1 mb-2">
            {row.map((key) => {
              const isAction = key === '{back}' || key === '{enter}'
              const label =
                key === '{back}' ? '⌫' :
                key === '{enter}' ? '↵' : key

              let keyColor = 'bg-slate-300 dark:bg-slate-700 text-black dark:text-white'
              if (!isAction && letterStatuses.size) {
                const status = letterStatuses.get(String(key).toUpperCase())
                if (status === 'correct') keyColor = 'bg-green-500 text-white'
                else if (status === 'present') keyColor = 'bg-yellow-500 text-black'
                else if (status === 'absent') keyColor = 'bg-gray-500 text-white'
              }

              return (
                <button
                  key={String(key)}
                  onClick={() => handleKeyPress(key)}
                  disabled={disabled && key !== '{back}' && key !== '{enter}'}
                  className={`px-3 py-3 rounded font-semibold ${isAction ? 'min-w-16' : 'min-w-9'} ${keyColor} disabled:opacity-50`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {(won || attempts.length >= MAX_ATTEMPTS) && (
        <p className="mt-2 text-center">
          {won ? 'Parabéns! Você acertou.' : `A palavra era "${WORD}".`}
        </p>
      )}
    </main>
  )
}
