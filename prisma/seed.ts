import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const questions = [
    {
      text: 'What color is the sky?',
      options: ['Blue', 'Green', 'Red', 'Yellow'],
      answer: 'Blue',
      timeLimit: 30,
    },
    {
      text: 'Which animal barks?',
      options: ['Cat', 'Dog', 'Cow', 'Fish'],
      answer: 'Dog',
      timeLimit: 30,
    },
  ]

  for (const question of questions) {
    await prisma.question.upsert({
      where: { text: question.text },
      update: {},
      create: question,
    })
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
