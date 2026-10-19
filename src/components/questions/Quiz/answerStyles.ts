import { lightSlideColor, slideColor } from '../../../lib/presentationTheme'

const QUIZ_SHAPES = ['▲', '◆', '●', '■', '★', '⬟'] as const

export type QuizAnswerStyle = {
  // Resolved from the active presentation theme (slides and phones).
  color: string
  // Fixed light-theme color for host UI outside a slide theme scope.
  lightColor: string
  shape: string
}

export function getQuizAnswerStyle(optionIdx: number): QuizAnswerStyle {
  return {
    color: slideColor(optionIdx),
    lightColor: lightSlideColor(optionIdx),
    shape: QUIZ_SHAPES[optionIdx % QUIZ_SHAPES.length],
  }
}
