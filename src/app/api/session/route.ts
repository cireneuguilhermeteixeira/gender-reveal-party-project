import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Phase, Question } from '@prisma/client';

type Params = { params: { session_id: string } }


export async function POST() {
  const questions = await prisma.question.findMany({
    take: 10
  });

  if (!questions.length) {
    return NextResponse.json({ error: 'No questions available' }, { status: 404 });
  }

  const session = await prisma.session.create({
    data: {
      currentQuestionIndex: questions[0].id,
      questions: questions.map((q, i) => {
          return {
            ...q,
            current: i === 0
          };
      }),
    }
  });

  return NextResponse.json(session)
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

  return NextResponse.json(session);
}


export async function PUT(req: NextRequest, { params }: Params) {
  const { session_id } = params;
  
  if (!session_id) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
  }

  const body = await req.json();
  const { phase, currentQuestionIndex, questions } : { phase : Phase, currentQuestionIndex: string, questions: Question } = body;
 

  try {
    const updated = await prisma.session.update({
      where: { id: session_id },
      data: {
        phase,
        currentQuestionIndex,
        questions
      },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
}
