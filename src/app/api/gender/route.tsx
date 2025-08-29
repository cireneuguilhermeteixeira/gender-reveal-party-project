import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ID fixo para manter um único registro
const SINGLETON_ID = '00000000-0000-0000-0000-000000000001'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as { value?: unknown } | null
    const raw = typeof body?.value === 'string' ? body.value.trim().toLowerCase() : null

    if (raw !== 'boy' && raw !== 'girl') {
      return NextResponse.json(
        { error: 'Invalid value. Use "boy" or "girl".' },
        { status: 400 }
      )
    }

    const genderBase64 = Buffer.from(raw, 'utf8').toString('base64')

    const saved = await prisma.gender.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, genderBase64 },
      update: { genderBase64 },
      select: { id: true, genderBase64: true },
    })

    return NextResponse.json({
      ok: true,
      id: saved.id,
      valueBase64: saved.genderBase64,
    })
  } catch (err) {
    console.error('[POST /api/gender] error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const row = await prisma.gender.findUnique({
      where: { id: SINGLETON_ID },
      select: { genderBase64: true },
    })

    if (!row) {
      return NextResponse.json({ gender: null })
    }

    let decoded = ''
    try {
      decoded = Buffer.from(row.genderBase64, 'base64').toString('utf8')
    } catch {
      return NextResponse.json(
        { gender: null, error: 'invalid_base64' },
        { status: 500 }
      )
    }

    if (decoded !== 'boy' && decoded !== 'girl') {
      return NextResponse.json(
        { gender: null, error: 'invalid_value' },
        { status: 500 }
      )
    }

    return NextResponse.json({ gender: decoded })
  } catch (err) {
    console.error('[GET /api/gender] error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
