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
      {
        text: "Qual é o maior planeta do Sistema Solar?",
        options: JSON.stringify(["Terra", "Saturno", "Júpiter", "Netuno"]),
        correctIndex: 2, // Júpiter
        timeLimit: 15,
      },
      {
        text: "Quem pintou a Mona Lisa?",
        options: JSON.stringify([
          "Michelangelo",
          "Leonardo da Vinci",
          "Van Gogh",
          "Pablo Picasso",
        ]),
        correctIndex: 1, // Leonardo da Vinci
        timeLimit: 15,
      },
      {
        text: "Qual é o elemento químico representado pela letra 'O'?",
        options: JSON.stringify(["Ouro", "Oxigênio", "Ósmio", "Ozônio"]),
        correctIndex: 1, // Oxigênio
        timeLimit: 10,
      },
      {
        text: "Em que continente fica o Egito?",
        options: JSON.stringify(["África", "Ásia", "Europa", "América"]),
        correctIndex: 0, // África
        timeLimit: 10,
      },
      {
        text: "Quem foi o primeiro presidente do Brasil?",
        options: JSON.stringify([
          "Getúlio Vargas",
          "Deodoro da Fonseca",
          "Floriano Peixoto",
          "Dom Pedro II",
        ]),
        correctIndex: 1, // Deodoro da Fonseca
        timeLimit: 20,
      },
      {
        text: "Qual é a moeda oficial do Japão?",
        options: JSON.stringify(["Yen", "Won", "Dólar", "Peso"]),
        correctIndex: 0, // Yen
        timeLimit: 15,
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
