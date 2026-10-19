export const PRESENTATION_THEMES = ['light', 'dark'] as const

export type PresentationTheme = (typeof PRESENTATION_THEMES)[number]

export function toPresentationTheme(value: unknown): PresentationTheme {
  return value === 'dark' ? 'dark' : 'light'
}

const SLIDE_COLOR_COUNT = 6

// Chart/series color for the nth option, resolved from the active presentation theme.
export function slideColor(index: number) {
  return `var(--slide-c${(index % SLIDE_COLOR_COUNT) + 1})`
}

// Light-theme series colors for host UI swatches outside a slide theme scope.
export const LIGHT_SLIDE_COLORS = ['#ff4500', '#5b47e0', '#0e9fbf', '#12a150', '#f0a202', '#e0457b'] as const

export function lightSlideColor(index: number) {
  return LIGHT_SLIDE_COLORS[index % LIGHT_SLIDE_COLORS.length]
}
