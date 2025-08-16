import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST() {

  const firstQuestion = await prisma.question.findFirst();
  if (!firstQuestion) {
    return NextResponse.json({ error: 'No questions available' }, { status: 404 });
  }
  const score = prisma.session.create({
    data: {
      currentQuestionIndex: firstQuestion.id,
    }
  });
  return NextResponse.json({ score })
}



export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { User: true, UserAnswer: true },
  });

  return NextResponse.json({session});
}
