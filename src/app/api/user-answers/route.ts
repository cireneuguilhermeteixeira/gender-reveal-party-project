import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MAX_POINTS = 1000;

function computeScore(isCorrect: boolean, timeTaken: number, timeLimit: number): number {
  if (!isCorrect) return 0;
  if (timeLimit <= 0) return 0; // sanity
  const ratio = 1 - timeTaken / timeLimit;
  const raw = Math.max(0, Math.min(1, ratio));
  return Math.round(MAX_POINTS * raw);
}

export async function POST(req: NextRequest) {
  try {
    const { 
      userId,
      sessionId,
      timeTaken,
      questionId,
      selectedIndex,
      answerType,
      termoWordIndex,
      justWon,
      attempts 
    } = await req.json();

    if (answerType === 'quiz' && 
      (
        !userId || !sessionId || 
        !questionId || 
        typeof selectedIndex !== 'number' || 
        typeof timeTaken !== 'number')
      ) {
      return NextResponse.json({ error: 'Invalid payload in quiz.' }, { status: 400 });
    }

     if (answerType === 'termo' && 
      ( 
        !userId || !sessionId || 
        typeof timeTaken !== 'number' ||
        typeof termoWordIndex !== 'number' ||
        typeof justWon !== 'boolean' ||
        !Array.isArray(attempts))
      ) {
      return NextResponse.json({ error: 'Invalid payload in termo.' }, { status: 400 });
    }

    if (answerType === 'termo') {
      const [user, session] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.session.findUnique({ where: { id: sessionId } }),
      ]);

      if (!user)    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });

      const isCorrect = justWon;
      const timeLimit = 60; // fixed time limit for termo

      const clampedTime = Math.max(0, Math.min(timeTaken, timeLimit)) - attempts.length * 5;
      const pointsEarned = computeScore(isCorrect, clampedTime, timeLimit);

      const [createdAnswer, updatedUser] = await prisma.$transaction([
        prisma.userAnswer.create({
          data: {
            userId,
            sessionId,
            questionId: undefined,
            selectedIndex: termoWordIndex,
            timeTaken: clampedTime,
            isCorrect,
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { points: { increment: pointsEarned } },
        }),
      ]);

      return NextResponse.json({
        ok: true,
        answer: createdAnswer,
        isCorrect,
        pointsEarned,
        userTotalPoints: updatedUser.points,
      });
    }

    const [user, session, question] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.session.findUnique({ where: { id: sessionId } }),
      prisma.question.findUnique({ where: { id: questionId } }),
    ]);

    if (!user)    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    if (!question) return NextResponse.json({ error: 'Question not found.' }, { status: 404 });


    if (session.currentQuestionIndex !== question.id) {
      return NextResponse.json({ error: 'Question is not the current one for this session.' }, { status: 409 });
    }

    const existing = await prisma.userAnswer.findFirst({
      where: { userId, sessionId, questionId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'Answer already submitted.' }, { status: 409 });
    }

    const isCorrect = selectedIndex === question.correctIndex;
    const timeLimit = question.timeLimit ?? 15;

    const clampedTime = Math.max(0, Math.min(timeTaken, timeLimit));
    const pointsEarned = computeScore(isCorrect, clampedTime, timeLimit);

    const [createdAnswer, updatedUser] = await prisma.$transaction([
      prisma.userAnswer.create({
        data: {
          userId,
          sessionId,
          questionId,
          selectedIndex,
          timeTaken: clampedTime,
          isCorrect,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { points: { increment: pointsEarned } },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      answer: createdAnswer,
      isCorrect,
      pointsEarned,
      userTotalPoints: updatedUser.points,
    });
  } catch (err) {
    console.error('POST /api/user-answers error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
