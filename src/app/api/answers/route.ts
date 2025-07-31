import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const { userId, sessionId, questionId, selectedIndex, timeTaken } = await request.json()

  if (!userId || !sessionId || !questionId || typeof selectedIndex !== 'number' || typeof timeTaken !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Fetch question to verify answer
  const question = await prisma.question.findUnique({ where: { id: questionId } })
  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  const isCorrect = question.correctIndex === selectedIndex
  const remainingTime = Math.max((question.timeLimit ?? 0) - timeTaken, 0)
  const multiplier = question.multiplier ?? 1
  const points = isCorrect ? remainingTime * multiplier : 0

  // Record user answer
  await prisma.userAnswer.create({
    data: {
      userId,
      sessionId,
      questionId,
      selectedIndex,
      isCorrect,
      timeTaken,
      points,
    },
  })

  // Update or create score entry
  const existingScore = await prisma.score.findFirst({ where: { userId, sessionId, phase: 'QUIZ' } })
  let score
  if (existingScore) {
    score = await prisma.score.update({
      where: { id: existingScore.id },
      data: { points: existingScore.points + points },
    })
  } else {
    score = await prisma.score.create({
      data: {
        userId,
        sessionId,
        points,
        phase: 'QUIZ',
      },
    })
  }

  return NextResponse.json({ score })
}
