import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


const WORDS = [
  "mamae",
  "papai",
  "parto",
  "filho",
  "leite",
  "utero",
  "choro",
  "mamar",
  "ninar",
  "berco", // berço
  "banho",
  "troca", // trocar fralda
  "doula",
  "bolsa", // bolsa amniotica
  "sling", // suporte de bebe
  "bebes"
] as const;

function pickRandomDifferent(excludeIndex: number | null): { index: number; word: string } {
  const size = WORDS.length;

  // se nao foi informado exclude, apenas sorteia
  if (excludeIndex == null || excludeIndex < 0 || excludeIndex >= size) {
    const i = Math.floor(Math.random() * size);
    return { index: i, word: WORDS[i] };
  }


  let i = excludeIndex;
  while (i === excludeIndex) {
    i = Math.floor(Math.random() * size);
  }
  return { index: i, word: WORDS[i] };
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const{
      userId,
      sessionId,
      index
    } = body;

    if (!sessionId || !userId || index == null || Number.isNaN(Number(index))) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

     const [user, session] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.session.findUnique({ where: { id: sessionId } }),
      ]);

      if (!user)    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    

    return NextResponse.json({
      index,
      word: WORDS[index],
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to pick word" }, { status: 500 });
  }
}


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const excludeIndexParam = searchParams.get("excludeIndex");
    const excludeIndex = excludeIndexParam != null ? Number(excludeIndexParam) : null;

    const { index, word } = pickRandomDifferent(
      Number.isFinite(excludeIndex as number) ? (excludeIndex as number) : null
    );

    return NextResponse.json({
      index,
      word,
      total: WORDS.length
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to pick word" }, { status: 500 });
  }
}
