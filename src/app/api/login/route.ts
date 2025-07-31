import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const { name } = await request.json()
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  let user = await prisma.user.findFirst({ where: { name } })
  if (!user) {
    user = await prisma.user.create({ data: { name } })
  }

  const session = await prisma.session.create({
    data: {
      phase: 'QUIZ',
      currentQuestionIndex: 0,
      status: 'WAITING',
    },
  })

  return NextResponse.json({ user, session })
}
