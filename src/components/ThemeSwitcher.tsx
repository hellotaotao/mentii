import { useEffect, useRef, useState } from 'react'
import { THEME_ORDER, THEMES } from '../lib/themes'
import { useTheme } from '../lib/themeContext'

export function ThemeSwitcher() {
  const { theme, themeId, setThemeId } = useTheme()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isLight = !theme.isDark

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current) return
      if (containerRef.current.contains(event.target as Node)) return
      setOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={containerRef} style={{ position: 'relative', zIndex: 300 }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch theme"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.82)',
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: 100,
          padding: '8px 14px',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          transition: 'all 0.15s',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 11,
            height: 11,
            borderRadius: '50%',
            background: theme.swatch,
            boxShadow: `0 0 6px ${theme.swatch}80`,
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: theme.text1,
            letterSpacing: '-0.01em',
          }}
        >
          {theme.label}
        </span>
        <span aria-hidden="true" style={{ fontSize: 10, color: theme.text2, marginLeft: 2 }}>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Themes"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            background: isLight ? '#ffffff' : '#111827',
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 18,
            padding: 8,
            minWidth: 220,
            boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
            animation: 'mentii-slide-down 0.2s cubic-bezier(0.22,1,0.36,1) both',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {THEME_ORDER.map((id) => {
            const item = THEMES[id]
            const active = item.id === themeId
            return (
              <button
                key={item.id}
                role="option"
                aria-selected={active}
                onClick={() => {
                  setThemeId(item.id)
                  setOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  background: active
                    ? isLight
                      ? '#f5f0eb'
                      : 'rgba(255,255,255,0.09)'
                    : 'transparent',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: item.swatch,
                    boxShadow: active ? `0 0 0 2px ${item.swatch}60` : 'none',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isLight ? '#1a0d05' : '#f1f5f9',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: isLight ? '#8a7060' : '#64748b',
                      marginTop: 1,
                    }}
                  >
                    {item.description}
                  </div>
                </div>
                {active && (
                  <div
                    aria-hidden="true"
                    style={{
                      marginLeft: 'auto',
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: item.swatch,
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
