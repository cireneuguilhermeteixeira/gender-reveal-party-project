import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';



export async function POST() {
  const questions = await prisma.question.findMany({
    take: 8
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
