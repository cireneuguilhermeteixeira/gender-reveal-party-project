import type { NextApiRequest, NextApiResponse } from 'next'
import { initSocket } from '@/server/socket'
import type { Server as HTTPServer } from 'http'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const server = res.socket.server as unknown as HTTPServer & {
    io?: boolean
  }
  if (!server.io) {
    initSocket(server)
    server.io = true
  }
  res.end()
}
