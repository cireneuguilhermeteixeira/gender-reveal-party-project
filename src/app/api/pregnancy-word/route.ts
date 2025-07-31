import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import pregnancyWords from '@/lib/pregnancyWords'

export async function POST(request: NextRequest) {
  const { userId } = await request.json()
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (user.pregnancyWord) {
    return NextResponse.json({ word: user.pregnancyWord })
  }

  const assigned = await prisma.user.findMany({
    where: { pregnancyWord: { not: null } },
    select: { pregnancyWord: true },
  })
  const used = new Set(assigned.map((u) => u.pregnancyWord as string))
  const available = pregnancyWords.filter((w) => !used.has(w))
  if (available.length === 0) {
    return NextResponse.json({ error: 'No words available' }, { status: 500 })
  }

  const word = available[Math.floor(Math.random() * available.length)]
  await prisma.user.update({ where: { id: userId }, data: { pregnancyWord: word } })

  return NextResponse.json({ word })
}
