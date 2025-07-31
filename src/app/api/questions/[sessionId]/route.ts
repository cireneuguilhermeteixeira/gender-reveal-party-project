import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

interface Question {
  text: string
  options: string[]
  timeLimit: number
}

const QUESTIONS: Question[] = [
  {
    text: 'Placeholder question 1',
    options: ['A', 'B', 'C', 'D'],
    timeLimit: 30,
  },
  {
    text: 'Placeholder question 2',
    options: ['True', 'False'],
    timeLimit: 20,
  },
]

export async function GET(
  _request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const { sessionId } = params

  const session = await prisma.session.findUnique({ where: { id: sessionId } })

  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 404 })
  }

  const question = QUESTIONS[session.currentQuestionIndex]

  if (!question) {
    return NextResponse.json({ error: 'No more questions' }, { status: 404 })
  }

  return NextResponse.json({
    text: question.text,
    options: question.options,
    timeLimit: question.timeLimit,
  })
}
