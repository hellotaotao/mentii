export type QuizAnswerStyle = {
  shape: string
  tileClassName: string
}

const QUIZ_ANSWER_STYLES: QuizAnswerStyle[] = [
  { shape: '▲', tileClassName: 'bg-rose-500 hover:bg-rose-400' },
  { shape: '◆', tileClassName: 'bg-sky-500 hover:bg-sky-400' },
  { shape: '●', tileClassName: 'bg-amber-400 hover:bg-amber-300 text-slate-950' },
  { shape: '■', tileClassName: 'bg-emerald-500 hover:bg-emerald-400' },
  { shape: '★', tileClassName: 'bg-violet-500 hover:bg-violet-400' },
  { shape: '⬟', tileClassName: 'bg-orange-500 hover:bg-orange-400' },
]

export function getQuizAnswerStyle(optionIdx: number) {
  return QUIZ_ANSWER_STYLES[optionIdx % QUIZ_ANSWER_STYLES.length]
}
