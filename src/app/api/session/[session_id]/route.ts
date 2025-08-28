/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Phase, Question } from '@prisma/client';



export async function GET(_: unknown, { params }: any) {
  const { session_id } = params;

  if (!session_id) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
  }

  const session = await prisma.session.findUnique({
    where: { id: session_id },
    include: { User: true, UserAnswer: true, currentQuestion: true },
  });

  return NextResponse.json(session);
}


export async function PUT(req: NextRequest, { params }: any) {
  const { session_id } = params;
  
  if (!session_id) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
  }

  const body = await req.json();
  const { phase, currentQuestionIndex, questions } : { phase : Phase, currentQuestionIndex: string, questions: Question } = body;
  
  if (!phase || !currentQuestionIndex || !questions) {
    return NextResponse.json({ error: 'Some fields are missing' }, { status: 400 })
  }


  try {
    const updated = await prisma.session.update({
      where: { id: session_id },
      data: {
        phase,
        currentQuestionIndex,
        questions
      },
      include: { User: true, UserAnswer: true, currentQuestion: true },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
}
