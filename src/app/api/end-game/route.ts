import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const { userId, sessionId, points, phase } = await request.json()

  if (!userId || !sessionId || typeof points !== 'number' || !phase) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const existing = await prisma.score.findFirst({
    where: { userId, sessionId, phase },
  })

  const score = existing
    ? await prisma.score.update({
        where: { id: existing.id },
        data: { points },
      })
    : await prisma.score.create({
        data: { userId, sessionId, points, phase },
      })

  return NextResponse.json({ score })
}
