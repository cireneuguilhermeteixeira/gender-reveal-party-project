import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // limpar dados antigos (opcional)
  await prisma.question.deleteMany()

  await prisma.question.createMany({
    data: [
      {
        text: "Qual é a capital da França?",
        options: JSON.stringify(["Londres", "Paris", "Roma", "Berlim"]),
        correctIndex: 1,
        timeLimit: 15,
      },
      {
        text: "Quanto é 7 x 8?",
        options: JSON.stringify(["54", "56", "64", "72"]),
        correctIndex: 1,
        timeLimit: 10,
      },
      {
        text: "Quem escreveu 'Dom Quixote'?",
        options: JSON.stringify([
          "Machado de Assis",
          "Miguel de Cervantes",
          "José Saramago",
          "Eça de Queirós",
        ]),
        correctIndex: 1,
        timeLimit: 20,
      },
      {
        text: "Em que ano o homem pisou na Lua pela primeira vez?",
        options: JSON.stringify(["1965", "1969", "1971", "1973"]),
        correctIndex: 1,
        timeLimit: 20,
      },
    ],
  })

}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
