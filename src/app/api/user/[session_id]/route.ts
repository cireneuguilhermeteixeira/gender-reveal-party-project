/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


export async function GET(_ : unknown, { params }: any) {
  
  const { session_id } = params;

  if (!session_id) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
  }
  const users = await prisma.user.findMany({
    where: { id: session_id },
    include: { session: true },
  });

  return NextResponse.json(users);
}


export async function PUT(req: NextRequest, { params }: any) {
  const { session_id } = params;
  const { points, userId } : { points : number, userId: string } = await req.json();

  if(! userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId, sessionId: session_id },
      data: {
       points,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
}
