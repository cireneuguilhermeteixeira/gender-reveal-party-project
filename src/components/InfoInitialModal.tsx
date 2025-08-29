import { useEffect, useRef, useState } from "react"

function InfoInitialModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: (dontShowAgain: boolean) => void
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const firstBtnRef = useRef<HTMLButtonElement | null>(null)


  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const t = setTimeout(() => firstBtnRef.current?.focus(), 0)
      return () => {
        document.body.style.overflow = prev
        clearTimeout(t)
      }
    }
  }, [open])


  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(dontShowAgain)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, dontShowAgain])


  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      className="fixed inset-0 z-50 grid place-items-center p-4"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => onClose(dontShowAgain)}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="rounded-t-3xl bg-gradient-to-r from-rose-100 via-amber-100 to-sky-100 px-6 py-4">
          <h2 id="intro-title" className="text-xl font-extrabold text-slate-800">
            Operação Berço — <span className="font-bold">O Caso do Pequeno Segredo</span>
          </h2>
          <p className="text-sm text-slate-600">Guia rápido para o Host</p>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-5 text-slate-700">
          {/* Lore enxuta e prática */}
          <p className="mb-3">
            Hoje todos são <strong>detetives convidados</strong>. O casal chamou a equipe para
            resolver o mistério mais doce do ano: <em>quem está chegando?</em> Hoje todos são detetives convidados. O casal contratou a turma para resolver o maior 
            mistério da temporada: <em>quem está chegando—um menino ou uma menina?</em>
          </p>

          <p className="mb-3">
            Para isso, abrimos o dossiê Operação Berço. 
            Há pistas, códigos e um cofre final com o veredito.
            Só se chega lá somando acertos ejuntando evidências.
          </p>

          <h3 className="mt-4 font-bold">Como funciona</h3>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>
              <strong>10 Pistas (quiz)</strong>: cada pergunta autentica uma evidência no{' '}
              <em>Quadro de Evidências</em> (seu placar). Cada pergunta é um “trabalho de detetive” diferente.
            </li>
            <li>
              <strong>3 Codenomes (termo)</strong>: três palavras do universo bebê/parentalidade
              (ex.: <em>fralda</em>, <em>colo</em>, <em>ninar</em>). Decifrar as três palavras fornece a combinação do cofre que guarda a revelação. Sem o código, o mandado não executa. Com ele, o Chefe de Investigação pode girar a fechadura.
            </li>
            <li>
              Juntando <strong>10 evidências</strong> + <strong>3 selos</strong>, o cofre pode ser
              aberto e a <strong>revelação</strong> acontece.
            </li>
          </ul>

          <h3 className="mt-4 font-bold">Papéis</h3>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>
              <strong>Host (você)</strong>: apresenta as perguntas, dá as dicas do termo e abre o cofre.
            </li>
            <li>
              <strong>Players</strong>: respondem, marcam pontos e ajudam a quebrar os códigos.
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <label className="flex items-center gap-2 text-sm text-slate-600 select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-300"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            Não mostrar novamente
          </label>

          <div className="flex items-center gap-2">
            <button
              ref={firstBtnRef}
              onClick={() => onClose(dontShowAgain)}
              className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:brightness-110 active:scale-[0.98]"
            >
              Entendi, vamos lá!
            </button>
          </div>
        </div>

        {/* Fechar */}
        <button
          aria-label="Fechar"
          onClick={() => onClose(dontShowAgain)}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/80 text-slate-700 shadow hover:bg-white"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default InfoInitialModal;