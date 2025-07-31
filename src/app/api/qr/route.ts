import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { toDataURL } from 'qrcode'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const { clue, points = 0 } = await request.json()
  if (!clue) {
    return NextResponse.json({ error: 'Clue is required' }, { status: 400 })
  }

  const token = randomUUID()
  await prisma.qrClue.create({ data: { token, clue, points } })

  const url = `${request.nextUrl.origin}/qr/${token}`
  const qr = await toDataURL(url)

  return NextResponse.json({ token, qr })
}
