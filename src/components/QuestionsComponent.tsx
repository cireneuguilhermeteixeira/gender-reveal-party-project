'use client';

import { isQuizAnswering, SessionWithUsers } from "@/lib/sessionPhase";

type QuestionComponentProps = {
  options: string[];
  selectedIndex: number | null;
  handleAnswer: (index: number) => void;
  submitted: boolean;
  correctIdx: number | null;
  showResultColors: boolean;
  session: SessionWithUsers;
  timeLeft: number | null;
};

function QuestionComponent({
  options,
  selectedIndex,
  handleAnswer,
  submitted,
  correctIdx,
  showResultColors,
  session,
  timeLeft,
}: QuestionComponentProps) {
  // 4 cores suaves (tema kids)
  const baseBg = ['bg-rose-200', 'bg-sky-200', 'bg-amber-200', 'bg-emerald-200'] as const;
  const baseHover = ['hover:bg-rose-300', 'hover:bg-sky-300', 'hover:bg-amber-300', 'hover:bg-emerald-300'] as const;
  const baseDisabled = ['bg-rose-100', 'bg-sky-100', 'bg-amber-100', 'bg-emerald-100'] as const;
  const baseSelected = ['ring-2 ring-rose-300', 'ring-2 ring-sky-300', 'ring-2 ring-amber-300', 'ring-2 ring-emerald-300'] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((opt, i) => {
        const isSelected = selectedIndex === i;
        const disabled =
          submitted || !isQuizAnswering(session.phase) || (timeLeft ?? 0) <= 0;

        const bg = disabled ? baseDisabled[i % 4] : baseBg[i % 4];
        const hover = disabled ? '' : baseHover[i % 4];
        const ring = isSelected ? baseSelected[i % 4] : '';

        // Texto mais escuro, legível e com foco acessível
        const common =
          'group px-4 py-3 rounded-2xl text-left transition border border-slate-200 shadow-sm ' +
          'text-slate-900 font-semibold tracking-tight ' + // <- mais escuro + melhor legibilidade
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white ' +
          'active:scale-[0.99]';

        // Em RESULTS: destaque correta/errada com anel
        let resultRing = '';
        if (showResultColors) {
          if (i === correctIdx) resultRing = 'ring-2 ring-emerald-400';
          else if (isSelected && i !== correctIdx) resultRing = 'ring-2 ring-rose-400';
        }

        return (
          <button
            key={`${i}-${opt}`}
            onClick={() => handleAnswer(i)}
            disabled={disabled}
            aria-pressed={isSelected}
            aria-disabled={disabled}
            className={`${common} ${bg} ${hover} ${ring} ${resultRing}`}
          >
            <span
              className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-slate-700 text-xs font-bold shadow-sm"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <span className="align-middle text-base md:text-lg leading-snug">
              {opt}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default QuestionComponent;
