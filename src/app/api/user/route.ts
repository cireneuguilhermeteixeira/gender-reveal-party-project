import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Params = { params: { session_id: string, user_id: string } }


export async function POST(req: NextRequest, { params }: Params) {

  const { session_id } = params;
  const { name } : { name : string } = await req.json();

  const user = await prisma.user.create({
    data: {
      name,
      sessionId: session_id,
    }
  });

  return NextResponse.json(user);
}



export async function GET(_ : unknown, { params }: Params) {
  
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


export async function PUT(req: NextRequest, { params }: Params) {
  const { user_id } = params;
  const { points } : { points : number } = await req.json();

  try {
    const updated = await prisma.user.update({
      where: { id: user_id },
      data: {
       points,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
}
