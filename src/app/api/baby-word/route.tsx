// app/api/baby-word/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Todas com 5 letras, ASCII-only (sem acento)
const WORDS = [
  "mamae", // mamãe
  "parto",
  "filho",
  "leite",
  "utero", // útero
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
