import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_THEME_ID, isThemeId, THEMES, type Theme, type ThemeId } from './themes'

const STORAGE_KEY = 'mentii.theme'

type ThemeContextValue = {
  theme: Theme
  themeId: ThemeId
  setThemeId: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredThemeId(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return isThemeId(raw) ? raw : DEFAULT_THEME_ID
  } catch {
    return DEFAULT_THEME_ID
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => readStoredThemeId())
  const theme = THEMES[themeId]

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id)
    try {
      window.localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // ignore — non-critical persistence failure
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--mentii-page-bg', theme.pageBg)
    root.style.setProperty('--mentii-text-1', theme.text1)
    root.style.setProperty('--mentii-text-2', theme.text2)
    root.style.setProperty('--mentii-accent', theme.accent)
    root.style.setProperty('--mentii-accent-fg', theme.accentFg)
    root.dataset.theme = theme.id
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, themeId, setThemeId }),
    [theme, themeId, setThemeId],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
