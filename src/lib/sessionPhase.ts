import { Phase, Question, Session } from "@prisma/client";

const QUIZ_PHASES_SIZE = 10;

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
