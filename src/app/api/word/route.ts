import { NextResponse } from 'next/server'
import words from '@/lib/words'

export async function GET() {
  const word = words[Math.floor(Math.random() * words.length)]
  return NextResponse.json({ word })
}
