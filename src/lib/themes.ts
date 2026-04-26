export type ThemeId = 'punch' | 'aurora' | 'dusk' | 'sage' | 'ink'

export type Theme = {
  id: ThemeId
  label: string
  description: string
  swatch: string
  isDark: boolean

  pageBg: string
  glow: string
  dotGrid: string

  cardBg: string
  cardBorder: string

  inputBg: string
  inputBorder: string
  inputFocusBorder: string
  inputFocusShadow: string

  text1: string
  text2: string
  text3: string

  accent: string
  accentFg: string
  accentHover: string

  success: string
  error: string
  live: string

  optionColors: [string, string, string, string]

  creatorBg: string
  creatorCard: string
  creatorBorder: string
  creatorText: string
  creatorText2: string
  creatorInputBg: string
}

export const THEMES: Record<ThemeId, Theme> = {
  punch: {
    id: 'punch',
    label: 'Punch',
    description: 'Warm · bold',
    swatch: '#ff4500',
    isDark: false,
    pageBg: '#fef8f3',
    glow: '',
    dotGrid: 'rgba(0,0,0,0.04)',
    cardBg: '#ffffff',
    cardBorder: '#ecddd2',
    inputBg: '#fef3ea',
    inputBorder: '#ddc9b8',
    inputFocusBorder: '#ff4500',
    inputFocusShadow: 'rgba(255,69,0,0.15)',
    text1: '#1a0d05',
    text2: '#8a7060',
    text3: '#ecddd2',
    accent: '#ff4500',
    accentFg: '#ffffff',
    accentHover: '#e63e00',
    success: '#059669',
    error: '#dc2626',
    live: '#d97706',
    optionColors: ['#ff4500', '#7c3aed', '#0891b2', '#059669'],
    creatorBg: '#f5ede6',
    creatorCard: '#ffffff',
    creatorBorder: '#e8d5c4',
    creatorText: '#1a0d05',
    creatorText2: '#8a7060',
    creatorInputBg: '#fef8f3',
  },

  aurora: {
    id: 'aurora',
    label: 'Aurora',
    description: 'Gradient · dreamy',
    swatch: '#a78bfa',
    isDark: true,
    pageBg: '#06030e',
    glow:
      'radial-gradient(ellipse at 20% 0%, rgba(167,139,250,0.24) 0%, transparent 48%), radial-gradient(ellipse at 80% 100%, rgba(34,211,238,0.14) 0%, transparent 48%)',
    dotGrid: 'rgba(255,255,255,0.03)',
    cardBg: 'rgba(255,255,255,0.055)',
    cardBorder: 'rgba(255,255,255,0.1)',
    inputBg: 'rgba(255,255,255,0.07)',
    inputBorder: 'rgba(255,255,255,0.12)',
    inputFocusBorder: '#a78bfa',
    inputFocusShadow: 'rgba(167,139,250,0.18)',
    text1: '#f8fafc',
    text2: '#9ca3af',
    text3: 'rgba(255,255,255,0.05)',
    accent: '#a78bfa',
    accentFg: '#ffffff',
    accentHover: '#8b5cf6',
    success: '#34d399',
    error: '#f87171',
    live: '#fbbf24',
    optionColors: ['#a78bfa', '#22d3ee', '#f472b6', '#34d399'],
    creatorBg: '#0d0820',
    creatorCard: 'rgba(255,255,255,0.055)',
    creatorBorder: 'rgba(255,255,255,0.1)',
    creatorText: '#f1f5f9',
    creatorText2: '#9ca3af',
    creatorInputBg: 'rgba(255,255,255,0.05)',
  },

  dusk: {
    id: 'dusk',
    label: 'Dusk',
    description: 'Lavender · soft',
    swatch: '#7c3aed',
    isDark: false,
    pageBg: '#faf7ff',
    glow: 'radial-gradient(ellipse at 60% 0%, rgba(167,139,250,0.18) 0%, transparent 56%)',
    dotGrid: 'rgba(0,0,0,0.035)',
    cardBg: '#ffffff',
    cardBorder: '#e4d9f7',
    inputBg: '#f5f0ff',
    inputBorder: '#d5c8f0',
    inputFocusBorder: '#7c3aed',
    inputFocusShadow: 'rgba(124,58,237,0.14)',
    text1: '#16063a',
    text2: '#7c6e9a',
    text3: '#e4d9f7',
    accent: '#7c3aed',
    accentFg: '#ffffff',
    accentHover: '#6d28d9',
    success: '#059669',
    error: '#dc2626',
    live: '#d97706',
    optionColors: ['#7c3aed', '#ec4899', '#0891b2', '#d97706'],
    creatorBg: '#f0ebfc',
    creatorCard: '#ffffff',
    creatorBorder: '#e4d9f7',
    creatorText: '#16063a',
    creatorText2: '#7c6e9a',
    creatorInputBg: '#faf7ff',
  },

  sage: {
    id: 'sage',
    label: 'Sage',
    description: 'Earthy · fresh',
    swatch: '#16a34a',
    isDark: false,
    pageBg: '#f5f9f5',
    glow: 'radial-gradient(ellipse at 30% 0%, rgba(22,163,74,0.12) 0%, transparent 52%)',
    dotGrid: 'rgba(0,0,0,0.035)',
    cardBg: '#ffffff',
    cardBorder: '#d1e8d4',
    inputBg: '#edf6ee',
    inputBorder: '#bcdcc0',
    inputFocusBorder: '#16a34a',
    inputFocusShadow: 'rgba(22,163,74,0.14)',
    text1: '#052e12',
    text2: '#537560',
    text3: '#d1e8d4',
    accent: '#16a34a',
    accentFg: '#ffffff',
    accentHover: '#15803d',
    success: '#16a34a',
    error: '#dc2626',
    live: '#d97706',
    optionColors: ['#16a34a', '#0891b2', '#7c3aed', '#d97706'],
    creatorBg: '#eaf3eb',
    creatorCard: '#ffffff',
    creatorBorder: '#d1e8d4',
    creatorText: '#052e12',
    creatorText2: '#537560',
    creatorInputBg: '#f5f9f5',
  },

  ink: {
    id: 'ink',
    label: 'Ink',
    description: 'Stark · minimal',
    swatch: '#0f172a',
    isDark: false,
    pageBg: '#f8f8f6',
    glow: '',
    dotGrid: 'rgba(0,0,0,0.06)',
    cardBg: '#ffffff',
    cardBorder: '#e2e2dc',
    inputBg: '#f2f2ef',
    inputBorder: '#d4d4ce',
    inputFocusBorder: '#0f172a',
    inputFocusShadow: 'rgba(15,23,42,0.1)',
    text1: '#0f172a',
    text2: '#737370',
    text3: '#e2e2dc',
    accent: '#0f172a',
    accentFg: '#f8f8f6',
    accentHover: '#1e293b',
    success: '#16a34a',
    error: '#dc2626',
    live: '#d97706',
    optionColors: ['#0f172a', '#dc2626', '#0891b2', '#d97706'],
    creatorBg: '#efefec',
    creatorCard: '#ffffff',
    creatorBorder: '#e2e2dc',
    creatorText: '#0f172a',
    creatorText2: '#737370',
    creatorInputBg: '#f8f8f6',
  },
}

export const THEME_ORDER: ThemeId[] = ['punch', 'aurora', 'dusk', 'sage', 'ink']

export const DEFAULT_THEME_ID: ThemeId = 'punch'

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && value in THEMES
}
