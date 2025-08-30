import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {

  await prisma.question.deleteMany()

  await prisma.question.createMany({
    data: [
      {
        text: "Qual a nossa cidade natal?",
        options: JSON.stringify(["Ambos de Fortaleza", "Sobral e Caucaia", "Santana do Acaraú e Caucaia", "Sobral e Paraipaba"]),
        correctIndex: 1,
        timeLimit: 15,
      },
      {
        text: "Onde ou por onde nos conhecemos?",
        options: JSON.stringify(["Tinder", "Instagram", "Igreja", "Na praia"]),
        correctIndex: 0,
        timeLimit: 15,
      },
      {
        text: "Em Agosto de 2025, quantos anos de namoro fizemos?",
        options: JSON.stringify([
          "4",
          "6",
          "5",
          "3",
        ]),
        correctIndex: 2,
        timeLimit: 15,
      },
      {
        text: "Qual a comida nós estranhamente não gostamos?",
        options: JSON.stringify(["Amendoim e beterraba", "Açaí e sushi", "Beringela e Miojo", "Suco de goiaba e repolho"]),
        correctIndex: 0,
        timeLimit: 15,
      },
      {
        text: "Qual foi o nosso primeiro emprego formal/informal?",
        options: JSON.stringify(["Aula particular e vendedora de seguros", "Técnico de Computadores e vendedora de plano de internet", "Programador e Recursos Humanos", "Entregador de Panfletos e Gerente de Locadora de Video Game"]),
        correctIndex: 3,
        timeLimit: 15,
      },
      {
        text: "Onde foi o local que há grandes indícios do bebê ter sido gerado?",
        options: JSON.stringify([
          "Fortaleza",
          "Barreirinhas",
          "Caucaia",
          "Paraipaba",
        ]),
        correctIndex: 1,
        timeLimit: 15,
      },
      {
        text: "Qual foi o primeiro presente que nosso(a) bebê ganhou?",
        options: JSON.stringify(["Par de meia", "Macacão", "Bolsa Canguru", "RTX 4090"]),
        correctIndex: 0,
        timeLimit: 15,
      },
      
      {
        text: "Qual o nome das nossas filhas adotivas?",
        options: JSON.stringify(["Mel e Lua", "Solange e Estrela", "Sol e Lua", "Sol e Estrela"]),
        correctIndex: 2,
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
