import { Phase, Prisma, Question, Session } from "@prisma/client";

const QUIZ_PHASES_SIZE = 8;

type QuestionJson = Question & { current?: boolean };
type SessionState = { phase: Phase; questions: QuestionJson[], currentQuestionIndex: string };

const PHASE_ORDER: Phase[] = [
  "WAITING_FOR_PLAYERS",
  ...Array.from({ length: QUIZ_PHASES_SIZE }, (_, i) =>
    (["PREPARING", "ANSWERING", "RESULTS"] as const).map(
      k => `QUIZ_${i + 1}_${k}` as Phase
    )
  ).flat(),
  "TERMO_PREPARING",
  "TERMO_1_ANSWERING", "TERMO_1_RESULTS",
  "TERMO_2_ANSWERING", "TERMO_2_RESULTS",
  "TERMO_3_ANSWERING", "TERMO_3_RESULTS",
  "FINAL",
];

export const isQuizPreparing = (p?: Phase) => /^QUIZ_\d+_PREPARING$/.test(p || '');
export const isQuizAnswering = (p?: Phase) => /^QUIZ_\d+_ANSWERING$/.test(p || '');
export const isQuizResults   = (p?: Phase) => /^QUIZ_\d+_RESULTS$/.test(p || '');

// phase helpers
export const isTermoPreparing = (p?: Phase) => p === 'TERMO_PREPARING'
export const isTermoAnswering = (p?: Phase) => /^TERMO_\d+_ANSWERING$/.test(String(p))
export const isTermoResults   = (p?: Phase) => /^TERMO_\d+_RESULTS$/.test(String(p))


export type SessionWithUsers = Prisma.SessionGetPayload<{
  include: { User: true; UserAnswer: true; currentQuestion: true }
}>;

export type QuestionOptions = string[];

export function parseOptions(options: Prisma.JsonValue | null | undefined): QuestionOptions {
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options)
      return Array.isArray(parsed)
        ? parsed.filter((o: unknown): o is string => typeof o === 'string')
        : []
    } catch {
      return []
    }
  }
  if (Array.isArray(options)) {
    return options.filter((o: unknown): o is string => typeof o === 'string')
  }
  return []
}

export const isFinalPhase = (phase?: Phase) => phase != null && String(phase).toUpperCase().endsWith('FINAL')


export function getNextPhase(state: Session): SessionState {
  const { phase, currentQuestionIndex: currentQuestionId } = state;

  const questions: QuestionJson[] = state.questions as unknown as QuestionJson[] || [];


  const i = PHASE_ORDER.indexOf(phase);
  if (i < 0 || i === PHASE_ORDER.length - 1) return {
    phase, questions, currentQuestionIndex: currentQuestionId
  }; // inválido ou já na última

  const next = PHASE_ORDER[i + 1];

  // decidir se mexe nas perguntas
  const moveFirst = phase === "WAITING_FOR_PLAYERS";

  // zera current
  const currentQuestionIndex = questions.findIndex(q => q.current) || 0;

  const questionCleared = questions.map(q => ({ ...q, current: false }));

  if (moveFirst) {
    questionCleared[0].current = true;
    return { phase: next, questions: questionCleared,currentQuestionIndex: currentQuestionId };
  }

  // moveNext
  if (isQuizResults(phase) && currentQuestionIndex < questions.length - 1) {
    questionCleared[currentQuestionIndex + 1].current = true;
    return {
      phase: next,
      questions: questionCleared,
      currentQuestionIndex: questionCleared[currentQuestionIndex + 1]?.id || '' };
    }

  questionCleared[currentQuestionIndex].current = true;
  // acabou as perguntas — aqui apenas não marca ninguém (ou ajuste para pular para TERMO, se quiser)
  return { 
    phase: next,
    questions: questionCleared,
    currentQuestionIndex: currentQuestionId
  };
}
