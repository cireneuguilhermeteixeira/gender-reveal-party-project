import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


export async function POST(req: NextRequest) {

  const { name, sessionId } : { name : string, sessionId: string } = await req.json();

  if(!name || !sessionId) {
    return NextResponse.json({ error: 'Session ID and Name is required' }, { status: 400 })
  }

  const user = await prisma.user.create({
    data: {
      name,
      sessionId,
    }
  });

  return NextResponse.json(user);
}
