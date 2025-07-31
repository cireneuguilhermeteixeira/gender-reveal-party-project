import { Server as IOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import prisma from '@/lib/prisma'

const globalForSocket = global as unknown as { io?: IOServer }

export function initSocket(server: HTTPServer) {
  if (!globalForSocket.io) {
    const io = new IOServer(server, { path: '/api/socket/io' })

    io.on('connection', socket => {
      socket.on('join', (name: string) => {
        socket.data.name = name
        io.emit('user-joined', name)
      })

      socket.on('start-quiz', () => {
        io.emit('start-quiz')
      })

      socket.on(
        'answer',
        async (data: {
          userId: string
          sessionId: string
          questionId: string
          selectedIndex: number
          timeTaken: number
        }) => {
          const { userId, sessionId, questionId, selectedIndex, timeTaken } = data
          const question = await prisma.question.findUnique({ where: { id: questionId } })
          if (!question) return
          const isCorrect = question.correctIndex === selectedIndex
          const remaining = Math.max((question.timeLimit ?? 0) - timeTaken, 0)
          const points = isCorrect ? remaining : 0

          const existing = await prisma.score.findFirst({
            where: { userId, sessionId, phase: 'QUIZ' },
          })

          await (existing
            ? prisma.score.update({
                where: { id: existing.id },
                data: { points: existing.points + points },
              })
            : prisma.score.create({
                data: { userId, sessionId, points, phase: 'QUIZ' },
              }))

          const scores = await prisma.score.findMany({
            where: { sessionId, phase: 'QUIZ' },
            include: { user: true },
            orderBy: { points: 'desc' },
          })
          io.emit(
            'ranking',
            scores.map(s => ({ name: s.user.name, points: s.points }))
          )
        }
      )
    })

    globalForSocket.io = io
  }
  return globalForSocket.io!
}

export function getSocket() {
  if (!globalForSocket.io) {
    throw new Error('Socket.io not initialized')
  }
  return globalForSocket.io!
}
