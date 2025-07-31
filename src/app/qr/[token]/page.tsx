import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'

interface Props {
  params: { token: string }
}

export default async function QrPage({ params }: Props) {
  const qr = await prisma.qrClue.findUnique({ where: { token: params.token } })
  if (!qr) notFound()

  if (!qr.used) {
    await prisma.qrClue.update({ where: { id: qr.id }, data: { used: true } })
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Nova Pista</h1>
      <p className="whitespace-pre-line">{qr.clue}</p>
      {qr.points > 0 && <p className="mt-4">Pontos: {qr.points}</p>}
    </div>
  )
}
